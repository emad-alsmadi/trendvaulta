import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Password',
  description: 'Reset your TrendVaulta password.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
