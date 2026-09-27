# TrendVaulta — Frontend Map

> Part of the 2026-09-27 technical audit. Finding IDs refer to [AUDIT_REPORT.md](AUDIT_REPORT.md); endpoints are detailed in [API_MATRIX.md](API_MATRIX.md).
> Built from `apps/website/src/app/**` (35 `page.tsx` + route handlers) and `apps/dashboard/src/App.tsx` (22 routes), working tree.

**Legend**

- **Auth**
  - `P`: public
  - `PX`: guarded by `src/proxy.ts` (checks only that the `token` and `userRole` cookies exist), plus a client-side re-check
  - `A`: auth page that bounces signed-in users
  - `noindex`: robots metadata set
  - Dashboard: `DashboardLayout` checks the `token` cookie and a staff `role` cookie, then applies the `can()` permission shown.
- **i18n (storefront)**
  - `UI full`: every UI string goes through `t()`
  - `Partial`: API/CMS text or errors are English only
  - Page `<title>`/description is English on **every** route (WEB-413).
  - The dashboard is English-only everywhere (`lang="en"`).
- **a11y**: a quick heuristic. `Good` means labels and roles are present; `Partial` means there are known gaps (see Issues); `Minimal` means little semantic markup.

---

## 1. Storefront (`apps/website`, Next.js 16 App Router)

### Global shell (applies to every route)

| Element | Data sources | Notes | Issues |
|---|---|---|---|
| `app/layout.tsx` | `tv_locale` cookie → `<html lang dir>` | Every route is rendered per request because the root layout reads a cookie. | WEB-413 |
| Navbar / AppShell / Footer | `GET /auth/profile` (useMe); `POST /newsletter` (Footer) | No skip link, navs have no names, no visible focus in the "More" menu, mobile menu has no Escape handling. Logout does not clear the caches. | WEB-511, WEB-515, WEB-517, WEB-522, WEB-521 |
| Toasts | — | Errors disappear after 3.2 s and use a polite region. | WEB-513, WEB-508 |
| `providers.tsx` | QueryClient with no defaults | Retries on 4xx errors. The forced-logout toast is in English. | WEB-528, WEB-422 |
| `not-found.tsx`, `error.tsx`, `loading.tsx` | — | There is no `global-error.tsx`. A single product-grid skeleton is used for every page. | WEB-422, OPS-702 |
| `proxy.ts` | cookies | Guards `/profile` (a route that does not exist), `/user*` and `/checkout*`. Bounces signed-in users away from `/auth/*`. Redirect sanitising has a tab-character bypass. | SEC-104, PAY-205 |

### Routes

