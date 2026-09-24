const mongoose = require('mongoose');

// Category configurations with subcategories and pricing ranges
const CATEGORY_CONFIG = {
  makeup: {
    subcategories: [
      'foundation',
      'lipstick',
      'eyeshadow',
      'mascara',
      'blush',
      'concealer',
      'primer',
      'setting-spray',
    ],
    priceRange: { min: 8, max: 85 },
    weightRange: { min: 0.05, max: 0.3 },
    hasVariants: true, // colors
    imageKeywords: ['makeup', 'cosmetics', 'beauty', 'lipstick', 'foundation'],
  },
  perfumes: {
    subcategories: [
      'eau-de-parfum',
      'eau-de-toilette',
      'body-mist',
      'gift-sets',
      'cologne',
      'roll-on',
    ],
    priceRange: { min: 25, max: 250 },
    weightRange: { min: 0.1, max: 0.5 },
    hasVariants: true, // sizes
    imageKeywords: ['perfume', 'fragrance', 'bottle', 'cologne'],
  },
  clothing: {
    subcategories: [
      'dresses',
      'tops',
      'pants',
      'jackets',
      'accessories',
      'sweaters',
      'skirts',
      'activewear',
    ],
    priceRange: { min: 15, max: 180 },
    weightRange: { min: 0.2, max: 1.5 },
    hasVariants: true, // sizes and colors
    imageKeywords: ['fashion', 'clothing', 'dress', 'shirt', 'style'],
  },
  skincare: {
    subcategories: [
      'cleanser',
      'moisturizer',
      'serum',
      'sunscreen',
      'masks',
      'toner',
      'exfoliator',
      'eye-cream',
    ],
    priceRange: { min: 12, max: 120 },
    weightRange: { min: 0.05, max: 0.4 },
    hasVariants: true, // sizes
    imageKeywords: ['skincare', 'beauty', 'cream', 'serum', 'bottle'],
  },
  accessories: {
    subcategories: [
      'jewelry',
      'bags',
      'scarves',
      'belts',
      'watches',
      'sunglasses',
      'hats',
      'wallets',
    ],
    priceRange: { min: 10, max: 200 },
    weightRange: { min: 0.05, max: 0.8 },
    hasVariants: true, // colors and sizes
    imageKeywords: ['accessories', 'jewelry', 'bag', 'watch', 'fashion'],
  },
  home: {
    subcategories: [
      'decor',
      'kitchen',
      'bedding',
      'lighting',
      'furniture',
      'rugs',
      'curtains',
      'organization',
    ],
    priceRange: { min: 15, max: 300 },
    weightRange: { min: 0.3, max: 5.0 },
    hasVariants: true, // colors and sizes
    imageKeywords: ['home', 'decor', 'furniture', 'interior', 'living'],
  },
};

// Brand data for each category
const BRAND_DATA = {
  makeup: [
    {
      name: 'Glow Beauty',
      country: 'USA',
      description: 'Premium makeup for everyday radiance',
    },
    {
      name: 'Luxe Cosmetics',
      country: 'France',
      description: 'French-inspired luxury beauty products',
    },
    {
      name: 'Pure Palette',
      country: 'Korea',
      description: 'K-beauty essentials for flawless skin',
    },
    {
      name: 'Velvet Touch',
      country: 'Italy',
      description: 'Sophisticated makeup with Italian elegance',
    },
    {
      name: 'Radiance Labs',
      country: 'Japan',
      description: 'Innovative formulas from Tokyo',
    },
  ],
  perfumes: [
    {
      name: 'Essence Maison',
      country: 'France',
      description: 'Timeless French fragrances',
    },
    {
      name: 'Scent Studio',
      country: 'USA',
      description: 'Modern artisanal perfumery',
    },
    {
      name: 'Aroma Dreams',
      country: 'UAE',
      description: 'Oriental-inspired luxury scents',
    },
    {
      name: 'Bloom Fragrances',
      country: 'UK',
      description: 'Floral and fresh perfume collections',
    },
    {
      name: 'Mystic Scents',
      country: 'India',
      description: 'Exotic Eastern fragrances',
    },
  ],
  clothing: [
    {
      name: 'Urban Style',
      country: 'USA',
      description: 'Contemporary urban fashion',
    },
    {
      name: 'Elegance Mode',
      country: 'Italy',
      description: 'Italian luxury fashion house',
    },
    {
      name: 'Comfort Fit',
      country: 'Germany',
      description: 'Quality casual wear',
    },
    {
      name: 'Trend Setters',
      country: 'UK',
      description: 'Latest fashion trends',
    },
    {
      name: 'Classic Threads',
      country: 'Japan',
      description: 'Minimalist Japanese design',
    },
  ],
  skincare: [
    {
      name: 'Skin Pure',
      country: 'Korea',
      description: 'K-beauty innovations for radiant skin',
    },
    {
      name: 'Derm Essentials',
      country: 'USA',
      description: 'Dermatologist-approved skincare',
    },
    {
      name: 'Nature Glow',
      country: 'France',
      description: 'Natural ingredients for healthy skin',
    },
    {
      name: 'Bio Care',
      country: 'Germany',
      description: 'Scientific skincare solutions',
    },
    {
      name: 'Fresh Face',
      country: 'Australia',
      description: 'Organic skincare from down under',
    },
  ],
  accessories: [
    {
      name: 'Lux Adorn',
      country: 'Italy',
      description: 'Italian luxury accessories',
    },
    {
      name: 'Urban Chic',
      country: 'USA',
      description: 'Modern statement pieces',
    },
    {
      name: 'Time Pieces',
      country: 'Switzerland',
      description: 'Precision watches and timepieces',
    },
    {
      name: 'Style Forge',
      country: 'UK',
      description: 'Handcrafted leather goods',
    },
    {
      name: 'Glam Collection',
      country: 'France',
      description: 'Elegant fashion accessories',
    },
  ],
  home: [
    {
      name: 'Living Space',
      country: 'Sweden',
      description: 'Scandinavian home design',
    },
    {
      name: 'Comfort Home',
      country: 'USA',
      description: 'Cozy and functional home goods',
    },
    {
      name: 'Modern Living',
      country: 'Germany',
      description: 'Contemporary home solutions',
    },
    {
      name: 'Artisan Home',
      country: 'Morocco',
      description: 'Handcrafted home decor',
    },
    {
      name: 'Smart Living',
      country: 'Japan',
      description: 'Innovative home organization',
    },
  ],
};

