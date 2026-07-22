'use client';

import Link from 'next/link';
import { ChevronRight, X } from 'lucide-react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';

const categories = [
  {
    name: 'Makeup',
    slug: 'makeup',
    subcategories: [
      'foundation',
      'lipstick',
      'eyeshadow',
      'mascara',
      'blush',
      'concealer',
      'primer',
      'setting-spray',
    ],
  },
  {
    name: 'Perfumes',
    slug: 'perfumes',
    subcategories: [
      'eau-de-parfum',
      'eau-de-toilette',
      'body-mist',
      'gift-sets',
      'cologne',
      'roll-on',
    ],
  },
  {
    name: 'Clothing',
    slug: 'clothing',
    subcategories: [
      'dresses',
      'tops',
      'pants',
      'jackets',
      'accessories',
      'sweaters',
      'skirts',
      'activewear',
    ],
  },
  {
    name: 'Skincare',
    slug: 'skincare',
    subcategories: [
      'cleanser',
      'moisturizer',
      'serum',
      'sunscreen',
      'masks',
      'toner',
      'exfoliator',
      'eye-cream',
    ],
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    subcategories: [
      'jewelry',
      'bags',
      'scarves',
      'belts',
      'watches',
      'sunglasses',
      'hats',
      'wallets',
    ],
  },
  {
    name: 'Home and Living',
    slug: 'home',
    subcategories: [
      'decor',
      'kitchen',
      'bedding',
      'lighting',
      'furniture',
      'rugs',
      'curtains',
      'organization',
    ],
  },
];

const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const colors = [
  { name: 'Black', code: '#000000' },
  { name: 'White', code: '#FFFFFF' },
  { name: 'Red', code: '#EF4444' },
  { name: 'Blue', code: '#3B82F6' },
  { name: 'Green', code: '#10B981' },
  { name: 'Yellow', code: '#F59E0B' },
  { name: 'Pink', code: '#EC4899' },
  { name: 'Purple', code: '#8B5CF6' },
];

export function CategorySidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentCategory = searchParams.get('category');

  const [priceRange, setPriceRange] = useState({ min: 0, max: 500 });
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size],
    );
  };

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color],
    );
  };

  const clearFilters = () => {
    setPriceRange({ min: 0, max: 500 });
    setSelectedSizes([]);
    setSelectedColors([]);
    router.push('/products');
  };

  const hasActiveFilters =
    selectedSizes.length > 0 || selectedColors.length > 0;

  return (
    <div className='w-64 shrink-0'>
      <div className='bg-white rounded-xl shadow-sm p-4 sticky top-20'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='font-semibold text-gray-900'>Filters</h3>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className='text-xs text-fuchsia-600 hover:text-fuchsia-700 flex items-center gap-1'
            >
              <X className='h-3 w-3' />
              Clear
            </button>
          )}
        </div>

        {/* Categories */}
        <div className='mb-6'>
          <h4 className='text-sm font-medium text-gray-900 mb-3'>Categories</h4>
          <nav className='space-y-1'>
            {categories.map((category) => (
              <div key={category.slug}>
                <Link
                  href={`/products?category=${category.slug}`}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    currentCategory === category.slug
                      ? 'bg-fuchsia-50 text-fuchsia-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{category.name}</span>
                  <ChevronRight className='h-4 w-4' />
                </Link>

                {currentCategory === category.slug && (
                  <div className='ml-4 mt-1 space-y-1'>
                    {category.subcategories.map((sub) => (
                      <Link
                        key={sub}
                        href={`/products?category=${category.slug}&subcategory=${sub}`}
                        className='block px-3 py-1.5 text-xs text-gray-600 hover:text-fuchsia-600 transition-colors'
                      >
                        {sub}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className='mt-3 pt-3 border-t border-gray-200'>
            <Link
              href='/products'
              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                !currentCategory
                  ? 'bg-fuchsia-50 text-fuchsia-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              All Products
            </Link>
          </div>
        </div>

        {/* Price Range */}
        <div className='mb-6'>
          <h4 className='text-sm font-medium text-gray-900 mb-3'>
            Price Range
          </h4>
          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <span className='text-xs text-gray-500'>$</span>
              <input
                type='number'
                placeholder='Min'
                value={priceRange.min}
                onChange={(e) =>
                  setPriceRange({ ...priceRange, min: Number(e.target.value) })
                }
                className='w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-fuchsia-500'
              />
            </div>
            <div className='flex items-center gap-2'>
              <span className='text-xs text-gray-500'>$</span>
              <input
                type='number'
                placeholder='Max'
                value={priceRange.max}
                onChange={(e) =>
                  setPriceRange({ ...priceRange, max: Number(e.target.value) })
                }
                className='w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-fuchsia-500'
              />
            </div>
          </div>
        </div>

        {/* Size Filter */}
        <div className='mb-6'>
          <h4 className='text-sm font-medium text-gray-900 mb-3'>Size</h4>
          <div className='flex flex-wrap gap-2'>
            {sizes.map((size) => (
              <button
                key={size}
                onClick={() => toggleSize(size)}
                className={`px-3 py-1 text-xs border rounded transition-colors ${
                  selectedSizes.includes(size)
                    ? 'border-fuchsia-600 bg-fuchsia-50 text-fuchsia-700'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Color Filter */}
        <div className='mb-2'>
          <h4 className='text-sm font-medium text-gray-900 mb-3'>Color</h4>
          <div className='flex flex-wrap gap-2'>
            {colors.map((color) => (
              <button
                key={color.name}
                onClick={() => toggleColor(color.name)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  selectedColors.includes(color.name)
                    ? 'border-fuchsia-600 ring-2 ring-fuchsia-200'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                style={{ backgroundColor: color.code }}
                title={color.name}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