| Route | Data sources (hook → endpoint) | Auth | i18n | a11y | Issues |
|---|---|---|---|---|---|
| `/` | useStorefrontModules → `GET /storefront/modules` (fallback `GET /storefront/home`); useProducts → `GET /products?sort=bestselling&limit=8`; `GET /storefront/trust`, `/storefront/categories`, `/offers?active=true&limit=12`, `/brands?featured=true&limit=8`, `/storefront/gift-finder`, `/me/recently-viewed` (auth), `/recommendations`, `/storefront/lookbooks`, `/storefront/why-choose-us`, `/storefront/testimonials`; demo fallbacks from `data/demoStorefront.ts` | P | Partial (CMS/API text is English) | Partial (hero auto-advances; h1 only inside the hero module; card actions) | API-301, API-302, API-310, API-311, API-312, API-313, WEB-405, WEB-406, WEB-410, WEB-412, WEB-512, WEB-514, WEB-518, WEB-520 |
| `/products` | useProducts → `GET /products` (+facets); useBrands → `GET /brands` | P | UI full | Partial (drawer focus, disclosure toggles; live result count OK) | WEB-412, WEB-414, WEB-510, WEB-514, WEB-516 |
| `/products/[id]` | Server: `GET /api/products/:id` (metadata, JSON-LD). Client: useProductById; `GET /products/:id/bundles`; `GET /reviews/product/:id` + `POST/PUT/DELETE /reviews`; `GET/POST /products/:id/qa`, `POST /qa/:id/helpful`; `GET /wishlist/check/:id`, `POST/DELETE /wishlist/:id`; `POST /me/recently-viewed` | P | Partial (product data is English) | Partial (review rating is not operable; h1 jumps to h3; thumbnails) | WEB-509, API-210, WEB-410, WEB-412, WEB-416, WEB-507, WEB-520, WEB-526, API-306, API-330 |
| `/c/[category]` | Server: `GET /api/products?category&facets=true&limit=1`. Client: useProducts | P | Partial (metadata is English) | Partial (breadcrumb + aria-current OK) | API-315, WEB-413, WEB-418, WEB-514 |
| `/c/[category]/[subcategory]` | Same as above, with subcategory | P | Partial | Partial | API-315, WEB-418 |
| `/brands` | useBrands → `GET /brands` (20 maximum) | P | Partial (brand text is English) | Partial | WEB-414, WEB-415 |
| `/brands/[id]` | Server: `GET /api/brands/:id`. Client: useBrandById, useProducts({brand}) | P | Partial | Partial | WEB-412, WEB-416, API-223 |
| `/offers` | useOffersList → `GET /offers?active=true&limit=24` | P | Partial (offer text is English) | Partial | WEB-415, API-311 |
| `/cart` | cartStore (`useSyncExternalStore` + localStorage); useCartQuoteSync → `POST /payments/quote`; demo trust items | P, noindex | UI full | Partial (Remove/qty buttons are unnamed) | WEB-406, WEB-521, WEB-530, WEB-531 |
| `/checkout` | `GET/POST /auth/addresses`; `POST /payments/quote`; `POST /coupons/validate`; `GET /shipping/methods`; `GET /payments/setup-status`; `POST /payments/checkout-session`; `POST /orders` (dev only) | PX, noindex | Partial (coupon/API errors are English) | Good (labels) but error toasts vanish | **API-201**, **API-202**, API-203, API-204, WEB-501, WEB-513, SEC-108 |
| `/checkout/success` | `GET /orders/:id` (poll); `POST /payments/verify-payment` | PX | UI full | Partial | PAY-201, PAY-203 |
| `/checkout/cancel` | none (reads `order_id`) | PX | UI full | Minimal | — |
| `/auth/login` | `POST /api/auth/login` (BFF → API) | A, noindex | Partial (login errors are English) | Good | SEC-104, SEC-108, SEC-112, SEC-115, WEB-501 |
| `/auth/signup` | `POST /api/auth/register` (BFF → API) | A, noindex | Partial | Good | SEC-104, SEC-112, WEB-501 |
| `/password/forgot-password` | `POST /password/forgot-password` | P, noindex | Partial | Good | SEC-106, OPS-712 |
| `/password/check-email` | none | P, noindex | UI full | Minimal | — |
| `/password/reset-password/[userId]/[token]` | `POST /password/reset-password/:userId/:token` | P, noindex | Partial | Good | OPS-712 (5-minute token) |
| `/user` | UserShell → `GET /auth/profile` | PX, noindex | UI full | Partial | WEB-422 (needlessly a client component), WEB-522 |
| `/user/orders` | `GET /orders/my` | PX | UI full | Minimal | WEB-410, WEB-522, API-218 |
| `/user/orders/[id]` | `GET /orders/:id`; `POST /orders/:id/cancel`; `POST /orders/:id/return` | PX | UI full | Minimal | WEB-410, WEB-420, API-217, API-214 (no invoice link) |
| `/user/wishlist` | `GET /wishlist/my`; `DELETE /wishlist/:id` | PX | UI full | Partial | WEB-409, WEB-410, API-316 |
| `/user/reviews` | `GET /reviews/my`; `DELETE /reviews/:id` | PX | UI full | Minimal | WEB-410 |
| `/user/addresses` | `GET/POST/PUT/DELETE /auth/addresses`, `PATCH …/default` | PX | UI full | Good | WEB-410 |
| `/user/profile` | `GET/PUT /auth/profile` | PX | UI full | Partial | WEB-410, WEB-529, SEC-107, API-102 |
| `/user/security` | `GET /auth/profile`; `POST /password/change` | PX | Partial ("Not authenticated" is shown in English) | Partial | SEC-110, WEB-410, WEB-505, WEB-529 |
| `/about` | none (message keys) | P | UI full | Partial | WEB-422 |
| `/faq` | none (Radix accordion) | P | UI full | Good | WEB-422 |
| `/cookies` | none | P | UI full | Partial | WEB-422 |
| `/privacy` | none (hard-coded; CMS PRIVACY ignored) | P | UI full | Partial | WEB-405 |
| `/terms` | none (hard-coded; CMS TERMS ignored) | P | UI full | Partial | WEB-405 |
| `/shipping` | useContent → `GET /content?type=SHIPPING` (sanitised HTML) | P | Partial (CMS legal body is English) | Partial (error block has no role) | API-303, API-311, API-331, WEB-521 |
| `/returns` | useContent → `GET /content?type=RETURNS` | P | Partial | Partial | API-303, API-311, API-331 |
| `/help` | `GET /storefront/help?active=true` | P | Partial (topics are English) | Partial | API-311, WEB-521 |
| `/contact` | `POST /contact` (honeypot) | P | Partial (submit errors are English) | Good | API-309, WEB-501 |
| `/unauthorized` | none | P, noindex | UI full | Partial (no h1) | WEB-520 |
| `/sitemap.xml`, `/robots.txt` | Server: `GET /api/products?limit=100`, `GET /api/brands?limit=50` | P | n/a | n/a | WEB-418, OPS-706 |
| `/api/auth/login`, `/register`, `/refresh`, `/logout` (BFF route handlers) | → `POST /api/auth/*`; sets/clears the httpOnly `tv_refresh` cookie | n/a | Error messages are English | n/a | SEC-102, SEC-108, SEC-115 |
| Legacy `/orders`, `/orders/:id`, `/account/*`, `/user/<name>/*` | 308 redirects (`next.config.ts:47-60`) | → PX | n/a | n/a | `/profile` has no redirect, and the order email links there (PAY-205) |

