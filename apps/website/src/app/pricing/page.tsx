'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
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
    !setupLoading && setup.data && !setup.data.ready && !active && !setupFailed;
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
    subscribe.isPending || setupLoading || !billingReady || Boolean(active);

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
    <div className='min-h-screen bg-gray-50 py-12'>
      <div className='max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className='text-center mb-12'
        >
          <div className='inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700 mb-4'>
            <Sparkles className='h-4 w-4' />
            Pricing Plans
          </div>
          <h1 className='text-4xl font-extrabold text-gray-900 mb-4'>
            Choose Your Plan
          </h1>
          <p className='text-lg text-gray-600 max-w-2xl mx-auto'>
            Get access to premium templates and features with our flexible
            pricing plans
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className='grid md:grid-cols-3 gap-8 max-w-5xl mx-auto'>
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className='bg-white rounded-2xl border border-gray-200 p-8'
          >
            <h3 className='text-xl font-bold text-gray-900 mb-2'>Free</h3>
            <p className='text-gray-600 text-sm mb-6'>
              Perfect for getting started
            </p>
            <div className='mb-6'>
              <span className='text-4xl font-extrabold text-gray-900'>$0</span>
              <span className='text-gray-600'>/month</span>
            </div>
            <ul className='space-y-3 mb-8'>
              <li className='flex items-start gap-2 text-sm text-gray-600'>
                <Check className='h-5 w-5 text-green-600 shrink-0' />
                Access to free templates
              </li>
              <li className='flex items-start gap-2 text-sm text-gray-600'>
                <Check className='h-5 w-5 text-green-600 shrink-0' />
                Basic support
              </li>
              <li className='flex items-start gap-2 text-sm text-gray-600'>
                <Check className='h-5 w-5 text-green-600 shrink-0' />
                Community access
              </li>
              <li className='flex items-start gap-2 text-sm text-gray-400'>
                <AlertCircle className='h-5 w-5 shrink-0' />
                Premium templates
              </li>
              <li className='flex items-start gap-2 text-sm text-gray-400'>
                <AlertCircle className='h-5 w-5 shrink-0' />
                Priority support
              </li>
            </ul>
            <Button
              variant='outline'
              className='w-full'
              onClick={() => router.push('/templates')}
            >
              Get Started
            </Button>
          </motion.div>

          {/* Pro Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className='bg-white rounded-2xl border-2 border-fuchsia-600 p-8 relative shadow-lg'
          >
            <div className='absolute -top-4 left-1/2 -translate-x-1/2 bg-fuchsia-600 text-white px-4 py-1 rounded-full text-sm font-bold'>
              Most Popular
            </div>
            <h3 className='text-xl font-bold text-gray-900 mb-2'>Pro</h3>
            <p className='text-gray-600 text-sm mb-6'>For serious creators</p>
            <div className='mb-6'>
              <span className='text-4xl font-extrabold text-gray-900'>$29</span>
              <span className='text-gray-600'>/month</span>
            </div>
            <ul className='space-y-3 mb-8'>
              <li className='flex items-start gap-2 text-sm text-gray-600'>
                <Check className='h-5 w-5 text-green-600 shrink-0' />
                All free features
              </li>
              <li className='flex items-start gap-2 text-sm text-gray-600'>
                <Check className='h-5 w-5 text-green-600 shrink-0' />
                Access to all premium templates
              </li>
              <li className='flex items-start gap-2 text-sm text-gray-600'>
                <Check className='h-5 w-5 text-green-600 shrink-0' />
                Priority support
              </li>
              <li className='flex items-start gap-2 text-sm text-gray-600'>
                <Check className='h-5 w-5 text-green-600 shrink-0' />
                Commercial license
              </li>
              <li className='flex items-start gap-2 text-sm text-gray-600'>
                <Check className='h-5 w-5 text-green-600 shrink-0' />
                Monthly updates
              </li>
            </ul>
            {active ? (
              <div className='rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-extrabold text-emerald-900'>
                Active Subscription
                <div className='mt-2'>
                  <Link
                    href='/profile'
                    className='text-fuchsia-700 underline text-xs'
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
                className='w-full bg-fuchsia-600 hover:bg-fuchsia-700'
              >
                {subscribe.isPending ? (
                  <span className='inline-flex items-center gap-2'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Processing…
                  </span>
                ) : (
                  'Subscribe Now'
                )}
              </Button>
            )}
          </motion.div>

          {/* Enterprise Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className='bg-white rounded-2xl border border-gray-200 p-8'
          >
            <h3 className='text-xl font-bold text-gray-900 mb-2'>Enterprise</h3>
            <p className='text-gray-600 text-sm mb-6'>For large teams</p>
            <div className='mb-6'>
              <span className='text-4xl font-extrabold text-gray-900'>$99</span>
              <span className='text-gray-600'>/month</span>
            </div>
            <ul className='space-y-3 mb-8'>
              <li className='flex items-start gap-2 text-sm text-gray-600'>
                <Check className='h-5 w-5 text-green-600 shrink-0' />
                All Pro features
              </li>
              <li className='flex items-start gap-2 text-sm text-gray-600'>
                <Check className='h-5 w-5 text-green-600 shrink-0' />
                Unlimited downloads
              </li>
              <li className='flex items-start gap-2 text-sm text-gray-600'>
                <Check className='h-5 w-5 text-green-600 shrink-0' />
                Dedicated support
              </li>
              <li className='flex items-start gap-2 text-sm text-gray-600'>
                <Check className='h-5 w-5 text-green-600 shrink-0' />
                Custom integrations
              </li>
              <li className='flex items-start gap-2 text-sm text-gray-600'>
                <Check className='h-5 w-5 text-green-600 shrink-0' />
                Team collaboration
              </li>
            </ul>
            <Button
              variant='outline'
              className='w-full'
              onClick={() => router.push('/contact')}
            >
              Contact Sales
            </Button>
          </motion.div>
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className='mt-16 max-w-3xl mx-auto'
        >
          <h2 className='text-2xl font-extrabold text-gray-900 mb-8 text-center'>
            Frequently Asked Questions
          </h2>
          <div className='space-y-4'>
            <div className='bg-white rounded-xl border border-gray-200 p-6'>
              <h3 className='font-bold text-gray-900 mb-2'>
                Can I cancel my subscription?
              </h3>
              <p className='text-sm text-gray-600'>
                Yes, you can cancel your subscription at any time from your
                profile settings. Your access will continue until the end of
                your billing period.
              </p>
            </div>
            <div className='bg-white rounded-xl border border-gray-200 p-6'>
              <h3 className='font-bold text-gray-900 mb-2'>
                What payment methods do you accept?
              </h3>
              <p className='text-sm text-gray-600'>
                We accept all major credit cards, PayPal, and bank transfers for
                enterprise plans.
              </p>
            </div>
            <div className='bg-white rounded-xl border border-gray-200 p-6'>
              <h3 className='font-bold text-gray-900 mb-2'>
                Can I use templates commercially?
              </h3>
              <p className='text-sm text-gray-600'>
                Yes, Pro and Enterprise plans include commercial licenses for
                all templates.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
