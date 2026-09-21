# TrendVaulta Storefront (`apps/website`)

Customer-facing storefront for TrendVaulta (beauty / fashion / lifestyle retail). Next.js 16 App Router, React 19, TypeScript, TanStack Query, Zustand, Tailwind CSS.

Runs on port **3001** and talks to the Express API in `apps/api` (port 3000).

## Run

Install once from the repo root (npm workspaces), then:

```bash
npm run dev            # next dev -p 3001
npm run build          # next build
npm run start          # next start (serves the production build)
npm run lint           # eslint
npm test               # vitest run
npm run test:watch     # vitest
```

From the repo root: `npm run dev:website`, `npm run build:website`, `npm run typecheck:website`.

## Environment

Copy `.env.example` to `.env.local`:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | API origin (e.g. `http://localhost:3000`). `next.config.ts` rewrites `/api/*` to `${NEXT_PUBLIC_API_URL}/api/*`. |
| `NEXT_PUBLIC_DASHBOARD_URL` | Admin dashboard origin the storefront links out to. |
| `NEXT_PUBLIC_ALLOW_CHECKOUT_WITHOUT_STRIPE` | Dev only: place orders directly when Stripe is not configured. |

## Folder layout (`src/`)

```
src/
├── app/            # App Router routes (products, brands, cart, checkout, orders, auth, user, …)
├── components/     # UI by area: home/ (storefront rails), products/, navigation/, layout/, ui/
├── hooks/          # TanStack Query hooks by domain (products, brands, cart, orders, wishlist, …)
├── lib/            # api.ts (API client), cartStore.ts (Zustand), auth cookies, validation, utils
├── data/           # Demo/fallback storefront content when an API rail is unavailable
├── types/          # TypeScript types
└── proxy.ts        # Route protection for authenticated pages
```

## Conventions

- Server state through React Query hooks in `hooks/`; never call `fetch` from components directly.
- API paths must match `apps/api/routes/` — look them up, do not guess.
- Never surface raw API errors; map them through `lib/userFacingError.ts`.
- Tailwind only; match the existing storefront design system.

## Deploy

`vercel.json` in this folder configures the Vercel build (`framework: nextjs`). Set the `NEXT_PUBLIC_*` variables above in the hosting environment.
