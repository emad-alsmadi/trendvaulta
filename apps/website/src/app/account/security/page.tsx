'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useForm } from 'react-hook-form';
import { useChangePassword } from '@/hooks/auth/useChangePassword';
import { getAuthToken } from '@/lib/authCookies';
import { getUserFacingErrorMessage } from '@/lib/userFacingError';
import { useProfile } from '@/hooks/profile/useProfile';
import { useTranslation } from '@/contexts/TranslationContext';

type PasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function SecurityPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { data: profile } = useProfile();
  const changePassword = useChangePassword();

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<PasswordFormValues>({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onTouched',
  });

  const newPassword = watch('newPassword');
  const confirmPassword = watch('confirmPassword');

  const passwordsMatch = newPassword === confirmPassword && newPassword.length >= 8;

  const onSubmit = async (data: PasswordFormValues) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast(t('security.toast.updated'), { variant: 'success' });
      reset();
    } catch (err: unknown) {
      toast(getUserFacingErrorMessage(err, t('security.toast.updateFailed')), {
        variant: 'error',
      });
    }
  };

  if (!getAuthToken()) {
    router.push('/auth/login');
    return null;
  }

  return (
    <div className='space-y-6'>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className='rounded-3xl border border-white/40 bg-white/55 p-6 shadow-sm backdrop-blur-xl'
      >
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div>
            <div className='inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/40 px-3 py-1 text-xs font-extrabold text-indigo-950'>
              <Shield className='h-4 w-4 text-fuchsia-700' />
              {t('common.security')}
            </div>
            <h1 className='mt-4 text-3xl font-extrabold tracking-tight text-indigo-950 sm:text-4xl'>
              {t('security.title')}
            </h1>
            <p className='mt-2 text-sm font-semibold text-indigo-950/80'>
              {t('security.subtitle')}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className='rounded-3xl border border-white/30 bg-white/35 p-6 shadow-sm backdrop-blur-xl'
      >
        <form onSubmit={handleSubmit(onSubmit)} className='space-y-6 max-w-md'>
          <div>
            <h2 className='mb-4 text-lg font-bold text-indigo-950 flex items-center gap-2'>
              <Lock className='h-5 w-5' />
              {t('security.changePassword')}
            </h2>

            <div className='space-y-4'>
              <div>
                <label className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                  {t('security.currentPassword')}
                </label>
                <div className='relative'>
                  <Input
                    type={showCurrent ? 'text' : 'password'}
                    placeholder={t('security.currentPasswordPlaceholder')}
                    autoComplete='current-password'
                    {...register('currentPassword', {
                      required: t('security.validation.currentRequired'),
                    })}
                  />
                  <button
                    type='button'
                    onClick={() => setShowCurrent(!showCurrent)}
                    className='absolute end-3 top-1/2 -translate-y-1/2 text-indigo-950/50 hover:text-indigo-950'
                    aria-label={showCurrent ? t('security.hidePassword') : t('security.showPassword')}
                  >
                    {showCurrent ? <EyeOff className='h-5 w-5' /> : <Eye className='h-5 w-5' />}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className='mt-1 text-sm font-semibold text-rose-600'>{errors.currentPassword.message}</p>
                )}
              </div>

              <div>
                <label className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                  {t('security.newPassword')}
                </label>
                <div className='relative'>
                  <Input
                    type={showNew ? 'text' : 'password'}
                    placeholder={t('security.newPasswordPlaceholder')}
                    autoComplete='new-password'
                    {...register('newPassword', {
                      required: t('security.validation.newRequired'),
                      minLength: {
                        value: 8,
                        message: t('security.validation.minLength'),
                      },
                    })}
                  />
                  <button
                    type='button'
                    onClick={() => setShowNew(!showNew)}
                    className='absolute end-3 top-1/2 -translate-y-1/2 text-indigo-950/50 hover:text-indigo-950'
                    aria-label={showNew ? t('security.hidePassword') : t('security.showPassword')}
                  >
                    {showNew ? <EyeOff className='h-5 w-5' /> : <Eye className='h-5 w-5' />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className='mt-1 text-sm font-semibold text-rose-600'>{errors.newPassword.message}</p>
                )}

                {newPassword && (
                  <div className='mt-2 space-y-1'>
                    <div className='h-1.5 w-full rounded-full bg-indigo-950/10 overflow-hidden'>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width:
                            newPassword.length < 8
                              ? `${(newPassword.length / 8) * 100}%`
                              : '100%',
                        }}
                        className={`h-full transition-colors ${
                          newPassword.length < 8
                            ? 'bg-amber-500'
                            : passwordsMatch
                            ? 'bg-emerald-500'
                            : 'bg-rose-500'
                        }`}
                      />
                    </div>
                    <p className='text-xs font-semibold text-indigo-950/60'>
                      {newPassword.length < 8
                        ? t('security.charsNeeded', { count: 8 - newPassword.length })
                        : passwordsMatch
                        ? t('security.passwordsMatch')
                        : t('security.validation.mismatch')}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                  {t('security.confirmPassword')}
                </label>
                <div className='relative'>
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder={t('security.confirmPasswordPlaceholder')}
                    autoComplete='new-password'
                    {...register('confirmPassword', {
                      required: t('security.validation.confirmRequired'),
                      validate: (value) =>
                        value === newPassword || t('security.validation.mismatch'),
                    })}
                  />
                  <button
                    type='button'
                    onClick={() => setShowConfirm(!showConfirm)}
                    className='absolute end-3 top-1/2 -translate-y-1/2 text-indigo-950/50 hover:text-indigo-950'
                    aria-label={showConfirm ? t('security.hidePassword') : t('security.showPassword')}
                  >
                    {showConfirm ? <EyeOff className='h-5 w-5' /> : <Eye className='h-5 w-5' />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className='mt-1 text-sm font-semibold text-rose-600'>{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <Button
              type='submit'
              size='lg'
              className='w-full rounded-full bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-500 text-white shadow-md transition hover:brightness-110 active:brightness-95'
              disabled={changePassword.isPending || !passwordsMatch}
            >
              {changePassword.isPending ? (
                <span className='inline-flex items-center gap-2'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  {t('security.updating')}
                </span>
              ) : (
                <>
                  <CheckCircle className='me-2 h-4 w-4' />
                  {t('security.updatePassword')}
                </>
              )}
            </Button>

            <p className='text-center text-xs text-indigo-950/50'>
              {t('security.minLengthHint')}
            </p>
          </div>
        </form>

        <div className='mt-8 pt-6 border-t border-white/30'>
          <h3 className='mb-4 text-lg font-bold text-indigo-950 flex items-center gap-2'>
            <Shield className='h-5 w-5' />
            {t('security.tipsTitle')}
          </h3>
          <ul className='space-y-2 text-sm font-semibold text-indigo-950/70'>
            <li className='flex items-center gap-2'>
              <CheckCircle className='h-4 w-4 text-emerald-600' />
              {t('security.tipUnique')}
            </li>
            <li className='flex items-center gap-2'>
              <CheckCircle className='h-4 w-4 text-emerald-600' />
              {t('security.tipMix')}
            </li>
            <li className='flex items-center gap-2'>
              <CheckCircle className='h-4 w-4 text-emerald-600' />
              {t('security.tipPersonal')}
            </li>
            <li className='flex items-center gap-2'>
              <CheckCircle className='h-4 w-4 text-emerald-600' />
              {t('security.tipManager')}
            </li>
          </ul>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className='rounded-3xl border border-white/30 bg-white/35 p-6 shadow-sm backdrop-blur-xl'
      >
        <h3 className='mb-4 text-lg font-bold text-indigo-950 flex items-center gap-2'>
          <Shield className='h-5 w-5' />
          {t('security.sessionsTitle')}
        </h3>
        <p className='text-sm font-semibold text-indigo-950/70'>
          {t('security.sessionsBody')}
        </p>
        <div className='mt-4 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center'>
              <Shield className='h-5 w-5 text-indigo-600' />
            </div>
            <div>
              <p className='font-medium text-indigo-950'>{t('security.currentSession')}</p>
              <p className='text-sm text-indigo-950/60'>{t('security.thisDeviceActiveNow')}</p>
            </div>
          </div>
          <span className='inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'>
            {t('security.active')}
          </span>
        </div>
      </motion.div>
    </div>
  );
}