import type { Metadata } from 'next';
import { Geist, Geist_Mono, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import { Providers } from './providers';
import { AppShell } from '@/components/layout/AppShell';
import { SITE_DESCRIPTION, SITE_NAME, getSiteUrl } from '@/lib/site';
import { LOCALE_COOKIE, dirFor, resolveLocale } from '@/lib/locale';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

// Geist has no Arabic glyphs; without this, Arabic falls back to whatever
// system font the device has.
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: '--font-arabic',
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  // Not preloaded: English pages never need it, and the browser fetches it
  // on demand when Arabic glyphs appear.
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reading the cookie makes pages render per request (no static HTML);
  // that is the cost of serving the right language on the first byte.
  const locale = resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value);

  return (
    <html lang={locale} dir={dirFor(locale)}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${plexArabic.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers locale={locale}>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
