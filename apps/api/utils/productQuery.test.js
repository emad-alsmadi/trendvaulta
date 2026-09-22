const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateProductListQuery,
  toList,
  buildProductMatch,
  buildProductSort,
  buildFacetPipeline,
  normalizeFacets,
} = require('./productQuery');

const BRAND_A = '64b7f1e2c9a1b2c3d4e5f601';
const BRAND_B = '64b7f1e2c9a1b2c3d4e5f602';

describe('validateProductListQuery', () => {
  it('coerces numbers and ignores empty strings', () => {
    const { error, value } = validateProductListQuery({
      minPrice: '10',
      maxPrice: '',
      minRating: '4',
      brand: BRAND_A,
    });
    assert.equal(error, undefined);
    assert.equal(value.minPrice, 10);
    assert.equal(value.maxPrice, undefined);
    assert.equal(value.minRating, 4);
  });

  it('rejects malformed numbers with a friendly message', () => {
    const { error } = validateProductListQuery({ minPrice: 'abc' });
    assert.match(error, /Invalid minPrice/);
  });

  it('rejects minRating outside 0–5', () => {
    const { error } = validateProductListQuery({ minRating: '9' });
    assert.match(error, /Invalid minRating/);
  });

  it('accepts repeated list params (arrays from qs)', () => {
    const { error, value } = validateProductListQuery({ size: ['M', 'L'] });
    assert.equal(error, undefined);
    assert.deepEqual(value.size, ['M', 'L']);
  });
});

describe('toList', () => {
  it('splits comma strings, flattens arrays and dedupes', () => {
    assert.deepEqual(toList('M, L,,M'), ['M', 'L']);
    assert.deepEqual(toList(['S', 'M,L']), ['S', 'M', 'L']);
    assert.deepEqual(toList(undefined), []);
  });
});

describe('buildProductMatch', () => {
  it('defaults to active products only for anonymous callers', () => {
    const match = buildProductMatch({}, { isStaff: false });
    assert.deepEqual(match, { isActive: true });
  });

  it('lets staff include inactive products', () => {
    const match = buildProductMatch(
      { includeInactive: 'true', isActive: 'false' },
      { isStaff: true },
    );
    assert.equal(match.isActive, false);
    const all = buildProductMatch({ includeInactive: 'true' }, { isStaff: true });
    assert.equal('isActive' in all, false);
  });

  it('ignores includeInactive for non-staff', () => {
    const match = buildProductMatch({ includeInactive: 'true' }, { isStaff: false });
    assert.equal(match.isActive, true);
  });

  it('applies price range, category, subcategory and featured', () => {
    const match = buildProductMatch({
      minPrice: 10,
      maxPrice: 50,
      category: 'makeup',
      subcategory: 'lipstick',
      featured: 'true',
    });
    assert.deepEqual(match.price, { $gte: 10, $lte: 50 });
    assert.equal(match.category, 'makeup');
    assert.equal(match.subcategory, 'lipstick');
    assert.equal(match.featured, true);
  });

  it('filters by one or many brand ids and drops invalid ids', () => {
    const single = buildProductMatch({ brand: BRAND_A });
    assert.equal(String(single.brand), BRAND_A);

    const multi = buildProductMatch({ brand: `${BRAND_A},${BRAND_B},nope` });
    assert.deepEqual(multi.brand.$in.map(String), [BRAND_A, BRAND_B]);

    const invalid = buildProductMatch({ brand: 'not-an-id' });
    assert.equal('brand' in invalid, false);
  });

  it('matches variant sizes exactly and colors case-insensitively', () => {
    const match = buildProductMatch({ size: 'M,L', color: ['red', 'Blue'] });
    assert.deepEqual(match['variants.size'], { $in: ['M', 'L'] });
    const regexes = match['variants.color'].$in;
    assert.equal(regexes.length, 2);
    assert.ok(regexes[0].test('RED'));
    assert.ok(!regexes[0].test('redish'));
    assert.ok(regexes[1].test('blue'));
  });

  it('escapes regex metacharacters in color values', () => {
    const match = buildProductMatch({ color: 'a.b' });
    assert.ok(match['variants.color'].$in[0].test('a.b'));
    assert.ok(!match['variants.color'].$in[0].test('axb'));
  });

  it('applies minRating, inStock and onSale', () => {
    const match = buildProductMatch({ minRating: 4, inStock: 'true', onSale: '1' });
    assert.deepEqual(match.averageRating, { $gte: 4 });
    assert.deepEqual(match.$or, [
      { stock: { $gt: 0 } },
      { 'variants.stock': { $gt: 0 } },
    ]);
    assert.deepEqual(match.$expr, { $gt: ['$basePrice', '$price'] });
  });

  it('combines search and inStock via $and so neither $or is lost', () => {
    const match = buildProductMatch({ q: 'serum', inStock: 'true' });
    assert.equal(match.$or, undefined);
    assert.equal(match.$and.length, 2);
    assert.ok(match.$and[0].$or[0].title);
    assert.ok(match.$and[1].$or[0].stock);
  });

  it('keeps search as a plain $or when it is the only clause', () => {
    const match = buildProductMatch({ q: 'serum' });
    assert.equal(match.$or.length, 2);
    assert.equal(match.$and, undefined);
  });

  it('skips facet filters for the base (facet-count) match', () => {
    const match = buildProductMatch(
      {
        category: 'makeup',
        q: 'lip',
        minPrice: 5,
        brand: BRAND_A,
        size: 'M',
        color: 'red',
        minRating: 4,
        inStock: 'true',
        onSale: 'true',
      },
      { withFacetFilters: false },
    );
    assert.equal(match.category, 'makeup');
    assert.deepEqual(match.price, { $gte: 5 });
    assert.equal(match.$or.length, 2);
    assert.equal('brand' in match, false);
    assert.equal('variants.size' in match, false);
    assert.equal('variants.color' in match, false);
    assert.equal('averageRating' in match, false);
    assert.equal('$expr' in match, false);
    assert.equal(match.$and, undefined);
  });
});

