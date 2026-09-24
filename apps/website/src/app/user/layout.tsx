import type { Metadata } from 'next';
import { UserShell } from './UserShell';

export const metadata: Metadata = {
  title: 'Account',
  description: 'Manage your TrendVaulta account.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <UserShell>{children}</UserShell>;
}
