'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Twitter,
  Facebook,
  Instagram,
  Linkedin,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useSubscribeNewsletter } from '@/hooks/marketing/marketingMutations';
import {
  getUserFacingErrorMessage,
  logErrorForDev,
} from '@/lib/userFacingError';
import { useTranslation } from '@/contexts/TranslationContext';

function NewsletterForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const subscribe = useSubscribeNewsletter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError(t('footer.newsletterError'));
      return;
    }

    try {
      await subscribe.mutateAsync({ email: trimmed, source: 'footer' });
      setEmail('');
    } catch (err) {
      logErrorForDev(err);
      setError(getUserFacingErrorMessage(err, 'Could not subscribe right now'));
    }
  };

  if (subscribe.isSuccess) {
    return (
      <div className='flex items-center gap-2 text-sm font-semibold text-emerald-400'>
        <CheckCircle2
          className='h-4 w-4 shrink-0'
          aria-hidden
        />
        {t('footer.subscribed')}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className='max-w-sm'
    >
      <label
        htmlFor='footer-newsletter-email'
        className='mb-2 block text-sm font-semibold text-white'
      >
        {t('footer.newsletter')}
      </label>
      <div className='flex gap-2'>
        <input
          id='footer-newsletter-email'
          type='email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder='you@example.com'
          maxLength={100}
          disabled={subscribe.isPending}
          className='min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500'
        />
        <button
          type='submit'
          disabled={subscribe.isPending || !email.trim()}
          className='inline-flex shrink-0 items-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-60'
        >
          {subscribe.isPending && (
            <Loader2
              className='h-4 w-4 animate-spin'
              aria-hidden
            />
          )}
          {t('footer.subscribe')}
        </button>
      </div>
      {error && <p className='mt-2 text-sm text-rose-400'>{error}</p>}
    </form>
  );
}

export function Footer() {
  const { t } = useTranslation();
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
            <div className='mb-6'>
              <NewsletterForm />
            </div>
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
                  href='/c/makeup'
                  className='text-gray-400 hover:text-white text-sm transition-colors'
                >
                  Makeup
                </Link>
              </li>
              <li>
                <Link
                  href='/c/perfumes'
                  className='text-gray-400 hover:text-white text-sm transition-colors'
                >
                  Perfumes
                </Link>
              </li>
              <li>
                <Link
                  href='/c/clothing'
                  className='text-gray-400 hover:text-white text-sm transition-colors'
                >
                  Clothing
                </Link>
              </li>
              <li>
                <Link
                  href='/c/skincare'
                  className='text-gray-400 hover:text-white text-sm transition-colors'
                >
                  Skincare
                </Link>
              </li>
              <li>
                <Link
                  href='/c/accessories'
                  className='text-gray-400 hover:text-white text-sm transition-colors'
                >
                  Accessories
                </Link>
              </li>
              <li>
                <Link
                  href='/c/home'
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
