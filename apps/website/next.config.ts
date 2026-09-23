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
  // The old /orders pages duplicated the account area in English only; the
  // account pages are the translated, maintained ones. Kept as redirects so
  // links in past emails and bookmarks still land somewhere useful.
  async redirects() {
    return [
      { source: '/orders', destination: '/account/orders', permanent: true },
      { source: '/orders/:id', destination: '/account/orders/:id', permanent: true },
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