// Product name templates for each category
const PRODUCT_TEMPLATES = {
  makeup: [
    'Matte {subcategory} Pro',
    'Hydrating {subcategory} Glow',
    'Long-wear {subcategory} Studio',
    'Natural {subcategory} Pure',
    'Velvet {subcategory} Luxe',
    'Radiant {subcategory} Beam',
    'Silky {subcategory} Touch',
    'Perfect {subcategory} Finish',
  ],
  perfumes: [
    '{subcategory} Essence',
    '{subcategory} Signature',
    '{subcategory} Mystique',
    '{subcategory} Elegance',
    '{subcategory} Allure',
    '{subcategory} Bloom',
    '{subcategory} Voyage',
    '{subcategory} Whisper',
  ],
  clothing: [
    'Classic {subcategory} Fit',
    'Modern {subcategory} Style',
    'Elegant {subcategory} Design',
    'Casual {subcategory} Comfort',
    'Premium {subcategory} Collection',
    'Trendy {subcategory} Look',
    'Luxury {subcategory} Edition',
    'Essential {subcategory} Basic',
  ],
  skincare: [
    'Gentle {subcategory} Care',
    'Deep {subcategory} Treatment',
    'Daily {subcategory} Routine',
    'Advanced {subcategory} Formula',
    'Natural {subcategory} Glow',
    'Refreshing {subcategory} Splash',
    'Intensive {subcategory} Repair',
    'Pure {subcategory} Balance',
  ],
  accessories: [
    'Designer {subcategory} Collection',
    'Premium {subcategory} Edition',
    'Classic {subcategory} Style',
    'Modern {subcategory} Design',
    'Elegant {subcategory} Piece',
    'Luxury {subcategory} Accent',
    'Trendy {subcategory} Accessory',
    'Signature {subcategory} Item',
  ],
  home: [
    'Modern {subcategory} Decor',
    'Cozy {subcategory} Collection',
    'Elegant {subcategory} Design',
    'Functional {subcategory} Solution',
    'Stylish {subcategory} Accent',
    'Premium {subcategory} Piece',
    'Contemporary {subcategory} Look',
    'Classic {subcategory} Charm',
  ],
};

// Color options for variants
const COLORS = [
  { name: 'Black', code: '#000000' },
  { name: 'White', code: '#FFFFFF' },
  { name: 'Red', code: '#FF0000' },
  { name: 'Blue', code: '#0000FF' },
  { name: 'Green', code: '#008000' },
  { name: 'Pink', code: '#FFC0CB' },
  { name: 'Purple', code: '#800080' },
  { name: 'Brown', code: '#A52A2A' },
  { name: 'Gray', code: '#808080' },
  { name: 'Beige', code: '#F5F5DC' },
  { name: 'Gold', code: '#FFD700' },
  { name: 'Silver', code: '#C0C0C0' },
];

