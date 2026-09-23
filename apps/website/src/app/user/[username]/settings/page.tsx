'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { AddressBook } from '@/components/account/AddressBook';
import { useMe, type MeResponse } from '@/hooks/auth/authQuery';
import { useTranslation } from '@/contexts/TranslationContext';
import { getAuthToken } from '@/lib/authCookies';
import { buildLoginUrl } from '@/lib/safeRedirect';

/** Account settings — profile summary + the saved address book. */
type ProfileUser = NonNullable<MeResponse['user']>;

export default function AccountSettingsPage() {
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
        <div className='mb-6 h-32 rounded bg-gray-200' />
        <div className='h-64 rounded bg-gray-200' />
      </div>
    );
  }

  if (!user) return null;

  // Keyed on the account so the address book remounts if the user changes.
  return <AccountSettings key={user._id ?? user.email} user={user} />;
}

function AccountSettings({ user }: { user: ProfileUser }) {
  const { t } = useTranslation();
  const profileName = user.username || (user.email || '').split('@')[0];
  const editHref = `/user/${encodeURIComponent(profileName)}/edit`;

  return (
    <>
      <h1 className='mb-6 text-2xl font-bold text-gray-900'>
        {t('userArea.settings.title')}
      </h1>

      <div className='mb-8 rounded-lg border border-gray-200 bg-white p-6'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div className='min-w-0'>
            <p className='text-xs font-bold uppercase tracking-wider text-gray-500'>
              {t('userArea.sidebar.profile')}
            </p>
            <p className='mt-2 text-lg font-bold text-gray-900'>
              {user.username || '—'}
            </p>
            <p className='text-sm text-gray-600'>{user.email || '—'}</p>
          </div>

          <Link
            href={editHref}
            className='inline-flex items-center gap-2 rounded-lg border-2 border-fuchsia-300 bg-white/80 px-4 py-2 text-sm font-extrabold text-fuchsia-700 transition-colors hover:bg-fuchsia-50 hover:text-fuchsia-800'
          >
            <Pencil className='h-4 w-4' aria-hidden />
            {t('userArea.edit.title')}
          </Link>
        </div>
      </div>

      <div className='rounded-lg border border-gray-200 bg-white p-6'>
        <AddressBook />
      </div>
    </>
  );
}
