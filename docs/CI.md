# Continuous Integration

Workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

## Triggers
- Pull requests targeting `main` / `master`
- Pushes to `main` / `master`

## Jobs

| Job | Steps |
|-----|--------|
| **API** | root `npm ci` → `npm test` in `apps/api` |
| **Website** | root `npm ci` → lint → `tsc --noEmit` → vitest → `next build` |
| **Dashboard** | root `npm ci` → `packages/types` + `packages/api-client` typecheck → lint → jest → `tsc && vite build` |
| **Dependency audit** | root `npm ci` → `npm audit --audit-level=critical` (fails only on critical advisories) |

## Local equivalents

```bash
npm ci
npm run test --workspace=apps/api
npm run lint --workspace=apps/website -- .
npx --workspace=apps/website tsc --noEmit
npm run build --workspace=apps/website
npm run type-check --workspace=packages/types
npm run lint --workspace=apps/dashboard
npm run test --workspace=apps/dashboard
npm run build --workspace=apps/dashboard
```

## Notes
- Every job installs once from the repo root with `npm ci` against the single root `package-lock.json` (npm workspaces); there are no per-app lockfiles.
- Dependabot (`.github/dependabot.yml`) opens weekly grouped minor/patch PRs for npm and GitHub Actions; majors for `next`, `react`, `react-dom`, `tailwindcss` are ignored.
- `NEXT_PUBLIC_API_URL` is set in CI for the website build only (placeholder).
- Branch naming recommended: `feature/*`, `fix/*`, `refactor/*`, `chore/*` — keep `main` releasable.
- Do not treat CI green alone as production-ready; see `docs/IMPLEMENTATION_PLAN.md` for the remaining phases.
