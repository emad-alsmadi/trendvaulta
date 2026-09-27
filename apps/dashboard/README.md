# TrendVaulta Dashboard (`apps/dashboard`)

Admin app for staff: catalog, orders and returns, customers, coupons and offers,
reviews and Q&A, storefront content, analytics and store settings. Vite +
React 19 + TypeScript, React Router, TanStack Query, Tailwind CSS, Recharts.

Runs on port **3002** and talks to the Express API in `apps/api`.

## Run

Install once from the repo root (npm workspaces). Then, in this folder:

```bash
npm run dev            # vite on :3002, proxies /api → http://localhost:3000
npm run build          # tsc && vite build → dist/
npm run preview        # serve the production build
npm run lint           # eslint, zero warnings allowed
npm test               # jest
```

From the repo root: `npm run dev:dashboard`, `npm run build:dashboard`.

Sign in with an **admin** or **moderator** account. Other roles are refused at
login. To get a local admin, run the API seeder with `SEED_ADMIN_EMAIL` and
`SEED_ADMIN_PASSWORD` set (see [`docs/PROJECT_REFERENCE.md`](../../docs/PROJECT_REFERENCE.md)).

## Environment

Copy `.env.example` to `.env`:

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | API base **including** `/api`, e.g. `https://api.example.com/api`. Leave empty in development to use the Vite proxy. Compiled in at build time. |

## Screens

| Route | Screen | Needs |
|---|---|---|
| `/` | Overview (KPIs) | any staff |
| `/analytics` | Revenue, orders, top products and brands | `orders:read` |
| `/orders`, `/orders/:id` | Order list (server-side filter/sort/paging), detail, status, tracking, refunds, returns | `orders:read` / `orders:write` |
| `/low-stock` | Products and variants under the stock threshold | `products:read` |
| `/products` | Product form with variants, gallery, shipping data | `products:*` |
| `/brands`, `/categories` | Brands; categories and subcategories | `brands:*`, `products:*` |
| `/users` | Customers: search, roles, disable, notes, order history | `users:*` |
| `/coupons`, `/offers` | Promotions | `coupons:*`, `offers:*` |
| `/reviews`, `/product-qa` | Moderate reviews (with public replies) and Q&A | `reviews:*`, `content:*` |
| `/content`, `/help-topics`, `/storefront-modules`, `/lookbooks`, `/testimonials`, `/bundles`, `/gift-finder-config` | Storefront CMS | `content:*` |
| `/settings` | Account and theme; store settings (tax rate, shipping) are admin-only | any staff |

`src/lib/permissions.ts` mirrors `apps/api/middlewares/rolePermissions.js`, but
only to hide controls a role can't use. The API re-checks every request, so
always change permissions in the API first and then mirror them here.

## Folder layout (`src/`)

```
src/
├── App.tsx          # routes; everything except /login sits behind the auth guard
├── layouts/         # DashboardLayout: sidebar nav (each item hidden without its read permission), header
├── pages/           # one file per screen (table above)
├── components/      # ui/ primitives, products/ (VariantsEditor, GalleryField), orders/ (ReturnPanel)
├── hooks/           # useAdmin*.ts React Query hooks per resource; useTableQuery for URL-synced tables
└── lib/             # api.ts (axios + token refresh), auth.ts (session), permissions.ts, variants.ts
```

## Conventions

- **API paths:** look them up in `apps/api/routes/`, never guess. Clients live in
  `lib/api.ts`, and each resource has a hook in `hooks/`.
- **Tables:** list pages use `useTableQuery` (page, sort and search kept in the
  URL) with `keepPreviousData`, so rows stay on screen while the next page loads.
- **Errors:** show `errorMessage(err, fallback)` from `lib/api.ts`. It keeps the API's `message` and falls back otherwise; never render a raw error object.
- **Auth:** the access token is refreshed once on a `401` (concurrent requests
  share one refresh). A failed refresh signs the user out.

## Deploy

`vercel.json` builds a static SPA (`dist/`) and rewrites every path to
`index.html` so deep links work. Set `VITE_API_URL`, and add the dashboard's
origin to the API's `DASHBOARD_URL` for CORS. Full steps are in
[`docs/PROJECT_REFERENCE.md`](../../docs/PROJECT_REFERENCE.md).
