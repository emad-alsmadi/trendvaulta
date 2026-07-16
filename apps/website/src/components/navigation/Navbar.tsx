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
  Menu,
  X,
  Globe,
  MoreHorizontal,
  FileText,
  HelpCircle,
  Scale,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLogout, useMe } from '@/hooks/auth/authQuery';
import { getUserRole } from '@/lib/authCookies';
import { useCart } from '@/lib/cartStore';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { useState } from 'react';

export const navItems = [
  { href: '/products', label: 'Products', icon: LayoutGrid },
  { href: '/brands', label: 'Brands', icon: Users },
  { href: '/offers', label: 'Offers', icon: Sparkles },
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
];

export const categories = [
  {
    name: 'Makeup',
    href: '/products?category=makeup',
    subcategories: ['Face', 'Eyes', 'Lips', 'Nails'],
  },
  {
    name: 'Perfumes',
    href: '/products?category=perfumes',
    subcategories: ['For Her', 'For Him', 'Unisex', 'Gift Sets'],
  },
  {
    name: 'Clothing',
    href: '/products?category=clothing',
    subcategories: ['Women', 'Men', 'Kids', 'Accessories'],
  },
  {
    name: 'Skincare',
    href: '/products?category=skincare',
    subcategories: ['Face Care', 'Body Care', 'Hair Care', 'Sun Care'],
  },
  {
    name: 'Accessories',
    href: '/products?category=accessories',
    subcategories: ['Jewelry', 'Bags', 'Watches', 'Sunglasses'],
  },
  {
    name: 'Home & Living',
    href: '/products?category=home',
    subcategories: ['Decor', 'Kitchen', 'Bedding', 'Lighting'],
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

  const avatarKey = user?.username || user?.email || 'user';
  const initials = getInitials(user?.username || user?.email);
  const avatarStyle = pickAvatarStyle(avatarKey);

  // Extract username from email (everything before @)
  const getUsernameFromEmail = (email: string) => {
    if (!email) return '';
    return email.split('@')[0];
  };

  const currentUsername =
    user?.username || getUsernameFromEmail(user?.email || '');

  return (
    <header className='sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm'>
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

            {/* Navigation - Desktop */}
            <nav className='hidden md:flex items-center gap-6'>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className='flex items-center gap-1 text-gray-700 hover:text-gray-900 font-medium transition-colors relative group'>
                    Categories
                    <ChevronDown className='h-4 w-4' />
                    <span className='absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 transition-all duration-300 group-hover:w-full'></span>
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
                        href='/products'
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
                href='/products'
                className='text-gray-700 hover:text-gray-900 font-medium transition-colors relative group'
              >
                Products
                <span className='absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 transition-all duration-300 group-hover:w-full'></span>
              </Link>

              <Link
                href='/brands'
                className='text-gray-700 hover:text-gray-900 font-medium transition-colors relative group'
              >
                Brands
                <span className='absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 transition-all duration-300 group-hover:w-full'></span>
              </Link>

              <Link
                href='/offers'
                className='text-gray-700 hover:text-gray-900 font-medium transition-colors relative group'
              >
                Offers
                <span className='absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 transition-all duration-300 group-hover:w-full'></span>
              </Link>

              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className='flex items-center gap-1 text-gray-700 hover:text-gray-900 font-medium transition-colors relative group'>
                    More
                    <ChevronDown className='h-4 w-4' />
                    <span className='absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 transition-all duration-300 group-hover:w-full'></span>
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align='start'
                    sideOffset={10}
                    className='z-50 min-w-[200px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg'
                  >
                    <DropdownMenu.Item asChild>
                      <Link
                        href='/about'
                        className='flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors'
                      >
                        <Info className='h-4 w-4' />
                        About
                      </Link>
                    </DropdownMenu.Item>

                    <DropdownMenu.Item asChild>
                      <Link
                        href='/contact'
                        className='flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors'
                      >
                        <MessageSquare className='h-4 w-4' />
                        Contact
                      </Link>
                    </DropdownMenu.Item>

                    <DropdownMenu.Item asChild>
                      <Link
                        href='/faq'
                        className='flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors'
                      >
                        <HelpCircle className='h-4 w-4' />
                        FAQ
                      </Link>
                    </DropdownMenu.Item>

                    <DropdownMenu.Item asChild>
                      <Link
                        href='/licenses'
                        className='flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors'
                      >
                        <FileText className='h-4 w-4' />
                        Licenses
                      </Link>
                    </DropdownMenu.Item>

                    <DropdownMenu.Item asChild>
                      <Link
                        href='/terms'
                        className='flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors'
                      >
                        <Scale className='h-4 w-4' />
                        Terms
                      </Link>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
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
                          href={`/user/${currentUsername}`}
                          className='flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors'
                        >
                          <User className='h-4 w-4' />
                          Profile
                        </Link>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item asChild>
                        <Link
                          href={`/user/${currentUsername}/orders`}
                          className='flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors'
                        >
                          <Receipt className='h-4 w-4' />
                          Orders
                        </Link>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item asChild>
                        <Link
                          href={`/user/${currentUsername}/downloads`}
                          className='flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors'
                        >
                          <Download className='h-4 w-4' />
                          Downloads
                        </Link>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item asChild>
                        <Link
                          href={`/user/${currentUsername}/reviews`}
                          className='flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors'
                        >
                          <MessageSquare className='h-4 w-4' />
                          Reviews
                        </Link>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item asChild>
                        <Link
                          href={`/user/${currentUsername}/wishlist`}
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
            {/* Mobile nav */}
            <nav className='space-y-2'>
              <Link
                href='/products'
                className='block px-4 py-2 text-medium text-gray-700 hover:bg-gray-100 rounded-lg'
              >
                Products
              </Link>
              <Link
                href='/brands'
                className='block px-4 py-2 text-medium text-gray-700 hover:bg-gray-100 rounded-lg'
              >
                Brands
              </Link>
              <Link
                href='/offers'
                className='block px-4 py-2 text-medium text-gray-700 hover:bg-gray-100 rounded-lg'
              >
                Offers
              </Link>
              <div className='px-4 py-2 text-medium text-gray-900 font-semibold'>
                More
              </div>
              <div className='pl-8 space-y-2'>
                <Link
                  href='/about'
                  className='block px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg'
                >
                  About
                </Link>
                <Link
                  href='/contact'
                  className='block px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg'
                >
                  Contact
                </Link>
                <Link
                  href='/faq'
                  className='block px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg'
                >
                  FAQ
                </Link>
                <Link
                  href='/licenses'
                  className='block px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg'
                >
                  Licenses
                </Link>
                <Link
                  href='/terms'
                  className='block px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg'
                >
                  Terms
                </Link>
              </div>
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
                  href={`/user/${currentUsername}`}
                  className='block px-4 py-2 text-medium text-gray-700 hover:bg-gray-100 rounded-lg'
                >
                  Profile
                </Link>
                <Link
                  href={`/user/${currentUsername}/orders`}
                  className='block px-4 py-2 text-medium text-gray-700 hover:bg-gray-100 rounded-lg'
                >
                  Orders
                </Link>
                <Link
                  href={`/user/${currentUsername}/downloads`}
                  className='block px-4 py-2 text-medium text-gray-700 hover:bg-gray-100 rounded-lg'
                >
                  Downloads
                </Link>
                <Link
                  href={`/user/${currentUsername}/reviews`}
                  className='block px-4 py-2 text-medium text-gray-700 hover:bg-gray-100 rounded-lg'
                >
                  Reviews
                </Link>
                <Link
                  href={`/user/${currentUsername}/wishlist`}
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
