const bcrypt = require('bcryptjs');
const { Product } = require('./models/Product');
const { Brand } = require('./models/Brand');
const { Coupon } = require('./models/Coupon');
const { Offer } = require('./models/Offer');
const { User } = require('./models/User');
const { RefreshToken } = require('./models/RefreshToken');
const { revokeAllForUser } = require('./utils/refreshTokens');
const Bundle = require('./models/Bundle');
const Lookbook = require('./models/Lookbook');
const Testimonial = require('./models/Testimonial');
const StorefrontModule = require('./models/StorefrontModule');
const GiftFinderConfig = require('./models/GiftFinderConfig');
const ProductQA = require('./models/ProductQA');
const { Content } = require('./models/Content');
const { HelpTopic } = require('./models/HelpTopic');
const { Order } = require('./models/Order');
const { Review } = require('./models/Review');
const { Subscriber } = require('./models/Subscriber');
const { ContactMessage } = require('./models/ContactMessage');
const { ShippingZone } = require('./models/ShippingZone');
const { Category } = require('./models/Category');
const {
  buildSeedData,
  LOOKBOOKS,
  TESTIMONIALS,
  HELP_TOPICS,
  CMS_CONTENT,
  STOREFRONT_MODULES,
  GIFT_FINDER_CONFIG,
  buildBundles,
  buildProductQA,
} = require('./data');
const { connectToDB } = require('./config/db');
require('dotenv').config();