// Size options for variants
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// Size options for perfumes/skincare (ml)
const VOLUME_SIZES = ['30ml', '50ml', '75ml', '100ml', '150ml'];

// Materials for different categories
const MATERIALS = {
  makeup: ['Synthetic', 'Natural', 'Organic', 'Mineral-based', 'Vegan'],
  perfumes: ['Alcohol-based', 'Oil-based', 'Natural', 'Synthetic'],
  clothing: ['Cotton', 'Polyester', 'Silk', 'Wool', 'Linen', 'Denim', 'Blend'],
  skincare: ['Natural', 'Organic', 'Synthetic', 'Plant-based', 'Mineral'],
  accessories: ['Leather', 'Metal', 'Fabric', 'Synthetic', 'Wood', 'Glass'],
  home: ['Wood', 'Metal', 'Glass', 'Fabric', 'Ceramic', 'Plastic', 'Stone'],
};

// Helper functions
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function generateSKU(category, subcategory, index) {
  const catCode = category.substring(0, 3).toUpperCase();
  const subCode = subcategory.substring(0, 3).toUpperCase();
  const num = String(index).padStart(4, '0');
  return `${catCode}-${subCode}-${num}`;
}

function generateImageUrl(category, subcategory, index) {
  const validImageIds = [
    '1505740420928-5e560c06d30e',
    '1523275335684-37898b6baf30',
    '1571781926293-c47d0c347e32',
    '1596462502278-27bfdd403348',
    '1618354691373-d851c5c3a990',
    '1585386959984-435d4e2b309d',
    '1595429052747-dc871a19b2b6',
    '1572560412355-9668a3b5f0b3',
    '1584917865442-892d97a0154e',
    '1560343090-f0409e927848',
  ];
  const imageId = validImageIds[index % validImageIds.length];
  return `https://images.unsplash.com/photo-${imageId}?auto=format&fit=crop&w=800&q=80`;
}

function generateProductTitle(category, subcategory) {
  const templates = PRODUCT_TEMPLATES[category];
  const template = randomChoice(templates);
  return template.replace('{subcategory}', subcategory.replace('-', ' '));
}

function generateProductDescription(category, subcategory, title) {
  const descriptions = [
    `Experience the luxury of our premium ${title}. Crafted with attention to detail and designed for the modern lifestyle.`,
    `Discover the perfect ${title} that combines quality, style, and functionality. A must-have for your collection.`,
    `Elevate your daily routine with our exquisite ${title}. Made with the finest materials and expert craftsmanship.`,
    `Our ${title} represents the perfect blend of innovation and tradition. Designed to exceed your expectations.`,
    `Indulge in the sophistication of our ${title}. A timeless piece that adds elegance to any setting.`,
  ];
  return randomChoice(descriptions);
}

function generateVariants(category, subcategory, price) {
  const variants = [];
  const config = CATEGORY_CONFIG[category];

  if (!config.hasVariants) return variants;

  const numVariants = randomInt(1, 4);

  if (category === 'clothing' || category === 'accessories') {
    // Sizes and colors
    const selectedSizes = SIZES.slice(0, randomInt(3, 6));
    const selectedColors = COLORS.slice(0, randomInt(2, 5));

    selectedSizes.forEach((size, sizeIdx) => {
      selectedColors.forEach((color, colorIdx) => {
        variants.push({
          size,
          color: color.name,
          colorCode: color.code,
          stock: randomInt(0, 50),
          price: price * randomFloat(0.9, 1.1),
          sku: generateSKU(category, subcategory, randomInt(1000, 9999)),
        });
      });
    });
  } else if (category === 'perfumes' || category === 'skincare') {
    // Volume sizes
    const selectedVolumes = VOLUME_SIZES.slice(0, randomInt(2, 4));

    selectedVolumes.forEach((volume, idx) => {
      const volumeNum = parseInt(volume);
      const priceMultiplier = 0.5 + idx * 0.3;
      variants.push({
        size: volume,
        stock: randomInt(0, 30),
        price: price * priceMultiplier,
        sku: generateSKU(category, subcategory, randomInt(1000, 9999)),
      });
    });
  } else if (category === 'makeup') {
    // Colors only
    const selectedColors = COLORS.slice(0, randomInt(3, 6));

    selectedColors.forEach((color, idx) => {
      variants.push({
        color: color.name,
        colorCode: color.code,
        stock: randomInt(0, 40),
        price: price,
        sku: generateSKU(category, subcategory, randomInt(1000, 9999)),
      });
    });
  } else if (category === 'home') {
    // Colors and sometimes sizes
    const selectedColors = COLORS.slice(0, randomInt(2, 4));

    selectedColors.forEach((color, idx) => {
      variants.push({
        color: color.name,
        colorCode: color.code,
        stock: randomInt(0, 20),
        price: price * randomFloat(0.95, 1.15),
        sku: generateSKU(category, subcategory, randomInt(1000, 9999)),
      });
    });
  }

  return variants.slice(0, numVariants);
}

