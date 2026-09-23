'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  LayoutGrid,
  Users,
  Info,
  ShoppingCart,
  Receipt,
  LogIn,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  Shield,
  Heart,
  MessageSquare,
  Menu,
  X,
  HelpCircle,
  Scale,
  Search,
  Truck,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLogout, useMe } from '@/hooks/auth/authQuery';
import { getUserRole } from '@/lib/authCookies';
import { useCart } from '@/lib/cartStore';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { DeliverToControl } from '@/components/navigation/DeliverToControl';
import { useTranslation } from '@/contexts/TranslationContext';
import {
  CATEGORIES,
  categoryHref,
  categoryLabel,
  subcategoryLabel,
} from '@/lib/categories';
import { useState } from 'react';

// Admin management lives in the standalone dashboard app, not in the
// storefront — this only links out to it.
const ADMIN_DASHBOARD_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3002';

export const navItems = [
  { href: '/products', label: 'common.products', icon: LayoutGrid },
  { href: '/brands', label: 'common.brands', icon: Users },
  { href: '/offers', label: 'nav.deals', icon: Sparkles },
  { href: '/cart', label: 'common.cart', icon: ShoppingCart },
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
  const { locale, setLocale, t } = useTranslation();
  const user = meQuery.data?.user || null;
  const hydrated = true;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');

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

  const categories = CATEGORIES.map((category) => ({
    name: categoryLabel(category, t),
    href: categoryHref(category.slug),
    subcategories: category.subcategories
      .slice(0, 4)
      .map((sub) => subcategoryLabel(sub, t)),
  }));

  const confirmLogout = () =>
    confirm({
      variant: 'danger',
      title: t('nav.logoutConfirm.title'),
      description: t('nav.logoutConfirm.description'),
      confirmLabel: t('nav.logoutConfirm.confirm'),
      cancelLabel: t('nav.logoutConfirm.cancel'),
      closeOnBackdrop: false,
      onConfirm: async () => {
        await logout();
        router.push('/');
      },
    });

  const wishlistHref = currentUsername
    ? `/user/${currentUsername}/wishlist`
    : '/auth/login';

  const handleNavSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = navSearch.trim();
    if (!q) return;
    router.push(`/products?q=${encodeURIComponent(q)}`);
    setMobileMenuOpen(false);
  };

  return (
    <header className='sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm'>
      {/* Utility strip — demo Deliver to + help shortcuts (not a geo engine) */}
      <div className='border-b border-stone-200 bg-stone-50 text-stone-600'>
        <div className='mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-1.5 text-xs sm:px-6 lg:px-8'>
          <DeliverToControl />
          <div className='hidden items-center gap-4 sm:flex'>
            <button
              type='button'
              onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
              className='inline-flex items-center gap-1.5 hover:text-stone-900'
              title={t('nav.switchLanguage')}
              lang={locale === 'en' ? 'ar' : 'en'}
            >
              <Globe
                className='h-3.5 w-3.5'
                aria-hidden
              />
              {locale === 'en' ? 'العربية' : 'English'}
            </button>
            <Link
              href='/offers'
              className='inline-flex items-center gap-1 font-extrabold text-fuchsia-700 hover:text-fuchsia-800'
            >
              <Sparkles
                className='h-3.5 w-3.5'
                aria-hidden
              />
              {t('nav.todaysOffers')}
            </Link>
            <p className='inline-flex items-center gap-1.5 text-stone-500'>
              <Truck
                className='h-3.5 w-3.5'
                aria-hidden
              />
              {t('nav.shippingReturns')}
            </p>
            <Link
              href='/help'
              className='hover:text-stone-900'
            >
              {t('nav.help')}
            </Link>
            <Link
              href='/shipping'
              className='hover:text-stone-900'
            >
              {t('checkout.shipping')}
            </Link>
            {user ? (
              <Link
                href='/account/orders'
                className='hover:text-stone-900'
              >
                {t('nav.orders')}
              </Link>
            ) : (
              <Link
                href='/auth/login'
                className='hover:text-stone-900'
              >
                {t('nav.returnsAndOrders')}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <div className='bg-white'>
        <div className='max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center gap-3 h-16'>
            {/* Logo */}
            <Link
              href='/'
              className='flex gap-2 items-center shrink-0'
            >
              <span className='inline-flex justify-center items-center w-10 h-10 text-white bg-gradient-to-br from-fuchsia-600 via-purple-600 to-cyan-500 rounded-lg shadow-sm'>
                <Sparkles className='w-5 h-5' />
              </span>
              <div className='leading-tight'>
                <div className='text-xl font-extrabold tracking-tight text-gray-900'>
                  TrendVaulta
                </div>
              </div>
            </Link>

            {/* Header search — tablet/desktop */}
            <form
              onSubmit={handleNavSearch}
              role='search'
              className='relative hidden flex-1 max-w-xl mx-2 md:block'
            >
              <label
                htmlFor='nav-search'
                className='sr-only'
              >
                {t('catalog.searchLabel')}
              </label>
              <Search className='pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400' />
              <input
                id='nav-search'
                type='search'
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                placeholder={t('common.search')}
                className='w-full rounded-lg border border-stone-200 bg-stone-50 py-2 ps-9 pe-20 text-sm text-stone-900 placeholder:text-stone-400 focus:border-fuchsia-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20'
              />
              <button
                type='submit'
                className='absolute end-1.5 top-1/2 -translate-y-1/2 rounded-md bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-500 px-3 py-1 text-xs font-semibold text-white'
              >
                {t('common.search')}
              </button>
            </form>

            {/* Navigation - Desktop */}
            <nav className='hidden gap-5 items-center lg:flex shrink-0'>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className='flex relative gap-1 items-center font-medium text-gray-700 transition-colors hover:text-gray-900 group'>
                    {t('common.categories')}
                    <ChevronDown className='w-4 h-4' />
                    <span className='absolute bottom-0 start-0 w-0 h-0.5 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 transition-all duration-300 group-hover:w-full'></span>
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
                              className='block p-3 rounded-lg transition-colors hover:bg-gray-50 group'
                            >
                              <div className='mb-1 text-sm font-bold text-gray-900 transition-colors group-hover:text-indigo-600'>
                                {category.name}
                              </div>
                              <div className='text-xs leading-relaxed text-gray-500'>
                                {category.subcategories.slice(0, 3).join(locale === 'ar' ? '، ' : ', ')}
                              </div>
                            </Link>
                          </DropdownMenu.Item>
                        ))}
                      </div>
                    </div>
                    <div className='p-4 bg-gray-50 border-t border-gray-200'>
                      <Link
                        href='/products'
                        className='flex gap-2 justify-center items-center text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-700'
                      >
                        {t('nav.viewAllCategories')}
                        <ChevronDown className='h-4 w-4 rotate-[-90deg] rtl:rotate-90' />
                      </Link>
                    </div>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>

              <Link
                href='/products'
                className='relative font-medium text-gray-700 transition-colors hover:text-gray-900 group'
              >
                {t('nav.shop')}
                <span className='absolute bottom-0 start-0 w-0 h-0.5 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 transition-all duration-300 group-hover:w-full'></span>
              </Link>

              <Link
                href='/brands'
                className='relative font-medium text-gray-700 transition-colors hover:text-gray-900 group'
              >
                {t('common.brands')}
                <span className='absolute bottom-0 start-0 w-0 h-0.5 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 transition-all duration-300 group-hover:w-full'></span>
              </Link>

              <Link
                href='/offers'
                className='relative font-medium text-gray-700 transition-colors hover:text-gray-900 group'
              >
                {t('nav.deals')}
                <span className='absolute bottom-0 start-0 w-0 h-0.5 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 transition-all duration-300 group-hover:w-full'></span>
              </Link>

              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className='flex relative gap-1 items-center font-medium text-gray-700 transition-colors hover:text-gray-900 group'>
                    {t('nav.more')}
                    <ChevronDown className='w-4 h-4' />
                    <span className='absolute bottom-0 start-0 w-0 h-0.5 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 transition-all duration-300 group-hover:w-full'></span>
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
                        className='flex gap-2 items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100'
                      >
                        <Info className='w-4 h-4' />
                        {t('common.about')}
                      </Link>
                    </DropdownMenu.Item>

                    <DropdownMenu.Item asChild>
                      <Link
                        href='/contact'
                        className='flex gap-2 items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100'
                      >
                        <MessageSquare className='w-4 h-4' />
                        {t('common.contact')}
                      </Link>
                    </DropdownMenu.Item>

                    <DropdownMenu.Item asChild>
                      <Link
                        href='/faq'
                        className='flex gap-2 items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100'
                      >
                        <HelpCircle className='w-4 h-4' />
                        {t('nav.faq')}
                      </Link>
                    </DropdownMenu.Item>

                    <DropdownMenu.Item asChild>
                      <Link
                        href='/terms'
                        className='flex gap-2 items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100'
                      >
                        <Scale className='w-4 h-4' />
                        {t('nav.terms')}
                      </Link>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </nav>

            {/* Right side */}
            <div className='flex gap-4 items-center'>
              {/* Cart */}
              <Link
                href='/cart'
                aria-label={t('common.cart')}
                className='relative p-2 text-gray-700 transition-colors hover:text-gray-900'
              >
                <ShoppingCart className='w-5 h-5' />
                {cart.count > 0 && (
                  <span className='flex absolute -top-1 -end-1 justify-center items-center w-5 h-5 text-xs font-bold text-white bg-indigo-600 rounded-full'>
                    {cart.count}
                  </span>
                )}
              </Link>

              {/* Wishlist */}
              <Link
                href={wishlistHref}
                aria-label={user ? t('nav.wishlist') : t('nav.signInForWishlist')}
                className='hidden p-2 text-gray-700 transition-colors sm:block hover:text-gray-900'
              >
                <Heart className='w-5 h-5' />
              </Link>

              {/* Account */}
              {!hydrated || !user ? (
                <Link
                  href='/auth/login'
                  className='inline-flex gap-2 items-center px-3 py-2 font-medium text-white bg-indigo-600 rounded-lg transition-colors hover:bg-indigo-700 sm:px-4'
                >
                  <LogIn className='w-4 h-4' />
                  <span className='hidden sm:inline'>{t('common.login')}</span>
                </Link>
              ) : (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className='flex gap-2 items-center p-2 rounded-lg transition-colors hover:bg-gray-100'>
                      <span
                        className={cn(
                          'inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold text-white',
                          avatarStyle.bg,
                        )}
                      >
                        {initials}
                      </span>
                      <span className='hidden text-sm font-medium text-gray-700 sm:block'>
                        {user?.username || t('nav.account')}
                      </span>
                      <ChevronDown className='w-4 h-4 text-gray-400' />
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
                          {user?.username || t('nav.account')}
                        </div>
                        <div className='text-xs text-gray-500'>
                          {user?.email || t('auth.signedIn')}
                        </div>
                      </div>

                      <DropdownMenu.Item asChild>
                        <Link
                          href='/account'
                          className='flex gap-2 items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100'
                        >
                          <User className='w-4 h-4' />
                          {t('nav.account')}
                        </Link>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item asChild>
                        <Link
                          href='/account/orders'
                          className='flex gap-2 items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100'
                        >
                          <Receipt className='w-4 h-4' />
                          {t('nav.orders')}
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item asChild>
                        <Link
                          href={`/user/${currentUsername}/reviews`}
                          className='flex gap-2 items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100'
                        >
                          <MessageSquare className='w-4 h-4' />
                          {t('nav.myReviews')}
                        </Link>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item asChild>
                        <Link
                          href={`/user/${currentUsername}/wishlist`}
                          className='flex gap-2 items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100'
                        >
                          <Heart className='w-4 h-4' />
                          {t('nav.wishlist')}
                        </Link>
                      </DropdownMenu.Item>

                      {getUserRole() === 'admin' ||
                      user?.roles?.includes('admin') ? (
                        <DropdownMenu.Item asChild>
                          <a
                            href={ADMIN_DASHBOARD_URL}
                            target='_blank'
                            rel='noreferrer'
                            className='flex gap-2 items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100'
                          >
                            <Shield className='w-4 h-4' />
                            {t('nav.adminDashboard')}
                          </a>
                        </DropdownMenu.Item>
                      ) : null}

                      <DropdownMenu.Separator className='my-1 h-px bg-gray-200' />

                      <DropdownMenu.Item
                        onSelect={(e) => {
                          e.preventDefault();
                          void confirmLogout();
                        }}
                        className='flex gap-2 items-center px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50'
                      >
                        <LogOut className='w-4 h-4' />
                        {t('common.logout')}
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              )}

              {/* Mobile / tablet menu button (desktop nav starts at lg) */}
              <button
                type='button'
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
                aria-controls='mobile-nav-menu'
                className='p-2 text-gray-700 lg:hidden hover:text-gray-900'
              >
                {mobileMenuOpen ? (
                  <X className='w-6 h-6' />
                ) : (
                  <Menu className='w-6 h-6' />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary department strip — desktop + mobile horizontal scroll */}
      <nav
        aria-label={t('nav.quickLinks')}
        className='border-t border-stone-100 bg-white'
      >
        <div className='mx-auto flex max-w-[1400px] items-center gap-1 overflow-x-auto px-4 py-2 text-sm sm:px-6 lg:px-8'>
          <Link
            href='/offers'
            className={cn(
              'shrink-0 rounded-full px-3 py-1 font-extrabold transition',
              pathname.startsWith('/offers')
                ? 'bg-fuchsia-100 text-fuchsia-800'
                : 'text-fuchsia-700 hover:bg-fuchsia-50',
            )}
          >
            {t('nav.todaysOffers')}
          </Link>
          {[
            ...categories.map(({ href, name }) => ({ href, label: name })),
            { href: '/brands', label: t('common.brands') },
            { href: '/#gift-finder', label: t('nav.giftFinder') },
            { href: '/help', label: t('common.contact') },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className='shrink-0 rounded-full px-3 py-1 font-semibold text-stone-700 transition hover:bg-stone-100 hover:text-stone-900'
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile / tablet menu */}
      {mobileMenuOpen && (
        <div
          id='mobile-nav-menu'
          className='bg-white border-t border-gray-200 lg:hidden'
        >
          <div className='px-4 py-4 space-y-4'>
            <form
              onSubmit={handleNavSearch}
              role='search'
              className='relative md:hidden'
            >
              <label
                htmlFor='nav-search-mobile'
                className='sr-only'
              >
                {t('catalog.searchLabel')}
              </label>
              <Search className='pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400' />
              <input
                id='nav-search-mobile'
                type='search'
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                placeholder={t('catalog.searchPlaceholder')}
                className='w-full rounded-lg border border-stone-200 bg-stone-50 py-2.5 ps-9 pe-4 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20'
              />
            </form>

            {/* Mobile nav */}
            <nav className='space-y-2'>
              {/* The utility strip holding the desktop switch is hidden on
                  small screens, so the language choice lives here too. */}
              <button
                type='button'
                onClick={() => {
                  setLocale(locale === 'en' ? 'ar' : 'en');
                  setMobileMenuOpen(false);
                }}
                lang={locale === 'en' ? 'ar' : 'en'}
                className='flex w-full items-center gap-2 rounded-lg px-4 py-2 text-start text-gray-700 hover:bg-gray-100'
              >
                <Globe className='h-4 w-4' aria-hidden />
                {locale === 'en' ? 'العربية' : 'English'}
              </button>
              <Link
                href='/products'
                onClick={() => setMobileMenuOpen(false)}
                className='block px-4 py-2 text-gray-700 rounded-lg text-medium hover:bg-gray-100'
              >
                {t('nav.shop')}
              </Link>
              <Link
                href='/brands'
                onClick={() => setMobileMenuOpen(false)}
                className='block px-4 py-2 text-gray-700 rounded-lg text-medium hover:bg-gray-100'
              >
                {t('common.brands')}
              </Link>
              <Link
                href='/offers'
                onClick={() => setMobileMenuOpen(false)}
                className='block px-4 py-2 text-gray-700 rounded-lg text-medium hover:bg-gray-100'
              >
                {t('nav.deals')}
              </Link>
              <div className='px-4 py-2 font-semibold text-gray-900 text-medium'>
                {t('nav.helpAndInfo')}
              </div>
              <div className='ps-8 space-y-2'>
                <Link
                  href='/about'
                  onClick={() => setMobileMenuOpen(false)}
                  className='block px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100'
                >
                  {t('common.about')}
                </Link>
                <Link
                  href='/contact'
                  onClick={() => setMobileMenuOpen(false)}
                  className='block px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100'
                >
                  {t('common.contact')}
                </Link>
                <Link
                  href='/faq'
                  onClick={() => setMobileMenuOpen(false)}
                  className='block px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100'
                >
                  {t('nav.faq')}
                </Link>
                <Link
                  href='/privacy'
                  onClick={() => setMobileMenuOpen(false)}
                  className='block px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100'
                >
                  {t('nav.privacy')}
                </Link>
                <Link
                  href='/terms'
                  onClick={() => setMobileMenuOpen(false)}
                  className='block px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100'
                >
                  {t('nav.terms')}
                </Link>
              </div>
              <div className='px-4 py-2 font-semibold text-gray-900 text-medium'>
                {t('common.categories')}
              </div>
              <div className='ps-8 space-y-2'>
                {categories.map((category) => (
                  <Link
                    key={category.href}
                    href={category.href}
                    className='block px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100'
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
                className='block px-4 py-2 w-full font-medium text-center text-white bg-indigo-600 rounded-lg'
              >
                {t('common.login')}
              </Link>
            ) : (
              <nav className='pt-4 space-y-2 border-t border-gray-200'>
                <Link
                  href='/account'
                  className='block px-4 py-2 text-gray-700 rounded-lg text-medium hover:bg-gray-100'
                >
                  {t('nav.account')}
                </Link>
                <Link
                  href='/account/orders'
                  className='block px-4 py-2 text-gray-700 rounded-lg text-medium hover:bg-gray-100'
                >
                  {t('nav.orders')}
                </Link>
                <Link
                  href={`/user/${currentUsername}/reviews`}
                  className='block px-4 py-2 text-gray-700 rounded-lg text-medium hover:bg-gray-100'
                >
                  {t('nav.myReviews')}
                </Link>
                <Link
                  href={`/user/${currentUsername}/wishlist`}
                  className='block px-4 py-2 text-gray-700 rounded-lg text-medium hover:bg-gray-100'
                >
                  {t('nav.wishlist')}
                </Link>
                {getUserRole() === 'admin' || user?.roles?.includes('admin') ? (
                  <a
                    href={ADMIN_DASHBOARD_URL}
                    target='_blank'
                    rel='noreferrer'
                    className='block px-4 py-2 text-gray-700 rounded-lg text-medium hover:bg-gray-100'
                  >
                    {t('nav.adminDashboard')}
                  </a>
                ) : null}
                <button
                  onClick={() => {
                    void confirmLogout();
                  }}
                  className='block px-4 py-2 w-full text-start text-red-600 rounded-lg text-medium hover:bg-red-50'
                >
                  {t('common.logout')}
                </button>
              </nav>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
