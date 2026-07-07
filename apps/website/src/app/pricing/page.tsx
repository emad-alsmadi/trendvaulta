'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2, Sparkles, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  useSubscribeCheckoutMutation,
  useSubscription,
  useSubscriptionSetupStatus,
} from '@/hooks/subscriptions/subscriptionQuery';
import {
  getUserFacingErrorMessage,
  logErrorForDev,
} from '@/lib/userFacingError';
import { useMe } from '@/hooks/auth/authQuery';

export default function PricingPage() {
  const { toast } = useToast();
  const me = useMe();
  const sub = useSubscription(Boolean(me.data?.user));
  const setup = useSubscriptionSetupStatus();
  const subscribe = useSubscribeCheckoutMutation();

  const loggedIn = Boolean(me.data?.user);
  const setupLoading = setup.isLoading;
  const setupFailed = setup.isError;
  const billingReady = Boolean(setup.data?.ready) && !setupFailed;
  const active =
    sub.data &&
    ['active', 'trialing'].includes(String(sub.data.status).toLowerCase());
  const showSetupNotice =
    !setupLoading &&
    setup.data &&
    !setup.data.ready &&
    !active &&
    !setupFailed;
  const showSetupErrorNotice = !setupLoading && setupFailed && !active;

  const onSubscribe = async () => {
    if (!loggedIn) {
      toast('Please log in to subscribe.', {
        title: 'Login required',
        variant: 'info',
      });
      return;
    }
    if (!billingReady) {
      toast(
        setupFailed
          ? 'We could not confirm billing availability. Please check your connection and try again.'
          : 'Membership checkout is not available yet. Please try again later.',
        { title: 'Craftify Pro', variant: 'info' },
      );
      return;
    }
    try {
      const { url } = await subscribe.mutateAsync();
      if (url) window.location.assign(url);
    } catch (err) {
      logErrorForDev(err);
      const msg = getUserFacingErrorMessage(
        err,
        'Something went wrong starting checkout. Please try again.',
      );
      toast(msg, { title: 'Craftify Pro', variant: 'error' });
    }
  };

  const subscribeDisabled =
    subscribe.isPending ||
    setupLoading ||
    !billingReady ||
    Boolean(active);

  const subscribeLabel = () => {
    if (subscribe.isPending) {
      return (
        <span className='inline-flex items-center gap-2'>
          <Loader2 className='h-4 w-4 animate-spin' />
          Redirecting…
        </span>
      );
    }
    if (setupLoading) {
      return (
        <span className='inline-flex items-center gap-2'>
          <Loader2 className='h-4 w-4 animate-spin' />
          Checking availability…
        </span>
      );
    }
    if (setupFailed) {
      return 'Unable to verify checkout';
    }
    if (!billingReady) {
      return 'Checkout unavailable';
    }
    return 'Continue to secure checkout';
  };

  return (
    <div className='space-y-8'>
      <div className='rounded-3xl border border-white/40 bg-white/55 p-6 shadow-sm backdrop-blur-xl'>
        <div className='inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/40 px-3 py-1 text-xs font-extrabold text-indigo-950'>
          <Sparkles className='h-4 w-4 text-fuchsia-700' />
          Plans
        </div>
        <h1 className='mt-4 text-3xl font-extrabold tracking-tight text-indigo-950 sm:text-4xl'>
          Craftify Pro
        </h1>
        <p className='mt-2 max-w-2xl text-sm font-semibold text-indigo-950/80'>
          One membership for priority template drops, ongoing updates, and
          billing you control. Subscribe securely—we never store your card on
          our servers.
        </p>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className='mx-auto max-w-lg rounded-3xl border border-white/35 bg-white/40 p-8 shadow-sm backdrop-blur-xl'
      >
        <div className='text-center'>
          <div className='text-xs font-extrabold uppercase tracking-wider text-indigo-950/70'>
            Monthly
          </div>
          <div className='mt-2 text-4xl font-extrabold text-indigo-950'>
            Pro membership
          </div>
          <div className='mt-2 text-sm font-semibold text-indigo-950/75'>
            Simple monthly billing. Manage or cancel anytime from your profile.
          </div>
        </div>

        {showSetupErrorNotice ? (
          <div
            className='mt-6 flex gap-3 rounded-2xl border border-rose-200/90 bg-rose-50/95 px-4 py-3 text-left text-sm font-semibold text-rose-950 shadow-sm'
            role='alert'
          >
            <AlertCircle
              className='mt-0.5 h-5 w-5 shrink-0 text-rose-700'
              aria-hidden
            />
            <div>
              <div className='font-extrabold'>Could not load billing status</div>
              <p className='mt-1 text-xs font-semibold text-rose-950/90'>
                Check your internet connection, then refresh this page. You can
                still browse templates while we retry.
              </p>
            </div>
          </div>
        ) : null}

        {showSetupNotice ? (
          <div
            className='mt-6 flex gap-3 rounded-2xl border border-amber-200/90 bg-amber-50/95 px-4 py-3 text-left text-sm font-semibold text-amber-950 shadow-sm'
            role='status'
          >
            <AlertCircle
              className='mt-0.5 h-5 w-5 shrink-0 text-amber-700'
              aria-hidden
            />
            <div>
              <div className='font-extrabold'>Signup is paused for now</div>
              <p className='mt-1 text-xs font-semibold text-amber-950/90'>
                We&apos;re still turning on membership checkout. Nothing is
                wrong with your account—please try again in a little while.
              </p>
            </div>
          </div>
        ) : null}

        <ul className='mt-8 space-y-3 text-sm font-semibold text-indigo-950/85'>
          <li className='flex gap-2'>
            <Check className='mt-0.5 h-4 w-4 shrink-0 text-emerald-600' />
            Priority template drops &amp; updates
          </li>
          <li className='flex gap-2'>
            <Check className='mt-0.5 h-4 w-4 shrink-0 text-emerald-600' />
            Manage renewal and invoices in your billing portal
          </li>
          <li className='flex gap-2'>
            <Check className='mt-0.5 h-4 w-4 shrink-0 text-emerald-600' />
            Cancel anytime from your profile
          </li>
        </ul>

        <div className='mt-8'>
          {active ? (
            <div className='rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-extrabold text-emerald-900'>
              You have an active subscription.
              <div className='mt-3'>
                <Link
                  href='/profile'
                  className='text-indigo-700 underline'
                >
                  Manage from profile
                </Link>
              </div>
            </div>
          ) : (
            <Button
              size='lg'
              disabled={subscribeDisabled}
              onClick={() => void onSubscribe()}
              className='w-full rounded-full bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-500 text-white shadow-md transition hover:brightness-110 active:brightness-95 disabled:opacity-60'
            >
              {subscribeLabel()}
            </Button>
          )}
        </div>

        {!loggedIn ? (
          <p className='mt-4 text-center text-xs font-semibold text-indigo-950/70'>
            <Link
              href='/auth/login'
              className='font-extrabold text-indigo-700 underline'
            >
              Log in
            </Link>{' '}
            to subscribe.
          </p>
        ) : null}
      </motion.section>
    </div>
  );
}
