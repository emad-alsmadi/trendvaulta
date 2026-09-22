const bcrypt = require('bcryptjs');
const { Product } = require('./models/Product');
const { Brand } = require('./models/Brand');
const { Coupon } = require('./models/Coupon');
const { Offer } = require('./models/Offer');
const { User } = require('./models/User');
const { buildSeedData } = require('./data');
const { connectToDB } = require('./config/db');
require('dotenv').config();

// Refuses to wipe collections outside development/test unless explicitly
// overridden — deleteMany({}) on a production database is unrecoverable.
const FORCE_FLAG = process.argv.includes('--force');
function assertSafeToWrite() {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production' && !FORCE_FLAG) {
    console.error(
      `❌ Refusing to run against NODE_ENV=production (this deletes all products, brands, coupons and offers).\n` +
        `   Re-run with --force if you really mean to do this.`,
    );
    process.exit(1);
  }
}

/**
 * Create the admin user if none exists yet, or ensure an existing account
 * with SEED_ADMIN_EMAIL has the admin role. Needs SEED_ADMIN_EMAIL and
 * SEED_ADMIN_PASSWORD in the environment; silently skipped otherwise so a
 * bare `-import` still works without extra setup.
 */
async function seedAdminUser() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const username = process.env.SEED_ADMIN_USERNAME || 'admin';

  if (!email || !password) {
    console.log(
      'ℹ️  Skipping admin user (set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one).',
    );
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    if (!existing.roles?.includes('admin')) {
      existing.roles = [...new Set([...(existing.roles || []), 'admin'])];
      await existing.save();
      console.log(`👑 Granted admin role to existing user ${normalizedEmail}`);
    } else {
      console.log(`👑 Admin user ${normalizedEmail} already exists`);
    }
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  await User.create({
    email: normalizedEmail,
    username,
    password: hashedPassword,
    roles: ['admin'],
  });
  console.log(`👑 Created admin user ${normalizedEmail}`);
}

const dayMs = 24 * 60 * 60 * 1000;

const offers = [
  {
    title: 'Summer Glow Skincare Edit',
    subtitle: 'SPF, serums, and glow sets up to 35% off',
    badge: 'Limited',
    href: '/shop?category=skincare&sale=true',
    imageUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800',
    endsAt: new Date(Date.now() + 14 * dayMs),
    active: true,
    sortOrder: 1,
  },
  {
    title: 'Luxury Fragrance Weekend',
    subtitle: 'Eau de parfum bestsellers from $49',
    badge: 'Hot',
    href: '/shop?category=perfumes',
    imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800',
    endsAt: new Date(Date.now() + 3 * dayMs),
    active: true,
    sortOrder: 2,
  },
  {
    title: 'Makeup Must-Haves',
    subtitle: 'Lipsticks, palettes, and primers — buy 2 get 1',
    badge: 'BOGO',
    href: '/shop?category=makeup',
    imageUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800',
    endsAt: new Date(Date.now() + 21 * dayMs),
    active: true,
    sortOrder: 3,
  },
  {
    title: 'New Season Wardrobe',
    subtitle: 'Dresses, tops, and activewear from $19',
    badge: 'New',
    href: '/shop?category=clothing',
    imageUrl: 'https://images.unsplash.com/photo-1483985988106-5a81d489f5ea?w=800',
    endsAt: new Date(Date.now() + 30 * dayMs),
    active: true,
    sortOrder: 4,
  },
  {
    title: 'Accessories Flash Sale',
    subtitle: 'Bags, jewelry, and sunglasses up to 40% off',
    badge: 'Flash',
    href: '/shop?category=accessories',
    imageUrl: 'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=800',
    endsAt: new Date(Date.now() + 2 * dayMs),
    active: true,
    sortOrder: 5,
  },
  {
    title: 'Home Spa Night In',
    subtitle: 'Candles, linens, and self-care essentials',
    badge: 'Bundle',
    href: '/shop?category=home',
    imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800',
    endsAt: new Date(Date.now() + 45 * dayMs),
    active: true,
    sortOrder: 6,
  },
  {
    title: 'Clearance Beauty Edit',
    subtitle: 'Last-chance makeup and skincare deals',
    badge: 'Clearance',
    href: '/shop?sale=true',
    imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
    endsAt: null,
    active: true,
    sortOrder: 7,
  },
  {
    title: 'Archived Winter Warmers',
    subtitle: 'Inactive offer kept for admin/list testing',
    badge: 'Ended',
    href: '/shop?category=clothing',
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
    endsAt: new Date(Date.now() - 7 * dayMs),
    active: false,
    sortOrder: 99,
  },
];