// Refuses to wipe collections outside development/test unless explicitly
// overridden — deleteMany({}) on a production database is unrecoverable.
const FORCE_FLAG = process.argv.includes('--force');
// Allows seedAdminUser to take over an existing non-admin account.
const PROMOTE_EXISTING_FLAG = process.argv.includes('--promote-existing');
function assertSafeToWrite() {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production' && !FORCE_FLAG) {
    console.error(
      `❌ Refusing to run against NODE_ENV=production (this deletes all products, brands, coupons, offers, CMS content and merchandising data).\n` +
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
 *
 * @returns {Promise<object|null>} The admin user, or null when skipped — the
 *   Q&A seed credits answers to it when one exists.
 */
async function seedAdminUser() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const username = process.env.SEED_ADMIN_USERNAME || 'admin';

  if (!email || !password) {
    console.log(
      'ℹ️  Skipping admin user (set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one).',
    );
    return null;
  }
  if (password.length < 8) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    if (existing.roles?.includes('admin')) {
      console.log(`👑 Admin user ${normalizedEmail} already exists`);
      return existing;
    }
    // Registration has no email verification, so this account may belong to
    // whoever signed up with the address first. Promoting it silently would
    // hand them the admin role with THEIR password — require an explicit
    // flag, and take the account over with the seed password.
    if (!PROMOTE_EXISTING_FLAG) {
      console.log(
        `⚠️  ${normalizedEmail} is an existing non-admin account — not promoted.\n` +
          '   Re-run with --promote-existing to make it admin (its password is reset to\n' +
          '   SEED_ADMIN_PASSWORD and its sessions are signed out).',
      );
      return null;
    }
    const salt = await bcrypt.genSalt(10);
    existing.password = await bcrypt.hash(password, salt);
    existing.roles = [...new Set([...(existing.roles || []), 'admin'])];
    existing.disabled = false;
    await existing.save();
    await revokeAllForUser(RefreshToken, existing._id);
    console.log(
      `👑 Promoted existing user ${normalizedEmail} to admin (password reset, sessions revoked)`,
    );
    return existing;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  const admin = await User.create({
    email: normalizedEmail,
    username,
    password: hashedPassword,
    roles: ['admin'],
  });
  console.log(`👑 Created admin user ${normalizedEmail}`);
  return admin;
}

/**
 * Seed the CMS and merchandising collections.
 *
 * Bundles and Q&A reference products, so this runs after the catalogue is in
 * the database and resolves the refs from what was actually inserted rather
 * than from the pre-insert fixtures (which carry no _id).
 *
 * @param {object|null} admin Admin user from seedAdminUser, used as the Q&A answerer.
 * @returns {Promise<Record<string, number>>} Inserted document count per collection.
 */
async function seedContent(admin) {
  console.log('🧹 Clearing CMS and merchandising data...');
  await Promise.all([
    Bundle.deleteMany({}),
    Lookbook.deleteMany({}),
    Testimonial.deleteMany({}),
    StorefrontModule.deleteMany({}),
    GiftFinderConfig.deleteMany({}),
    ProductQA.deleteMany({}),
    Content.deleteMany({}),
    HelpTopic.deleteMany({}),
  ]);

  console.log(`📰 Inserting ${CMS_CONTENT.length} CMS content pages...`);
  await Content.insertMany(CMS_CONTENT);

  console.log(`❓ Inserting ${HELP_TOPICS.length} help topics...`);
  await HelpTopic.insertMany(HELP_TOPICS);

  console.log(`📖 Inserting ${LOOKBOOKS.length} lookbooks...`);
  await Lookbook.insertMany(LOOKBOOKS);

  console.log(`💬 Inserting ${TESTIMONIALS.length} testimonials...`);
  await Testimonial.insertMany(TESTIMONIALS);

  console.log(
    `🧩 Inserting ${STOREFRONT_MODULES.length} storefront modules...`,
  );
  await StorefrontModule.insertMany(STOREFRONT_MODULES);

  console.log('🎁 Inserting gift finder config...');
  await GiftFinderConfig.create(GIFT_FINDER_CONFIG);

  // One representative product per category is enough to build bundles and Q&A
  // against; pulling the whole catalogue here would be wasteful.
  const catalogue = await Product.find({ isActive: true })
    .select('_id category price')
    .sort({ category: 1, createdAt: 1 })
    .lean();

  const bundles = buildBundles(catalogue);
  console.log(`🎒 Inserting ${bundles.length} bundles...`);
  await Bundle.insertMany(bundles);

  const qa = buildProductQA(catalogue, {
    askedBy: admin?._id,
    answeredBy: admin?._id,
  });
  console.log(`🗣️  Inserting ${qa.length} product Q&A entries...`);
  await ProductQA.insertMany(qa);

  return {
    content: CMS_CONTENT.length,
    helpTopics: HELP_TOPICS.length,
    lookbooks: LOOKBOOKS.length,
    testimonials: TESTIMONIALS.length,
    storefrontModules: STOREFRONT_MODULES.length,
    giftFinderConfig: 1,
    bundles: bundles.length,
    productQA: qa.length,
  };
}

const dayMs = 24 * 60 * 60 * 1000;

// ============================================
// DASHBOARD SEED DATA - PROFESSIONAL & MASSIVE
// ============================================

// Categories Seed Data
const CATEGORIES = [
  {
    name: 'Makeup',
    slug: 'makeup',
    description: 'Premium makeup products for every occasion',
    icon: '💄',
    sortOrder: 1,
    isActive: true,
  },
  {
    name: 'Perfumes',
    slug: 'perfumes',
    description: 'Luxury fragrances from around the world',
    icon: '🌸',
    sortOrder: 2,
    isActive: true,
  },
  {
    name: 'Clothing',
    slug: 'clothing',
    description: 'Fashion-forward clothing for all styles',
    icon: '👗',
    sortOrder: 3,
    isActive: true,
  },
  {
    name: 'Skincare',
    slug: 'skincare',
    description: 'Premium skincare for radiant skin',
    icon: '✨',
    sortOrder: 4,
    isActive: true,
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    description: 'Stylish accessories to complete your look',
    icon: '💍',
    sortOrder: 5,
    isActive: true,
  },
  {
    name: 'Home',
    slug: 'home',
    description: 'Beautiful home decor and essentials',
    icon: '🏠',
    sortOrder: 6,
    isActive: true,
  },
];

// Regular Users Seed Data
const REGULAR_USERS = [
  {
    email: 'sarah.johnson@example.com',
    username: 'sarahjohnson',
    password: 'password123',
    roles: ['user'],
  },
  {
    email: 'michael.smith@example.com',
    username: 'michaelsmith',
    password: 'password123',
    roles: ['user'],
  },
  {
    email: 'emma.wilson@example.com',
    username: 'emmawilson',
    password: 'password123',
    roles: ['user'],
  },
  {
    email: 'james.brown@example.com',
    username: 'jamesbrown',
    password: 'password123',
    roles: ['user'],
  },
  {
    email: 'olivia.davis@example.com',
    username: 'oliviadavis',
    password: 'password123',
    roles: ['user'],
  },
  {
    email: 'william.miller@example.com',
    username: 'williammiller',
    password: 'password123',
    roles: ['user'],
  },
  {
    email: 'sophia.garcia@example.com',
    username: 'sophiagarcia',
    password: 'password123',
    roles: ['user'],
  },
  {
    email: 'benjamin.martinez@example.com',
    username: 'benjaminmartinez',
    password: 'password123',
    roles: ['user'],
  },
  {
    email: 'isabella.anderson@example.com',
    username: 'isabellaanderson',
    password: 'password123',
    roles: ['user'],
  },
  {
    email: 'lucas.thomas@example.com',
    username: 'lucasthomas',
    password: 'password123',
    roles: ['user'],
  },
];

// Subscribers Seed Data
const SUBSCRIBERS = [
  { email: 'newsletter1@example.com', source: 'footer', status: 'subscribed' },
  {
    email: 'newsletter2@example.com',
    source: 'checkout',
    status: 'subscribed',
  },
  { email: 'newsletter3@example.com', source: 'footer', status: 'subscribed' },
  { email: 'newsletter4@example.com', source: 'other', status: 'subscribed' },
  {
    email: 'newsletter5@example.com',
    source: 'checkout',
    status: 'subscribed',
  },
  { email: 'newsletter6@example.com', source: 'footer', status: 'subscribed' },
  { email: 'newsletter7@example.com', source: 'footer', status: 'subscribed' },
  {
    email: 'newsletter8@example.com',
    source: 'checkout',
    status: 'subscribed',
  },
  { email: 'newsletter9@example.com', source: 'other', status: 'subscribed' },
  { email: 'newsletter10@example.com', source: 'footer', status: 'subscribed' },
  { email: 'newsletter11@example.com', source: 'footer', status: 'subscribed' },
  {
    email: 'newsletter12@example.com',
    source: 'checkout',
    status: 'subscribed',
  },
  { email: 'newsletter13@example.com', source: 'footer', status: 'subscribed' },
  { email: 'newsletter14@example.com', source: 'other', status: 'subscribed' },
  { email: 'newsletter15@example.com', source: 'footer', status: 'subscribed' },
  { email: 'pending1@example.com', source: 'footer', status: 'pending' },
  { email: 'pending2@example.com', source: 'checkout', status: 'pending' },
  { email: 'pending3@example.com', source: 'footer', status: 'pending' },
  {
    email: 'unsubscribed1@example.com',
    source: 'footer',
    status: 'unsubscribed',
  },
  {
    email: 'unsubscribed2@example.com',
    source: 'checkout',
    status: 'unsubscribed',
  },
];

// Contact Messages Seed Data
const CONTACT_MESSAGES = [
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    subject: 'Question about product availability',
    message:
      'Hi, I wanted to ask if the velvet matte lipstick in shade "Ruby Red" will be back in stock soon? I have been waiting for it for weeks.',
    status: 'new',
  },
  {
    name: 'Michael Smith',
    email: 'michael.smith@example.com',
    subject: 'Shipping delay inquiry',
    message:
      "My order #12345 was supposed to arrive yesterday but I haven't received any tracking updates. Can you please check the status?",
    status: 'read',
  },
  {
    name: 'Emma Wilson',
    email: 'emma.wilson@example.com',
    subject: 'Return request for damaged item',
    message:
      'I received my order today but the perfume bottle was broken during shipping. The box was damaged as well. I would like to request a return and refund.',
    status: 'new',
  },
  {
    name: 'James Brown',
    email: 'james.brown@example.com',
    subject: 'Wholesale inquiry',
    message:
      "I own a small boutique and I'm interested in purchasing your products in bulk. Do you offer wholesale pricing? What are the minimum order quantities?",
    status: 'new',
  },
  {
    name: 'Olivia Davis',
    email: 'olivia.davis@example.com',
    subject: 'Payment issue',
    message:
      'I tried to place an order but my payment was declined multiple times even though my card is valid. Can you help me resolve this issue?',
    status: 'read',
  },
  {
    name: 'William Miller',
    email: 'william.miller@example.com',
    subject: 'Product recommendation request',
    message:
      "I have sensitive skin and I'm looking for hypoallergenic skincare products. Can you recommend products from your skincare category that would be suitable?",
    status: 'new',
  },
  {
    name: 'Sophia Garcia',
    email: 'sophia.garcia@example.com',
    subject: 'Gift wrapping service',
    message:
      "I'm ordering a gift for my sister's birthday. Do you offer gift wrapping services? If so, how can I add this to my order?",
    status: 'closed',
  },
  {
    name: 'Benjamin Martinez',
    email: 'benjamin.martinez@example.com',
    subject: 'Account access problem',
    message:
      'I cannot log into my account. I tried resetting my password but I never received the reset email. Can you help me regain access?',
    status: 'read',
  },
  {
    name: 'Isabella Anderson',
    email: 'isabella.anderson@example.com',
    subject: 'Size guide question',
    message:
      "I'm interested in the Elegant Dress Design but I'm not sure about the sizing. Do you have a detailed size chart available? I usually wear a US size 6.",
    status: 'new',
  },
  {
    name: 'Lucas Thomas',
    email: 'lucas.thomas@example.com',
    subject: 'Coupon code not working',
    message:
      "I tried to use the WELCOME10 coupon code at checkout but it says it's invalid. I just signed up for your newsletter. Can you help?",
    status: 'closed',
  },
];

