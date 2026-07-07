'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { navItems, Navbar } from '@/components/navigation/Navbar';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';
import { LogIn, LogOut, MoreHorizontal, User } from 'lucide-react';
import { useLogout, useMe } from '@/hooks/auth/authQuery';
import { useConfirm } from '@/components/confirm/ConfirmProvider';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const meQuery = useMe();
  const logout = useLogout();
  const confirm = useConfirm();
  const user = meQuery.data?.user || null;
  const loading = meQuery.isLoading;
  const hydrated = true;

  return (
    <div className='min-h-screen bg-[radial-gradient(1100px_500px_at_10%_0%,rgba(245,158,11,0.22),transparent_55%),radial-gradient(1000px_460px_at_95%_15%,rgba(217,70,239,0.20),transparent_55%),radial-gradient(900px_520px_at_40%_120%,rgba(34,211,238,0.22),transparent_55%)]'>
      <Navbar />

      <div className='mx-auto max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8'>
        <main className='min-w-0 pb-20 md:pb-0'>
          <AnimatePresence mode='wait'>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className='min-w-0'
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <nav className='fixed inset-x-0 bottom-0 z-50 border-t border-white/30 bg-white/65 backdrop-blur-xl md:hidden'>
        <div className='mx-auto grid max-w-7xl grid-cols-5 items-stretch gap-1 px-1 py-2'>
          {navItems
            .filter((item) => item.href !== '/about' && item.href !== '/pricing')
            .slice(0, 4)
            .map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold',
                    active ? 'text-fuchsia-700' : 'text-indigo-700/70',
                  )}
                >
                  <Icon
                    className={cn('h-5 w-5', active && 'text-fuchsia-700')}
                  />
                  <span className='w-full truncate text-center'>
                    {item.label}
                  </span>
                </Link>
              );
            })}

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type='button'
                className={cn(
                  'flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold',
                  'text-indigo-700/70',
                )}
              >
                <MoreHorizontal className='h-5 w-5' />
                <span className='w-full truncate text-center'>More</span>
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align='end'
                side='top'
                sideOffset={10}
                className='z-[60] min-w-[220px] overflow-hidden rounded-2xl border border-white/40 bg-white/85 p-2 shadow-xl backdrop-blur-xl'
              >
                <DropdownMenu.Item asChild>
                  <Link
                    href='/pricing'
                    className='flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-indigo-950 outline-none transition hover:bg-indigo-900/10'
                  >
                    Pricing
                  </Link>
                </DropdownMenu.Item>

                <DropdownMenu.Item asChild>
                  <Link
                    href='/about'
                    className='flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-indigo-950 outline-none transition hover:bg-indigo-900/10'
                  >
                    About
                  </Link>
                </DropdownMenu.Item>

                <DropdownMenu.Separator className='my-2 h-px bg-indigo-900/10' />

                {!hydrated || !user ? (
                  <DropdownMenu.Item asChild>
                    <Link
                      href='/auth/login'
                      className='flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-indigo-950 outline-none transition hover:bg-indigo-900/10'
                    >
                      <LogIn className='h-4 w-4 text-indigo-700' />
                      Login
                    </Link>
                  </DropdownMenu.Item>
                ) : (
                  <>
                    <DropdownMenu.Item asChild>
                      <Link
                        href='/profile'
                        className='flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-indigo-950 outline-none transition hover:bg-indigo-900/10'
                      >
                        <User className='h-4 w-4 text-indigo-700' />
                        Profile
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onSelect={(e) => {
                        e.preventDefault();
                        void confirm({
                          variant: 'danger',
                          title: 'Log out?',
                          description:
                            'You will need to sign in again to access your cart, orders, and profile.',
                          confirmLabel: 'Log out',
                          cancelLabel: 'Stay signed in',
                          closeOnBackdrop: false,
                          onConfirm: async () => {
                            await logout();
                            router.push('/');
                          },
                        });
                      }}
                      className='flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold text-indigo-950 outline-none transition hover:bg-rose-500/10'
                    >
                      <LogOut className='h-4 w-4 text-rose-700' />
                      Logout
                    </DropdownMenu.Item>
                  </>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </nav>
    </div>
  );
}
