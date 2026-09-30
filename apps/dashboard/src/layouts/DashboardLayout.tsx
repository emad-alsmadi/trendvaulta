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

/** `permission` is the read permission the page needs; omitted = any staff. */
const sidebarItems: Array<{
  icon: LucideIcon;
  label: MessageKey;
  path: string;
  permission?: string;
}> = [
  { icon: LayoutDashboard, label: 'nav.items.dashboard', path: '/' },
  { icon: ChartColumn, label: 'nav.items.analytics', path: '/analytics', permission: 'orders:read' },
  { icon: Users, label: 'nav.items.users', path: '/users', permission: 'users:read' },
  { icon: Package, label: 'nav.items.products', path: '/products', permission: 'products:read' },
  { icon: Tag, label: 'nav.items.brands', path: '/brands', permission: 'brands:read' },
  { icon: FolderTree, label: 'nav.items.categories', path: '/categories', permission: 'products:read' },
  { icon: AlertTriangle, label: 'nav.items.lowStock', path: '/low-stock', permission: 'products:read' },
  { icon: ShoppingCart, label: 'nav.items.orders', path: '/orders', permission: 'orders:read' },
  { icon: Truck, label: 'nav.items.shippingZones', path: '/shipping-zones', permission: 'shipping:read' },
  { icon: TicketPercent, label: 'nav.items.coupons', path: '/coupons', permission: 'coupons:read' },
  { icon: Percent, label: 'nav.items.offers', path: '/offers', permission: 'offers:read' },
  { icon: Star, label: 'nav.items.reviews', path: '/reviews', permission: 'reviews:read' },
  { icon: Inbox, label: 'nav.items.messages', path: '/messages', permission: 'content:read' },
  { icon: Mail, label: 'nav.items.subscribers', path: '/subscribers', permission: 'content:read' },
  { icon: HelpCircle, label: 'nav.items.helpTopics', path: '/help-topics', permission: 'content:read' },
  { icon: FileText, label: 'nav.items.content', path: '/content', permission: 'content:read' },
  { icon: Layers, label: 'nav.items.storefrontModules', path: '/storefront-modules', permission: 'content:read' },
  { icon: BookOpen, label: 'nav.items.lookbooks', path: '/lookbooks', permission: 'content:read' },
  { icon: MessageSquare, label: 'nav.items.testimonials', path: '/testimonials', permission: 'content:read' },
  { icon: PackageOpen, label: 'nav.items.bundles', path: '/bundles', permission: 'content:read' },
  { icon: Gift, label: 'nav.items.giftFinder', path: '/gift-finder-config', permission: 'content:read' },
  { icon: MessageCircle, label: 'nav.items.productQa', path: '/product-qa', permission: 'content:read' },
  { icon: Settings, label: 'nav.items.settings', path: '/settings' },
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

  const visibleItems = sidebarItems.filter(
    (item) => !item.permission || roleHasPermission(role, item.permission),
  );

  const showLabels = isSidebarOpen || mobileOpen;

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type='button'
          aria-label={t('nav.closeMenu')}
          onClick={() => setMobileOpen(false)}
          className='fixed inset-0 z-40 bg-black/40 md:hidden'
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label={t('nav.label')}
        className={`fixed start-0 top-0 z-50 h-full w-64 max-w-[85vw] border-e border-gray-200 bg-white transition-[transform,width] duration-200 dark:border-gray-700 dark:bg-gray-800 md:translate-x-0 md:rtl:translate-x-0 md:max-w-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'
        } ${isSidebarOpen ? 'md:w-64' : 'md:w-20'}`}
      >
        <div className='flex items-center justify-between p-4'>
          <h1 className='text-xl font-bold text-gray-900 dark:text-white'>
            {showLabels ? 'TrendVaulta' : 'TV'}
          </h1>
          <button
            type='button'
            onClick={() => setMobileOpen(false)}
            aria-label={t('nav.closeMenu')}
            className='rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden'
          >
            <X className='h-5 w-5 text-gray-700 dark:text-gray-300' />
          </button>
        </div>

        <nav className='mt-4 max-h-[calc(100vh-11rem)] overflow-y-auto'>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const badge = item.path === '/messages' ? unreadMessages : 0;

            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex items-center px-4 py-3 mx-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className='w-5 h-5 shrink-0' aria-hidden />
                {!showLabels && <span className='sr-only'>{t(item.label)}</span>}
                {showLabels && <span className='ms-3'>{t(item.label)}</span>}
                {badge > 0 &&
                  (showLabels ? (
                    <span className='ms-auto rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white'>
                      {badge > 99 ? '99+' : badge}
                      <span className='sr-only'> {t('common.unread')}</span>
                    </span>
                  ) : (
                    // Collapsed rail: a dot, with the count for screen readers
                    <span className='absolute end-3 top-2 h-2.5 w-2.5 rounded-full bg-red-500'>
                      <span className='sr-only'>{badge} {t('common.unread')}</span>
                    </span>
                  ))}
              </Link>
            );
          })}
        </nav>

        <div className='absolute inset-x-0 bottom-4 px-2'>
          <button
            type='button'
            onClick={toggleTheme}
            aria-label={showLabels ? undefined : t('nav.toggleTheme')}
            className='flex items-center w-full px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          >
            {theme === 'light' ? '🌙' : '☀️'}
            {showLabels && <span className='ms-3'>{t('nav.toggleTheme')}</span>}
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
            className='flex items-center w-full px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 mt-2'
          >
            <LogOut className='w-5 h-5 rtl:-scale-x-100' aria-label={showLabels ? undefined : t('nav.logout')} />
            {showLabels && <span className='ms-3'>{t('nav.logout')}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ${
          isSidebarOpen ? 'md:ms-64' : 'md:ms-20'
        }`}
      >
        <header className='flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800 sm:px-6 sm:py-4'>
          {/* Mobile: open drawer */}
          <button
            type='button'
            onClick={() => setMobileOpen(true)}
            aria-label={t('nav.openMenu')}
            className='rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden'
          >
            <Menu className='w-6 h-6 text-gray-700 dark:text-gray-300' />
          </button>
          {/* Desktop: collapse rail */}
          <button
            type='button'
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label={isSidebarOpen ? t('nav.collapse') : t('nav.expand')}
            className='hidden rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700 md:inline-flex'
          >
            <Menu className='w-6 h-6 text-gray-700 dark:text-gray-300' />
          </button>
          <button
            type='button'
            onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
            aria-label={t('common.switchLanguageLabel')}
            lang={locale === 'en' ? 'ar' : 'en'}
            className='ms-auto inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700'
          >
            <Languages className='h-4 w-4' aria-hidden />
            {t('common.switchLanguage')}
          </button>
        </header>

        <div className='p-4 sm:p-6'>
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
