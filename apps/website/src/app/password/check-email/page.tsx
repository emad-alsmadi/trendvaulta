'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
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
    <AuthSplitLayout>
      <Link
        href='/password/forgot-password'
        className='inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:underline'
      >
        <ArrowLeft className='h-4 w-4 rtl:-scale-x-100' aria-hidden />
        {t('password.back')}
      </Link>

      <h1 className='mt-6 text-2xl font-bold tracking-tight text-gray-900'>
        {t('password.linkSent')}
      </h1>
      <p className='mt-2 text-sm leading-relaxed text-gray-500'>
        {t('password.linkSentBody')}
      </p>

      <div className='mt-8 flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4'>
        <span className='mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-fuchsia-600/10'>
          <Mail className='h-5 w-5 text-fuchsia-700' aria-hidden />
        </span>
        <div className='min-w-0'>
          <div className='text-sm font-semibold text-gray-900'>
            {t('password.nextSteps')}
          </div>
          <div className='mt-1 text-sm text-gray-600'>
            {email ? (
              <>
                {inboxBefore}
                <span className='break-all font-semibold text-gray-900'>
                  {email}
                </span>
                {inboxAfter}
              </>
            ) : (
              t('password.openInbox')
            )}
          </div>
          <div className='mt-2 text-xs text-gray-500'>
            {t('password.spamHint')}
          </div>
        </div>
      </div>

      <div className='mt-8 flex flex-wrap items-center gap-3'>
        <Link
          href='/auth/login'
          className='inline-flex items-center rounded-full bg-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-fuchsia-700'
        >
          {t('password.backToLogin')}
        </Link>
        <Link
          href='/password/forgot-password'
          className='inline-flex items-center rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50'
        >
          {t('password.resendLink')}
        </Link>
      </div>
    </AuthSplitLayout>
  );
}

export default function CheckYourEmailPage() {
  return (
    <Suspense fallback={null}>
      <CheckYourEmailContent />
    </Suspense>
  );
}
