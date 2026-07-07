'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  User,
  ShieldCheck,
  LogOut,
  KeyRound,
  Pencil,
  Sparkles,
  Loader2,
  ExternalLink,
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

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const meQuery = useMe();
  const logout = useLogout();
  const confirm = useConfirm();
  const user = meQuery.data?.user || null;
  const sub = useSubscription();
  const portal = useBillingPortalMutation();

  if (meQuery.isLoading) return null;
  if (!user) return null;

  return (
    <div className='relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/25 bg-white/20 p-4 backdrop-blur-xl sm:p-6'>
      <motion.div
        aria-hidden
        className='pointer-events-none absolute -inset-24 opacity-70'
        animate={{ rotate: [0, 8, 0], scale: [1, 1.03, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'radial-gradient(closest-side, rgba(99,102,241,0.22), transparent 70%), radial-gradient(closest-side, rgba(236,72,153,0.20), transparent 70%), radial-gradient(closest-side, rgba(34,211,238,0.18), transparent 70%)',
        }}
      />

      <div className='relative mx-auto max-w-3xl'>
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className='rounded-3xl border border-white/30 bg-white/35 p-6 shadow-sm backdrop-blur-xl sm:p-8'
        >
          <div className='flex items-start justify-between gap-4'>
            <div className='min-w-0'>
              <div className='inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/40 px-3 py-1 text-xs font-extrabold text-indigo-950'>
                <ShieldCheck className='h-4 w-4 text-emerald-700' />
                Logged in
              </div>
              <h1 className='mt-4 text-4xl font-extrabold tracking-tight text-indigo-950'>
                Profile
              </h1>
              <p className='mt-2 text-sm font-semibold text-indigo-950/80'>
                Your session is active. Use this page to review your account
                info.
              </p>
            </div>

            <motion.div
              whileHover={{ rotate: 2, y: -2 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className='inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 via-fuchsia-600 to-cyan-500 text-white shadow-sm'
            >
              <User className='h-6 w-6' />
            </motion.div>
          </div>

          <div className='mt-8 grid gap-4 sm:grid-cols-2'>
            <div className='rounded-3xl border border-white/30 bg-white/30 p-6'>
              <div className='text-xs font-extrabold uppercase tracking-wider text-indigo-950/70'>
                Username
              </div>
              <div className='mt-2 text-lg font-extrabold text-indigo-950'>
                {user?.username || '—'}
              </div>
            </div>

            <div className='rounded-3xl border border-white/30 bg-white/30 p-6'>
              <div className='text-xs font-extrabold uppercase tracking-wider text-indigo-950/70'>
                Email
              </div>
              <div className='mt-2 break-all text-lg font-extrabold text-indigo-950'>
                {user?.email || '—'}
              </div>
            </div>

            <div className='rounded-3xl border border-white/30 bg-gradient-to-br from-amber-500/12 via-rose-500/10 to-fuchsia-500/12 p-6 sm:col-span-2'>
              <div className='flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-indigo-950/70'>
                <KeyRound className='h-4 w-4 text-fuchsia-700' />
                Session
              </div>
              <div className='mt-2 text-sm font-semibold text-indigo-950/80'>
                Active
              </div>
            </div>
          </div>

          <div className='mt-8 rounded-3xl border border-white/30 bg-white/30 p-6 sm:col-span-2'>
            <div className='flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-indigo-950/70'>
              <Sparkles className='h-4 w-4 text-fuchsia-700' />
              Subscription
            </div>
            {sub.isLoading ? (
              <div className='mt-4 flex items-center gap-2 text-sm font-semibold text-indigo-950/80'>
                <Loader2 className='h-4 w-4 animate-spin text-fuchsia-600' />
                Loading…
              </div>
            ) : sub.data ? (
              <div className='mt-4 space-y-2'>
                <div className='text-sm font-extrabold text-indigo-950'>
                  Status:{' '}
                  <span className='capitalize'>{sub.data.status}</span>
                </div>
                {sub.data.currentPeriodEnd ? (
                  <div className='text-xs font-semibold text-indigo-950/75'>
                    Current period ends{' '}
                    {new Date(sub.data.currentPeriodEnd).toLocaleString()}
                  </div>
                ) : null}
                <Button
                  size='lg'
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
                  className='mt-2 w-full rounded-full border border-white/35 bg-white/45 text-indigo-950 shadow-sm backdrop-blur-xl transition hover:bg-white/65 sm:w-auto'
                >
                  {portal.isPending ? (
                    <span className='inline-flex items-center gap-2'>
                      <Loader2 className='h-4 w-4 animate-spin' />
                      Opening…
                    </span>
                  ) : (
                    <span className='inline-flex items-center gap-2'>
                      <ExternalLink className='h-4 w-4' />
                      Manage billing
                    </span>
                  )}
                </Button>
              </div>
            ) : (
              <p className='mt-4 text-sm font-semibold text-indigo-950/80'>
                No active subscription.{' '}
                <button
                  type='button'
                  onClick={() => router.push('/pricing')}
                  className='font-extrabold text-indigo-700 underline'
                >
                  View Craftify Pro
                </button>
              </p>
            )}
          </div>

          <div className='mt-6 grid gap-3 sm:grid-cols-3'>
            <Button
              className='w-full rounded-full border border-white/35 bg-white/45 text-indigo-950 shadow-sm backdrop-blur-xl transition hover:bg-white/65'
              size='lg'
              onClick={() => router.push('/')}
            >
              Browse Templates
            </Button>

            <Button
              className='w-full rounded-full bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-500 text-white shadow-md transition hover:brightness-110 active:brightness-95'
              size='lg'
              onClick={() => router.push('/profile/edit')}
            >
              <span className='inline-flex items-center gap-2'>
                <Pencil className='h-4 w-4' />
                Edit Profile
              </span>
            </Button>
            <Button
              className='w-full rounded-full bg-gradient-to-r from-rose-600 via-fuchsia-600 to-amber-500 text-white shadow-md transition hover:brightness-110 active:brightness-95'
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
                <LogOut className='h-4 w-4' />
                Logout
              </span>
            </Button>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