const coupons = [
  {
    code: 'SUMMER20',
    discountType: 'percentage',
    discountValue: 20,
    expirationDate: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    usageLimit: 100,
    usedCount: 0,
    minimumOrderAmount: 10,
    isActive: true,
    description: 'Summer sale - 20% off all products',
  },
  {
    code: 'WELCOME10',
    discountType: 'percentage',
    discountValue: 10,
    expirationDate: new Date(
      Date.now() + 90 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    usageLimit: null,
    usedCount: 0,
    minimumOrderAmount: 0,
    isActive: true,
    description: 'Welcome discount for new customers',
  },
  {
    code: 'FIXED5',
    discountType: 'fixed',
    discountValue: 5,
    expirationDate: new Date(
      Date.now() + 60 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    usageLimit: 50,
    usedCount: 0,
    minimumOrderAmount: 15,
    isActive: true,
    description: '$5 off orders over $15',
  },
  {
    code: 'BIGSALE30',
    discountType: 'percentage',
    discountValue: 30,
    expirationDate: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    usageLimit: 20,
    usedCount: 0,
    minimumOrderAmount: 50,
    isActive: true,
    description: 'Big sale - 30% off orders over $50',
  },
  {
    code: 'EXPIRED20',
    discountType: 'percentage',
    discountValue: 20,
    expirationDate: new Date(
      Date.now() - 10 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    usageLimit: 100,
    usedCount: 0,
    minimumOrderAmount: 10,
    isActive: true,
    description: 'Expired coupon for testing',
  },
  {
    code: 'LIMITED5',
    discountType: 'fixed',
    discountValue: 10,
    expirationDate: new Date(
      Date.now() + 180 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    usageLimit: 5,
    usedCount: 3,
    minimumOrderAmount: 20,
    isActive: true,
    description: 'Limited use coupon - only 2 uses left',
  },
];

// Import Products, Brands, Coupons & Offers
const importData = async () => {
  try {
    assertSafeToWrite();
    await connectToDB();

    // Get products per category from command line argument or default to 50
    const productsPerCategory = parseInt(process.argv[3]) || 50;

    console.log('🗑️  Clearing existing data...');
    await Brand.deleteMany({});
    await Product.deleteMany({});
    await Coupon.deleteMany({});
    await Offer.deleteMany({});

    console.log('📦 Generating new data...');
    const { brands, products } = buildSeedData(productsPerCategory);

    console.log(`🏢 Inserting ${brands.length} brands...`);
    await Brand.insertMany(brands);

    console.log(`🛍️  Inserting ${products.length} products...`);
    await Product.insertMany(products);

    console.log(`🎫 Inserting ${coupons.length} coupons...`);
    await Coupon.insertMany(coupons);

    console.log(`🏷️  Inserting ${offers.length} offers...`);
    await Offer.insertMany(offers);

    await seedAdminUser();

    console.log('✅ Data imported successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Brands: ${brands.length}`);
    console.log(`   - Products: ${products.length}`);
    console.log(`   - Coupons: ${coupons.length}`);
    console.log(`   - Offers: ${offers.length}`);
    console.log(`   - Products per category: ~${productsPerCategory}`);

    process.exit();
  } catch (error) {
    console.log('❌ Error:', error);
    process.exit(1);
  }
};

// Remove Products, Brands, Coupons & Offers
const removeData = async () => {
  try {
    assertSafeToWrite();
    await connectToDB();
    console.log('🗑️  Removing data...');
    await Product.deleteMany({});
    await Brand.deleteMany({});
    await Coupon.deleteMany({});
    await Offer.deleteMany({});
    console.log('✅ Data removed successfully!');
    process.exit();
  } catch (error) {
    console.log('❌ Error:', error);
    process.exit(1);
  }
};

// Display usage information
const showUsage = () => {
  console.log('📖 Seeder Usage:');
  console.log('');
  console.log('  Import data:');
  console.log('    node seeder.js -import [productsPerCategory]');
  console.log('    Example: node seeder.js -import 50');
  console.log('    Default: 50 products per category');
  console.log('');
  console.log('  Remove data:');
  console.log('    node seeder.js -remove');
  console.log('');
  console.log('  Safety:');
  console.log('    Refuses to run when NODE_ENV=production unless --force is passed.');
  console.log('');
  console.log('  Admin user (optional):');
  console.log('    Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create/promote an admin');
  console.log('    account during -import. SEED_ADMIN_USERNAME defaults to "admin".');
  console.log('');
  console.log('  Show this help:');
  console.log('    node seeder.js -help');
  console.log('');
  process.exit();
};

if (process.argv[2] === '-import') {
  importData();
} else if (process.argv[2] === '-remove') {
  removeData();
} else if (process.argv[2] === '-help' || !process.argv[2]) {
  showUsage();
}