describe('buildProductSort', () => {
  it('maps named presets', () => {
    assert.deepEqual(buildProductSort('newest'), { createdAt: -1 });
    assert.deepEqual(buildProductSort('price_asc'), { price: 1 });
    assert.deepEqual(buildProductSort('price_desc'), { price: -1 });
    assert.deepEqual(buildProductSort('rating'), {
      averageRating: -1,
      reviewCount: -1,
    });
    assert.deepEqual(buildProductSort('bestselling'), {
      salesCount: -1,
      reviewCount: -1,
      createdAt: -1,
    });
    assert.deepEqual(buildProductSort('featured'), {
      featured: -1,
      salesCount: -1,
      createdAt: -1,
    });
  });

  it('keeps legacy field strings working', () => {
    assert.deepEqual(buildProductSort('createdAt'), { createdAt: 1 });
    assert.deepEqual(buildProductSort('-createdAt'), { createdAt: -1 });
    assert.deepEqual(buildProductSort('-price'), { price: -1 });
    assert.deepEqual(buildProductSort('-averageRating'), { averageRating: -1 });
    assert.deepEqual(buildProductSort('price,-bestselling'), {
      price: 1,
      salesCount: -1,
    });
  });

  it('falls back to createdAt for empty or unsafe input', () => {
    assert.deepEqual(buildProductSort(''), { createdAt: 1 });
    assert.deepEqual(buildProductSort(undefined), { createdAt: 1 });
    assert.deepEqual(buildProductSort('$where'), { createdAt: 1 });
  });
});

describe('buildFacetPipeline', () => {
  it('starts with the base match and facets every bucket', () => {
    const base = { isActive: true, category: 'makeup' };
    const pipeline = buildFacetPipeline(base);
    assert.deepEqual(pipeline[0], { $match: base });
    const facet = pipeline[1].$facet;
    assert.deepEqual(Object.keys(facet).sort(), [
      'brands',
      'categories',
      'colors',
      'inStock',
      'onSale',
      'priceRange',
      'ratings',
      'sizes',
      'subcategories',
    ]);
    assert.equal(facet.brands.find((s) => s.$lookup).$lookup.from, 'brands');
  });
});

describe('normalizeFacets', () => {
  it('returns an empty but fully-shaped contract when nothing matched', () => {
    const facets = normalizeFacets({});
    assert.deepEqual(facets.brands, []);
    assert.deepEqual(facets.priceRange, { min: 0, max: 0 });
    assert.deepEqual(facets.ratings, [
      { value: 4, count: 0 },
      { value: 3, count: 0 },
      { value: 2, count: 0 },
      { value: 1, count: 0 },
    ]);
    assert.equal(facets.inStock, 0);
    assert.equal(facets.onSale, 0);
  });

  it('shapes raw $facet output', () => {
    const facets = normalizeFacets({
      brands: [{ _id: BRAND_A, name: 'Glow', slug: 'glow', count: 3 }],
      sizes: [{ value: 'M', count: 2 }],
      colors: [{ value: 'Red', colorCode: '#f00', count: 1 }],
      categories: [{ value: 'makeup', count: 3 }],
      subcategories: [{ value: 'lipstick', count: 1 }],
      priceRange: [{ min: 5, max: 90 }],
      ratings: [{ r4: 2, r3: 3, r2: 3, r1: 3 }],
      inStock: [{ count: 2 }],
      onSale: [{ count: 1 }],
    });
    assert.deepEqual(facets.brands, [
      { _id: BRAND_A, name: 'Glow', slug: 'glow', count: 3 },
    ]);
    assert.deepEqual(facets.priceRange, { min: 5, max: 90 });
    assert.deepEqual(facets.ratings[0], { value: 4, count: 2 });
    assert.equal(facets.inStock, 2);
    assert.equal(facets.onSale, 1);
    assert.deepEqual(facets.colors[0], { value: 'Red', colorCode: '#f00', count: 1 });
  });
});
