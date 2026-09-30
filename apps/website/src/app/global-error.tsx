'use client';

import { useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import './globals.css';
import { logErrorForDev } from '@/lib/userFacingError';
import { LOCALE_COOKIE, dirFor, resolveLocale, type Locale } from '@/lib/locale';

// Replaces the root layout, so TranslationProvider is not available here.
// Same copy as errors.routeError in messages/*.json.
const COPY: Record<
  Locale,
  { title: string; description: string; tryAgain: string; goHome: string }
> = {
  en: {
    title: 'Something went wrong',
    description:
      'This page could not be displayed. You can try again or head back home.',
    tryAgain: 'Try again',
    goHome: 'Go home',
  },
  ar: {
    title: 'حدث خطأ ما',
    description:
      'تعذّر عرض هذه الصفحة. يمكنك المحاولة مرة أخرى أو العودة إلى الصفحة الرئيسية.',
    tryAgain: 'المحاولة مرة أخرى',
    goHome: 'العودة إلى الرئيسية',
  },
};

// The cookie never changes while this page is shown.
const subscribe = () => () => {};

function readLocaleCookie(): Locale {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`),
  );
  return resolveLocale(match ? decodeURIComponent(match[1]) : undefined);
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useSyncExternalStore(subscribe, readLocaleCookie, () => 'en');
  const copy = COPY[locale];

  useEffect(() => {
    logErrorForDev(error);
  }, [error]);

  return (
    <html lang={locale} dir={dirFor(locale)}>
      <body className='bg-white antialiased'>
        <main className='mx-auto max-w-lg px-4 py-20 text-center'>
          <h1 className='text-2xl font-bold text-gray-900'>{copy.title}</h1>
          <p className='mt-2 text-sm text-gray-600'>{copy.description}</p>
          <div className='mt-6 flex items-center justify-center gap-3'>
            <button
              type='button'
              onClick={() => reset()}
              className='rounded-xl bg-gray-900 px-6 py-3 text-sm font-extrabold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2'
            >
              {copy.tryAgain}
            </button>
            <Link
              href='/'
              className='text-sm font-semibold text-gray-700 hover:text-gray-900'
            >
              {copy.goHome}
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
