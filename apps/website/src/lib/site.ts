export const SITE_NAME = 'TrendVaulta';
export const SITE_DESCRIPTION =
  'Discover premium beauty products, fashion items, and accessories from world-renowned brands. Shop with confidence at TrendVaulta.';

/** Canonical public origin (no trailing slash). */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.FRONTEND_URL ||
    'http://localhost:3001';
  return raw.replace(/\/+$/, '');
}

/**
 * Server-side API origin for metadata/sitemap fetches: no trailing slash and
 * no `/api` suffix, since callers append `/api/...`. The env value may be set
 * either way (`.env` omits `/api`, CI includes it).
 */
export function getServerApiBase(): string {
  const raw =
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3000';
  return raw.replace(/\/+$/, '').replace(/\/api$/, '');
}
