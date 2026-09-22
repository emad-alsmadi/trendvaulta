import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Not authorized',
  description: 'You do not have access to this page.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
