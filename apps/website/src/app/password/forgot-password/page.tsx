'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Loader2, ArrowLeft, Mail, Sparkles, Copy, Check } from 'lucide-react';
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
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Breadcrumb */}
        <nav className='flex items-center gap-2 text-sm text-gray-600 mb-8'>
          <Link
            href='/'
            className='hover:text-fuchsia-600'
          >
            Home
          </Link>
          <span>/</span>
          <span className='text-gray-900'>Forgot Password</span>
        </nav>

        <div className='max-w-md mx-auto'>
          <div className='bg-white rounded-lg border border-gray-200 p-8'>
            <div className='flex items-center gap-2 mb-6'>
              <Sparkles className='w-5 h-5 text-fuchsia-600' />
              <h1 className='text-2xl font-bold text-gray-900'>
                Forgot Password
              </h1>
            </div>

            <p className='text-gray-600 mb-6'>
              Enter your email address and we'll send you a link to reset your
              password.
            </p>

            <form
              onSubmit={onSubmit}
              className='space-y-4'
            >
              <div>
                <label className='block text-sm font-bold text-gray-900 mb-2'>
                  Email Address
                </label>
                <div className='relative'>
                  <Mail className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400' />
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
                <div className='rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-900'>
                  {error}
                </div>
              )}

              {resetLink && (
                <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900'>
                  <div className='font-bold mb-2'>Reset link generated</div>
                  <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                    <a
                      className='min-w-0 break-all font-bold underline'
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
                </div>
              )}

              <Button
                type='submit'
                className='w-full bg-fuchsia-600 text-white hover:bg-fuchsia-700'
                disabled={forgotMutation.isPending || isSubmitting}
              >
                {forgotMutation.isPending || isSubmitting ? (
                  <span className='inline-flex items-center gap-2'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Sending...
                  </span>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>

            <div className='mt-6 pt-6 border-t border-gray-200 text-center'>
              <Link
                href='/auth/login'
                className='inline-flex items-center gap-2 text-sm font-semibold text-fuchsia-600 hover:text-fuchsia-700 transition'
              >
                <ArrowLeft className='w-4 h-4' />
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
