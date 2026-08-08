'use client';

import Link from 'next/link';
import { HelpCircle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/Accordion';
import {
  getDemoProductQa,
  type DemoProductQaItem,
} from '@/data/demoStorefront';

type Props = {
  category?: string | null;
  /** Optional override — defaults to category demo Q&A */
  items?: DemoProductQaItem[];
};

/**
 * PDP Q&A accordion (Amazon-like IA pattern).
 * DEMO static FAQs by category — not live shopper Q&A.
 * TODO(api): GET /api/products/:id/qa
 */
export function ProductQaSection({ category, items }: Props) {
  const qa = items ?? getDemoProductQa(category);

  if (qa.length === 0) return null;

  return (
    <section
      aria-labelledby='pdp-qa-heading'
      className='mb-8 rounded-2xl border border-stone-100 bg-white p-6 shadow-sm sm:p-8'
    >
      <div className='mb-5 flex flex-wrap items-start justify-between gap-3'>
        <div>
          <p className='inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-stone-500'>
            <HelpCircle className='h-3.5 w-3.5' aria-hidden />
            Demo Q&amp;A
          </p>
          <h2
            id='pdp-qa-heading'
            className='mt-1 text-2xl font-bold text-stone-900'
          >
            Questions &amp; answers
          </h2>
          <p className='mt-1 text-sm font-semibold text-stone-600'>
            Common questions for this category. Live customer Q&amp;A comes
            later via API.
          </p>
        </div>
        <Link
          href='/help'
          className='text-sm font-bold text-fuchsia-700 hover:underline'
        >
          Help Center
        </Link>
      </div>

      <Accordion
        type='single'
        collapsible
        className='space-y-2'
        defaultValue={qa[0]?.id}
      >
        {qa.map((item) => (
          <AccordionItem
            key={item.id}
            value={item.id}
            className='rounded-xl border border-stone-200 bg-stone-50/50'
          >
            <AccordionTrigger className='text-stone-900 hover:bg-stone-100/80'>
              {item.question}
            </AccordionTrigger>
            <AccordionContent className='text-stone-700'>
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
