import type { Metadata } from 'next';

// A private, tokenised page: never indexed, never sent as a Referer.
export const metadata: Metadata = {
  title: 'Your order',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
