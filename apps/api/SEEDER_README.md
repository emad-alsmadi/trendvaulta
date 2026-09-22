# Product & Brand Seeder Documentation

## Overview

The seeder generates realistic e-commerce data for the TrendVaulta platform across 6 product categories: makeup, perfumes, clothing, skincare, accessories, and home.

## Features

- **Category-Specific Data**: Each category has unique subcategories, pricing ranges, and product attributes
- **Realistic Brands**: 5 brands per category with descriptions, countries, and websites
- **Product Variants**: Size and color variants for clothing, volume sizes for perfumes/skincare, color options for makeup
- **Complete Attributes**: Materials, weights, dimensions, shipping info, SKUs, ratings, and stock levels
- **Scalable Generation**: Configurable data volume via command-line argument

## Categories

| Category | Subcategories | Price Range | Variants |
|----------|--------------|-------------|----------|
| makeup | foundation, lipstick, eyeshadow, mascara, blush, concealer, primer, setting-spray | $8 - $85 | Colors |
| perfumes | eau-de-parfum, eau-de-toilette, body-mist, gift-sets, cologne, roll-on | $25 - $250 | Volumes (30ml-150ml) |
| clothing | dresses, tops, pants, jackets, accessories, sweaters, skirts, activewear | $15 - $180 | Sizes (XS-XXL) + Colors |
| skincare | cleanser, moisturizer, serum, sunscreen, masks, toner, exfoliator, eye-cream | $12 - $120 | Volumes (30ml-150ml) |
| accessories | jewelry, bags, scarves, belts, watches, sunglasses, hats, wallets | $10 - $200 | Sizes + Colors |
| home | decor, kitchen, bedding, lighting, furniture, rugs, curtains, organization | $15 - $300 | Colors + Sizes |

## Usage

### Import Data

```bash
# Default: 50 products per category (~300 total products)
node apps/api/seeder.js -import

# Custom: 100 products per category (~600 total products)
node apps/api/seeder.js -import 100

# Small test: 10 products per category (~60 total products)
node apps/api/seeder.js -import 10
```

### Remove Data

```bash
node apps/api/seeder.js -remove
```

### Show Help

```bash
node apps/api/seeder.js -help
```

### Safety Guard

Both `-import` and `-remove` wipe the products, brands, coupons and offers
collections. The seeder therefore **refuses to run when `NODE_ENV=production`**.
If you genuinely need to reseed a production database, pass `--force`:

```bash
NODE_ENV=production node apps/api/seeder.js -import --force
```

### Admin User

Set these in `apps/api/.env` (see `.env.example`) and `-import` will create an
admin account, or grant the `admin` role to an existing account with that email:

```bash
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=change-me-please
SEED_ADMIN_USERNAME=admin   # optional, defaults to "admin"
```

The admin user is never deleted by `-remove`. When the variables are unset the
step is skipped, so a plain `-import` still works with no extra setup.

## Data Structure

### Brands

Each brand includes:
- Name and slug
- Description
- Logo URL (placeholder)
- Website URL
- Country of origin
- Featured flag (first 2 brands per category)

### Products

Each product includes:
- Title and description
- Brand reference (ObjectId)
- Price and base price
- Cover image and additional images
- Category and subcategory
- Variants (size, color, stock, SKU)
- Material
- Weight and dimensions
- Shipping information
- Stock level
- Unique SKU
- Active and featured flags
- Average rating and review count

## Customization

### Adding New Categories

1. Add category config to `CATEGORY_CONFIG` in `data.js`:
```javascript
newCategory: {
  subcategories: ['sub1', 'sub2', 'sub3'],
  priceRange: { min: 10, max: 100 },
  weightRange: { min: 0.1, max: 1.0 },
  hasVariants: true,
  imageKeywords: ['keyword1', 'keyword2']
}
```

2. Add brand data to `BRAND_DATA`:
```javascript
newCategory: [
  { name: 'Brand Name', country: 'Country', description: 'Description' },
  // ... more brands
]
```

3. Add product templates to `PRODUCT_TEMPLATES`:
```javascript
newCategory: [
  'Template {subcategory} Name',
  // ... more templates
]
```

4. Add materials to `MATERIALS`:
```javascript
newCategory: ['Material1', 'Material2', 'Material3']
```

### Modifying Product Templates

Edit the `PRODUCT_TEMPLATES` object in `data.js`. Use `{subcategory}` as a placeholder that will be replaced with the actual subcategory name.

### Changing Pricing Ranges

Modify the `priceRange` in `CATEGORY_CONFIG` for each category.

## Performance

- **Small (10 per category)**: ~60 products, ~1 second
- **Medium (50 per category)**: ~300 products, ~2-3 seconds
- **Large (100 per category)**: ~600 products, ~5-10 seconds
- **Extra Large (500 per category)**: ~3000 products, ~30-60 seconds

## Troubleshooting

### MongoDB Connection Error

Ensure:
- MongoDB is running locally or MongoDB Atlas connection string is correct
- `.env` file has `MONGO_URL` configured
- Database name matches in `.env`

### Duplicate Key Error

Run `-remove` first to clear existing data:
```bash
node apps/api/seeder.js -remove
node apps/api/seeder.js -import
```

### Memory Issues with Large Datasets

For very large datasets (500+ products per category), consider:
- Running in batches
- Increasing Node.js memory limit: `node --max-old-space-size=4096 apps/api/seeder.js -import 500`

## Notes

- Image URLs use Unsplash with category-specific keywords
- SKUs are generated automatically: `CAT-SUB-XXXX` format
- Featured products are randomly selected (10% chance)
- Stock levels are randomized (0-100 units)
- Ratings are randomized (2.5-5.0 stars)
- All brands are set to active by default
- Coupons are included with the seeder for testing payment flows
- Offers (merchandising deals) are seeded so `GET /api/offers` returns beauty/fashion promos after `-import` (active + one inactive for filter testing)
- `apps/api/seeder.js` is the only seeder; the older `apps/api/seeders/seeder.js` copy was removed
- Not yet seeded: help topics, CMS content, storefront modules, lookbooks, testimonials, bundles, gift-finder config and product Q&A. Those dashboard pages start empty after `-import`
