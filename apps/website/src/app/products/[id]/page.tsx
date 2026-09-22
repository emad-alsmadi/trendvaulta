import type { Metadata } from 'next';
import { ProductDetailClient } from './ProductDetailClient';
import { SITE_NAME, getServerApiBase, getSiteUrl } from '@/lib/site';
import type { Product } from '@/types';

type Params = { params: Promise<{ id: string }> };

async function fetchProduct(id: string): Promise<Product | null> {
  if (!/^[a-f\d]{24}$/i.test(id)) return null;
  try {
    const res = await fetch(`${getServerApiBase()}/api/products/${id}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data ?? json) as Product;
  } catch {
    return null;
  }
}

function brandName(product: Product): string | undefined {
  const b = product.brand;
  if (!b) return undefined;
  return typeof b === 'string' ? undefined : b.name;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProduct(id);
  if (!product) {
    return { title: 'Product', robots: { index: false, follow: true } };
  }
  const description = (product.description || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
  const images = product.cover ? [{ url: product.cover, alt: product.title }] : [];
  return {
    title: product.title,
    description: description || `${product.title} at ${SITE_NAME}`,
    alternates: { canonical: `/products/${product._id}` },
    openGraph: {
      type: 'website',
      title: product.title,
      description,
      url: `/products/${product._id}`,
      images,
    },
    twitter: {
      card: images.length ? 'summary_large_image' : 'summary',
      title: product.title,
      description,
      images: images.map((i) => i.url),
    },
  };
}

export default async function ProductDetailPage({ params }: Params) {
  const { id } = await params;
  const product = await fetchProduct(id);

  const jsonLd = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.title,
        description: product.description,
        image: product.cover ? [product.cover] : undefined,
        sku: product.sku,
        category: product.category,
        brand: brandName(product)
          ? { '@type': 'Brand', name: brandName(product) }
          : undefined,
        aggregateRating:
          product.reviewCount && product.averageRating
            ? {
                '@type': 'AggregateRating',
                ratingValue: product.averageRating,
                reviewCount: product.reviewCount,
              }
            : undefined,
        offers: {
          '@type': 'Offer',
          url: `${getSiteUrl()}/products/${product._id}`,
          priceCurrency: 'USD',
          price: product.price,
          availability:
            product.stock > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type='application/ld+json'
          // JSON-LD is serialized from API data, escaped to avoid closing the tag
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
        />
      )}
      <ProductDetailClient id={id} />
    </>
  );
}
