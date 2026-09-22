import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help Center',
  description: 'Shipping, returns, payments and account help.',
  alternates: { canonical: '/help' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
