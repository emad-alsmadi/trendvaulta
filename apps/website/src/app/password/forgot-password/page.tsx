'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { AlertCircle, ArrowLeft, Loader2, Mail } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from '@/lib/validation';
import { useRouter } from 'next/navigation';
import { useForgotPasswordMutation } from '@/hooks/password/passwordQuery';
import {
  getUserFacingErrorMessage,
  logErrorForDev,
} from '@/lib/userFacingError';
import { useTranslation } from '@/contexts/TranslationContext';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const forgotMutation = useForgotPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await forgotMutation.mutateAsync(values.email);
      toast(t('password.linkGeneratedToast'), {
        title: t('common.success'),
        variant: 'success',
      });
      router.push(
        `/password/check-email?email=${encodeURIComponent(values.email)}`,
      );
    } catch (err) {
      logErrorForDev(err);
      const msg = getUserFacingErrorMessage(err, t('password.requestFailed'), t);
      setError(msg);
      toast(msg, { title: t('password.requestFailed'), variant: 'error' });
    }
  });

  const pending = forgotMutation.isPending || isSubmitting;

  return (
    <AuthSplitLayout>
      <h1 className='text-2xl font-bold tracking-tight text-gray-900'>
        {t('password.forgotTitle')}
      </h1>
      <p className='mt-2 text-sm text-gray-500'>{t('password.forgotIntro')}</p>

      <form onSubmit={onSubmit} className='mt-8 space-y-5'>
        {error && (
          <div
            role='alert'
            className='flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800'
          >
            <AlertCircle className='mt-0.5 h-4 w-4 shrink-0' aria-hidden />
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor='forgot-email'
            className='mb-1.5 block text-sm font-medium text-gray-700'
          >
            {t('password.emailAddress')}
          </label>
          <div className='relative'>
            <Mail
              className='pointer-events-none absolute start-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400'
              aria-hidden
            />
            <Input
              id='forgot-email'
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? 'forgot-email-error' : undefined}
              className='ps-10'
              type='email'
              autoComplete='email'
              placeholder='you@example.com'
              dir='ltr'
              disabled={pending}
              {...register('email')}
            />
          </div>
          {errors.email?.message && (
            <div
              id='forgot-email-error'
              role='alert'
              className='mt-1.5 text-xs font-medium text-red-600'
            >
              {t(errors.email.message)}
            </div>
          )}
        </div>

        <Button type='submit' className='w-full' disabled={pending}>
          {pending ? (
            <span className='inline-flex items-center gap-2'>
              <Loader2 className='h-4 w-4 animate-spin' />
              {t('password.sending')}
            </span>
          ) : (
            t('password.sendResetLink')
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
