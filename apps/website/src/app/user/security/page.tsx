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
import { useLogout } from '@/hooks/auth/authQuery';
import { useHasAuthToken } from '@/hooks/auth/useHasAuthToken';
import { getUserFacingErrorMessage } from '@/lib/userFacingError';
import { useProfile } from '@/hooks/profile/useProfile';
import { useTranslation } from '@/contexts/TranslationContext';
import {
  FIELD,
  FIELD_ERROR,
  FIELD_LABEL,
  PANEL,
  UserPageHeader,
} from '../UserPage';

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
  const isAuthenticated = useHasAuthToken();
  const changePassword = useChangePassword();
  const logout = useLogout();

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
    if (!isAuthenticated) {
      toast(t('security.toast.notAuthenticated'), { variant: 'error' });
      return;
    }
    try {
      await changePassword.mutateAsync({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      // The API revokes every session, this one included — sign out now
      // with a clear reason instead of a surprise logout at the next token
      // refresh (~15 min later).
      reset();
      await logout();
      toast(t('security.toast.signInAgain'), { variant: 'success' });
      router.push('/auth/login');
    } catch (err: unknown) {
      toast(getUserFacingErrorMessage(err, t('security.toast.updateFailed'), t), {
        variant: 'error',
      });
    }
  };

  const toggleClass =
    'absolute end-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-subtle transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30';
  const tips = [
    t('security.tipUnique'),
    t('security.tipMix'),
    t('security.tipPersonal'),
    t('security.tipManager'),
  ];

  return (
    <div className='space-y-6'>
      <UserPageHeader
        title={t('security.title')}
        subtitle={t('security.subtitle')}
      />

      <div className='grid gap-10 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-14'>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={PANEL}
        >
          <form onSubmit={handleSubmit(onSubmit)} className='max-w-md'>
            <h2 className='flex items-center gap-2.5 text-heading text-ink'>
              <Lock className='h-5 w-5' strokeWidth={1.5} aria-hidden />
              {t('security.changePassword')}
            </h2>

            <div className='mt-5 space-y-4'>
              <div>
                <label htmlFor='security-currentPassword' className={FIELD_LABEL}>
                  {t('security.currentPassword')}
                </label>
                <div className='relative'>
                  <Input
                    id='security-currentPassword'
                    className={`${FIELD} pe-11`}
                    aria-invalid={errors.currentPassword ? true : undefined}
                    aria-describedby={errors.currentPassword ? 'security-currentPassword-error' : undefined}
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
                    aria-pressed={showCurrent}
                    className={toggleClass}
                    aria-label={showCurrent ? t('security.hidePassword') : t('security.showPassword')}
                  >
                    {showCurrent ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p id='security-currentPassword-error' role='alert' className={FIELD_ERROR}>
                    {errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor='security-newPassword' className={FIELD_LABEL}>
                  {t('security.newPassword')}
                </label>
                <div className='relative'>
                  <Input
                    id='security-newPassword'
                    className={`${FIELD} pe-11`}
                    aria-invalid={errors.newPassword ? true : undefined}
                    aria-describedby={errors.newPassword ? 'security-newPassword-error' : undefined}
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
                    aria-pressed={showNew}
                    className={toggleClass}
                    aria-label={showNew ? t('security.hidePassword') : t('security.showPassword')}
                  >
                    {showNew ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p id='security-newPassword-error' role='alert' className={FIELD_ERROR}>
                    {errors.newPassword.message}
                  </p>
                )}

                {newPassword && (
                  <div className='mt-2.5 space-y-1.5'>
                    <div className='h-1 w-full overflow-hidden rounded-full bg-stone-200/70'>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width:
                            newPassword.length < 8
                              ? `${(newPassword.length / 8) * 100}%`
                              : '100%',
                        }}
                        className={`h-full rounded-full transition-colors ${
                          newPassword.length < 8
                            ? 'bg-amber-500'
                            : passwordsMatch
                              ? 'bg-emerald-500'
                              : 'bg-rose-500'
                        }`}
                      />
                    </div>
                    <p className='text-xs text-ink-muted'>
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
                <label htmlFor='security-confirmPassword' className={FIELD_LABEL}>
                  {t('security.confirmPassword')}
                </label>
                <div className='relative'>
                  <Input
                    id='security-confirmPassword'
                    className={`${FIELD} pe-11`}
                    aria-invalid={errors.confirmPassword ? true : undefined}
                    aria-describedby={errors.confirmPassword ? 'security-confirmPassword-error' : undefined}
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
                    aria-pressed={showConfirm}
                    className={toggleClass}
                    aria-label={showConfirm ? t('security.hidePassword') : t('security.showPassword')}
                  >
                    {showConfirm ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p id='security-confirmPassword-error' role='alert' className={FIELD_ERROR}>
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            <Button
              type='submit'
              variant='solid'
              className='mt-6 w-full rounded-full'
              disabled={changePassword.isPending || !passwordsMatch}
            >
              {changePassword.isPending ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
                  {t('security.updating')}
                </>
              ) : (
                t('security.updatePassword')
              )}
            </Button>

            <p className='mt-3 text-center text-xs text-ink-subtle'>
              {t('security.minLengthHint')}
            </p>
          </form>
        </motion.div>

        <div className='space-y-10'>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className={PANEL}
          >
            <h2 className='flex items-center gap-2.5 text-heading text-ink'>
              <Shield className='h-5 w-5' strokeWidth={1.5} aria-hidden />
              {t('security.tipsTitle')}
            </h2>
            <ul className='mt-4 space-y-3 text-sm text-ink-muted'>
              {tips.map((tip) => (
                <li key={tip} className='flex items-start gap-2.5'>
                  <CheckCircle
                    className='mt-0.5 h-4 w-4 shrink-0 text-ink'
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  {tip}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className={PANEL}
          >
            <h2 className='text-heading text-ink'>
              {t('security.sessionsTitle')}
            </h2>
            <p className='mt-2 text-sm leading-relaxed text-ink-muted'>
              {t('security.sessionsBody')}
            </p>
            <div className='mt-5 flex items-center justify-between gap-3'>
              <div className='min-w-0'>
                <p className='truncate text-sm font-semibold text-ink'>
                  {t('security.currentSession')}
                </p>
                <p className='truncate text-xs text-ink-muted'>
                  {t('security.thisDeviceActiveNow')}
                </p>
              </div>
              <span className='inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white'>
                <span aria-hidden className='h-1.5 w-1.5 rounded-full bg-emerald-400' />
                {t('security.active')}
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}