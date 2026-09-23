import Link from 'next/link';
import { Home, ArrowRight, ShoppingBag, LifeBuoy } from 'lucide-react';

export default function NotFound() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-stone-50'>
      <div className='px-4 text-center'>
        <p className='text-sm font-extrabold uppercase tracking-wider text-fuchsia-700'>
          TrendVaulta
        </p>
        <h1 className='mb-2 mt-2 text-8xl font-bold text-fuchsia-600 sm:text-9xl'>
          404
        </h1>
        <h2 className='mb-2 text-2xl font-semibold text-stone-900'>
          Page not found
        </h2>
        <p className='mx-auto mb-8 max-w-md text-stone-600'>
          That page doesn&apos;t exist — try the catalog, today&apos;s offers, or
          the Help Center.
        </p>
        <div className='flex flex-col items-center justify-center gap-3 sm:flex-row'>
          <Link
            href='/'
            className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 px-6 py-3 font-semibold text-white transition hover:brightness-110'
          >
            <Home className='h-4 w-4' />
            Homepage
            <ArrowRight className='h-4 w-4 rtl:-scale-x-100' />
          </Link>
          <Link
            href='/products'
            className='inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-6 py-3 font-semibold text-stone-800 transition hover:bg-stone-50'
          >
            <ShoppingBag className='h-4 w-4' />
            Browse catalog
          </Link>
          <Link
            href='/help'
            className='inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-6 py-3 font-semibold text-stone-800 transition hover:bg-stone-50'
          >
            <LifeBuoy className='h-4 w-4' />
            Help Center
          </Link>
        </div>
      </div>
    </div>
  );
}
