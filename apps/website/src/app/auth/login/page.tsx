'use client';

import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Globe,
  Heart,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
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
  const { t, locale, setLocale } = useTranslation();

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
    <div className='grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]'>
      {/* Brand panel — desktop only. */}
      <aside className='relative hidden overflow-hidden bg-gray-950 p-12 text-white lg:flex lg:flex-col lg:justify-between'>
        <div
          aria-hidden
          className='pointer-events-none absolute -end-32 -top-32 h-96 w-96 rounded-full bg-fuchsia-600/30 blur-3xl'
        />
        <div
          aria-hidden
          className='pointer-events-none absolute -bottom-40 -start-24 h-[28rem] w-[28rem] rounded-full bg-indigo-600/25 blur-3xl'
        />
        <Link href='/' className='relative flex items-center gap-2.5'>
          <span className='inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-600 via-purple-600 to-cyan-500'>
            <Sparkles className='h-5 w-5' aria-hidden />
          </span>
          <span className='text-lg font-bold tracking-tight'>TrendVaulta</span>
          <span className='ms-1 rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-white/60'>
            {t('auth.welcomeBack')}
          </span>
        </Link>

        <div className='relative max-w-md'>
          <h2 className='text-4xl font-bold leading-tight tracking-tight'>
            {t('auth.loginHeading')}
          </h2>
          <p className='mt-4 text-sm leading-relaxed text-white/60'>
            {t('auth.loginIntro')}
          </p>
          <ul className='mt-10 space-y-5'>
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
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
            <span className='inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-600 via-purple-600 to-cyan-500 text-white'>
              <Sparkles className='h-5 w-5' aria-hidden />
            </span>
            <span className='text-lg font-bold tracking-tight text-gray-900'>
              TrendVaulta
            </span>
          </Link>

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
        </motion.div>
      </div>
    </div>
  );
}
