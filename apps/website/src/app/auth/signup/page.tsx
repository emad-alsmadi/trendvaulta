'use client';

import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import {
  AlertCircle,
  Heart,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Tag,
  User,
} from 'lucide-react';
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

const HIGHLIGHTS = [
  { icon: Heart, text: 'auth.perkWishlist' },
  { icon: Tag, text: 'auth.perkDeals' },
  { icon: ShieldCheck, text: 'auth.perkStripe' },
] as const;

const fieldIconClass =
  'pointer-events-none absolute start-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400';
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700';
const fieldErrorClass = 'mt-1.5 text-xs font-medium text-red-600';

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
      const msg = getUserFacingErrorMessage(err, t('auth.signupFailed'), t);
      toast(msg, { title: t('auth.signupFailed'), variant: 'error' });
    }
  });

  // One sentence with a {link} slot, so Arabic can place the link itself.
  const [hasAccountBefore, hasAccountAfter = ''] = t(
    'auth.hasAccountPrompt',
  ).split('{link}');

  const pending = registerMutation.isPending || isSubmitting;

  return (
    <AuthSplitLayout
      badge='auth.newHere'
      heading='auth.signupHeading'
      intro='auth.signupIntro'
      highlights={HIGHLIGHTS}
    >
      <div className='flex items-start justify-between gap-3'>
        <h1 className='text-2xl font-bold tracking-tight text-gray-900'>
          {t('auth.createAccountTitle')}
        </h1>
        {meQuery.data?.user && (
          <span className='rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800'>
            {t('auth.signedIn')}
          </span>
        )}
      </div>
      <p className='mt-2 text-sm text-gray-500'>{t('auth.signupSubtitle')}</p>

      <form onSubmit={onSubmit} className='mt-8 space-y-5'>
        {registerMutation.error && (
          <motion.div
            role='alert'
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className='flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800'
          >
            <AlertCircle className='mt-0.5 h-4 w-4 shrink-0' aria-hidden />
            {getUserFacingErrorMessage(
              registerMutation.error,
              t('auth.signupFailed'),
              t,
            )}
          </motion.div>
        )}

        <div>
          <label htmlFor='signup-username' className={labelClass}>
            {t('auth.username')}
          </label>
          <div className='relative'>
            <User className={fieldIconClass} aria-hidden />
            <Input
              id='signup-username'
              aria-invalid={errors.username ? true : undefined}
              aria-describedby={
                errors.username ? 'signup-username-error' : undefined
              }
              autoComplete='username'
              placeholder={t('auth.usernamePlaceholder')}
              disabled={pending}
              {...register('username')}
              className='ps-10'
            />
          </div>
          {errors.username?.message && (
            <div
              id='signup-username-error'
              role='alert'
              className={fieldErrorClass}
            >
              {t(errors.username.message)}
            </div>
          )}
        </div>

        <div>
          <label htmlFor='signup-email' className={labelClass}>
            {t('auth.email')}
          </label>
          <div className='relative'>
            <Mail className={fieldIconClass} aria-hidden />
            <Input
              id='signup-email'
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? 'signup-email-error' : undefined}
              type='email'
              autoComplete='email'
              placeholder='you@example.com'
              dir='ltr'
              disabled={pending}
              {...register('email')}
              className='ps-10'
            />
          </div>
          {errors.email?.message && (
            <div id='signup-email-error' role='alert' className={fieldErrorClass}>
              {t(errors.email.message)}
            </div>
          )}
        </div>

        <div>
          <label htmlFor='signup-password' className={labelClass}>
            {t('auth.password')}
          </label>
          <div className='relative'>
            <Lock className={fieldIconClass} aria-hidden />
            <Input
              id='signup-password'
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={
                errors.password ? 'signup-password-error' : undefined
              }
              type='password'
              autoComplete='new-password'
              placeholder='••••••••'
              disabled={pending}
              {...register('password')}
              className='ps-10'
            />
          </div>
          {errors.password?.message && (
            <div
              id='signup-password-error'
              role='alert'
              className={fieldErrorClass}
            >
              {t(errors.password.message)}
            </div>
          )}
        </div>

        <Button type='submit' className='w-full' disabled={pending}>
          {pending ? (
            <span className='inline-flex items-center gap-2'>
              <Loader2 className='h-4 w-4 animate-spin' />
              {t('auth.creating')}
            </span>
          ) : (
            t('auth.createAccount')
          )}
        </Button>

        <p className='text-center text-sm text-gray-500'>
          {hasAccountBefore}
          <Link
            className='font-semibold text-indigo-700 hover:underline'
            href='/auth/login'
          >
            {t('auth.login')}
          </Link>
          {hasAccountAfter}
        </p>
      </form>
    </AuthSplitLayout>
  );
}
