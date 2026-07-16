'use client';

import { useRouter } from 'next/navigation';
import {
  User,
  ShieldCheck,
  LogOut,
  KeyRound,
  Pencil,
  Sparkles,
  Loader2,
  ExternalLink,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLogout, useMe } from '@/hooks/auth/authQuery';
import { useToast } from '@/components/ui/Toast';
import {
  useBillingPortalMutation,
  useSubscription,
} from '@/hooks/subscriptions/subscriptionQuery';
import {
  getUserFacingErrorMessage,
  logErrorForDev,
} from '@/lib/userFacingError';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import Link from 'next/link';

export default function UserProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const meQuery = useMe();
  const logout = useLogout();
  const confirm = useConfirm();
  const user = meQuery.data?.user || null;
  const sub = useSubscription();
  const portal = useBillingPortalMutation();

  if (meQuery.isLoading) {
    return (
      <div className='animate-pulse'>
        <div className='h-8 bg-gray-200 rounded w-48 mb-8'></div>
        <div className='h-64 bg-gray-200 rounded'></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <h1 className='text-2xl font-bold text-gray-900 mb-6'>Profile</h1>

      {/* Profile Info Card */}
      <div className='bg-white rounded-lg border border-gray-200 p-6 mb-6'>
        <div className='flex items-start justify-between mb-6'>
          <div>
            <h2 className='text-lg font-bold text-gray-900 mb-1'>
              Account Information
            </h2>
            <p className='text-sm text-gray-600'>Manage your account details</p>
          </div>
          <Link
            href='/profile/edit'
            className='inline-flex items-center gap-2 px-4 py-2 bg-fuchsia-600 text-white text-sm font-semibold rounded-lg hover:bg-fuchsia-700 transition'
          >
            <Pencil className='w-4 h-4' />
            Edit Profile
          </Link>
        </div>

        <div className='grid gap-6 md:grid-cols-2'>
          <div>
            <label className='text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block'>
              Username
            </label>
            <div className='text-gray-900 font-semibold'>
              {user.username || '—'}
            </div>
          </div>

          <div>
            <label className='text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block'>
              Email
            </label>
            <div className='text-gray-900 font-semibold break-all'>
              {user.email || '—'}
            </div>
          </div>

          <div>
            <label className='text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block'>
              Account Status
            </label>
            <div className='inline-flex items-center gap-2'>
              <ShieldCheck className='w-4 h-4 text-emerald-600' />
              <span className='text-gray-900 font-semibold'>Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Card */}
      <div className='bg-white rounded-lg border border-gray-200 p-6 mb-6'>
        <div className='flex items-center gap-2 mb-4'>
          <Sparkles className='w-5 h-5 text-fuchsia-600' />
          <h2 className='text-lg font-bold text-gray-900'>Subscription</h2>
        </div>

        {sub.isLoading ? (
          <div className='flex items-center gap-2 text-gray-600'>
            <Loader2 className='w-4 w-4 animate-spin text-fuchsia-600' />
            Loading subscription…
          </div>
        ) : sub.data ? (
          <div className='space-y-4'>
            <div className='flex items-center justify-between p-4 bg-fuchsia-50 rounded-lg'>
              <div>
                <div className='font-semibold text-gray-900'>
                  Status:{' '}
                  <span className='capitalize text-fuchsia-700'>
                    {sub.data.status}
                  </span>
                </div>
                {sub.data.currentPeriodEnd && (
                  <div className='text-sm text-gray-600 mt-1'>
                    Renews on{' '}
                    {new Date(sub.data.currentPeriodEnd).toLocaleDateString(
                      'en-US',
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      },
                    )}
                  </div>
                )}
              </div>
              <Button
                size='sm'
                disabled={portal.isPending}
                onClick={async () => {
                  try {
                    const { url } = await portal.mutateAsync();
                    if (url) window.location.assign(url);
                  } catch (err) {
                    logErrorForDev(err);
                    toast(
                      getUserFacingErrorMessage(
                        err,
                        'Billing portal unavailable',
                      ),
                      {
                        title: 'Billing',
                        variant: 'error',
                      },
                    );
                  }
                }}
                className='bg-white text-fuchsia-600 border border-fuchsia-200 hover:bg-fuchsia-50'
              >
                {portal.isPending ? (
                  <span className='inline-flex items-center gap-2'>
                    <Loader2 className='w-4 w-4 animate-spin' />
                    Opening…
                  </span>
                ) : (
                  <span className='inline-flex items-center gap-2'>
                    <ExternalLink className='w-4 w-4' />
                    Manage
                  </span>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className='p-4 bg-gray-50 rounded-lg'>
            <p className='text-gray-600 mb-4'>
              You don't have an active subscription. Upgrade to Craftify Pro for
              exclusive benefits.
            </p>
            <Link
              href='/pricing'
              className='inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 text-white text-sm font-semibold rounded-lg hover:brightness-110 transition'
            >
              <Sparkles className='w-4 h-4' />
              View Plans
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className='bg-white rounded-lg border border-gray-200 p-6'>
        <h2 className='text-lg font-bold text-gray-900 mb-4'>Quick Actions</h2>
        <div className='grid gap-3 sm:grid-cols-2'>
          <Link
            href='/password/forgot-password'
            className='flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition'
          >
            <div className='p-2 bg-fuchsia-100 rounded-lg'>
              <KeyRound className='w-5 h-5 text-fuchsia-600' />
            </div>
            <div>
              <div className='font-semibold text-gray-900'>Change Password</div>
              <div className='text-sm text-gray-600'>Update your password</div>
            </div>
          </Link>

          <Link
            href='/contact'
            className='flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition'
          >
            <div className='p-2 bg-purple-100 rounded-lg'>
              <Mail className='w-5 h-5 text-purple-600' />
            </div>
            <div>
              <div className='font-semibold text-gray-900'>Contact Support</div>
              <div className='text-sm text-gray-600'>
                Get help with your account
              </div>
            </div>
          </Link>
        </div>

        <div className='mt-6 pt-6 border-t border-gray-200'>
          <Button
            className='w-full bg-rose-600 text-white hover:bg-rose-700'
            size='lg'
            onClick={() =>
              void confirm({
                variant: 'danger',
                title: 'Log out?',
                description:
                  'You will need to sign in again to access your account.',
                confirmLabel: 'Log out',
                cancelLabel: 'Stay signed in',
                closeOnBackdrop: false,
                onConfirm: async () => {
                  await logout();
                  router.push('/');
                },
              })
            }
          >
            <span className='inline-flex items-center gap-2'>
              <LogOut className='w-4 w-4' />
              Logout
            </span>
          </Button>
        </div>
      </div>
    </>
  );
}
