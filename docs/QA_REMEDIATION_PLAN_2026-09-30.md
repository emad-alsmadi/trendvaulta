# TrendVaulta — QA Remediation Plan

**Source:** *System Blocking QA Audit — TrendVaulta* (2026-09-29 / 2026-09-30, live deployment `https://trendvaulta.vercel.app`)
**Audit verdict:** NOT FIT FOR PRODUCTION RELEASE — 3 × P0, 2 × P1, 7 × P2, 8 × P3, 4 × P4
**Plan date:** 2026-09-30
**Goal:** Get the audit's release gate to **PASS** with small, reviewable PRs, and without rewriting architecture the audit rated as sound (authorisation, server-side validation, i18n/RTL, accessibility basics).

---

## 0. How to read this plan

- Each defect is mapped to **the actual code in this repo**, not only to what the audit saw. The audit was black-box and could not see the code, so every item below was checked against source.
- Every item has: **current state in repo → root cause → change → files → acceptance criteria**.
- Effort: **S** ≤ ½ day · **M** ≈ 1–2 days · **L** ≥ 3 days.
- Work is grouped into **phases**. Each phase ends at a gate. Do not start a phase before the previous gate passes, except where marked *parallel*.
- Project rules in `AGENTS.md` still apply: one PR-sized task per branch, no new dependencies without approval, match existing patterns (`lib/api.ts`, domain `hooks/`, `useToast`, `useConfirm`, `getUserFacingErrorMessage`), Arabic + English copy for every user-facing string.

---

## 1. Key finding before any fix: the deployed build is behind the repo

