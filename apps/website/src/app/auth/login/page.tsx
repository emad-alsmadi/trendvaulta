'use client';

import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Heart,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { REDIRECT_PARAM, getSafeRedirectPath } from '@/lib/safeRedirect';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginValues } from '@/lib/validation';
import { useToast } from '@/components/ui/Toast';
import { useLoginMutation, useMe } from '@/hooks/auth/authQuery';
import {
  getUserFacingErrorMessage,
  logErrorForDev,
} from '@/lib/userFacingError';
import { useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';

const HIGHLIGHTS = [
  { icon: Heart, text: 'auth.perkFavorites' },
  { icon: ShoppingBag, text: 'auth.perkCatalog' },
  { icon: ShieldCheck, text: 'auth.perkCheckout' },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useTranslation();

  const meQuery = useMe();
  const loginMutation = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await loginMutation.mutateAsync(values);
      toast(t('auth.loginSuccess'), {
        title: t('common.success'),
        variant: 'success',
      });
      // Sent here by the route guard / 401 handler? Go back to that page.
      const returnTo = getSafeRedirectPath(
        new URLSearchParams(window.location.search).get(REDIRECT_PARAM),
      );
      router.push(returnTo || '/');
    } catch (err) {
      logErrorForDev(err);
      const msg = getUserFacingErrorMessage(err, t('auth.loginFailed'), t);
      toast(msg, { title: t('auth.loginFailed'), variant: 'error' });
    }
  });

  const pending = loginMutation.isPending || isSubmitting;

  return (
    <AuthSplitLayout
      badge='auth.welcomeBack'
      heading='auth.loginHeading'
      intro='auth.loginIntro'
      highlights={HIGHLIGHTS}
    >
      <div className='flex items-start justify-between gap-3'>
        <h1 className='text-2xl font-bold tracking-tight text-gray-900'>
          {t('auth.login')}
        </h1>
        {meQuery.data?.user && (
          <span className='rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800'>
            {t('auth.signedIn')}
          </span>
        )}
      </div>
      <p className='mt-2 text-sm text-gray-500'>{t('auth.loginSubtitle')}</p>

      <form onSubmit={onSubmit} className='mt-8 space-y-5'>
        {loginMutation.error && (
          <motion.div
            role='alert'
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className='flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800'
          >
            <AlertCircle className='mt-0.5 h-4 w-4 shrink-0' aria-hidden />
            {getUserFacingErrorMessage(
              loginMutation.error,
              t('auth.loginFailed'),
              t,
            )}
          </motion.div>
        )}

        <div>
          <label
            htmlFor='login-email'
            className='mb-1.5 block text-sm font-medium text-gray-700'
          >
            {t('auth.email')}
          </label>
          <div className='relative'>
            <Mail
              className='pointer-events-none absolute start-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400'
              aria-hidden
            />
            <Input
              id='login-email'
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              type='email'
              autoComplete='username'
              placeholder='you@example.com'
              dir='ltr'
              disabled={pending}
              {...register('email')}
              className='ps-10'
            />
          </div>
          {errors.email?.message && (
            <div
              id='login-email-error'
              role='alert'
              className='mt-1.5 text-xs font-medium text-red-600'
            >
              {t(errors.email.message)}
            </div>
          )}
        </div>

        <div>
          <div className='mb-1.5 flex items-center justify-between'>
            <label
              htmlFor='login-password'
              className='block text-sm font-medium text-gray-700'
            >
              {t('auth.password')}
            </label>
            <Link
              className='text-sm font-medium text-fuchsia-700 hover:underline'
              href='/password/forgot-password'
            >
              {t('auth.forgotPasswordLink')}
            </Link>
          </div>
          <div className='relative'>
            <Lock
              className='pointer-events-none absolute start-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400'
              aria-hidden
            />
            <Input
              id='login-password'
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={
                errors.password ? 'login-password-error' : undefined
              }
              type={showPassword ? 'text' : 'password'}
              autoComplete='current-password'
              placeholder='••••••••'
              disabled={pending}
              {...register('password')}
              className='pe-11 ps-10'
            />
            <button
              type='button'
              onClick={() => setShowPassword((v) => !v)}
              // Keep focus (and the caret) in the field while toggling.
              onMouseDown={(e) => e.preventDefault()}
              aria-label={
                showPassword
                  ? t('security.hidePassword')
                  : t('security.showPassword')
              }
              aria-pressed={showPassword}
              aria-controls='login-password'
              className='absolute inset-y-0 end-0 z-10 flex w-11 items-center justify-center text-gray-400 transition-colors hover:text-gray-700'
            >
              {showPassword ? (
                <EyeOff className='h-4 w-4' aria-hidden />
              ) : (
                <Eye className='h-4 w-4' aria-hidden />
              )}
            </button>
          </div>
          {errors.password?.message && (
            <div
              id='login-password-error'
              role='alert'
              className='mt-1.5 text-xs font-medium text-red-600'
            >
              {t(errors.password.message)}
            </div>
          )}
        </div>

        <Button type='submit' className='w-full' disabled={pending}>
          {pending ? (
            <span className='inline-flex items-center gap-2'>
              <Loader2 className='h-4 w-4 animate-spin' />
              {t('auth.signingIn')}
            </span>
          ) : (
            t('reviews.signIn')
          )}
        </Button>

        <p className='text-center text-sm text-gray-500'>
          {t('auth.noAccount')}{' '}
          <Link
            className='font-semibold text-indigo-700 hover:underline'
            href='/auth/signup'
          >
            {t('auth.createAccount')}
          </Link>
        </p>
      </form>
    </AuthSplitLayout>
  );
}
