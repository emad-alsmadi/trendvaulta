> **Historical (2026-08)** — superseded by [`FULL_SYSTEM_ANALYSIS.md`](./FULL_SYSTEM_ANALYSIS.md) and [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md). Kept for audit trail only; do not treat as current status.

# TrendVaulta — Project Status Audit

**Audit date:** 2026-08-07  
**Scope:** Repository reality check (Phase 0). No production-ready claim.  
**Evidence legend:** `code` = confirmed from implementation · `docs` = confirmed from documentation only · `inferred` · `missing info`

---

## 1. Executive verdict

**Confirmed from code:** The monorepo is a **partial migration** from Craftify Templates Marketplace to TrendVaulta retail e-commerce (beauty/fashion/lifestyle). Product catalog, brands, Stripe Checkout, webhook idempotency stubs, wishlist/review/coupon controllers, and a Next.js storefront exist in substantial form.

**Confirmed from code:** Critical domain schemas (`Order`, `Wishlist`, `Review`) and RBAC permissions still use **Craftify `Template` / `templates:*` terminology**, while controllers and the website use **`product` / `products:*`**. Shared packages (`@craftify/types`, `@craftify/api-client`, `@craftify/ui`) remain Craftify stubs. Root/docs branding is still Craftify/Fountain.

**Verdict:** Not staging-ready. Not production-ready. Golden commerce slice is **PARTIAL / NEEDS_SECURITY_REVIEW** with multiple **BROKEN** contract mismatches.

---

## 2. Repository topology (confirmed from code)

| Path | Role | Notes |
|------|------|-------|
| `apps/api` | Express + Mongoose API | Package name `@craftify/backend`; default port `3000` |
| `apps/website` | Next.js 16 App Router storefront | Port `3001`; own `lib/api.ts` (not shared client) |
| `apps/dashboard` | Vite + React admin shell | Product/brand/order/user pages present; depth unknown |
| `packages/types` | Shared types | Still `Template` / `Creator` — **stale** |
| `packages/api-client` | Shared Axios client | Still `/templates`, `/creators` — **stale** |
| `packages/ui` | Shared UI | Empty export (`export {}`) |
| `pnpm-workspace.yaml` | Workspace declaration | Present |
| Root `package.json` | npm workspaces scripts | Name `craftify-monorepo`; uses npm workspaces, not pnpm scripts |
| `.github/workflows` | CI | **Missing** (no workflow files found) |
| `.env*` examples | Env templates | **Missing** at repo root (docs reference `.env.example`) |
| `docs/` | Engineering docs | Created by this audit |

---

## 3. Feature matrix

Status values: `DONE` · `PARTIAL` · `MISSING` · `BROKEN` · `NEEDS_REFACTOR` · `NEEDS_TESTS` · `NEEDS_SECURITY_REVIEW`