function generateDimensions(weight) {
  const base = Math.cbrt(weight) * 10;
  return {
    length: parseFloat((base * randomFloat(0.8, 1.2)).toFixed(1)),
    width: parseFloat((base * randomFloat(0.7, 1.1)).toFixed(1)),
    height: parseFloat((base * randomFloat(0.6, 1.0)).toFixed(1)),
  };
}

// Generate brands for a category
function generateBrandsForCategory(category, multiplier = 1) {
  const brands = [];
  const baseBrands = BRAND_DATA[category] || [];

  for (let batch = 1; batch <= multiplier; batch++) {
    baseBrands.forEach((brand, idx) => {
      const brandId = new mongoose.Types.ObjectId();
      brands.push({
        _id: brandId,
        name: batch === 1 ? brand.name : `${brand.name} ${batch}`,
        slug: generateSlug(batch === 1 ? brand.name : `${brand.name} ${batch}`),
        description: brand.description,
        logo: `https://via.placeholder.com/150?text=${encodeURIComponent(brand.name)}`,
        website: `https://www.${generateSlug(brand.name)}.com`,
        country: brand.country,
        isActive: true,
        featured: idx < 3, // First 3 brands per category are featured
      });
    });
  }

  return brands;
}

// Generate products for a category
function generateProductsForCategory(
  category,
  brandIds,
  productsPerBrand = 10,
) {
  const products = [];
  const config = CATEGORY_CONFIG[category];
  let productIndex = 0;

  brandIds.forEach((brandId, brandIdx) => {
    config.subcategories.forEach((subcategory) => {
      const numProducts = randomInt(
        Math.floor(productsPerBrand / 2),
        productsPerBrand,
      );

      for (let i = 0; i < numProducts; i++) {
        productIndex++;
        const price = randomFloat(config.priceRange.min, config.priceRange.max);
        const weight = randomFloat(
          config.weightRange.min,
          config.weightRange.max,
        );
        const title = generateProductTitle(category, subcategory);

        const product = {
          title: title,
          brand: brandId,
          description: generateProductDescription(category, subcategory, title),
          price: price,
          basePrice: price,
          cover: generateImageUrl(category, subcategory, productIndex),
          images: [
            generateImageUrl(category, subcategory, productIndex),
            generateImageUrl(category, subcategory, productIndex + 1000),
            generateImageUrl(category, subcategory, productIndex + 2000),
          ],
          category: category,
          subcategory: subcategory,
          variants: generateVariants(category, subcategory, price),
          material: randomChoice(MATERIALS[category]),
          weight: weight,
          dimensions: generateDimensions(weight),
          shippingInfo: {
            weight: weight,
            dimensions: generateDimensions(weight),
            requiresSpecialHandling: weight > 2.0 || category === 'home',
          },
          stock: randomInt(0, 100),
          sku: generateSKU(category, subcategory, productIndex),
          isActive: true,
          featured: randomInt(1, 10) === 1, // 10% chance of being featured
          averageRating: randomFloat(2.5, 5.0),
          reviewCount: randomInt(0, 500),
        };

        products.push(product);
      }
    });
  });

  return products;
}

// Main function to generate all data
function buildSeedData(productsPerCategory = 50) {
  const brands = [];
  const products = [];
  const brandMap = {}; // Map category to array of brand IDs

  // Generate brands for each category
  Object.keys(CATEGORY_CONFIG).forEach((category) => {
    const categoryBrands = generateBrandsForCategory(category, 1);
    brands.push(...categoryBrands);
    brandMap[category] = categoryBrands.map((b) => b._id);
  });

  // Generate products for each category
  Object.keys(CATEGORY_CONFIG).forEach((category) => {
    const brandIds = brandMap[category];
    const categoryProducts = generateProductsForCategory(
      category,
      brandIds,
      Math.ceil(productsPerCategory / brandIds.length),
    );
    products.push(...categoryProducts);
  });

  return { brands, products };
}

// ---------------------------------------------------------------------------
// CMS / merchandising fixtures
//
// These collections have models, routes and dashboard screens but shipped with
// no data, which is why the storefront fell back to its demo constants and the
// CMS screens came up empty. Category slugs below must stay inside the Product
// enum (makeup/perfumes/clothing/skincare/accessories/home).
// ---------------------------------------------------------------------------

