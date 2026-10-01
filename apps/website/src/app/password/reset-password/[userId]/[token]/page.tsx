'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { ArrowLeft, Lock, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from '@/lib/validation';
import { useResetPasswordMutation } from '@/hooks/password/passwordQuery';
import {
  getUserFacingErrorMessage,
  logErrorForDev,
} from '@/lib/userFacingError';
import { useTranslation } from '@/contexts/TranslationContext';

const fieldIconClass =
  'pointer-events-none absolute start-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400';
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700';
const fieldErrorClass = 'mt-1.5 text-xs font-medium text-red-600';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const params = useParams();
  const userId = params.userId as string;
  const token = params.token as string;
  const [success, setSuccess] = useState<string | null>(null);

  const resetMutation = useResetPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async (values) => {
    setSuccess(null);
    try {
      const res = await resetMutation.mutateAsync({
        userId,
        token,
        password: values.password,
      });
      const msg = res?.message || t('security.toast.updated');
      setSuccess(msg);
      reset();
      toast(msg, { title: t('common.success'), variant: 'success' });
      toast(t('password.redirecting'), {
        title: t('password.nextStep'),
        variant: 'info',
        durationMs: 2400,
      });
      window.setTimeout(() => {
        router.push('/auth/login');
      }, 2200);
    } catch (err) {
      logErrorForDev(err);
      const msg = getUserFacingErrorMessage(err, t('password.resetFailed'), t);
      toast(msg, { title: t('password.resetFailed'), variant: 'error' });
    }
  });

  const pending = resetMutation.isPending || isSubmitting;

  return (
    <AuthSplitLayout>
      <h1 className='text-2xl font-bold tracking-tight text-gray-900'>
        {t('password.resetTitle')}
      </h1>
      <p className='mt-2 text-sm text-gray-500'>
        {t('password.resetIntro', { count: 8 })}
      </p>

      <form onSubmit={onSubmit} className='mt-8 space-y-5'>
        <div>
          <label htmlFor='reset-password' className={labelClass}>
            {t('security.newPassword')}
          </label>
          <div className='relative'>
            <Lock className={fieldIconClass} aria-hidden />
            <Input
              id='reset-password'
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={
                errors.password ? 'reset-password-error' : undefined
              }
              className='ps-10'
              type='password'
              autoComplete='new-password'
              disabled={pending}
              {...register('password')}
            />
          </div>
          {errors.password?.message && (
            <div
              id='reset-password-error'
              role='alert'
              className={fieldErrorClass}
            >
              {t(errors.password.message)}
            </div>
          )}
        </div>

        <div>
          <label htmlFor='reset-confirmPassword' className={labelClass}>
            {t('password.confirmPassword')}
          </label>
          <div className='relative'>
            <Lock className={fieldIconClass} aria-hidden />
            <Input
              id='reset-confirmPassword'
              aria-invalid={errors.confirmPassword ? true : undefined}
              aria-describedby={
                errors.confirmPassword
                  ? 'reset-confirmPassword-error'
                  : undefined
              }
              className='ps-10'
              type='password'
              autoComplete='new-password'
              disabled={pending}
              {...register('confirmPassword')}
            />
          </div>
          {errors.confirmPassword?.message && (
            <div
              id='reset-confirmPassword-error'
              role='alert'
              className={fieldErrorClass}
            >
              {t(errors.confirmPassword.message)}
            </div>
          )}
        </div>

        {success && (
          <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900'>
            <div className='font-semibold'>{success}</div>
            <div className='mt-3 flex flex-col gap-2 sm:flex-row'>
              <Button
                type='button'
                size='sm'
                className='w-full sm:w-auto'
                onClick={() => router.push('/auth/login')}
              >
                {t('password.goToLogin')}
              </Button>
              <Button
                type='button'
                size='sm'
                className='w-full bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 sm:w-auto'
                onClick={() => router.push('/')}
              >
                {t('cartPage.browseCatalog')}
              </Button>
            </div>
          </div>
        )}

        <Button type='submit' className='w-full' disabled={pending}>
          {pending ? (
            <span className='inline-flex items-center gap-2'>
              <Loader2 className='h-4 w-4 animate-spin' />
              {t('password.saving')}
            </span>
          ) : (
            t('password.saveNewPassword')
          )}
        </Button>

        <div className='text-center'>
          <Link
            href='/auth/login'
            className='inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:underline'
          >
            <ArrowLeft className='h-4 w-4 rtl:-scale-x-100' aria-hidden />
            {t('password.backToLogin')}
          </Link>
        </div>
      </form>
    </AuthSplitLayout>
  );
}
