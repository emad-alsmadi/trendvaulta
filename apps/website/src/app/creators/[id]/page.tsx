'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Creator } from '@/types';
import type { Template } from '@/types';
import {
  Loader2,
  ArrowLeft,
  MapPin,
  User,
  Quote,
  Sparkles,
  Star,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useCreatorById } from '@/hooks/authors/authorsQuery';
import { TemplateCard } from '@/components/page/template/TemplateCard';
import { StarRating } from '@/components/page/rating/StarRating';

export default function CreatorDetailPage() {
  const params = useParams();
  const id = params.id as string | undefined;
  const creatorQuery = useCreatorById(id);
  const creator: Creator | null = creatorQuery.data || null;
  const loading = creatorQuery.isLoading;
  const error = (creatorQuery.error as any)?.message || null;

  // Mock portfolio data
  const portfolioTemplates: Template[] = [
    {
      _id: 'portfolio-1',
      title: 'Modern Corporate Theme',
      description: 'Professional corporate theme',
      price: 49.99,
      cover: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800',
      creator: creator || {
        name: 'Creator',
        _id: '1',
        country: 'Unknown',
        bio: 'No bio',
        roles: [],
      },
      averageRating: 4.5,
      reviewCount: 23,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'portfolio-2',
      title: 'Creative Portfolio',
      description: 'Showcase your work',
      price: 39.99,
      cover:
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
      creator: creator || {
        name: 'Creator',
        _id: '1',
        country: 'Unknown',
        bio: 'No bio',
        roles: [],
      },
      averageRating: 4.8,
      reviewCount: 45,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'portfolio-3',
      title: 'E-commerce Store',
      description: 'Complete store solution',
      price: 59.99,
      cover: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
      creator: creator || {
        name: 'Creator',
        _id: '1',
        country: 'Unknown',
        bio: 'No bio',
        roles: [],
      },
      averageRating: 4.6,
      reviewCount: 67,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'portfolio-4',
      title: 'Blog Template',
      description: 'Clean blog design',
      price: 29.99,
      cover:
        'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800',
      creator: creator || {
        name: 'Creator',
        _id: '1',
        country: 'Unknown',
        bio: 'No bio',
        roles: [],
      },
      averageRating: 4.3,
      reviewCount: 31,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  if (loading) {
    return (
      <div className='flex items-center justify-center rounded-3xl border border-white/40 bg-white/50 p-10 shadow-sm backdrop-blur-xl'>
        <Loader2 className='h-6 w-6 animate-spin text-fuchsia-600' />
      </div>
    );
  }

  if (error || !creator) {
    return (
      <div className='space-y-4'>
        <Link
          href='/creators'
          className='inline-flex items-center gap-2 text-sm font-extrabold text-indigo-700'
        >
          <ArrowLeft className='h-4 w-4' />
          Back to Creators
        </Link>
        <div className='rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900'>
          {error || 'Creator not found'}
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <Link
        href='/creators'
        className='inline-flex items-center gap-2 text-sm font-extrabold text-indigo-700'
      >
        <ArrowLeft className='h-4 w-4' />
        Back to Creators
      </Link>

      {/* Creator Header */}
      <div className='relative overflow-hidden rounded-3xl border border-white/35 bg-white/35 p-8 shadow-sm backdrop-blur-xl'>
        <motion.div
          aria-hidden
          className='pointer-events-none absolute -inset-24 opacity-70'
          animate={{ rotate: [0, 8, 0], scale: [1, 1.03, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background:
              'radial-gradient(closest-side, rgba(236,72,153,0.20), transparent 70%), radial-gradient(closest-side, rgba(99,102,241,0.20), transparent 70%), radial-gradient(closest-side, rgba(34,211,238,0.16), transparent 70%)',
          }}
        />

        <div className='relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start'>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className='inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/45 px-3 py-1 text-xs font-extrabold text-indigo-950'>
              <Sparkles className='h-4 w-4 text-fuchsia-700' />
              Creator profile
            </div>

            <div className='mt-4 flex items-start gap-4'>
              <motion.div
                whileHover={{ rotate: 2, y: -2 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className='inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-cyan-500 text-white shadow-sm'
              >
                <User className='h-9 w-9' />
              </motion.div>

              <div className='min-w-0 flex-1'>
                <h1 className='text-4xl font-extrabold tracking-tight text-indigo-950'>
                  {creator.name}
                </h1>
                <div className='mt-3 flex items-center gap-3'>
                  <div className='inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/40 px-3 py-1 text-sm font-extrabold text-indigo-950/90'>
                    <MapPin className='h-4 w-4 text-cyan-700' />
                    {creator.country}
                  </div>
                  <div className='flex items-center gap-1'>
                    <StarRating
                      rating={4.8}
                      size={16}
                    />
                    <span className='text-sm font-semibold text-gray-600'>
                      4.8
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.08 }}
              className='mt-6 rounded-3xl border border-white/35 bg-gradient-to-br from-fuchsia-500/10 via-indigo-500/10 to-cyan-500/10 p-6'
            >
              <div className='flex items-center gap-2 text-sm font-extrabold text-indigo-950'>
                <Quote className='h-4 w-4 text-fuchsia-700' />
                Biography
              </div>
              <p className='mt-3 text-sm font-semibold leading-7 text-indigo-950/80'>
                {creator.bio}
              </p>
            </motion.div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.05 }}
            className='space-y-4'
          >
            {/* Stats */}
            <div className='rounded-3xl border border-white/35 bg-white/35 p-6'>
              <div className='text-sm font-extrabold text-indigo-950 mb-4'>
                Creator Stats
              </div>
              <div className='grid gap-3'>
                {[
                  { label: 'Total Sales', value: '12.5K', icon: ShoppingCart },
                  { label: 'Items Sold', value: '245', icon: TrendingUp },
                  { label: 'Average Rating', value: '4.8', icon: Star },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className='rounded-2xl border border-white/35 bg-gradient-to-br from-white/20 via-white/15 to-white/10 p-4'
                    >
                      <div className='flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-indigo-950/70'>
                        <Icon className='h-3 w-3 text-fuchsia-600' />
                        {stat.label}
                      </div>
                      <div className='mt-1 text-2xl font-extrabold text-indigo-950'>
                        {stat.value}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className='rounded-3xl border border-white/35 bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-fuchsia-500/15 p-6'>
              <div className='text-sm font-extrabold text-indigo-950'>
                Next steps
              </div>
              <div className='mt-3 text-sm font-semibold text-indigo-950/80'>
                Explore templates and discover more creators with smooth
                transitions.
              </div>
              <div className='mt-5 flex flex-wrap gap-2'>
                <Link
                  href='/'
                  className='inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/45 px-4 py-2 text-sm font-extrabold text-indigo-950 transition hover:bg-white/55'
                >
                  Browse Templates
                </Link>
                <Link
                  href='/creators'
                  className='inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/30 px-4 py-2 text-sm font-extrabold text-indigo-950 transition hover:bg-white/45'
                >
                  All Creators
                </Link>
              </div>
            </div>
          </motion.aside>
        </div>
      </div>

      {/* Portfolio Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className='bg-white rounded-3xl border border-gray-200 p-6'
      >
        <h2 className='text-2xl font-extrabold text-gray-900 mb-6'>
          Portfolio ({portfolioTemplates.length} items)
        </h2>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          {portfolioTemplates.map((template) => (
            <TemplateCard
              key={template._id}
              template={template}
            />
          ))}
        </div>
      </motion.section>
    </div>
  );
}
