# TrendVaulta — Canonical API Contract

**Date:** 2026-08-07  
**Authority:** Routes under `apps/api/routes/` + `app.js`, cross-checked with `apps/website/src/lib/endpoints.ts`.  
**Response shape today:** ad hoc JSON (`message`, sometimes bare docs/arrays). Not a universal `{ data }` envelope.  
**Base path:** `/api`

### Contract status legend
- **CURRENT** — implemented path  
- **CANONICAL** — chosen standard going forward  
- **DEPRECATED / BROKEN** — do not extend; fix or alias temporarily  
- **GAP** — needed for MVP, missing

---

## 1. Global conventions

| Topic | Current | Canonical (V1) |
|-------|---------|----------------|
| Auth header | `Authorization: Bearer <jwt>` (also legacy `token` header) | Bearer only |
| Roles | JWT `roles: string[]` | keep |
| IDs | Mongo ObjectId hex 24 | keep |
| Errors | `{ message }` (+ occasional fields) | keep; add stable `code` for money/auth errors over time |
| Idempotency | Stripe webhook via `StripeWebhookEvent` | keep; checkout session create is **not** idempotent today |
| Ownership | Resource.user === JWT id | enforce on all customer resources |

**Inconsistencies to resolve (compatibility-preserving):**
1. Order/Wishlist/Review body fields: use **`product` / `productId`** only.  
2. Coupon increment: FE `/coupons/:id/increment` vs BE `/coupons/:id/use` → **canonical `POST /coupons/:id/use`**, or remove client call and increment on paid only.  
3. Wishlist: **canonical** `POST|DELETE /wishlist/:productId` (matches BE + website endpoints). No permanent `/wishlist/add` dual API.  
4. Coupon validate: **canonical** `POST /coupons/validate` (exists). No `/apply` unless added as alias later.

---

## 2. Auth

### POST `/api/auth/register`
| | |
|--|--|
| Access | public |
| Body | `{ email, username, password }` — **ignore roles** (canonical) |
| Success | 201 user fields + `token` |
| Errors | 400 validation / duplicate |
| Side effects | create user |
| Idempotency | none (duplicate email fails) |

### POST `/api/auth/login`
| | |
|--|--|
| Access | public |
| Body | `{ email, password }` |
| Success | 200 user + `token` |
| Errors | 400 invalid credentials |

### POST `/api/auth/logout`
| | |
|--|--|
| Access | public (stateless) |
| Success | 200 `{ message }` |
| Side effects | none server-side |

### GET `/api/auth/profile`
| | |
|--|--|
| Access | private |
| Success | `{ user, permissions? }` |
| Ownership | JWT subject only |

### PUT `/api/auth/profile`
| | |
|--|--|
| Access | private |
| Body | `{ username, email }` |
| Errors | 400 validation; 409 taken |
| Ownership | JWT subject |

---

## 3. Password

### POST `/api/password/forgot-password`
| | |
|--|--|
| Access | public |
| Body | `{ email }` |
| Success | 200 (dev may return link) |
| Errors | 404 user not found (**recommended:** generic 200) |
| Side effects | email send |

### POST `/api/password/reset-password/:userId/:token`
| | |
|--|--|
| Access | public |
| Body | `{ password }` min 8 |
| Errors | 400 invalid/expired; 404 user |
| Side effects | password hash update (invalidates prior reset tokens) |

**Note:** Shared api-client still documents `/auth/forgot-password` — **stale**; website uses `/password/*` (**canonical**).

---

## 4. Products

### GET `/api/products`
| | |
|--|--|
| Access | public |
| Query | `page`, `limit`, `sort`, `q`, `minPrice`, `maxPrice`, `category`, `subcategory`, `brand`, `featured` |
| Success | `{ data, meta: { total, page, pages, limit } }` |
| Notes | Forces `isActive: true` |

### GET `/api/products/:id`
| | |
|--|--|
| Access | public |
| Success | product doc |
| Errors | 404 |
| GAP | should 404 inactive for non-admin |

### POST `/api/products`
| Access | private + `products:write` |
| Body | validateCreateProduct |
| Success | 201 |

### PUT `/api/products/:id`
| Access | private + `products:write` |

### DELETE `/api/products/:id`
| Access | private + `products:delete` |
| Notes | hard delete today; prefer deactivate for V1 ops |

**RBAC GAP:** permission strings not present in `rolePermissions.js` — fix map before relying on admin UI.

---

## 5. Brands

### GET `/api/brands` · GET `/api/brands/:id`
Public (list filters active in controller).

### POST/PUT/DELETE `/api/brands[/:id]`
Private + `brands:write` / `brands:delete`.

---

## 6. Cart

**No server cart API** (`code`). Client cart only. Canonical commerce entry is checkout session.

---

## 7. Orders

