import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  // Spelled out in full: the root title template did not reach this nested
  // segment, which left the tab reading just "Order confirmed".
  title: { absolute: `Order confirmed | ${SITE_NAME}` },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
