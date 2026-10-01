/**
 * XML sitemaps for the storefront, served at <site>/sitemap.xml through the
 * website's rewrite (apps/website/next.config.ts).
 *
 * /sitemap.xml is always a sitemap index; the URLs live in shards named
 * `<section>-<page>.xml`. Each shard is one bounded, projected query, and
 * built documents are cached in memory so crawlers do not reach MongoDB.
 */
const { Product } = require('../models/Product');
const { Brand } = require('../models/Brand');
const {
  Category,
  TOP_LEVEL_SLUGS,
  SLUG_PATTERN,
  ensureDefaultCategories,
} = require('../models/Category');
const logger = require('../utils/logger');

// The protocol allows 50,000 URLs / 50 MB per file; smaller shards keep each
// cached document around 1 MB.
const URLS_PER_SITEMAP = 10_000;
const TTL_MS = 60 * 60 * 1000;
// After a failed rebuild, how long the stale copy is served before retrying.
const RETRY_MS = 60 * 1000;
const MAX_CACHED_DOCUMENTS = 64;
const CURSOR_BATCH = 1000;

const XMLNS = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const SHARD_FILE = /^(pages|categories|brands|products)-([1-9]\d{0,5})\.xml$/;

// Indexable storefront pages that are not backed by a collection. Keep in
// step with apps/website/src/app (and the disallow list in robots.ts).
const STATIC_PATHS = [
  '/',
  '/products',
  '/brands',
  '/offers',
  '/about',
  '/help',
  '/faq',
  '/contact',
  '/shipping',
  '/returns',
  '/privacy',
  '/terms',
  '/cookies',
];

// Same rule the public product/brand endpoints apply to non-staff readers.
const PUBLIC = { isActive: true };

const XML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => XML_ENTITIES[ch]);
}

/** Canonical storefront origin, no trailing slash (same source as emails). */
function siteUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:3001')
    .trim()
    .replace(/\/+$/, '');
}

function lastmodTag(date) {
  const time = date ? new Date(date).getTime() : NaN;
  return Number.isFinite(time)
    ? `<lastmod>${new Date(time).toISOString()}</lastmod>`
    : '';
}

function urlTag(site, entry) {
  return `<url><loc>${escapeXml(site + entry.path)}</loc>${lastmodTag(entry.lastmod)}</url>`;
}

