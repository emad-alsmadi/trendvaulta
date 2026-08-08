'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductsQuery } from '@/types';
import { useProducts } from '@/hooks/products/productsQuery';
import {
  FALLBACK_HOME_MODULE_KEYS,
  getHeroSlidesFromHome,
  pickActiveHomeModules,
  useStorefrontHome,
  type HomeModuleKey,
} from '@/hooks/storefront/homeQuery';
import { HeroSection } from '@/components/home/HeroSection';
import { TrustServiceStrip } from '@/components/home/TrustServiceStrip';
import { PopularCategories } from '@/components/home/PopularCategories';
import { DealsRail } from '@/components/home/DealsRail';
import { FeaturedProductsSection } from '@/components/home/FeaturedProductsSection';
import { FeaturedBrandsStrip } from '@/components/home/FeaturedBrandsStrip';
import { GiftFinderSection } from '@/components/home/GiftFinderSection';
import { RecentlyViewedSection } from '@/components/home/RecentlyViewedSection';
import { InspiredByBrowsingSection } from '@/components/home/InspiredByBrowsingSection';
import { EditorialLookbookSection } from '@/components/home/EditorialLookbookSection';
import { WhyChooseUs } from '@/components/home/WhyChooseUs';
import { Testimonials } from '@/components/home/Testimonials';
import { CTASection } from '@/components/home/CTASection';

export default function HomePage() {
  const router = useRouter();
  const [query] = useState<ProductsQuery>({
    page: 1,
    limit: 8,
    sort: 'bestselling',
  });
  const [searchQuery, setSearchQuery] = useState('');

  const homeQ = useStorefrontHome();
  const stableQuery = useMemo(() => query, [query]);
  const productsQuery = useProducts(stableQuery);
  const products = productsQuery.data?.data ?? [];
  const featuredProducts = products;
  const loading = productsQuery.isLoading;
  const error =
    (productsQuery.error as { message?: string } | null)?.message || null;

  const moduleKeys = useMemo<HomeModuleKey[]>(() => {
    if (homeQ.data?.modules?.length) {
      return pickActiveHomeModules(homeQ.data.modules).map(
        (mod) => mod.key as HomeModuleKey,
      );
    }
    return [...FALLBACK_HOME_MODULE_KEYS];
  }, [homeQ.data?.modules]);

  const heroSlides = useMemo(
    () => getHeroSlidesFromHome(homeQ.data?.modules),
    [homeQ.data?.modules],
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const renderModule = (key: HomeModuleKey) => {
    switch (key) {
      case 'hero':
        return (
          <HeroSection
            key={key}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearchSubmit={handleSearch}
            heroSlides={heroSlides}
          />
        );
      case 'trust':
        return <TrustServiceStrip key={key} />;
      case 'categories':
        return <PopularCategories key={key} />;
      case 'deals':
        return <DealsRail key={key} />;
      case 'featured_products':
        return (
          <FeaturedProductsSection
            key={key}
            products={featuredProducts}
            loading={loading}
            error={error}
          />
        );
      case 'featured_brands':
        return <FeaturedBrandsStrip key={key} />;
      case 'gift_finder':
        return <GiftFinderSection key={key} />;
      case 'recently_viewed':
        return <RecentlyViewedSection key={key} />;
      case 'inspired':
        return (
          <InspiredByBrowsingSection
            key={key}
            products={products}
            loading={loading}
          />
        );
      case 'lookbook':
        return <EditorialLookbookSection key={key} />;
      case 'why_choose_us':
        return <WhyChooseUs key={key} />;
      case 'testimonials':
        return <Testimonials key={key} />;
      case 'cta':
        return <CTASection key={key} />;
      default:
        return null;
    }
  };

  return <div className='space-y-0'>{moduleKeys.map(renderModule)}</div>;
}