// Shipping Zones Seed Data
const SHIPPING_ZONES = [
  {
    name: 'United States',
    countries: ['US'],
    isActive: true,
    sortOrder: 1,
    methods: [
      {
        name: 'Standard Shipping',
        handle: 'standard',
        description: 'Standard delivery within 5-7 business days',
        priceUsd: 5.99,
        estimatedDaysMin: 5,
        estimatedDaysMax: 7,
        isActive: true,
        sortOrder: 1,
      },
      {
        name: 'Express Shipping',
        handle: 'express',
        description: 'Express delivery within 2-3 business days',
        priceUsd: 12.99,
        estimatedDaysMin: 2,
        estimatedDaysMax: 3,
        isActive: true,
        sortOrder: 2,
      },
      {
        name: 'Next Day Delivery',
        handle: 'next-day',
        description: 'Delivery by the next business day',
        priceUsd: 24.99,
        estimatedDaysMin: 1,
        estimatedDaysMax: 1,
        isActive: true,
        sortOrder: 3,
      },
    ],
  },
  {
    name: 'Canada',
    countries: ['CA'],
    isActive: true,
    sortOrder: 2,
    methods: [
      {
        name: 'Standard Shipping',
        handle: 'standard-ca',
        description: 'Standard delivery within 7-10 business days',
        priceUsd: 9.99,
        estimatedDaysMin: 7,
        estimatedDaysMax: 10,
        isActive: true,
        sortOrder: 1,
      },
      {
        name: 'Express Shipping',
        handle: 'express-ca',
        description: 'Express delivery within 3-5 business days',
        priceUsd: 19.99,
        estimatedDaysMin: 3,
        estimatedDaysMax: 5,
        isActive: true,
        sortOrder: 2,
      },
    ],
  },
  {
    name: 'United Kingdom',
    countries: ['GB'],
    isActive: true,
    sortOrder: 3,
    methods: [
      {
        name: 'Standard Shipping',
        handle: 'standard-uk',
        description: 'Standard delivery within 5-7 business days',
        priceUsd: 8.99,
        estimatedDaysMin: 5,
        estimatedDaysMax: 7,
        isActive: true,
        sortOrder: 1,
      },
      {
        name: 'Express Shipping',
        handle: 'express-uk',
        description: 'Express delivery within 2-3 business days',
        priceUsd: 15.99,
        estimatedDaysMin: 2,
        estimatedDaysMax: 3,
        isActive: true,
        sortOrder: 2,
      },
    ],
  },
  {
    name: 'European Union',
    countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'SE'],
    isActive: true,
    sortOrder: 4,
    methods: [
      {
        name: 'Standard Shipping',
        handle: 'standard-eu',
        description: 'Standard delivery within 7-10 business days',
        priceUsd: 11.99,
        estimatedDaysMin: 7,
        estimatedDaysMax: 10,
        isActive: true,
        sortOrder: 1,
      },
      {
        name: 'Express Shipping',
        handle: 'express-eu',
        description: 'Express delivery within 3-5 business days',
        priceUsd: 22.99,
        estimatedDaysMin: 3,
        estimatedDaysMax: 5,
        isActive: true,
        sortOrder: 2,
      },
    ],
  },
  {
    name: 'GCC Countries',
    countries: ['SA', 'AE', 'QA', 'KW', 'BH', 'OM'],
    isActive: true,
    sortOrder: 5,
    methods: [
      {
        name: 'Standard Shipping',
        handle: 'standard-gcc',
        description: 'Standard delivery within 5-7 business days',
        priceUsd: 7.99,
        estimatedDaysMin: 5,
        estimatedDaysMax: 7,
        isActive: true,
        sortOrder: 1,
      },
      {
        name: 'Express Shipping',
        handle: 'express-gcc',
        description: 'Express delivery within 2-3 business days',
        priceUsd: 14.99,
        estimatedDaysMin: 2,
        estimatedDaysMax: 3,
        isActive: true,
        sortOrder: 2,
      },
    ],
  },
  {
    name: 'Rest of World',
    countries: [],
    isActive: true,
    sortOrder: 6,
    methods: [
      {
        name: 'International Standard',
        handle: 'international-standard',
        description: 'Standard delivery within 10-15 business days',
        priceUsd: 19.99,
        estimatedDaysMin: 10,
        estimatedDaysMax: 15,
        isActive: true,
        sortOrder: 1,
      },
      {
        name: 'International Express',
        handle: 'international-express',
        description: 'Express delivery within 5-7 business days',
        priceUsd: 39.99,
        estimatedDaysMin: 5,
        estimatedDaysMax: 7,
        isActive: true,
        sortOrder: 2,
      },
    ],
  },
];

