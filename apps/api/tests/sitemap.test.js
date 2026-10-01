/**
 * Sitemap index + shards (services/sitemap.service.js).
 *
 * Covers what breaks SEO silently: non-public rows leaking in, URLs lost or
 * duplicated across shard boundaries, MongoDB being hit on every crawl, and
 * an outage turning into an empty (rather than stale or 503) sitemap.
 */
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { app, connectDb, disconnectDb, clearDb, dbIt, createProduct } = require('./setup');
const { Product } = require('../models/Product');
const { Brand } = require('../models/Brand');
const { Category } = require('../models/Category');
const sitemapService = require('../services/sitemap.service');
const { createSitemapService, escapeXml, STATIC_PATHS } = sitemapService;

const SITE = 'http://localhost:3001';

const locs = (xml) => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);

function assertXml(xml, root) {
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(xml.includes(`<${root} xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`));
  assert.ok(xml.trimEnd().endsWith(`</${root}>`));
  // Every element that opens also closes
  for (const tag of ['url', 'sitemap', 'loc', 'lastmod']) {
    const open = xml.match(new RegExp(`<${tag}>`, 'g')) || [];
    const close = xml.match(new RegExp(`</${tag}>`, 'g')) || [];
    assert.equal(open.length, close.length, `<${tag}> is balanced`);
  }
}

const shardNames = (indexXml, section) =>
  locs(indexXml)
    .map((loc) => loc.replace(`${SITE}/sitemaps/`, ''))
    .filter((name) => name.startsWith(`${section}-`));

async function sectionUrls(service, section) {
  const urls = [];
  for (const name of shardNames(await service.getIndex(), section)) {
    urls.push(locs(await service.getShard(name)));
  }
  return urls;
}

describe('sitemap XML escaping', () => {
  it('escapes the five XML entities', () => {
    assert.equal(escapeXml(`a&b<c>d"e'f`), 'a&amp;b&lt;c&gt;d&quot;e&apos;f');
  });
});

