'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowRight,
  ChevronDown,
  Heart,
  HelpCircle,
  Info,
  LogOut,
  MessageSquare,
  Receipt,
  Scale,
  Shield,
  User,
} from 'lucide-react';
import { cn, isActiveNavPath } from '@/lib/utils';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownItemContent,
  DropdownSeparator,
  DropdownTrigger,
} from '@/components/ui/Dropdown';
import { useTranslation } from '@/contexts/TranslationContext';

export type NavCategory = { name: string; href: string; subcategories: string[] };

/** Desktop nav text trigger with the brand underline on hover / open. */
function NavTrigger({ label }: { label: string }) {
  return (
    <DropdownTrigger asChild>
      <button
        type='button'
        className='group relative flex items-center gap-1 font-medium text-gray-700 outline-none transition-colors hover:text-gray-900 focus-visible:text-gray-900 data-[state=open]:text-gray-900'
      >
        {label}
        <ChevronDown
          aria-hidden
          className='h-4 w-4 transition-transform duration-(--dur-base) ease-brand group-data-[state=open]:rotate-180'
        />
        <span className='absolute bottom-0 start-0 h-0.5 w-0 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 transition-all duration-300 group-hover:w-full group-focus-visible:w-full group-data-[state=open]:w-full' />
      </button>
    </DropdownTrigger>
  );
}

export function CategoriesMenu({ categories }: { categories: NavCategory[] }) {
  const { t, locale } = useTranslation();
  return (
    <Dropdown>
      <NavTrigger label={t('common.categories')} />
      <DropdownContent align='start' className='w-[min(28rem,calc(100vw-2rem))] p-2'>
        <div className='grid grid-cols-2 gap-1'>
          {categories.map((category) => (
            <DropdownItem key={category.href} asChild className='block py-3'>
              <Link href={category.href}>
                <span className='block text-sm font-semibold text-ink'>{category.name}</span>
                <span className='mt-1 block text-xs leading-relaxed text-ink-muted'>
                  {category.subcategories.slice(0, 3).join(locale === 'ar' ? '، ' : ', ')}
                </span>
              </Link>
            </DropdownItem>
          ))}
        </div>
        <DropdownSeparator className='mx-0' />
        <DropdownItem asChild className='justify-center font-semibold text-accent'>
          <Link href='/products'>
            {t('nav.viewAllCategories')}
            <ArrowRight aria-hidden className='h-4 w-4 rtl:-scale-x-100' />
          </Link>
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}

const MORE_LINKS = [
  { href: '/about', label: 'common.about', icon: Info },
  { href: '/contact', label: 'common.contact', icon: MessageSquare },
  { href: '/faq', label: 'nav.faq', icon: HelpCircle },
  { href: '/terms', label: 'nav.terms', icon: Scale },
] as const;

export function MoreMenu() {
  const { t } = useTranslation();
  const pathname = usePathname();
  return (
    <Dropdown>
      <NavTrigger label={t('nav.more')} />
      <DropdownContent align='start'>
        {MORE_LINKS.map(({ href, label, icon }) => (
          <DropdownItem key={href} asChild>
            <Link href={href} aria-current={isActiveNavPath(pathname, href) ? 'page' : undefined}>
              <DropdownItemContent icon={icon}>{t(label)}</DropdownItemContent>
            </Link>
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}

export const ACCOUNT_LINKS = [
  { href: '/user', label: 'nav.account', icon: User },
  { href: '/user/orders', label: 'nav.orders', icon: Receipt },
  { href: '/user/reviews', label: 'nav.myReviews', icon: MessageSquare },
  { href: '/user/wishlist', label: 'nav.wishlist', icon: Heart },
] as const;

type AccountMenuProps = {
  name: string;
  email?: string;
  initials: string;
  avatarClassName: string;
  adminHref?: string;
  onLogout: () => void;
};

export function AccountMenu({ name, email, initials, avatarClassName, adminHref, onLogout }: AccountMenuProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const avatar = (
    <span
      aria-hidden
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white',
        avatarClassName,
      )}
    >
      {initials}
    </span>
  );

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button
          type='button'
          className='group flex items-center gap-1 rounded-control p-1 outline-none transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-accent data-[state=open]:bg-gray-100 sm:gap-2 sm:p-1.5'
        >
          {avatar}
          <span className='hidden max-w-[10rem] truncate text-sm font-medium text-gray-700 sm:block'>{name}</span>
          <ChevronDown
            aria-hidden
            className='h-4 w-4 text-gray-400 transition-transform duration-(--dur-base) ease-brand group-data-[state=open]:rotate-180'
          />
        </button>
      </DropdownTrigger>

      <DropdownContent className='w-64'>
        <div className='flex items-center gap-3 px-3 pb-3 pt-2'>
          {avatar}
          <div className='min-w-0'>
            <p className='truncate text-sm font-semibold text-ink'>{name}</p>
            <p className='truncate text-xs text-ink-muted'>{email || t('auth.signedIn')}</p>
          </div>
        </div>
        <DropdownSeparator />

        {ACCOUNT_LINKS.map(({ href, label, icon }) => {
          // '/user' itself must match only exactly — isActiveNavPath's
          // prefix rule would otherwise also mark "Account" current on
          // every /user/* subpage that already has its own entry here.
          const active = href === '/user' ? pathname === href : isActiveNavPath(pathname, href);
          return (
            <DropdownItem key={href} asChild>
              <Link href={href} aria-current={active ? 'page' : undefined}>
                <DropdownItemContent icon={icon}>{t(label)}</DropdownItemContent>
              </Link>
            </DropdownItem>
          );
        })}

        {adminHref && (
          <DropdownItem asChild>
            <a href={adminHref} target='_blank' rel='noreferrer'>
              <DropdownItemContent icon={Shield}>{t('nav.adminDashboard')}</DropdownItemContent>
            </a>
          </DropdownItem>
        )}

        <DropdownSeparator />
        <DropdownItem
          icon={LogOut}
          tone='danger'
          onSelect={(e) => {
            e.preventDefault();
            onLogout();
          }}
        >
          {t('common.logout')}
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
