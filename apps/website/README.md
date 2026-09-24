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
| `NEXT_PUBLIC_API_URL` | API origin without `/api` (e.g. `http://localhost:3000`). `next.config.ts` rewrites `/api/*` to `${NEXT_PUBLIC_API_URL}/api/*`; the browser only ever calls `/api` on its own origin. |
| `API_INTERNAL_URL` | Optional API address for server-side fetches (metadata, sitemap, auth checks). Falls back to `NEXT_PUBLIC_API_URL`. |
| `NEXT_PUBLIC_SITE_URL` | Public storefront origin for canonical URLs, sitemap and Open Graph. |
| `NEXT_PUBLIC_DASHBOARD_URL` | Admin dashboard origin, linked from the account menu for admins. |
| `CLOUDINARY_CLOUD_NAME` | Needed when the API uses Cloudinary; allows `next/image` to load `res.cloudinary.com/<name>/**`. |
| `NEXT_PUBLIC_ALLOW_CHECKOUT_WITHOUT_STRIPE` | Dev only: place orders directly when Stripe is not configured. |

`NEXT_PUBLIC_*` values are compiled in at build time. Rebuild after changing them.

## Folder layout (`src/`)

```
src/
├── app/            # App Router routes (products, c/[category], brands, cart, checkout, user, auth, …)
├── components/     # UI by area: home/ (storefront rails), products/, navigation/, layout/, ui/
├── hooks/          # TanStack Query hooks by domain (products, brands, cart, orders, wishlist, …)
├── lib/            # api.ts (API client), cartStore.ts (Zustand), i18n, categories, auth cookies, validation
├── messages/       # en.json / ar.json translation catalogs
├── data/           # Fallback storefront content when an API rail is unavailable (text fields are message keys)
├── types/          # TypeScript types
└── proxy.ts        # Route protection for authenticated pages
```

## Languages (English / Arabic)

- The locale lives in the `tv_locale` cookie. The root layout reads it, so
  `<html lang dir>` is correct on first paint. There are no `/ar` routes.
- Client components use `const { t, formatPrice, locale } = useTranslation()`.
  Server components use `await getTranslation()` from `lib/i18n-server.ts`.
  Both share `lib/i18n.ts`: dot-path keys, `{name}` placeholders, and English
  fallback for keys missing in Arabic.
- Add every new string to **both** `src/messages/en.json` and `ar.json` with
  the same placeholders. `t()` returns unknown strings unchanged, which is what
  lets API/CMS text flow through it untouched.
- Layout must work in RTL. Use logical classes (`ms-*`, `pe-*`, `start-*`,
  `text-start`, `border-s`), and add `rtl:-scale-x-100` to directional icons.
- Prices are USD only; `formatPrice` formats them for the reader's language
  with Latin digits.
- The account area is `/user/*` (overview, orders, wishlist, reviews,
  addresses, profile, security) with one shared layout, `app/user/UserShell.tsx`.
  Old `/orders`, `/account/*` and `/user/<name>/*` URLs redirect there (`next.config.ts`).

## Conventions

- Server state through React Query hooks in `hooks/`; never call `fetch` from components directly.
- API paths must match `apps/api/routes/` — look them up, do not guess.
- Never surface raw API errors; map them through `lib/userFacingError.ts`.
- Tailwind only; match the existing storefront design system.

## Deploy

`vercel.json` in this folder configures the Vercel build (`framework: nextjs`). Set the variables above in the hosting environment. Full steps are in [`docs/PROJECT_REFERENCE.md`](../../docs/PROJECT_REFERENCE.md).
