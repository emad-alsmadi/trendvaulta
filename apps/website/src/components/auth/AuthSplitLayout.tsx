'use client';

import Link from 'next/link';
import {
  Globe,
  Heart,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/contexts/TranslationContext';

type Highlight = { icon: LucideIcon; text: string };

type AuthSplitLayoutProps = {
  /** Translation keys for the brand panel; default to the sign-in copy. */
  badge?: string;
  heading?: string;
  intro?: string;
  highlights?: readonly Highlight[];
  children: React.ReactNode;
};

const DEFAULT_HIGHLIGHTS: readonly Highlight[] = [
  { icon: Heart, text: 'auth.perkFavorites' },
  { icon: ShoppingBag, text: 'auth.perkCatalog' },
  { icon: ShieldCheck, text: 'auth.perkCheckout' },
];

/** Full-viewport auth screen: dark brand panel beside the form. */
export function AuthSplitLayout({
  badge = 'auth.welcomeBack',
  heading = 'auth.loginHeading',
  intro = 'auth.loginIntro',
  highlights = DEFAULT_HIGHLIGHTS,
  children,
}: AuthSplitLayoutProps) {
  const { t, locale, setLocale } = useTranslation();

  return (
    <div className='grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]'>
      {/* Brand panel — desktop only. */}
      <aside className='relative hidden overflow-hidden bg-gray-950 p-12 text-white lg:flex lg:flex-col lg:justify-between'>
        <div
          aria-hidden
          className='pointer-events-none absolute -inset-e-32 -top-32 h-96 w-96 rounded-full bg-fuchsia-600/30 blur-3xl'
        />
        <div
          aria-hidden
          className='pointer-events-none absolute -bottom-40 -inset-s-24 h-112 w-md rounded-full bg-indigo-600/25 blur-3xl'
        />
        <Link href='/' className='relative flex items-center gap-2.5'>
          <span className='inline-flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-fuchsia-600 via-purple-600 to-cyan-500'>
            <Sparkles className='h-5 w-5' aria-hidden />
          </span>
          <span className='text-lg font-bold tracking-tight'>TrendVaulta</span>
          <span className='ms-1 rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-white/60'>
            {t(badge)}
          </span>
        </Link>

        <div className='relative max-w-md'>
          <h2 className='text-4xl font-bold leading-tight tracking-tight'>
            {t(heading)}
          </h2>
          <p className='mt-4 text-sm leading-relaxed text-white/60'>
            {t(intro)}
          </p>
          <ul className='mt-10 space-y-5'>
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className='flex items-center gap-4 text-white/80'>
                <span className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10'>
                  <Icon className='h-5 w-5' aria-hidden />
                </span>
                {t(text)}
              </li>
            ))}
          </ul>
        </div>

        <p className='relative text-xs text-white/40'>
          © {new Date().getFullYear()} TrendVaulta
        </p>
      </aside>

      {/* Form */}
      <div className='relative flex items-center justify-center px-6 py-16 sm:px-10'>
        <div className='absolute inset-x-4 top-4 flex items-center justify-between'>
          <Link
            href='/'
            className='rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900'
          >
            {t('newsletterPage.backHome')}
          </Link>
          <button
            type='button'
            onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
            title={t('nav.switchLanguage')}
            lang={locale === 'en' ? 'ar' : 'en'}
            className='inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900'
          >
            <Globe className='h-4 w-4' aria-hidden />
            {locale === 'en' ? 'العربية' : 'English'}
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className='w-full max-w-sm'
        >
          <Link href='/' className='mb-8 flex items-center gap-2.5 lg:hidden'>
            <span className='inline-flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-fuchsia-600 via-purple-600 to-cyan-500 text-white'>
              <Sparkles className='h-5 w-5' aria-hidden />
            </span>
            <span className='text-lg font-bold tracking-tight text-gray-900'>
              TrendVaulta
            </span>
          </Link>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
