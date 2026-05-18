'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Lock, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
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

export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
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
      const msg = res?.message || 'Password updated successfully';
      setSuccess(msg);
      reset();
      toast(msg, { title: 'Success', variant: 'success' });
      toast('Redirecting you to login...', {
        title: 'Next step',
        variant: 'info',
        durationMs: 2400,
      });
      window.setTimeout(() => {
        router.push('/auth/login');
      }, 2200);
    } catch (err: any) {
      logErrorForDev(err);
      const msg = getUserFacingErrorMessage(err, 'Reset failed');
      toast(msg, { title: 'Reset failed', variant: 'error' });
    }
  });

  return (
    <div className='relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/25 bg-white/20 p-4 backdrop-blur-xl sm:p-6'>
      <motion.div
        aria-hidden
        className='pointer-events-none absolute -inset-24 opacity-70'
        animate={{ rotate: [0, -8, 0], scale: [1, 1.03, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'radial-gradient(closest-side, rgba(245,158,11,0.18), transparent 70%), radial-gradient(closest-side, rgba(236,72,153,0.20), transparent 70%), radial-gradient(closest-side, rgba(99,102,241,0.20), transparent 70%)',
        }}
      />

      <div className='relative mx-auto max-w-3xl space-y-4'>
        <Link
          href='/auth/login'
          className='inline-flex items-center gap-2 text-sm font-extrabold text-indigo-700'
        >
          <ArrowLeft className='h-4 w-4' />
          Back to login
        </Link>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className='rounded-3xl border border-white/30 bg-white/35 p-6 shadow-sm backdrop-blur-xl sm:p-8'
        >
          <div className='inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/40 px-3 py-1 text-xs font-extrabold text-indigo-950'>
            <Sparkles className='h-4 w-4 text-fuchsia-700' />
            Reset password
          </div>

          <h1 className='mt-4 text-4xl font-extrabold tracking-tight text-indigo-950'>
            Create a new password
          </h1>
          <p className='mt-2 text-sm font-semibold leading-7 text-indigo-950/80'>
            Choose a strong password (at least 8 characters) and confirm it.
          </p>

          <form
            onSubmit={onSubmit}
            className='mt-8 space-y-4'
          >
            <div>
              <label className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                New password
              </label>
              <div className='relative'>
                <Lock className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-950/60' />
                <Input
                  className='pl-10'
                  type='password'
                  {...register('password')}
                />
              </div>
              {errors.password?.message && (
                <div className='mt-2 text-sm font-semibold text-rose-700'>
                  {errors.password.message}
                </div>
              )}
            </div>

            <div>
              <label className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                Confirm password
              </label>
              <Input
                type='password'
                {...register('confirmPassword')}
              />
              {errors.confirmPassword?.message && (
                <div className='mt-2 text-sm font-semibold text-rose-700'>
                  {errors.confirmPassword.message}
                </div>
              )}
            </div>

            {success && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className='rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm font-semibold text-emerald-900'
              >
                <div className='text-sm font-extrabold'>{success}</div>
                <div className='mt-3 flex flex-col gap-2 sm:flex-row'>
                  <Button
                    type='button'
                    size='sm'
                    className='w-full sm:w-auto'
                    onClick={() => router.push('/auth/login')}
                  >
                    Go to login
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    className='w-full bg-white/40 text-indigo-950 hover:bg-white/55 sm:w-auto'
                    onClick={() => router.push('/')}
                  >
                    Browse templates
                  </Button>
                </div>
              </motion.div>
            )}

            <Button
              type='submit'
              className='w-full'
              disabled={resetMutation.isPending || isSubmitting}
            >
              {resetMutation.isPending || isSubmitting ? (
                <span className='inline-flex items-center gap-2'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Saving...
                </span>
              ) : (
                'Save new password'
              )}
            </Button>
          </form>
        </motion.section>
      </div>
    </div>
  );
}
