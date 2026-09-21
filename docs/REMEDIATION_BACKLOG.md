> **Historical (2026-08)** — superseded by [`FULL_SYSTEM_ANALYSIS.md`](./FULL_SYSTEM_ANALYSIS.md) and [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md). Kept for audit trail only; do not treat as current status.

# TrendVaulta — Remediation Backlog & Audit Tasks 3–7

**Companion to:** `docs/PROJECT_STATUS.md`, `docs/MVP_SCOPE.md`  
**Date:** 2026-08-07  
**Rule:** Documentation and planning only in this batch. Schema migrations require impact notes before code changes.

Evidence tags: `code` · `docs` · `inferred` · `recommended` · `missing info`

---

## Task 3 — Architecture / documentation inconsistencies

| # | Inconsistency | Evidence | Severity |
|---|---------------|----------|----------|
| 1 | Product identity: TrendVaulta vs Craftify/Fountain | Website layout title TrendVaulta; `README.md` / `MONOREPO_SETUP.md` / `app.js` still Craftify templates | High (docs/ops confusion) |
| 2 | Monorepo paths: docs say `frontend/`/`backend/` or `apps/backend` | Real paths `apps/website`, `apps/api` | High |
| 3 | Package manager: pnpm recommended in docs; root uses npm workspace scripts; API has `package-lock.json` | `pnpm-workspace.yaml`, root `package.json`, `apps/api/package-lock.json` | Medium |
| 4 | Ports: docs disagree (3000/3001 swapped historically) | API default `PORT \|\| 3000`; website `next dev -p 3001` | Medium |
| 5 | Shared packages still Template/Creator | `packages/types`, `packages/api-client` | High |
| 6 | Website duplicates API client | `apps/website/src/lib/api.ts` vs unused Craftify client | Medium |
| 7 | `@craftify/ui` empty | `packages/ui/src/components/index.ts` exports `{}` | Low |
| 8 | Order item field: `template` in schema vs `productId` in controllers/FE | `models/Order.js` vs `order.controller.js` / `payment.controller.js` / website types | **Critical** |
| 9 | Wishlist field: `template` in model vs `product` in controller | `models/Wishlist.js` vs `wishlist.controller.js` | **Critical** |
| 10 | Review field: `template` in model/Joi vs `product` in controller/FE | `models/Review.js` vs `review.controller.js` | **Critical** |
| 11 | RBAC: routes require `products:*` / `brands:*` / `coupons:*` / `users:*`; map has `templates:*` / `creators:*` | `rolePermissions.js` vs route files | **Critical** |
| 12 | Order serializer still Craftify | `utils/serializeOrder.js` outputs `templateId` | High |
| 13 | Coupon use path: BE `/coupons/:id/use` vs FE `/coupons/:id/increment` | `routes/coupons.js` vs `website/src/lib/api.ts` | High |
| 14 | trendvaulta endpoint documented, not implemented | `DEPLOYMENT_GUIDE.md` vs `app.js` | High (deploy) |
| 15 | Auth cookie: docs claim client cookies; not httpOnly | `README.md`, `authCookies.ts` | High (security design) |
| 16 | `userRole` cookie is client-writable; used by Next proxy for UI gating | `authCookies.ts`, `proxy.ts` | High (UI spoof; API still JWT) |
| 17 | Register accepts `roles` from body | `auth.controller.js` + Joi `roles` | **Critical** |
| 18 | CORS `origin: true` | `app.js` | High |
| 19 | Checkout trusts client shipping/tax; coupon only client-side | `payment.controller.js`, checkout page | **Critical** (money) |
| 20 | No stock decrement on paid | search across controllers — absent | **Critical** |
| 21 | `.cursorrules` / `AGENTS.md` still Craftify template marketplace | repo root rules | Medium (agent drift) |
| 22 | LMJ trendvaulta API rules present in `.cursor/rules` | unrelated domain docs in this repo | Medium (agent confusion) |
| 23 | render.yaml Craftify DB name / branding | `apps/api/render.yaml` | Medium |
| 24 | No `.env.example` found | glob | Medium |
| 25 | No GitHub Actions CI | glob | High |
| 26 | Dual admin surfaces (website `/admin` + `apps/dashboard`) | both trees exist | Medium (duplication) |
| 27 | Order status enum includes `canceled` (US spelling); no admin transition API | `Order.js` | Medium |
| 28 | Permissions leak Craftify resource names in 403 responses | `checkRolePermission.js` returns `userPermissions` | Low/Med |

