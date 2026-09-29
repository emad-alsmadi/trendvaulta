'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, MailWarning } from 'lucide-react';
import { authApi } from '@/lib/api';
import { AUTH_ME_QUERY_KEY } from '@/hooks/auth/authQuery';
import { PROFILE_KEY } from '@/hooks/profile/useProfile';
import { useTranslation } from '@/contexts/TranslationContext';

type State = 'verifying' | 'success' | 'failed' | 'missing';

/**
 * Landing page of the confirmation email: /auth/verify-email?token=…
 * The token is used once, so the request is sent exactly once even though
 * React runs effects twice in development.
 */
function VerifyEmailContent() {
  const token = useSearchParams().get('token') || '';
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [state, setState] = useState<State>(token ? 'verifying' : 'missing');
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    authApi
      .verifyEmail(token)
      .then(() => {
        setState('success');
        // The account banner reads these
        void queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY });
        void queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
      })
      .catch(() => setState('failed'));
  }, [token, queryClient]);

  const icon =
    state === 'verifying' ? (
      <Loader2 className='h-6 w-6 animate-spin text-indigo-600 motion-reduce:animate-none' aria-hidden />
    ) : state === 'success' ? (
      <CheckCircle2 className='h-6 w-6 text-emerald-600' aria-hidden />
    ) : (
      <MailWarning className='h-6 w-6 text-amber-600' aria-hidden />
    );

  const title =
    state === 'verifying'
      ? t('auth.verifyEmail.title')
      : state === 'success'
        ? t('auth.verifyEmail.successTitle')
        : t('auth.verifyEmail.failedTitle');

  const body =
    state === 'verifying'
      ? t('auth.verifyEmail.verifying')
      : state === 'success'
        ? t('auth.verifyEmail.success')
        : state === 'missing'
          ? t('auth.verifyEmail.missingToken')
          : t('auth.verifyEmail.failed');

  return (
    <div className='mx-auto max-w-xl py-10'>
      <section className='rounded-3xl border border-white/30 bg-white/35 p-6 shadow-sm backdrop-blur-xl sm:p-8'>
        <div className='inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/60'>
          {icon}
        </div>
        {/* Announced when the result replaces the "confirming" text */}
        <div role='status' aria-live='polite'>
          <h1 className='mt-4 text-3xl font-extrabold tracking-tight text-indigo-950'>{title}</h1>
          <p className='mt-2 text-sm font-semibold leading-7 text-indigo-950/80'>{body}</p>
        </div>
        {state !== 'verifying' && (
          <div className='mt-6 flex flex-wrap gap-3'>
            <Link
              href='/user'
              className='inline-flex items-center rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700'
            >
              {t('auth.verifyEmail.toAccount')}
            </Link>
            <Link
              href='/products'
              className='inline-flex items-center rounded-full border border-indigo-200 px-5 py-2.5 text-sm font-bold text-indigo-700 hover:bg-white/60'
            >
              {t('auth.verifyEmail.toShop')}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
