# TrendVaulta API (`apps/api`)

REST backend for the TrendVaulta retail e-commerce platform (beauty / fashion / lifestyle). Serves the Next.js storefront (`apps/website`) and the Vite admin dashboard (`apps/dashboard`).

**Stack:** Node.js 20.9+, Express 5, MongoDB + Mongoose, Joi validation, JWT auth, bcryptjs, Stripe, Nodemailer, Helmet. No build step.

## Run

Install once from the repo root (npm workspaces), then in `apps/api`:

```bash
npm run dev     # nodemon app.js
npm start       # node app.js
npm test        # node --test app.test.js utils/*.test.js middlewares/*.test.js services/*.test.js
```

From the repo root: `npm run dev:api`, `npm run test:api`.

Default port is **3000** (`PORT` env). Base path is `/api`.

## Environment

Copy `.env.example` to `.env`; it documents every variable the code reads.
`config/env.js` validates the environment at startup and refuses to boot on
missing or unsafe values (see [`docs/DEPLOYMENT.md`](../../docs/DEPLOYMENT.md)). Summary:

| Group | Variables |
|---|---|
| Database | `MONGO_URL`, `DB_NAME` (`MONGO_TEST_URL` for the test suite) |
| Server | `PORT`, `NODE_ENV` |
| Auth | `JWT_SECRET_KEY` |
| CORS / URLs | `FRONTEND_URL`, `DASHBOARD_URL`, `ALLOWED_ORIGINS`, `PUBLIC_FRONTEND_URL`, `CORS_RELAXED` |
| Rate limits | `RATE_LIMIT_AUTH_MAX`, `RATE_LIMIT_PASSWORD_MAX`, `RATE_LIMIT_REFRESH_MAX`, `RATE_LIMIT_CHECKOUT_MAX`, `RATE_LIMIT_COUPON_MAX`, `RATE_LIMIT_VERIFY_MAX`, `RATE_LIMIT_QUOTE_MAX`, `RATE_LIMIT_CONTACT_MAX`, `RATE_LIMIT_NEWSLETTER_MAX`, `RATE_LIMIT_WHITELIST_IPS` |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `AUTO_REFUND_ON_CANCEL` |
| Shipping, tax, returns | `SHIPPING_FLAT_USD`, `TAX_RATE_PERCENT` (defaults; admins override both in Dashboard → Settings / shipping zones), `RETURN_WINDOW_DAYS` |
| Uploads | `STORAGE_DRIVER` (`local` \| `cloudinary`), `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER`, `UPLOAD_PUBLIC_BASE_URL` |
| Logging / shutdown | `LOG_LEVEL`, `LOG_PRETTY`, `LOG_FILE`, `LOG_DIR`, `SHUTDOWN_GRACE_MS` |
| Seeder | `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_USERNAME` |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`, `CONTACT_INBOX_EMAIL` (fallbacks: `EMAIL_USER`, `EMAIL_PASSWORD` / `EMAIL_PASS`) |
| Dev only | `DEV_ALLOW_DIRECT_ORDERS`, `ALLOW_DIRECT_ORDERS` |

## Project structure

```
apps/api/
├── app.js            # Express app: CORS, Helmet, Stripe webhook (raw body), route mounts, error handler
├── config/db.js      # Mongoose connection
├── routes/           # One router per resource, all mounted under /api
├── controllers/      # Business logic and response contracts
├── models/           # Mongoose schemas + Joi validators
├── middlewares/      # verfiyToken (JWT), checkRolePermission (RBAC), rateLimit, cors, logger
├── services/         # stripe.service.js, storage.service.js (local disk / Cloudinary)
├── utils/            # commerce (totals/shipping), mail, order transitions, serializers
├── tests/            # Integration test setup (mongodb-memory-server)
├── seeder.js         # Catalog seeder (see SEEDER_README.md)
└── data.js           # Seed data generators
```

Conventions: JWT via `Authorization: Bearer <token>` (`verfiyToken`, existing spelling); admin routes add `checkRolePermission('<resource>:<action>')`; responses are `{ message, data?, errors? }` (confirm per controller).

## Health

- `GET /health`, `GET /api/trendvaulta` — liveness (no DB)
- `GET /api/ready` — readiness; `503` until Mongo is connected (used as `healthCheckPath` in `render.yaml`)

## Stripe webhook

`POST /api/webhooks/stripe` is mounted in `app.js` **before** `express.json()` with a raw body; configure the endpoint in Stripe with `STRIPE_WEBHOOK_SECRET`. Events are de-duplicated via `models/StripeWebhookEvent.js`.

## Route groups

Derived from `routes/*.js` (all prefixed with `/api`). "admin" = JWT + role permission.

| Router | Endpoints |
|---|---|
| `auth.js` | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` |
| `profile.js` | `GET /auth/profile`, `PUT /auth/profile` (JWT) |
| `password.js` | `POST /password/forgot-password`, `POST /password/reset-password/:userId/:token` |
| `users.js` | `GET /users`, `GET /users/:id`, `PUT /users/:id` (roles, disable, notes), `DELETE /users/:id` (admin `users:*`) |
| `products.js` | `GET /products`, `GET /products/:id`; `POST /products`, `PUT /products/:id`, `DELETE /products/:id` (admin `products:*`) |
| `brands.js` | `GET /brands`, `GET /brands/:id`; `POST /brands`, `PUT /brands/:id`, `DELETE /brands/:id` (admin `brands:*`) |
| `productQA.js` | `GET /products/:id/qa`, `POST /products/:id/qa`, `POST /qa/:id/helpful`; `GET /qa/admin`, `GET /qa/:id`, `PUT /qa/:id/answer`, `DELETE /qa/:id` (admin `content:*`) |
| `bundles.js` | `GET /products/:id/bundles`; `GET /bundles/admin`, `GET /bundles/:id`, `POST /bundles`, `PUT /bundles/:id`, `DELETE /bundles/:id` (admin) |
| `orders.js` | `POST /orders`, `GET /orders/my`, `GET /orders/:id`, `POST /orders/:id/cancel`, `GET /orders/:id/invoice`, `POST`/`GET /orders/:id/return` (JWT, owner); `GET /orders` (`?user=`, `?returnStatus=`), `PATCH /orders/:id/status`, `PATCH /orders/:id/tracking`, `PATCH /orders/:id/return` (admin `orders:*`) |
| `payments.js` | `GET /payments/setup-status`, `POST /payments/quote`; `POST /payments/checkout-session`, `POST /payments/verify-payment` (JWT) |
| `wishlist.js` | `POST /wishlist/:productId`, `DELETE /wishlist/:productId`, `GET /wishlist/my`, `GET /wishlist/check/:productId` (JWT) |
| `recentlyViewed.js` | `POST /me/recently-viewed`, `GET /me/recently-viewed` (JWT) |
| `reviews.js` | `GET /reviews/product/:productId`; `POST /reviews`, `PUT /reviews/:reviewId`, `DELETE /reviews/:reviewId`, `GET /reviews/my`, `GET /reviews/my/:productId` (JWT); `GET /reviews/admin`, `PUT`/`DELETE /reviews/admin/:reviewId/reply`, `DELETE /reviews/admin/:reviewId` (admin `reviews:*`) |
| `coupons.js` | `POST /coupons/validate`, `GET /coupons/code/:code`; `GET /coupons`, `GET /coupons/:id`, `POST /coupons`, `PUT /coupons/:id`, `DELETE /coupons/:id`, `POST /coupons/:id/use` (admin `coupons:*`) |
| `offers.js` | `GET /offers`; admin CRUD (`offers:*`) |
| `recommendations.js` | `GET /recommendations` |
| `giftFinder.js` | `GET /storefront/gift-finder`; `GET /gift-finder/admin`, `GET /gift-finder/:id`, `POST /gift-finder`, `PUT /gift-finder/:id`, `DELETE /gift-finder/:id` (admin) |
| `lookbooks.js` | `GET /storefront/lookbooks`; `GET /lookbooks/admin`, `GET /lookbooks/:id`, `POST /lookbooks`, `PUT /lookbooks/:id`, `DELETE /lookbooks/:id` (admin) |
| `helpTopics.js` | `GET /storefront/help`; `GET /help-topics/admin`, `GET /help-topics/:id`, `POST /help-topics`, `PUT /help-topics/:id`, `DELETE /help-topics/:id` (admin) |
| `storefrontTestimonials.js` | `GET /storefront/testimonials`; `GET /testimonials/admin`, `GET /testimonials/:id`, `POST /testimonials`, `PUT /testimonials/:id`, `DELETE /testimonials/:id` (admin) |
| `storefrontModules.js` | `GET /storefront/modules`; `GET /storefront-modules/admin`, `GET /storefront-modules/:id`, `POST /storefront-modules`, `PUT /storefront-modules/:id`, `DELETE /storefront-modules/:id` (admin) |
| `content.js` | `GET /content`; `GET /content/admin`, `GET /content/:id`, `POST /content`, `PUT /content/:id`, `DELETE /content/:id` (admin) |
| `storefrontHome.js` | `GET /storefront/home` |
| `storefrontCategories.js` | `GET /storefront/categories`; `GET /categories/admin`, `POST /categories`, `PUT /categories/:id`, `DELETE /categories/:id` (admin `products:*`) |
| `uploads.js` | `POST /uploads` (JWT + `products:write` or `brands:write`; image files only) |
| `shipping.js` | `GET /shipping/zones`, `GET /shipping/methods` (JWT); `/admin/shipping/zones[/:id[/methods/:methodId]]` CRUD (admin `shipping:*`) |
| `settings.js` | `GET /admin/settings`, `PUT /admin/settings` (admin `content:*`) |
| `contact.js` | `POST /contact`; `GET /contact/admin` (admin `content:read`) |
| `newsletter.js` | `POST /newsletter`, `POST /newsletter/unsubscribe`; `GET /newsletter/admin` (admin `content:read`) |
| `storefrontTrust.js` | `GET /storefront/trust` |
| `storefrontWhyChooseUs.js` | `GET /storefront/why-choose-us` |
| `adminStats.js` | `GET /admin/stats`, `GET /admin/analytics` (`orders:read`); `GET /admin/low-stock` (`products:read`) |
| `trendvaulta.js` | `GET /trendvaulta`, `GET /ready` |

Storefront-content admin routes (bundles, gift-finder, lookbooks, help-topics, testimonials, storefront-modules, content, Q&A) use the `content:*` permission.

## Seeding

```bash
node seeder.js -import        # 50 products per category (~300)
node seeder.js -import 100    # custom volume
node seeder.js -remove        # delete seeded data
node seeder.js -help
```

See `SEEDER_README.md` for categories and generated fields. Uses `MONGO_URL` from `.env`.

## Deploy

`render.yaml` is a Render Blueprint (`rootDir: apps/api`, `healthCheckPath: /api/ready`, `STORAGE_DRIVER=cloudinary`); set `sync: false` secrets in the Render dashboard. Use MongoDB Atlas for production data. Full steps are in [`docs/DEPLOYMENT.md`](../../docs/DEPLOYMENT.md).

## License

ISC
