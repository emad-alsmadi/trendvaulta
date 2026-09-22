import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your orders',
  description: 'Track and review your orders.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
