'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMe } from '@/hooks/auth/authQuery';

type ActivePage = 'profile' | 'orders' | 'wishlist' | 'reviews';

interface UserSidebarProps {
  username: string;
}

export default function UserSidebar({ username }: UserSidebarProps) {
  const pathname = usePathname();
  const { data } = useMe();
  const user = data?.user;

  // Extract username from email (everything before @)
  const getUsernameFromEmail = (email: string) => {
    if (!email) return '';
    return email.split('@')[0];
  };

  const currentUsername =
    user?.username || getUsernameFromEmail(user?.email || '');

  const getActivePage = (): ActivePage => {
    if (pathname.endsWith('/orders')) return 'orders';
    if (pathname.endsWith('/wishlist')) return 'wishlist';
    if (pathname.endsWith('/reviews')) return 'reviews';
    return 'profile';
  };

  const activePage = getActivePage();

  const navItems = [
    {
      href: `/user/${currentUsername}`,
      label: 'Profile',
      page: 'profile' as ActivePage,
    },
    {
      href: `/user/${currentUsername}/orders`,
      label: 'Orders',
      page: 'orders' as ActivePage,
    },
    {
      href: `/user/${currentUsername}/wishlist`,
      label: 'Wishlist',
      page: 'wishlist' as ActivePage,
    },
    {
      href: `/user/${currentUsername}/reviews`,
      label: 'Reviews',
      page: 'reviews' as ActivePage,
    },
  ];

  return (
    <aside className='w-64 shrink-0 hidden lg:block'>
      <div className='bg-white rounded-lg border border-gray-200 p-4 sticky top-8'>
        <h3 className='font-bold text-gray-900 mb-4'>Account</h3>
        <nav className='space-y-1'>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-2 rounded-lg transition ${
                activePage === item.page
                  ? 'bg-fuchsia-50 text-fuchsia-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-fuchsia-600'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
