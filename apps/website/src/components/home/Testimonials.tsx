'use client';

import { DEMO_FALLBACK_ENABLED } from '@/data/demoStorefront';
import { useTestimonials } from '@/hooks/storefront/testimonialsQuery';
import { useTranslation } from '@/contexts/TranslationContext';

/** `role`/`quote` are message keys, resolved with t() at render. */
const FALLBACK = [
  {
    id: 'sara',
    name: 'Sara Alami',
    role: 'home.testimonials.fallback.sara.role',
    quote: 'home.testimonials.fallback.sara.quote',
    rating: 5,
  },
  {
    id: 'omar',
    name: 'Omar Nasser',
    role: 'home.testimonials.fallback.omar.role',
    quote: 'home.testimonials.fallback.omar.quote',
    rating: 5,
  },
  {
    id: 'layla',
    name: 'Layla Habib',
    role: 'home.testimonials.fallback.layla.role',
    quote: 'home.testimonials.fallback.layla.quote',
    rating: 5,
  },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

export function Testimonials() {
  const { t } = useTranslation();
  const q = useTestimonials();
  const usingFallback = !q.data || q.data.length === 0;
  // The fallback quotes are invented customers: development only. In
  // production no testimonials → no section.
  if (usingFallback && (q.isLoading || !DEMO_FALLBACK_ENABLED)) return null;
  const testimonials = usingFallback ? FALLBACK : q.data;

  return (
    <section
      aria-labelledby='testimonials-heading'
      className='bg-surface-sunken py-12 sm:py-16'
    >
      <div className='mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8'>
        <div className='mb-10 max-w-2xl'>
          <h2
            id='testimonials-heading'
            className='text-2xl font-extrabold text-ink sm:text-3xl'
          >
            {t('home.testimonials.title')}
          </h2>
          <p className='mt-2 text-base text-ink-muted'>
            {t('home.testimonials.subtitle')}
          </p>
        </div>

        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {testimonials.map((testimonial) => {
            // Array(4.5) throws — clamp older/odd data to whole 1–5 stars.
            const rating = Math.min(
              5,
              Math.max(1, Math.round(Number(testimonial.rating ?? 5)) || 5),
            );
            const avatar = initials(testimonial.name);
            return (
              <figure
                key={testimonial.id || testimonial.name}
                className='flex flex-col rounded-card bg-surface p-6 text-start shadow-soft transition-shadow duration-(--dur-base) ease-brand hover:shadow-raised'
              >
                <div className='flex items-center gap-1 mb-4'>
                  {[...Array(rating)].map((_, i) => (
                    <svg
                      key={i}
                      className='h-5 w-5 text-yellow-400 fill-current'
                      viewBox='0 0 20 20'
                    >
                      <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                    </svg>
                  ))}
                </div>
                {/* dir=auto: live quotes may be in either language. */}
                <blockquote dir='auto' className='mb-6 flex-1 leading-relaxed text-ink'>
                  {usingFallback ? t(testimonial.quote) : testimonial.quote}
                </blockquote>
                <figcaption className='flex items-center gap-3 border-t border-line pt-4'>
                  <span
                    aria-hidden
                    className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent'
                  >
                    {avatar}
                  </span>
                  <span className='min-w-0'>
                    <span className='block truncate font-semibold text-ink'>
                      {testimonial.name}
                    </span>
                    {testimonial.role && (
                      <span className='block truncate text-sm text-ink-muted'>
                        {usingFallback ? t(testimonial.role) : testimonial.role}
                      </span>
                    )}
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
