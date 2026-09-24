'use client';

import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Eye, EyeClosed, EyeOff, Loader2, Sparkles } from 'lucide-react';
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

  return (
    <div className='relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/25 bg-white/20 p-4 backdrop-blur-xl sm:p-6'>
      <motion.div
        aria-hidden
        className='pointer-events-none absolute -inset-24 opacity-70'
        animate={{ rotate: [0, 8, 0], scale: [1, 1.03, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'radial-gradient(closest-side, rgba(236,72,153,0.25), transparent 70%), radial-gradient(closest-side, rgba(99,102,241,0.25), transparent 70%), radial-gradient(closest-side, rgba(34,211,238,0.20), transparent 70%)',
        }}
      />

      <div className='relative grid gap-6 lg:grid-cols-2 lg:items-stretch'>
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className='hidden overflow-hidden rounded-3xl border border-white/30 bg-gradient-to-br from-fuchsia-600/80 via-indigo-600/80 to-cyan-500/80 p-10 text-white shadow-sm lg:block'
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className='inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold'>
              <Sparkles className='h-4 w-4' />
              {t('auth.welcomeBack')}
            </div>
            <h1 className='mt-4 text-4xl font-extrabold tracking-tight'>
              {t('auth.loginHeading')}
            </h1>
            <p className='mt-3 text-sm text-white/90'>
              {t('auth.loginIntro')}
            </p>

            <div className='mt-8 grid gap-3'>
              {[
                'auth.perkFavorites',
                'auth.perkCatalog',
                'auth.perkCheckout',
              ].map((perkKey) => (
                <div
                  key={perkKey}
                  className='rounded-2xl bg-white/12 p-4 text-sm font-semibold'
                >
                  {t(perkKey)}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut', delay: 0.05 }}
          className='rounded-3xl border border-white/30 bg-white/35 p-6 shadow-sm backdrop-blur-xl sm:p-8'
        >
          <div className='flex items-start justify-between gap-3'>
            <div>
              <div className='text-2xl font-extrabold tracking-tight text-indigo-950'>
                {t('auth.login')}
              </div>
              <div className='mt-1 text-sm font-semibold text-indigo-950/80'>
                {t('auth.loginSubtitle')}
              </div>
            </div>
            {meQuery.data?.user && (
              <div className='rounded-full border border-white/35 bg-emerald-500/15 px-3 py-1 text-xs font-extrabold text-emerald-900'>
                {t('auth.signedIn')}
              </div>
            )}
          </div>

          <form
            onSubmit={onSubmit}
            className='mt-6 space-y-4'
          >
            <div>
              <label htmlFor='login-email' className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                {t('auth.email')}
              </label>
              <Input
                id='login-email'
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? 'login-email-error' : undefined}
                type='email'
                placeholder='you@example.com'
                {...register('email')}
              />
              {errors.email?.message && (
                <div id='login-email-error' role='alert' className='mt-2 text-sm font-semibold text-rose-700'>
                  {t(errors.email.message)}
                </div>
              )}
            </div>
            <div className='relative'>
              <label htmlFor='login-password' className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                {t('auth.password')}
              </label>
              <div className='relative'>
                <Input
                  id='login-password'
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={errors.password ? 'login-password-error' : undefined}
                  type={`${showPassword ? 'text' : 'password'}`}
                  placeholder='••••••••'
                  {...register('password')}
                  className='pe-12'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t('security.hidePassword') : t('security.showPassword')}
                  aria-pressed={showPassword}
                  className='absolute end-3 top-1/2 -translate-y-1/2 text-indigo-950/60 hover:text-indigo-950 transition-colors duration-200'
                >
                  {showPassword ? (
                    <Eye className='h-5 w-5' />
                  ) : (
                    <EyeOff className='h-5 w-5' />
                  )}
                </button>
              </div>
              {errors.password?.message && (
                <div id='login-password-error' role='alert' className='mt-2 text-sm font-semibold text-rose-700'>
                  {t(errors.password.message)}
                </div>
              )}
            </div>

            {loginMutation.error && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className='rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm font-semibold text-rose-900'
              >
                {getUserFacingErrorMessage(
                  loginMutation.error,
                  t('auth.loginFailed'),
                  t,
                )}
              </motion.div>
            )}

            <Button
              type='submit'
              className='w-full'
              disabled={loginMutation.isPending || isSubmitting}
            >
              {loginMutation.isPending || isSubmitting ? (
                <span className='inline-flex items-center gap-2'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  {t('auth.signingIn')}
                </span>
              ) : (
                t('reviews.signIn')
              )}
            </Button>

            <div className='flex items-center justify-between text-sm'>
              <Link
                className='font-extrabold text-indigo-700 hover:underline'
                href='/auth/signup'
              >
                {t('auth.createAccount')}
              </Link>
              <Link
                className='font-extrabold text-fuchsia-700 hover:underline'
                href='/password/forgot-password'
              >
                {t('auth.forgotPasswordLink')}
              </Link>
            </div>
          </form>
        </motion.section>
      </div>
    </div>
  );
}
