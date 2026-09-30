'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { useUnsubscribeNewsletter } from '@/hooks/marketing/marketingMutations';
import { logErrorForDev } from '@/lib/userFacingError';

function isLinkError(err: unknown) {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === 400;
}

function NewsletterUnsubscribeInner() {
  const { t } = useTranslation();
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const token = params.get('token') ?? '';
  const complete = Boolean(email && token);
  const unsubscribe = useUnsubscribeNewsletter();

  // An explicit click, not an automatic call on load: mail scanners and
  // link previews open URLs and must not unsubscribe anyone.
  const handleUnsubscribe = () => {
    unsubscribe.mutate(
      { email, token },
      { onError: (err) => logErrorForDev(err) },
    );
  };

  const invalid =
    !complete || (unsubscribe.isError && isLinkError(unsubscribe.error));

  return (
    <div className='mx-auto max-w-xl px-4 py-12'>
      <div className='rounded-3xl border border-white/40 bg-white/55 p-6 shadow-sm backdrop-blur-xl'>
        <h1 className='text-2xl font-extrabold tracking-tight text-indigo-950 sm:text-3xl'>
          {t('newsletterPage.unsubscribeTitle')}
        </h1>
        <p
          role={unsubscribe.isSuccess || unsubscribe.isError ? 'status' : undefined}
          className='mt-2 text-sm font-semibold text-indigo-950/80'
        >
          {invalid
            ? t('newsletterPage.invalidLink')
            : unsubscribe.isSuccess
              ? t('newsletterPage.unsubscribed')
              : unsubscribe.isError
                ? t('newsletterPage.error')
                : t('newsletterPage.unsubscribePrompt', { email })}
        </p>
        <div className='mt-6 flex flex-wrap gap-3'>
          {!invalid && !unsubscribe.isSuccess && (
            <Button
              type='button'
              onClick={handleUnsubscribe}
              disabled={unsubscribe.isPending}
              className='gap-2 rounded-full'
            >
              {unsubscribe.isPending && (
                <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
              )}
              {unsubscribe.isPending
                ? t('newsletterPage.unsubscribing')
                : t('newsletterPage.unsubscribeButton')}
            </Button>
          )}
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

export default function NewsletterUnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <NewsletterUnsubscribeInner />
    </Suspense>
  );
}