### POST `/api/orders`
| | |
|--|--|
| Access | private |
| Body (canonical) | `{ items: [{ productId, qty, variant? }], shippingAddress, shippingPrice?, taxPrice? }` |
| Notes | Disabled when Stripe configured unless `DEV_ALLOW_DIRECT_ORDERS` / `ALLOW_DIRECT_ORDERS` |
| **BROKEN** | Joi still Template-oriented |

### GET `/api/orders/my`
| Access | private | Ownership | JWT user |

### GET `/api/orders/:id`
| Access | private | Ownership | owner or admin roles includes admin |

### GET `/api/orders` — admin list
| Access | private + `orders:read` |
| Query | `page`, `limit`, `status`, `paymentStatus`, `q` (order id) |
| Success | `{ data, meta }` — each item includes `allowedNextStatuses` |

### PATCH `/api/orders/:id/status` — admin fulfillment
| Access | private + `orders:write` |
| Body | `{ status }` — one of pending/paid/shipped/delivered/canceled |
| Rules | Allowed: `pending→canceled`, `paid→shipped|canceled`, `shipped→delivered`. **Not** `pending→paid` (Stripe only). |
| Note | Canceling a paid order that previously decremented stock restores inventory once (`stockRestored` flag). Stripe refunds are separate / not automatic. |

---

## 8. Payments & Stripe

### GET `/api/payments/setup-status`
| Access | public | Success | `{ ready: boolean }` |

### POST `/api/payments/checkout-session`
| | |
|--|--|
| Access | private |
| Body | same shape as create order (canonical productId) |
| Success | `{ url, orderId, sessionId }` |
| Side effects | pending Order; Stripe session; store `stripeSessionId` |
| Money rules | server must compute items/coupon/shipping/tax (GAP today for coupon/shipping trust) |
| Idempotency | none — repeated calls create multiple orders (**GAP**) |

### POST `/api/payments/verify-payment`
| | |
|--|--|
| Access | private |
| Body | `{ orderId }` |
| Ownership | order.user === JWT |
| Side effects | may mark paid if Stripe session complete |

### POST `/api/webhooks/stripe`
| | |
|--|--|
| Access | Stripe signature |
| Body | **raw** JSON |
| Side effects | idempotent event insert; mark order paid on `checkout.session.completed` |
| Errors | 400 bad signature; 500 processing (event row deleted for retry) |

---

## 9. Coupons

### POST `/api/coupons/validate` — **CANONICAL**
| Body | `{ code, orderAmount }` |
| Access | public today |
| Success | `{ valid, coupon?: { code, discountType, discountValue, discountAmount, expirationDate } }` |
| **Recommended** | private or signed checkout context; server recomputes orderAmount |

### GET `/api/coupons/code/:code`
| Access | public | **Recommended** | remove or redact sensitive fields |

### Admin CRUD
`GET/POST /coupons`, `GET/PUT/DELETE /coupons/:id` + `coupons:read|write|delete`.

### POST `/api/coupons/:id/use` — **CANONICAL** increment path
| Access | private (any auth today — **too open**) |
| FE mismatch | website calls `/coupons/:id/increment` — **BROKEN** |
| **Recommended** | internal-only / paid-handler; do not expose to clients |

---

## 10. Wishlist — **CANONICAL**

| Method | Path | Access |
|--------|------|--------|
| POST | `/api/wishlist/:productId` | private |
| DELETE | `/api/wishlist/:productId` | private |
| GET | `/api/wishlist/my` | private |
| GET | `/api/wishlist/check/:productId` | private |

Matches website `endpoints.ts`.  
**Do not** introduce competing `/wishlist/add` unless temporary alias.  
Schema must use `product` field (see DATA_MODEL).

---

## 11. Reviews

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/reviews/product/:productId` | public |
| POST | `/api/reviews` | private — body `{ product, rating, comment }` **canonical** |
| PUT | `/api/reviews/:reviewId` | private + ownership |
| DELETE | `/api/reviews/:reviewId` | private + ownership |
| GET | `/api/reviews/my/:productId` | private |
| GET | `/api/reviews/my` | private |

Joi still expects `template` — **BROKEN**; align to `product`.

---

## 12. Users (admin)

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/users` | `users:read` |
| GET | `/api/users/:id` | `users:read` |
| PUT | `/api/users/:id` | `users:write` |
| DELETE | `/api/users/:id` | `users:delete` |

---

## 13. trendvaulta / ops

| Method | Path | Status |
|--------|------|--------|
| GET | `/api/trendvaulta` | **GAP** (documented in DEPLOYMENT_GUIDE, missing in `app.js`) |
| GET | `/` · `/api/` | CURRENT informational JSON (still trendvaulta copy) |

---

## 14. Frontend alignment checklist

When changing public shapes:

1. Backend routes/controllers/models  
2. `apps/website/src/lib/endpoints.ts` + `api.ts` + `types`  
3. `packages/types` + `packages/api-client` (or stop using until aligned)  
4. Dashboard pages if they call API  
5. Tests  
6. This document  

**Website is currently source of FE truth** for TrendVaulta; shared packages are trendvaulta-stale.
