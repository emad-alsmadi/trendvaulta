import type { Metadata } from 'next';
import { BrandDetailClient } from './BrandDetailClient';
import { SITE_NAME, getServerApiBase, getSiteUrl } from '@/lib/site';
import type { Brand } from '@/types';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/brands/:id accepts an ObjectId *or* a slug (see
 * brand.controller.js) and returns the brand document unwrapped — no
 * `data` envelope, unlike the product endpoints. The sitemap emits
 * slug URLs, so both forms must resolve here.
 */
async function fetchBrand(id: string): Promise<Brand | null> {
  if (!/^[a-z0-9][a-z0-9-]{0,127}$/i.test(id)) return null;
  try {
    const res = await fetch(`${getServerApiBase()}/api/brands/${id}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data ?? json) as Brand;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const brand = await fetchBrand(id);
  if (!brand) {
    return { title: 'Brand', robots: { index: false, follow: true } };
  }

  const description =
    (brand.description || '').replace(/\s+/g, ' ').trim().slice(0, 160) ||
    `Shop ${brand.name} products at ${SITE_NAME}.`;
  const images = brand.logo ? [{ url: brand.logo, alt: brand.name }] : [];
  // The sitemap links brands by slug, so canonicalise to the slug when the
  // brand has one; otherwise fall back to the id.
  const path = `/brands/${brand.slug || brand._id}`;

  return {
    title: brand.name,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      title: brand.name,
      description,
      url: path,
      images,
    },
    twitter: {
      card: images.length ? 'summary_large_image' : 'summary',
      title: brand.name,
      description,
      images: images.map((i) => i.url),
    },
  };
}

export default async function BrandDetailPage({ params }: Params) {
  const { id } = await params;
  const brand = await fetchBrand(id);

  return (
    <>
      {brand && (
        <script
          type='application/ld+json'
          // Server-rendered from our own API response; no user input is
          // interpolated, and JSON.stringify escapes the values.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Brand',
              name: brand.name,
              ...(brand.description ? { description: brand.description } : {}),
              ...(brand.logo ? { logo: brand.logo } : {}),
              ...(brand.website ? { sameAs: [brand.website] } : {}),
              url: `${getSiteUrl()}/brands/${brand.slug || brand._id}`,
            }),
          }}
        />
      )}
      {/*
        Pass the resolved ObjectId when we have it: the route accepts a slug,
        but GET /api/products?brand= only matches ObjectIds (productQuery.js),
        so a slug here would render the brand with an empty product grid.
      */}
      <BrandDetailClient id={brand?._id ?? id} />
    </>
  );
}
