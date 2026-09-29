# TrendVaulta — Project Reference

**Date:** 2026-09-24
**Scope:** Single reference for setup, deployment, CI, API surface, data model, security posture, business rules, and open work. Replaces all previous docs and audits — see git history for how the system got here.

**Stack:** npm workspaces monorepo — `apps/api` (Express 5 + Mongoose), `apps/website` (Next.js 16 storefront), `apps/dashboard` (Vite + React admin). Domain: products & brands catalog.

---

## 1. Local setup

From a fresh clone to all three apps running with data, in about ten minutes.

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | **22.12+** (CI uses 22) | Required by Next.js 16; set in root `package.json` `engines` |
| npm | 10+ | The repo uses **npm workspaces** (there is no `pnpm-workspace.yaml`) |
| MongoDB | 6+ | Local `mongod`, Docker, or a free Atlas cluster |
| Stripe account | test mode | Optional — only needed to exercise checkout and refunds |

### Install

```bash
git clone <repo-url> trendvaulta
cd trendvaulta
npm install
```

One install at the root covers all apps. The dashboard has no lockfile of its own.

### Environment files

```bash
cp apps/api/.env.example apps/api/.env
cp apps/website/.env.example apps/website/.env.local
cp apps/dashboard/.env.example apps/dashboard/.env
```

The API refuses to start until these two are set in `apps/api/.env`:

| Variable | Example |
|---|---|
| `MONGO_URL` | `mongodb://127.0.0.1:27017` or an Atlas URI |
| `JWT_SECRET_KEY` | any long random string, e.g. `openssl rand -hex 32` |

Everything else has working defaults for development. The website and dashboard defaults point at `localhost:3000`, so they need no edits.

Optional, per feature:

