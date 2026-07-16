'use client';

import { motion } from 'framer-motion';
import { TemplateCard } from '@/components/page/template/TemplateCard';
import { Template } from '@/types';

interface RelatedTemplatesProps {
  templates: Template[];
  loading: boolean;
}

export function RelatedTemplates({ templates, loading }: RelatedTemplatesProps) {
  if (loading || !templates || templates.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.5 }}
      className='mt-12'
    >
      <h2 className='text-2xl font-extrabold text-gray-900 mb-6'>
        You may also like
      </h2>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        {templates.slice(0, 4).map((template) => (
          <TemplateCard key={template._id} template={template} />
        ))}
      </div>
    </motion.section>
  );
}
