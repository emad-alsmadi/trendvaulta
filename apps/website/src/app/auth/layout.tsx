import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account',
  description: 'Sign in or create a TrendVaulta account.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
