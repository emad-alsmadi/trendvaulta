/**
 * Shared harness for API integration tests (node --test + supertest).
 *
 * - Boots an in-memory MongoDB (mongodb-memory-server) or, when
 *   MONGO_TEST_URL is set, connects to that server using a unique database
 *   that is dropped afterwards. When neither is possible the DB-backed tests
 *   are skipped with a clear reason instead of failing.
 * - Replaces `services/stripe.service` in the require cache BEFORE app.js is
 *   loaded, so every controller that destructures `getStripeOrThrow` receives
 *   the in-process fake below. No network call ever reaches Stripe.
 */
const path = require('node:path');
const { it } = require('node:test');
const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET_KEY ||= 'test-secret';
process.env.STRIPE_SECRET_KEY ||= 'sk_test_fake_key';
process.env.STRIPE_WEBHOOK_SECRET ||= 'whsec_test_fake';
process.env.FRONTEND_URL ||= 'http://localhost:3001';
// Never let a stray .env send real mail from the test run
for (const key of ['SMTP_HOST', 'SMTP_USER', 'EMAIL_USER']) {
  delete process.env[key];
}
delete process.env.AUTO_REFUND_ON_CANCEL;
delete process.env.SHIPPING_FLAT_USD;

// ---------------------------------------------------------------------------
// Stripe fake
// ---------------------------------------------------------------------------
let seq = 0;
const stripeMock = {
  calls: null,
  /** Map<sessionId, session object returned by checkout.sessions.retrieve> */
  sessions: null,
  /** Optional override: (sessionId) => session */
  retrieveImpl: null,
  reset() {
    this.calls = {
      sessionsCreate: [],
      sessionsRetrieve: [],
      couponsCreate: [],
      couponsDel: [],
      refundsCreate: [],
      constructEvent: [],
    };
    this.sessions = new Map();
    this.retrieveImpl = null;
  },
};
stripeMock.reset();

const fakeStripe = {
  checkout: {
    sessions: {
      async create(params) {
        stripeMock.calls.sessionsCreate.push(params);
        seq += 1;
        const id = `cs_test_${seq}`;
        return { id, url: `https://checkout.stripe.test/${id}`, ...params };
      },
      async retrieve(id) {
        stripeMock.calls.sessionsRetrieve.push(id);
        if (stripeMock.retrieveImpl) return stripeMock.retrieveImpl(id);
        const session = stripeMock.sessions.get(id);
        if (!session) {
          const err = new Error(`No such checkout session: ${id}`);
          err.statusCode = 404;
          throw err;
        }
        return session;
      },
    },
  },
  coupons: {
    async create(params) {
      stripeMock.calls.couponsCreate.push(params);
      seq += 1;
      return { id: `coupon_test_${seq}`, ...params };
    },
    async del(id) {
      stripeMock.calls.couponsDel.push(id);
      return { id, deleted: true };
    },
  },
  refunds: {
    async create(params, options) {
      stripeMock.calls.refundsCreate.push({ params, options });
      seq += 1;
      return {
        id: `re_test_${seq}`,
        payment_intent: params.payment_intent,
        amount: params.amount ?? 0,
        status: 'succeeded',
      };
    },
  },
  webhooks: {
    constructEvent(body, signature, secret) {
      stripeMock.calls.constructEvent.push({ signature, secret });
      if (!signature || signature === 'invalid') {
        throw new Error('No signatures found matching the expected signature for payload');
      }
      return JSON.parse(Buffer.isBuffer(body) ? body.toString('utf8') : String(body));
    },
  },
};

const stripeServicePath = path.resolve(__dirname, '../services/stripe.service.js');
const realStripeService = require(stripeServicePath);
require.cache[stripeServicePath].exports = {
  ...realStripeService,
  getStripeOrThrow: () => fakeStripe,
};

// App is loaded only now, so its controllers pick up the patched service.
const app = require('../app');
const { Order } = require('../models/Order');
const { Product } = require('../models/Product');
const { User } = require('../models/User');
const { Coupon } = require('../models/Coupon');
const StripeWebhookEvent = require('../models/StripeWebhookEvent');

// ---------------------------------------------------------------------------
// Database lifecycle
// ---------------------------------------------------------------------------
const state = {
  memoryServer: null,
  connected: false,
  unavailableReason: '',
};

async function connectDb() {
  if (state.connected) return;
  mongoose.set('bufferCommands', false);
  const dbName = `trendvaulta_test_${process.pid}_${Date.now()}`;
  try {
    let uri;
    if (process.env.MONGO_TEST_URL) {
      uri = process.env.MONGO_TEST_URL;
    } else {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      state.memoryServer = await MongoMemoryServer.create();
      uri = state.memoryServer.getUri();
    }
    await mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 10_000,
      connectTimeoutMS: 10_000,
    });
    state.connected = true;
  } catch (err) {
    state.unavailableReason = `MongoDB test server unavailable (${err?.message || err}). Set MONGO_TEST_URL or allow mongodb-memory-server to download its binary.`;
    console.warn(`[tests] ${state.unavailableReason}`);
  }
}

