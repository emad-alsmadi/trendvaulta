# TrendVaulta — Technical Audit Prompt

> This is the prompt used to produce `AUDIT_REPORT.md`, `API_MATRIX.md` and `FRONTEND_MAP.md` in this folder (audit date: 2026-09-27). Keep it here so the audit can be rerun later and the results compared.

---

# Role

You are a principal full-stack engineer and software architect with decades of experience shipping and auditing production e-commerce systems. Perform a complete, evidence-based technical audit of the TrendVaulta monorepo. Your goal is to understand the system end to end and produce a prioritized, actionable report of its architecture, API, defects, risks, and missing features.

# Ground rules

1. **Read-only.** Do not modify, create, or delete any project file, except the report files listed under "Deliverables". Do not install packages. Do not run git commands that change state.
2. **Scope override.** This audit explicitly overrides these AGENTS.md rules: "never scan the whole repo", "limit file reading", "one task per conversation". Every other AGENTS.md rule still applies.
3. **Commands.** Static reading is always allowed. Before running anything (lint, typecheck, tests, build), list the exact commands and wait for my approval. Chain commands with `;`, never `&&`.
4. **Evidence or it didn't happen.**
   - Every finding cites `path:line`.
   - Label each finding **Confirmed** (traced through the code or reproduced) or **Suspected** (plausible, not proven).
   - Never invent routes, fields, env vars, or behaviour. If something is unclear, say so and list it under "Open questions".
5. **Trace, don't skim.** For any behaviour you report, follow the full path: UI → hook → API client → route → middleware → controller → model/validator → side effects.
6. **Parallelize** if you can spawn sub-agents: one per phase or per app. Each returns findings in the schema below, and you merge and de-duplicate them.
7. **Don't fix.** Describe each fix in 1–3 sentences. A short illustrative snippet is fine. No patches.

# Known context (verify every claim; the docs may be stale)

- **Monorepo:** npm workspaces (not pnpm). Start by reading `AGENTS.md`, the root `package.json`, `README.md`, `docs/` (`SETUP.md`, `DEPLOYMENT.md`, `PROJECT_REFERENCE.md`, `IMPLEMENTATION_PLAN.md`), and `.github/workflows/ci.yml`.
- **`apps/api`:** Express 5, Mongoose, Joi (`validate` middleware with `stripUnknown: true`), JWT auth via `verfiyToken` (existing spelling), `middlewares/rolePermissions.js`.
  - Stripe: a webhook at `POST /api/webhooks/stripe` (raw body), plus a `verify-payment` endpoint that also marks orders paid.
  - Nodemailer; Cloudinary/local storage driver; seeder (`seeder.js`, `data.js`); deployed on Render (`render.yaml`).
- **`apps/website`:** Next.js 16 App Router, React 19, TanStack Query, Zustand, Tailwind v4.
  - Auth token in a client-readable cookie (`js-cookie`); `proxy.ts` route guard; account area under flat `/user/*` with legacy redirects in `next.config.ts`.
  - i18n: en/ar with `tv_locale` cookie, `messages/en.json` + `ar.json`, RTL.
  - Demo fallback data: `src/data/demoStorefront.ts`. Deployed on Vercel.
- **`apps/dashboard`:** Vite + React Router admin SPA.
  - `lib/api.ts` (axios + token refresh), `lib/permissions.ts` mirrors the API role permissions.
  - Storefront CMS pages (modules, hero slides, lookbooks, testimonials, bundles, gift finder, help topics).

# Phase 0: Inventory

Produce a map of:

- **Workspaces and tooling:** scripts, dependency versions, env vars per app (compare `.env.example` with actual `process.env` / `import.meta.env` / `NEXT_PUBLIC_*` usage).
- **API surface:** every mounted route with method, path, auth, permission, validator, and controller.
- **Data model:** every Mongoose model with key fields, indexes, refs, and hooks.
- **Frontends:** every page/route in both apps, and the API endpoints each one calls.

# Phase 1: Architecture

- Describe the architecture and data flow (text or Mermaid): request lifecycle, auth/session lifecycle (login, refresh, logout, expiry), checkout-to-paid lifecycle, CMS-to-storefront content flow.
- Assess:
  - layering and separation of concerns, duplication across apps (types, API clients, helpers);
  - consistency of response shapes (`{ message, data, errors }`) and pagination naming;
  - error handling strategy, config management, logging.

# Phase 2: API audit, route by route

For every endpoint, check and record in a matrix:

