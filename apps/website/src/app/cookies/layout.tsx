import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie policy',
  description: 'How TrendVaulta uses cookies.',
  alternates: { canonical: '/cookies' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
