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
  Shield,
  Heart,
  Download,
  MessageSquare,
  Search,
  Menu,
  X,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLogout, useMe } from '@/hooks/auth/authQuery';
import { getUserRole } from '@/lib/authCookies';
import { useCart } from '@/lib/cartStore';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { useState } from 'react';

export const navItems = [
  { href: '/', label: 'Templates', icon: LayoutGrid },
  { href: '/creators', label: 'Creators', icon: Users },
  { href: '/pricing', label: 'Pricing', icon: Sparkles },
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
  { href: '/orders', label: 'Orders', icon: Receipt },
  { href: '/downloads', label: 'Downloads', icon: Download },
  { href: '/reviews', label: 'Reviews', icon: MessageSquare },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/about', label: 'About', icon: Info },
];

export const categories = [
  {
    name: 'Website Templates',
    href: '/templates?category=website',
    subcategories: ['Corporate', 'Creative', 'Personal', 'Technology'],
  },
  {
    name: 'WordPress Themes',
    href: '/templates?category=wordpress',
    subcategories: [
      'Blog/Magazine',
      'Corporate',
      'Creative',
      'eCommerce',
      'Education',
    ],
  },
  {
    name: 'E-commerce',
    href: '/templates?category=ecommerce',
    subcategories: ['WooCommerce', 'Shopify', 'Magento'],
  },
  {
    name: 'UI Kits',
    href: '/templates?category=uikits',
    subcategories: ['Mobile', 'Web', 'Dashboard'],
  },
  {
    name: 'Landing Pages',
    href: '/templates?category=landing',
    subcategories: ['SaaS', 'Product', 'Agency'],
  },
  {
    name: 'Admin Dashboards',
    href: '/templates?category=admin',
    subcategories: ['React', 'Vue', 'Angular'],
  },
];