---

## 2. Dashboard (`apps/dashboard`, Vite + React Router)

Shared layout (`layouts/DashboardLayout.tsx`):
- The collapsed rail has nameless icon links and an emoji theme toggle, and the mobile drawer has no focus trap (DASH-622).
- There is no ErrorBoundary (DASH-620).
- Logout keeps the query cache (DASH-627).
- Role-cookie expiry causes spurious logouts (DASH-605).
- The refresh interceptor logs the user out on any failure (DASH-606, SEC-102, SEC-103).

| Route | Page component | Data sources (endpoints) | Auth / permission (UI → API) | i18n | a11y | Issues |
|---|---|---|---|---|---|---|
| `/login` | Login | `POST /auth/login` | public; rejects non-staff | EN | Good (labels, role=alert) | DASH-605, DASH-634 |
| `/` | Dashboard | `GET /admin/stats`, `GET /orders?limit=50` | any staff → orders:read | EN | Partial (low-contrast hints) | API-221, DASH-632 |
| `/analytics` | Analytics | `GET /admin/analytics` | orders:read → orders:read | EN | Good (aria-pressed, data table) | API-221 |
| `/low-stock` | LowStock | `GET /admin/low-stock`, `PUT /products/:id` | products:read/write | EN | Good (sr-only labels) | DASH-615, API-221 |
| `/users` | Users | `GET /users`, `PUT /users/:id`, `DELETE /users/:id` | users:read/write/delete | EN | Partial (modal, search) | SEC-113, SEC-114, SEC-111, OPS-725, DASH-617, DASH-618 |
| `/products` | Products | `/products` CRUD, `GET /brands`, `GET /categories/admin`, `POST /uploads` | products:* | EN | Partial (modal, search) | API-211, API-220, API-223, DASH-603, DASH-617, DASH-628 |
| `/brands` | Brands | `/brands` CRUD, `GET /products` (client-side delete guard) | brands:* | EN | Partial (modal) | API-212, DASH-617 |
| `/categories` | Categories | `GET /categories/admin`, `POST/PUT/DELETE /categories` | products:read/write/delete | EN | Partial (close labelled; no focus trap) | API-315, DASH-617 |
| `/orders` | Orders | `GET /orders`, `PATCH /orders/:id/status` | orders:read/write | EN | Partial (unlabelled search) | API-206, API-229, DASH-618 |
| `/orders/:id` | OrderDetail + ReturnPanel | `GET /orders/:id`, `PATCH /orders/:id/status`, `PATCH /orders/:id/tracking`, `PATCH /orders/:id/return` | orders:read; tracking not gated (API: orders:write) | EN | Partial (4 orphan labels) | **DASH-602**, API-203, API-205, API-206, API-213, API-226, DASH-618, DASH-628 |
| `/coupons` | Coupons | `GET/POST /coupons`, `PUT/DELETE /coupons/:id` | coupons:* | EN | Partial (modal) | API-204, API-215, API-227, DASH-613, DASH-617 |
| `/offers` | Offers | `GET /offers/admin`, `POST/PUT/DELETE /offers` | offers:* | EN | Partial (modal) | API-222, API-227, DASH-617, DASH-629, DASH-631 |
| `/reviews` | Reviews | `GET /reviews/admin`, `DELETE /reviews/admin/:id`, `PUT/DELETE …/:id/reply` | reviews:read/write/delete | EN | Partial (close labelled) | API-327, DASH-617 |
| `/help-topics` | HelpTopics | `GET /help-topics/admin`, `POST/PUT/DELETE /help-topics` | content:* | EN; no AR field | Partial (modal) | API-311, API-318, DASH-617, DASH-631 |
| `/content` | Content | `GET /content/admin`, `POST/PUT/DELETE /content` | content:* | EN; no AR field | Partial (modal) | **API-303**, API-311, API-318, API-331, DASH-617, DASH-631 |
| `/storefront-modules` | StorefrontModules + HeroSlidesEditor | `GET /storefront-modules/admin`, `POST/PUT/DELETE /storefront-modules` | content:* | Hero slides EN+AR (`dir=rtl`); other fields EN | Partial (slide inputs labelled; modal not) | **API-301**, API-310, API-319, API-321, DASH-612, DASH-617, DASH-629 |
| `/lookbooks` | Lookbooks | `GET /lookbooks/admin`, `POST/PUT/DELETE /lookbooks` | content:* | EN; no AR field | Partial (modal) | API-302, API-322, API-311, DASH-617, DASH-629, DASH-631 |
| `/testimonials` | Testimonials | `GET /testimonials/admin`, `POST/PUT/DELETE /testimonials` | content:* | EN; no AR field | Partial (modal) | API-302, API-313, API-322, API-311, DASH-617, DASH-631 |
| `/bundles` | Bundles | `GET /bundles/admin`, `POST/PUT/DELETE /bundles` | content:* | EN | Minimal (inputs rely on placeholders) | API-210, API-224, DASH-603, DASH-617, DASH-618, DASH-626 |
| `/gift-finder-config` | GiftFinderConfig | `GET /gift-finder/admin`, `POST/PUT/DELETE /gift-finder` | content:* | EN; no AR labels | Minimal (inputs rely on placeholders) | API-321, API-323, API-311, DASH-617 |
| `/product-qa` | ProductQA | `GET /qa/admin`, `PUT /qa/:id/answer`, `DELETE /qa/:id` | content:* | EN | Partial (modal) | API-306, API-307, DASH-603, DASH-617, DASH-624 |
| `/settings` | Settings | `GET/PUT /auth/profile`, `GET/PUT /admin/settings`, `PUT /users/:id` (password) | any staff; store section admin-only in UI (API: content:*) | EN | Partial (10 orphan labels) | **SEC-101**, **SEC-105**, API-107, DASH-618 |

### Admin capabilities with no dashboard screen

| API | Impact | Issue |
|---|---|---|
| `/api/admin/shipping/zones*` (8 endpoints) | Zones can't be created, which makes delivery checkout fail. | DASH-609, API-202 |
| `GET /api/contact/admin` | Customer enquiries are never seen. | API-309 |
| `GET /api/newsletter/admin` | Subscribers can't be exported or managed. | API-309, API-308 |
| `GET /api/orders/:id/invoice` | There are no receipts. | API-214 |

---

## 3. Coverage summary

| App | Routes | i18n | a11y | Top issues |
|---|---|---|---|---|
| Storefront | 35 pages + 4 BFF handlers + sitemap/robots | UI strings: 1274/1274 en/ar keys with exact parity. English leaks through CMS/API text, error messages, `<title>`s and emails. | Forms are good. Gaps: review rating, filters drawer, skip link, reduced motion, toasts, ProductCard. | API-201, API-202, WEB-522, WEB-509, API-301 |
| Dashboard | 22 pages | English only; only hero slides support Arabic content entry | Never audited before. All 15 modals are inaccessible, there are orphan labels, and search inputs rely on placeholders only. | DASH-602, DASH-603, SEC-105, SEC-101, DASH-617 |
