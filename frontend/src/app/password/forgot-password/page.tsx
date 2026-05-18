'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Loader2, ArrowLeft, Mail, Sparkles, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';
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

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
    setResetLink(null);
    setCopied(false);
    try {
      const res = await forgotMutation.mutateAsync(values.email);
      toast('Reset link generated successfully.', {
        title: 'Success',
        variant: 'success',
      });
      router.push(
        `/password/check-email?email=${encodeURIComponent(values.email)}`,
      );

      if (res?.resetPasswordLink) {
        setResetLink(String(res.resetPasswordLink));
      }
    } catch (err: any) {
      logErrorForDev(err);
      const msg = getUserFacingErrorMessage(err, 'Request failed');
      setError(msg);
      toast(msg, { title: 'Request failed', variant: 'error' });
    }
  });

  return (
    <div className='relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/25 bg-white/20 p-4 backdrop-blur-xl sm:p-6'>
      <motion.div
        aria-hidden
        className='pointer-events-none absolute -inset-24 opacity-70'
        animate={{ rotate: [0, 8, 0], scale: [1, 1.03, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'radial-gradient(closest-side, rgba(236,72,153,0.22), transparent 70%), radial-gradient(closest-side, rgba(99,102,241,0.22), transparent 70%), radial-gradient(closest-side, rgba(34,211,238,0.18), transparent 70%)',
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
            Password recovery
          </div>

          <h1 className='mt-4 text-4xl font-extrabold tracking-tight text-indigo-950'>
            Forgot your password?
          </h1>
          <p className='mt-2 text-sm font-semibold leading-7 text-indigo-950/80'>
            Enter your email and we’ll generate a secure reset link for your
            account.
          </p>

          <form
            onSubmit={onSubmit}
            className='mt-8 space-y-4'
          >
            <div>
              <label className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                Email
              </label>
              <div className='relative'>
                <Mail className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-950/60' />
                <Input
                  className='pl-10'
                  type='email'
                  placeholder='you@example.com'
                  {...register('email')}
                />
              </div>
              {errors.email?.message && (
                <div className='mt-2 text-sm font-semibold text-rose-700'>
                  {errors.email.message}
                </div>
              )}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className='rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm font-semibold text-rose-900'
              >
                {error}
              </motion.div>
            )}

            {resetLink && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className='rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm font-semibold text-emerald-900'
              >
                <div className='text-sm font-extrabold'>
                  Reset link generated
                </div>
                <div className='mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                  <a
                    className='min-w-0 break-all font-extrabold underline'
                    href={resetLink}
                  >
                    {resetLink}
                  </a>

                  <Button
                    type='button'
                    size='sm'
                    className='shrink-0'
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(resetLink);
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 1800);
                        toast('Reset link copied to clipboard.', {
                          title: 'Copied',
                          variant: 'success',
                          durationMs: 2200,
                        });
                      } catch {
                        setCopied(false);
                        toast('Copy failed. Please copy the link manually.', {
                          title: 'Copy failed',
                          variant: 'error',
                        });
                      }
                    }}
                  >
                    <span className='inline-flex items-center gap-2'>
                      {copied ? (
                        <>
                          <Check className='h-4 w-4' />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className='h-4 w-4' />
                          Copy
                        </>
                      )}
                    </span>
                  </Button>
                </div>
              </motion.div>
            )}

            <Button
              type='submit'
              className='w-full'
              disabled={forgotMutation.isPending || isSubmitting}
            >
              {forgotMutation.isPending || isSubmitting ? (
                <span className='inline-flex items-center gap-2'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Sending...
                </span>
              ) : (
                'Generate reset link'
              )}
            </Button>
          </form>
        </motion.section>
      </div>
    </div>
  );
}
