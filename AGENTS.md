# TrendVaulta — AI Agent Instructions

These instructions apply to every task unless explicitly overridden. If a user request conflicts, ask for clarification.

---

## Project Overview

**Monorepo**: npm workspaces (root `package.json`) — *not pnpm* (ignore `pnpm-workspace.yaml`)

| App | Path | Port | Stack |
|---|---|---|---|
| API | `apps/api` | **3000** | Express 5, Mongoose, Joi, Stripe, Nodemailer |
| Storefront | `apps/website` | **3001** | Next.js 16 App Router, React 19, TanStack Query, Zustand, Tailwind |
| Dashboard | `apps/dashboard` | **3002** | Vite + React Router, React 19, TanStack Query, Tailwind |

**Shared packages**: `@trendvaulta/types`, `@trendvaulta/api-client` (under `packages/`). `@trendvaulta/ui` referenced but not present.

**Domain**: Products & brands catalog (not digital templates).

---

## Key Commands (root)

```bash
npm install                 # install all workspaces
npm run dev                 # runs api + website + dashboard concurrently
npm run dev:api             # API only
npm run dev:website         # Storefront only
npm run dev:dashboard       # Dashboard only
npm run build               # build all workspaces
npm run lint                # lint all workspaces
npm run typecheck:website   # website tsc --noEmit
npm run typecheck:types     # types package tsc --noEmit
npm run test:api            # API tests (node --test)
```

CI order: **lint → typecheck → test → build** (see `.github/workflows/ci.yml`).

---

## Terminal Policy

**Default: Do not run terminal commands** (npm, npx, tsc, eslint, git, etc.) unless explicitly requested.

After code changes: provide a short **manual** validation command only. Do not execute it.

Examples:
```bash
cd apps/website && npx tsc --noEmit
cd apps/dashboard && npx tsc --noEmit
cd apps/api && npm test
```

If validation required: ask "Should I run the validation, or will you run it manually?"

---

## Commit Message Policy

After completed work: suggest **one** conventional English commit message. Do not run git.

```
Suggested commit:
fix(scope): short description
```

Examples:
- `feat(storefront): wire featured brands to brands API`
- `fix(api): send order confirmation email on paid`
- `refactor(dashboard): align reviews page with admin reviews API`

---

## API Integration — Lookup Workflow

**Never guess paths** — look them up in this order:

1. `apps/api/routes/` — Express route definitions + middleware
2. Matching `apps/api/controllers/` — business logic, response contracts
3. `apps/api/models/` — Mongoose schemas + Joi validators (when creating/updating)
4. `apps/api/app.js` — route mounts, Stripe webhook (`POST /api/webhooks/stripe`, raw body), CORS
5. Frontend clients/hooks: `apps/website/src/lib/api.ts`, `apps/dashboard/src/lib/api.ts`, `@trendvaulta/api-client`

### API Patterns

- Auth: JWT via `verfiyToken` (existing spelling)
- Common response: `{ message, data?, errors? }` — confirm per controller
- Pagination: check controller for `page` / `limit` / `total` naming
- Uploads: only if existing Multer pattern exists for that resource

### Integration Checklist

- [ ] Route exists in `routes/` and is mounted in `app.js`
- [ ] Controller auth/permissions match screen (public / user / admin)
- [ ] Request/response shape matches controller
- [ ] Model validation defined for create/update
- [ ] Client method + React Query hook updated
- [ ] Loading/error UX matches surrounding screens

---

## Frontend Engineering Standards

### Core Principles

1. Match existing architecture first (`lib/api.ts`, domain `hooks/`, `components/`, `components/ui/`)
2. Small, focused changes — no unrelated refactors
3. No new dependencies without approval
4. Don't change routing/auth/global state unless required

### Data & Loading (TanStack Query)

- Keep last good data visible during background refresh
- Button-level mutation progress; disable controls while pending
- Skeletons only if area already uses them or requested
- Never show raw API errors or technical keys — use existing helpers (`getUserFacingErrorMessage`, toasts)
- Arabic-first where project already uses Arabic; technical code stays English

### Styling

- Tailwind; match **existing** design system of the app being edited
- Mobile-first; Framer Motion only where already present
- No new brand theme on incidental tasks

---

## Session Discipline

- **One task per conversation** — single PR-sized item unless user lists multiple
- **Never scan the whole repo** — only inspect folders/files required
- **Limit file reading** — prefer sections over whole files
- **No unnecessary exploration** (Task/sub-agents) for simple work
- **Minimize context** — don't reload unchanged files
- **Keep edits localized** — match architecture; avoid drive-by refactors
- **No new abstractions** unless they clearly reduce duplication or requested
- **No tests** unless requested
- **No commit/push** unless user explicitly says so

---

## Scope Discipline

At task start, state briefly:
- Scope
- Files to modify (max ~5 unless necessary)
- API endpoint (if applicable)
- Out of scope

---

## Vague Continuations

For "continue / yes / next / ابدأ / كمل / الخطوة التالية":
- Ask one short clarification, **or**
- Continue only the next unchecked item from **current** task context
- Do not resume an entire backlog document

---

## Response Format

Keep final response short:

```
Changed:
- one or two bullet points

Files:
- changed files only

Validation command:
```bash
cd apps/website && npx tsc --noEmit
```

Suggested commit:
```text
fix(scope): short description
```

Notes:
- blockers only
```

---

## Key Domain Areas (for route lookup)

| Area | Example Routes |
|---|---|
| Auth / profile / password | `/api/auth/*`, `/api/profile`, `/api/password/*` |
| Products / brands | `/api/products/*`, `/api/brands/*` |
| Orders / payments | `/api/orders/*`, `/api/payments/*` |
| Wishlist / reviews | `/api/wishlist/*`, `/api/reviews/*` |
| Coupons / offers | `/api/coupons/*`, `/api/offers/*` |
| Recommendations / bundles | `/api/recommendations/*`, `/api/bundles/*` |
| Recently viewed | `/api/recently-viewed` (confirm in routes) |
| Gift finder / lookbooks | `/api/gift-finder/*`, `/api/lookbooks/*` |
| Storefront content | `/api/trust`, `/api/categories`, `/api/testimonials`, `/api/why-choose-us` |
| Admin stats | `/api/admin/stats/*` |
| Ops | `GET /api/trendvaulta`, `GET /api/ready` |

---

## Known Gotchas

- **Package manager**: npm workspaces — dashboard installs from root lockfile
- **Auth cookie**: Storefront uses `js-cookie` (client-readable); httpOnly hardening is a deliberate follow-up
- **Demo fallback**: Storefront may fall back to `apps/website/src/data/demoStorefront.ts` — prefer live APIs for new rails
- **Admin permissions**: Check `rolePermissions.js` helpers before adding admin CRUD
- **Stripe paid side-effects**: Sales count, confirmation email live in payment/order paid controllers — read before changing checkout