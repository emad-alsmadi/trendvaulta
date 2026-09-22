# TrendVaulta — Professional Implementation Prompt
## Execute Remaining Work from FULL_SYSTEM_ANALYSIS.md

---

### Context for the Agent

You are a Senior Full-Stack Engineer (30+ years frontend, 40+ years software engineering). Implement the **remaining unimplemented items** from `/home/user/Desktop/trendvaulta/docs/FULL_SYSTEM_ANALYSIS.md`.

**Current State:** All Critical Blockers (C1–C6), Payment/Inventory/Security fixes (P1–P5, S1–S9), and most Storefront/Dashboard fixes (W1–W8, D1–D10) are **done**. Infrastructure basics (lockfiles, CI, seeders, render.yaml) are **done**.

**Your Mission:** Execute the remaining work in priority order per the Sprint plan (Section 8), starting with **Sprint 3 → 4 → 5 → 6** and the Roadmap Level 1–3 items.

---

### Scope Definition

#### IN SCOPE (Priority Order)

**Phase A — Storefront Completion (Sprint 3 + Roadmap Level 1)**
1. **Server-side filters & sorting** for products (brand, size, color, rating, inStock, onSale) + text index on `title/description/brand`
2. **Real category pages** `/c/[category]` with breadcrumbs — unify categories between Navbar/Footer/Hero and Product enum
3. **Guest cart + `?redirect=`** after login → preserve `order_id` through Stripe flow
4. **Reviews + Q&A + Wishlist** on PDP — wire existing hooks/components (`useProductReviews`, `ReviewForm`, `ReviewList`, `useProductQA`, `WishlistButton`)
5. **Offers page** — connect `useActiveOffers` (replace static demo)
6. **Profile edit + password change** — wire `useUpdateProfile`, create `/profile/edit` page
7. **Recommendations** — fix after C3 is done (already done), wire real API
8. **Gift Finder** — build links from real API IDs, not demo IDs

**Phase B — SEO Foundation (Sprint 4 + Roadmap Level 1 item 4)**
9. **Convert PDP/PLP/Brand to Server Components** with `generateMetadata`, OG, Product JSON-LD
10. **Add `sitemap.ts`, `robots.ts`, `metadataBase`**
11. **Lighthouse SEO ≥ 90**

**Phase C — Real Commerce (Sprint 5 + Roadmap Level 2)**
12. **Real shipping**: methods (standard/express), zones, prices from API → cart/checkout (remove hardcoded $5 / "Digital delivery")
13. **Address book** in account + reuse at checkout
14. **Customer cancellation** (pre-ship) + **Return/RMA** with `refunded` status + Stripe refunds
15. **Image upload** (Multer + Cloudinary/S3) for products/brands from dashboard + `remotePatterns` for CDN + `next/image` everywhere
16. **Tax** (configurable flat rate from settings)
17. **Verified buyer reviews** (require paid order containing product)

**Phase D — Arabic/RTL (Sprint 6 + Roadmap Level 3 item 12)**
18. **Full i18n + RTL** (`next-intl` or equivalent), dynamic `lang`/`dir`, Tailwind logical properties, switchable currency/locale

**Phase E — Dashboard Completion (Post D1–D10 + Roadmap Level 19–25)**
19. **Full Product form**: variants (size/color/stock/price/SKU), multiple images, `isActive`/`featured`, image upload
20. **Order detail page**: items, shipping address, notes, payment IDs, tracking number, refund, `paymentStatus` filter, search by email
21. **Inventory**: low-stock view + sort + quick quantity edit
22. **Server-side sort/pagination** in ALL tables + `placeholderData` to prevent loading flash
23. **Analytics**: revenue/orders over time, top products/brands (use `recharts`)
24. **Category management** (Category model) + Home modules content editor + Review replies + Store settings (shipping/tax)
25. **Customers**: order history per user + disable account (soft delete)

**Phase F — Infrastructure Hardening**
26. **Dependabot** + **e2e tests** (Playwright/Cypress)
27. **Sentry** integration
28. **Update old `docs/*`** (from 2026-08-07) to reflect current reality
29. **API Response Contract Unification** — single shape: `{ message, data?, meta?, errors? }` — remove leaked fields (`roles`, `stripeCustomerId`, `__v`)

#### OUT OF SCOPE
- Re-architecting working systems
- New dependencies without approval
- Changing routing/auth/global state unless required
- Writing tests (unless explicitly asked)

---

### Technical Constraints & Conventions

**API Integration Lookup Order (never guess):**
1. `apps/api/routes/` → 2. `apps/api/controllers/` → 3. `apps/api/models/` → 4. `apps/api/app.js` → 5. Frontend clients (`apps/website/src/lib/api.ts`, `apps/dashboard/src/lib/api.ts`)

**Frontend Standards:**
- Match existing architecture: `lib/api.ts`, domain `hooks/`, `components/`, `components/ui/`
- TanStack Query: keep last good data, button-level mutation progress, skeletons only where existing
- Errors: use `getUserFacingErrorMessage`, toasts — never raw API errors
- Tailwind: match existing design system per app
- Arabic-first where project uses Arabic; code stays English
- No new abstractions unless clearly reducing duplication

**Commit Policy:** After each logical chunk, suggest ONE conventional commit message. Do NOT run git.

**Validation Commands (provide after changes, do NOT run):**
```bash
# API
cd apps/api && npm test
cd apps/api && npx tsc --noEmit 2>&1 || true

# Website
cd apps/website && npx tsc --noEmit
cd apps/website && npm run lint

# Dashboard
cd apps/dashboard && npx tsc --noEmit
cd apps/dashboard && npm run lint

# Root
npm run lint
npm run build
```

---

### Execution Protocol

1. **Start with Phase A, Item 1** (server-side filters + text index) — highest revenue impact / lowest effort
2. **Work in small, focused changes** — one PR-sized item at a time
3. **Before each item:** State scope, files to modify (max ~5), API endpoint, out of scope
4. **After each item:** Provide validation command + suggested commit message
5. **Ask for confirmation** before running any terminal commands
6. **Reference lines** from `FULL_SYSTEM_ANALYSIS.md` when relevant (e.g., "per line 125: filters work client-side on 12 demo products only")

---

### First Task to Begin

**Task A1: Server-side Product Filters & Text Index**

**Scope:** Replace client-side filtering on 12 demo products with server-side API filtering + MongoDB text index.

**Files to Modify (est. 4–5):**
- `apps/api/models/Product.js` — add text index on `title`, `description`, `brand.name`
- `apps/api/controllers/product.controller.js` — extend query parsing for `brand`, `size`, `color`, `rating`, `inStock`, `onSale`, `sort`
- `apps/api/routes/products.js` — ensure new query params accepted
- `apps/website/src/hooks/products/useProducts.ts` — pass filters to API, remove client-side filter logic
- `apps/website/src/app/shop/page.tsx` (or PLP component) — wire filter UI to hook

**API Endpoint:** `GET /api/products` (extend existing)

**Out of Scope:** Faceted counts, price range slider (can follow up), RTL

**Reference:** FULL_SYSTEM_ANALYSIS.md lines 125, 216–217

---

### Deliverable Format After Each Task

```
Changed:
- bullet points

Files:
- changed files only

Validation command:
```bash
cd apps/website && npx tsc --noEmit
```

Suggested commit:
```text
feat(storefront): add server-side product filters with text index
```

Notes:
- blockers only
```

---

**Ready to begin. Confirm you want me to start with Task A1, or specify a different starting point.**