'use client';

import Link from 'next/link';
import UserSidebar from './UserSidebar';
import { useMe } from '@/hooks/auth/authQuery';

interface UserLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    username: string;
  }>;
}

export default function UserLayout({ children }: UserLayoutProps) {
  const { data } = useMe();
  const user = data?.user;

  // Extract username from email (everything before @)
  const getUsernameFromEmail = (email: string) => {
    if (!email) return '';
    return email.split('@')[0];
  };

  const username = user?.username || getUsernameFromEmail(user?.email || '');

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Breadcrumb */}
        <nav className='flex items-center gap-2 text-sm text-gray-600 mb-8'>
          <Link
            href='/'
            className='hover:text-fuchsia-600'
          >
            Home
          </Link>
          <span>/</span>
          <span className='text-gray-900'>{username}</span>
        </nav>

        <div className='flex gap-8'>
          {/* Sidebar */}
          <UserSidebar username={username} />

          {/* Main Content */}
          <div className='flex-1'>{children}</div>
        </div>
      </div>
    </div>
  );
}
