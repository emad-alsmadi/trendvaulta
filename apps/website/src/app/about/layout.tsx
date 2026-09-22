import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'Who we are and what we stand for.',
  alternates: { canonical: '/about' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