function xmlDocument(root, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<${root} xmlns="${XMLNS}">${body}</${root}>\n`;
}

/**
 * Category landing pages: /c/<top> and /c/<top>/<sub>.
 *
 * Subcategories come from active products — that is what the storefront
 * builds those pages from, and it keeps empty pages out — minus anything an
 * admin has hidden in the Category collection.
 */
async function categoryEntries() {
  await ensureDefaultCategories();
  const [rows, groups] = await Promise.all([
    Category.find()
      .select('slug parent isActive updatedAt')
      .sort({ sortOrder: 1, slug: 1 })
      .lean(),
    Product.aggregate([
      { $match: PUBLIC },
      {
        $group: {
          _id: { category: '$category', subcategory: '$subcategory' },
          lastmod: { $max: '$updatedAt' },
        },
      },
      { $sort: { '_id.category': 1, '_id.subcategory': 1 } },
    ]),
  ]);

  const hidden = new Set(
    rows.filter((c) => c.isActive === false).map((c) => `${c.parent || ''}/${c.slug}`),
  );
  const topRows = new Map(rows.filter((c) => !c.parent).map((c) => [c.slug, c]));

  const entries = [];
  for (const slug of TOP_LEVEL_SLUGS) {
    if (hidden.has(`/${slug}`)) continue;
    entries.push({ path: `/c/${slug}`, lastmod: topRows.get(slug)?.updatedAt });
  }
  for (const { _id, lastmod } of groups) {
    const { category, subcategory } = _id;
    if (hidden.has(`/${category}`) || hidden.has(`${category}/${subcategory}`)) continue;
    if (typeof subcategory !== 'string' || subcategory.length > 64) continue;
    if (!SLUG_PATTERN.test(subcategory)) continue;
    entries.push({ path: `/c/${category}/${subcategory}`, lastmod });
  }
  return entries;
}

async function* fromArray(items, skip, limit) {
  yield* items.slice(skip, skip + limit);
}

/**
 * One page of a collection in `_id` order, streamed. New documents sort
 * last, so earlier shards stay stable as the catalog grows.
 */
async function* fromCollection(Model, fields, toPath, skip, limit) {
  const cursor = Model.find(PUBLIC)
    .select(fields)
    .sort({ _id: 1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .cursor({ batchSize: CURSOR_BATCH });
  for await (const doc of cursor) {
    yield { path: toPath(doc), lastmod: doc.updatedAt };
  }
}

const SECTIONS = {
  pages: {
    count: async () => STATIC_PATHS.length,
    entries: (skip, limit) =>
      fromArray(STATIC_PATHS.map((path) => ({ path })), skip, limit),
  },
  brands: {
    count: () => Brand.countDocuments(PUBLIC),
    entries: (skip, limit) =>
      fromCollection(
        Brand,
        'slug updatedAt',
        (b) => `/brands/${encodeURIComponent(b.slug || b._id)}`,
        skip,
        limit,
      ),
  },
  products: {
    count: () => Product.countDocuments(PUBLIC),
    entries: (skip, limit) =>
      fromCollection(Product, 'updatedAt', (p) => `/products/${p._id}`, skip, limit),
  },
};

// Order of the shards in the index
const SECTION_NAMES = ['pages', 'categories', 'brands', 'products'];

function createSitemapService({
  urlsPerSitemap = URLS_PER_SITEMAP,
  ttlMs = TTL_MS,
  now = Date.now,
} = {}) {
  /** key → { value?, expires?, pending? }; insertion order = age. */
  const cache = new Map();

  function cached(key, build) {
    const hit = cache.get(key);
    const hasValue = Boolean(hit && 'value' in hit);
    if (hasValue && hit.expires > now()) return Promise.resolve(hit.value);
    if (hit?.pending) return hit.pending;

    const pending = build().then(
      (value) => {
        cache.delete(key);
        cache.set(key, { value, expires: now() + ttlMs });
        while (cache.size > MAX_CACHED_DOCUMENTS) {
          cache.delete(cache.keys().next().value);
        }
        return value;
      },
      (err) => {
        if (!hasValue) {
          cache.delete(key);
          throw err;
        }
        logger.warn({ err, key }, 'Sitemap rebuild failed; serving stale copy');
        cache.set(key, { value: hit.value, expires: now() + RETRY_MS });
        return hit.value;
      },
    );
    cache.set(key, { ...hit, pending });
    return pending;
  }

  // The category list is one aggregation shared by the index and its shards
  const categories = () => cached('category-entries', categoryEntries);
  const sections = {
    ...SECTIONS,
    categories: {
      count: async () => (await categories()).length,
      async *entries(skip, limit) {
        yield* fromArray(await categories(), skip, limit);
      },
    },
  };

  function getIndexData() {
    return cached('index', async () => {
      const counts = await Promise.all(
        SECTION_NAMES.map((name) => sections[name].count()),
      );
      const site = siteUrl();
      const shards = {};
      let body = '';
      SECTION_NAMES.forEach((name, i) => {
        shards[name] = Math.ceil(counts[i] / urlsPerSitemap);
        for (let page = 1; page <= shards[name]; page += 1) {
          body += `<sitemap><loc>${escapeXml(`${site}/sitemaps/${name}-${page}.xml`)}</loc></sitemap>`;
        }
      });
      return { shards, xml: xmlDocument('sitemapindex', body) };
    });
  }

  /** The sitemap index XML. */
  async function getIndex() {
    return (await getIndexData()).xml;
  }

  /**
   * One shard's XML by file name (`products-3.xml`), or null when the name
   * is malformed or beyond the shards the index advertises.
   */
  async function getShard(file) {
    const match = SHARD_FILE.exec(String(file));
    if (!match) return null;
    const [, section, pageText] = match;
    const page = Number(pageText);

    const { shards } = await getIndexData();
    if (page > shards[section]) return null;

    return cached(`${section}-${page}`, async () => {
      const site = siteUrl();
      let body = '';
      const entries = sections[section].entries(
        (page - 1) * urlsPerSitemap,
        urlsPerSitemap,
      );
      for await (const entry of entries) body += urlTag(site, entry);
      return xmlDocument('urlset', body);
    });
  }

  return { getIndex, getShard, clear: () => cache.clear() };
}

module.exports = {
  ...createSitemapService(),
  createSitemapService,
  escapeXml,
  URLS_PER_SITEMAP,
  TTL_MS,
  STATIC_PATHS,
};
