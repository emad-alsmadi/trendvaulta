'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutGrid, Shield, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUserRole } from '@/lib/authCookies';
import { useMe } from '@/hooks/auth/authQuery';
import { AdminTemplatesPanel } from '@/components/admin/AdminTemplatesPanel';
import { AdminCreatorsPanel } from '@/components/admin/AdminCreatorsPanel';
import { AdminUsersPanel } from '@/components/admin/AdminUsersPanel';

type AdminTab = 'templates' | 'creators' | 'users';

const tabs: { id: AdminTab; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'templates', label: 'Templates', icon: LayoutGrid },
  { id: 'creators', label: 'Creators', icon: Users },
  { id: 'users', label: 'Users', icon: Shield },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const me = useMe();
  const [activeTab, setActiveTab] = useState<AdminTab>('templates');
  const role = getUserRole();
  const isAdmin =
    role === 'admin' || me.data?.user?.roles?.includes('admin') === true;

  useEffect(() => {
    if (me.isLoading) return;
    if (!isAdmin) {
      router.replace('/unauthorized');
    }
  }, [me.isLoading, isAdmin, router]);

  if (me.isLoading || !isAdmin) {
    return (
      <div className='flex min-h-[40vh] items-center justify-center rounded-3xl border border-white/40 bg-white/50 p-12'>
        <p className='text-sm font-semibold text-indigo-950/70'>
          Checking admin access…
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='rounded-3xl border border-white/40 bg-white/55 p-6 shadow-sm backdrop-blur-xl'>
        <div className='inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/40 px-3 py-1 text-xs font-extrabold text-indigo-950'>
          <Shield className='h-4 w-4 text-fuchsia-700' />
          Administration
        </div>
        <h1 className='mt-4 text-3xl font-extrabold tracking-tight text-indigo-950 sm:text-4xl'>
          Admin dashboard
        </h1>
        <p className='mt-2 max-w-2xl text-sm font-semibold text-indigo-950/80'>
          Manage templates, creators, and user accounts. Changes apply
          immediately to the live marketplace catalog and access control.
        </p>
      </div>

      <div className='flex flex-wrap gap-2 rounded-2xl border border-white/30 bg-white/35 p-2 backdrop-blur-xl'>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type='button'
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold transition',
                active
                  ? 'bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-500 text-white shadow-md'
                  : 'text-indigo-950/75 hover:bg-white/60',
              )}
            >
              <Icon className='h-4 w-4' />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'templates' ? <AdminTemplatesPanel /> : null}
      {activeTab === 'creators' ? <AdminCreatorsPanel /> : null}
      {activeTab === 'users' ? <AdminUsersPanel /> : null}
    </div>
  );
}
