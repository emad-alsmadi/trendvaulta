# TrendVaulta

Retail e-commerce monorepo for beauty, fashion, and lifestyle products. Buyers shop on the Next.js storefront; admins manage catalog and orders in the Vite dashboard; the Express API serves both with MongoDB and Stripe.

| App | Path | Port | Role |
|---|---|---|---|
| API | `apps/api` | **3000** | Express + Mongoose + Stripe |
| Storefront | `apps/website` | **3001** | Next.js 16 App Router |
| Dashboard | `apps/dashboard` | **3002** | Vite + React admin |

Package manager: **npm workspaces** (root `package.json`, `apps/*`). Each app
keeps its own API client and types — there is no shared `packages/` workspace.

---

## Features

- JWT auth (login, register, profile, password reset email)
- Product catalog with brands, filters, badges, and sorting (e.g. bestselling)
- Client cart + Stripe Checkout
- Orders, wishlist, reviews
- Coupons and offers
- Storefront rails (recommendations, bundles, recently viewed, gift finder, lookbooks, trust, testimonials, why-choose-us)
- Admin dashboard for products, brands, orders, users, coupons, offers, reviews, and stats

Catalog domain is **products and brands**.

---

## Tech stack

**Storefront** — Next.js 16, React 19, TypeScript, TanStack Query, Zustand, Tailwind CSS, Framer Motion, Axios

**Dashboard** — Vite, React 19, TypeScript, React Router, TanStack Query, Tailwind CSS

**API** — Node.js 18+, Express 5, Mongoose, Joi, JWT, bcryptjs, Stripe, Nodemailer

---

## Repository layout

```
trendvaulta/
├── apps/
│   ├── api/                 # Express API (default PORT=3000)
│   ├── website/             # Next.js storefront (port 3001)
│   └── dashboard/           # Vite admin (port 3002; proxies /api → :3000)
├── packages/
│   ├── types/
│   └── api-client/
├── docs/                    # Status, audits, backlogs
├── package.json             # npm workspaces + scripts
└── AGENTS.md                # AI agent instructions
```

---

## Getting started

### Prerequisites

- Node.js 18+ and npm 9+
- MongoDB (local or Atlas)
- Stripe keys for checkout (optional for non-payment work)

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

See `apps/api/.env.example` for the full API list. Mail uses `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` (with `EMAIL_USER` / `EMAIL_PASS` / `FROM_EMAIL` fallbacks). Storefront: `NEXT_PUBLIC_API_URL`. Dashboard (optional): `VITE_API_URL`.

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

- API deploys as a Node web service via `apps/api/render.yaml` (Render Blueprint, `rootDir: apps/api`, health check `GET /api/ready`).
- Dashboard deploys as a static Vite SPA via `apps/dashboard/vercel.json`; storefront via `apps/website/vercel.json`.
- Prefer MongoDB Atlas for production data.
- Configure Stripe webhook to `POST /api/webhooks/stripe` with the signing secret.
- Set `FRONTEND_URL`, `DASHBOARD_URL`, and CORS allowlists for production origins.

---

## Docs & agent guidance

| File | Purpose |
|---|---|
| `AGENTS.md` | Instructions for AI agents |
| `.cursor/rules/` | Cursor rules (session, API, frontend) |
| `docs/` | Audits, gap analysis, remediation notes |

---

## License

ISC — see repository license file if present.
