'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid,
  Users,
  ShoppingCart,
  LogIn,
  Sparkles,
  Heart,
  Menu,
  Truck,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLogout, useMe } from '@/hooks/auth/authQuery';
import { getUserRole } from '@/lib/authCookies';
import { useCart } from '@/lib/cartStore';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { DeliverToControl } from '@/components/navigation/DeliverToControl';
import { AccountMenu, CategoriesMenu, MoreMenu } from '@/components/navigation/NavMenus';
import { MobileNavDrawer } from '@/components/navigation/MobileNavDrawer';
import { SearchField } from '@/components/ui/SearchField';
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

  const wishlistHref = user ? '/user/wishlist' : '/auth/login';
  const isAdmin = getUserRole() === 'admin' || Boolean(user?.roles?.includes('admin'));

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
                href='/user/orders'
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
              <SearchField
                id='nav-search'
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                placeholder={t('common.search')}
                inputClassName='bg-surface-sunken pe-20 focus-visible:bg-surface'
              />
              <button
                type='submit'
                className='absolute end-1.5 top-1/2 -translate-y-1/2 rounded-md bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-500 px-3 py-1 text-xs font-semibold text-white'
              >
                {t('common.search')}
              </button>
            </form>

            {/* Navigation - Desktop */}
            <nav
              aria-label={t('nav.mainNav')}
              className='hidden gap-5 items-center lg:flex shrink-0'
            >
              <CategoriesMenu categories={categories} />

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

              <MoreMenu />
            </nav>

            {/* Right side */}
            <div className='flex gap-1 items-center sm:gap-4'>
              {/* Cart */}
              <Link
                href='/cart'
                aria-label={
                  cart.count > 0
                    ? t('nav.cartWithCount', { count: cart.count })
                    : t('common.cart')
                }
                className='relative p-1.5 text-gray-700 transition-colors hover:text-gray-900 sm:p-2'
              >
                <ShoppingCart className='w-5 h-5' />
                {cart.count > 0 && (
                  <span aria-hidden className='flex absolute -top-1 -end-1 justify-center items-center w-5 h-5 text-xs font-bold text-white bg-indigo-600 rounded-full'>
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
                <AccountMenu
                  name={user?.username || t('nav.account')}
                  email={user?.email}
                  initials={initials}
                  avatarClassName={avatarStyle.bg}
                  adminHref={isAdmin ? ADMIN_DASHBOARD_URL : undefined}
                  onLogout={() => void confirmLogout()}
                />
              )}

              {/* Mobile / tablet menu button (desktop nav starts at lg) */}
              <button
                type='button'
                onClick={() => setMobileMenuOpen(true)}
                aria-expanded={mobileMenuOpen}
                aria-haspopup='dialog'
                aria-label={t('nav.openMenu')}
                className='rounded-control p-1.5 text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 sm:p-2 lg:hidden'
              >
                <Menu className='h-6 w-6' aria-hidden />
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

      <MobileNavDrawer
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
        categories={categories}
        signedIn={Boolean(hydrated && user)}
        adminHref={isAdmin ? ADMIN_DASHBOARD_URL : undefined}
        onLogout={() => void confirmLogout()}
      />
    </header>
  );
}