// Helper function to generate orders
async function generateOrders(users, products) {
  const orders = [];
  const statuses = [
    'pending',
    'paid',
    'shipped',
    'delivered',
    'canceled',
    'needs_attention',
    'refunded',
  ];
  const paymentStatuses = ['unpaid', 'pending', 'paid', 'failed', 'refunded'];

  for (let i = 0; i < 50; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const numItems = Math.floor(Math.random() * 4) + 1;
    const items = [];
    let itemsPrice = 0;

    for (let j = 0; j < numItems; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const qty = Math.floor(Math.random() * 3) + 1;
      const price = product.price || product.variants?.[0]?.price || 29.99;
      itemsPrice += price * qty;

      items.push({
        productId: product._id,
        title: product.title,
        price: price,
        qty: qty,
        cover: product.cover,
        variant: product.variants?.[0] || {},
      });
    }

    const shippingPrice = Math.random() > 0.5 ? 5.99 : 12.99;
    const taxPrice = itemsPrice * 0.1;
    const discountAmount = Math.random() > 0.7 ? itemsPrice * 0.1 : 0;
    const totalPrice = itemsPrice + shippingPrice + taxPrice - discountAmount;

    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const paymentStatus =
      paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];

    const order = {
      user: user._id,
      guestEmail: '',
      locale: Math.random() > 0.5 ? 'en' : 'ar',
      items: items,
      shippingAddress: {
        name: user.username,
        phone: '+1234567890',
        address: `${Math.floor(Math.random() * 999) + 1} Main Street`,
        city: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami'][
          Math.floor(Math.random() * 5)
        ],
        zip: String(Math.floor(Math.random() * 99999) + 10000),
        country: 'US',
        notes: '',
      },
      status: status,
      attentionReason: status === 'needs_attention' ? 'insufficient_stock' : '',
      delivery: true,
      shippingMethod: 'standard',
      itemsPrice: itemsPrice,
      shippingPrice: shippingPrice,
      taxPrice: taxPrice,
      discountAmount: discountAmount,
      couponCode: discountAmount > 0 ? 'SUMMER20' : '',
      totalPrice: totalPrice,
      paymentStatus: paymentStatus,
      stripeSessionId: '',
      paymentIntentId: '',
      paidAt:
        paymentStatus === 'paid'
          ? new Date(Date.now() - Math.random() * 30 * dayMs)
          : null,
      stockDecremented: paymentStatus === 'paid',
      couponIncremented: discountAmount > 0,
      salesCountIncremented: paymentStatus === 'paid',
      confirmationEmailSent: paymentStatus === 'paid',
      trackingNumber:
        status === 'shipped' || status === 'delivered'
          ? `TRK${Math.random().toString(36).substring(2, 12).toUpperCase()}`
          : '',
      trackingCarrier:
        status === 'shipped' || status === 'delivered' ? 'FedEx' : '',
      trackingUrl:
        status === 'shipped' || status === 'delivered'
          ? 'https://www.fedex.com/fedextrack/?trknbr='
          : '',
      shippedAt:
        status === 'shipped' || status === 'delivered'
          ? new Date(Date.now() - Math.random() * 15 * dayMs)
          : null,
      deliveredAt:
        status === 'delivered'
          ? new Date(Date.now() - Math.random() * 7 * dayMs)
          : null,
      trackingEvents:
        status === 'shipped' || status === 'delivered'
          ? [
              {
                status: 'picked_up',
                description: 'Package picked up',
                location: 'Origin Facility',
                timestamp: new Date(Date.now() - Math.random() * 20 * dayMs),
              },
              {
                status: 'in_transit',
                description: 'In transit to destination',
                location: 'Transit Hub',
                timestamp: new Date(Date.now() - Math.random() * 15 * dayMs),
              },
            ]
          : [],
      returnRequest:
        status === 'delivered' && Math.random() > 0.8
          ? {
              status: 'requested',
              reason: 'Item not as described',
              items: items.slice(0, 1).map((item) => ({
                productId: item.productId,
                title: item.title,
                qty: 1,
                reason: 'Quality issue',
              })),
              requestedAt: new Date(Date.now() - Math.random() * 3 * dayMs),
            }
          : null,
    };

    orders.push(order);
  }

  return orders;
}

