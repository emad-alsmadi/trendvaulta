import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DesignSystemPreview } from './DesignSystemPreview';

export const metadata: Metadata = {
  title: 'Design system',
  robots: { index: false, follow: false },
};

/** Internal UI kit preview — dev only. Switch the site language to check RTL. */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <DesignSystemPreview />;
}
