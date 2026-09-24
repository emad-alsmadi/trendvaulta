'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Heart,
  LayoutGrid,
  LogOut,
  MapPin,
  Package,
  Shield,
  Star,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { useTranslation } from '@/contexts/TranslationContext';
import { useLogout, useMe } from '@/hooks/auth/authQuery';
import { getAuthToken } from '@/lib/authCookies';
import { buildLoginUrl } from '@/lib/safeRedirect';
import { cn } from '@/lib/utils';

/** `label` is a message key. `exact` marks the overview, which would otherwise match every page. */
const SECTIONS = [
  { href: '/user', label: 'userArea.nav.overview', icon: LayoutGrid, exact: true },
  { href: '/user/orders', label: 'common.orders', icon: Package },
  { href: '/user/wishlist', label: 'userArea.sidebar.wishlist', icon: Heart },
  { href: '/user/reviews', label: 'userArea.reviews.title', icon: Star },
  { href: '/user/addresses', label: 'common.addresses', icon: MapPin },
  { href: '/user/profile', label: 'userArea.sidebar.profile', icon: UserRound },
  { href: '/user/security', label: 'common.security', icon: Shield },
] as const;

function initialsOf(value: string) {
  const parts = value.trim().split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : value.slice(0, 2);
  return letters.toUpperCase() || 'U';
}

/** Header + section navigation shared by every page under /user. */
export function UserShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const confirm = useConfirm();
  const logout = useLogout();
  const { t } = useTranslation();
  const { data } = useMe();
  const user = data?.user;
  const name = user?.username || user?.email?.split('@')[0] || '';

  // proxy.ts guards /user on the server; this covers a token that expires
  // while the page is open.
  useEffect(() => {
    if (!getAuthToken()) router.replace(buildLoginUrl(pathname));
  }, [router, pathname]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const signOut = () =>
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

  return (
    <div className='mx-auto max-w-7xl space-y-6'>
      <section className='flex flex-col gap-4 rounded-3xl border border-white/40 bg-white/55 p-5 shadow-sm backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex min-w-0 items-center gap-4'>
          <span
            aria-hidden
            className='inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-cyan-500 text-lg font-extrabold text-white shadow-sm'
          >
            {name ? initialsOf(name) : <UserRound className='h-6 w-6' />}
          </span>
          <div className='min-w-0'>
            <p className='text-xl font-extrabold tracking-tight text-indigo-950 sm:text-2xl'>
              {t('account.welcomeBack', {
                name: name || t('account.customerFallback'),
              })}
            </p>
            {user?.email && (
              <p className='truncate text-sm font-semibold text-indigo-950/70'>{user.email}</p>
            )}
          </div>
        </div>
        <Button variant='outline' size='sm' onClick={() => void signOut()} className='self-start sm:self-auto'>
          <LogOut className='me-2 h-4 w-4 rtl:-scale-x-100' aria-hidden />
          {t('account.signOut')}
        </Button>
      </section>

      <div className='grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]'>
        <nav aria-label={t('account.sectionsLabel')} className='lg:sticky lg:top-40 lg:self-start'>
          <ul className='-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:rounded-3xl lg:border lg:border-white/30 lg:bg-white/40 lg:p-2 lg:backdrop-blur-xl'>
            {SECTIONS.map((section) => {
              const active = isActive(section.href, 'exact' in section && section.exact);
              const Icon = section.icon;
              return (
                <li key={section.href} className='shrink-0'>
                  <Link
                    href={section.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-colors lg:border-transparent',
                      active
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 lg:border-indigo-200'
                        : 'border-white/30 bg-white/40 text-indigo-950/70 hover:bg-white/70 hover:text-indigo-950 lg:bg-transparent',
                    )}
                  >
                    <Icon className='h-4 w-4 shrink-0' aria-hidden />
                    {t(section.label)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className='min-w-0'>{children}</div>
      </div>
    </div>
  );
}
