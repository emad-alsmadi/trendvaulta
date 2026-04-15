'use client';
import { useMemo, useState } from 'react';
import { TemplateCard } from '@/components/TemplateCard';
import { FilterSidebar } from '@/components/FilterSidebar';
import { Pagination } from '@/components/ui/Pagination';
import { Loader2 } from 'lucide-react';
import { Template } from '@/types';
import { motion } from 'framer-motion';
import Link from 'next/link';
import type { TemplatesQuery } from '@/types';
import { useTemplates } from '@/lib/templatesQuery';

export default function HomePage() {
  const [query, setQuery] = useState<TemplatesQuery>({
    page: 1,
    limit: 8,
    sort: 'createdAt',
  });

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
    <div className='space-y-6'>
      <div className='relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/25 via-fuchsia-500/20 to-cyan-500/25 p-[1px]'>
        <motion.div
          aria-hidden
          className='pointer-events-none absolute -inset-24 opacity-70'
          animate={{ rotate: [0, 6, 0], scale: [1, 1.02, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background:
              'radial-gradient(closest-side, rgba(99,102,241,0.18), transparent 70%), radial-gradient(closest-side, rgba(236,72,153,0.16), transparent 70%), radial-gradient(closest-side, rgba(34,211,238,0.16), transparent 70%)',
          }}
        />

        <div className='relative rounded-3xl border border-white/40 bg-white/50 p-6 shadow-sm backdrop-blur-xl'>
          <h1 className='text-3xl font-extrabold tracking-tight text-indigo-950 sm:text-4xl'>
            Discover templates with a modern experience
          </h1>
          <p className='mt-2 max-w-2xl text-sm font-semibold text-indigo-900/80'>
            Search, sort, and explore ready-to-use templates with smooth
            animations and a colorful UI.
          </p>

          <div className='mt-5 flex flex-col gap-3 sm:flex-row'>
            <Link
              href='/creators'
              className='inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-500 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:opacity-95'
            >
              Explore creators
            </Link>
            <Link
              href='/about'
              className='inline-flex items-center justify-center rounded-2xl border border-white/50 bg-white/60 px-5 py-3 text-sm font-extrabold text-indigo-950 shadow-sm transition hover:bg-white'
            >
              About this project
            </Link>
          </div>
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
            <div className='rounded-3xl border border-white/40 bg-white/50 p-5 shadow-sm backdrop-blur-xl'>
              <div className='flex items-center gap-3'>
                <Loader2 className='h-5 w-5 animate-spin text-fuchsia-600' />
                <div className='text-sm font-semibold text-indigo-950/80'>
                  Loading templates...
                </div>
              </div>
              <div className='mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className='h-[260px] animate-pulse rounded-3xl border border-white/30 bg-white/30'
                  />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className='rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900'>
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
              <div className='rounded-3xl border border-white/40 bg-white/50 p-5 shadow-sm backdrop-blur-xl'>
                <p className='text-sm font-semibold text-indigo-950/80'>
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
  );
}
