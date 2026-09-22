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
import { useProfile } from '@/hooks/profile/useProfile';

type PasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function SecurityPage() {
  const router = useRouter();
  const { toast } = useToast();
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
      toast('Password updated successfully', { variant: 'success' });
      reset();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password';
      toast(message, { variant: 'error' });
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
              Security
            </div>
            <h1 className='mt-4 text-3xl font-extrabold tracking-tight text-indigo-950 sm:text-4xl'>
              Password & Security
            </h1>
            <p className='mt-2 text-sm font-semibold text-indigo-950/80'>
              Update your password to keep your account secure.
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
              Change Password
            </h2>

            <div className='space-y-4'>
              <div>
                <label className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                  Current Password
                </label>
                <div className='relative'>
                  <Input
                    type={showCurrent ? 'text' : 'password'}
                    placeholder='Enter current password'
                    autoComplete='current-password'
                    {...register('currentPassword', {
                      required: 'Current password is required',
                    })}
                  />
                  <button
                    type='button'
                    onClick={() => setShowCurrent(!showCurrent)}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-indigo-950/50 hover:text-indigo-950'
                    aria-label={showCurrent ? 'Hide password' : 'Show password'}
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
                  New Password
                </label>
                <div className='relative'>
                  <Input
                    type={showNew ? 'text' : 'password'}
                    placeholder='Enter new password (min 8 characters)'
                    autoComplete='new-password'
                    {...register('newPassword', {
                      required: 'New password is required',
                      minLength: {
                        value: 8,
                        message: 'Password must be at least 8 characters',
                      },
                    })}
                  />
                  <button
                    type='button'
                    onClick={() => setShowNew(!showNew)}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-indigo-950/50 hover:text-indigo-950'
                    aria-label={showNew ? 'Hide password' : 'Show password'}
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
                        ? `${8 - newPassword.length} more characters needed`
                        : passwordsMatch
                        ? 'Passwords match'
                        : 'Passwords do not match'}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                  Confirm New Password
                </label>
                <div className='relative'>
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder='Confirm new password'
                    autoComplete='new-password'
                    {...register('confirmPassword', {
                      required: 'Please confirm your new password',
                      validate: (value) =>
                        value === newPassword || 'Passwords do not match',
                    })}
                  />
                  <button
                    type='button'
                    onClick={() => setShowConfirm(!showConfirm)}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-indigo-950/50 hover:text-indigo-950'
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
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
                  Updating…
                </span>
              ) : (
                <>
                  <CheckCircle className='mr-2 h-4 w-4' />
                  Update Password
                </>
              )}
            </Button>

            <p className='text-center text-xs text-indigo-950/50'>
              Your password must be at least 8 characters long.
            </p>
          </div>
        </form>

        <div className='mt-8 pt-6 border-t border-white/30'>
          <h3 className='mb-4 text-lg font-bold text-indigo-950 flex items-center gap-2'>
            <Shield className='h-5 w-5' />
            Security Tips
          </h3>
          <ul className='space-y-2 text-sm font-semibold text-indigo-950/70'>
            <li className='flex items-center gap-2'>
              <CheckCircle className='h-4 w-4 text-emerald-600' />
              Use a unique password you don't use elsewhere
            </li>
            <li className='flex items-center gap-2'>
              <CheckCircle className='h-4 w-4 text-emerald-600' />
              Include uppercase, lowercase, numbers, and symbols
            </li>
            <li className='flex items-center gap-2'>
              <CheckCircle className='h-4 w-4 text-emerald-600' />
              Avoid personal information (name, birthdate, etc.)
            </li>
            <li className='flex items-center gap-2'>
              <CheckCircle className='h-4 w-4 text-emerald-600' />
              Consider using a password manager
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
          Active Sessions
        </h3>
        <p className='text-sm font-semibold text-indigo-950/70'>
          Changing your password will sign you out of all other devices for security.
        </p>
        <div className='mt-4 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center'>
              <Shield className='h-5 w-5 text-indigo-600' />
            </div>
            <div>
              <p className='font-medium text-indigo-950'>Current Session</p>
              <p className='text-sm text-indigo-950/60'>This device · Active now</p>
            </div>
          </div>
          <span className='inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'>
            Active
          </span>
        </div>
      </motion.div>
    </div>
  );
}