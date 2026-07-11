'use client';

import Link from 'next/link';
import { BookOpen, Twitter, Facebook, Instagram, Linkedin, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className='bg-gray-900 text-white'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'>
          {/* Brand */}
          <div>
            <div className='flex items-center gap-2 mb-4'>
              <span className='inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-600 via-indigo-600 to-cyan-500 text-white shadow-sm'>
                <BookOpen className='h-5 w-5' />
              </span>
              <div className='leading-tight'>
                <div className='text-xl font-extrabold tracking-tight text-white'>
                  Craftify
                </div>
              </div>
            </div>
            <p className='text-gray-400 text-sm mb-4'>
              Premium digital templates marketplace for creators and businesses.
            </p>
            <div className='flex gap-4'>
              <a href='#' className='text-gray-400 hover:text-white transition-colors'>
                <Twitter className='h-5 w-5' />
              </a>
              <a href='#' className='text-gray-400 hover:text-white transition-colors'>
                <Facebook className='h-5 w-5' />
              </a>
              <a href='#' className='text-gray-400 hover:text-white transition-colors'>
                <Instagram className='h-5 w-5' />
              </a>
              <a href='#' className='text-gray-400 hover:text-white transition-colors'>
                <Linkedin className='h-5 w-5' />
              </a>
            </div>
          </div>

          {/* Marketplace */}
          <div>
            <h3 className='text-sm font-semibold text-white uppercase tracking-wider mb-4'>
              Marketplace
            </h3>
            <ul className='space-y-3'>
              <li>
                <Link href='/templates' className='text-gray-400 hover:text-white text-sm transition-colors'>
                  Browse Templates
                </Link>
              </li>
              <li>
                <Link href='/creators' className='text-gray-400 hover:text-white text-sm transition-colors'>
                  Creators
                </Link>
              </li>
              <li>
                <Link href='/pricing' className='text-gray-400 hover:text-white text-sm transition-colors'>
                  Pricing
                </Link>
              </li>
              <li>
                <Link href='/about' className='text-gray-400 hover:text-white text-sm transition-colors'>
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className='text-sm font-semibold text-white uppercase tracking-wider mb-4'>
              Support
            </h3>
            <ul className='space-y-3'>
              <li>
                <Link href='/help' className='text-gray-400 hover:text-white text-sm transition-colors'>
                  Help Center
                </Link>
              </li>
              <li>
                <Link href='/contact' className='text-gray-400 hover:text-white text-sm transition-colors'>
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href='/faq' className='text-gray-400 hover:text-white text-sm transition-colors'>
                  FAQ
                </Link>
              </li>
              <li>
                <Link href='/terms' className='text-gray-400 hover:text-white text-sm transition-colors'>
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className='text-sm font-semibold text-white uppercase tracking-wider mb-4'>
              Newsletter
            </h3>
            <p className='text-gray-400 text-sm mb-4'>
              Subscribe to get the latest templates and updates.
            </p>
            <form className='flex gap-2'>
              <input
                type='email'
                placeholder='Enter your email'
                className='flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'
              />
              <button
                type='submit'
                className='px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors'
              >
                <Mail className='h-4 w-4' />
              </button>
            </form>
          </div>
        </div>

        <div className='border-t border-gray-800 mt-12 pt-8'>
          <div className='flex flex-col md:flex-row justify-between items-center gap-4'>
            <p className='text-gray-400 text-sm'>
              © 2024 Craftify. All rights reserved.
            </p>
            <div className='flex gap-6'>
              <Link href='/privacy' className='text-gray-400 hover:text-white text-sm transition-colors'>
                Privacy Policy
              </Link>
              <Link href='/terms' className='text-gray-400 hover:text-white text-sm transition-colors'>
                Terms of Service
              </Link>
              <Link href='/cookies' className='text-gray-400 hover:text-white text-sm transition-colors'>
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
