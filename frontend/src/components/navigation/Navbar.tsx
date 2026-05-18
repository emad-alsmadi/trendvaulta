'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  BookOpen,
  LayoutGrid,
  Users,
  Info,
  ShoppingCart,
  Receipt,
  LogIn,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLogout, useMe } from '@/hooks/auth/authQuery';
import { useCart } from '@/lib/cartStore';
import { useConfirm } from '@/components/confirm/ConfirmProvider';

export const navItems = [
  { href: '/', label: 'Templates', icon: LayoutGrid },
  { href: '/creators', label: 'Creators', icon: Users },
  { href: '/pricing', label: 'Pricing', icon: Sparkles },
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
  { href: '/orders', label: 'Orders', icon: Receipt },
  { href: '/about', label: 'About', icon: Info },
];

const AVATAR_STYLES = [
  {
    bg: 'bg-gradient-to-br from-indigo-600 via-fuchsia-600 to-cyan-500',
    ring: 'ring-indigo-500/25',
  },
  {
    bg: 'bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-500',
    ring: 'ring-emerald-500/25',
  },
  {
    bg: 'bg-gradient-to-br from-rose-600 via-fuchsia-600 to-amber-500',
    ring: 'ring-rose-500/25',
  },
  {
    bg: 'bg-gradient-to-br from-amber-600 via-orange-600 to-rose-500',
    ring: 'ring-amber-500/25',
  },
  {
    bg: 'bg-gradient-to-br from-sky-600 via-indigo-600 to-fuchsia-600',
    ring: 'ring-sky-500/25',
  },
];

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitials(value?: string) {
  const v = String(value || '').trim();
  if (!v) return 'U';

  const cleaned = v.replace(/[^a-zA-Z0-9\s]+/g, ' ').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

function pickAvatarStyle(key?: string) {
  const k = String(key || 'user');
  const idx = hashString(k) % AVATAR_STYLES.length;
  return AVATAR_STYLES[idx];
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const meQuery = useMe();
  const logout = useLogout();
  const cart = useCart();
  const confirm = useConfirm();
  const user = meQuery.data?.user || null;
  const loading = meQuery.isLoading;
  const hydrated = true;

  const avatarKey = user?.username || user?.email || 'user';
  const initials = getInitials(user?.username || user?.email);
  const avatarStyle = pickAvatarStyle(avatarKey);

  return (
    <header className='sticky top-0 z-40 border-b border-white/30 bg-white/60 backdrop-blur-xl'>
      <div className='mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8'>
        <Link
          href='/'
          className='flex items-center gap-2'
        >
          <span className='inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-600 via-indigo-600 to-cyan-500 text-white shadow-sm'>
            <BookOpen className='h-5 w-5' />
          </span>
          <div className='leading-tight'>
            <div className='text-lg font-extrabold tracking-tight text-gray-900'>
              Craftify
            </div>
            <div className='text-xs text-gray-600'>
              Digital templates marketplace
            </div>
          </div>
        </Link>

        <nav className='hidden items-center gap-2 md:flex'>
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all',
                  active
                    ? 'bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-500 text-white shadow'
                    : 'text-gray-700 hover:bg-gray-100/80',
                )}
              >
                <Icon className='h-4 w-4' />
                <span className='relative'>
                  {item.label}
                  {item.href === '/cart' && cart.count > 0 && (
                    <span
                      className={cn(
                        'ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-extrabold',
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-500 text-white',
                      )}
                    >
                      {cart.count}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}

          {!hydrated || !user ? (
            <Link
              href='/auth/login'
              className='ml-2 inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/60 px-4 py-2 text-sm font-bold text-gray-900 shadow-sm transition hover:bg-white'
            >
              <LogIn className='h-4 w-4' />
              Login
            </Link>
          ) : (
            <div className='ml-2 flex items-center gap-2'>
              {loading && !user ? (
                <div className='inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/60 px-4 py-2 shadow-sm'>
                  <div className='h-4 w-4 animate-pulse rounded-full bg-indigo-900/20' />
                  <div className='h-4 w-24 animate-pulse rounded bg-indigo-900/20' />
                </div>
              ) : (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      type='button'
                      className='inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/60 px-4 py-2 text-sm font-extrabold text-gray-900 shadow-sm transition hover:bg-white'
                    >
                      <span
                        className={cn(
                          'inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold text-white ring-1',
                          avatarStyle.bg,
                          avatarStyle.ring,
                        )}
                      >
                        {initials}
                      </span>
                      <span className='max-w-[160px] truncate'>
                        {user?.username || 'Account'}
                      </span>
                      <ChevronDown className='h-4 w-4 text-gray-700/70' />
                    </button>
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align='end'
                      sideOffset={10}
                      className='z-[60] min-w-[220px] overflow-hidden rounded-2xl border border-white/40 bg-white/80 p-2 shadow-xl backdrop-blur-xl'
                    >
                      <div className='rounded-xl border border-white/40 bg-white/60 p-3'>
                        <div className='flex items-center gap-3'>
                          <div
                            className={cn(
                              'inline-flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-extrabold text-white ring-1',
                              avatarStyle.bg,
                              avatarStyle.ring,
                            )}
                          >
                            {initials}
                          </div>
                          <div className='min-w-0'>
                            <div className='truncate text-sm font-extrabold text-indigo-950'>
                              {user?.username || 'Account'}
                            </div>
                            <div className='truncate text-xs font-semibold text-indigo-950/70'>
                              {user?.email || 'Signed in'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <DropdownMenu.Label className='px-2 py-2 text-xs font-extrabold uppercase tracking-wider text-indigo-950/70'>
                        Quick actions
                      </DropdownMenu.Label>

                      <DropdownMenu.Item asChild>
                        <Link
                          href='/profile'
                          className='flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-indigo-950 outline-none transition hover:bg-indigo-900/10'
                        >
                          <User className='h-4 w-4 text-indigo-700' />
                          Profile
                        </Link>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item asChild>
                        <Link
                          href='/profile/edit'
                          className='flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-indigo-950 outline-none transition hover:bg-indigo-900/10'
                        >
                          <Settings className='h-4 w-4 text-fuchsia-700' />
                          Edit profile
                        </Link>
                      </DropdownMenu.Item>

                      <DropdownMenu.Separator className='my-2 h-px bg-indigo-900/10' />

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
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
