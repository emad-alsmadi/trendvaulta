'use client';

import { Navbar } from '@/components/navigation/Navbar';
import { Footer } from '@/components/layout/Footer'
import { useTranslation } from '@/contexts/TranslationContext';
import { usePathname } from 'next/navigation';

const STANDALONE_PREFIXES = ['/auth/', '/password/'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();

  // Standalone pages own the full viewport: no Navbar, no Footer.
  if (STANDALONE_PREFIXES.some((prefix) => pathname?.startsWith(prefix))) {
    return (
      <main id='main-content' tabIndex={-1} className='focus:outline-none'>
        {children}
      </main>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* First focusable element: keyboard users can jump past the header. */}
      <a
        href='#main-content'
        className='sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-bold focus:text-indigo-950 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500'
      >
        {t('nav.skipToContent')}
      </a>
      <Navbar />
      {/* No mobile bottom tab bar: the Navbar's mobile menu carries every link. */}
      <div className='py-6'>
        <main
          id='main-content'
          tabIndex={-1}
          className='min-w-0 px-4 focus:outline-none sm:px-6 lg:px-20'
        >
          {/* No pathname-keyed AnimatePresence: it remounted every route
              and threw away layout/query state on each navigation. */}
          <div className='min-w-0'>{children}</div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
