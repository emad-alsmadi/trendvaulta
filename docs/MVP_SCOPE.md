# TrendVaulta V1 — MVP Scope Freeze

**Status:** Official V1 MVP definition based on **repository reality** (2026-08-07 audit).  
**Principle:** Ship a trustworthy commerce core before growth features. Do not expand MVP for speculative capabilities.

---

## Classification key

| Label | Meaning |
|-------|---------|
| **MUST HAVE** | Required to call V1 complete |
| **SHOULD HAVE** | Strongly preferred in V1 if capacity allows; blockers if half-broken |
| **POST-MVP** | Explicitly deferred |
| **NOT CURRENTLY PLANNED** | Out of product roadmap unless business revisits |

---

## MUST HAVE (V1)

### Identity & access
- Registration (email/username/password)
- Login / logout
- Password reset (request + complete; single-use semantics)
- JWT authentication with server-side verification
- Role authorization for admin mutations (canonical product/brand/coupon/user permissions)
- Ownership checks on orders, reviews, wishlist, profile

### Catalog
- Product browsing (list)
- Product detail
- Categories (enum/filter as implemented)
- Brands (list + detail)
- Filtering, search, pagination
- Active/inactive product visibility (customers see active only)
- Variants displayed; selected variant validated at checkout when present

### Cart & checkout
- Client cart with quantity controls
- Server-authoritative price reload at checkout
- Stock validation at checkout (product and/or variant)
- Shipping address capture (on order)
- Checkout creating a pending payment context / order
- Stripe Checkout Session with backend-calculated amounts
- Stripe webhook signature verification
- Webhook idempotency
- Paid transition only from Stripe confirmation (webhook and/or authenticated verify fallback)
- Order history + order detail for owner

### Promotions & engagement (V1-critical)
- Coupon validate endpoint used by checkout **and** applied server-side to totals
- Wishlist add / list / remove / check (canonical product field)
- Reviews create / read / update / delete with rating 1–5 and ownership

### Admin operations (minimum)
- Admin product create/update/delete (or deactivate)
- Admin order list + status transitions within allowed state machine
- Admin coupon CRUD
- Admin user list/update (no silent self-escalation from public register)

### Platform integrity
- Transactional email for password reset
- Order confirmation email on paid (at least best-effort with safe failure)
- trendvaulta endpoint for deploy probes
- Critical integration tests for golden slice
- CI: install, lint, typecheck, unit/integration, website + dashboard build

---

## SHOULD HAVE (V1 if capacity)

- Saved customer addresses (Address model + CRUD) — currently **MISSING**; checkout inline address can satisfy MUST HAVE shipping
- Admin brands management polish (CRUD already partial)
- Basic admin analytics (counts: orders, revenue, products) without a full BI stack
- Structured logging + request IDs
- Rate limiting on auth, password reset, coupon validate, checkout
- CORS allowlist (not `origin: true`)
- Env example files (`.env.example`) for api/website/dashboard
- Soft-delete / deactivate patterns documented for products & coupons
- Dashboard fully wired to the same API contracts as website admin (avoid dual broken UIs)

---

## POST-MVP

- Recommendation engine
- Real-time notifications / websockets
- Elasticsearch / advanced search
- Multi-currency
- Internationalization (i18n)
- Social login
- Mobile app
- Live chat
- Redis caching / queues (unless a concrete scale requirement appears)
- Background job workers (beyond simple inline email)
- Chargeback automation beyond recording `refunded` if Stripe events added later
- Guest checkout
- Multi-warehouse inventory

---

## NOT CURRENTLY PLANNED

- Marketplace multi-vendor payouts
- Craftify-style digital template entitlements / creator storefronts as primary domain
- Subscription billing / Stripe Billing recurring
- In-house payment form (Elements) replacing Checkout — keep Checkout unless product requires otherwise

---

## Explicitly out of V1 “done” claims

V1 is **not** complete until:

1. Order/Wishlist/Review schemas match product domain (no Template refs).
2. RBAC permissions match route permission strings.
3. Stripe amounts include server-side coupon/shipping/tax rules.
4. Stock cannot go negative under concurrent paid webhooks.
5. Critical tests + CI are green.
6. Docs describe TrendVaulta (not Craftify) as the product identity.

---

## Dependency note (confirmed from code)

| Area | Current shape | MVP implication |
|------|---------------|-----------------|
| Cart | Client-only | Acceptable for V1 if checkout revalidates |
| Addresses | Embedded on order only | Acceptable for MUST HAVE; saved addresses = SHOULD |
| Admin UI | Website `/admin` + separate dashboard | Pick one primary admin surface for V1 polish; do not leave both broken |
| Shared packages | Stale | Align or stop claiming them as source of truth until fixed |