// Helper function to generate reviews
async function generateReviews(users, products) {
  const reviews = [];
  const comments = [
    'Absolutely love this product! Exceeded my expectations.',
    'Great quality for the price. Would definitely recommend.',
    'Fast shipping and excellent packaging. Very satisfied.',
    'The product is exactly as described. Very happy with my purchase.',
    'Amazing quality! Will be buying more from this brand.',
    'Good product but shipping took a bit longer than expected.',
    'Perfect! This is exactly what I was looking for.',
    'Excellent customer service and product quality.',
    'Very impressed with the quality and attention to detail.',
    'Worth every penny. Highly recommend to others.',
  ];

  for (let i = 0; i < 80; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const product = products[Math.floor(Math.random() * products.length)];
    const rating = Math.floor(Math.random() * 5) + 1;
    const comment = comments[Math.floor(Math.random() * comments.length)];

    const review = {
      user: user._id,
      product: product._id,
      rating: rating,
      comment: comment,
      verifiedPurchase: Math.random() > 0.3,
      reply:
        Math.random() > 0.7
          ? {
              text: 'Thank you for your feedback! We are glad you enjoyed the product.',
              repliedBy: null, // Will be set to admin
              repliedAt: new Date(Date.now() - Math.random() * 5 * dayMs),
            }
          : undefined,
    };

    reviews.push(review);
  }

  return reviews;
}

