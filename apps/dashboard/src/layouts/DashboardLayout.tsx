import {
  Outlet,
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  ChartColumn,
  AlertTriangle,
  Users,
  Package,
  Tag,
  FolderTree,
  ShoppingCart,
  TicketPercent,
  Percent,
  Star,
  HelpCircle,
  FileText,
  Layers,
  BookOpen,
  MessageSquare,
  PackageOpen,
  Gift,
  MessageCircle,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { authApi } from '../lib/api';
import {
  clearAuthSession,
  getAuthRole,
  getAuthToken,
  getRefreshToken,
} from '../lib/auth';
import { isStaffRole, roleHasPermission } from '../lib/permissions';

/** `permission` is the read permission the page needs; omitted = any staff. */
const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: ChartColumn, label: 'Analytics', path: '/analytics', permission: 'orders:read' },
  { icon: Users, label: 'Users', path: '/users', permission: 'users:read' },
  { icon: Package, label: 'Products', path: '/products', permission: 'products:read' },
  { icon: Tag, label: 'Brands', path: '/brands', permission: 'brands:read' },
  { icon: FolderTree, label: 'Categories', path: '/categories', permission: 'products:read' },
  { icon: AlertTriangle, label: 'Low Stock', path: '/low-stock', permission: 'products:read' },
  { icon: ShoppingCart, label: 'Orders', path: '/orders', permission: 'orders:read' },
  { icon: TicketPercent, label: 'Coupons', path: '/coupons', permission: 'coupons:read' },
  { icon: Percent, label: 'Offers', path: '/offers', permission: 'offers:read' },
  { icon: Star, label: 'Reviews', path: '/reviews', permission: 'reviews:read' },
  { icon: HelpCircle, label: 'Help Topics', path: '/help-topics', permission: 'content:read' },
  { icon: FileText, label: 'Content', path: '/content', permission: 'content:read' },
  { icon: Layers, label: 'Storefront Modules', path: '/storefront-modules', permission: 'content:read' },
  { icon: BookOpen, label: 'Lookbooks', path: '/lookbooks', permission: 'content:read' },
  { icon: MessageSquare, label: 'Testimonials', path: '/testimonials', permission: 'content:read' },
  { icon: PackageOpen, label: 'Bundles', path: '/bundles', permission: 'content:read' },
  { icon: Gift, label: 'Gift Finder', path: '/gift-finder-config', permission: 'content:read' },
  { icon: MessageCircle, label: 'Product Q&A', path: '/product-qa', permission: 'content:read' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  // Desktop: collapsible rail. Mobile (<md): off-canvas drawer.
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = getAuthRole();

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
          aria-label='Close menu'
          onClick={() => setMobileOpen(false)}
          className='fixed inset-0 z-40 bg-black/40 md:hidden'
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label='Dashboard navigation'
        className={`fixed left-0 top-0 z-50 h-full w-64 max-w-[85vw] border-r border-gray-200 bg-white transition-[transform,width] duration-200 dark:border-gray-700 dark:bg-gray-800 md:translate-x-0 md:max-w-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isSidebarOpen ? 'md:w-64' : 'md:w-20'}`}
      >
        <div className='flex items-center justify-between p-4'>
          <h1 className='text-xl font-bold text-gray-900 dark:text-white'>
            {showLabels ? 'TrendVaulta' : 'TV'}
          </h1>
          <button
            type='button'
            onClick={() => setMobileOpen(false)}
            aria-label='Close menu'
            className='rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden'
          >
            <X className='h-5 w-5 text-gray-700 dark:text-gray-300' />
          </button>
        </div>

        <nav className='mt-4 max-h-[calc(100vh-11rem)] overflow-y-auto'>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className='w-5 h-5' />
                {showLabels && <span className='ml-3'>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className='absolute bottom-4 left-0 right-0 px-2'>
          <button
            onClick={toggleTheme}
            className='flex items-center w-full px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          >
            {theme === 'light' ? '🌙' : '☀️'}
            {showLabels && <span className='ml-3'>Toggle Theme</span>}
          </button>

          <button
            type='button'
            onClick={() => {
              authApi.logout(getRefreshToken());
              clearAuthSession();
              navigate('/login');
            }}
            className='flex items-center w-full px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 mt-2'
          >
            <LogOut className='w-5 h-5' />
            {showLabels && <span className='ml-3'>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ${
          isSidebarOpen ? 'md:ml-64' : 'md:ml-20'
        }`}
      >
        <header className='flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800 sm:px-6 sm:py-4'>
          {/* Mobile: open drawer */}
          <button
            type='button'
            onClick={() => setMobileOpen(true)}
            aria-label='Open menu'
            className='rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden'
          >
            <Menu className='w-6 h-6 text-gray-700 dark:text-gray-300' />
          </button>
          {/* Desktop: collapse rail */}
          <button
            type='button'
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className='hidden rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700 md:inline-flex'
          >
            <Menu className='w-6 h-6 text-gray-700 dark:text-gray-300' />
          </button>
        </header>

        <div className='p-4 sm:p-6'>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
