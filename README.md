# TrendVaulta

Retail e-commerce monorepo for beauty, fashion, and lifestyle products. Buyers shop on the Next.js storefront; admins manage catalog and orders in the Vite dashboard; the Express API serves both with MongoDB and Stripe.

| App | Path | Port | Role |
|---|---|---|---|
| API | `apps/api` | **3000** | Express + Mongoose + Stripe |
| Storefront | `apps/website` | **3001** | Next.js 16 App Router |
| Dashboard | `apps/dashboard` | **3002** | Vite + React admin |

Package manager: **npm workspaces** (root `package.json`, `apps/*`). Each app
keeps its own API client and types. `packages/types` exists but no app imports
it yet (plan item I5).

**New here?** Follow [`docs/SETUP.md`](docs/SETUP.md) (local setup) and
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) (production).

---

## Features

- English and Arabic storefront (RTL), USD pricing
- JWT auth with refresh tokens (login, register, profile, password reset email)
- Product catalog with brands, filters, badges, and sorting (e.g. bestselling)
- Client cart + Stripe Checkout, shipping zones, tax
- Orders with cancellation, returns and Stripe refunds; wishlist, reviews with staff replies
- Coupons and offers
- Storefront rails (recommendations, bundles, recently viewed, gift finder, lookbooks, trust, testimonials, why-choose-us)
- Admin dashboard for products (variants, galleries), categories, brands, orders, returns, customers, coupons, offers, reviews, CMS, analytics and settings
- Image uploads to local disk or Cloudinary

Catalog domain is **products and brands**.

---

## Tech stack

**Storefront** — Next.js 16, React 19, TypeScript, TanStack Query, Zustand, Tailwind CSS, Framer Motion, Axios

**Dashboard** — Vite, React 19, TypeScript, React Router, TanStack Query, Tailwind CSS

**API** — Node.js 20.9+, Express 5, Mongoose, Joi, JWT, bcryptjs, Stripe, Nodemailer

---

## Repository layout

```
trendvaulta/
├── apps/
│   ├── api/                 # Express API (default PORT=3000)
│   ├── website/             # Next.js storefront (port 3001)
│   └── dashboard/           # Vite admin (port 3002; proxies /api → :3000)
├── packages/
│   └── types/               # unused so far (plan item I5)
├── docs/                    # Plan, setup/deploy guides, reference docs; docs/archive/ for old audits
├── package.json             # npm workspaces + scripts
└── AGENTS.md                # AI agent instructions
```

---

## Getting started

### Prerequisites

- Node.js 20.9+ and npm 10+
- MongoDB (local or Atlas)
- Stripe keys for checkout (optional for non-payment work)

The step-by-step version, with seeding an admin and Stripe webhooks, is in
[`docs/SETUP.md`](docs/SETUP.md).

### Install

```bash
npm install
```

### Environment

Copy the examples, then fill in secrets locally:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/website/.env.example apps/website/.env.local
cp apps/dashboard/.env.example apps/dashboard/.env
```

Only `MONGO_URL` and `JWT_SECRET_KEY` are required to start the API. Each
`.env.example` documents its variables inline.

### Run locally

All three apps:

```bash
npm run dev
```

Or individually:

```bash
npm run dev:api
npm run dev:website
npm run dev:dashboard
```

| URL | Service |
|---|---|
| http://localhost:3001 | Storefront |
| http://localhost:3002 | Dashboard |
| http://localhost:3000/api | API |

Website rewrites `/api/*` to the API. Dashboard Vite proxies `/api` to `http://localhost:3000`.

### Seed data (optional)

See `apps/api/SEEDER_README.md` and `apps/api/seeder.js`.

---

## Scripts (root)

| Script | Description |
|---|---|
| `npm run dev` | API + website + dashboard |
| `npm run build` | Build workspaces |
| `npm run build:website` | Build storefront |
| `npm run build:dashboard` | Build dashboard |
| `npm run test:api` | API tests |
| `npm run typecheck:website` | Website `tsc --noEmit` |
| `npm run lint` | Lint workspaces |

---

## API overview

Routes live in `apps/api/routes/` and are mounted from `apps/api/app.js`. Do not guess paths — look them up there.

Common areas:

- Auth / profile / password — `/api/auth/*`, `/api/profile`, `/api/password/*`
- Products / brands — `/api/products/*`, `/api/brands/*`
- Orders / payments — `/api/orders/*`, `/api/payments/*`
- Stripe webhook — `POST /api/webhooks/stripe` (raw body)
- Wishlist / reviews / coupons / offers
- Recommendations, bundles, recently viewed, gift finder, lookbooks
- Storefront content — trust, categories, testimonials, why-choose-us
- Admin stats (and related admin routes)
- Ops — `GET /api/trendvaulta` (liveness), `GET /api/ready` (DB readiness)

Typical JSON shape: `{ message, data?, errors? }` (confirm per controller). Auth uses `Authorization: Bearer <token>` via `verfiyToken`.

Storefront client: `apps/website/src/lib/api.ts`  
Dashboard client: `apps/dashboard/src/lib/api.ts`

---

## Auth note

The storefront persists the JWT with client-readable cookies (`js-cookie`). Treat this as the current implementation; hardening (e.g. httpOnly) is a deliberate follow-up, not assumed done.

---

## Deployment

API on Render (`apps/api/render.yaml`), storefront and dashboard on Vercel
(`vercel.json` in each app), MongoDB Atlas, Cloudinary for images, and the
Stripe webhook at `POST /api/webhooks/stripe`. The order, the variables and a
smoke-test checklist are in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## Docs & agent guidance

| File | Purpose |
|---|---|
| `AGENTS.md` | Instructions for AI agents |
| `.cursor/rules/` | Cursor rules (session, API, frontend) |
| `docs/IMPLEMENTATION_PLAN.md` | Current plan and status |
| `docs/SETUP.md`, `docs/DEPLOYMENT.md` | Local setup, production deployment |
| `docs/API_CONTRACT.md`, `BUSINESS_RULES.md`, `DATA_MODEL.md`, `SECURITY_MODEL.md`, `CI.md` | Reference |
| `docs/archive/` | Superseded audits and backlogs (history only) |
| `apps/*/README.md` | Per-app run, env, structure, conventions |

---

## License

ISC — see repository license file if present.
