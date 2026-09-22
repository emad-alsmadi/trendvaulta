import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shipping policy',
  description: 'How and when we ship your order.',
  alternates: { canonical: '/shipping' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
