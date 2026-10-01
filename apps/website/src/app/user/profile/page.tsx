'use client';

import { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/contexts/TranslationContext';
import { useMe, useUpdateProfile, type MeResponse } from '@/hooks/auth/authQuery';
import { useHasAuthToken } from '@/hooks/auth/useHasAuthToken';
import {
  getUserFacingErrorMessage,
  logErrorForDev,
} from '@/lib/userFacingError';
import { PageHeaderSkeleton, Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import {
  FIELD,
  FIELD_ERROR,
  FIELD_LABEL,
  PANEL,
  UserPageHeader,
} from '../UserPage';

/** Edit profile — PUT /api/auth/profile (username, email) */
type ProfileUser = NonNullable<MeResponse['user']>;

export default function EditProfilePage() {
  const { t } = useTranslation();
  const meQuery = useMe();
  const hasToken = useHasAuthToken();
  const user = meQuery.data?.user || null;

  // No token: UserShell redirects to login (proxy.ts guards /user too).
  if (meQuery.isPending && hasToken) {
    return (
      <SkeletonGroup className='max-w-2xl'>
        <PageHeaderSkeleton className='mb-8' />
        <div aria-hidden className='space-y-5'>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i}>
              <Skeleton className='h-3.5 w-28' />
              <Skeleton className='mt-2 h-11 w-full' />
            </div>
          ))}
          <Skeleton className='h-11 w-36' />
        </div>
      </SkeletonGroup>
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
  const [currentPassword, setCurrentPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const trimmedUsername = username.trim();
  const trimmedEmail = email.trim();
  // The API asks for the current password only when the email changes.
  const emailChanged =
    trimmedEmail.toLowerCase() !== (user.email || '').toLowerCase();
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
    setPasswordError(null);
    if (emailChanged && !currentPassword) {
      setPasswordError('userArea.edit.currentPasswordRequired');
      return;
    }
    try {
      await updateProfile.mutateAsync({
        username: trimmedUsername,
        email: trimmedEmail,
        ...(emailChanged ? { currentPassword } : {}),
      });
      toast(t('userArea.edit.updated'), {
        title: t('userArea.edit.savedTitle'),
        variant: 'success',
      });
      router.push('/user');
    } catch (err) {
      logErrorForDev(err);
      // Known API codes get a translated inline message by the field.
      const code = axios.isAxiosError(err)
        ? (err.response?.data as { code?: string } | undefined)?.code
        : undefined;
      const inlineKey =
        code === 'CURRENT_PASSWORD_INCORRECT'
          ? 'userArea.edit.currentPasswordIncorrect'
          : code === 'CURRENT_PASSWORD_REQUIRED'
            ? 'userArea.edit.currentPasswordRequired'
            : code === 'ACCOUNT_LOCKED'
              ? 'userArea.edit.accountLocked'
              : null;
      if (inlineKey) {
        setPasswordError(inlineKey);
        return;
      }
      toast(getUserFacingErrorMessage(err, t('userArea.edit.updateError'), t), {
        title: t('userArea.edit.updateFailedTitle'),
        variant: 'error',
      });
    }
  };

  const backHref = '/user';

  return (
    <div className='space-y-6'>
      <UserPageHeader title={t('userArea.edit.title')} />

      <form onSubmit={onSubmit} className={`${PANEL} max-w-3xl`} noValidate>
        <div className='grid gap-5 md:grid-cols-2'>
          <div>
            <label htmlFor='profile-username' className={FIELD_LABEL}>
              {t('auth.username')}
            </label>
            <Input
              id='profile-username'
              className={FIELD}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete='username'
              maxLength={200}
              disabled={updateProfile.isPending}
            />
            {usernameError && (
              <p className={FIELD_ERROR}>{t(usernameError)}</p>
            )}
          </div>

          <div>
            <label htmlFor='profile-email' className={FIELD_LABEL}>
              {t('auth.email')}
            </label>
            <Input
              id='profile-email'
              type='email'
              dir='ltr'
              className={FIELD}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete='email'
              maxLength={100}
              disabled={updateProfile.isPending}
            />
            {emailError && <p className={FIELD_ERROR}>{t(emailError)}</p>}
          </div>

          {emailChanged && (
            <div className='md:col-span-2'>
              <label htmlFor='profile-current-password' className={FIELD_LABEL}>
                {t('userArea.edit.currentPasswordLabel')}
              </label>
              <Input
                id='profile-current-password'
                type='password'
                className={`${FIELD} md:max-w-sm`}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setPasswordError(null);
                }}
                autoComplete='current-password'
                maxLength={128}
                disabled={updateProfile.isPending}
                aria-invalid={passwordError ? true : undefined}
                aria-describedby={
                  passwordError
                    ? 'profile-current-password-error'
                    : 'profile-current-password-hint'
                }
              />
              {passwordError ? (
                <p
                  id='profile-current-password-error'
                  role='alert'
                  className={FIELD_ERROR}
                >
                  {t(passwordError)}
                </p>
              ) : (
                <p
                  id='profile-current-password-hint'
                  className='mt-1.5 text-xs text-ink-muted'
                >
                  {t('userArea.edit.currentPasswordHint')}
                </p>
              )}
            </div>
          )}
        </div>

        <div className='mt-7 flex flex-wrap items-center gap-3'>
          <Button
            type='submit'
            variant='solid'
            disabled={!canSave}
            className='rounded-full px-7'
          >
            {updateProfile.isPending ? (
              <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
            ) : (
              <Save className='h-4 w-4' aria-hidden />
            )}
            {t('userArea.edit.save')}
          </Button>
          <Link
            href={backHref}
            className='inline-flex h-12 items-center rounded-full bg-stone-200/60 px-6 text-sm font-semibold text-ink transition-colors hover:bg-stone-200'
          >
            {t('confirmDialog.cancel')}
          </Link>
        </div>
      </form>
    </div>
  );
}