Several audit findings are **already partly fixed in `main`**, which means production is running an older build (or env vars that differ from the code's assumptions):

| Audit finding | What the repo already has | Evidence |
|---|---|---|
| P0-001 quick-add without variant | Product cards route to the PDP ("Choose options") when `variants.length > 0` | `apps/website/src/components/products/ProductCard.tsx:51`, `:180-186` |
| P0-001 cart cannot be repaired | Cart line shows a `variant_required` notice with a "Choose options" link | `apps/website/src/app/cart/page.tsx:224-241` |
| P0-002 checkout pays for a partial quote | "Pay now" is disabled when any line has `variant_required` | `apps/website/src/app/checkout/page.tsx:246-248`, `:828-833` |
| P2-003 address delete without confirmation | `window.confirm()` before delete | `apps/website/src/app/user/addresses/page.tsx:78` |
| P2-004 hydration mismatch | `useHasAuthToken` now reads the cookie through a hydration-safe `useSyncExternalStore` | `apps/website/src/hooks/auth/useHasAuthToken.ts` |
| P3-003 401 burst | Concurrent 401s share a single in-flight refresh | `apps/website/src/lib/api.ts:105-128` |

The working tree also has **uncommitted changes** in API, dashboard and website files. They must be committed (or stashed) before this plan starts so every remediation PR has a clean diff.

**Implication:** Phase 0 below is about deploy parity first. Re-testing the old build against new code would waste the next QA cycle.

The repo also has **gaps the audit could not see**. The most important one:

> ⚠️ **`FrequentlyBoughtTogether.tsx:123-132` ("Add bundle") still writes variant-less cart lines** for every selected product, with no `variant` and no `maxQty`. This is a live instance of P0-001 on every product page, even in the current code.

---

## 2. Release gate (Definition of Done for the whole plan)

Production may be re-audited only when **all** of the following are true on the deployed URL:

1. `GET /api/payments/setup-status` → `{"ready": true}` and a test-mode card order completes end to end (Stripe Checkout → webhook → order `paid` → confirmation email → visible in `/user/orders`).
2. No code path can add a cart line the pricing service will refuse (card quick-add, FBT bundle, PDP, "buy again", recommendations).
3. Cart and checkout **fail closed**: any blocking quote warning disables checkout/payment, names the affected lines, and no displayed total excludes a displayed line.
4. Wishlist add works from the PDP and from product cards, with feedback.
5. "Add address" opens its form on the first click and brings it into view.
6. No customer-facing message contains an env-var name, file path or operator instruction (EN + AR).
7. `robots.txt` and `sitemap.xml` use the production origin.
8. CI green: `lint → typecheck → test → build`.

---

## 3. Phase 0 — Baseline, configuration and deploy parity

**Owner:** DevOps / lead dev · **Effort:** S · **Blocks:** everything else

### 0.1 Deploy parity check
- Record the commit SHA currently deployed on Vercel (website) and Render (API), then compare it with `main`.
- Commit or stash the current uncommitted work. Deploy `main` to **staging** first.
- Re-run the 6 "already fixed" rows in §1 on staging and mark each **confirmed fixed** or **still failing**. This decides the real scope of Phase 1.

### 0.2 P0-003 — Payments not configured *(configuration, not code)*
- **Root cause:** `STRIPE_SECRET_KEY` is missing from the production API environment. `payment.controller.js:48` reports `ready: false`.
- **Change (Render API env):**
  - `STRIPE_SECRET_KEY` (test key on staging, live key on production)
  - `STRIPE_WEBHOOK_SECRET`. This is **mandatory**: `apps/api/config/env.js:64-66` rejects a secret key without it, because payments would never be confirmed.
  - In the Stripe dashboard, register the webhook endpoint `POST {API_ORIGIN}/api/webhooks/stripe` (raw body, mounted in `app.js`) for the checkout-completed events the controller handles.
  - Check that `FRONTEND_URL` / success and cancel URLs point to the production storefront origin.
- **Monitoring:** add an uptime check on `GET /api/payments/setup-status` that alerts when `ready !== true`.
- **Acceptance:** a test card order goes through Stripe, the webhook marks it paid, the paid side-effects run (sales count, confirmation email), and the order appears in `/user/orders`.
- **Product decision needed:** the audit notes there is no fallback payment method (e.g. cash on delivery). That is a business decision, **not** part of this plan.

### 0.3 P3-006 — `localhost` in robots.txt / sitemap.xml *(configuration + guard)*
- **Root cause:** `apps/website/src/lib/site.ts:6-12`: `getSiteUrl()` falls back to `http://localhost:3001` when `NEXT_PUBLIC_SITE_URL` / `FRONTEND_URL` are unset in Vercel.
- **Change:**
  1. Set `NEXT_PUBLIC_SITE_URL=https://trendvaulta.vercel.app` (or the final domain) in Vercel Production **and** Preview.
  2. Harden `getSiteUrl()`: when `VERCEL_ENV === 'production'`, fall back to `https://${VERCEL_PROJECT_PRODUCTION_URL}` before `localhost`, and `console.error` once if it would still resolve to localhost.
- **Acceptance:** `/robots.txt` ends with the production sitemap URL, and every `<loc>` in `/sitemap.xml` uses the production origin.

### 0.4 Also in Phase 0
- `NEXT_PUBLIC_API_URL` / `API_INTERNAL_URL` are correct in Vercel, so `next.config.ts` `remotePatterns` includes the API host (`next.config.ts:79`).

**Gate 0:** staging on `main`, payments ready on staging, and the list of "already fixed" findings confirmed.

---

## 4. Phase 1 — Revenue path blockers (P0-001, P0-002, P2-005)

**Effort:** M in total · PRs 1.1–1.4 can run in parallel.

### 1.1 P0-001 (a) — Close every variant-less add-to-cart path
- **Current state:** Product cards are guarded (`ProductCard.tsx:51`). **The FBT bundle is not** (`FrequentlyBoughtTogether.tsx:123-132`).
- **Change:**
  - Add one small helper in `apps/website/src/lib/cartStore.ts` (next to `addToCart`), e.g. `resolveDefaultVariant(product)`:
    - no variants → `undefined` (plain line)
    - exactly **one** in-stock variant → that variant (`{ size, color, colorCode }`, as the PDP writes it)
    - more than one → `null`, meaning "the shopper must choose"
  - `ProductCard`: products with a single variant may use direct add with the resolved variant (better UX). Products with several variants keep "Choose options".
  - `FrequentlyBoughtTogether`: for items that resolve to `null`, either (preferred) exclude them from "Add bundle" and show a "Choose options" link per item, or disable "Add bundle" with an explanation. Always pass `maxQty` (variant or product stock).
  - Search the website for every other `addToCart(` call and apply the same rule (e.g. order "buy again", recommendations).
- **Pre-check:** confirm the `/api/products` list and `/api/recommendations` responses include `variants` (and variant stock). If a projection drops `variants`, `needsVariant` is silently `false` and the bug comes back. The allowed-fields list is in `apps/api/controllers/product.controller.js:210`.
- **Acceptance:** from `/products`, `/c/*`, `/`, the PDP FBT block and recommendation rails, no action creates a line that the quote returns as `variant_required`. The TC-030 re-test passes.

### 1.2 P0-001 (b) — Make existing broken carts recoverable in place
- **Current state:** the cart shows a notice and a link to the PDP, but the bad line stays and still shows a line total (`cart/page.tsx:301-303`, `item.price * item.qty`).
- **Change:**
  - In `cart/page.tsx`, for a line with `variant_required`, render an **inline variant picker** (select/chips using the existing UI primitives) that loads the product through the existing `productsApi` / product query hook.
  - On pick, **replace** the line: add a `replaceCartLine(oldKey, nextItem)` in `cartStore.ts` that removes and adds atomically in one `persist()`, so the UI never flashes empty. Keep the qty, cap it to the variant stock, and use the variant price.
  - Keep the "Choose options" link as a fallback while the product is loading or fails to load.
- **Acceptance:** a cart holding the audit's 9 legacy lines can be fully repaired without leaving `/cart`, and the summary then equals the sum of the lines.

### 1.3 P0-002 + P0-001 (c) — Fail closed on any blocking quote warning
- **Current state:** checkout blocks only `variant_required` (`checkout/page.tsx:246`). `unavailable` and `insufficient_stock` (when available = 0) are not blocking. The cart's "Checkout" button is never gated (`cart/page.tsx:348-354`).
- **Change:**
  - In `hooks/cart/cartQuoteQuery.ts`, export one source of truth, e.g. `isBlockingNotice(n)` → `variant_required`, `unavailable`, or `insufficient_stock` with `available === 0`. Add a derived `blockingKeys` / `hasBlocking` to the `useCartQuoteSync` return value.
  - **Cart page:**
    - For a blocking line, replace the line total with a "Not priced — action needed" state (line-through or muted), so no displayed number is missing from the summary.
    - Above the summary, show an `role="alert"` block: "N items need attention", with anchors to the lines.
    - Disable "Checkout" while `hasBlocking` or while the quote is still loading.
  - **Checkout page:**
    - Gate `Pay now` on `hasBlocking` (not only `variant_required`), on `quote` being present and not stale (`isFetching` false after an items change), and on setup-status being ready (see 1.4).
    - Guard `runCheckout` too, not only the button: if `hasBlocking`, return early with a toast. Implicit form submission and the confirm dialog must not bypass the gate.
    - In the order summary list, mark blocking lines exactly like the cart.
    - The confirm dialog total must come from `quote.totalPrice` only.
- **Acceptance:** TC-031, TC-040 and TC-041 pass. With 10 bad lines plus 1 good line, "Pay now" is disabled, the bad lines are named, and no screen shows $42.00 next to $2,122 of listed goods.

### 1.4 P2-005 — Customer-safe payment error + pre-emptive setup check
- **Current state:** the `checkoutPage.toast.paymentNotConfigured` copy (EN and AR, `messages/*.json:261`) names `STRIPE_SECRET_KEY`. The API also returns `detail: 'Missing STRIPE_SECRET_KEY in backend/.env.'` (`payment.controller.js:116`). Search `order.controller.js` for the same pattern.
- **Change:**
  - Copy (EN/AR): "Card payments are temporarily unavailable. Please try again later." / «الدفع بالبطاقة غير متاح مؤقتاً. يرجى المحاولة لاحقاً.»
  - API: drop `detail` from the JSON response (or send it only when `NODE_ENV !== 'production'`), and log it server-side with the `requestId`.
  - Checkout: query `paymentsApi.getSetupStatus()` **on mount** (React Query, `staleTime` ≈ 60 s). When it is not ready and `allowCheckoutWithoutStripe` is off, show an inline notice and disable "Pay now" before the shopper fills the form, instead of failing after "Continue to payment".
- **Acceptance:** no customer-visible string in `messages/*.json` or in any API response contains `STRIPE_`, `.env` or "restart". TC-044 passes.

**Gate 1:** on staging, the full purchase journey (quick-add → cart → checkout → Stripe test → paid order) passes, plus the negative cases (bad lines, unavailable product, Stripe off).

---

## 5. Phase 1b — P1 features dead in the UI (P1-001, P1-002)

**Effort:** S–M · Can run *parallel* to Phase 1.

### 1b.1 P1-001 — Wishlist heart does nothing (and P3-002 N+1)
- **Current state:** `WishlistButton.tsx` *is* wired to `POST /wishlist/:productId` through `useAddToWishlistMutation` → `wishlistApi.addToWishlist` (`lib/api.ts:567`), and the route exists (`apps/api/routes/wishlist.js:13`).
- **Most likely root cause:** the button is `disabled={isPending || checkLoading}` and `handleClick` returns early when `checkLoading` (`WishlistButton.tsx:53`, `:81`). The per-card `GET /wishlist/check/:id` queries hit the 401 burst described in P3-003, then `retry: 1` plus the refresh keeps them pending. Clicks on a disabled button are swallowed with no request and no toast, which is exactly what the audit observed. **Confirm by reproducing with an expired access token before fixing.**
- **Change (this fixes P1-001 and P3-002 together):**
  - Derive `isWishlisted` from **one** `useMyWishlist()` query (already exists, `GET /wishlist/my`). Build a `Set` of product ids with `select`, and drop the per-card `useCheckWishlist` call. That is 1 request per page instead of 12.
  - Update the optimistic handlers in `useAdd/RemoveFromWishlistMutation` to patch the `WISHLIST_MY_KEY` cache (add or remove the id), with rollback on error. Keep `useCheckWishlist` only if something else still uses it.
  - Never disable the heart just because the wishlist status is loading. Disable only while the mutation is pending, and show a subtle pending state.
  - Keep the 401 → toast + `/auth/login` path, and pass `?next=` back to the current page if the login page supports it.
- **Acceptance:** from the PDP and from a card, a click sends one `POST`, the heart fills, a success toast appears, `/user/wishlist` lists the item, and a listing page makes **no** `/wishlist/check` calls. TC-048, TC-049 and TC-074 pass.

### 1b.2 P1-002 — "Add address" needs two clicks
- **Current state:** the button sets `showCreateForm` (`addresses/page.tsx:137-147`). The form renders at the **bottom** of the page (`:363`) with no scroll or focus.
- **Root cause:** not yet confirmed from code. Reproduce first. Candidates: (1) the "dim" is an overlay or transition from `UserShell` or a parent `motion` wrapper that swallows the first click; (2) the button unmounts on click (`!showCreateForm` condition) while an enter animation is running.
- **Change:**
  - Open the form on the first click. Keep the button mounted and toggle `aria-expanded` / `aria-controls` instead of unmounting it.
  - On open, `scrollIntoView({ behavior: 'smooth', block: 'start' })` the form and focus its first field (ref + `useEffect`), respecting `prefers-reduced-motion`.
  - Also verify the edit flow: the bottom form renders when `editingId` is set but always submits `onSubmitCreate` (`:363`, `:369`). Make sure editing cannot create a duplicate address.
- **Acceptance:** one click shows the form in view with focus in the first field, there is no dimmed state, and editing updates rather than creates. TC-053 passes.

### 1b.3 P2-003 — Address delete confirmation (small, same PR as 1b.2)
- Replace native `window.confirm` (`addresses/page.tsx:78`) with the app's `useConfirm` dialog (`variant: 'danger'`, naming the address label and city), matching the cart page (`cart/page.tsx:249-261`). Native dialogs are unstyled, not translated with the app, and auto-accepted by many automation tools, which is probably why the audit saw none.
- **Acceptance:** TC-057 passes. Delete is `disabled` while pending (already true).

**Gate 1b:** wishlist and address book flows pass on staging, EN + AR.

---

## 6. Phase 2 — P2 hardening

### 2.1 P2-001 / P2-002 / P3-007 — Catalogue imagery *(content + config)* — M
- **Root cause:** seed data points at third-party Unsplash / Wikimedia URLs (seed data in `apps/api/seeder.js` / `apps/api/data`). `upload.wikimedia.org` is not in `next.config.ts` `remotePatterns` → the image optimiser returns 400. One Unsplash asset was deleted upstream → 404.
- **Change:**
  1. **Content:** upload real product and brand images to owned storage (Cloudinary is already allowed in `remotePatterns`) using the dashboard's existing upload flow. Replace the mismatched photos (e.g. the Gucci Bloom product showing a Chanel bottle). **Do not** add `upload.wikimedia.org` to `remotePatterns`; self-host approved brand assets to avoid hotlinking and trademark exposure.
  2. **Resilience:** add an `onError` fallback (neutral placeholder plus the `Package` icon, same pattern as `cart/page.tsx:193-207`) to `ProductCard`, the PDP gallery and brand logos. For brand logos, fall back to the brand initials.
  3. **Guard (recommended):** a small API script (`node apps/api/scripts/check-media.js`) that `HEAD`s every product cover and brand logo and exits non-zero on failure. Run it manually before each release. Add it to CI only if you approve.
- **Acceptance:** 0 broken images on `/`, `/products`, `/brands`, and on all 24 PDPs.

### 2.2 P2-004 — React hydration error #418 — M
- **Change:**
  1. Run the site locally in dev (`npm run dev:website`) with both locales and a signed-in session, and read the **unminified** mismatch message for each page.
  2. Likely remaining sources: `formatPrice` / `Intl` differences between server and client (locale or currency resolved differently), `Date.now()` or relative times in render, `localStorage` cart reads during the first render (the cart count badge), and `Math.random` ids.
  3. Fix by making the value deterministic (same locale/currency on server and client) or by rendering it after mount with the existing `useSyncExternalStore` pattern (`useHasAuthToken.ts`). Do not blanket-apply `suppressHydrationWarning`.
- **Acceptance:** the production console shows 0 × error #418 across `/`, `/products`, a PDP, `/cart`, `/checkout` and `/user/*`, in AR and EN, signed in and signed out.

### 2.3 P2-006 — Access token in a JS-readable cookie — L *(separate epic)*
- **Context:** `AGENTS.md` records this as a deliberate follow-up. The refresh token is already httpOnly (`tv_refresh`, set by the Next BFF in `apps/website/src/app/api/auth/*`).
- **Target design:** keep the access token **in memory only** (module variable in `lib/api.ts`). On boot, get a fresh access token from the BFF refresh route using the httpOnly cookie. Server-side route guards in `src/proxy.ts` use an httpOnly session signal instead of `js-cookie`. Remove the `userRole` cookie; the UI gets the role from `/auth/profile`.
- **Plan it as its own design-doc + PR series:** (a) BFF bootstrap endpoint, (b) client token store, (c) proxy guard migration, (d) remove `token` / `userRole` cookies plus a one-time cleanup, (e) the dashboard is unaffected unless it shares the cookie.
- **Not a release blocker** per the audit (P2, mitigated by CSP and correct escaping), but schedule it with a date.

### 2.4 P2-007 — RSC prefetch 503 burst *(needs verification)* — S
- Check Vercel function logs around 2026-09-30 14:35 (Asia/Damascus). Add a synthetic monitor on 2–3 `?_rsc` routes. Close as "not reproducible" if nothing appears in 7 days. No code change until there is evidence.

**Gate 2:** 0 broken images, 0 hydration errors, P2-006 design doc approved and dated.

---

## 7. Phase 3 — P3 / P4 polish (one or two small PRs each)

| ID | Change | Files | Effort |
|---|---|---|---|
| **P3-001** | Load the PDP hero image eagerly. **Next 16:** check `node_modules/next/dist/docs` first, because `priority` may be deprecated in favour of `preload` / `loading="eager"` + `fetchPriority="high"`. Add correct `sizes`. Keep lazy loading below the fold. | `app/products/[id]/ProductDetailClient.tsx:223` | S |
| **P3-003** | Proactive refresh: in the request interceptor, decode the JWT `exp`. If it expires in under 60 s, `await refreshAccessToken()` (already single-flight) **before** sending. Mostly obsolete after P2-006. | `lib/api.ts:49`, `:105-128` | S |
| **P3-004** | Footer social links: render them only when `NEXT_PUBLIC_SOCIAL_*` URLs are configured. Otherwise hide the icons. | `components/layout/Footer.tsx:125-146` | S |
| **P3-005** | Carousel dots: make each `<button>` at least 24×24 (e.g. `h-6 min-w-6 grid place-items-center`) and move the visual 8 px dot into an inner `<span>`. | `components/home/HeroPromoCarousel.tsx:181-195` | S |
| **P3-008** | PDP headline price: when variants have different prices and none is selected, show "From {min}" (new i18n key `product.priceFrom`, EN + AR). After selection, show the variant price (already `unitPrice`, `:122`). | `ProductDetailClient.tsx:122`, `:341`, `messages/*.json` | S |
| **P4-001** | Show the results counter when `q` is set, from the same `meta.total` as the category branch. | products listing page / its grid component | S |
| **P4-002** | `/user/settings` and `/user/notifications` are captured by the legacy `/user/:name` redirect regex. Add `settings` and `notifications` to the exclusion list, then redirect `/user/settings` → `/user/profile` explicitly and let `/user/notifications` 404. | `next.config.ts:92-104` | S |
| **P4-003** | Per-route titles for account pages ("My orders · TrendVaulta", etc.). The pages are client components, so export `metadata` from a small per-segment `layout.tsx` (or a server wrapper), with localised titles if the server i18n helper exists. | `app/user/*/layout.tsx` (new, tiny) | S |
| **P4-004** | Arabic catalogue search. See §8. | API + dashboard + website | L |

---

## 8. Phase 4 — Arabic catalogue content (P4-004) — L, separate track

The audit rates this P4, but for an **Arabic-first, Saudi-region** store it is a product priority. Plan it as its own feature:

1. **Model:** add optional `titleAr`, `descriptionAr` (or an `i18n: { ar: { title, description } }` sub-document) to the product and brand schemas, with matching Joi validators for create/update.
2. **Search:** extend the `q` filter in `product.controller.js` to `$or` across the English and Arabic fields. Consider a MongoDB text index with the right language settings. Normalise Arabic input (strip diacritics/tatweel; unify `أإآ→ا`, `ة/ه`, `ى/ي`).
3. **Dashboard:** add the Arabic fields to the product and brand forms.
4. **Storefront:** display the localised title and description when `locale === 'ar'`, falling back to English.
5. **Content:** translate the 24 products and the brands.

---

## 9. Phase 5 — Close the audit's coverage gaps

The audit could not test these, so they must not be assumed sound:

| Gap | Action |
|---|---|
| **Mobile / tablet** (375 / 414 / 768 px) | Real-device pass (iOS Safari + Android Chrome): nav drawer, product grid, cart, checkout form, account sidebar, carousel touch, RTL on mobile. |
| **Auth flows** | On staging with disposable accounts: register, login (valid, invalid, lockout), logout, forgot/reset password (email token), session expiry and refresh. |
| **Order lifecycle** | After Phase 0: order detail, cancel (`/api/orders/:id/cancel`), return (`/api/orders/:id/return`), review submission after delivery. |
| **IDOR with 2 accounts** | Account A tries B's real order, address, review and wishlist ids → expect 404/403. |
| **Cross-browser** | Firefox, Safari (desktop). |
| **Colour contrast** | Automated axe/Lighthouse run on key pages, EN + AR. |
| **Network failure** | DevTools offline/slow-3G on cart, checkout and wishlist: no raw errors, retry paths work. |

---

## 10. PR sequence and suggested commits

| # | Branch / PR | Covers | Phase | Effort |
|---|---|---|---|---|
| 0 | *(ops, no PR)* Stripe env + webhook, `NEXT_PUBLIC_SITE_URL`, monitors | P0-003, P3-006 | 0 | S |
| 1 | `fix/site-url-fallback` | P3-006 guard | 0 | S |
| 2 | `fix/cart-variant-guards` | P0-001 (a), including FBT | 1 | M |
| 3 | `fix/cart-fail-closed` | P0-002, P0-001 (c) | 1 | M |
| 4 | `feat/cart-inline-variant-picker` | P0-001 (b) | 1 | M |
| 5 | `fix/payment-error-copy` | P2-005 (+ pre-emptive setup check) | 1 | S |
| 6 | `fix/wishlist-single-source` | P1-001, P3-002 | 1b | S–M |
| 7 | `fix/address-form-open` | P1-002, P2-003 | 1b | S |
| 8 | `fix/hydration-418` | P2-004 | 2 | M |
| 9 | `fix/image-fallbacks` + content upload | P2-001, P2-002, P3-007 | 2 | M |
| 10 | `fix/storefront-polish` | P3-001, P3-004, P3-005, P3-008 | 3 | S |
| 11 | `fix/account-routes-meta` | P4-001, P4-002, P4-003 | 3 | S |
| 12 | `feat/auth-memory-token` (epic) | P2-006, P3-003 | 2 | L |
| 13 | `feat/catalog-arabic` (epic) | P4-004 | 4 | L |

Suggested commit messages (one per PR):

```bash
git commit -m "fix(storefront): derive site URL from production env in robots and sitemap"
git commit -m "fix(storefront): prevent variant-less cart lines from bundle and quick-add"
git commit -m "fix(storefront): block cart and checkout on any blocking quote warning"
git commit -m "feat(storefront): let shoppers pick a missing variant inside the cart"
git commit -m "fix(payments): show customer-safe copy when card payment is unavailable"
git commit -m "fix(storefront): drive wishlist hearts from a single wishlist query"
git commit -m "fix(storefront): open add-address form on first click and confirm deletes"
git commit -m "fix(storefront): resolve hydration mismatch across locales"
git commit -m "fix(storefront): add image fallbacks for product covers and brand logos"
git commit -m "fix(storefront): eager PDP hero, from-price, carousel targets and footer links"
git commit -m "fix(storefront): account page titles, search counter and legacy redirects"
```

Validation per PR (run manually):

```bash
cd apps/website ; npx tsc --noEmit ; npm run lint ; npm run build
cd apps/api ; npm test
```

---

## 11. Regression tests (recommended; add only once approved)

Put these where tests already exist (`apps/website/src/lib/cartStore.test.ts`, `apps/api/tests/`):

- `cartStore`: `resolveDefaultVariant` (0 / 1 / many variants, out-of-stock variant), and `replaceCartLine` keeps qty, caps to stock, and writes to storage once.
- `cartQuoteQuery`: `isBlockingNotice` covers `variant_required`, `unavailable`, and `insufficient_stock` with available 0 (and not with available > 0).
- API: `POST /api/payments/checkout-session` without a Stripe key → 503 with no `detail` in production mode. `GET /api/payments/setup-status` reflects the env.

---

## 12. Re-test checklist (maps to the audit's test IDs)

| Area | Audit TCs to re-run | Expected after this plan |
|---|---|---|
| Quick-add / bundle / cart pricing | TC-030, TC-031, TC-033 | PASS |
| Checkout integrity | TC-040, TC-041, TC-042 | PASS |
| Order placement | TC-043, TC-047, TC-085 | PASS (test mode) |
| Payment copy | TC-044 | PASS |
| Wishlist | TC-048, TC-049, TC-074 | PASS |
| Addresses | TC-053, TC-057 | PASS |
| Images | TC-027, TC-028, TC-029 | PASS after content upload |
| PDP | TC-025, TC-026 | PASS |
| SEO | TC-007, TC-008, TC-077 | PASS |
| Runtime | TC-072 | PASS (0 × #418) |
| A11y | TC-071 | PASS |
| Session | TC-062, TC-063 | PASS after the P2-006 epic |
| Search | TC-015, TC-018 | TC-018 PASS; TC-015 after Phase 4 |
| Previously NOT TESTED | TC-079–TC-083, TC-088, TC-089 | Covered by Phase 5 |

The audit states that after items 1–6 of its §28 (Phases 0, 1 and 1b here), a **focused re-test** of purchase, wishlist and address book, plus the mobile and auth passes, is enough to revisit the verdict. A full re-audit is not needed.

---

## 13. Risks and open decisions

| Risk / decision | Mitigation / owner |
|---|---|
| Production stays behind `main` after fixes | Phase 0.1 parity check on every release; show the commit SHA in `/api/trendvaulta` or a response header. |
| Live Stripe keys enabled before P0-002 is fixed → under-charged orders | **Hard rule:** production gets live keys only after PR 3 (`fix/cart-fail-closed`) is deployed. Staging uses test keys first. |
| Legacy carts in shoppers' `localStorage` | Covered by the inline picker (PR 4) and the fail-closed gate (PR 3); no storage migration needed. |
| Fallback payment method (COD) | Business decision. Not in scope. |
| Brand logo licensing | Use only brand assets you are licensed to use; self-host them. |
| Scope creep during fixes | One PR per row in §10. No drive-by refactors (AGENTS.md). |