const LOOKBOOKS = [
  {
    id: 'soft-glow-routine',
    eyebrow: 'Beauty edit',
    title: 'The soft-glow routine',
    body: 'Five steps from cleanser to setting spray, built around a dewy finish that still reads natural in daylight.',
    ctaLabel: 'Shop the look',
    ctaHref: '/c/skincare',
    imageUrl:
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=80',
    tone: 'rose',
    active: true,
    sortOrder: 1,
  },
  {
    id: 'evening-signature',
    eyebrow: 'Fragrance',
    title: 'Building an evening signature',
    body: 'How to layer an eau de parfum over a body mist so the base notes carry through a long night out.',
    ctaLabel: 'Explore perfumes',
    ctaHref: '/c/perfumes',
    imageUrl:
      'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=80',
    tone: 'stone',
    active: true,
    sortOrder: 2,
  },
  {
    id: 'layered-everyday',
    eyebrow: 'Wardrobe',
    title: 'Layered pieces for shoulder season',
    body: 'Three outfits from seven pieces — knitwear, a structured shirt and denim that works from desk to dinner.',
    ctaLabel: 'Shop clothing',
    ctaHref: '/c/clothing',
    imageUrl:
      'https://images.unsplash.com/photo-1483985988106-5a81d489f5ea?auto=format&fit=crop&w=1200&q=80',
    tone: 'teal',
    active: true,
    sortOrder: 3,
  },
  {
    id: 'calm-corner',
    eyebrow: 'Home',
    title: 'A calm corner in one afternoon',
    body: 'Lighting, texture and scent layered into a reading nook you will actually sit in.',
    ctaLabel: 'Shop home',
    ctaHref: '/c/home',
    imageUrl:
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
    tone: 'stone',
    active: true,
    sortOrder: 4,
  },
  {
    // Inactive on purpose: gives the dashboard list an archived row to filter.
    id: 'winter-warmers',
    eyebrow: 'Archive',
    title: 'Winter warmers',
    body: 'Last season’s layering guide, kept for reference.',
    ctaLabel: 'Browse archive',
    ctaHref: '/c/clothing',
    imageUrl:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
    tone: 'stone',
    active: false,
    sortOrder: 99,
  },
];

const TESTIMONIALS = [
  {
    id: 'amira-k',
    name: 'Amira K.',
    role: 'Verified buyer',
    quote:
      'The serum arrived two days early and the shade match on the foundation was exactly what the product page described.',
    rating: 5,
    active: true,
    sortOrder: 1,
  },
  {
    id: 'jonas-r',
    name: 'Jonas R.',
    role: 'Verified buyer',
    quote:
      'I returned a jacket for a size swap and the whole thing took four days, no back-and-forth over email.',
    rating: 5,
    active: true,
    sortOrder: 2,
  },
  {
    id: 'lena-m',
    name: 'Lena M.',
    role: 'Fragrance collector',
    quote:
      'Discovery sets are how I found two house scents I would never have bought blind. Prices are clear, no surprise fees.',
    rating: 4,
    active: true,
    sortOrder: 3,
  },
  {
    id: 'tariq-s',
    name: 'Tariq S.',
    role: 'Verified buyer',
    quote:
      'Ordered candles and bedding for a housewarming. Packaging held up and the tracking updates were accurate the whole way.',
    rating: 5,
    active: true,
    sortOrder: 4,
  },
];

const HELP_TOPICS = [
  {
    id: 'orders-tracking',
    title: 'Orders & tracking',
    description:
      'Find an order, read its status, and follow a tracking number once it ships.',
    href: '/user/orders',
    icon: 'package',
    active: true,
    sortOrder: 1,
  },
  {
    id: 'shipping-delivery',
    title: 'Shipping & delivery',
    description: 'Delivery windows, shipping methods and what each one costs.',
    href: '/shipping',
    icon: 'truck',
    active: true,
    sortOrder: 2,
  },
  {
    id: 'returns-refunds',
    title: 'Returns & refunds',
    description:
      'Start a return, print a label, and see when the refund lands back on your card.',
    href: '/returns',
    icon: 'refresh',
    active: true,
    sortOrder: 3,
  },
  {
    id: 'payments-security',
    title: 'Payments & security',
    description: 'Accepted cards, when you are charged, and how checkout is secured.',
    href: '/help',
    icon: 'shield',
    active: true,
    sortOrder: 4,
  },
  {
    id: 'account-access',
    title: 'Account & sign-in',
    description: 'Reset a password, change your email, or manage saved addresses.',
    href: '/user/security',
    icon: 'user',
    active: true,
    sortOrder: 5,
  },
  {
    id: 'contact-us',
    title: 'Contact us',
    description: 'Send a message to the care team and get a reply by email.',
    href: '/contact',
    icon: 'headset',
    active: true,
    sortOrder: 6,
  },
];

