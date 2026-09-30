'use client';

import { Suspense, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useConfirmNewsletter } from '@/hooks/marketing/marketingMutations';
import { logErrorForDev } from '@/lib/userFacingError';

function isLinkError(err: unknown) {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === 400;
}

function NewsletterConfirmInner() {
  const { t } = useTranslation();
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const exp = params.get('exp') ?? '';
  const token = params.get('token') ?? '';
  const complete = Boolean(email && exp && token);
  const confirm = useConfirmNewsletter();
  // Confirm once on arrival (Strict Mode runs effects twice in development).
  const sent = useRef(false);

  useEffect(() => {
    if (!complete || sent.current) return;
    sent.current = true;
    confirm.mutate(
      { email, exp, token },
      { onError: (err) => logErrorForDev(err) },
    );
  }, [complete, confirm, email, exp, token]);

  let body: React.ReactNode;
  if (!complete || (confirm.isError && isLinkError(confirm.error))) {
    body = t('newsletterPage.invalidLink');
  } else if (confirm.isError) {
    body = t('newsletterPage.error');
  } else if (confirm.isSuccess) {
    body = t('newsletterPage.confirmed');
  } else {
    body = (
      <span role='status' className='inline-flex items-center gap-2'>
        <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
        {t('newsletterPage.confirming')}
      </span>
    );
  }

  return (
    <div className='mx-auto max-w-xl px-4 py-12'>
      <div className='rounded-3xl border border-white/40 bg-white/55 p-6 shadow-sm backdrop-blur-xl'>
        <h1 className='text-2xl font-extrabold tracking-tight text-indigo-950 sm:text-3xl'>
          {t('newsletterPage.confirmTitle')}
        </h1>
        <p className='mt-2 text-sm font-semibold text-indigo-950/80'>{body}</p>
        <div className='mt-6'>
          <Link
            href='/'
            className='inline-flex items-center justify-center rounded-full border border-white/35 bg-white/45 px-5 py-3 text-sm font-extrabold text-indigo-950 shadow-sm backdrop-blur-xl transition hover:bg-white/65'
          >
            {t('newsletterPage.backHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function NewsletterConfirmPage() {
  return (
    <Suspense fallback={null}>
      <NewsletterConfirmInner />
    </Suspense>
  );
}
