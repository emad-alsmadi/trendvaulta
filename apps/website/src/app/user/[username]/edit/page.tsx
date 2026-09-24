'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/contexts/TranslationContext';
import { useMe, useUpdateProfile, type MeResponse } from '@/hooks/auth/authQuery';
import { getAuthToken } from '@/lib/authCookies';
import { buildLoginUrl } from '@/lib/safeRedirect';
import {
  getUserFacingErrorMessage,
  logErrorForDev,
} from '@/lib/userFacingError';

/** Edit profile — PUT /api/auth/profile (username, email) */
type ProfileUser = NonNullable<MeResponse['user']>;

export default function EditProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const meQuery = useMe();
  const user = meQuery.data?.user || null;

  useEffect(() => {
    if (!getAuthToken()) router.replace(buildLoginUrl(pathname));
  }, [router, pathname]);

  if (meQuery.isLoading || (!user && getAuthToken())) {
    return (
      <div className='animate-pulse'>
        <div className='mb-8 h-8 w-48 rounded bg-gray-200' />
        <div className='h-64 rounded bg-gray-200' />
      </div>
    );
  }

  if (!user) return null;

  // Keyed on the account so the form re-initialises if the user changes.
  return <EditProfileForm key={user._id ?? user.email} user={user} />;
}

function EditProfileForm({ user }: { user: ProfileUser }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const updateProfile = useUpdateProfile();

  const [username, setUsername] = useState(user.username || '');
  const [email, setEmail] = useState(user.email || '');

  const trimmedUsername = username.trim();
  const trimmedEmail = email.trim();
  const usernameError =
    trimmedUsername.length > 0 && trimmedUsername.length < 3
      ? 'userArea.edit.usernameMin'
      : null;
  const emailError =
    trimmedEmail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
      ? 'auth.validation.emailInvalid'
      : null;
  const unchanged =
    trimmedUsername === (user.username || '') &&
    trimmedEmail.toLowerCase() === (user.email || '').toLowerCase();
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
      await updateProfile.mutateAsync({
        username: trimmedUsername,
        email: trimmedEmail,
      });
      toast(t('userArea.edit.updated'), {
        title: t('userArea.edit.savedTitle'),
        variant: 'success',
      });
      router.push('/account');
    } catch (err) {
      logErrorForDev(err);
      toast(getUserFacingErrorMessage(err, t('userArea.edit.updateError'), t), {
        title: t('userArea.edit.updateFailedTitle'),
        variant: 'error',
      });
    }
  };

  const backHref = '/account';

  return (
    <>
      <h1 className='mb-6 text-2xl font-bold text-gray-900'>
        {t('userArea.edit.title')}
      </h1>

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
              {t('auth.username')}
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
                {t(usernameError)}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor='profile-email'
              className='mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500'
            >
              {t('auth.email')}
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
                {t(emailError)}
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
            {t('userArea.edit.save')}
          </Button>
          <Link
            href={backHref}
            className='text-sm font-semibold text-gray-600 hover:text-gray-900'
          >
            {t('confirmDialog.cancel')}
          </Link>
        </div>
      </form>
    </>
  );
}
