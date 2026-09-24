import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
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
