import {
  Outlet,
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Package,
  Tag,
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
  Settings,
  LogOut,
  Menu,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../hooks/useTheme';
import { authApi } from '../lib/api';
import { clearAuthSession, getAuthToken, getRefreshToken } from '../lib/auth';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Users', path: '/users' },
  { icon: Package, label: 'Products', path: '/products' },
  { icon: Tag, label: 'Brands', path: '/brands' },
  { icon: ShoppingCart, label: 'Orders', path: '/orders' },
  { icon: TicketPercent, label: 'Coupons', path: '/coupons' },
  { icon: Percent, label: 'Offers', path: '/offers' },
  { icon: Star, label: 'Reviews', path: '/reviews' },
  { icon: HelpCircle, label: 'Help Topics', path: '/help-topics' },
  { icon: FileText, label: 'Content', path: '/content' },
  { icon: Layers, label: 'Storefront Modules', path: '/storefront-modules' },
  { icon: BookOpen, label: 'Lookbooks', path: '/lookbooks' },
  { icon: MessageSquare, label: 'Testimonials', path: '/testimonials' },
  { icon: PackageOpen, label: 'Bundles', path: '/bundles' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (!getAuthToken()) {
    return (
      <Navigate
        to='/login'
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      {/* Sidebar */}
      <motion.aside
        initial={{ width: isSidebarOpen ? 256 : 80 }}
        animate={{ width: isSidebarOpen ? 256 : 80 }}
        className='fixed left-0 top-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50'
      >
        <div className='p-4'>
          <h1 className='text-xl font-bold text-gray-900 dark:text-white'>
            {isSidebarOpen ? 'TrendVaulta' : 'TV'}
          </h1>
        </div>

        <nav className='mt-4'>
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className='w-5 h-5' />
                {isSidebarOpen && <span className='ml-3'>{item.label}</span>}
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
            {isSidebarOpen && <span className='ml-3'>Toggle Theme</span>}
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
            {isSidebarOpen && <span className='ml-3'>Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ${
          isSidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        <header className='bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4'>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className='p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700'
          >
            <Menu className='w-6 h-6 text-gray-700 dark:text-gray-300' />
          </button>
        </header>

        <div className='p-6'>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
