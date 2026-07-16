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
import { Footer } from '@/components/layout/Footer'

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
    <div className='min-h-screen bg-gray-50'>
      <Navbar />
      <div className='gap-6 py-6'>
        <main className='min-w-0 px-20 pb-20 md:pb-0'>
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

      <nav className='fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white md:hidden'>
        <div className='mx-auto grid max-w-7xl grid-cols-5 items-stretch gap-1 px-1 py-2'>
          {navItems
            .filter(
              (item) => item.href !== '/about' && item.href !== '/pricing',
            )
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
                    active ? 'text-indigo-600' : 'text-gray-600',
                  )}
                >
                  <Icon
                    className={cn('h-5 w-5', active && 'text-indigo-600')}
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
                  'text-gray-600',
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
                className='z-50 min-w-[220px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg'
              >
                <DropdownMenu.Item asChild>
                  <Link
                    href='/pricing'
                    className='flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 outline-none transition hover:bg-gray-100'
                  >
                    Pricing
                  </Link>
                </DropdownMenu.Item>

                <DropdownMenu.Item asChild>
                  <Link
                    href='/about'
                    className='flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 outline-none transition hover:bg-gray-100'
                  >
                    About
                  </Link>
                </DropdownMenu.Item>

                <DropdownMenu.Separator className='my-1 h-px bg-gray-200' />

                {!hydrated || !user ? (
                  <DropdownMenu.Item asChild>
                    <Link
                      href='/auth/login'
                      className='flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 outline-none transition hover:bg-gray-100'
                    >
                      <LogIn className='h-4 w-4 text-gray-600' />
                      Login
                    </Link>
                  </DropdownMenu.Item>
                ) : (
                  <>
                    <DropdownMenu.Item asChild>
                      <Link
                        href='/profile'
                        className='flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 outline-none transition hover:bg-gray-100'
                      >
                        <User className='h-4 w-4 text-gray-600' />
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
                      className='flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-extrabold text-red-600 outline-none transition hover:bg-red-50'
                    >
                      <LogOut className='h-4 w-4 text-red-600' />
                      Logout
                    </DropdownMenu.Item>
                  </>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </nav>

      <Footer />
    </div>
  );
}
