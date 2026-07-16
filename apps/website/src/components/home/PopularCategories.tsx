'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Code, ShoppingCart, Layout, Smartphone, Globe, Palette, Database, Zap } from 'lucide-react';

const categories = [
  { name: 'WordPress', count: 1245, icon: Globe, color: 'from-blue-500 to-blue-600', href: '/templates?category=wordpress' },
  { name: 'HTML Templates', count: 892, icon: Code, color: 'from-orange-500 to-orange-600', href: '/templates?category=website' },
  { name: 'eCommerce', count: 567, icon: ShoppingCart, color: 'from-green-500 to-green-600', href: '/templates?category=ecommerce' },
  { name: 'UI Kits', count: 434, icon: Palette, color: 'from-purple-500 to-purple-600', href: '/templates?category=uikits' },
  { name: 'Admin Dashboards', count: 321, icon: Layout, color: 'from-indigo-500 to-indigo-600', href: '/templates?category=admin' },
  { name: 'Mobile Apps', count: 289, icon: Smartphone, color: 'from-pink-500 to-pink-600', href: '/templates?category=mobile' },
  { name: 'Database', count: 156, icon: Database, color: 'from-cyan-500 to-cyan-600', href: '/templates?category=database' },
  { name: 'SaaS', count: 234, icon: Zap, color: 'from-yellow-500 to-yellow-600', href: '/templates?category=saas' },
];

export function PopularCategories() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.5 }}
      className='bg-white py-16 border-t border-gray-200'
    >
      <div className='max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8'>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className='mb-8'
        >
          <h2 className='text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2'>
            Popular Categories
          </h2>
          <p className='text-gray-600'>Browse templates by category</p>
        </motion.div>

        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link
                  href={category.href}
                  className='group block'
                >
                  <div className={`bg-gradient-to-br ${category.color} rounded-xl p-6 text-white hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}>
                    <Icon className='h-8 w-8 mb-3 opacity-90' />
                    <h3 className='font-bold text-lg mb-1'>{category.name}</h3>
                    <p className='text-sm opacity-90'>{category.count} items</p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