// Bodies are HTML: the storefront renders them through lib/sanitizeHtml.ts.
// One active document per type — the model enforces that with a partial index.
const CMS_CONTENT = [
  {
    type: 'SHIPPING',
    title: 'Shipping & delivery',
    body: [
      '<h2>Delivery options</h2>',
      '<p>Standard delivery arrives in 3–5 business days. Express delivery arrives in 1–2 business days and is available on most addresses at checkout.</p>',
      '<h2>Costs</h2>',
      '<p>Shipping is calculated at checkout from your delivery address. The exact amount is always shown before you pay — we never add a fee afterwards.</p>',
      '<h2>Tracking</h2>',
      '<p>As soon as your parcel leaves our warehouse we email a tracking number. You can also follow it from <a href="/user/orders">your orders</a>.</p>',
      '<h2>Where we ship</h2>',
      '<p>We currently deliver to addresses served by our shipping zones. If your country is not offered at checkout, it is not yet supported.</p>',
    ].join('\n'),
    active: true,
  },
  {
    type: 'RETURNS',
    title: 'Returns & refunds',
    body: [
      '<h2>Return window</h2>',
      '<p>Unopened items can be returned within 30 days of delivery. Cosmetics and skincare must be unused and sealed for hygiene reasons.</p>',
      '<h2>How to start a return</h2>',
      '<ol><li>Open the order in <a href="/user/orders">your orders</a>.</li><li>Choose the items you want to send back and the reason.</li><li>Print the label we email you and hand the parcel to the carrier.</li></ol>',
      '<h2>Refunds</h2>',
      '<p>Refunds go back to the original payment method once the parcel reaches us, usually within 5 business days. You will get an email when it is issued.</p>',
      '<h2>Damaged or wrong items</h2>',
      '<p>Contact us within 48 hours of delivery and we will arrange a replacement or a full refund, including shipping.</p>',
    ].join('\n'),
    active: true,
  },
  {
    type: 'PRIVACY',
    title: 'Privacy policy',
    body: [
      '<h2>What we collect</h2>',
      '<p>We store the account details you give us, your order and delivery history, and the technical data needed to keep the shop secure.</p>',
      '<h2>Payments</h2>',
      '<p>Card details are handled by our payment processor and never reach our servers. We keep only the reference needed to match a payment to an order.</p>',
      '<h2>Your choices</h2>',
      '<p>You can edit or delete your account details at any time, and ask us for a copy of the data we hold about you.</p>',
    ].join('\n'),
    active: true,
  },
  {
    type: 'TERMS',
    title: 'Terms of service',
    body: [
      '<h2>Using the shop</h2>',
      '<p>By placing an order you confirm the details you gave us are accurate and that you are able to enter into a contract of sale.</p>',
      '<h2>Prices and availability</h2>',
      '<p>Prices and stock can change until an order is confirmed. If an item becomes unavailable after you pay, we refund it in full.</p>',
      '<h2>Liability</h2>',
      '<p>Nothing here limits the statutory rights you have as a consumer in your country.</p>',
    ].join('\n'),
    active: true,
  },
  {
    type: 'STOREFRONT_TRUST',
    title: 'Why shop with TrendVaulta',
    body: [
      '<p>Tracked delivery on every order, returns inside 30 days, encrypted checkout and a care team of real people.</p>',
    ].join('\n'),
    active: true,
  },
];

