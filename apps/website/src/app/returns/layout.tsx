import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Returns policy',
  description: 'How to return or exchange an item.',
  alternates: { canonical: '/returns' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
