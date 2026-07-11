'use client';
import { useMemo, useState } from 'react';
import { TemplateCard } from '@/components/TemplateCard';
import { FilterSidebar } from '@/components/FilterSidebar';
import { Pagination } from '@/components/ui/Pagination';
import {
  Loader2,
  Search,
  LayoutGrid,
  ShoppingCart,
  Sparkles,
  Users,
  Heart,
  Code,
  Smartphone,
  Globe,
  Palette,
  ArrowRight,
} from 'lucide-react';
import { Template } from '@/types';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { TemplatesQuery } from '@/types';
import { useTemplates } from '@/hooks/templates/templatesQuery';

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState<TemplatesQuery>({
    page: 1,
    limit: 8,
    sort: 'createdAt',
  });
  const [searchQuery, setSearchQuery] = useState('');

  const stableQuery = useMemo(() => query, [query]);
  const templatesQuery = useTemplates(stableQuery);
  const data = templatesQuery.data;
  const loading = templatesQuery.isLoading;
  const error = (templatesQuery.error as any)?.message || null;

  const handlePageChange = (page: number) => {
    setQuery((q: TemplatesQuery) => ({ ...q, page }));
  };

  const handleFiltersChange = (newFilters: any) => {
    setQuery((q: TemplatesQuery) => ({ ...q, ...newFilters, page: 1 }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/templates?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const gridVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className='space-y-0'>
      {/* Hero Section - ThemeForest Style */}
      <div className='bg-gradient-to-r from-[#82b440] to-[#5a8a2a] text-white relative overflow-hidden'>
        {/* Background Pattern */}
        <div className='absolute inset-0 opacity-10'>
          <div className='absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2'></div>
          <div className='absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2'></div>
        </div>

        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'>
            {/* Left Side - Content */}
            <div className='space-y-6'>
              <h1 className='text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight'>
                The #1 marketplace for premium web templates
              </h1>
              <p className='text-lg sm:text-xl text-white/90'>
                Discover thousands of professionally designed templates for
                websites, apps, and more. Start your next project with
                confidence.
              </p>

              {/* Search Box */}
              <form
                onSubmit={handleSearch}
                className='relative max-w-xl'
              >
                <input
                  type='text'
                  placeholder='Search templates...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='w-full pl-12 pr-4 py-4 rounded-lg border-0 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-white/30 shadow-lg'
                />
                <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400' />
                <button
                  type='submit'
                  className='absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-[#82b440] hover:bg-[#6a9a32] text-white rounded-md font-medium transition-colors'
                >
                  Search
                </button>
              </form>

              {/* Quick Links */}
              <div className='flex flex-wrap gap-3'>
                <Link
                  href='/templates?category=website'
                  className='inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-md text-sm font-medium transition-colors'
                >
                  <LayoutGrid className='h-4 w-4' />
                  Website Templates
                </Link>
                <Link
                  href='/templates?category=wordpress'
                  className='inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-md text-sm font-medium transition-colors'
                >
                  <LayoutGrid className='h-4 w-4' />
                  WordPress Themes
                </Link>
                <Link
                  href='/templates?category=ecommerce'
                  className='inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-md text-sm font-medium transition-colors'
                >
                  <ShoppingCart className='h-4 w-4' />
                  E-commerce
                </Link>
              </div>
            </div>

            {/* Right Side - Images */}
            <div className='hidden lg:grid grid-cols-2 gap-4'>
              <div className='space-y-4'>
                <div className='aspect-[4/3] rounded-lg bg-white/10 backdrop-blur-sm overflow-hidden shadow-xl border border-white/20 hover:scale-105 transition-transform duration-300'>
                  <div className='w-full h-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center'>
                    <LayoutGrid className='h-16 w-16 text-white/60' />
                  </div>
                </div>
                <div className='aspect-[4/3] rounded-lg bg-white/10 backdrop-blur-sm overflow-hidden shadow-xl border border-white/20 hover:scale-105 transition-transform duration-300'>
                  <div className='w-full h-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center'>
                    <Sparkles className='h-16 w-16 text-white/60' />
                  </div>
                </div>
              </div>
              <div className='space-y-4 mt-8'>
                <div className='aspect-[4/3] rounded-lg bg-white/10 backdrop-blur-sm overflow-hidden shadow-xl border border-white/20 hover:scale-105 transition-transform duration-300'>
                  <div className='w-full h-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center'>
                    <Users className='h-16 w-16 text-white/60' />
                  </div>
                </div>
                <div className='aspect-[4/3] rounded-lg bg-white/10 backdrop-blur-sm overflow-hidden shadow-xl border border-white/20 hover:scale-105 transition-transform duration-300'>
                  <div className='w-full h-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center'>
                    <Heart className='h-16 w-16 text-white/60' />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Categories Section */}
      <div className='bg-white py-16'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center mb-12'>
            <h2 className='text-3xl font-bold text-gray-900 mb-4'>
              Browse by Category
            </h2>
            <p className='text-gray-600 text-lg'>
              Find the perfect template for your specific needs
            </p>
          </div>

          <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6'>
            {[
              {
                name: 'Website Templates',
                icon: Globe,
                count: '2.5K',
                href: '/templates?category=website',
                color: 'from-blue-500 to-blue-600',
              },
              {
                name: 'WordPress',
                icon: LayoutGrid,
                count: '1.8K',
                href: '/templates?category=wordpress',
                color: 'from-purple-500 to-purple-600',
              },
              {
                name: 'E-commerce',
                icon: ShoppingCart,
                count: '1.2K',
                href: '/templates?category=ecommerce',
                color: 'from-green-500 to-green-600',
              },
              {
                name: 'UI Kits',
                icon: Palette,
                count: '950',
                href: '/templates?category=uikits',
                color: 'from-pink-500 to-pink-600',
              },
              {
                name: 'Mobile Apps',
                icon: Smartphone,
                count: '680',
                href: '/templates?category=mobile',
                color: 'from-orange-500 to-orange-600',
              },
              {
                name: 'Admin Dashboards',
                icon: Code,
                count: '420',
                href: '/templates?category=admin',
                color: 'from-indigo-500 to-indigo-600',
              },
            ].map((category) => (
              <Link
                key={category.name}
                href={category.href}
                className='group'
              >
                <motion.div
                  whileHover={{ y: -4 }}
                  className='bg-gray-50 rounded-lg p-6 text-center hover:shadow-lg transition-shadow duration-300 border border-gray-200 hover:border-gray-300'
                >
                  <div
                    className={`inline-flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br ${category.color} text-white mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <category.icon className='h-7 w-7' />
                  </div>
                  <h3 className='font-semibold text-gray-900 mb-1 group-hover:text-[#82b440] transition-colors'>
                    {category.name}
                  </h3>
                  <p className='text-sm text-gray-500'>
                    {category.count} templates
                  </p>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className='bg-gray-50 border-b border-gray-200'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-8'>
            <div className='text-center'>
              <div className='text-3xl font-bold text-gray-900'>10K+</div>
              <div className='text-sm text-gray-600'>Templates</div>
            </div>
            <div className='text-center'>
              <div className='text-3xl font-bold text-gray-900'>500+</div>
              <div className='text-sm text-gray-600'>Creators</div>
            </div>
            <div className='text-center'>
              <div className='text-3xl font-bold text-gray-900'>50K+</div>
              <div className='text-sm text-gray-600'>Downloads</div>
            </div>
            <div className='text-center'>
              <div className='text-3xl font-bold text-gray-900'>4.9</div>
              <div className='text-sm text-gray-600'>Avg Rating</div>
            </div>
          </div>
        </div>
      </div>

      {/* Trending Templates Section */}
      <div className='bg-white py-16'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between mb-8'>
            <div>
              <h2 className='text-3xl font-bold text-gray-900 mb-2'>
                Trending Templates
              </h2>
              <p className='text-gray-600'>Most popular templates this week</p>
            </div>
            <Link
              href='/templates?sort=popular'
              className='inline-flex items-center gap-2 text-[#82b440] font-semibold hover:text-[#6a9a32] transition-colors'
            >
              View All
              <ArrowRight className='h-4 w-4' />
            </Link>
          </div>

          {!loading && !error && data && (
            <motion.div
              variants={gridVariants}
              initial='hidden'
              animate='show'
              className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            >
              {data.data.slice(0, 4).map((template: Template) => (
                <motion.div
                  key={template._id}
                  variants={itemVariants}
                >
                  <TemplateCard template={template} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* New Arrivals Section */}
      <div className='bg-gray-50 py-16'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between mb-8'>
            <div>
              <h2 className='text-3xl font-bold text-gray-900 mb-2'>
                New Arrivals
              </h2>
              <p className='text-gray-600'>Fresh templates just added</p>
            </div>
            <Link
              href='/templates?sort=createdAt'
              className='inline-flex items-center gap-2 text-[#82b440] font-semibold hover:text-[#6a9a32] transition-colors'
            >
              View All
              <ArrowRight className='h-4 w-4' />
            </Link>
          </div>

          {!loading && !error && data && (
            <motion.div
              variants={gridVariants}
              initial='hidden'
              animate='show'
              className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            >
              {data.data.slice(4, 8).map((template: Template) => (
                <motion.div
                  key={template._id}
                  variants={itemVariants}
                >
                  <TemplateCard template={template} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* All Templates with Filters */}
      <div className='bg-white py-16'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between mb-8'>
            <div>
              <h2 className='text-3xl font-bold text-gray-900 mb-2'>
                All Templates
              </h2>
              <p className='text-gray-600'>Browse our complete collection</p>
            </div>
          </div>

          <div className='grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]'>
            <aside className='lg:sticky lg:top-24 lg:self-start'>
              <FilterSidebar
                filters={query}
                onFiltersChange={handleFiltersChange}
              />
            </aside>

            <div className='min-w-0'>
              {loading && (
                <div className='rounded-lg border border-gray-200 bg-white p-5 shadow-sm'>
                  <div className='flex items-center gap-3'>
                    <Loader2 className='h-5 w-5 animate-spin text-[#82b440]' />
                    <div className='text-sm font-semibold text-gray-700'>
                      Loading templates...
                    </div>
                  </div>
                  <div className='mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className='h-[260px] animate-pulse rounded-lg border border-gray-200 bg-gray-100'
                      />
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className='rounded-lg border border-red-200 bg-red-50 p-6 text-red-900'>
                  <p className='font-semibold'>{error}</p>
                  <button
                    onClick={() => templatesQuery.refetch()}
                    className='mt-2 underline'
                  >
                    Try again
                  </button>
                </div>
              )}

              {!loading && !error && data && (
                <>
                  <div className='rounded-lg border border-gray-200 bg-white p-5 shadow-sm'>
                    <p className='text-sm font-semibold text-gray-700'>
                      Showing {data.data.length} of {data.meta.total} templates
                    </p>
                  </div>

                  <motion.div
                    variants={gridVariants}
                    initial='hidden'
                    animate='show'
                    className='mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  >
                    {data.data.map((template: Template) => (
                      <motion.div
                        key={template._id}
                        variants={itemVariants}
                      >
                        <TemplateCard template={template} />
                      </motion.div>
                    ))}
                  </motion.div>

                  {data.meta.pages > 1 && (
                    <div className='mt-8 flex justify-center'>
                      <Pagination
                        currentPage={data.meta.page}
                        totalPages={data.meta.pages}
                        onPageChange={handlePageChange}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Top Creators Section */}
      <div className='bg-white py-16'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between mb-8'>
            <div>
              <h2 className='text-3xl font-bold text-gray-900 mb-2'>
                Top Creators
              </h2>
              <p className='text-gray-600'>
                Meet our most talented template creators
              </p>
            </div>
            <Link
              href='/creators'
              className='inline-flex items-center gap-2 text-[#82b440] font-semibold hover:text-[#6a9a32] transition-colors'
            >
              View All
              <ArrowRight className='h-4 w-4' />
            </Link>
          </div>

          <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6'>
            {[
              {
                name: 'John Doe',
                templates: 245,
                sales: '12.5K',
                avatar: 'JD',
              },
              {
                name: 'Jane Smith',
                templates: 189,
                sales: '9.8K',
                avatar: 'JS',
              },
              {
                name: 'Mike Johnson',
                templates: 156,
                sales: '7.2K',
                avatar: 'MJ',
              },
              {
                name: 'Sarah Wilson',
                templates: 134,
                sales: '6.5K',
                avatar: 'SW',
              },
              {
                name: 'Tom Brown',
                templates: 112,
                sales: '5.8K',
                avatar: 'TB',
              },
            ].map((creator) => (
              <Link
                key={creator.name}
                href='/creators'
                className='group'
              >
                <motion.div
                  whileHover={{ y: -4 }}
                  className='bg-gray-50 rounded-lg p-6 text-center hover:shadow-lg transition-shadow duration-300 border border-gray-200 hover:border-gray-300'
                >
                  <div className='inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#82b440] to-[#5a8a2a] text-white text-xl font-bold mb-4 group-hover:scale-110 transition-transform duration-300'>
                    {creator.avatar}
                  </div>
                  <h3 className='font-semibold text-gray-900 mb-1 group-hover:text-[#82b440] transition-colors'>
                    {creator.name}
                  </h3>
                  <p className='text-sm text-gray-500'>
                    {creator.templates} templates
                  </p>
                  <p className='text-sm text-gray-500'>{creator.sales} sales</p>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className='bg-gradient-to-r from-[#82b440] to-[#5a8a2a] text-white py-16'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center'>
          <h2 className='text-3xl font-bold mb-4'>Ready to Start Selling?</h2>
          <p className='text-lg text-white/90 mb-8 max-w-2xl mx-auto'>
            Join thousands of creators who are earning money by selling their
            templates on Craftify. It's free to get started!
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Link
              href='/creators/join'
              className='inline-flex items-center justify-center rounded-lg bg-white text-[#82b440] px-8 py-3 text-base font-bold hover:bg-gray-100 transition-colors'
            >
              Become a Creator
            </Link>
            <Link
              href='/pricing'
              className='inline-flex items-center justify-center rounded-lg border-2 border-white text-white px-8 py-3 text-base font-bold hover:bg-white/10 transition-colors'
            >
              View Pricing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
