# TrendVaulta — Professional Implementation Plan (Fixes & Improvements)

**Date:** 2026-09-21 · **Source audit:** [FULL_SYSTEM_ANALYSIS.md](./FULL_SYSTEM_ANALYSIS.md) · **Branch:** `main` (`c252857`)

## Context

The full system audit (`docs/FULL_SYSTEM_ANALYSIS.md`, 2026-09-21) found that `main` does not boot (missing `middlewares/auth`), CI cannot install (three out-of-sync lockfiles), 8 dashboard screens are 403 for every role (`content:*` permissions undefined), products with variants cannot be purchased (variant never reaches the cart), and there are payment-integrity gaps (no refund on cancel, double stock decrement race, oversell). On top of that: zero SEO, no Arabic/RTL, dead shared packages, and ~90 tests silently skipped in CI.

**Goal of this plan:** turn the codebase from "shipped but not running" into a production-grade retail store in ordered, verifiable phases, each one leaving `main` green and deployable.

**Decisions taken with the user:**
- Consolidate shared types into `@trendvaulta/types`; delete `@trendvaulta/api-client`.
- New dependencies allowed: `supertest`, `mongodb-memory-server` (API tests), `dompurify`/`isomorphic-dompurify` (CMS HTML), `next-intl` (i18n phase), `rate-limiter-flexible` or Mongo-backed store (rate limiting).
- Arabic/RTL is a dedicated phase **after** commerce is solid (Phase 9).


---

## Working agreements (apply to every phase)

| Rule | Detail |
|---|---|
| Branching | `main` protected; one branch per task ID (`fix/C1-auth-import`, `feat/W1-variant-cart`); squash-merge |
| PR size | One task ID per PR, ≤ ~400 changed lines, conventional commit title (`fix(api): …`) |
| Definition of Done | CI green (install + lint + typecheck + **all** tests + build) · acceptance criteria below met · no raw API errors shown to users · no new `any` |
| Order | Phases are sequential; tasks inside a phase may run in parallel unless marked "after X" |
| Effort key | S ≤ ½ day · M 1–2 days · L 3–5 days (single senior dev) |
| Validation commands | `cd apps/api && npm test` · `cd apps/website && npx tsc --noEmit && npm test` · `cd apps/dashboard && npx tsc --noEmit && npm test` · `npm run build` (root) |

---

## Phase 0 — Stabilize `main` (1–2 days) · goal: API boots, CI green, dashboard opens

| ID | Task | Files | Acceptance |
|---|---|---|---|
| C1 | Fix missing auth middleware import: replace `require('../middlewares/auth')` with `require('../middlewares/verfiyToken')` (keep existing spelling) | `apps/api/routes/{productQA,bundles,giftFinder,lookbooks,recentlyViewed,storefrontModules,storefrontTestimonials}.js` | `node app.js` starts; `GET /api/ready` → 200 |
| C2 | Add `content:read/write/delete` to `admin`, `content:read/write` to `moderator`; extend resource list in `rolePermissions.test.js` | `apps/api/middlewares/rolePermissions.js`, `rolePermissions.test.js` | Admin token → `GET /api/help-topics/admin` 200 |
| C3 | Fix `Product` import (`{ Product }`) in `productQA.controller.js`; delete `recommendations.controller.js`, point `routes/recommendations.js` to the correct orphan `recommendation.controller.js` | `apps/api/controllers/productQA.controller.js`, `routes/recommendations.js`, delete `controllers/recommendations.controller.js` | `GET /api/recommendations` and `GET /api/products/:id/qa` → 200 with data |
| C4 | Single lockfile: delete `apps/api/package-lock.json` + `apps/website/package-lock.json`; commit regenerated root lock; `ci.yml` uses root `npm ci` + root cache for all three jobs | `.github/workflows/ci.yml`, lockfiles | All three CI jobs pass install |
| C5 | Dashboard ESLint: add `apps/dashboard/eslint.config.js` (ESLint 9 flat config, `@typescript-eslint` v8, react-hooks, react-refresh); remove `.eslintrc*`, `.prettierrc*`, `.nvmrc`, `.editorconfig`, `.github/` from root and `apps/api/.gitignore`; add tracked `.nvmrc` (20.19) and `engines.node >=20.9` | `apps/dashboard/eslint.config.js`, `.gitignore`, `apps/api/.gitignore`, `package.json` | `npm run lint --workspace=apps/dashboard` exits 0 |
| C6 | Run all API tests: `"test": "node --test utils middlewares"`; add `apps/api/app.test.js` smoke that `require('./app')` loads without listening (guard `start()` behind `require.main === module`); root `"test"` script runs all workspaces with `--if-present`; add `--if-present` to `build/lint/clean` | `apps/api/package.json`, `apps/api/app.js`, root `package.json` | CI runs ~105 tests; smoke test would have caught C1 |
| D2 | Dashboard product form: categories = backend enum (`makeup, perfumes, clothing, skincare, accessories, home`); require `subcategory` + `description`; strip empty optional strings before POST/PUT | `apps/dashboard/src/pages/Products.tsx`, `src/lib/api.ts` (`ProductFormPayload`) | Create + edit a product succeeds from UI |
| D3 | Brand form: strip empty optionals; backend `Brand.js` Joi `.allow('')` for `description/logo/website/country`; `GET /brands?includeInactive=true` for staff (mirror products pattern) | `apps/dashboard/src/pages/Brands.tsx`, `apps/api/models/Brand.js`, `controllers/brand.controller.js` | Create/edit brand with blank fields succeeds; inactive brands visible to admin |
| D4 | Bundle edit: map populated `items[].product._id` / `primaryProduct._id` in `openEdit`; type `BundleItem.product` as `string \| {_id,…}` | `apps/dashboard/src/pages/Bundles.tsx`, `src/lib/api.ts` | Editing a bundle no longer throws |
| D7 | Q&A populate `askedBy/answeredBy` with `'username email'` (API) → dashboard reads `username`; fix stale `editing.approved` by syncing state after approve mutation | `apps/api/controllers/productQA.controller.js`, `apps/dashboard/src/pages/ProductQA.tsx` | Asker name shows; approve toggle persists |

