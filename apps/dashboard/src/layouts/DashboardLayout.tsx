import {
  Outlet,
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import {
  LayoutDashboard,
  ChartColumn,
  AlertTriangle,
  Users,
  Package,
  Tag,
  FolderTree,
  ShoppingCart,
  Truck,
  TicketPercent,
  Percent,
  Star,
  Inbox,
  HelpCircle,
  FileText,
  Layers,
  BookOpen,
  MessageSquare,
  PackageOpen,
  Gift,
  MessageCircle,
  Mail,
  Settings,
  LogOut,
  Menu,
  X,
  Languages,
  Sun,
  Moon,
  Monitor,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { useT } from '../i18n/I18nProvider';
import type { MessageKey } from '../i18n/en';
import { useTheme } from '../hooks/useTheme';
import { authApi } from '../lib/api';
import {
  clearAuthSession,
  getAuthRole,
  getAuthToken,
  getRefreshToken,
} from '../lib/auth';
import { isStaffRole, roleHasPermission } from '../lib/permissions';
import { useUnreadContactCount } from '../hooks/useAdminContactMessages';
import { cn } from '../lib/cn';

type NavItem = {
  icon: LucideIcon;
  label: MessageKey;
  path: string;
  permission?: string;
  badge?: 'messages';
};

type NavGroup = {
  label?: MessageKey;
  items: NavItem[];
};

/** Navigation grouped by functional area */
const navGroups: NavGroup[] = [
  {
    items: [
      { icon: LayoutDashboard, label: 'nav.items.dashboard', path: '/' },
      {
        icon: ChartColumn,
        label: 'nav.items.analytics',
        path: '/analytics',
        permission: 'orders:read',
      },
    ],
  },
  {
    label: 'nav.groups.catalog',
    items: [
      {
        icon: Package,
        label: 'nav.items.products',
        path: '/products',
        permission: 'products:read',
      },
      {
        icon: Tag,
        label: 'nav.items.brands',
        path: '/brands',
        permission: 'brands:read',
      },
      {
        icon: FolderTree,
        label: 'nav.items.categories',
        path: '/categories',
        permission: 'products:read',
      },
      {
        icon: AlertTriangle,
        label: 'nav.items.lowStock',
        path: '/low-stock',
        permission: 'products:read',
      },
    ],
  },
  {
    label: 'nav.groups.sales',
    items: [
      {
        icon: ShoppingCart,
        label: 'nav.items.orders',
        path: '/orders',
        permission: 'orders:read',
      },
      {
        icon: Truck,
        label: 'nav.items.shippingZones',
        path: '/shipping-zones',
        permission: 'shipping:read',
      },
      {
        icon: TicketPercent,
        label: 'nav.items.coupons',
        path: '/coupons',
        permission: 'coupons:read',
      },
      {
        icon: Percent,
        label: 'nav.items.offers',
        path: '/offers',
        permission: 'offers:read',
      },
    ],
  },
  {
    label: 'nav.groups.customers',
    items: [
      {
        icon: Users,
        label: 'nav.items.users',
        path: '/users',
        permission: 'users:read',
      },
      {
        icon: Star,
        label: 'nav.items.reviews',
        path: '/reviews',
        permission: 'reviews:read',
      },
    ],
  },
  {
    label: 'nav.groups.content',
    items: [
      {
        icon: Inbox,
        label: 'nav.items.messages',
        path: '/messages',
        permission: 'content:read',
        badge: 'messages',
      },
      {
        icon: Mail,
        label: 'nav.items.subscribers',
        path: '/subscribers',
        permission: 'content:read',
      },
      {
        icon: HelpCircle,
        label: 'nav.items.helpTopics',
        path: '/help-topics',
        permission: 'content:read',
      },
      {
        icon: FileText,
        label: 'nav.items.content',
        path: '/content',
        permission: 'content:read',
      },
      {
        icon: Layers,
        label: 'nav.items.storefrontModules',
        path: '/storefront-modules',
        permission: 'content:read',
      },
      {
        icon: BookOpen,
        label: 'nav.items.lookbooks',
        path: '/lookbooks',
        permission: 'content:read',
      },
      {
        icon: MessageSquare,
        label: 'nav.items.testimonials',
        path: '/testimonials',
        permission: 'content:read',
      },
      {
        icon: PackageOpen,
        label: 'nav.items.bundles',
        path: '/bundles',
        permission: 'content:read',
      },
      {
        icon: Gift,
        label: 'nav.items.giftFinder',
        path: '/gift-finder-config',
        permission: 'content:read',
      },
      {
        icon: MessageCircle,
        label: 'nav.items.productQa',
        path: '/product-qa',
        permission: 'content:read',
      },
    ],
  },
  {
    items: [{ icon: Settings, label: 'nav.items.settings', path: '/settings' }],
  },
];

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();
  const { t, locale, setLocale } = useT();
  // Desktop: collapsible rail. Mobile (<md): off-canvas drawer.
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = getAuthRole();
  // Before the auth redirects below: hooks must run on every render.
  const unreadMessages =
    useUnreadContactCount(
      Boolean(getAuthToken()) && roleHasPermission(role, 'content:read'),
    ).data ?? 0;

  // Close the drawer after navigating on small screens.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (!getAuthToken()) {
    return (
      <Navigate
        to='/login'
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // Signed in but not staff: the API would 403 every page. Drop the session
  // so the login form is shown with a clear reason.
  if (!isStaffRole(role)) {
    clearAuthSession();
    return (
      <Navigate
        to='/login'
        replace
        state={{ from: location.pathname, reason: 'forbidden' }}
      />
    );
  }

  // Filter items by permissions
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.permission || roleHasPermission(role, item.permission),
      ),
    }))
    .filter((group) => group.items.length > 0);

  const showLabels = isSidebarOpen || mobileOpen;

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  return (
    <div className='min-h-screen bg-canvas'>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type='button'
          aria-label={t('nav.closeMenu')}
          onClick={() => setMobileOpen(false)}
          className='fixed inset-0 z-40 bg-backdrop md:hidden'
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label={t('nav.label')}
        className={cn(
          'fixed start-0 top-0 z-50 flex h-full flex-col border-e border-border transition-[transform,width] duration-normal',
          'bg-gradient-to-b from-brand-purple via-brand-indigo to-brand-cyan',
          'max-w-[85vw] md:translate-x-0 md:rtl:translate-x-0 md:max-w-none',
          mobileOpen
            ? 'translate-x-0'
            : '-translate-x-full rtl:translate-x-full',
          isSidebarOpen ? 'md:w-sidebar' : 'md:w-rail',
        )}
      >
        {/* Logo */}
        <div className='flex shrink-0 items-center justify-between p-4 border-b border-white/10'>
          <Link
            to='/'
            className='flex items-center gap-2.5'
          >
            <div className='flex size-8 items-center justify-center rounded-control bg-white/20 text-white backdrop-blur-sm'>
              <span className='text-sm font-bold'>TV</span>
            </div>
            {showLabels && (
              <h1 className='text-lg font-semibold text-white'>TrendVaulta</h1>
            )}
          </Link>
          <button
            type='button'
            onClick={() => setMobileOpen(false)}
            aria-label={t('nav.closeMenu')}
            className='rounded-control p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white md:hidden'
          >
            <X
              className='icon-sm'
              aria-hidden
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className='mt-4 min-h-0 flex-1 overflow-y-auto px-2'>
          {visibleGroups.map((group, groupIndex) => (
            <div
              key={groupIndex}
              className='mb-6'
            >
              {group.label && showLabels && (
                <p className='mb-2 px-3 text-xs font-medium text-white/60 uppercase tracking-wider'>
                  {t(group.label)}
                </p>
              )}
              <ul className='space-y-1'>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  const badge = item.badge === 'messages' ? unreadMessages : 0;

                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'relative flex items-center gap-3 rounded-control px-3 py-2 text-sm font-medium transition-all duration-200',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                          isActive
                            ? 'bg-white/20 text-white shadow-lg'
                            : 'text-white/80 hover:bg-white/10 hover:text-white',
                        )}
                      >
                        <Icon
                          className='icon-sm shrink-0'
                          aria-hidden
                        />
                        {!showLabels && (
                          <span className='sr-only'>{t(item.label)}</span>
                        )}
                        {showLabels && <span>{t(item.label)}</span>}
                        {badge > 0 &&
                          (showLabels ? (
                            <span className='ms-auto rounded-badge bg-white px-1.5 py-0.5 text-xs font-medium text-brand-purple'>
                              {badge > 99 ? '99+' : badge}
                              <span className='sr-only'>
                                {' '}
                                {t('common.unread')}
                              </span>
                            </span>
                          ) : (
                            // Collapsed rail: a dot, with the count for screen readers
                            <span className='absolute end-2 top-2 size-2 rounded-full bg-white'>
                              <span className='sr-only'>
                                {badge} {t('common.unread')}
                              </span>
                            </span>
                          ))}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className='shrink-0 border-t border-white/10 px-2 py-4'>
          <div className='space-y-1'>
            <button
              type='button'
              onClick={toggleTheme}
              aria-label={showLabels ? undefined : t('nav.toggleTheme')}
              className={cn(
                'flex w-full items-center gap-3 rounded-control px-3 py-2 text-sm font-medium transition-all duration-200',
                'text-white/80 hover:bg-white/10 hover:text-white hover:shadow-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                'group',
              )}
            >
              <div className='relative flex items-center justify-center'>
                <ThemeIcon
                  className={cn(
                    'icon-sm shrink-0 transition-transform duration-200 group-hover:scale-110',
                    theme === 'dark' && 'rotate-180',
                  )}
                  aria-hidden
                />
              </div>
              {showLabels && (
                <span className='font-medium transition-colors duration-200 group-hover:text-white'>
                  {t('nav.toggleTheme')}
                </span>
              )}
            </button>

            <button
              type='button'
              onClick={() => {
                authApi.logout(getRefreshToken());
                clearAuthSession();
                // Every cached admin query is staff data — the next sign-in on
                // this tab must not see it.
                queryClient.clear();
                navigate('/login');
              }}
              aria-label={showLabels ? undefined : t('nav.logout')}
              className={cn(
                'flex w-full items-center gap-3 rounded-control px-3 py-2 text-sm font-medium transition-all duration-200',
                'text-white/80 hover:bg-white/10 hover:text-white hover:shadow-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                'group',
              )}
            >
              <LogOut
                className={cn(
                  'icon-sm shrink-0 rtl:-scale-x-100 transition-transform duration-200 group-hover:scale-110',
                )}
                aria-hidden
              />
              {showLabels && (
                <span className='font-medium transition-colors duration-200 group-hover:text-white'>
                  {t('nav.logout')}
                </span>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          'transition-all duration-normal',
          isSidebarOpen ? 'md:ms-sidebar' : 'md:ms-rail',
        )}
      >
        {/* Topbar */}
        <header className='sticky top-0 z-40 border-b border-border bg-gradient-to-r from-brand-purple/10 via-brand-indigo/10 to-brand-cyan/10 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
          <div className='flex h-topbar items-center gap-3 px-4 sm:px-6'>
            {/* Mobile: open drawer */}
            <button
              type='button'
              onClick={() => setMobileOpen(true)}
              aria-label={t('nav.openMenu')}
              className='rounded-control p-2 text-muted-foreground transition-colors hover:bg-brand-purple/20 hover:text-brand-purple md:hidden'
            >
              <Menu
                className='icon-md'
                aria-hidden
              />
            </button>
            {/* Desktop: collapse rail */}
            <button
              type='button'
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label={isSidebarOpen ? t('nav.collapse') : t('nav.expand')}
              className='hidden rounded-control p-2 text-muted-foreground transition-colors hover:bg-brand-purple/20 hover:text-brand-purple md:inline-flex'
            >
              {isSidebarOpen ? (
                <ChevronRight
                  className='icon-md rtl:-rotate-180'
                  aria-hidden
                />
              ) : (
                <Menu
                  className='icon-md'
                  aria-hidden
                />
              )}
            </button>

            {/* Breadcrumb (simplified - can be enhanced later) */}
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              <span className='font-medium text-foreground'>
                {t('nav.admin')}
              </span>
            </div>

            {/* Right side actions */}
            <div className='ms-auto flex items-center gap-2'>
              {/* Language switcher */}
              <div className='relative group'>
                <button
                  type='button'
                  onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
                  aria-label={t('common.switchLanguageLabel')}
                  lang={locale === 'en' ? 'ar' : 'en'}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-control border border-brand-purple/30 bg-white/50 px-3 py-1.5 text-sm font-medium transition-all duration-200',
                    'text-foreground hover:bg-brand-purple/20 hover:border-brand-purple hover:text-brand-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    'shadow-sm hover:shadow-md backdrop-blur-sm',
                  )}
                >
                  <Languages
                    className='icon-sm'
                    aria-hidden
                  />
                  <span className='hidden sm:inline font-semibold'>
                    {locale === 'en' ? 'AR' : 'EN'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className='p-4 sm:p-6 page-transition'>
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
