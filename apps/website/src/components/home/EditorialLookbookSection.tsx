'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  DEMO_LOOKBOOK_STORIES,
  type DemoLookbookStory,
} from '@/data/demoStorefront';
import { useLookbooks } from '@/hooks/storefront/lookbooksQuery';
import { useTranslation } from '@/contexts/TranslationContext';

const TONE_BG: Record<DemoLookbookStory['tone'], string> = {
  rose: 'from-stone-50 via-white to-stone-50',
  stone: 'from-stone-100 via-white to-neutral-50',
  teal: 'from-stone-50 via-white to-neutral-50',
};

type Props = {
  /** Optional override (tests / storybook). When omitted, fetches lookbooks. */
  stories?: DemoLookbookStory[];
};

/** Editorial lookbook — live GET /api/storefront/lookbooks with demo fallback */
export function EditorialLookbookSection({ stories: storiesProp }: Props) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useLookbooks();

  const liveStories = data && data.length > 0 ? data : null;
  const stories =
    storiesProp ?? liveStories ?? (!isLoading ? DEMO_LOOKBOOK_STORIES : null);
  const usingFallback = !storiesProp && !liveStories && !isLoading;

  if (!isLoading && (!stories || stories.length === 0)) return null;

  return (
    <section
      aria-labelledby='lookbook-heading'
      className='border-t border-stone-200 bg-white py-12 sm:py-16'
    >
      <div className='mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8'>
        <div className='mb-8 max-w-2xl'>
          <p className='text-xs font-medium uppercase tracking-wider text-stone-500'>
            {usingFallback || isError
              ? t('home.lookbook.demoEyebrow')
              : t('home.lookbook.eyebrow')}
          </p>
          <h2
            id='lookbook-heading'
            className='mt-1 text-2xl font-extrabold text-stone-900 sm:text-3xl'
          >
            {t('home.lookbook.title')}
          </h2>
          <p className='mt-2 text-sm text-stone-600'>
            {usingFallback || isError
              ? t('home.lookbook.demoSubtitle')
              : t('home.lookbook.subtitle')}
          </p>
        </div>

        {isLoading && !stories ? (
          <p className='text-sm text-stone-500' role='status'>
            {t('home.lookbook.loading')}
          </p>
        ) : stories ? (
          <ul className='space-y-6'>
            {stories.map((story, index) => {
              const reverse = index % 2 === 1;
              return (
                <motion.li
                  key={story.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.4 }}
                  className={`overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-br ${TONE_BG[story.tone]}`}
                >
                  <div
                    className={`grid grid-cols-1 md:grid-cols-2 ${
                      reverse ? 'md:[&>*:first-child]:order-2' : ''
                    }`}
                  >
                    <div className='relative aspect-[16/10] md:aspect-auto md:min-h-[280px]'>
                      <Image
                        src={story.imageUrl}
                        alt={story.title}
                        fill
                        className='object-cover'
                        sizes='(max-width: 768px) 100vw, 50vw'
                      />
                    </div>
                    <div className='flex flex-col justify-center p-6 sm:p-8 lg:p-10'>
                      <p className='text-xs font-semibold uppercase tracking-[0.18em] text-stone-500'>
                        {story.eyebrow}
                      </p>
                      <h3 className='mt-2 text-xl font-bold text-stone-900 sm:text-2xl'>
                        {story.title}
                      </h3>
                      <p className='mt-3 text-sm leading-relaxed text-stone-600 sm:text-base'>
                        {story.body}
                      </p>
                      <Link
                        href={story.href}
                        className='mt-6 inline-flex w-fit items-center rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2'
                      >
                        {story.ctaLabel}
                      </Link>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