| Feature | Backend | Website | Dashboard | Tests | Status | Notes / file refs |
| ------------------------ | ------- | ------- | --------- | ----- | ------ | ----- |
| Authentication | PARTIAL | PARTIAL | PARTIAL | MISSING | NEEDS_SECURITY_REVIEW | Register/login/logout exist (`apps/api/controllers/auth.controller.js`, `routes/auth.js`). JWT in client-readable cookies (`apps/website/src/lib/authCookies.ts`). Register accepts `roles` from body — privilege escalation risk. |
| Password reset | PARTIAL | PARTIAL | MISSING | MISSING | PARTIAL | `routes/password.js`, `controllers/password.controller.js`, website password pages. Nodemailer path present. Reuse/expiry rules need formalization. |
| Products | PARTIAL | PARTIAL | PARTIAL | MISSING | PARTIAL | `models/Product.js`, `routes/products.js`, website products pages + admin panel. Public list filters `isActive: true`. Admin write gated by `products:write` **not present in** `rolePermissions.js` → admin create/update likely **403**. |
| Product variants | PARTIAL | PARTIAL | MISSING | MISSING | PARTIAL | Embedded `variants[]` on Product (size/color/stock/sku/price). Checkout accepts optional variant but **does not validate variant stock/price** in payment/order controllers. |
| Brands | PARTIAL | PARTIAL | PARTIAL | MISSING | PARTIAL | Brand model + CRUD. Same RBAC mismatch (`brands:write` vs Craftify perms). |
| Cart | N/A (client) | PARTIAL | MISSING | MISSING | PARTIAL | Client-only cart (`apps/website/src/lib/cartStore.ts`). No server cart. Prices/stock not revalidated until checkout. |
| Checkout | PARTIAL | PARTIAL | MISSING | MISSING | NEEDS_SECURITY_REVIEW | Stripe session + pending order (`payment.controller.js`). Trusts client `shippingPrice` / `taxPrice`. Coupon discount applied on UI only — **not applied to Stripe amount**. |
| Orders | PARTIAL | PARTIAL | PARTIAL | MISSING | BROKEN / NEEDS_REFACTOR | Controllers write `productId`; `models/Order.js` schema/Joi still `template` / Template ref. `serializeOrder.js` still emits `templateId`. |
| Stripe checkout | PARTIAL | PARTIAL | MISSING | MISSING | PARTIAL | `POST /api/payments/checkout-session`. Product prices loaded from DB for line items. |
| Stripe webhooks | PARTIAL | N/A | N/A | MISSING | PARTIAL | Raw body + signature verify + `StripeWebhookEvent` unique `eventId` (`app.js`, `payment.controller.js`, `models/StripeWebhookEvent.js`). No stock decrement / email on paid. |
| Coupon system | PARTIAL | PARTIAL | PARTIAL | MISSING | PARTIAL | Validate + admin CRUD. `POST /coupons/:id/use` exists; website `api.ts` calls `/coupons/:id/increment` — **path mismatch**. Coupon not wired into authoritative checkout totals. `GET /coupons/code/:code` is public (info leak risk). |
| Wishlist | BROKEN | PARTIAL | MISSING | MISSING | BROKEN | Controller uses `product` (`wishlist.controller.js`); model field + unique index is `template` (`models/Wishlist.js`). Website endpoints match controller path shape (`POST /wishlist/:productId`). |
| Reviews | BROKEN | PARTIAL | MISSING | MISSING | BROKEN | Controller uses `product`; model/Joi use `template` (`models/Review.js`). Ownership checks on update/delete exist in controller. Purchase-required rule: **not implemented** → BUSINESS DECISION REQUIRED. |
| Profile | PARTIAL | PARTIAL | MISSING | MISSING | PARTIAL | `GET/PUT /api/auth/profile`. No disabled-user flag. |
| Addresses | MISSING | PARTIAL | MISSING | MISSING | MISSING | No Address model/CRUD. Shipping address only on order at checkout. |
| Admin product management | BROKEN | PARTIAL | PARTIAL | MISSING | BROKEN | Website `AdminProductsPanel.tsx` + dashboard `Products.tsx`. Blocked by RBAC permission mismatch (`rolePermissions.js` vs `routes/products.js`). |
| Admin users | PARTIAL | PARTIAL | PARTIAL | MISSING | PARTIAL | `routes/users.js` + `users:read/write/delete` — also **missing** from `ROLE_PERMISSIONS` map (admin has Craftify keys only). |
| Admin orders | MISSING | MISSING | PARTIAL | MISSING | PARTIAL | Customer `getOrderById` allows admin bypass; **no admin list/status-transition API** found. Dashboard Orders page exists; backend support incomplete. |
| Analytics | MISSING | MISSING | PARTIAL | MISSING | MISSING | Dashboard page shell only; no analytics API confirmed. |
| Logging | PARTIAL | MISSING | MISSING | MISSING | PARTIAL | Simple `middlewares/logger.js`; no structured logs / request IDs. Errors `console.log(err)` in `app.js`. |
| Monitoring | MISSING | MISSING | MISSING | MISSING | MISSING | `DEPLOYMENT_GUIDE.md` claims `/api/trendvaulta`; **not implemented** in `app.js`. |
| CI | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | `.github/workflows/ci.yml` added (API tests, website lint/typecheck/build, dashboard lint/test/build). Not yet proven green on GitHub Actions. |
| Security controls | PARTIAL | PARTIAL | PARTIAL | MISSING | NEEDS_SECURITY_REVIEW | JWT + bcrypt + Joi present. CORS `origin: true`. No rate limiting / helmet. Client-settable `userRole` cookie. Register role injection. Client tax/shipping. Coupon increment public-ish auth without commerce binding. |
| Shared packages alignment | BROKEN | N/A | PARTIAL | MISSING | BROKEN | Types/api-client Craftify-era; website duplicates client; ui empty. |
| Transactional email | PARTIAL | N/A | N/A | MISSING | PARTIAL | Password reset email only (confirmed path). Order confirmation email: **missing**. |
| Search / filter / pagination | PARTIAL | PARTIAL | MISSING | MISSING | PARTIAL | Product controller supports query filters/pagination (`product.controller.js`). |
| Stock correctness | MISSING | PARTIAL | MISSING | MISSING | MISSING | Stock fields exist; **no decrement / concurrency-safe reservation** on pay found. |

