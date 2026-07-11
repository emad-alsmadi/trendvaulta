'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { TemplateCard } from '@/components/page/template/TemplateCard';
import { Template } from '@/types';

interface NewArrivalsProps {
  templates: Template[];
  loading: boolean;
  error: string | null;
  gridVariants: any;
  itemVariants: any;
}

export function NewArrivals({
  templates,
  loading,
  error,
  gridVariants,
  itemVariants,
}: NewArrivalsProps) {
  return (
    <div className='bg-slate-100 py-20'>
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
            className='inline-flex items-center gap-2 text-indigo-600 font-semibold hover:text-fuchsia-600 transition-colors'
          >
            View All
            <ArrowRight className='h-4 w-4' />
          </Link>
        </div>

        {!loading && !error && templates && (
          <motion.div
            variants={gridVariants}
            initial='hidden'
            animate='show'
            className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          >
            {templates.slice(4, 8).map((template: Template) => (
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
  );
}