describe('sitemap service', () => {
  before(connectDb);
  after(disconnectDb);
  beforeEach(clearDb);

  dbIt('empty catalog: a valid index with only pages and default categories', async () => {
    const service = createSitemapService();
    const index = await service.getIndex();

    assertXml(index, 'sitemapindex');
    assert.deepEqual(locs(index), [
      `${SITE}/sitemaps/pages-1.xml`,
      `${SITE}/sitemaps/categories-1.xml`,
    ]);

    const pages = await service.getShard('pages-1.xml');
    assertXml(pages, 'urlset');
    assert.deepEqual(locs(pages), STATIC_PATHS.map((p) => SITE + p));

    assert.equal(await service.getShard('products-1.xml'), null);
    assert.equal(await service.getShard('brands-1.xml'), null);
  });

  dbIt('pages every active product across shards, without loss or duplicates', async () => {
    const active = [];
    for (let i = 0; i < 5; i += 1) active.push(await createProduct());
    const hidden = await createProduct({ isActive: false });

    const service = createSitemapService({ urlsPerSitemap: 2 });
    const shards = await sectionUrls(service, 'products');

    assert.deepEqual(shards.map((s) => s.length), [2, 2, 1]);
    const all = shards.flat();
    assert.equal(new Set(all).size, 5);
    assert.deepEqual(
      [...all].sort(),
      active.map((p) => `${SITE}/products/${p._id}`).sort(),
    );
    assert.ok(!all.includes(`${SITE}/products/${hidden._id}`));

    assert.equal(await service.getShard('products-4.xml'), null);
  });

  dbIt('carries lastmod from updatedAt', async () => {
    const product = await createProduct();
    const xml = await createSitemapService().getShard('products-1.xml');
    assertXml(xml, 'urlset');
    assert.ok(
      xml.includes(
        `<url><loc>${SITE}/products/${product._id}</loc><lastmod>${product.updatedAt.toISOString()}</lastmod></url>`,
      ),
    );
  });

  dbIt('lists active brands by slug', async () => {
    await Brand.create({ name: 'Acme', slug: 'acme' });
    await Brand.create({ name: 'Gone', slug: 'gone', isActive: false });

    const [urls] = await sectionUrls(createSitemapService(), 'brands');
    assert.deepEqual(urls, [`${SITE}/brands/acme`]);
  });

  dbIt('lists categories and subcategories, leaving out hidden ones', async () => {
    await createProduct({ category: 'makeup', subcategory: 'lipstick' });
    await createProduct({ category: 'makeup', subcategory: 'lipstick' });
    await createProduct({ category: 'makeup', subcategory: 'mascara' });
    await createProduct({ category: 'perfumes', subcategory: 'cologne' });
    await createProduct({ category: 'home', subcategory: 'Not A Slug' });
    await createProduct({ category: 'skincare', subcategory: 'serum', isActive: false });

    const service = createSitemapService({ urlsPerSitemap: 4 });
    const shards = await sectionUrls(service, 'categories');
    // 6 top-level + 3 product-backed subcategories
    assert.deepEqual(shards.map((s) => s.length), [4, 4, 1]);
    const urls = shards.flat();
    assert.equal(new Set(urls).size, 9);
    for (const path of ['/c/makeup', '/c/home', '/c/makeup/lipstick', '/c/makeup/mascara', '/c/perfumes/cologne']) {
      assert.ok(urls.includes(SITE + path), path);
    }
    assert.ok(!urls.some((u) => u.startsWith(`${SITE}/c/home/`)), 'non-slug subcategory');
    assert.ok(!urls.includes(`${SITE}/c/skincare/serum`), 'only inactive products');
    // Seeded in the CMS but no product is filed under it
    assert.ok(!urls.includes(`${SITE}/c/makeup/blush`));

    await Category.updateOne({ parent: 'makeup', slug: 'lipstick' }, { isActive: false });
    await Category.updateOne({ parent: null, slug: 'perfumes' }, { isActive: false });

    const after = (await sectionUrls(createSitemapService(), 'categories')).flat();
    assert.ok(after.includes(`${SITE}/c/makeup`));
    assert.ok(after.includes(`${SITE}/c/makeup/mascara`));
    assert.ok(!after.includes(`${SITE}/c/makeup/lipstick`));
    assert.ok(!after.includes(`${SITE}/c/perfumes`));
    assert.ok(!after.includes(`${SITE}/c/perfumes/cologne`));
  });

  dbIt('rejects malformed shard names', async () => {
    const service = createSitemapService();
    for (const name of ['products-0.xml', 'products-1', 'users-1.xml', '../x', 'pages-1.xml.bak']) {
      assert.equal(await service.getShard(name), null, name);
    }
  });

  dbIt('serves from cache until the TTL passes', async (t) => {
    let clock = 1_000_000;
    const service = createSitemapService({ ttlMs: 1000, now: () => clock });
    await createProduct();
    const count = t.mock.method(Product, 'countDocuments');

    const first = await service.getIndex();
    await service.getShard('products-1.xml');
    await createProduct();
    assert.equal(await service.getIndex(), first);
    assert.equal(locs(await service.getShard('products-1.xml')).length, 1);
    assert.equal(count.mock.callCount(), 1);

    clock += 1001;
    assert.equal(locs(await service.getShard('products-1.xml')).length, 2);
    assert.equal(count.mock.callCount(), 2);
  });

  dbIt('builds once for concurrent requests', async (t) => {
    await createProduct();
    const service = createSitemapService();
    const count = t.mock.method(Product, 'countDocuments');
    await Promise.all([service.getIndex(), service.getIndex(), service.getIndex()]);
    assert.equal(count.mock.callCount(), 1);
  });

  dbIt('database failure: serves the stale copy, or rejects when there is none', async (t) => {
    let clock = 1_000_000;
    const service = createSitemapService({ ttlMs: 1000, now: () => clock });
    await createProduct();
    const good = await service.getIndex();

    t.mock.method(Product, 'countDocuments', async () => {
      throw new Error('mongo down');
    });
    clock += 1001;
    assert.equal(await service.getIndex(), good);

    await assert.rejects(createSitemapService().getIndex(), /mongo down/);
  });
});

describe('sitemap HTTP endpoints', () => {
  before(connectDb);
  after(disconnectDb);
  beforeEach(async () => {
    await clearDb();
    sitemapService.clear();
  });

  dbIt('GET /api/sitemap.xml is public XML', async () => {
    await createProduct();
    const res = await request(app).get('/api/sitemap.xml');

    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'application/xml; charset=utf-8');
    assert.match(res.headers['cache-control'], /public, max-age=3600/);
    assertXml(res.text, 'sitemapindex');
    assert.ok(locs(res.text).includes(`${SITE}/sitemaps/products-1.xml`));
  });

  dbIt('GET /api/sitemaps/:file serves a shard and 404s unknown ones', async () => {
    const product = await createProduct();

    const ok = await request(app).get('/api/sitemaps/products-1.xml');
    assert.equal(ok.status, 200);
    assert.equal(ok.headers['content-type'], 'application/xml; charset=utf-8');
    assertXml(ok.text, 'urlset');
    assert.deepEqual(locs(ok.text), [`${SITE}/products/${product._id}`]);

    for (const file of ['products-9.xml', 'nope.xml']) {
      const res = await request(app).get(`/api/sitemaps/${file}`);
      assert.equal(res.status, 404, file);
    }
  });

  dbIt('answers 503 with Retry-After when the database fails and nothing is cached', async (t) => {
    t.mock.method(Product, 'countDocuments', async () => {
      throw new Error('mongo down');
    });
    const res = await request(app).get('/api/sitemap.xml');

    assert.equal(res.status, 503);
    assert.equal(res.headers['retry-after'], '300');
    assert.equal(res.body.code, 'SITEMAP_UNAVAILABLE');
  });
});
