import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shop all products',
  description: 'Browse makeup, perfumes, clothing, skincare, accessories and home picks from world-renowned brands.',
  alternates: { canonical: '/products' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
