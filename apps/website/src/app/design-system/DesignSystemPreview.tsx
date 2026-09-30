'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, Heart, LogOut, Package, Settings, Truck, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Drawer } from '@/components/ui/Drawer';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from '@/components/ui/Dropdown';
import { Skeleton, SkeletonGroup, SkeletonText } from '@/components/ui/Skeleton';
import { useTranslation } from '@/contexts/TranslationContext';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className='border-t border-line py-10'>
      <h2 className='mb-6 text-eyebrow uppercase text-ink-subtle'>{title}</h2>
      {children}
    </section>
  );
}

export function DesignSystemPreview() {
  const { t, dir, locale } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <div className='mx-auto max-w-6xl py-6 text-ink'>
      <p className='text-eyebrow uppercase text-accent'>TrendVaulta UI</p>
      <h1 className='mt-3 text-title sm:text-display'>Design system</h1>
      <p className='mt-3 max-w-xl text-ink-muted'>
        locale <code>{locale}</code> · dir <code>{dir}</code> — switch the site language to verify RTL.
      </p>

      <Section title='Typography'>
        <div className='space-y-3'>
          <p className='text-display'>{t('userArea.wishlist.title')}</p>
          <p className='text-title'>{t('home.whyChooseUs.title')}</p>
          <p className='text-heading'>{t('home.whyChooseUs.deliveryTitle')}</p>
          <p className='max-w-prose text-ink-muted'>{t('home.whyChooseUs.deliveryDescription')}</p>
          <p className='text-eyebrow uppercase text-ink-subtle'>Eyebrow label</p>
        </div>
      </Section>

      <Section title='Buttons'>
        <div className='flex flex-wrap items-center gap-3'>
          <Button>Primary</Button>
          <Button variant='outline'>Outline</Button>
          <Button variant='secondary'>Secondary</Button>
          <Button variant='ghost'>Ghost</Button>
          <Button variant='link'>Link</Button>
          <Button
            loading={loading}
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 1500);
            }}
          >
            {t('wishlist.viewDetails')}
          </Button>
          <Button size='sm' variant='outline' disabled>
            Disabled
          </Button>
        </div>
      </Section>

      <Section title='Cards'>
        <div className='grid gap-8 sm:grid-cols-2 lg:grid-cols-4'>
          {(['plain', 'muted', 'elevated', 'outline'] as const).map((variant) => (
            <Card key={variant} variant={variant} interactive={variant !== 'plain'}>
              <Truck className='h-5 w-5 text-accent' aria-hidden />
              <h3 className='mt-4 text-heading'>{t('home.whyChooseUs.deliveryTitle')}</h3>
              <p className='mt-1.5 text-sm text-ink-muted'>{t('home.whyChooseUs.deliveryDescription')}</p>
              <p className='mt-4 text-xs text-ink-subtle'>variant=&quot;{variant}&quot;</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section title='Dropdown'>
        <Dropdown>
          <DropdownTrigger asChild>
            <Button variant='outline' size='sm'>
              <User className='h-4 w-4' aria-hidden />
              {t('nav.account')}
              <ChevronDown className='h-4 w-4' aria-hidden />
            </Button>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownLabel>{t('nav.account')}</DropdownLabel>
            <DropdownItem icon={User}>{t('nav.account')}</DropdownItem>
            <DropdownItem icon={Package} hint='3 active'>
              {t('nav.orders')}
            </DropdownItem>
            <DropdownItem icon={Heart}>{t('nav.wishlist')}</DropdownItem>
            <DropdownItem icon={Settings} disabled>
              Settings
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem icon={LogOut} tone='danger'>
              {t('common.logout')}
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      </Section>

      <Section title='Drawer'>
        <Button variant='outline' size='sm' onClick={() => setDrawerOpen(true)}>
          Open drawer
        </Button>
        <Drawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          title='TrendVaulta'
          description={t('nav.mobileNav')}
          footer={<Button className='w-full'>{t('common.login')}</Button>}
        >
          <nav className='space-y-0.5'>
            {[t('nav.account'), t('nav.orders'), t('nav.wishlist'), t('nav.deals')].map((label) => (
              <a
                key={label}
                href='#'
                className='block rounded-control px-3 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-muted'
              >
                {label}
              </a>
            ))}
          </nav>
        </Drawer>
      </Section>

      <Section title='Skeleton'>
        <SkeletonGroup label={t('common.loading')} className='grid gap-8 sm:grid-cols-2 lg:grid-cols-4'>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i}>
              <Skeleton className='aspect-[3/4] w-full rounded-card' />
              <Skeleton className='mt-4 h-4 w-3/4' />
              <Skeleton className='mt-2 h-4 w-1/3' />
            </div>
          ))}
        </SkeletonGroup>
        <SkeletonText className='mt-8 max-w-md' lines={3} />
      </Section>
    </div>
  );
}
