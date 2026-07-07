'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Pencil, Save } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { editProfileSchema, type EditProfileValues } from '@/lib/validation';
import { useMe, useUpdateProfile } from '@/hooks/auth/authQuery';
import {
  getUserFacingErrorMessage,
  logErrorForDev,
} from '@/lib/userFacingError';
import { useConfirm } from '@/components/confirm/ConfirmProvider';

export default function EditProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const meQuery = useMe();
  const updateProfile = useUpdateProfile();
  const confirm = useConfirm();
  const user = meQuery.data?.user || null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditProfileValues>({
    resolver: zodResolver(editProfileSchema),
    values: {
      username: user?.username || '',
      email: user?.email || '',
    },
    mode: 'onTouched',
  });

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  if (meQuery.isLoading) return null;
  if (!user) return null;

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
          href='/profile'
          onClick={(e) => {
            if (!isDirty) return;
            e.preventDefault();
            void confirm({
              variant: 'warning',
              title: 'Discard your changes?',
              description:
                'You have unsaved edits. Leave without saving?',
              confirmLabel: 'Discard',
              cancelLabel: 'Keep editing',
              onConfirm: async () => {
                router.push('/profile');
              },
            });
          }}
          className='inline-flex items-center gap-2 text-sm font-extrabold text-indigo-700'
        >
          <ArrowLeft className='h-4 w-4' />
          Back to profile
        </Link>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className='rounded-3xl border border-white/30 bg-white/35 p-6 shadow-sm backdrop-blur-xl sm:p-8'
        >
          <div className='flex items-start justify-between gap-4'>
            <div className='min-w-0'>
              <div className='inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/40 px-3 py-1 text-xs font-extrabold text-indigo-950'>
                <Pencil className='h-4 w-4 text-fuchsia-700' />
                Edit Profile
              </div>
              <h1 className='mt-4 text-4xl font-extrabold tracking-tight text-indigo-950'>
                Update your info
              </h1>
              <p className='mt-2 text-sm font-semibold text-indigo-950/80'>
                Update your profile information below.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit((data) => {
              void confirm({
                variant: 'neutral',
                title: 'Save profile changes?',
                description:
                  'Your username and email will be updated for this account.',
                confirmLabel: 'Save changes',
                cancelLabel: 'Keep editing',
                onConfirm: async () => {
                  try {
                    await updateProfile.mutateAsync({
                      username: data.username || '',
                      email: data.email || '',
                    });
                    toast('Profile updated successfully!', {
                      title: 'Success',
                      variant: 'success',
                    });
                  } catch (error: unknown) {
                    logErrorForDev(error);
                    const msg = getUserFacingErrorMessage(
                      error,
                      'Failed to update profile',
                    );
                    toast(msg, { title: 'Error', variant: 'error' });
                    throw error;
                  }
                },
              });
            })}
            className='mt-6 space-y-4'
          >
            <div>
              <label className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                Username
              </label>
              <Input
                placeholder='Your name'
                {...register('username')}
              />
              {errors.username?.message && (
                <div className='mt-2 text-sm font-semibold text-rose-700'>
                  {errors.username.message}
                </div>
              )}
            </div>

            <div>
              <label className='mb-2 block text-sm font-extrabold text-indigo-950/80'>
                Email
              </label>
              <Input
                type='email'
                placeholder='you@example.com'
                {...register('email')}
              />
              {errors.email?.message && (
                <div className='mt-2 text-sm font-semibold text-rose-700'>
                  {errors.email.message}
                </div>
              )}
            </div>

            <Button
              type='submit'
              className='w-full rounded-full bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-500 text-white shadow-md transition hover:brightness-110 active:brightness-95 disabled:opacity-60'
              size='lg'
              disabled={isSubmitting}
            >
              <span className='inline-flex items-center gap-2'>
                <Save className='h-4 w-4' />
                {isSubmitting ? 'Saving...' : 'Save changes'}
              </span>
            </Button>
          </form>
        </motion.section>
      </div>
    </div>
  );
}
