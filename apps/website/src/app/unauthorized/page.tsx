'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTranslation } from '@/contexts/TranslationContext';

export default function UnauthorizedPage() {
  const { t } = useTranslation();
  return (
    <div className='relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-white/25 bg-white/15 p-6 shadow-[0_25px_80px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-10'>
      <div className='pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(900px_400px_at_0%_0%,rgba(217,70,239,0.20),transparent_55%),radial-gradient(900px_450px_at_100%_10%,rgba(34,211,238,0.20),transparent_55%),radial-gradient(900px_460px_at_50%_120%,rgba(245,158,11,0.20),transparent_55%)]' />

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className='relative overflow-hidden rounded-3xl border border-white/30 bg-white/25 p-8 shadow-sm backdrop-blur-xl sm:p-10'
      >
        <div className='pointer-events-none absolute -start-24 -top-24 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl' />
        <div className='pointer-events-none absolute -bottom-28 -end-28 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl' />

        <div className='inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/35 px-3 py-1 text-xs font-extrabold text-indigo-950'>
          {t('errors.unauthorized.badge')}
        </div>

        <div className='mt-4 text-3xl font-extrabold tracking-tight text-indigo-950 sm:text-4xl'>
          {t('errors.unauthorized.title')}
        </div>
        <div className='mt-2 max-w-2xl text-sm font-semibold leading-6 text-indigo-950/80'>
          {t('errors.unauthorized.description')}
        </div>

        <div className='mt-8 flex flex-wrap items-center gap-3'>
          <Link
            href='/'
            className='rounded-full bg-fuchsia-600 px-6 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-fuchsia-700'
          >
            {t('errors.unauthorized.backHome')}
          </Link>
          <Link
            href='/auth/login'
            className='rounded-full border border-white/40 bg-white/55 px-6 py-2.5 text-sm font-extrabold text-indigo-950 shadow-sm transition hover:bg-white/70'
          >
            {t('errors.unauthorized.login')}
          </Link>
        </div>
      </motion.section>
    </div>
  );
}
