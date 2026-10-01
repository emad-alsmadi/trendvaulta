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
import { IconButton } from '../components/ui/IconButton';
import { Tip } from '../components/ui/Tooltip';
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
  PanelLeft,
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

/** `/orders/abc` belongs to `/orders`; `/` only matches itself. */
const matchesPath = (pathname: string, path: string) =>
  path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);

/** Rows in the dark rail: quiet until hovered, solid when current. */
const railItem =
  'relative flex h-9 w-full items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-foreground/60';
const railIdle =
  'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground';

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();
  const { t, tv, dir, locale, setLocale } = useT();
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
  // Collapsed rail: labels move into tooltips on the outer side.
  const tipSide = dir === 'rtl' ? 'left' : 'right';
  const current = navGroups
    .flatMap((group) => group.items)
    .find((item) => matchesPath(location.pathname, item.path));

  const logout = () => {
    authApi.logout(getRefreshToken());
    clearAuthSession();
    // Every cached admin query is staff data — the next sign-in on
    // this tab must not see it.
    queryClient.clear();
    navigate('/login');
  };

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

      {/* Sidebar: dark in both themes */}
      <aside
        aria-label={t('nav.label')}
        className={cn(
          'fixed start-0 top-0 z-50 flex h-full w-sidebar flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground',
          'transition-[transform,width] duration-normal',
          'max-w-[85vw] md:max-w-none md:translate-x-0 md:rtl:translate-x-0',
          mobileOpen
            ? 'translate-x-0'
            : '-translate-x-full rtl:translate-x-full',
          isSidebarOpen ? 'md:w-sidebar' : 'md:w-rail',
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            'flex h-topbar shrink-0 items-center border-b border-sidebar-border px-4',
            showLabels ? 'justify-between' : 'justify-center',
          )}
        >
          <Link
            to='/'
            className='flex min-w-0 items-center gap-2.5 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-foreground/60'
          >
            <span className='flex size-8 shrink-0 items-center justify-center rounded-control bg-sidebar-foreground text-xs font-bold tracking-tight text-sidebar'>
              TV
            </span>
            {showLabels && (
              <span className='min-w-0'>
                <span className='block truncate text-sm font-semibold leading-5'>
                  TrendVaulta
                </span>
                <span className='block truncate text-xs leading-4 text-sidebar-muted'>
                  {t('nav.admin')}
                </span>
              </span>
            )}
          </Link>
          <button
            type='button'
            onClick={() => setMobileOpen(false)}
            aria-label={t('nav.closeMenu')}
            className={cn(railItem, railIdle, 'size-9 w-9 justify-center px-0 md:hidden')}
          >
            <X
              className='icon-sm'
              aria-hidden
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className='min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4 [scrollbar-color:hsl(var(--sidebar-border))_transparent]'>
          {visibleGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {group.label &&
                (showLabels ? (
                  <p className='mb-1.5 px-3 text-caption uppercase text-sidebar-muted/70'>
                    {t(group.label)}
                  </p>
                ) : (
                  <div
                    aria-hidden
                    className='mx-2 mb-3 border-t border-sidebar-border'
                  />
                ))}
              <ul className='space-y-0.5'>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = matchesPath(location.pathname, item.path);
                  const badge = item.badge === 'messages' ? unreadMessages : 0;

                  return (
                    <li key={item.path}>
                      <Tip
                        label={showLabels ? undefined : t(item.label)}
                        side={tipSide}
                      >
                        <Link
                          to={item.path}
                          aria-current={isActive ? 'page' : undefined}
                          className={cn(
                            railItem,
                            !showLabels && 'justify-center px-0',
                            isActive
                              ? 'bg-sidebar-accent text-sidebar-foreground'
                              : railIdle,
                          )}
                        >
                          {isActive && (
                            <span
                              aria-hidden
                              className='absolute inset-y-2 -start-3 w-0.5 rounded-e bg-sidebar-foreground'
                            />
                          )}
                          <Icon
                            className='icon-md'
                            aria-hidden
                          />
                          {showLabels ? (
                            <span className='min-w-0 truncate'>
                              {t(item.label)}
                            </span>
                          ) : (
                            <span className='sr-only'>{t(item.label)}</span>
                          )}
                          {badge > 0 &&
                            (showLabels ? (
                              <span className='ms-auto rounded-full bg-sidebar-foreground px-1.5 py-0.5 text-[0.6875rem] font-semibold leading-none tabular-nums text-sidebar'>
                                {badge > 99 ? '99+' : badge}
                                <span className='sr-only'>
                                  {' '}
                                  {t('common.unread')}
                                </span>
                              </span>
                            ) : (
                              // Collapsed rail: a dot, with the count for screen readers
                              <span className='absolute end-2.5 top-1.5 size-2 rounded-full bg-sidebar-foreground ring-2 ring-sidebar'>
                                <span className='sr-only'>
                                  {badge} {t('common.unread')}
                                </span>
                              </span>
                            ))}
                        </Link>
                      </Tip>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Sidebar footer: who is signed in, and the way out */}
        <div className='shrink-0 border-t border-sidebar-border p-3'>
          {showLabels && (
            <div className='mb-1 flex items-center gap-2.5 px-3 py-2'>
              <span className='flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold uppercase'>
                {(role ?? '?').charAt(0)}
              </span>
              <span className='min-w-0'>
                <span className='block truncate text-sm font-medium leading-5'>
                  {tv('role', role)}
                </span>
                <span className='block truncate text-xs leading-4 text-sidebar-muted'>
                  TrendVaulta
                </span>
              </span>
            </div>
          )}
          <Tip
            label={showLabels ? undefined : t('nav.logout')}
            side={tipSide}
          >
            <button
              type='button'
              onClick={logout}
              aria-label={showLabels ? undefined : t('nav.logout')}
              className={cn(
                railItem,
                railIdle,
                !showLabels && 'justify-center px-0',
              )}
            >
              <LogOut
                className='icon-md rtl:-scale-x-100'
                aria-hidden
              />
              {showLabels && <span>{t('nav.logout')}</span>}
            </button>
          </Tip>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          'transition-[margin] duration-normal',
          isSidebarOpen ? 'md:ms-sidebar' : 'md:ms-rail',
        )}
      >
        {/* Topbar */}
        <header className='sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70'>
          <div className='flex h-topbar items-center gap-2 px-4 sm:px-6'>
            {/* Mobile: open drawer */}
            <IconButton
              icon={<Menu aria-hidden />}
              label={t('nav.openMenu')}
              size='md'
              tooltip={false}
              onClick={() => setMobileOpen(true)}
              className='md:hidden'
            />
            {/* Desktop: collapse rail */}
            <IconButton
              icon={
                <PanelLeft
                  className='rtl:-scale-x-100'
                  aria-hidden
                />
              }
              label={isSidebarOpen ? t('nav.collapse') : t('nav.expand')}
              size='md'
              aria-expanded={isSidebarOpen}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className='hidden md:inline-flex'
            />

            <span
              aria-hidden
              className='mx-1 hidden h-5 w-px bg-border md:block'
            />

            {/* Where am I: Admin › current section */}
            <nav
              aria-label={t('nav.breadcrumb')}
              className='flex min-w-0 items-center gap-1.5 text-sm'
            >
              <Link
                to='/'
                className='hidden rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline'
              >
                {t('nav.admin')}
              </Link>
              {current && (
                <>
                  <ChevronRight
                    className='icon-xs hidden text-muted-foreground rtl:-scale-x-100 sm:block'
                    aria-hidden
                  />
                  <span
                    aria-current='page'
                    className='truncate font-medium text-foreground'
                  >
                    {t(current.label)}
                  </span>
                </>
              )}
            </nav>

            <div className='ms-auto flex items-center gap-1'>
              <button
                type='button'
                onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
                aria-label={t('common.switchLanguageLabel')}
                lang={locale === 'en' ? 'ar' : 'en'}
                className='inline-flex h-control items-center gap-2 rounded-control px-2.5 text-sm font-medium text-muted-foreground transition-colors duration-fast hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              >
                <Languages
                  className='icon-sm'
                  aria-hidden
                />
                <span className='hidden sm:inline'>
                  {t('common.switchLanguage')}
                </span>
              </button>
              <IconButton
                icon={theme === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
                label={t('nav.toggleTheme')}
                size='md'
                aria-pressed={theme === 'dark'}
                onClick={toggleTheme}
              />
            </div>
          </div>
        </header>

        {/* Page content */}
        <div
          // Keyed so each page fades in once; pages need no entrance of their own.
          key={location.pathname}
          className='page-transition mx-auto max-w-content p-4 sm:p-6 lg:p-8'
        >
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