---

## Task 4 — MVP scope

See **`docs/MVP_SCOPE.md`** (authoritative freeze).

---

## Task 5 — Prioritized remediation backlog

### P0 — Commerce integrity (do first)

1. **Fix domain schema drift** — Order items, Wishlist, Review: canonicalize to `product` / `productId`; update Joi, indexes, serializer; document migration for existing Mongo collections that may contain `template` keys.
2. **Fix RBAC map** — Replace `templates:*` / `creators:*` with TrendVaulta permissions used by routes (`products`, `brands`, `coupons`, `users`, later `orders`).
3. **Stop register role injection** — Force `roles: ['user']` server-side; ignore client roles.
4. **Server-authoritative checkout totals** — Recompute items from DB; compute shipping/tax by rules; apply coupon server-side; never trust FE discount/shipping/tax for Stripe `unit_amount`.
5. **Stock safety** — Validate stock at session create; atomic decrement on paid; reject negative; decide variant vs product stock source of truth.
6. **Stripe webhook completeness** — Keep signature + idempotency; add paid side effects (stock, coupon usage, confirmation email) inside idempotent handler.
7. **Coupon contract** — Canonical `POST /coupons/validate`; align FE increment path or remove client increment (prefer server increment on paid only).
8. **Order create validation** — Align `validateCreateOrder` with `productId` (+ optional variant); remove Template refs.
9. **Critical integration tests** — Auth, checkout session amount, webhook idempotency, ownership on orders.

### P1 — Customer experience

10. Profile polish + password reset edge cases documented/tested.
11. Wishlist/review end-to-end after schema fix.
12. Search/filter/empty/loading/error states consistency.
13. Order tracking UX against real statuses.
14. Saved addresses (if elevated from SHOULD).

### P2 — Admin operations

15. Admin order list + allowed status transitions API.
16. Align dashboard with website API contracts (or deprecate one UI).
17. Inventory/brand/coupon admin hardening.
18. Basic analytics endpoints.

### P3 — Production engineering

19. `.github/workflows/ci.yml`
20. trendvaulta/readiness endpoints
21. Rate limiting, structured logs, CORS allowlist
22. `.env.example` files; staging doc
23. E2E for purchase / wishlist / admin product visibility
24. Rewrite root README / MONOREPO_SETUP for TrendVaulta

### P4 — Growth

25. Recommendations, i18n, multi-currency, social login, mobile, live chat, Redis — **Post-MVP only**.

---

## Task 6 — Golden Slice gaps

**Slice:** `Product → Cart → Coupon → Checkout → Stripe → Webhook → Paid Order → Order History`

| Step | Expected | Current (code) | Gap |
|------|----------|----------------|-----|
| Product | Active product, authoritative price/stock | Product model + list/detail | Variants/stock not enforced at pay |
| Cart | Hold productId/qty/variant | Client `cartStore.ts` | Stale price/stock until checkout |
| Coupon | Validate + apply server-side | Validate API exists; FE applies discount to display only | **Not applied to Stripe total** |
| Checkout | Pending order + trusted totals | Creates order; uses DB product prices | Trusts client shipping/tax; Order schema mismatch may strip/mis-store items |
| Stripe | Amount = backend total | Line items from normalized product prices + client shipping/tax | Coupon missing; tax/shipping untrusted |
| Webhook | Verify sig, idempotent paid mark | Implemented | No stock/email/coupon side effects |
| Paid order | Concurrency-safe | `markOrderPaidFromSession` early-return if paid | No stock transaction |
| Order history | Owner sees paid | `GET /orders/my` | Serializer still Template-oriented; schema mismatch risk |

**Additional golden-slice blockers:** RBAC not required for customer checkout, but Order/Wishlist/Review schema drift can break persistence/population; FE coupon increment path wrong if used.

---

## Task 7 — Proposed first implementation batch

**Status (2026-08-07): IN PROGRESS / largely implemented in Batch 0.1 code.** See `docs/MIGRATION_BATCH_0_1.md` before applying DB renames.

