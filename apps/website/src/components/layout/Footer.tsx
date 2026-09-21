'use client';

import Link from 'next/link';
import {
  Sparkles,
  Twitter,
  Facebook,
  Instagram,
  Linkedin,
} from 'lucide-react';

export function Footer() {
  return (
    <footer className='bg-gray-900 text-white'>
      <div className='max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8'>
          {/* Brand */}
          <div className='lg:col-span-2'>
            <div className='flex items-center gap-2 mb-4'>
              <span className='inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-600 via-indigo-600 to-cyan-500 text-white shadow-sm'>
                <Sparkles className='h-5 w-5' />
              </span>
              <div className='leading-tight'>
                <div className='text-xl font-extrabold tracking-tight text-white'>
                  TrendVaulta
                </div>
              </div>
            </div>
            <p className='text-gray-400 text-sm mb-6 max-w-sm'>
              Beauty, fashion, and lifestyle retail — curated products, clear
              pricing, and secure checkout.
            </p>
            <div className='flex gap-4'>
              <a
                href='#'
                className='text-gray-400 hover:text-white transition-colors'
              >
                <Twitter className='h-5 w-5' />
              </a>
              <a
                href='#'
                className='text-gray-400 hover:text-white transition-colors'
              >
                <Facebook className='h-5 w-5' />
              </a>
              <a
                href='#'
                className='text-gray-400 hover:text-white transition-colors'
              >
                <Instagram className='h-5 w-5' />
              </a>
              <a
                href='#'
                className='text-gray-400 hover:text-white transition-colors'
              >
                <Linkedin className='h-5 w-5' />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className='text-sm font-semibold text-white uppercase tracking-wider mb-4'>
              Shop
            </h3>
            <ul className='space-y-3'>
              <li>
                <Link
                  href='/products'
                  className='text-gray-400 hover:text-white text-sm transition-colors'
                >
                  All products
                </Link>
              </li>
              <li>
                <Link
                  href='/products?category=makeup'
                  className='text-gray-400 hover:text-white text-sm transition-colors'
                >
                  Beauty
                </Link>
              </li>
              <li>
                <Link
                  href='/products?category=clothing'
                  className='text-gray-400 hover:text-white text-sm transition-colors'
                >
                  Fashion
                </Link>
              </li>
              <li>
                <Link
                  href='/products?category=home'
                  className='text-gray-400 hover:text-white text-sm transition-colors'
                >
                  Home
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className='text-sm font-semibold text-white uppercase tracking-wider mb-4'>
              Company
            </h3>
            <ul className='space-y-3'>
              <li>
                <Link
                  href='/about'
                  className='text-gray-400 hover:text-white text-sm transition-colors'
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href='/brands'
                  className='text-gray-400 hover:text-white text-sm transition-colors'
                >
                  Brands
                </Link>
              </li>
              <li>
                <Link
                  href='/offers'
                  className='text-gray-400 hover:text-white text-sm transition-colors'
                >
                  Offers
                </Link>
              </li>
              <li>
                <Link
                  href='/cart'
                  className='text-gray-400 hover:text-white text-sm transition-colors'
                >
                  Cart
                </Link>
              </li>
            </ul>
          </div>

          {/* Support — Amazon-like “Let Us Help You” IA, TrendVaulta links */}
          <div>
            <h3 className='text-sm font-semibold text-white uppercase tracking-wider mb-4'>
              Support
            </h3>
            <ul className='space-y-3'>
              <li>
                <Link
                  href='/help'
                  className='text-gray-400 hover:text-white text-sm transition-colors'
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  href='/shipping'
                  className='text-gray-400 hover:text-white text-sm transition-colors'
                >
                  Shipping &amp; delivery
                </Link>
              </li>
              <li>
                <Link
                  href='/returns'
                  className='text-gray-400 hover:text-white text-sm transition-colors'
                >
                  Returns &amp; refunds
                </Link>
              </li>
              <li>
                <Link
                  href='/contact'
                  className='text-gray-400 hover:text-white text-sm transition-colors'
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href='/faq'
                  className='text-gray-400 hover:text-white text-sm transition-colors'
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href='/terms'
                  className='text-gray-400 hover:text-white text-sm transition-colors'
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className='border-t border-gray-800 mt-12 pt-8'>
          <div className='flex flex-col md:flex-row justify-between items-center gap-4'>
            <p className='text-gray-400 text-sm'>
              © {new Date().getFullYear()} TrendVaulta. All rights reserved.
            </p>
            <div className='flex gap-6'>
              <Link
                href='/privacy'
                className='text-gray-400 hover:text-white text-sm transition-colors'
              >
                Privacy Policy
              </Link>
              <Link
                href='/terms'
                className='text-gray-400 hover:text-white text-sm transition-colors'
              >
                Terms of Service
              </Link>
              <Link
                href='/cookies'
                className='text-gray-400 hover:text-white text-sm transition-colors'
              >
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