async function disconnectDb() {
  if (state.connected) {
    try {
      await mongoose.connection.dropDatabase();
    } catch {
      /* best-effort */
    }
    await mongoose.disconnect();
    state.connected = false;
  }
  if (state.memoryServer) {
    await state.memoryServer.stop();
    state.memoryServer = null;
  }
}

async function clearDb() {
  if (!state.connected) return;
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((c) => c.deleteMany({})));
  stripeMock.reset();
}

/** `it` that skips (with the reason) when no MongoDB could be started. */
function dbIt(name, fn) {
  return it(name, async (t) => {
    if (!state.connected) {
      t.skip(state.unavailableReason || 'MongoDB test server unavailable');
      return;
    }
    await fn(t);
  });
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
async function createUser({ roles = ['user'], ...overrides } = {}) {
  seq += 1;
  const user = await User.create({
    email: `user${seq}@test.local`,
    username: `user${seq}`,
    password: 'password123',
    roles,
    ...overrides,
  });
  return { user, token: user.generateToken() };
}

async function createProduct(overrides = {}) {
  seq += 1;
  const variants = overrides.variants;
  const stock =
    overrides.stock ??
    (Array.isArray(variants) && variants.length > 0
      ? variants.reduce((sum, v) => sum + Number(v.stock || 0), 0)
      : 10);
  return Product.create({
    title: `Test Product ${seq}`,
    brand: new mongoose.Types.ObjectId(),
    description: 'Integration test product',
    price: 25,
    cover: 'https://example.com/cover.jpg',
    category: 'makeup',
    subcategory: 'lipstick',
    isActive: true,
    ...overrides,
    stock,
  });
}

async function createCoupon(overrides = {}) {
  seq += 1;
  return Coupon.create({
    code: `SAVE${seq}`,
    discountType: 'fixed',
    discountValue: 5,
    expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    isActive: true,
    ...overrides,
  });
}

const shippingAddress = {
  name: 'Test Shopper',
  phone: '0123456789',
  address: '123 Test Street',
  city: 'Testville',
  zip: '12345',
};

/** Body for POST /api/payments/checkout-session. */
function checkoutBody(items, extra = {}) {
  return { items, shippingAddress, ...extra };
}

/** Directly persist an order (bypasses Stripe) for admin/order tests. */
async function createOrder({ user, product, qty = 1, variant, ...overrides } = {}) {
  const price = Number(product.price);
  const items = [
    {
      productId: product._id,
      title: product.title,
      price,
      qty,
      cover: product.cover,
      ...(variant ? { variant } : {}),
    },
  ];
  const itemsPrice = price * qty;
  return Order.create({
    user: user._id,
    items,
    shippingAddress,
    status: 'pending',
    itemsPrice,
    shippingPrice: 0,
    taxPrice: 0,
    discountAmount: 0,
    totalPrice: itemsPrice,
    paymentStatus: 'pending',
    stripeSessionId: '',
    paymentIntentId: '',
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Stripe event helpers
// ---------------------------------------------------------------------------
function completedSession(order, { paymentIntentId = 'pi_test_1', sessionId } = {}) {
  return {
    id: sessionId || order.stripeSessionId || `cs_test_manual_${order._id}`,
    object: 'checkout.session',
    mode: 'payment',
    payment_status: 'paid',
    status: 'complete',
    payment_intent: paymentIntentId,
    client_reference_id: String(order._id),
    metadata: {
      orderId: String(order._id),
      userId: String(order.user),
      kind: 'order_payment',
    },
  };
}

function checkoutCompletedEvent(session, { eventId } = {}) {
  seq += 1;
  return {
    id: eventId || `evt_test_${seq}`,
    type: 'checkout.session.completed',
    data: { object: session },
  };
}

function postWebhook(request, event, { signature = 't=1,v1=test' } = {}) {
  return request(app)
    .post('/api/webhooks/stripe')
    .set('stripe-signature', signature)
    .set('Content-Type', 'application/json')
    .send(JSON.stringify(event));
}

module.exports = {
  app,
  mongoose,
  models: { Order, Product, User, Coupon, StripeWebhookEvent },
  state,
  stripeMock,
  fakeStripe,
  connectDb,
  disconnectDb,
  clearDb,
  dbIt,
  createUser,
  createProduct,
  createCoupon,
  createOrder,
  checkoutBody,
  shippingAddress,
  completedSession,
  checkoutCompletedEvent,
  postWebhook,
};