| To work on | Set in `apps/api/.env` |
|---|---|
| Checkout / refunds | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (see §5 below) |
| Emails (reset, order status, contact) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL` |
| Cloudinary uploads | `STORAGE_DRIVER=cloudinary` + `CLOUDINARY_*`, and `CLOUDINARY_CLOUD_NAME` in the website env too |
| Orders without Stripe | `DEV_ALLOW_DIRECT_ORDERS=true` (API) and `NEXT_PUBLIC_ALLOW_CHECKOUT_WITHOUT_STRIPE=true` (website) |

Each variable is documented inline in its `.env.example`.

### Seed data and an admin account

```bash
# add to apps/api/.env
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=change-me-please
```

```bash
cd apps/api ; node seeder.js -import 20
```

Loads brands, products (20 per category), coupons, offers, CMS content and merchandising data, and creates/promotes the admin user. **Deletes the existing catalog first** and refuses to run with `NODE_ENV=production`. See `apps/api/SEEDER_README.md` for options.

### Run

```bash
npm run dev
```

| URL | App |
|---|---|
| http://localhost:3001 | Storefront |
| http://localhost:3002 | Dashboard (sign in with the seeded admin) |
| http://localhost:3000/api/ready | API readiness (`200` once Mongo is connected) |

Run one app at a time with `npm run dev:api`, `npm run dev:website` or `npm run dev:dashboard`. The storefront rewrites `/api/*` to the API, and the dashboard's Vite server proxies `/api` the same way — the browser never calls port 3000 directly, so CORS doesn't get in the way.

### Stripe webhooks (only for checkout work)

The checkout success page confirms payment itself (`POST /api/payments/verify-payment`), so a basic purchase works without webhooks. Refunds made in Stripe, expired sessions, and shoppers who close the tab before the success page loads rely on the webhook:

```bash
stripe login ; stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the `whsec_…` secret into `STRIPE_WEBHOOK_SECRET` and restart the API. Test card: `4242 4242 4242 4242`, any future date, any CVC.

### Checks before a PR

Runs in CI in this order (see §3):

```bash
npm run lint ; npm run typecheck:website ; npm run test:api ; npm run build
```

### Troubleshooting

| Symptom | Cause |
|---|---|
| API exits with `Invalid environment configuration` | A required variable is missing — the message lists which ones |
| `/api/ready` returns `503` | MongoDB is not reachable at `MONGO_URL` |
| Dashboard login says "staff role required" | The account is not an admin or moderator — re-run the seeder with `SEED_ADMIN_*` set |
| Refunds done in Stripe never show on the order | The webhook isn't forwarded, or `STRIPE_WEBHOOK_SECRET` doesn't match `stripe listen` |
| Product images fail to load with Cloudinary | `CLOUDINARY_CLOUD_NAME` is missing from the **website** env (needed by `next/image`) |
| `tsc` reports missing `.next/types/…/page.js` | The route type cache is stale after a page was removed — delete `apps/website/.next/types` (or `.next` entirely) |
| Storefront is in Arabic | The language is stored in the `tv_locale` cookie — switch it back from the header |

---

## 2. Localization (i18n)

The storefront supports English and Arabic:

- **Locale storage:** `tv_locale` cookie (no `/ar` routes). Read server-side by `apps/website/src/lib/i18n-server.ts` so `<html lang dir>` is correct on first paint; client components use `useTranslation()` from `contexts/TranslationContext`.
- **Dictionaries:** `apps/website/src/messages/{en,ar}.json`, dot-path keys namespaced per page/feature, English fallback for missing Arabic keys.
- **RTL:** logical Tailwind classes (`ms/me/ps/pe`, `text-start/end`) throughout; directional icons mirror with `rtl:-scale-x-100`.
- **Currency:** USD only, formatted per locale (Latin digits) — no currency conversion or per-locale currency switch. A live symbol switcher was considered and rejected (it would show `$10` as `ر.س10`, which is wrong).
- **Scope covered:** header/nav, purchase path, product pages, account area, auth + password flows, home rails, catalog filters/pagination/category names, brands, offers, static content, legal pages (terms/privacy/cookies), footer, toasts, confirm dialogs, API-error fallback messages, and the `demoStorefront.ts` fallback copy. CMS/API-authored content (e.g. admin-edited category names) renders as authored, unlocalized.
- **Open item:** manual QA pass in a real browser across home, PLP+filters, PDP, cart, checkout, account, at phone width. A static audit (no physical direction classes, all icons flip, no hardcoded English JSX) is done.

---

## 3. CI

Workflow: `.github/workflows/ci.yml`. Triggers on PRs and pushes to `main`.

| Job | Steps |
|-----|--------|
| **API** | root `npm ci` → `npm test` in `apps/api` |
| **Website** | root `npm ci` → lint → `tsc --noEmit` → vitest → `next build` |
| **Dashboard** | root `npm ci` → lint → jest → `tsc && vite build` |
| **Dependency audit** | root `npm ci` → `npm audit --audit-level=critical` (fails only on critical advisories) |

Local equivalents:

```bash
npm ci
npm run test --workspace=apps/api
npm run lint --workspace=apps/website -- .
npx --workspace=apps/website tsc --noEmit
npm run build --workspace=apps/website
npm run lint --workspace=apps/dashboard
npm run test --workspace=apps/dashboard
npm run build --workspace=apps/dashboard
```

Notes:
- Every job installs once from the repo root with `npm ci` against the single root `package-lock.json` (npm workspaces) — no per-app lockfiles.
- Dependabot (`.github/dependabot.yml`) opens weekly grouped minor/patch PRs for npm and GitHub Actions; majors for `next`, `react`, `react-dom`, `tailwindcss` are ignored.
- `NEXT_PUBLIC_API_URL` is set in CI for the website build only (placeholder).
- Branch naming: `feature/*`, `fix/*`, `refactor/*`, `chore/*` — keep `main` releasable.
- No dictionary key-parity check runs in CI today — a missing `ar.json` key silently falls back to English rather than failing a build.

---

## 4. Deployment

| App | Host | Config | Health check |
|---|---|---|---|
| API | Render (Node web service) | `apps/api/render.yaml` | `GET /api/ready` |
| Storefront | Vercel (Next.js) | `apps/website/vercel.json` | — |
| Dashboard | Vercel (static SPA) | `apps/dashboard/vercel.json` | — |
| Database | MongoDB Atlas | — | — |
| Images | Cloudinary | `STORAGE_DRIVER=cloudinary` | — |

Nothing deploys from CI today. Render auto-deploys on push (`autoDeploy: true`); Vercel projects deploy through their Git integration.

Deploy order (each app needs the URLs of the ones before it): **database → API → storefront → dashboard → Stripe webhook.**

### MongoDB Atlas
1. Create a cluster and a database user with read/write access.
2. Network access: allow Render's outbound IPs, or `0.0.0.0/0` with a strong password.
3. Keep the connection string for `MONGO_URL`.

### API on Render
1. New → Blueprint → select the repo; Render picks up `apps/api/render.yaml` (`rootDir: apps/api`).
2. Fill in every `sync: false` secret:

| Variable | Value |
|---|---|
| `MONGO_URL` | Atlas connection string |
| `JWT_SECRET_KEY` | 32+ random characters (enforced in production) |
| `FRONTEND_URL` | storefront origin, e.g. `https://shop.example.com` (required in production) |
| `DASHBOARD_URL` | dashboard origin |
| `ALLOWED_ORIGINS` | extra origins, comma-separated (optional) |
| `PUBLIC_FRONTEND_URL` | leave empty unless it differs from `FRONTEND_URL` |
| `STRIPE_SECRET_KEY` | `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | from the webhook step below (required once a Stripe key is set) |
| `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL` | mail account; `SMTP_HOST`/`SMTP_PORT` preset for Gmail |
| `CONTACT_INBOX_EMAIL` | where contact-form messages go |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | from the Cloudinary console |

3. Deploy. Render waits for `/api/ready` → `200`, which only happens once Mongo is connected.
4. Create the first admin with `node seeder.js -admin` (in `apps/api`, with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` and the production `MONGO_URL` set). It only creates the admin account and touches no other collection — unlike `-import`, which wipes the catalog. Grant further staff roles from Dashboard → Users.

The API **refuses to start** in production when:
- `MONGO_URL`, `JWT_SECRET_KEY`, or `FRONTEND_URL` is missing
- `JWT_SECRET_KEY` is shorter than 32 characters
- a Stripe key is set without `STRIPE_WEBHOOK_SECRET`
- `STORAGE_DRIVER=cloudinary` is set without its credentials
- `CORS_RELAXED`, `DEV_ALLOW_DIRECT_ORDERS`, or `ALLOW_DIRECT_ORDERS` is `true`

It **warns** at startup when storage is local or no mail is configured — treat both as blockers: local uploads are wiped on every Render deploy, and without mail there are no password resets or order emails.

### Storefront on Vercel
1. New project → import repo → **Root Directory `apps/website`**. Vercel installs from the monorepo root automatically.
2. Environment variables (Production):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | API origin **without** `/api`, e.g. `https://trendvaulta-api.onrender.com` |
| `NEXT_PUBLIC_SITE_URL` | this storefront's public origin (canonical URLs, sitemap, Open Graph) |
| `NEXT_PUBLIC_DASHBOARD_URL` | dashboard origin |
| `CLOUDINARY_CLOUD_NAME` | same as the API's, so `next/image` may load it |
| `API_INTERNAL_URL` | optional private API address for server-side fetches |

Leave `NEXT_PUBLIC_ALLOW_CHECKOUT_WITHOUT_STRIPE` unset. `NEXT_PUBLIC_*` values compile into the bundle — **redeploy after changing them**.

The browser calls `/api/*` on the storefront's own origin; Next rewrites those to `NEXT_PUBLIC_API_URL`. The account area is `/user/*`. Old `/orders`, `/account/*` and `/user/<name>/*` links redirect there (`next.config.ts`).

### Dashboard on Vercel
1. New project → same repo → **Root Directory `apps/dashboard`** (framework: Vite, output `dist`). `vercel.json` sends every path to `index.html` so React Router deep links work.
2. Environment variable: `VITE_API_URL` = API base **with** `/api`, e.g. `https://trendvaulta-api.onrender.com/api`.
3. Make sure this origin is in the API's `DASHBOARD_URL` — the dashboard calls the API cross-origin, so CORS must allow it.

### Stripe webhook
Stripe Dashboard → Developers → Webhooks → add endpoint `https://<api-host>/api/webhooks/stripe`. Subscribe at least to `checkout.session.completed`, `checkout.session.expired`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded` (handled in `controllers/payment.controller.js`). Copy the signing secret into `STRIPE_WEBHOOK_SECRET` on Render and redeploy. Events are de-duplicated, so Stripe retries are safe.

### Smoke test after each deploy
- [ ] `GET https://<api-host>/api/ready` → `200`
- [ ] Storefront home loads products, not the demo fallback
- [ ] Switch language (EN/AR) from the header; reload confirms `tv_locale` persists and layout flips RTL
- [ ] Test purchase with a live card; it appears under `/user/orders`; refund it from Dashboard → Orders
- [ ] Upload a product image in the dashboard; it is served from `res.cloudinary.com`
- [ ] Password-reset email arrives

### Rollback
- **Render:** Events → pick the previous deploy → Rollback.
- **Vercel:** Deployments → previous → Promote to Production.

Schema changes are additive (Mongoose), so rolling back the API doesn't need a data migration.

---

## 5. API surface (current, `/api` base path)

Authority: `apps/api/routes/` + `app.js`, cross-checked with `apps/website/src/lib/endpoints.ts`. Response shape is ad hoc JSON (`message`, sometimes bare docs/arrays) — not a universal envelope.

| Topic | Convention |
|-------|----------------|
| Auth header | `Authorization: Bearer <jwt>` (legacy `token` header also accepted) |
| Roles | JWT `roles: string[]` |
| IDs | Mongo ObjectId hex 24 |
| Errors | `{ message }` (+ occasional fields) |
| Ownership | `resource.user === JWT id`, enforced on all customer resources |
| Locale | Frontend-only concern (`tv_locale` cookie) — no API locale negotiation or Accept-Language handling |

### Auth
| Route | Access | Notes |
|---|---|---|
| `POST /auth/register` | public | `{ email, username, password }`; server forces `roles: ['user']` |
| `POST /auth/login` | public | `{ email, password }` → user + `token` (15 min) + `refreshToken`; 5 wrong passwords lock the account for 15 min (429 `ACCOUNT_LOCKED`) |
| `POST /auth/refresh` | refresh token | rotates the refresh token (reuse detection, 30 s grace for concurrent tabs) |
| `POST /auth/logout` | public | revokes the presented refresh token; client clears cookies |
| `GET /auth/profile` | private | JWT subject only |
| `PUT /auth/profile` | private | `{ username, email, currentPassword? }` — `currentPassword` required when the email changes; 409 on conflict |

### Password
| Route | Access | Notes |
|---|---|---|
| `POST /password/forgot-password` | public | `{ email }`; generic response (no enumeration) |
| `POST /password/reset-password/:userId/:token` | public | `{ password }` min 8; token = JWT signed with secret + current password hash, 5m expiry, single-use |

### Products / Brands
| Route | Access | Notes |
|---|---|---|
| `GET /products` | public | `page, limit, sort, q, minPrice, maxPrice, category, subcategory, brand, featured` → `{ data, meta }`; forces `isActive: true` |
| `GET /products/:id` | public | 404 if missing |
| `POST/PUT/DELETE /products[/:id]` | private + `products:write|delete` | |
| `GET /brands`, `GET /brands/:id` | public | active only |
| `POST/PUT/DELETE /brands[/:id]` | private + `brands:write|delete` | |

### Cart
No server cart API — client cart only (`cartStore.ts`). Commerce entry point is the checkout session.

### Orders
| Route | Access | Notes |
|---|---|---|
| `POST /orders` | private | `{ items: [{ productId, qty, variant? }], shippingAddress, shippingPrice?, taxPrice? }`; disabled when Stripe is configured unless `DEV_ALLOW_DIRECT_ORDERS`/`ALLOW_DIRECT_ORDERS` |
| `GET /orders/my` | private | own orders |
| `GET /orders/:id` | private | owner or admin |
| `GET /orders` (admin list) | private + `orders:read` | `page, limit, status, paymentStatus, q`; items include `allowedNextStatuses` |
| `PATCH /orders/:id/status` (admin) | private + `orders:write` | `pending→canceled`, `paid→shipped|canceled`, `shipped→delivered`. Not `pending→paid` (Stripe/webhook only). Transitions are claimed atomically (409 on a concurrent change). Canceling/refunding a paid order issues a Stripe refund automatically (`AUTO_REFUND_ON_CANCEL`, default on); inventory is restored once, and only if the order never shipped (returns restock their lines when marked received) |

### Payments & Stripe
| Route | Access | Notes |
|---|---|---|
| `GET /payments/setup-status` | public | `{ ready: boolean }` |
| `POST /payments/checkout-session` | private | creates pending Order + Stripe session, returns `{ url, orderId, sessionId }` |
| `POST /payments/verify-payment` | private | `{ orderId }`, ownership-checked; may mark paid if Stripe session complete |
| `POST /webhooks/stripe` | Stripe signature | raw body; idempotent event insert; marks paid on `checkout.session.completed` |

### Coupons
| Route | Access | Notes |
|---|---|---|
| `POST /coupons/validate` | public | `{ code, orderAmount }` → `{ valid, coupon? }` |
| `GET /coupons/code/:code` | public | |
| `GET/POST /coupons`, `GET/PUT/DELETE /coupons/:id` | admin (`coupons:read|write|delete`) | |
| `POST /coupons/:id/use` | private | increments usage — internal/paid-path use, not meant for general client calls |

### Wishlist
| Route | Access |
|---|---|
| `POST/DELETE /wishlist/:productId` | private |
| `GET /wishlist/my` | private |
| `GET /wishlist/check/:productId` | private |

### Reviews
| Route | Access |
|---|---|
| `GET /reviews/product/:productId` | public |
| `POST /reviews` | private — `{ product, rating, comment }` |
| `PUT/DELETE /reviews/:reviewId` | private + ownership |
| `GET /reviews/my/:productId`, `GET /reviews/my` | private |

### Users (admin)
| Route | Permission |
|---|---|
| `GET /users`, `GET /users/:id` | `users:read` |
| `PUT /users/:id` | `users:write` |
| `DELETE /users/:id` | `users:delete` |

### Ops
| Route | Notes |
|---|---|
| `GET /api/ready` | readiness probe, used by Render |
| `GET /` · `GET /api/` | informational JSON |

### When changing a public API shape
1. Backend routes/controllers/models
2. `apps/website/src/lib/endpoints.ts` + `api.ts` + types
3. Dashboard pages that call the API
4. Tests
5. This document

---

## 6. Data model (Mongoose, `apps/api/models/`)

| Model | Collection | Purpose |
|------------|------------|---------|
| `User.js` | `users` | Auth identity, roles, Stripe customer id |
| `Product.js` | `products` | Catalog SKU / merchandising |
| `Brand.js` | `brands` | Brand catalog |
| `Order.js` | `orders` | Checkout / fulfillment |
| `Coupon.js` | `coupons` | Promotions |
| `Wishlist.js` | `wishlists` | Per-user saved products |
| `Review.js` | `reviews` | Ratings/comments |
| `StripeWebhookEvent.js` | `stripewebhookevents` | Webhook idempotency |
| … | | 24 models in total — also `RefreshToken`, `StoreSettings`, `ShippingZone`, `Offer`, `Bundle`, `Category`, `Content`, `HelpTopic`, `Lookbook`, `Testimonial`, `StorefrontModule`, `GiftFinderConfig`, `ProductQA`, `RecentlyViewed`, `Subscriber`, `ContactMessage` (see `docs/audit/AUDIT_REPORT.md` §2.3) |

No dedicated `Address` or server-side `Cart` model — addresses live on the user's saved address list (see `apps/website/src/components/account/AddressBook.tsx` + `hooks/profile/addressesQuery.ts`), cart is client-only.

### User
`email` (unique), `username`, `password` (bcrypt), `roles: string[]` (enum user/admin/moderator — array, not singular), `stripeCustomerId`, `disabled` (admin-disabled accounts cannot sign in or refresh), `failedLoginAttempts` / `lockUntil` (lockout, `select: false`). JWT payload is `{ id: String(_id), roles }`. Deleting a user anonymises it (PII erased, orders kept).

### Product
`title, description, cover, brand (ref Brand), price, basePrice, images[], category (enum), subcategory, variants[] (size, color, colorCode, stock, price, sku), material, weight, dimensions, shippingInfo, stock, sku (unique sparse), averageRating, reviewCount, isActive, featured`. Stock precedence: variant stock is authoritative when variants exist, else product-level `stock`.

### Brand
`name, slug (unique), description, logo, website, country, isActive, featured`. Public list filters `isActive: true`.

### Order
`user (ref User), items[] ({ productId, title, price, qty, cover, variant? }), shippingAddress, status (pending|paid|shipped|delivered|canceled), itemsPrice, shippingPrice, taxPrice, totalPrice, paymentStatus (unpaid|pending|paid|failed|refunded), stripeSessionId, paymentIntentId, paidAt`. Ownership via `user`.

### Wishlist / Review
One document per `(user, product)`, unique compound index `{ user: 1, product: 1 }`.

### Coupon
`code (unique), discountType (percentage|fixed), discountValue, expirationDate, usageLimit, usedCount, minimumOrderAmount, isActive, description`. `usedCount` increments are conditional (`usedCount < usageLimit`) when a limit is set; global counter, incremented only on a successful paid order.

### StripeWebhookEvent
`eventId (unique)` — idempotency key store. Inserted before processing; deleted on processing failure to allow a retry.

### Soft-delete pattern
`isActive` on Product/Brand/Coupon; Order uses its status enum (`canceled`) instead; User/Review/Wishlist have no soft-delete.

Catalog data (Product/Brand) is **not** localized — only UI chrome/copy is translated, via the static JSON dictionaries in `apps/website/src/messages/`.

---

## 7. Security model

Evidence: `apps/api` middlewares/controllers + website `authCookies.ts` / `proxy.ts` / `api.ts`.

### Three-layer model
| Layer | Question | Enforced by |
|-------|----------|----------------------|
| Authentication | Who is the caller? | `verfiyToken` JWT verify |
| Authorization | What role/permission? | `checkRolePermission` + `rolePermissions.js` |
| Ownership | Is this their resource? | Controllers (orders, reviews, verify-payment, wishlist by user id) |

Pipeline: `verfiyToken → checkRolePermission (admin routes) → validate (Joi) → controller (ownership + business rules)`.

### Authentication
- `User.generateToken()` → JWT HS256 `{ id, roles }`, `expiresIn: '15m'`, secret `JWT_SECRET_KEY`. Issued on register/login/refresh.
- Header `Authorization: Bearer <token>` (legacy `headers.token` too). Invalid/missing → 401.
- Refresh tokens: opaque, stored hashed (`RefreshToken`), 30 days, rotated on every use with reuse detection (30 s grace for concurrent tabs); revoked on logout, password change/reset, disable and role change (`utils/refreshTokens.js`).
- Logout: revokes the refresh token; the ≤15-min access token simply expires.
- Password hashing: bcryptjs, salt rounds 10.
- Password reset: token = JWT signed with `JWT_SECRET_KEY + currentPasswordHash`, 5-minute expiry; a successful reset invalidates prior tokens; unknown emails and mail failures return the same generic 200 (no enumeration); the link is never returned in the response.

### Client-side cookies
| Cookie | Set by | httpOnly | Notes |
|--------|--------|----------|-------|
| `token` | Browser `js-cookie` after login | No | Readable by XSS — browser JS cannot set httpOnly cookies; this is the current, explicit architecture |
| `userRole` | Browser `js-cookie` | No | Used by Next `proxy.ts` for UI route gates; API authorization is still JWT-based, so this cookie being spoofable doesn't bypass API RBAC |
| `tv_locale` | Browser (language switcher) | No (not needed) | Non-sensitive UI preference (`en`/`ar`), read server-side by `lib/i18n-server.ts` for SSR locale — no security implication |

### Authorization (RBAC)
`getUserPermissions(roles)` grants access when the role's permission set includes the required string. Route-required permissions: `products:write|delete`, `brands:write|delete`, `coupons:read|write|delete`, `users:read|write|delete`.

### Ownership
Orders, reviews, wishlist, and payment-verify all scope correctly by `user`/JWT id. List endpoints must never accept an arbitrary `userId` query without admin permission.

### Validation
Backend Joi validation exists on models. Frontend validation is never trusted alone for money/auth: checkout item prices come from the DB, never the client; shipping and tax are computed server-side (zones / StoreSettings); the client only sends intent (`delivery`, `shippingMethod`), normalised by `resolveFulfillment`.

### Payments & webhooks
- Stripe secret lives server-side only (env).
- Webhook body is read raw, before the JSON parser, and signature-verified.
- Idempotency via a unique `eventId`.
- Orders are marked paid from the webhook (primary path) or `verify-payment` (fallback for the redirect case) — **never** from the success-page redirect alone.

Hard rules: never trust client price/discount/stock/role/paymentStatus; never skip webhook signature verification outside an explicit local mock; the paid transition + stock + coupon increment must be idempotent.

### Transport & browser security
- CORS: allowlist via `FRONTEND_URL` / `DASHBOARD_URL` / `ALLOWED_ORIGINS` (`corsAllowlist.js`) — must be set correctly in production.
- Rate limiting: in-memory limits on auth, password reset, checkout, and coupon validation (`rateLimit.js`).
- CSRF exposure is low while auth uses a Bearer header rather than cookie-based sessions.

### Known open hardening items
- Per-IP limits share one bucket if all traffic arrives via the Vercel proxy (`trust proxy` hop count still to confirm); per-account lockout exists.
- The storefront refresh token is httpOnly (`tv_refresh`); the access `token` cookie is still JS-readable — moving it behind the BFF is an open follow-up (audit C4).

### Pre-launch security checklist
- [x] Password hashing verified
- [x] JWT validation on all private routes
- [x] RBAC map matches route permissions
- [x] Register cannot set roles
- [x] Ownership on orders/reviews/wishlist/payments
- [x] CORS allowlist (env-driven — verify production URLs before go-live)
- [x] Rate limiting on auth + forgot-password + checkout + coupon validate
- [ ] No secrets in frontend env except public publishable keys — verify per deploy
- [ ] Stripe webhook signature + idempotency tested in the target environment
- [ ] No sensitive logs in sample production traffic
- [ ] Dependency audit scheduled

---

## 8. Business rules

### Pricing & currency
- Product price is DB-authoritative (`product.price`, optional `variant.price`); checkout always overwrites client-sent prices.
- **Display currency is USD only** — no conversion, no per-locale currency switch. The EN/AR storefront locales format the same USD amount with locale-appropriate digits/punctuation only.

### Stock & variants
- If a product has variants, the selected variant's stock is authoritative; otherwise `product.stock` is.
- Checkout should reject a quantity greater than available stock (enforce with an atomic conditional `$inc`, not a read-then-write).
- A variant sent by the client must match an existing variant on that product; its price comes from `variant.price` if set, else `product.price`.

### Orders — state machine
`status`: `pending → paid → shipped → delivered`, or `pending/paid → canceled`.
`paymentStatus`: `unpaid | pending | paid | failed | refunded`.

- `pending → paid` happens only via the Stripe webhook or `verify-payment` — never a client-initiated status write.
- Canceling a paid order restores inventory once, tracked via a `stockDecremented`/`stockRestored` pair, so repeat cancels can't double-restore stock.
- Customers only ever see their own orders; get-by-id is owner-or-admin scoped.

### Coupons
- Nonexistent/inactive/expired codes return `valid: false` with the relevant reason.
- Discount is clamped to `orderAmount`; no separate `maxDiscount` field.
- `usedCount` is a global counter versus `usageLimit` — no per-user redemption tracking today.
- Coupon application must happen server-side before the Stripe session is created; the client-supplied `orderAmount` used for validation is advisory, not authoritative for the actual charge.

### Wishlist / Reviews
- One wishlist entry and one review per `(user, product)` pair.
- Reviews: rating 1–5; owner can edit/delete; only customers with a paid (or refunded) order for the product can review (staff exempt, not marked verified).

### Addresses
- Shoppers can save multiple addresses, pick one at checkout, and mark a default (`AddressBook.tsx` + `hooks/profile/addressesQuery.ts`). Shipping address is required on every order.

### Cross-cutting
1. The backend is the source of truth for price, stock, discount, tax, shipping, payment state, and roles — the client never dictates any of these.
2. No client-supplied role elevation, ever (`register` always forces `roles: ['user']`).
3. Ownership checks apply to orders, reviews, wishlist, and payment verification.
4. Webhook signature verification is required in every non-local environment.

---

## 9. Open work

Everything else described in the old phase-by-phase plan (critical recovery, security hardening, store/dashboard workflow fixes, revenue features, dashboard enhancements) is **done** — see git history for how. What's still open:

- **Arabic manual QA** — a real-browser pass across home, PLP+filters, PDP, cart, checkout, account, at phone width. Static audit (no physical direction classes, icons flip, no hardcoded English JSX) is already done.
- **Deploy automation** — API/website/dashboard deploys are still triggered by each host's own Git integration, not from CI. No E2E test suite exists yet.
- **Observability** — Sentry (or equivalent) is not wired up. Pino logging, request IDs, and graceful shutdown are already in place.
- **Unused shared package** — `packages/types` is built but nothing currently imports it; each app owns its own types. Either wire it in or remove it.
- **Tech debt (low priority)** — ~178 `express-async-handler` wraps could be simplified now that the underlying Express version handles async errors natively; response contracts across controllers aren't fully standardized.
- **Security hardening backlog** — see §7's "Known open hardening items."

