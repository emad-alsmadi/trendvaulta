'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Globe,
  HelpCircle,
  Info,
  LayoutGrid,
  LogIn,
  LogOut,
  MessageSquare,
  Scale,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Drawer } from '@/components/ui/Drawer';
import { buttonVariants } from '@/components/ui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { ACCOUNT_LINKS, type NavCategory } from '@/components/navigation/NavMenus';

const MAIN_LINKS = [
  { href: '/products', label: 'nav.shop', icon: LayoutGrid },
  { href: '/brands', label: 'common.brands', icon: Users },
  { href: '/offers', label: 'nav.deals', icon: Sparkles },
] as const;

const INFO_LINKS = [
  { href: '/about', label: 'common.about', icon: Info },
  { href: '/contact', label: 'common.contact', icon: MessageSquare },
  { href: '/faq', label: 'nav.faq', icon: HelpCircle },
  { href: '/privacy', label: 'nav.privacy', icon: ShieldCheck },
  { href: '/terms', label: 'nav.terms', icon: Scale },
] as const;

type MobileNavDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: NavCategory[];
  signedIn: boolean;
  adminHref?: string;
  onLogout: () => void;
};

const rowClass =
  'flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-start text-sm font-medium text-ink transition-colors duration-(--dur-fast) hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none';

function GroupLabel({ children }: { children: ReactNode }) {
  return <p className='px-3 pb-1.5 pt-5 text-eyebrow uppercase text-ink-subtle'>{children}</p>;
}

function NavRow({
  href,
  label,
  icon: Icon,
  pathname,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  pathname: string;
  onNavigate: () => void;
}) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(rowClass, active && 'bg-accent-soft text-accent hover:bg-accent-soft')}
    >
      <Icon aria-hidden className={cn('h-4 w-4 shrink-0', active ? 'text-accent' : 'text-ink-subtle')} />
      <span className='truncate'>{label}</span>
    </Link>
  );
}

/** Mobile / tablet nav (below lg) — a side drawer instead of a push-down panel. */
export function MobileNavDrawer({
  open,
  onOpenChange,
  categories,
  signedIn,
  adminHref,
  onLogout,
}: MobileNavDrawerProps) {
  const { t, locale, setLocale } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const close = () => onOpenChange(false);
  const row = (href: string, label: string, icon: LucideIcon) => (
    <NavRow key={href} href={href} label={label} icon={icon} pathname={pathname} onNavigate={close} />
  );

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title='TrendVaulta'
      description={t('nav.mobileNav')}
      footer={
        signedIn ? (
          <button
            type='button'
            onClick={() => {
              close();
              onLogout();
            }}
            className={cn(rowClass, 'justify-center text-red-600 hover:bg-red-50')}
          >
            <LogOut aria-hidden className='h-4 w-4' />
            {t('common.logout')}
          </button>
        ) : (
          <Link href='/auth/login' onClick={close} className={cn(buttonVariants({ size: 'sm' }), 'w-full')}>
            <LogIn aria-hidden className='h-4 w-4' />
            {t('common.login')}
          </Link>
        )
      }
    >
      <form
        role='search'
        className='relative px-1 pt-1'
        onSubmit={(e) => {
          e.preventDefault();
          const q = query.trim();
          if (!q) return;
          router.push(`/products?q=${encodeURIComponent(q)}`);
          close();
        }}
      >
        <label htmlFor='nav-search-drawer' className='sr-only'>
          {t('catalog.searchLabel')}
        </label>
        <Search aria-hidden className='pointer-events-none absolute start-4 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 text-ink-subtle' />
        <input
          id='nav-search-drawer'
          type='search'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('catalog.searchPlaceholder')}
          className='w-full rounded-control border border-line bg-surface-sunken py-2.5 pe-3 ps-9 text-sm text-ink placeholder:text-ink-subtle focus:border-fuchsia-300 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20'
        />
      </form>

      <nav aria-label={t('nav.mobileNav')} className='mt-2'>
        {MAIN_LINKS.map(({ href, label, icon }) => (
          row(href, t(label), icon)
        ))}

        <GroupLabel>{t('common.categories')}</GroupLabel>
        {categories.map((category) => (
          <Link
            key={category.href}
            href={category.href}
            onClick={close}
            className={cn(rowClass, 'block')}
          >
            <span className='block font-medium'>{category.name}</span>
            <span className='mt-0.5 block truncate text-xs font-normal text-ink-muted'>
              {category.subcategories.join(' • ')}
            </span>
          </Link>
        ))}

        {signedIn && (
          <>
            <GroupLabel>{t('nav.account')}</GroupLabel>
            {ACCOUNT_LINKS.map(({ href, label, icon }) => (
              row(href, t(label), icon)
            ))}
            {adminHref && (
              <a href={adminHref} target='_blank' rel='noreferrer' className={rowClass}>
                <Shield aria-hidden className='h-4 w-4 shrink-0 text-ink-subtle' />
                {t('nav.adminDashboard')}
              </a>
            )}
          </>
        )}

        <GroupLabel>{t('nav.helpAndInfo')}</GroupLabel>
        {INFO_LINKS.map(({ href, label, icon }) => (
          row(href, t(label), icon)
        ))}

        {/* The utility strip holding the desktop switch is hidden on small
            screens, so the language choice lives here too. */}
        <button
          type='button'
          onClick={() => {
            setLocale(locale === 'en' ? 'ar' : 'en');
            close();
          }}
          lang={locale === 'en' ? 'ar' : 'en'}
          className={cn(rowClass, 'mt-3 border-t border-line pt-4')}
        >
          <Globe aria-hidden className='h-4 w-4 shrink-0 text-ink-subtle' />
          {locale === 'en' ? 'العربية' : 'English'}
        </button>
      </nav>
    </Drawer>
  );
}
