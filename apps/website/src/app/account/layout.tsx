'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Package,
  MapPin,
  Shield,
  User,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { authApi } from '@/lib/api';
import { clearAuthCookies, getAuthToken } from '@/lib/authCookies';
import { useProfile } from '@/hooks/profile/useProfile';

type Tab = 'orders' | 'addresses' | 'security';

const TABS: { id: Tab; label: string; icon: React.ReactNode; href: string }[] = [
  {
    id: 'orders',
    label: 'My Orders',
    icon: <Package className='h-4 w-4' />,
    href: '/account/orders',
  },
  {
    id: 'addresses',
    label: 'Addresses',
    icon: <MapPin className='h-4 w-4' />,
    href: '/account/addresses',
  },
  {
    id: 'security',
    label: 'Security',
    icon: <Shield className='h-4 w-4' />,
    href: '/account/security',
  },
];

function AccountNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { data: profile } = useProfile();

  const currentTab = TABS.find((t) => pathname.startsWith(t.href)) || TABS[0];

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    clearAuthCookies();
    router.push('/auth/login');
    router.refresh();
  };

  if (!getAuthToken()) {
    router.push('/auth/login');
    return null;
  }

  return (
    <nav className='flex gap-2 overflow-x-auto pb-2' role='tablist' aria-label='Account sections'>
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          role='tab'
          aria-selected={pathname.startsWith(tab.href)}
          className={`flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-colors ${
            pathname.startsWith(tab.href)
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-300'
              : 'border-white/30 bg-white/40 text-indigo-950/70 hover:bg-white/60 dark:border-white/20 dark:bg-white/10 dark:text-indigo-200'
          }`}
        >
          {tab.icon}
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export default function AccountLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();
  const { data: profile } = useProfile();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    clearAuthCookies();
    router.push('/auth/login');
    router.refresh();
  };

  if (!getAuthToken()) {
    router.push('/auth/login');
    return null;
  }

  return (
    <div className='space-y-6'>
      <div className='rounded-3xl border border-white/40 bg-white/55 p-6 shadow-sm backdrop-blur-xl'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div>
            <div className='inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/40 px-3 py-1 text-xs font-extrabold text-indigo-950'>
              <User className='h-4 w-4 text-fuchsia-700' />
              My Account
            </div>
            <h1 className='mt-4 text-3xl font-extrabold tracking-tight text-indigo-950 sm:text-4xl'>
              Welcome back, {profile?.user?.username || 'Customer'}
            </h1>
            <p className='mt-2 text-sm font-semibold text-indigo-950/80'>
              Manage your orders, addresses, and account settings.
            </p>
          </div>
          <Button variant='outline' size='sm' onClick={handleLogout}>
            <LogOut className='mr-2 h-4 w-4' />
            Sign out
          </Button>
        </div>
      </div>

      <AccountNav />

      <div className='rounded-3xl border border-white/30 bg-white/35 p-6 shadow-sm backdrop-blur-xl'>
        {children}
      </div>
    </div>
  );
}