**Exit criteria:** `main` boots locally, CI fully green, every dashboard page loads for admin, product/brand/bundle CRUD works.

---

## Phase 1 — Payment & inventory integrity (3–4 days) · goal: no money lost, no double side-effects

| ID | Task | Files | Acceptance |
|---|---|---|---|
| P2 | Atomic mark-paid: claim with `Order.findOneAndUpdate({_id, paymentStatus:{$ne:'paid'}}, {$set:{paymentStatus:'paid', paidAt, paymentIntentId}}, {new:true})`; only the claimer runs side-effects; variant stock via conditional `$inc` (`{ 'variants.$.stock': {$gte: qty} }` filter) instead of read-modify-write | `apps/api/controllers/payment.controller.js` (`markOrderPaidFromSession`), `apps/api/utils/commerce.js` (`decrementStockForPaidOrder`) | Concurrent `verify-payment` + webhook → stock/coupon/salesCount applied exactly once (test with two parallel calls) |
| P4 | Respect state machine: use existing `utils/orderTransitions.js` before setting `status='paid'`; a canceled order receiving a late webhook becomes `needs_attention`, not `paid` | `payment.controller.js`, `utils/orderTransitions.js` (add `needs_attention`, `refunded`) | Cancel then replay webhook → order stays canceled, flagged |
| P3 | Never fail the webhook after a successful charge: on stock shortfall mark order `needs_attention` + `paymentStatus:'paid'`, persist reason, return 200; admin sees it in Orders filter | `payment.controller.js`, `models/Order.js` (add `attentionReason`), dashboard Orders filter | Oversell scenario leaves a paid, flagged order; Stripe stops retrying |
| P1 | Refund on cancel of paid orders: `stripe.refunds.create({payment_intent})` inside `updateOrderStatus` when `paymentStatus==='paid'`; set `paymentStatus:'refunded'`; add `refundId`, `refundedAt` | `apps/api/controllers/order.controller.js`, `services/stripe.service.js`, `models/Order.js` | Cancel paid order → Stripe refund created, order `refunded`, stock restored |
| P5 | Handle `checkout.session.expired` (cancel pending order, release nothing since stock isn't reserved), `payment_intent.payment_failed` (`paymentStatus:'failed'`), `charge.refunded` (sync `refunded`); set `expires_at` (30 min) on session creation; delete the per-checkout Stripe coupon after session completes/expires | `payment.controller.js` (`stripeWebhook` switch), `services/stripe.service.js` | Each event type updates the order; `StripeWebhookEvent` stores `type`, `orderId`, `status` + TTL index (90 days) |
| W1 | PDP passes `selectedVariant` (`size`, `color`, `colorCode`, `sku`, variant price) to `cart.addToCart`; require selection when `variants.length > 0`; show per-variant stock/price | `apps/website/src/app/products/[id]/page.tsx`, `src/lib/cartStore.ts` (`CartItem` gains `variant`) | Product with variants reaches checkout and API accepts it |
| W2 | Cart line identity = `productId + size + color`; `removeFromCart`/`setCartQty` take a `lineKey`; render variant in cart/checkout/order lines; React keys use `lineKey` | `src/lib/cartStore.ts`, `src/app/cart/page.tsx`, `src/app/checkout/page.tsx`, `components/orders/*` | Two variants of the same product are independent lines; `cartStore.test.ts` extended |
| W6 | Stock-aware quantity (cap at product/variant stock on PDP and cart); pre-checkout revalidation: refetch products in cart, warn on price/stock drift; display server shipping via a new `GET /payments/quote` (or reuse `resolveShippingPrice` through checkout-session preview) instead of hard-coded 5/0 | `src/app/products/[id]/page.tsx`, `src/app/cart/page.tsx`, `src/app/checkout/page.tsx`, `apps/api/routes/payments.js` | Cannot exceed stock; checkout totals equal Stripe totals |
| W8 | Success page: stable polling (`useRef` interval, deps on `orderId/sessionId` only), exponential backoff, stop after `paid`; move `verify-payment` off `checkoutRateLimit` into its own limiter | `src/app/checkout/success/page.tsx`, `apps/api/routes/payments.js`, `middlewares/rateLimit.js` | No interval churn; slow webhook doesn't exhaust checkout quota |
| T1 | Integration tests (new dev deps `supertest`, `mongodb-memory-server`): checkout-session creation, webhook idempotency, double mark-paid race, cancel-refund, oversell → `needs_attention` | `apps/api/tests/payments.test.js`, `orders.test.js`, `tests/setup.js` | Tests run in CI under `node --test` |

**Exit criteria:** two shoppers paying for the last unit → one served, one flagged; cancel-paid = refund; no double decrement (proved by tests).

---

## Phase 2 — Security hardening (2–3 days)

| ID | Task | Files | Acceptance |
|---|---|---|---|
| S1 | `app.set('trust proxy', 1)`; rate limiter keys on `req.ip`; pluggable store interface with Mongo-backed implementation (TTL collection) so limits survive restarts and multiple instances | `apps/api/app.js`, `middlewares/rateLimit.js`, new `models/RateLimitBucket.js` | Spoofed `X-Forwarded-For` doesn't reset the bucket; limit persists across restart |
| S2 | Forgot-password: Joi `email: string().email().required()`; always respond 200 with generic message; keep dev-only link return behind `NODE_ENV !== 'production'` **and** explicit `DEV_RETURN_RESET_LINK=true` | `controllers/password.controller.js` | Non-existent email → 200; object payload → 400 |
| S3 | Public review/Q&A responses select `username` only (never `email`); keep email in admin lists | `controllers/review.controller.js`, `controllers/productQA.controller.js` | `GET /reviews/product/:id` body has no `email` |
| S6 | Global error handler: map Mongoose `CastError`→400, `ValidationError`→400, `11000`→409, Joi→400; generic message + `requestId` for 5xx in production; remove `userPermissions/userRoles` echo from 403; scrub Stripe `detail` | `apps/api/app.js`, `middlewares/checkRolePermission.js`, `payment.controller.js` | Invalid ObjectId → 400 with safe message |
| S7 | Escape user input before `$regex` (shared `escapeRegex` util, max 100 chars); add text index (`title`, `description`, `brand` name via denormalized `brandName`) and use `$text` for `q` | `apps/api/utils/search.js` (new), `controllers/product.controller.js`, `controllers/brand.controller.js`, `models/Product.js` | `q=(` doesn't 500; search is index-backed |
| S8 | Call existing `revokeAllForUser` after password reset and admin password change | `controllers/password.controller.js`, `controllers/user.controller.js` (uses `utils/refreshTokens.js`) | Old refresh token rejected after reset |
| S9 | Central config module `apps/api/config/env.js`: validates required vars at boot (`MONGO_URL`, `JWT_SECRET_KEY`, `NODE_ENV`, Stripe keys when checkout enabled), exports typed config; replace scattered `process.env` reads | `apps/api/config/env.js` (new), all controllers/utils reading env | Missing `JWT_SECRET_KEY` → process exits with clear message |
| S4 | Storefront + dashboard cookies: `secure` (prod), `sameSite:'lax'`; stop caching `token/refreshToken` in React Query (`authQuery.ts` seeds `{user}` without tokens); **refresh token → httpOnly cookie** via Next route handlers `/api/auth/{login,refresh,logout}` proxying to the API (dashboard keeps js-cookie but `secure`+`sameSite:'strict'`) | `apps/website/src/lib/authCookies.ts`, `src/hooks/auth/authQuery.ts`, `src/app/api/auth/*/route.ts` (new), `src/lib/api.ts`, `apps/dashboard/src/lib/auth.ts` | `document.cookie` no longer exposes the refresh token on the storefront |
| S5 | Sanitize CMS HTML with `isomorphic-dompurify` before `dangerouslySetInnerHTML` | `apps/website/src/app/{shipping,returns}/page.tsx`, shared `lib/sanitizeHtml.ts` | `<script>` in content body is stripped |
| S10 | Indexes: `Order(user, createdAt)`, `Order(stripeSessionId)`, `Order(status, paymentStatus)`, `Product(category, isActive, price)`, `Product(brand)`, `Review(product, createdAt)`; `StripeWebhookEvent` TTL; `User.email` `lowercase:true` + migration script to lowercase existing emails; `username` unique | `apps/api/models/*.js`, `apps/api/scripts/migrate-lowercase-emails.js` | `explain()` shows index use on orders/products lists |
| S11 | Pagination everywhere: reuse `utils/pagination.js` `parsePagination` in all list controllers (cap 100); paginate `getMyOrders`, `getMyWishlist`, `getMyReviews`, `getAllUsers` | 12 controllers | `?limit=abc` → 200 with default limit |

**Exit criteria:** no email leakage on public endpoints, rate limits enforceable behind proxy, boot fails fast on bad config, tokens not readable by JS on the storefront.

---

## Phase 3 — Platform, CI, observability (2 days)

| ID | Task | Files | Acceptance |
|---|---|---|---|
| I1 | `render.yaml`: `healthCheckPath: /api/ready`, `rootDir: apps/api`, drop deprecated `env:`, replace `EMAIL_*` with `SMTP_*`, add `RATE_LIMIT_*`, `SHIPPING_FLAT_USD`, `PUBLIC_FRONTEND_URL`, `CORS` origins; complete both `.env.example` files | `apps/api/render.yaml`, `apps/api/.env.example`, `apps/website/.env.example` | Password-reset email works on Render config |
| I2 | Structured logging: `pino` + `pino-http` with request id (`X-Request-Id`), status, latency; error handler logs with `requestId`; DB connection event listeners | `apps/api/middlewares/logger.js`, `app.js`, `config/db.js` | Logs are JSON lines with `reqId` |
| I3 | Graceful shutdown: `SIGTERM/SIGINT` → stop accepting, `server.close()`, `mongoose.disconnect()`; `unhandledRejection`/`uncaughtException` handlers log + exit(1) | `apps/api/app.js` | Render redeploy shows clean shutdown log |
| I4 | Single safe seeder: delete `apps/api/seeders/seeder.js`; `seeder.js` refuses when `NODE_ENV==='production'` unless `--force`; creates admin user from `SEED_ADMIN_EMAIL/PASSWORD`; seeds bundles, lookbooks, storefront modules, testimonials, gift-finder config, help topics, sample Q&A | `apps/api/seeder.js`, `apps/api/data.js`, `SEEDER_README.md`, `README.md` | Fresh DB → full storefront home renders from CMS |
| I5 | CI: Dependabot (npm, weekly, grouped), `npm audit --audit-level=high` job, coverage upload; dashboard deploy config (`apps/dashboard/vercel.json`, SPA rewrite) | `.github/dependabot.yml`, `ci.yml`, `apps/dashboard/vercel.json` | PRs get dependency updates; dashboard deployable |
| I6 | Docs: rewrite `apps/api/README.md` (endpoints, env, run), `apps/website/README.md`; remove `packages/ui` and "Craftify" references in `README.md`, `AGENTS.md`, `MONOREPO_SETUP.md`, `.cursorrules`, `.devin/rules`; mark `docs/PROJECT_STATUS.md`, `docs/REMEDIATION_BACKLOG.md` as historical; root `package.json` description; `apps/dashboard/index.html` title; `StatsBar.tsx` copy; `cartStore` key `trendvaulta_cart_v1` with one-time migration from `craftify_cart_v1`; prune `next.config.ts` image hosts; delete `pnpm-workspace.yaml` | listed files | `grep -ri craftify` (excluding lockfiles/history docs) returns 0 |

---

## Phase 4 — Storefront purchase path (4–5 days) · goal: search → category → PDP → guest cart → login → pay

| ID | Task | Files | Acceptance |
|---|---|---|---|
| W3 | Single source of truth for categories: `apps/website/src/lib/categories.ts` exporting the backend enum with labels/images; Navbar mega-menu, Footer, HeroSection, `categoriesQuery.ts`, CategorySidebar consume it; remove `beauty/fashion/wellness/lifestyle` slugs | `components/navigation/Navbar.tsx`, `components/layout/Footer.tsx`, `components/home/HeroSection.tsx`, `hooks/storefront/categoriesQuery.ts` | Every nav link returns products |
| W5 | Guest cart: remove `/cart` from `proxy.ts` protected paths; add `?redirect=` capture in proxy, `forceLogoutRedirect`, and login/signup pages; 401 from optional/background queries never hard-redirects (only mutations/protected pages) | `src/proxy.ts`, `src/lib/api.ts`, `src/app/auth/{login,signup}/page.tsx` | Returning from Stripe to `/checkout/success` after cookie lapse → login → back to success with `order_id` intact |
| W4 | Coupon: `useValidateCouponMutation` fired on "Apply"; validate against undiscounted subtotal; applied coupon stored in `cartStore` (already has `coupon` state + `getCartDiscount`) so cart page shows discount | `hooks/coupons/couponsQuery.ts`, `src/app/checkout/page.tsx`, `src/app/cart/page.tsx`, `src/lib/cartStore.ts` | One request per Apply click |
| W7 | Physical-goods checkout: remove `DIGITAL_SHIPPING` placeholder; address form always required; shipping method selector (`standard`/`express`, API already accepts) | `src/app/checkout/page.tsx`, `src/lib/validation.ts` | Order always carries a real address + method |
| F1 | Wire existing components: PDP renders `ReviewList` + `ReviewForm` (`useProductReviews`, `useCreateReview`); `ProductQaSection` uses `useProductQA` + `useCreateProductQuestion` (+ helpful vote); Heart buttons on `ProductCard` and PDP use `WishlistButton`; `/offers` uses `useActiveOffers` | `src/app/products/[id]/page.tsx`, `components/products/ProductQaSection.tsx`, `components/products/ProductCard.tsx`, `src/app/offers/page.tsx` | Reviews/Q&A/wishlist/offers are live data |
| F2 | Server-side facets: API `GET /products` accepts `brand[]`, `size`, `color`, `minRating`, `inStock`, `onSale`, `sort` (price/rating/newest/bestselling) with a `facets` block in `meta` (counts via aggregation); PLP filters drive query params, drop "(demo)" client filtering; use API `badges` | `apps/api/controllers/product.controller.js`, `apps/website/src/app/products/page.tsx`, `hooks/products/*`, `components/products/CategorySidebar.tsx` | Filters work across the whole catalog |
| F3 | Category landing pages `/c/[category]` (and `/c/[category]/[subcategory]`) with breadcrumbs, hero, PLP embedded; brand page uses `use(params)` | `src/app/c/[category]/page.tsx` (new), `src/app/brands/[id]/page.tsx` | Crawlable category URLs |
| F4 | Account: `/user/[username]/settings` (profile edit via existing `useUpdateProfile`, password change via new `PUT /auth/password` requiring current password); fix dead `/profile/edit` link; delete dead components (`profile/*Content`, `AccountSidebar`, `LicenseComparison`, `hooks/admin/*`, `deliverRegion`, `/welcome`) | `src/app/user/[username]/settings/page.tsx` (new), `apps/api/routes/profile.js`, `controllers/profile.controller.js`, deletions | Profile edit works; dead code removed |
| F5 | Gift finder / recommendations / recently viewed use API ids (`buildGiftFinderHref` resolves from API config); "inspired" rail uses fixed `/recommendations` | `components/home/GiftFinderSection.tsx`, `src/data/demoStorefront.ts`, `components/home/InspiredByBrowsingSection.tsx` | No demo fallback when API is up |
| D5 | Dashboard role guard: `DashboardLayout` redirects users without `admin`/`moderator` role; hide write/delete controls per permission (derive from role map mirrored in `src/lib/permissions.ts`); fix `getProfile` to compute permissions from roles server-side (reuse `rolePermissions.js`) | `apps/dashboard/src/layouts/DashboardLayout.tsx`, `src/lib/permissions.ts` (new), pages, `apps/api/controllers/profile.controller.js` | Plain `user` cannot open the dashboard; moderator sees no delete buttons |
| D6 | `darkMode: 'class'` in dashboard Tailwind config | `apps/dashboard/tailwind.config.js` | Theme toggle changes colors |
| D8 | Replace `window.alert/confirm` with a `Toast` provider + Radix `Dialog` confirm (both already installed); zod + react-hook-form schemas for Product, Brand, Coupon, Offer forms; disable delete buttons while pending; map 403/Joi errors to friendly text | `apps/dashboard/src/components/ui/{Toast,ConfirmDialog}.tsx` (new), 15 pages, `src/lib/api.ts` (`errorMessage`) | No native alerts; forms validate client-side |

**Exit criteria (manual E2E):** search → category → PDP with variant → add to cart as guest → login (redirect preserved) → coupon → Stripe test payment → success page → order visible in account and dashboard.

---

## Phase 5 — Dashboard operability (3–4 days)

| ID | Task | Files | Acceptance |
|---|---|---|---|
| A1 | Full product form: `isActive`, `featured`, `images[]`, `variants[]` editor (size/color/colorCode/stock/price/sku), material/weight/dimensions/shippingInfo | `apps/dashboard/src/pages/Products.tsx`, `src/lib/api.ts` | All `validateUpdateProduct` fields editable |
| A2 | Image upload: API `POST /uploads` (Multer memory → Cloudinary or S3, admin-only, 5 MB, image mime whitelist), returns URL; dashboard `ImageUploadField` used for product cover/images and brand logo; `next.config.ts` `remotePatterns` for the CDN host; storefront switches `<img>` → `next/image` | `apps/api/routes/uploads.js`, `controllers/upload.controller.js`, `services/storage.service.js`, dashboard component, `apps/website/next.config.ts` + 13 `<img>` sites | Upload from dashboard → image renders on storefront via `next/image` |
| A3 | Order detail drawer: items (with variant), shipping address, notes, payment ids, timeline; `paymentStatus` + `needs_attention` filters; search by customer email (API extends `q` to match `user.email` via lookup); admin notes field; tracking number + carrier (`Order.tracking {carrier, number, url}`), sent in "shipped" email | `apps/dashboard/src/pages/Orders.tsx`, `components/OrderDrawer.tsx` (new), `apps/api/controllers/order.controller.js`, `models/Order.js`, `utils/mail.js` | Ops can fulfil an order end-to-end from the dashboard |
| A4 | Server-side pagination + sorting on every list (reuse `{data, meta}`), `placeholderData: keepPreviousData` in hooks; Products list gains low-stock filter (API `lowStock=true` using `LOW_STOCK_THRESHOLD`) and inline stock edit | all `useAdmin*.ts` hooks, pages | Lists page through > 100 items; low-stock view exists |
| A5 | Analytics: API `GET /admin/stats/timeseries?range=30d` (revenue, orders by day), `top-products`, `top-brands` (aggregations); dashboard charts with `recharts` (already installed) | `apps/api/controllers/adminStats.controller.js`, `apps/dashboard/src/pages/Dashboard.tsx` | Revenue chart renders |
| A6 | Brands: `isActive/featured` toggles; block delete when products reference the brand (API 409); soft-delete users (`isActive:false`) instead of hard delete; customer drawer with order history (`GET /orders?user=`) | `Brands.tsx`, `Users.tsx`, `apps/api/controllers/{brand,user}.controller.js`, `models/User.js` | No orphaned products; blocked users can't log in |
| A7 | Storefront modules editor: typed editors for hero `slides`, `trustItems`, `items` (product/brand pickers), instead of pass-through JSON; align `StorefrontModule.type` enum with home rail keys (`featured_products`, `gift_finder`, `recently_viewed`, `inspired`, `cta`) | `apps/dashboard/src/pages/StorefrontModules.tsx`, `apps/api/models/StorefrontModule.js`, `apps/website/src/hooks/storefront/homeQuery.ts` | Home page fully CMS-driven without losing rails |
| A8 | Responsive layout (sidebar drawer < `lg`), Radix dialogs with focus trap, `htmlFor` labels, favicon + `public/` | `apps/dashboard/src/layouts/DashboardLayout.tsx`, `index.html` | Usable on a phone |
| A9 | Settings: store settings model (`StoreSettings`: shipping methods/rates, tax rate, store name/contact, currency) with `GET/PUT /admin/settings`; commerce reads shipping/tax from it instead of env | `apps/api/models/StoreSettings.js`, `controllers/settings.controller.js`, `utils/commerce.js`, `apps/dashboard/src/pages/Settings.tsx` | Changing shipping rate in dashboard changes checkout totals |

---

## Phase 6 — SEO & performance (3–4 days)

| ID | Task | Files | Acceptance |
|---|---|---|---|
| E1 | Server-rendered PDP/PLP/Brand/Category: `page.tsx` becomes a Server Component that fetches via a server-side API client (`lib/serverApi.ts`, `fetch` with `next.revalidate: 60`) and hydrates React Query (`HydrationBoundary`) for client islands (gallery, variant picker, add-to-cart, reviews) | `src/app/products/[id]/page.tsx`, `src/app/products/page.tsx`, `src/app/brands/[id]/page.tsx`, `src/app/c/**`, `src/lib/serverApi.ts` (new) | `curl` of a PDP contains product title/price in HTML |
| E2 | `generateMetadata` (title, description, canonical, OG/Twitter with product image) for PDP/PLP/brand/category; `metadataBase`; Product + BreadcrumbList JSON-LD; `app/sitemap.ts` (products, brands, categories, static pages) and `app/robots.ts` | same pages, `src/app/{sitemap,robots}.ts`, `components/seo/JsonLd.tsx` | Rich-results test passes for a product |
| E3 | Route-level `loading.tsx` / `error.tsx` / `global-error.tsx`; PLP "Retry" calls `refetch()`; Toast gets `role="status" aria-live="polite"`; labels on icon buttons; real `alt` text | `src/app/**/loading.tsx`, `error.tsx`, `components/ui/Toast.tsx`, `components/products/ProductCard.tsx`, PDP gallery | Lighthouse a11y ≥ 90 |
| E4 | Perf: remove route-level `AnimatePresence` remount in `AppShell`; drop Arial override so Geist applies; hero image via `next/image` `priority`; `next/image` everywhere (after A2) | `components/layout/AppShell.tsx`, `src/app/globals.css`, `components/home/HeroPromoCarousel.tsx` | Lighthouse perf ≥ 85 mobile on PDP |

---

## Phase 7 — Commerce completeness (5–7 days)

| ID | Task | Files | Acceptance |
|---|---|---|---|
| K1 | Address book: `User.addresses[]` (label, name, phone, line1, city, zip, country, isDefault); `GET/POST/PUT/DELETE /auth/addresses`; account page + checkout "choose saved address" | `apps/api/models/User.js`, `routes/profile.js`, `controllers/profile.controller.js`, storefront settings + checkout | Repeat checkout takes one click for address |
| K2 | Shipping methods/zones from `StoreSettings` (A9): `standard`/`express` rates per country group; checkout selector shows live quote; Stripe session uses `shipping_options` | `apps/api/utils/commerce.js`, `payment.controller.js`, checkout page | Express costs more than standard end-to-end |
| K3 | Tax: configurable rate (A9) applied server-side; shown on cart/checkout/order | `utils/commerce.js`, storefront totals | `taxPrice` non-zero when rate set |
| K4 | Customer cancel (before `shipped`): `POST /orders/:id/cancel` (owner, uses P1 refund path); Return/RMA: `ReturnRequest` model (order, items, reason, status `requested/approved/rejected/received/refunded`), customer creates from order page, admin processes in dashboard (partial refund via Stripe) | `apps/api/models/ReturnRequest.js`, `routes/returns.js`, `controllers/return.controller.js`, storefront order page, dashboard Returns page | Full return lifecycle with refund |
| K5 | Verified-purchase reviews: `POST /reviews` requires a paid order containing the product; `verifiedPurchase:true` badge | `apps/api/controllers/review.controller.js`, `models/Review.js`, `ReviewList` | Non-buyers get 403 with friendly message |
| K6 | Transactional emails: HTML templates (order confirmation, shipped with tracking, delivered, canceled, refunded, return status) via `utils/mail.js`; single transport (delete duplicate in `password.controller.js`) | `apps/api/utils/mail.js`, `templates/*.html`, controllers | Each status change sends the right email once |
| K7 | Invoice: `GET /orders/:id/invoice` (HTML printable, later PDF); link in order page and dashboard | `apps/api/controllers/order.controller.js`, `views/invoice.js` | Printable invoice per order |
| K8 | Newsletter + contact: `Subscriber` model + `POST /newsletter`, `POST /contact` (rate-limited, emails staff); footer + contact form wired | `apps/api/routes/{newsletter,contact}.js`, storefront footer/contact | Form submissions persist / send |

---

## Phase 8 — Shared types consolidation (2 days)

| ID | Task | Files | Acceptance |
|---|---|---|---|
| G1 | `@trendvaulta/types` becomes the single source: add missing domain types (HelpTopic, Content, StorefrontModule, Lookbook, Testimonial, Bundle, GiftFinderConfig, ProductQA, AdminStats, ReturnRequest, StoreSettings, Address), fix `Order`/`Review`/`AuthResponse` drift, remove `Template/Creator/ApiResponse`; proper `build` (tsc → `dist`, `exports`) | `packages/types/src/*.ts`, `packages/types/package.json`, `tsconfig.json` | `npm run build --workspace=packages/types` emits d.ts |
| G2 | Website and dashboard import from `@trendvaulta/types`; delete `apps/website/src/types/index.ts` duplicates and dashboard inline types; delete `packages/api-client` and its aliases (`vite.config.ts`, `tsconfig.json`, `jest.config.js`) | both apps | Zero duplicated domain types; both `tsc --noEmit` pass |
| G3 | Dashboard toolchain convergence: Vite 7 + `@vitejs/plugin-react` 5, Tailwind 4, Vitest (replace jest/ts-jest/jsdom 20), ESLint 9 (from C5); prune unused deps (`zustand`, `cva`, `tailwind-merge`, `clsx` if still unused) | `apps/dashboard/package.json`, configs, tests | One test runner, one Tailwind major, one ESLint major across the repo |

---

## Phase 9 — Arabic / RTL & localisation (5–7 days)

| ID | Task | Files | Acceptance |
|---|---|---|---|
| L1 | `next-intl` with `[locale]` segment (`ar` default, `en`), middleware-based locale routing merged into `proxy.ts`, `lang`/`dir` on `<html>`, message catalogs `messages/{ar,en}.json` | `apps/website/src/app/[locale]/**` (move pages), `src/i18n/*`, `src/proxy.ts` | `/ar/...` renders RTL Arabic UI |
| L2 | RTL styling: Tailwind logical properties (`ms-/me-/ps-/pe-`, `start/end`), mirror icons/carousels, Arabic font via `next/font` (e.g. Cairo/Tajawal) | global styles, components | No visual breakage in RTL (screenshot review) |
| L3 | Localised content: bilingual fields on Product (`title_ar`, `description_ar`), Brand, categories, CMS entities (`{ar,en}` objects); API returns by `Accept-Language`/`?locale=`; dashboard forms show both fields | `apps/api/models/*`, controllers, dashboard forms | Product page shows Arabic title on `/ar` |
| L4 | Currency/locale formatting (`Intl.NumberFormat` with store currency from `StoreSettings`), Arabic emails, dashboard `lang`/`dir` toggle | storefront utils, mail templates, dashboard layout | Prices formatted per locale |

---

## Phase 10 — Growth & quality (ongoing)

- E2E suite (Playwright): guest purchase, login purchase, admin fulfilment, return flow; run nightly in CI.
- Caching: `Cache-Control`/ETag on public storefront endpoints; Redis for rate limit + hot product cache when moving to >1 instance.
- OpenAPI spec generated from Joi schemas; served at `/api/docs`.
- Recommendations v2 (co-purchase from orders), abandoned-cart email, admin audit log (`AuditLog` model written from a mutation middleware), CSV export of orders/products, bulk actions.
- Error tracking (Sentry) on all three apps; uptime monitoring on `/api/ready`.

---

## Risk register

| Risk | Mitigation |
|---|---|
| Refund logic touching live Stripe | Implement + test in Stripe test mode with CLI webhook forwarding; feature-flag `AUTO_REFUND_ON_CANCEL` |
| Server-component migration (E1) breaks client-only assumptions (js-cookie in server code) | Introduce `serverApi.ts` first; migrate one page (PDP) and verify before PLP/brand |
| httpOnly refresh cookie (S4) changes auth flow on the storefront | Ship behind route handlers with fallback; keep dashboard on current flow until verified |
| Lockfile consolidation (C4) changes resolved versions | Review `npm ci` diff; run all builds locally before merge |
| Locale route segment (L1) changes every storefront URL | Add permanent redirects from old paths to `/ar/...`; update sitemap |
| Seeder rewrite (I4) wipes data | Production guard + `--force`; document in `SEEDER_README.md` |

---

## Verification (per phase)

1. **Automated:** root `npm test` (all workspaces), `npm run lint`, typechecks, `npm run build`; CI green on the PR.
2. **API smoke:** `curl /api/ready`, `curl /api/products?limit=2`, `curl /api/recommendations`, admin token → `curl /api/help-topics/admin`.
3. **Payments (Phase 1):** `stripe listen --forward-to localhost:3000/api/webhooks/stripe`; run the purchase twice concurrently on a stock-1 product; verify one `paid`, one `needs_attention`; cancel the paid one → refund appears in Stripe dashboard.
4. **Storefront E2E (Phase 4):** manual script in Phase 4 exit criteria; later Playwright (Phase 10).
5. **SEO (Phase 6):** `curl -s https://<site>/products/<id> | grep '"@type":"Product"'`; Google Rich Results test; Lighthouse ≥ 90 SEO / ≥ 85 perf mobile.
6. **RTL (Phase 9):** screenshot review of home, PLP, PDP, cart, checkout in `/ar`.

---

## Suggested timeline (1 senior full-stack dev; halve with 2)

| Week | Phases |
|---|---|
| 1 | Phase 0 → Phase 1 |
| 2 | Phase 2 → Phase 3 |
| 3–4 | Phase 4 |
| 5 | Phase 5 |
| 6 | Phase 6 |
| 7–8 | Phase 7 |
| 9 | Phase 8 |
| 10–11 | Phase 9 |
| 12+ | Phase 10 |

