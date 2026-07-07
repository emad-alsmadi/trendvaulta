'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Creator } from '@/types';
import {
  Loader2,
  ArrowLeft,
  MapPin,
  User,
  Quote,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useCreatorById } from '@/hooks/authors/authorsQuery';

export default function CreatorDetailPage() {
  const params = useParams();
  const id = params.id as string | undefined;
  const creatorQuery = useCreatorById(id);
  const creator: Creator | null = creatorQuery.data || null;
  const loading = creatorQuery.isLoading;
  const error = (creatorQuery.error as any)?.message || null;

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
                className='inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 via-fuchsia-600 to-cyan-500 text-white shadow-sm'
              >
                <User className='h-7 w-7' />
              </motion.div>

              <div className='min-w-0'>
                <h1 className='text-4xl font-extrabold tracking-tight text-indigo-950'>
                  {creator.name}
                </h1>
                <div className='mt-3 inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/40 px-3 py-1 text-sm font-extrabold text-indigo-950/90'>
                  <MapPin className='h-4 w-4 text-cyan-700' />
                  {creator.country}
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
            <div className='rounded-3xl border border-white/35 bg-white/35 p-6'>
              <div className='text-sm font-extrabold text-indigo-950'>
                Profile highlights
              </div>
              <div className='mt-4 grid gap-3'>
                {[
                  { label: 'Country', value: creator.country },
                  { label: 'Creator ID', value: creator._id },
                ].map((x) => (
                  <div
                    key={x.label}
                    className='rounded-2xl border border-white/35 bg-gradient-to-br from-white/20 via-white/15 to-white/10 p-4'
                  >
                    <div className='text-xs font-extrabold uppercase tracking-wider text-indigo-950/70'>
                      {x.label}
                    </div>
                    <div className='mt-1 break-all text-sm font-extrabold text-indigo-950'>
                      {x.value}
                    </div>
                  </div>
                ))}
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
    </div>
  );
}