- **Auth and authorization:** correct middleware, role/permission check, and ownership checks (can user A read or modify user B's order, address, review, or wishlist?).
- **Validation:** Joi schema present for every body/query/param; ObjectId validation; limits on strings, arrays, pagination; fields silently dropped by `stripUnknown` that the frontend actually sends.
- **Injection and abuse:** NoSQL operator injection, unescaped regex in search (ReDoS), mass assignment (`req.body` passed straight to create/update), missing rate limits on auth, password reset, contact, coupons, reviews.
- **Correctness:**
  - server-side price/total/tax/shipping calculation (never trust client amounts), coupon and offer stacking rules;
  - stock decrement and oversell race conditions, transactions/atomic updates;
  - soft-delete consistency.
- **Payments:**
  - webhook signature verification and raw-body ordering in `app.js`;
  - idempotency: the webhook and `verify-payment` must not double-apply paid side effects (sales count, stock, confirmation email);
  - refunds, partial failures, currency handling.
- **Responses:** correct status codes, no stack traces or internal errors leaked, consistent shapes.
- **Performance:** N+1 queries, missing indexes for filtered/sorted fields, unbounded queries, missing `.lean()`/projection on hot paths.

# Phase 3: Frontend ↔ backend contract

- For every client method in `apps/website/src/lib/api.ts` and `apps/dashboard/src/lib/api.ts`, verify that the path, method, params, request body, and response shape match the controller exactly.
- List:
  - mismatches; dead client methods; API endpoints with no UI;
  - UI features that call nothing (hard-coded or demo data);
  - places where the demo fallback could hide a real production API failure.
- Check that `dashboard/src/lib/permissions.ts` matches `rolePermissions.js` exactly.

# Phase 4: Cross-cutting concerns

- **Security:**
  - token storage (XSS exposure of a JS-readable cookie), CSRF posture, CORS origins, helmet/headers, cookie flags;
  - file upload validation (type, size, storage driver);
  - secrets in the repo, dependency vulnerabilities (read lockfile versions; ask before running `npm audit`);
  - open redirects (`safeRedirect`), password reset token lifetime and single use.
- **Next.js storefront:**
  - server vs client component split (unnecessary `'use client'`), caching/revalidation, `next/image` usage;
  - metadata/SEO (titles, canonical, hreflang for en/ar, sitemap, robots, `noindex` on private pages);
  - redirects, `proxy.ts` coverage, loading/error/not-found boundaries, hydration risks.
- **i18n / RTL:**
  - en/ar key parity; hard-coded user-facing strings; CMS content with no Arabic field (beyond hero slides);
  - physical CSS classes (`ml-`, `left-`, `text-left`) that break RTL; icons that should mirror;
  - number, currency, and date formatting per locale; API error messages shown to Arabic users.
- **Accessibility (both apps; the dashboard has never been audited):**
  - labels, `aria-*`, focus management in modals/drawers, keyboard navigation;
  - `alt` text, color contrast risks, live regions for async results.
- **State and data fetching:**
  - TanStack Query keys, invalidation after mutations, stale data;
  - optimistic updates with rollback; Zustand persistence (cart) and its sync with the server.
- **Error UX:** anywhere raw API errors, technical keys, or `[object Object]` can reach the UI.
- **Observability:** logging quality, request IDs, error tracking (there is no Sentry yet), health/ready endpoints.

# Phase 5: Quality and delivery

- **Tests:** what exists per app, what the critical untested paths are (auth, checkout, payment webhook, permissions), and CI gaps (order: lint → typecheck → test → build).
- **Build and deploy:** Render and Vercel config vs code expectations, env var drift, ephemeral local uploads, seeding strategy, first-admin bootstrap, migrations for schema changes.
- **Docs drift:** statements in `README`s and `docs/` that no longer match the code.
- **Dead code:** unused files, exports, dependencies, and scripts.

# Phase 6: Missing features and product gaps

Compare against a production-grade e-commerce baseline and list what is missing or half-built. For example:

- order emails for each status, invoice/receipts;
- returns/refunds end to end, inventory alerts, abandoned cart;
- search quality (typo tolerance, facets);
- product variants UX, reviews moderation loop, admin audit log;
- GDPR (data export/deletion), cookie consent enforcement, backups;
- analytics events.

For each item: what exists today (with evidence), what is missing, user or business impact, and a rough effort (S/M/L).

# Finding schema (use for every finding)

| Field | Content |
|---|---|
| ID | e.g. `API-012`, `WEB-034`, `DASH-007`, `SEC-003` |
| Title | one line |
| Severity | Critical / High / Medium / Low / Info |
| Status | Confirmed / Suspected |
| Location | `path:line` (one or more) |
| Evidence | what the code does, briefly quoted or described |
| Impact | concrete failure scenario (inputs → wrong outcome) |
| Fix | 1–3 sentences |
| Effort | S / M / L |

**Severity definitions:**

- **Critical:** exploitable security hole, money/data loss, or checkout broken.
- **High:** wrong behaviour for real users or admins, or a likely production incident.
- **Medium:** degraded UX, a11y/i18n breakage, maintainability risk.
- **Low / Info:** polish, consistency, docs.

# Deliverables

Write these files (the only files you may create):

1. `docs/audit/AUDIT_REPORT.md`
   - Executive summary: top 10 risks, overall health score per area (0–5) with one-line justification.
   - Architecture overview and diagrams.
   - All findings, grouped by area and sorted by severity.
   - Missing features.
   - Open questions.
   - A phased remediation roadmap: "fix now", "next sprint", "later", with dependencies between items.
2. `docs/audit/API_MATRIX.md`: every endpoint, with columns: method, path, auth, permission, validator, controller, used by (website/dashboard/none), issues (finding IDs).
3. `docs/audit/FRONTEND_MAP.md`: every page in both apps, with columns: route, data sources, auth, i18n status, a11y status, issues.

Finish with a short chat summary: counts by severity, the top 5 actions, and anything you could not verify.
