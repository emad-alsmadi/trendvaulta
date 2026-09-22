import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your cart',
  description: 'Review the items in your cart.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
