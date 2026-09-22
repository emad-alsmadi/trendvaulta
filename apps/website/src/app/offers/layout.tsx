import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Special offers',
  description: 'Current promotions and coupon codes at TrendVaulta.',
  alternates: { canonical: '/offers' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
