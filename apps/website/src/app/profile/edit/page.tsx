'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

  if (meQuery.isLoading) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='animate-pulse'>
            <div className='h-8 bg-gray-200 rounded w-48 mb-8'></div>
            <div className='h-64 bg-gray-200 rounded'></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

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
          <Link
            href='/profile'
            className='hover:text-fuchsia-600'
          >
            Profile
          </Link>
          <span>/</span>
          <span className='text-gray-900'>Edit Profile</span>
        </nav>

        <div className='flex gap-8'>
          {/* Sidebar */}
          <aside className='w-64 flex-shrink-0 hidden lg:block'>
            <div className='bg-white rounded-lg border border-gray-200 p-4 sticky top-8'>
              <h3 className='font-bold text-gray-900 mb-4'>Account</h3>
              <nav className='space-y-1'>
                <Link
                  href='/profile'
                  className='block px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-fuchsia-600 transition'
                >
                  Profile
                </Link>
                <Link
                  href='/orders'
                  className='block px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-fuchsia-600 transition'
                >
                  Orders
                </Link>
                <Link
                  href='/downloads'
                  className='block px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-fuchsia-600 transition'
                >
                  Downloads
                </Link>
                <Link
                  href='/wishlist'
                  className='block px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-fuchsia-600 transition'
                >
                  Wishlist
                </Link>
                <Link
                  href='/reviews'
                  className='block px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-fuchsia-600 transition'
                >
                  Reviews
                </Link>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <div className='flex-1 max-w-2xl'>
            <div className='mb-6'>
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
                className='inline-flex items-center gap-2 text-sm font-semibold text-fuchsia-600 hover:text-fuchsia-700 transition'
              >
                <ArrowLeft className='w-4 h-4' />
                Back to profile
              </Link>
            </div>

            <div className='bg-white rounded-lg border border-gray-200 p-6'>
              <div className='flex items-center gap-2 mb-6'>
                <Pencil className='w-5 h-5 text-fuchsia-600' />
                <h1 className='text-2xl font-bold text-gray-900'>
                  Edit Profile
                </h1>
              </div>

              <p className='text-gray-600 mb-6'>
                Update your profile information below. All fields are required.
              </p>

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
                className='space-y-6'
              >
                <div>
                  <label className='block text-sm font-bold text-gray-900 mb-2'>
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
                  <label className='block text-sm font-bold text-gray-900 mb-2'>
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

                <div className='pt-4 border-t border-gray-200'>
                  <Button
                    type='submit'
                    className='w-full bg-fuchsia-600 text-white hover:bg-fuchsia-700'
                    size='lg'
                    disabled={isSubmitting}
                  >
                    <span className='inline-flex items-center gap-2'>
                      <Save className='w-4 h-4' />
                      {isSubmitting ? 'Saving...' : 'Save changes'}
                    </span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
