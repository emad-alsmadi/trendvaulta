import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Brands',
  description: 'Explore the brands available at TrendVaulta.',
  alternates: { canonical: '/brands' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