// Types are restricted to the StorefrontModule enum. Note that
// controllers/storefrontHome.controller.js still serves a static layout and
// does not read this collection; these rows drive the dashboard CMS screen and
// the /api/storefront-modules endpoints.
const STOREFRONT_MODULES = [
  {
    key: 'hero',
    type: 'hero_carousel',
    title: 'Homepage hero',
    active: true,
    sortOrder: 0,
    slides: [
      {
        id: 'hero-glow',
        eyebrow: 'Beauty edit',
        title: 'Soft-glow essentials for every routine',
        subtitle: 'Skincare and makeup picks with clear prices.',
        ctaLabel: 'Shop skincare',
        ctaHref: '/c/skincare',
        imageUrl: '/images/1.webp',
        tone: 'rose',
        active: true,
        sortOrder: 0,
      },
      {
        id: 'hero-wardrobe',
        eyebrow: 'Wardrobe',
        title: 'Everyday pieces that feel elevated',
        subtitle: 'Layer-ready looks without the noise.',
        ctaLabel: 'Shop clothing',
        ctaHref: '/c/clothing',
        imageUrl: '/images/2.webp',
        tone: 'indigo',
        active: true,
        sortOrder: 1,
      },
      {
        id: 'hero-offers',
        eyebrow: 'Today’s offers',
        title: 'Limited edits worth a second look',
        subtitle: 'Seasonal deals curated for TrendVaulta shoppers.',
        ctaLabel: 'See offers',
        ctaHref: '/offers',
        imageUrl: '/images/3.webp',
        tone: 'teal',
        active: true,
        sortOrder: 2,
      },
    ],
  },
  {
    key: 'trust',
    type: 'trust_strip',
    title: 'Trust strip',
    active: true,
    sortOrder: 1,
    trustItems: [
      {
        icon: 'truck',
        title: 'Fast shipping',
        description: 'Tracked delivery on every order',
      },
      {
        icon: 'refresh',
        title: 'Easy returns',
        description: 'Hassle-free returns within policy window',
      },
      {
        icon: 'shield',
        title: 'Secure checkout',
        description: 'Encrypted payments you can trust',
      },
      {
        icon: 'headset',
        title: 'Care support',
        description: 'Real people ready to help',
      },
    ],
  },
  {
    key: 'categories',
    type: 'categories',
    title: 'Shop by category',
    active: true,
    sortOrder: 2,
    limit: 6,
  },
  {
    key: 'deals',
    type: 'deals_rail',
    title: 'Today’s offers',
    active: true,
    sortOrder: 3,
    limit: 8,
  },
  {
    key: 'bestsellers',
    type: 'bestsellers',
    title: 'Bestsellers',
    active: true,
    sortOrder: 4,
    limit: 8,
  },
  {
    key: 'new_arrivals',
    type: 'new_arrivals',
    title: 'New arrivals',
    active: true,
    sortOrder: 5,
    limit: 8,
  },
  {
    key: 'featured_brands',
    type: 'featured_brands',
    title: 'Featured brands',
    active: true,
    sortOrder: 6,
    limit: 8,
  },
  {
    key: 'lookbooks',
    type: 'lookbooks',
    title: 'Lookbooks',
    active: true,
    sortOrder: 7,
    limit: 4,
  },
  {
    key: 'testimonials',
    type: 'testimonials',
    title: 'What shoppers say',
    active: true,
    sortOrder: 8,
    limit: 4,
  },
  {
    key: 'why_choose_us',
    type: 'why_choose_us',
    title: 'Why choose TrendVaulta',
    active: true,
    sortOrder: 9,
  },
];

// Singleton config read by GET /api/storefront/gift-finder. Unlike the
// controller's static fallback, every `category` here is a real Product enum
// value, so the generated PLP links actually return products.
const GIFT_FINDER_CONFIG = {
  active: true,
  occasions: [
    { id: 'birthday', label: 'Birthday', q: 'gift' },
    { id: 'thank-you', label: 'Thank you', q: 'gift set' },
    {
      id: 'self-care',
      label: 'Self-care',
      category: 'skincare',
      q: 'serum',
    },
    { id: 'housewarming', label: 'Housewarming', category: 'home' },
    { id: 'just-because', label: 'Just because', q: 'gift' },
  ],
  recipients: [
    { id: 'for-her', label: 'For her', category: 'makeup' },
    { id: 'for-him', label: 'For him', category: 'perfumes', q: 'cologne' },
    { id: 'for-home', label: 'For home', category: 'home' },
    { id: 'for-anyone', label: 'For anyone', category: 'accessories' },
  ],
  budgets: [
    { id: 'under-25', label: 'Under $25', maxPrice: 25 },
    { id: '25-50', label: '$25–$50', minPrice: 25, maxPrice: 50 },
    { id: '50-100', label: '$50–$100', minPrice: 50, maxPrice: 100 },
    { id: '100-plus', label: '$100+', minPrice: 100 },
  ],
};

