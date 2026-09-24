'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Lock, Sparkles, Loader2 } from 'lucide-react';
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

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Breadcrumb */}
        <nav className='flex items-center gap-2 text-sm text-gray-600 mb-8'>
          <Link
            href='/'
            className='hover:text-fuchsia-600'
          >
            {t('common.home')}
          </Link>
          <span>/</span>
          <span className='text-gray-900'>{t('password.resetTitle')}</span>
        </nav>

        <div className='max-w-md mx-auto'>
          <div className='bg-white rounded-lg border border-gray-200 p-8'>
            <div className='flex items-center gap-2 mb-6'>
              <Sparkles className='w-5 h-5 text-fuchsia-600' />
              <h1 className='text-2xl font-bold text-gray-900'>
                {t('password.resetTitle')}
              </h1>
            </div>

            <p className='text-gray-600 mb-6'>
              {t('password.resetIntro', { count: 8 })}
            </p>

            <form
              onSubmit={onSubmit}
              className='space-y-4'
            >
              <div>
                <label className='block text-sm font-bold text-gray-900 mb-2'>
                  {t('security.newPassword')}
                </label>
                <div className='relative'>
                  <Lock className='pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400' />
                  <Input
                    className='ps-10'
                    type='password'
                    {...register('password')}
                  />
                </div>
                {errors.password?.message && (
                  <div className='mt-2 text-sm font-semibold text-rose-700'>
                    {t(errors.password.message)}
                  </div>
                )}
              </div>

              <div>
                <label className='block text-sm font-bold text-gray-900 mb-2'>
                  {t('password.confirmPassword')}
                </label>
                <Input
                  type='password'
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword?.message && (
                  <div className='mt-2 text-sm font-semibold text-rose-700'>
                    {t(errors.confirmPassword.message)}
                  </div>
                )}
              </div>

              {success && (
                <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900'>
                  <div className='font-bold'>{success}</div>
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

              <Button
                type='submit'
                className='w-full bg-fuchsia-600 text-white hover:bg-fuchsia-700'
                disabled={resetMutation.isPending || isSubmitting}
              >
                {resetMutation.isPending || isSubmitting ? (
                  <span className='inline-flex items-center gap-2'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    {t('password.saving')}
                  </span>
                ) : (
                  t('password.saveNewPassword')
                )}
              </Button>
            </form>

            <div className='mt-6 pt-6 border-t border-gray-200 text-center'>
              <Link
                href='/auth/login'
                className='inline-flex items-center gap-2 text-sm font-semibold text-fuchsia-600 hover:text-fuchsia-700 transition'
              >
                <ArrowLeft className='w-4 h-4 rtl:-scale-x-100' />
                {t('password.backToLogin')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
