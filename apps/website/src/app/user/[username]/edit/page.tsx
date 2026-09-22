'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useMe, useUpdateProfile } from '@/hooks/auth/authQuery';
import { getAuthToken } from '@/lib/authCookies';
import { buildLoginUrl } from '@/lib/safeRedirect';
import {
  getUserFacingErrorMessage,
  logErrorForDev,
} from '@/lib/userFacingError';

/** Edit profile — PUT /api/auth/profile (username, email) */
export default function EditProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const meQuery = useMe();
  const updateProfile = useUpdateProfile();
  const user = meQuery.data?.user || null;

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) router.replace(buildLoginUrl(pathname));
  }, [router, pathname]);

  // Seed the form once the profile arrives (keeps edits if it refetches).
  useEffect(() => {
    if (user && !seeded) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setSeeded(true);
    }
  }, [user, seeded]);

  const trimmedUsername = username.trim();
  const trimmedEmail = email.trim();
  const usernameError =
    trimmedUsername.length > 0 && trimmedUsername.length < 3
      ? 'Username must be at least 3 characters'
      : null;
  const emailError =
    trimmedEmail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
      ? 'Enter a valid email address'
      : null;
  const unchanged =
    trimmedUsername === (user?.username || '') &&
    trimmedEmail.toLowerCase() === (user?.email || '').toLowerCase();
  const canSave =
    !updateProfile.isPending &&
    trimmedUsername.length >= 3 &&
    trimmedEmail.length > 0 &&
    !usernameError &&
    !emailError &&
    !unchanged;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    try {
      const res = await updateProfile.mutateAsync({
        username: trimmedUsername,
        email: trimmedEmail,
      });
      toast('Profile updated', { title: 'Saved', variant: 'success' });
      const nextName = res?.user?.username || trimmedUsername;
      router.push(`/user/${encodeURIComponent(nextName)}`);
    } catch (err) {
      logErrorForDev(err);
      toast(getUserFacingErrorMessage(err, 'Could not update your profile'), {
        title: 'Update failed',
        variant: 'error',
      });
    }
  };

  if (meQuery.isLoading || (!user && getAuthToken())) {
    return (
      <div className='animate-pulse'>
        <div className='mb-8 h-8 w-48 rounded bg-gray-200' />
        <div className='h-64 rounded bg-gray-200' />
      </div>
    );
  }

  if (!user) return null;

  const backHref = `/user/${encodeURIComponent(
    user.username || (user.email || '').split('@')[0],
  )}`;

  return (
    <>
      <h1 className='mb-6 text-2xl font-bold text-gray-900'>Edit profile</h1>

      <form
        onSubmit={onSubmit}
        className='rounded-lg border border-gray-200 bg-white p-6'
        noValidate
      >
        <div className='grid gap-6 md:grid-cols-2'>
          <div>
            <label
              htmlFor='profile-username'
              className='mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500'
            >
              Username
            </label>
            <Input
              id='profile-username'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete='username'
              maxLength={200}
              disabled={updateProfile.isPending}
            />
            {usernameError && (
              <p className='mt-2 text-sm font-semibold text-rose-700'>
                {usernameError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor='profile-email'
              className='mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500'
            >
              Email
            </label>
            <Input
              id='profile-email'
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete='email'
              maxLength={100}
              disabled={updateProfile.isPending}
            />
            {emailError && (
              <p className='mt-2 text-sm font-semibold text-rose-700'>
                {emailError}
              </p>
            )}
          </div>
        </div>

        <div className='mt-6 flex flex-wrap items-center gap-3'>
          <Button type='submit' disabled={!canSave} className='gap-2'>
            {updateProfile.isPending ? (
              <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
            ) : (
              <Save className='h-4 w-4' aria-hidden />
            )}
            Save changes
          </Button>
          <Link
            href={backHref}
            className='text-sm font-semibold text-gray-600 hover:text-gray-900'
          >
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