const AVATAR_STYLES = [
  {
    bg: 'bg-gradient-to-br from-fuchsia-600 via-purple-600 to-cyan-500',
    ring: 'ring-fuchsia-500/25',
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
    bg: 'bg-gradient-to-br from-sky-600 via-purple-600 to-fuchsia-600',
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const avatarKey = user?.username || user?.email || 'user';
  const initials = getInitials(user?.username || user?.email);
  const avatarStyle = pickAvatarStyle(avatarKey);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/templates?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className='sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm'>
      {/* Top bar */}
      <div className='bg-gray-900 text-white text-xs'>
        <div className='max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center py-2'>
            <div className='flex items-center gap-6'>
              <Link
                href='/'
                className='hover:text-gray-300 transition-colors font-medium'
              >
                Craftify Market
              </Link>
              <Link
                href='/creators'
                className='hover:text-gray-300 transition-colors'
              >
                Start Selling
              </Link>
              <div className='flex items-center gap-1'>
                <span className='text-gray-400'>Our Products</span>
                <ChevronDown className='h-3 w-3' />
              </div>
            </div>
            <div className='flex items-center gap-4'>
              <Link
                href='/about'
                className='hover:text-gray-300 transition-colors'
              >
                About
              </Link>
              <Link
                href='/pricing'
                className='hover:text-gray-300 transition-colors'
              >
                Pricing
              </Link>
              {!hydrated || !user ? (
                <Link
                  href='/auth/login'
                  className='hover:text-gray-300 transition-colors font-medium'
                >
                  Sign In
                </Link>
              ) : (
                <span className='text-gray-400'>
                  {user?.username || 'Signed in'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <div className='bg-white'>
        <div className='max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16'>
            {/* Logo */}
            <Link
              href='/'
              className='flex items-center gap-2'
            >
              <span className='inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-600 via-purple-600 to-cyan-500 text-white shadow-sm'>
                <BookOpen className='h-5 w-5' />
              </span>
              <div className='leading-tight'>
                <div className='text-xl font-extrabold tracking-tight text-gray-900'>
                  Craftify
                </div>
              </div>
            </Link>

            {/* Search bar - Desktop */}
            <div className='hidden md:flex flex-1 max-w-xl mx-8'>
              <form
                onSubmit={handleSearch}
                className='relative w-full'
              >
                <input
                  type='text'
                  placeholder='Search templates...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='w-full pl-10 pr-4 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400'
                />
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
              </form>
            </div>

            {/* Navigation - Desktop */}
            <nav className='hidden md:flex items-center gap-6'>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className='flex items-center gap-1 text-gray-700 hover:text-gray-900 font-medium transition-colors'>
                    Categories
                    <ChevronDown className='h-4 w-4' />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align='start'
                    sideOffset={10}
                    className='z-50 min-w-[400px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl'
                  >
                    <div className='p-4'>
                      <div className='grid grid-cols-2 gap-4'>
                        {categories.map((category) => (
                          <DropdownMenu.Item
                            key={category.href}
                            asChild
                          >
                            <Link
                              href={category.href}
                              className='block p-3 rounded-lg hover:bg-gray-50 transition-colors group'
                            >
                              <div className='text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors mb-1'>
                                {category.name}
                              </div>
                              <div className='text-xs text-gray-500 leading-relaxed'>
                                {category.subcategories.slice(0, 3).join(', ')}
                              </div>
                            </Link>
                          </DropdownMenu.Item>
                        ))}
                      </div>
                    </div>
                    <div className='border-t border-gray-200 p-4 bg-gray-50'>
                      <Link
                        href='/templates'
                        className='flex items-center justify-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors'
                      >
                        View All Categories
                        <ChevronDown className='h-4 w-4 rotate-[-90deg]' />
                      </Link>
                    </div>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>

              <Link
                href='/templates'
                className='text-gray-700 hover:text-gray-900 font-medium transition-colors'
              >
                Templates
              </Link>

              <Link
                href='/creators'
                className='text-gray-700 hover:text-gray-900 font-medium transition-colors'
              >
                Creators
              </Link>

              <Link
                href='/pricing'
                className='text-gray-700 hover:text-gray-900 font-medium transition-colors'
              >
                Pricing
              </Link>
            </nav>

            {/* Right side */}
            <div className='flex items-center gap-4'>
              {/* Cart */}
              <Link
                href='/cart'
                className='relative p-2 text-gray-700 hover:text-gray-900 transition-colors'
              >
                <ShoppingCart className='h-5 w-5' />
                {cart.count > 0 && (
                  <span className='absolute -top-1 -right-1 h-5 w-5 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center font-bold'>
                    {cart.count}
                  </span>
                )}
              </Link>

              {/* Wishlist */}
              <Link
                href='/wishlist'
                className='hidden sm:block p-2 text-gray-700 hover:text-gray-900 transition-colors'
              >
                <Heart className='h-5 w-5' />
              </Link>

              {/* Account */}
              {!hydrated || !user ? (
                <Link
                  href='/auth/login'
                  className='inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors'
                >
                  <LogIn className='h-4 w-4' />
                  <span className='hidden sm:inline'>Sign In</span>
                </Link>
              ) : (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className='flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors'>
                      <span
                        className={cn(
                          'inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold text-white',
                          avatarStyle.bg,
                        )}
                      >
                        {initials}
                      </span>
                      <span className='hidden sm:block text-sm font-medium text-gray-700'>
                        {user?.username || 'Account'}
                      </span>
                      <ChevronDown className='h-4 w-4 text-gray-400' />
                    </button>
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align='end'
                      sideOffset={10}
                      className='z-50 min-w-[240px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg'
                    >
                      <div className='px-4 py-3 border-b border-gray-200'>
                        <div className='text-sm font-semibold text-gray-900'>
                          {user?.username || 'Account'}
                        </div>
                        <div className='text-xs text-gray-500'>
                          {user?.email || 'Signed in'}
                        </div>
                      </div>

                      <DropdownMenu.Item asChild>
                        <Link
                          href='/profile'
                          className='flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors'
                        >
                          <User className='h-4 w-4' />
                          Profile
                        </Link>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item asChild>
                        <Link
                          href='/orders'
                          className='flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors'
                        >
                          <Receipt className='h-4 w-4' />
                          Orders
                        </Link>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item asChild>
                        <Link
                          href='/downloads'
                          className='flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors'
                        >
                          <Download className='h-4 w-4' />
                          Downloads
                        </Link>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item asChild>
                        <Link
                          href='/reviews'
                          className='flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors'
                        >
                          <MessageSquare className='h-4 w-4' />
                          Reviews
                        </Link>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item asChild>
                        <Link
                          href='/wishlist'
                          className='flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors'
                        >
                          <Heart className='h-4 w-4' />
                          Wishlist
                        </Link>
                      </DropdownMenu.Item>

                      {getUserRole() === 'admin' ||
                      user?.roles?.includes('admin') ? (
                        <DropdownMenu.Item asChild>
                          <Link
                            href='/admin/dashboard'
                            className='flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors'
                          >
                            <Shield className='h-4 w-4' />
                            Admin Dashboard
                          </Link>
                        </DropdownMenu.Item>
                      ) : null}

                      <DropdownMenu.Separator className='my-1 h-px bg-gray-200' />

                      <DropdownMenu.Item
                        onSelect={(e) => {
                          e.preventDefault();
                          void confirm({
                            variant: 'danger',
                            title: 'Log out?',
                            description:
                              'You will need to sign in again to access your account.',
                            confirmLabel: 'Log out',
                            cancelLabel: 'Cancel',
                            closeOnBackdrop: false,
                            onConfirm: async () => {
                              await logout();
                              router.push('/');
                            },
                          });
                        }}
                        className='flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors'
                      >
                        <LogOut className='h-4 w-4' />
                        Logout
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className='md:hidden p-2 text-gray-700 hover:text-gray-900'
              >
                {mobileMenuOpen ? (
                  <X className='h-6 w-6' />
                ) : (
                  <Menu className='h-6 w-6' />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className='md:hidden border-t border-gray-200 bg-white'>
          <div className='px-4 py-4 space-y-4'>
            {/* Mobile search */}
            <form
              onSubmit={handleSearch}
              className='relative'
            >
              <input
                type='text'
                placeholder='Search templates...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='w-full pl-10 pr-4 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400'
              />
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
            </form>

            {/* Mobile nav */}
            <nav className='space-y-2'>
              <Link
                href='/templates'
                className='block px-4 py-2 text-medium text-gray-700 hover:bg-gray-100 rounded-lg'
              >
                Templates
              </Link>
              <Link
                href='/creators'
                className='block px-4 py-2 text-medium text-gray-700 hover:bg-gray-100 rounded-lg'
              >
                Creators
              </Link>
              <Link
                href='/pricing'
                className='block px-4 py-2 text-medium text-gray-700 hover:bg-gray-100 rounded-lg'
              >
                Pricing
              </Link>
              <div className='px-4 py-2 text-medium text-gray-900 font-semibold'>
                Categories
              </div>
              <div className='pl-8 space-y-2'>
                {categories.map((category) => (
                  <Link
                    key={category.href}
                    href={category.href}
                    className='block px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg'
                  >
                    <div className='font-medium text-gray-700'>
                      {category.name}
                    </div>
                    <div className='text-xs text-gray-500'>
                      {category.subcategories.join(' • ')}
                    </div>
                  </Link>
                ))}
              </div>
            </nav>

            {!hydrated || !user ? (
              <Link
                href='/auth/login'
                className='block w-full text-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium'
              >
                Sign In
              </Link>
            ) : (
              <nav className='space-y-2 pt-4 border-t border-gray-200'>
                <Link
                  href='/profile'
                  className='block px-4 py-2 text-medium text-gray-700 hover:bg-gray-100 rounded-lg'
                >
                  Profile
                </Link>
                <Link
                  href='/orders'
                  className='block px-4 py-2 text-medium text-gray-700 hover:bg-gray-100 rounded-lg'
                >
                  Orders
                </Link>
                <Link
                  href='/downloads'
                  className='block px-4 py-2 text-medium text-gray-700 hover:bg-gray-100 rounded-lg'
                >
                  Downloads
                </Link>
                <Link
                  href='/reviews'
                  className='block px-4 py-2 text-medium text-gray-700 hover:bg-gray-100 rounded-lg'
                >
                  Reviews
                </Link>
                <Link
                  href='/wishlist'
                  className='block px-4 py-2 text-medium text-gray-700 hover:bg-gray-100 rounded-lg'
                >
                  Wishlist
                </Link>
                {getUserRole() === 'admin' || user?.roles?.includes('admin') ? (
                  <Link
                    href='/admin/dashboard'
                    className='block px-4 py-2 text-medium text-gray-700 hover:bg-gray-100 rounded-lg'
                  >
                    Admin Dashboard
                  </Link>
                ) : null}
                <button
                  onClick={() => {
                    void confirm({
                      variant: 'danger',
                      title: 'Log out?',
                      description: 'You will need to sign in again.',
                      confirmLabel: 'Log out',
                      cancelLabel: 'Cancel',
                      closeOnBackdrop: false,
                      onConfirm: async () => {
                        await logout();
                        router.push('/');
                      },
                    });
                  }}
                  className='block w-full text-left px-4 py-2 text-medium text-red-600 hover:bg-red-50 rounded-lg'
                >
                  Logout
                </button>
              </nav>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
