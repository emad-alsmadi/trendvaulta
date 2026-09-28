import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

// CSP without nonces (next/dist/docs/01-app/02-guides/content-security-policy.md).
// 'unsafe-inline' scripts are still allowed (Next's inline bootstrap + JSON-LD);
// moving to nonces via proxy.ts would tighten script-src further. The rest
// already blocks framing, plugins, <base> hijacking, off-site form posts and
// fetches to other origins (the browser only talks to /api via the rewrite).
// img-src allows any https host because CMS image URLs are free text.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: https:${isDev ? ' http:' : ''}`,
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? ' ws: http://localhost:*' : ''}`,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  // Legacy equivalent of frame-ancestors for older browsers (clickjacking).
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  // Ignored by browsers on plain-http localhost, so safe in dev too.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains',
  },
];

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      // Uploaded images when STORAGE_DRIVER=cloudinary. Scoped to this
      // store's own cloud: allowing all of res.cloudinary.com would let the
      // image optimizer be used to fetch any Cloudinary account's files.
      ...(process.env.CLOUDINARY_CLOUD_NAME
        ? [
            {
              protocol: 'https' as const,
              hostname: 'res.cloudinary.com',
              pathname: `/${process.env.CLOUDINARY_CLOUD_NAME}/**`,
            },
          ]
        : []),
      // Allow images from the API (uploads or CDN)
      ...(process.env.NEXT_PUBLIC_API_URL
        ? [
            {
              protocol: new URL(
                process.env.NEXT_PUBLIC_API_URL,
              ).protocol.replace(':', '') as 'http' | 'https',
              hostname: new URL(process.env.NEXT_PUBLIC_API_URL).hostname,
            },
          ]
        : []),
    ],
  },
  // The account area lives under /user (no username in the URL: every page
  // shows the signed-in user). Older URLs — /orders, /account/* and
  // /user/<name>/* — are kept as redirects for emails and bookmarks.
  async redirects() {
    // Section names are excluded so /user/orders etc. are not taken for a
    // legacy /user/<name> URL.
    const legacyName =
      ':name((?!(?:orders|addresses|security|profile|reviews|wishlist)(?:/|$))[^/]+)';
    return [
      { source: '/orders', destination: '/user/orders', permanent: true },
      { source: '/orders/:id', destination: '/user/orders/:id', permanent: true },
      { source: '/account', destination: '/user', permanent: true },
      { source: '/account/:path*', destination: '/user/:path*', permanent: true },
      { source: `/user/${legacyName}`, destination: '/user', permanent: true },
      { source: `/user/${legacyName}/edit`, destination: '/user/profile', permanent: true },
      { source: `/user/${legacyName}/settings`, destination: '/user/profile', permanent: true },
      {
        source: `/user/${legacyName}/:section(orders|reviews|wishlist)`,
        destination: '/user/:section',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
