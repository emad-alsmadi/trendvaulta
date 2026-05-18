'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLogout, useMe } from '@/hooks/auth/authQuery';
import { useConfirm } from '@/components/confirm/ConfirmProvider';

export default function WelcomePage() {
  const router = useRouter();
  const meQuery = useMe();
  const logout = useLogout();
  const confirm = useConfirm();

  const user = meQuery.data?.user || null;

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
            'radial-gradient(closest-side, rgba(236,72,153,0.22), transparent 70%), radial-gradient(closest-side, rgba(99,102,241,0.22), transparent 70%), radial-gradient(closest-side, rgba(34,211,238,0.18), transparent 70%)',
        }}
      />

      <div className='relative mx-auto max-w-3xl'>
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className='rounded-3xl border border-white/30 bg-white/35 p-6 shadow-sm backdrop-blur-xl sm:p-10'
        >
          <div className='inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/40 px-3 py-1 text-xs font-extrabold text-indigo-950'>
            <Sparkles className='h-4 w-4 text-fuchsia-700' />
            Welcome
          </div>

          <h1 className='mt-5 text-4xl font-extrabold tracking-tight text-indigo-950 sm:text-5xl'>
            {user?.username
              ? `Welcome, ${user.username}`
              : 'Welcome to Craftify'}
          </h1>

          <p className='mt-4 text-sm font-semibold leading-7 text-indigo-950/80'>
            Your account is ready. Enjoy a modern, colorful browsing experience
            with smooth transitions and live motion.
          </p>

          <div className='mt-8 grid gap-3 sm:grid-cols-3'>
            {[
              {
                title: 'Browse templates',
                text: 'Explore the catalog with filters and pagination.',
                tone: 'from-fuchsia-500/12 via-indigo-500/10 to-cyan-500/12',
              },
              {
                title: 'Meet creators',
                text: 'Discover profiles with rich sections and motion.',
                tone: 'from-amber-500/12 via-rose-500/10 to-fuchsia-500/12',
              },
              {
                title: 'Your profile',
                text: 'Review your session and account information.',
                tone: 'from-cyan-500/12 via-emerald-500/10 to-lime-500/12',
              },
            ].map((c) => (
              <motion.div
                key={c.title}
                whileHover={{ y: -3 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={`rounded-3xl border border-white/30 bg-gradient-to-br ${c.tone} p-5`}
              >
                <div className='text-sm font-extrabold text-indigo-950'>
                  {c.title}
                </div>
                <div className='mt-2 text-sm font-semibold text-indigo-950/80'>
                  {c.text}
                </div>
              </motion.div>
            ))}
          </div>

          <div className='mt-8 grid gap-3 sm:grid-cols-2'>
            <Link
              href='/'
              className='w-full'
            >
              <Button
                className='w-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                size='lg'
              >
                <span className='inline-flex items-center gap-2'>
                  Start browsing
                  <ArrowRight className='h-4 w-4' />
                </span>
              </Button>
            </Link>

            <Link
              href='/profile'
              className='w-full'
            >
              <Button
                variant='secondary'
                className='w-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                size='lg'
              >
                <span className='inline-flex items-center gap-2'>
                  <User className='h-4 w-4' />
                  Open profile
                </span>
              </Button>
            </Link>
          </div>

          <button
            type='button'
            onClick={() =>
              void confirm({
                variant: 'danger',
                title: 'Log out?',
                description:
                  'You will need to sign in again to continue shopping.',
                confirmLabel: 'Log out',
                cancelLabel: 'Stay signed in',
                closeOnBackdrop: false,
                onConfirm: async () => {
                  await logout();
                  router.push('/');
                },
              })
            }
            className='mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-rose-700 hover:underline'
          >
            <LogOut className='h-4 w-4' />
            Logout
          </button>
        </motion.section>
      </div>
    </div>
  );
}
