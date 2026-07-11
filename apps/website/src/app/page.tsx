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
  Shield,
  Zap,
  HeadphonesIcon,
  Award,
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

        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 relative'>
          <div className='text-center max-w-4xl mx-auto space-y-8'>
            <h1 className='text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight'>
              The #1 marketplace for premium web templates
            </h1>
            <p className='text-lg sm:text-xl text-white/90 max-w-2xl mx-auto'>
              Discover thousands of professionally designed templates for
              websites, apps, and more. Start your next project with confidence.
            </p>

            {/* Search Box */}
            <form
              onSubmit={handleSearch}
              className='relative max-w-2xl mx-auto'
            >
              <input
                type='text'
                placeholder='Search templates...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='w-full pl-16 pr-40 py-5 rounded-lg border-0 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-white/30 shadow-lg text-lg'
              />
              <Search className='absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400' />
              <button
                type='submit'
                className='absolute right-2 top-1/2 -translate-y-1/2 px-8 py-3 bg-[#82b440] hover:bg-[#6a9a32] text-white rounded-md font-semibold transition-colors text-base'
              >
                Search
              </button>
            </form>

            {/* Quick Links */}
            <div className='flex flex-wrap justify-center gap-3 pt-4'>
              <Link
                href='/templates?category=website'
                className='inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-md text-sm font-medium transition-colors'
              >
                <LayoutGrid className='h-4 w-4' />
                Website Templates
              </Link>
              <Link
                href='/templates?category=wordpress'
                className='inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-md text-sm font-medium transition-colors'
              >
                <LayoutGrid className='h-4 w-4' />
                WordPress Themes
              </Link>
              <Link
                href='/templates?category=ecommerce'
                className='inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-md text-sm font-medium transition-colors'
              >
                <ShoppingCart className='h-4 w-4' />
                E-commerce
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Categories Section */}
      <div className='bg-white py-20'>
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

      {/* Why Choose Us Section */}
      <div className='bg-gray-50 py-20'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center mb-12'>
            <h2 className='text-3xl font-bold text-gray-900 mb-4'>
              Why Choose Craftify?
            </h2>
            <p className='text-gray-600 text-lg'>
              We provide the best template marketplace experience
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'>
            {[
              {
                icon: Shield,
                title: 'Quality Assurance',
                description:
                  'All templates are reviewed and tested by our expert team',
              },
              {
                icon: Zap,
                title: 'Fast Delivery',
                description:
                  'Instant download access immediately after purchase',
              },
              {
                icon: HeadphonesIcon,
                title: '24/7 Support',
                description: 'Our support team is always ready to help you',
              },
              {
                icon: Award,
                title: 'Best Prices',
                description:
                  'Competitive pricing with regular discounts and offers',
              },
            ].map((feature) => (
              <motion.div
                key={feature.title}
                whileHover={{ y: -4 }}
                className='bg-white rounded-lg p-6 text-center hover:shadow-lg transition-shadow duration-300 border border-gray-200'
              >
                <div className='inline-flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-[#82b440] to-[#5a8a2a] text-white mb-4'>
                  <feature.icon className='h-8 w-8' />
                </div>
                <h3 className='font-semibold text-gray-900 mb-2 text-lg'>
                  {feature.title}
                </h3>
                <p className='text-gray-600 text-sm'>{feature.description}</p>
              </motion.div>
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
      <div className='bg-white py-20'>
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
      <div className='bg-gray-50 py-20'>
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

      {/* Testimonials Section */}
      <div className='bg-white py-20'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center mb-12'>
            <h2 className='text-3xl font-bold text-gray-900 mb-4'>
              What Our Customers Say
            </h2>
            <p className='text-gray-600 text-lg'>
              Join thousands of satisfied customers who trust Craftify
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {[
              {
                name: 'Sarah Johnson',
                role: 'Web Developer',
                content:
                  'Craftify has been a game-changer for my freelance business. The templates are top-notch and save me countless hours of work.',
                rating: 5,
                avatar: 'SJ',
              },
              {
                name: 'Michael Chen',
                role: 'Agency Owner',
                content:
                  'The quality of templates on Craftify is unmatched. We use them for all our client projects and they always impress.',
                rating: 5,
                avatar: 'MC',
              },
              {
                name: 'Emily Davis',
                role: 'Startup Founder',
                content:
                  'As a startup, we needed professional templates on a budget. Craftify delivered exactly that with excellent support.',
                rating: 5,
                avatar: 'ED',
              },
            ].map((testimonial) => (
              <motion.div
                key={testimonial.name}
                whileHover={{ y: -4 }}
                className='bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-shadow duration-300 border border-gray-200'
              >
                <div className='flex items-center gap-1 mb-4'>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <svg
                      key={i}
                      className='h-5 w-5 text-yellow-400 fill-current'
                      viewBox='0 0 20 20'
                    >
                      <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                    </svg>
                  ))}
                </div>
                <p className='text-gray-700 mb-6 leading-relaxed'>
                  {testimonial.content}
                </p>
                <div className='flex items-center gap-3'>
                  <div className='inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#82b440] to-[#5a8a2a] text-white font-bold'>
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className='font-semibold text-gray-900'>
                      {testimonial.name}
                    </div>
                    <div className='text-sm text-gray-500'>
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Creators Section */}
      <div className='bg-white py-20'>
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
      <div className='bg-gradient-to-r from-[#82b440] to-[#5a8a2a] text-white py-20'>
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
