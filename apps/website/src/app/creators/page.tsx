'use client';

import { useMemo, useState } from 'react';
import { Creator, CreatorsQuery } from '@/types';
import { Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthorCard } from '@/components/cards/AuthorCard';
import { useCreators } from '@/hooks/authors/authorsQuery';
import { Pagination } from '@/components/ui/Pagination';

export default function AuthorsPage() {
  const [query, setQuery] = useState<CreatorsQuery>({
    page: 1,
    limit: 8,
  });

  const stableQuery = useMemo(() => query, [query]);
  const creatorsQuery = useCreators({
    page: query.page,
    limit: 12,
  });
  const creators = creatorsQuery.data?.data || [];
  const meta = creatorsQuery.data?.meta;
  const loading = creatorsQuery.isLoading;
  const error = (creatorsQuery.error as any)?.message || null;

  const handlePageChange = (page: number) => {
    setQuery((q) => ({ ...q, page }));
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center rounded-2xl border border-white/60 bg-white/70 p-10 shadow-sm backdrop-blur'>
        <Loader2 className='h-6 w-6 animate-spin text-indigo-600' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800'>
        {error}
      </div>
    );
  }

  const gridVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.06,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.12,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.28,
      },
    },
    exit: {
      opacity: 0,
      y: -6,
      transition: {
        duration: 0.12,
      },
    },
  };

  return (
    <div className='space-y-6'>
      <div className='rounded-3xl border border-white/40 bg-white/55 p-6 shadow-sm backdrop-blur-xl'>
        <h1 className='text-3xl font-extrabold tracking-tight text-gray-900'>
          Creators
        </h1>
        <p className='mt-1 text-sm font-semibold text-gray-700'>
          Explore creators featured in the templates catalog.
        </p>
      </div>

      {!loading && !error && meta && (
        <div className='rounded-3xl border border-white/40 bg-white/50 p-5 shadow-sm backdrop-blur-xl'>
          <div className='flex items-center justify-between gap-3'>
            <p className='text-sm font-semibold text-indigo-950/80'>
              Showing {creators.length} of {meta.total} creators
            </p>
            {creatorsQuery.isFetching && (
              <div className='inline-flex items-center gap-2 text-xs font-extrabold text-indigo-950/70'>
                <Loader2 className='h-4 w-4 animate-spin text-indigo-600' />
                Loading...
              </div>
            )}
          </div>
        </div>
      )}

      <AnimatePresence mode='wait'>
        <motion.div
          key={meta?.page ?? query.page ?? 1}
          variants={gridVariants}
          initial='hidden'
          animate='show'
          exit='exit'
          className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
        >
          {creators.map((a: Creator) => (
            <motion.div
              key={a._id}
              variants={itemVariants}
            >
              <AuthorCard author={a} />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {meta && meta.pages > 1 && (
        <div className='mt-8 flex justify-center'>
          <Pagination
            currentPage={meta.page}
            totalPages={meta.pages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
