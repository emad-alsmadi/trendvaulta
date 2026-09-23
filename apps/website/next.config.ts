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
      // Allow images from Cloudinary
      ...(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
        ? [
            {
              protocol: 'https',
              hostname: `${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}.cloudinary.com`,
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