### Batch 0.1 — Canonicalize identity & contracts (docs + code, migration-aware)

1. Canonical user identity in API responses: expose both `_id` and document JWT `id` consistently; keep `roles` (array) as source of truth; stop documenting singular `role` as persisted field (cookie `userRole` is a derived UI hint only).
2. Canonical Order item structure: `{ productId, title, price, qty, cover, variant? }` — update `Order.js`, Joi, `serializeOrder.js`.
3. Canonical Wishlist: keep **one document per user+product** with compound unique index (already the intended pattern; currently misnamed `template`). **Recommendation:** do **not** switch to `user + products[]` — current query patterns are per-product add/remove/check (`wishlist.controller.js`, website endpoints). Fix field name to `product` + migrate index `{ user: 1, product: 1 }`.
4. Canonical Coupon validation: keep `POST /api/coupons/validate`; deprecate/remove mistaken FE `/increment` or alias `POST /coupons/:id/use`.
5. Auth storage design: document that tokens are **non-httpOnly cookies via js-cookie** today; propose V1 hardening options (httpOnly cookie set by API Set-Cookie **or** memory+refresh) — **BUSINESS DECISION REQUIRED** before flipping storage.
6. Ownership audit pass on orders/reviews/wishlist/verify-payment (already partially present).
7. Server-authoritative pricing + stock checks in `createCheckoutSession`.
8. Stripe webhook: keep signature + idempotency; add failing tests first for duplicate events.
9. Establish API integration test harness (even minimal) for golden slice.

### Explicitly deferred from Batch 0.1

- Full Address module
- Dashboard rewrite
- Shared package rename `@craftify/*` → `@trendvaulta/*` (can follow after types exist)
- Redis, i18n, recommendations

### Migration impact (must document before applying)

| Collection | Risk | Approach (recommended) |
|------------|------|------------------------|
| `orders` | Items may have `template` or `productId` | Dual-read serializer; migrate scripts to rewrite keys; then drop Template refs |
| `wishlists` | Field `template` vs `product` | Migration rename + rebuild unique index |
| `reviews` | Field `template` vs `product` | Same as wishlist |
| Users | `roles` already array | No rename; block client-supplied roles |

---

## BUSINESS DECISION REQUIRED (do not silently invent)

| Topic | Why | Recommended default (non-binding) |
|-------|-----|-----------------------------------|
| Auth token storage | Security vs current SPA cookie pattern | Short-lived access JWT in httpOnly Secure SameSite=Lax cookie set by API; keep logout clearing cookie server-side |
| Purchase required to review | Not enforced in code | Require paid order containing product |
| Per-user coupon usage vs global `usedCount` | Only global counter exists | Global limit for V1; add per-user later |
| Shipping/tax calculation | Client sends numbers | Flat shipping rule server-side; tax=0 or fixed % by config until tax engine exists |
| Order cancel spelling / states | `canceled` vs `cancelled`; missing `processing` | Keep DB enum; add `processing` only if ops needs it |
| Primary admin UI | Website `/admin` vs `apps/dashboard` | Website admin for V1; dashboard catch-up Post-MVP or parallel P2 |
| Variant stock vs product.stock | Both exist | If variants length > 0, variant stock is authoritative |
| Max percentage discount | No cap field | Cap at 100% of eligible subtotal (already min with order amount) |

---

## Next documentation phases (after approval; not started)

Per original plan: `BUSINESS_RULES.md`, `DATA_MODEL.md`, `API_CONTRACT.md`, `SECURITY_MODEL.md`, `TEST_STRATEGY.md`, staging/production checklists, architecture diagrams — **after** Batch 0.1 scope confirmation or in parallel as read-only docs drafted from this audit.

---

## First batch Definition of Done (when implementation starts)

- Schema/controller/FE/serializer aligned for Product domain on Order/Wishlist/Review
- RBAC permissions match routes
- Register cannot set admin
- Checkout amounts authoritative; coupon applied server-side or explicitly out-of-scope with FE discount removed
- Webhook tests for signature failure + duplicate eventId
- Docs updated (`PROJECT_STATUS` statuses refreshed)
- No unrelated refactors