// Seed dashboard data
async function seedDashboardData(users, products) {
  console.log('🗑️  Clearing dashboard data...');
  await Promise.all([
    Category.deleteMany({}),
    User.deleteMany({ roles: { $ne: 'admin' } }),
    Subscriber.deleteMany({}),
    ContactMessage.deleteMany({}),
    ShippingZone.deleteMany({}),
    Order.deleteMany({}),
    Review.deleteMany({}),
  ]);

  console.log(`📁 Inserting ${CATEGORIES.length} categories...`);
  await Category.insertMany(CATEGORIES);

  console.log(`👥 Inserting ${REGULAR_USERS.length} regular users...`);
  const salt = await bcrypt.genSalt(10);
  const hashedUsers = await Promise.all(
    REGULAR_USERS.map(async (user) => ({
      ...user,
      password: await bcrypt.hash(user.password, salt),
    })),
  );
  const createdUsers = await User.insertMany(hashedUsers);

  // Combine with any passed-in users (like admin) for orders/reviews
  const allUsers = [...createdUsers];
  if (users && users.length > 0) {
    const adminUsers = users.filter((u) => u.roles?.includes('admin'));
    allUsers.push(...adminUsers);
  }

  console.log(`📧 Inserting ${SUBSCRIBERS.length} subscribers...`);
  const subscribersWithDates = SUBSCRIBERS.map((sub) => ({
    ...sub,
    confirmedAt:
      sub.status === 'subscribed'
        ? new Date(Date.now() - Math.random() * 60 * dayMs)
        : null,
  }));
  await Subscriber.insertMany(subscribersWithDates);

  console.log(`💬 Inserting ${CONTACT_MESSAGES.length} contact messages...`);
  await ContactMessage.insertMany(CONTACT_MESSAGES);

  console.log(`🚚 Inserting ${SHIPPING_ZONES.length} shipping zones...`);
  await ShippingZone.insertMany(SHIPPING_ZONES);

  console.log(`📦 Generating and inserting orders...`);
  const orders = await generateOrders(allUsers, products);
  await Order.insertMany(orders);

  console.log(`⭐ Generating and inserting reviews...`);
  const reviews = await generateReviews(allUsers, products);
  await Review.insertMany(reviews);

  return {
    categories: CATEGORIES.length,
    users: createdUsers.length,
    subscribers: SUBSCRIBERS.length,
    contactMessages: CONTACT_MESSAGES.length,
    shippingZones: SHIPPING_ZONES.length,
    orders: orders.length,
    reviews: reviews.length,
  };
}

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
    imageUrl:
      'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800',
    endsAt: new Date(Date.now() + 3 * dayMs),
    active: true,
    sortOrder: 2,
  },
  {
    title: 'Makeup Must-Haves',
    subtitle: 'Lipsticks, palettes, and primers — buy 2 get 1',
    badge: 'BOGO',
    href: '/shop?category=makeup',
    imageUrl:
      'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800',
    endsAt: new Date(Date.now() + 21 * dayMs),
    active: true,
    sortOrder: 3,
  },
  {
    title: 'New Season Wardrobe',
    subtitle: 'Dresses, tops, and activewear from $19',
    badge: 'New',
    href: '/shop?category=clothing',
    imageUrl:
      'https://images.unsplash.com/photo-1483985988106-5a81d489f5ea?w=800',
    endsAt: new Date(Date.now() + 30 * dayMs),
    active: true,
    sortOrder: 4,
  },
  {
    title: 'Accessories Flash Sale',
    subtitle: 'Bags, jewelry, and sunglasses up to 40% off',
    badge: 'Flash',
    href: '/shop?category=accessories',
    imageUrl:
      'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=800',
    endsAt: new Date(Date.now() + 2 * dayMs),
    active: true,
    sortOrder: 5,
  },
  {
    title: 'Home Spa Night In',
    subtitle: 'Candles, linens, and self-care essentials',
    badge: 'Bundle',
    href: '/shop?category=home',
    imageUrl:
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800',
    endsAt: new Date(Date.now() + 45 * dayMs),
    active: true,
    sortOrder: 6,
  },
  {
    title: 'Clearance Beauty Edit',
    subtitle: 'Last-chance makeup and skincare deals',
    badge: 'Clearance',
    href: '/shop?sale=true',
    imageUrl:
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
    endsAt: null,
    active: true,
    sortOrder: 7,
  },
  {
    title: 'Archived Winter Warmers',
    subtitle: 'Inactive offer kept for admin/list testing',
    badge: 'Ended',
    href: '/shop?category=clothing',
    imageUrl:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
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
    const insertedProducts = await Product.insertMany(products);

    console.log(`🎫 Inserting ${coupons.length} coupons...`);
    await Coupon.insertMany(coupons);

    console.log(`🏷️  Inserting ${offers.length} offers...`);
    await Offer.insertMany(offers);

    const admin = await seedAdminUser();
    const contentCounts = await seedContent(admin);

    // Seed dashboard-specific data (pass users directly)
    const allUsers = [...createdUsers];
    if (admin) allUsers.push(admin);
    const dashboardCounts = await seedDashboardData(allUsers, insertedProducts);

    console.log('✅ Data imported successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Brands: ${brands.length}`);
    console.log(`   - Products: ${products.length}`);
    console.log(`   - Coupons: ${coupons.length}`);
    console.log(`   - Offers: ${offers.length}`);
    console.log(`   - CMS content pages: ${contentCounts.content}`);
    console.log(`   - Help topics: ${contentCounts.helpTopics}`);
    console.log(`   - Lookbooks: ${contentCounts.lookbooks}`);
    console.log(`   - Testimonials: ${contentCounts.testimonials}`);
    console.log(`   - Storefront modules: ${contentCounts.storefrontModules}`);
    console.log(`   - Gift finder config: ${contentCounts.giftFinderConfig}`);
    console.log(`   - Bundles: ${contentCounts.bundles}`);
    console.log(`   - Product Q&A: ${contentCounts.productQA}`);
    console.log(`   - Products per category: ~${productsPerCategory}`);
    console.log(`   - Categories: ${dashboardCounts.categories}`);
    console.log(`   - Regular users: ${dashboardCounts.users}`);
    console.log(`   - Subscribers: ${dashboardCounts.subscribers}`);
    console.log(`   - Contact messages: ${dashboardCounts.contactMessages}`);
    console.log(`   - Shipping zones: ${dashboardCounts.shippingZones}`);
    console.log(`   - Orders: ${dashboardCounts.orders}`);
    console.log(`   - Reviews: ${dashboardCounts.reviews}`);

    process.exit();
  } catch (error) {
    console.log('❌ Error:', error);
    process.exit(1);
  }
};