---

## 4. Stack reality vs documentation

| Claim (docs / prompt) | Reality (code) | Classification |
|----------------------|----------------|----------------|
| TrendVaulta retail ecommerce | Website branding TrendVaulta; API still “Craftify API” | `code` + inconsistency |
| Apps: api, website, dashboard | Present under `apps/` | `code` |
| Packages: types, ui, api-client | Present but stale/empty | `code` |
| pnpm monorepo | `pnpm-workspace.yaml` exists; root scripts are npm workspaces | `code` |
| JWT auth | Implemented | `code` |
| Refresh tokens | Not found | `code` (absent) |
| httpOnly cookies | Docs/README mention non-httpOnly; implementation uses `js-cookie` (readable) | `code` + `docs` |
| Stripe + webhooks | Implemented with signature + idempotency event store | `code` |
| Joi validation | Present on models | `code` |
| Nodemailer | Password reset | `code` |
| Redis / Elasticsearch / i18n / social login | Not required by codepaths for MVP | `code` (absent) — keep Post-MVP |

---

## 5. Evidence index (high-signal files)

- API entry: `apps/api/app.js`
- Auth: `apps/api/controllers/auth.controller.js`, `middlewares/verfiyToken.js`, `middlewares/rolePermissions.js`
- Commerce: `controllers/payment.controller.js`, `controllers/order.controller.js`, `services/stripe.service.js`
- Models: `models/Product.js`, `Order.js`, `Wishlist.js`, `Review.js`, `Coupon.js`, `User.js`, `Brand.js`, `StripeWebhookEvent.js`
- Website contract: `apps/website/src/lib/endpoints.ts`, `lib/api.ts`, `lib/cartStore.ts`, `lib/authCookies.ts`, `types/index.ts`
- Shared: `packages/types/src/index.ts`, `packages/api-client/src/endpoints.ts`, `packages/ui/src/components/index.ts`
- Docs debt: `README.md`, `MONOREPO_SETUP.md`, `apps/api/DEPLOYMENT_GUIDE.md`, `apps/api/render.yaml`

---

## 6. Explicit non-claims

- Not claiming production data / Atlas contents (missing info).
- Not claiming live Stripe/webhook environment configuration (missing info).
- Dashboard page depth beyond routing shells not fully line-audited (inferred PARTIAL from structure + page files present).
- Seeder quality not fully audited (`data.js` / `seeder.js` exist; SEEDER_README mentions TrendVaulta).
