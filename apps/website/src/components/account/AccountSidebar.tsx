import Link from 'next/link';

type ActivePage = 'profile' | 'orders' | 'wishlist' | 'reviews';

interface AccountSidebarProps {
  activePage: ActivePage;
  username?: string;
}

export default function AccountSidebar({
  activePage,
  username,
}: AccountSidebarProps) {
  const basePath = username ? `/user/${username}` : '';

  const navItems = [
    {
      href: `${basePath}/profile`,
      label: 'Profile',
      page: 'profile' as ActivePage,
    },
    {
      href: `${basePath}/orders`,
      label: 'Orders',
      page: 'orders' as ActivePage,
    },
    {
      href: `${basePath}/wishlist`,
      label: 'Wishlist',
      page: 'wishlist' as ActivePage,
    },
    {
      href: `${basePath}/reviews`,
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