/** Fraction taken off the combined price when products are bought as a bundle. */
const BUNDLE_DISCOUNT_RATE = 0.15;

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Build one bundle per category from products already inserted in the DB.
 *
 * `primaryProduct` is unique in the schema, so each bundle takes a distinct
 * primary. `items` holds the *companion* products only (the controller adds the
 * primary's own price back in), and `bundlePrice` covers primary + companions.
 *
 * @param {Array<{_id: unknown, category: string, price: number}>} products
 *   Products as returned from Mongo — not the pre-insert fixtures, which carry
 *   no _id.
 * @returns {Array<object>} Bundle documents ready for insertMany.
 */
function buildBundles(products) {
  const byCategory = new Map();
  for (const product of products) {
    if (!byCategory.has(product.category)) byCategory.set(product.category, []);
    byCategory.get(product.category).push(product);
  }

  const bundles = [];
  for (const [, candidates] of byCategory) {
    if (candidates.length < 3) continue;
    const [primary, ...rest] = candidates;
    const companions = rest.slice(0, 2);

    const total =
      Number(primary.price || 0) +
      companions.reduce((sum, p) => sum + Number(p.price || 0), 0);
    const savings = round2(total * BUNDLE_DISCOUNT_RATE);

    bundles.push({
      primaryProduct: primary._id,
      items: companions.map((p) => ({ product: p._id, quantity: 1 })),
      bundlePrice: round2(total - savings),
      savings,
      active: true,
    });
  }
  return bundles;
}

/** Question/answer pairs reused across the seeded products, by category. */
const QA_TEMPLATES = {
  makeup: [
    {
      question: 'Is this shade buildable for fair skin?',
      answer:
        'Yes — it sheers out on a damp sponge and layers well if you want fuller coverage.',
    },
    {
      question: 'How long does the wear last on oily skin?',
      answer: 'Around six to eight hours; a setting spray pushes it further.',
    },
    { question: 'Is the formula fragrance-free?' },
  ],
  perfumes: [
    {
      question: 'What are the base notes?',
      answer: 'Amber, soft musk and a little vanilla once it settles.',
    },
    {
      question: 'Does the 30ml come in the gift box too?',
      answer: 'Only the 50ml and 75ml ship in the presentation box.',
    },
    { question: 'How many sprays does the travel size hold?' },
  ],
  clothing: [
    {
      question: 'Does it run true to size?',
      answer: 'True to size through the shoulders; size up if you layer knitwear under it.',
    },
    {
      question: 'Can it go in the machine?',
      answer: 'Cold wash inside out, then hang to dry — no tumble drying.',
    },
    { question: 'Is the fabric lined?' },
  ],
  skincare: [
    {
      question: 'Can I use this with retinol?',
      answer: 'Yes, but alternate nights at first so you can judge how your skin reacts.',
    },
    {
      question: 'Is it suitable for sensitive skin?',
      answer: 'It is fragrance-free and pH balanced; patch test along the jaw for two nights.',
    },
    { question: 'How soon should I expect results?' },
  ],
  accessories: [
    {
      question: 'Is the hardware nickel-free?',
      answer: 'Yes, the plating is nickel-free and safe for pierced ears.',
    },
    {
      question: 'Does it come with a dust bag?',
      answer: 'Every order ships with a cotton dust bag and a care card.',
    },
    { question: 'What is the strap drop?' },
  ],
  home: [
    {
      question: 'How long is the burn time?',
      answer: 'Roughly 45 hours if you trim the wick before each use.',
    },
    {
      question: 'Is the fabric machine washable?',
      answer: 'Yes — cold wash, low tumble, and it softens after the first cycle.',
    },
    { question: 'Are replacement parts available?' },
  ],
};

/**
 * Build Q&A rows across the seeded catalogue: a few answered and approved
 * (so the storefront has something to render) plus one unanswered and
 * unapproved per category, which is what the dashboard moderation queue is for.
 *
 * @param {Array<{_id: unknown, category: string}>} products Inserted products.
 * @param {{askedBy?: unknown, answeredBy?: unknown}} [users]
 *   Optional author refs; both fields are optional in the schema, and the
 *   controllers fall back to 'Anonymous' when askedBy is absent.
 * @returns {Array<object>} ProductQA documents ready for insertMany.
 */
function buildProductQA(products, users = {}) {
  const byCategory = new Map();
  for (const product of products) {
    if (!byCategory.has(product.category)) byCategory.set(product.category, []);
    byCategory.get(product.category).push(product);
  }

  const rows = [];
  for (const [category, candidates] of byCategory) {
    const templates = QA_TEMPLATES[category] || [];
    templates.forEach((template, idx) => {
      const product = candidates[idx % candidates.length];
      if (!product) return;
      const answered = Boolean(template.answer);
      rows.push({
        product: product._id,
        question: template.question,
        ...(answered && { answer: template.answer }),
        ...(users.askedBy && { askedBy: users.askedBy }),
        ...(answered && users.answeredBy && { answeredBy: users.answeredBy }),
        helpful: answered ? 3 + idx : 0,
        notHelpful: 0,
        // Only answered questions are published; the rest sit in the queue.
        approved: answered,
      });
    });
  }
  return rows;
}

// Export function
module.exports = {
  buildSeedData,
  CATEGORY_CONFIG,
  LOOKBOOKS,
  TESTIMONIALS,
  HELP_TOPICS,
  CMS_CONTENT,
  STOREFRONT_MODULES,
  GIFT_FINDER_CONFIG,
  buildBundles,
  buildProductQA,
};
