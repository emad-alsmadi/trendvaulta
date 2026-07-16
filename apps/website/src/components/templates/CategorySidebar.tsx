'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Category {
  name: string;
  href: string;
  count: number;
  subcategories?: { name: string; href: string; count: number }[];
}

const categories: Category[] = [
  {
    name: 'Website Templates',
    href: '/templates?category=website',
    count: 245,
    subcategories: [
      {
        name: 'Corporate',
        href: '/templates?category=website&sub=corporate',
        count: 89,
      },
      {
        name: 'Creative',
        href: '/templates?category=website&sub=creative',
        count: 67,
      },
      {
        name: 'Personal',
        href: '/templates?category=website&sub=personal',
        count: 54,
      },
      {
        name: 'Technology',
        href: '/templates?category=website&sub=technology',
        count: 35,
      },
    ],
  },
  {
    name: 'WordPress Themes',
    href: '/templates?category=wordpress',
    count: 312,
    subcategories: [
      {
        name: 'Blog/Magazine',
        href: '/templates?category=wordpress&sub=blog',
        count: 98,
      },
      {
        name: 'Corporate',
        href: '/templates?category=wordpress&sub=corporate',
        count: 87,
      },
      {
        name: 'Creative',
        href: '/templates?category=wordpress&sub=creative',
        count: 76,
      },
      {
        name: 'eCommerce',
        href: '/templates?category=wordpress&sub=ecommerce',
        count: 51,
      },
    ],
  },
  {
    name: 'E-commerce',
    href: '/templates?category=ecommerce',
    count: 178,
    subcategories: [
      {
        name: 'WooCommerce',
        href: '/templates?category=ecommerce&sub=woocommerce',
        count: 92,
      },
      {
        name: 'Shopify',
        href: '/templates?category=ecommerce&sub=shopify',
        count: 56,
      },
      {
        name: 'Magento',
        href: '/templates?category=ecommerce&sub=magento',
        count: 30,
      },
    ],
  },
  {
    name: 'UI Kits',
    href: '/templates?category=uikits',
    count: 134,
    subcategories: [
      {
        name: 'Mobile',
        href: '/templates?category=uikits&sub=mobile',
        count: 67,
      },
      { name: 'Web', href: '/templates?category=uikits&sub=web', count: 45 },
      {
        name: 'Dashboard',
        href: '/templates?category=uikits&sub=dashboard',
        count: 22,
      },
    ],
  },
  {
    name: 'Landing Pages',
    href: '/templates?category=landing',
    count: 156,
    subcategories: [
      { name: 'SaaS', href: '/templates?category=landing&sub=saas', count: 58 },
      {
        name: 'Product',
        href: '/templates?category=landing&sub=product',
        count: 52,
      },
      {
        name: 'Agency',
        href: '/templates?category=landing&sub=agency',
        count: 46,
      },
    ],
  },
  {
    name: 'Admin Dashboards',
    href: '/templates?category=admin',
    count: 98,
    subcategories: [
      { name: 'React', href: '/templates?category=admin&sub=react', count: 42 },
      { name: 'Vue', href: '/templates?category=admin&sub=vue', count: 31 },
      {
        name: 'Angular',
        href: '/templates?category=admin&sub=angular',
        count: 25,
      },
    ],
  },
];

export function CategorySidebar() {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  return (
    <aside className='w-full lg:w-72 flex-shrink-0'>
      <div className='bg-white rounded-xl border border-gray-200 p-6 sticky top-24'>
        <div className='flex items-center gap-2 mb-6'>
          <SlidersHorizontal className='h-5 w-5 text-fuchsia-600' />
          <h3 className='text-lg font-extrabold text-gray-900'>Categories</h3>
        </div>

        <nav className='space-y-1'>
          {categories.map((category) => (
            <div key={category.name}>
              <button
                onClick={() => toggleCategory(category.name)}
                className='w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group'
              >
                <span className='text-sm font-semibold text-gray-700 group-hover:text-fuchsia-600 transition-colors'>
                  {category.name}
                </span>
                <div className='flex items-center gap-2'>
                  <span className='text-xs text-gray-400'>
                    ({category.count})
                  </span>
                  {category.subcategories &&
                    (expandedCategories.has(category.name) ? (
                      <ChevronDown className='h-4 w-4 text-gray-400' />
                    ) : (
                      <ChevronRight className='h-4 w-4 text-gray-400' />
                    ))}
                </div>
              </button>

              {category.subcategories &&
                expandedCategories.has(category.name) && (
                  <div className='ml-4 mt-1 space-y-1'>
                    {category.subcategories.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className='block px-3 py-2 text-sm text-gray-600 hover:text-fuchsia-600 hover:bg-gray-50 rounded-lg transition-colors'
                      >
                        <div className='flex items-center justify-between'>
                          <span>{sub.name}</span>
                          <span className='text-xs text-gray-400'>
                            ({sub.count})
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
            </div>
          ))}
        </nav>

        <div className='mt-6 pt-6 border-t border-gray-200'>
          <Link
            href='/templates'
            className='block w-full text-center px-4 py-2 bg-fuchsia-600 text-white rounded-lg font-semibold hover:bg-fuchsia-700 transition-colors'
          >
            View All Templates
          </Link>
        </div>
      </div>
    </aside>
  );
}