// Remove the catalogue plus every CMS/merchandising collection -import writes
const removeData = async () => {
  try {
    assertSafeToWrite();
    await connectToDB();
    console.log('🗑️  Removing data...');
    await Product.deleteMany({});
    await Brand.deleteMany({});
    await Coupon.deleteMany({});
    await Offer.deleteMany({});
    // Bundles and Q&A point at products that no longer exist, so they have to
    // go too — leaving them behind would surface dangling refs on the storefront.
    await Promise.all([
      Bundle.deleteMany({}),
      Lookbook.deleteMany({}),
      Testimonial.deleteMany({}),
      StorefrontModule.deleteMany({}),
      GiftFinderConfig.deleteMany({}),
      ProductQA.deleteMany({}),
      Content.deleteMany({}),
      HelpTopic.deleteMany({}),
      Category.deleteMany({}),
      User.deleteMany({ roles: { $ne: 'admin' } }),
      Subscriber.deleteMany({}),
      ContactMessage.deleteMany({}),
      ShippingZone.deleteMany({}),
      Order.deleteMany({}),
      Review.deleteMany({}),
    ]);
    console.log('✅ Data removed successfully!');
    process.exit();
  } catch (error) {
    console.log('❌ Error:', error);
    process.exit(1);
  }
};

// Create (or confirm) only the admin account — no other collection is
// touched, so this is the safe way to bootstrap or recover the first admin
// on a production database (no --force needed).
const createAdmin = async () => {
  try {
    if (!process.env.SEED_ADMIN_EMAIL || !process.env.SEED_ADMIN_PASSWORD) {
      console.error(
        '❌ Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (and optionally SEED_ADMIN_USERNAME).',
      );
      process.exit(1);
    }
    await connectToDB();
    const admin = await seedAdminUser();
    process.exit(admin ? 0 : 1);
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
  console.log(
    '    Seeds brands, products, coupons and offers, then the CMS and',
  );
  console.log('    merchandising collections: content pages, help topics,');
  console.log(
    '    lookbooks, testimonials, storefront modules, the gift finder',
  );
  console.log('    config, bundles and product Q&A.');
  console.log('');
  console.log('    Also seeds dashboard data: categories, regular users,');
  console.log(
    '    subscribers, contact messages, shipping zones, orders, and reviews.',
  );
  console.log('');
  console.log('  Remove data:');
  console.log('    node seeder.js -remove');
  console.log('    Clears every collection -import writes.');
  console.log('');
  console.log('  Safety:');
  console.log(
    '    Refuses to run when NODE_ENV=production unless --force is passed.',
  );
  console.log('');
  console.log('  Admin user only (safe on production — touches nothing else):');
  console.log('    node seeder.js -admin');
  console.log(
    '    Needs SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (SEED_ADMIN_USERNAME defaults',
  );
  console.log('    to "admin"). -import also creates it when those are set.');
  console.log(
    '    An existing NON-admin account with that email is only promoted with',
  );
  console.log(
    '    --promote-existing (its password is reset to SEED_ADMIN_PASSWORD).',
  );
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
} else if (process.argv[2] === '-admin') {
  createAdmin();
} else if (process.argv[2] === '-help' || !process.argv[2]) {
  showUsage();
}
