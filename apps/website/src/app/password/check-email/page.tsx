'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Sparkles } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

function CheckYourEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const { t } = useTranslation();
  // One sentence with an {email} slot, so Arabic can place the address itself.
  const [inboxBefore, inboxAfter = ''] = t('password.openInboxFor').split(
    '{email}',
  );

  return (
    <div className='relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/25 bg-white/20 p-4 backdrop-blur-xl sm:p-6'>
      <motion.div
        aria-hidden
        className='pointer-events-none absolute -inset-24 opacity-70'
        animate={{ rotate: [0, 8, 0], scale: [1, 1.03, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'radial-gradient(closest-side, rgba(236,72,153,0.22), transparent 70%), radial-gradient(closest-side, rgba(99,102,241,0.22), transparent 70%), radial-gradient(closest-side, rgba(34,211,238,0.18), transparent 70%)',
        }}
      />

      <div className='relative mx-auto max-w-3xl space-y-4'>
        <Link
          href='/password/forgot-password'
          className='inline-flex items-center gap-2 text-sm font-extrabold text-indigo-700'
        >
          <ArrowLeft className='h-4 w-4 rtl:-scale-x-100' />
          {t('password.back')}
        </Link>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className='rounded-3xl border border-white/30 bg-white/35 p-6 shadow-sm backdrop-blur-xl sm:p-8'
        >
          <div className='inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/40 px-3 py-1 text-xs font-extrabold text-indigo-950'>
            <Sparkles className='h-4 w-4 text-fuchsia-700' />
            {t('password.checkEmail')}
          </div>

          <h1 className='mt-4 text-4xl font-extrabold tracking-tight text-indigo-950'>
            {t('password.linkSent')}
          </h1>

          <div className='mt-2 text-sm font-semibold leading-7 text-indigo-950/80'>
            {t('password.linkSentBody')}
          </div>

          <div className='mt-6 rounded-2xl border border-white/35 bg-white/45 p-4'>
            <div className='flex items-start gap-3'>
              <div className='mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-fuchsia-600/10'>
                <Mail className='h-5 w-5 text-fuchsia-700' />
              </div>
              <div className='min-w-0'>
                <div className='text-sm font-extrabold text-indigo-950'>
                  {t('password.nextSteps')}
                </div>
                <div className='mt-1 text-sm font-semibold text-indigo-950/80'>
                  {email ? (
                    <>
                      {inboxBefore}
                      <span className='break-all font-extrabold text-indigo-950'>
                        {email}
                      </span>
                      {inboxAfter}
                    </>
                  ) : (
                    t('password.openInbox')
                  )}
                </div>
                <div className='mt-2 text-xs font-semibold text-indigo-950/70'>
                  {t('password.spamHint')}
                </div>
              </div>
            </div>
          </div>

          <div className='mt-8 flex flex-wrap items-center gap-3'>
            <Link
              href='/auth/login'
              className='rounded-full bg-fuchsia-600 px-6 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-fuchsia-700'
            >
              {t('password.backToLogin')}
            </Link>
            <Link
              href='/password/forgot-password'
              className='rounded-full border border-white/40 bg-white/55 px-6 py-2.5 text-sm font-extrabold text-indigo-950 shadow-sm transition hover:bg-white/70'
            >
              {t('password.resendLink')}
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

export default function CheckYourEmailPage() {
  return (
    <Suspense
      fallback={
        <div className='relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/25 bg-white/20 p-4 backdrop-blur-xl sm:p-6' />
      }
    >
      <CheckYourEmailContent />
    </Suspense>
  );
}
