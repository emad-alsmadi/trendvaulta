'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { TemplateCard } from '@/components/page/template/TemplateCard';
import { Template } from '@/types';

interface BestSellingTemplatesProps {
  templates: Template[];
  loading: boolean;
  error: string | null;
  gridVariants: any;
  itemVariants: any;
}

export function BestSellingTemplates({
  templates,
  loading,
  error,
  gridVariants,
  itemVariants,
}: BestSellingTemplatesProps) {
  return (
    <div className='bg-gray-50 py-16 border-t border-gray-200'>
      <div className='max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex items-center justify-between mb-8'>
          <div>
            <h2 className='text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2'>
              Browse this week's best selling templates
            </h2>
            <p className='text-gray-600'>
              Top performing templates this week
            </p>
          </div>
          <Link
            href='/templates?sort=sales'
            className='inline-flex items-center gap-2 text-indigo-600 font-semibold hover:text-indigo-700 transition-colors'
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
            {templates.slice(0, 4).map((template: Template) => (
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
