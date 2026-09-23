'use client';

import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { REDIRECT_PARAM, getSafeRedirectPath } from '@/lib/safeRedirect';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema, type SignupValues } from '@/lib/validation';
import { useToast } from '@/components/ui/Toast';
import { useMe, useRegisterMutation } from '@/hooks/auth/authQuery';
import {
  getUserFacingErrorMessage,
  logErrorForDev,
} from '@/lib/userFacingError';
import { useTranslation } from '@/contexts/TranslationContext';

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();

  const meQuery = useMe();
  const registerMutation = useRegisterMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      username: '',
      password: '',
    },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerMutation.mutateAsync(values);
      toast(t('auth.signupSuccess'), {
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
      const msg = getUserFacingErrorMessage(err, t('auth.signupFailed'));
      toast(msg, { title: t('auth.signupFailed'), variant: 'error' });
    }
  });

  // One sentence with a {link} slot, so Arabic can place the link itself.
  const [hasAccountBefore, hasAccountAfter = ''] = t(
    'auth.hasAccountPrompt',
  ).split('{link}');

  return (
    <div className='relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/25 bg-white/20 p-4 backdrop-blur-xl sm:p-6'>
      <motion.div
        aria-hidden
        className='pointer-events-none absolute -inset-24 opacity-70'
        animate={{ rotate: [0, -8, 0], scale: [1, 1.03, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'radial-gradient(closest-side, rgba(245,158,11,0.22), transparent 70%), radial-gradient(closest-side, rgba(236,72,153,0.22), transparent 70%), radial-gradient(closest-side, rgba(99,102,241,0.20), transparent 70%)',
        }}
      />

      <div className='relative grid gap-6 lg:grid-cols-2 lg:items-stretch'>
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className='order-2 rounded-3xl border border-white/30 bg-white/35 p-6 shadow-sm backdrop-blur-xl sm:p-8 lg:order-1'
        >
          <div className='flex items-start justify-between gap-3'>
            <div>
              <div className='text-2xl font-extrabold tracking-tight text-indigo-950'>
                {t('auth.createAccountTitle')}
              </div>
              <div className='mt-1 text-sm font-semibold text-indigo-950/80'>
                {t('auth.signupSubtitle')}
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
              <label className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                {t('auth.username')}
              </label>
              <Input
                placeholder={t('auth.usernamePlaceholder')}
                {...register('username')}
              />
              {errors.username?.message && (
                <div className='mt-2 text-sm font-semibold text-rose-700'>
                  {t(errors.username.message)}
                </div>
              )}
            </div>
            <div>
              <label className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                {t('auth.email')}
              </label>
              <Input
                type='email'
                placeholder='you@example.com'
                {...register('email')}
              />
              {errors.email?.message && (
                <div className='mt-2 text-sm font-semibold text-rose-700'>
                  {t(errors.email.message)}
                </div>
              )}
            </div>
            <div>
              <label className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                {t('auth.password')}
              </label>
              <Input
                type='password'
                placeholder='••••••••'
                {...register('password')}
              />
              {errors.password?.message && (
                <div className='mt-2 text-sm font-semibold text-rose-700'>
                  {t(errors.password.message)}
                </div>
              )}
            </div>

            {registerMutation.error && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className='rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm font-semibold text-rose-900'
              >
                {getUserFacingErrorMessage(
                  registerMutation.error,
                  t('auth.signupFailed'),
                )}
              </motion.div>
            )}

            <Button
              type='submit'
              className='w-full'
              disabled={registerMutation.isPending || isSubmitting}
            >
              {registerMutation.isPending || isSubmitting ? (
                <span className='inline-flex items-center gap-2'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  {t('auth.creating')}
                </span>
              ) : (
                t('auth.createAccount')
              )}
            </Button>

            <div className='text-sm font-semibold text-indigo-950/80'>
              {hasAccountBefore}
              <Link
                className='font-extrabold text-indigo-700 hover:underline'
                href='/auth/login'
              >
                {t('auth.login')}
              </Link>
              {hasAccountAfter}
            </div>
          </form>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut', delay: 0.05 }}
          className='order-1 hidden overflow-hidden rounded-3xl border border-white/30 bg-gradient-to-br from-amber-500/80 via-rose-500/80 to-fuchsia-600/80 p-10 text-white shadow-sm lg:block lg:order-2'
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className='inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold'>
              <Sparkles className='h-4 w-4' />
              {t('auth.newHere')}
            </div>
            <h1 className='mt-4 text-4xl font-extrabold tracking-tight'>
              {t('auth.signupHeading')}
            </h1>
            <p className='mt-3 text-sm text-white/90'>
              {t('auth.signupIntro')}
            </p>

            <div className='mt-8 grid gap-3'>
              {[
                'auth.perkWishlist',
                'auth.perkDeals',
                'auth.perkStripe',
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
      </div>
    </div>
  );
}
