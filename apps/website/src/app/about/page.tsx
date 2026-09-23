'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Truck,
  ShieldCheck,
  Heart,
  Users,
  Package,
  Store,
  Star,
  Globe,
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

const team = [
  {
    name: 'John Smith',
    roleKey: 'about.team.roles.ceo',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
  },
  {
    name: 'Sarah Johnson',
    roleKey: 'about.team.roles.creativeDirector',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
  },
  {
    name: 'Mike Chen',
    roleKey: 'about.team.roles.merchandising',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
  },
  {
    name: 'Emily Davis',
    roleKey: 'about.team.roles.customerExperience',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200',
  },
];

const stats = [
  { value: '2K+', labelKey: 'common.products', icon: Package },
  { value: '120+', labelKey: 'common.brands', icon: Store },
  { value: '50K+', labelKey: 'about.stats.shoppers', icon: Users },
  { value: '4.8', labelKey: 'about.stats.averageRating', icon: Star },
];

export default function AboutPage() {
  const { t } = useTranslation();
  return (
    <div className='min-h-screen bg-gray-50'>
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className='py-20 bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-500'
      >
        <div className='max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 text-center'>
          <div className='inline-flex gap-2 items-center px-4 py-2 mb-6 text-sm font-extrabold text-white rounded-full border border-white/30 bg-white/20'>
            <Sparkles className='w-4 h-4' />
            {t('about.badge')}
          </div>
          <h1 className='mb-4 text-4xl font-extrabold text-white sm:text-5xl'>
            {t('about.title')}
          </h1>
          <p className='mx-auto max-w-2xl text-lg text-white/90'>
            {t('about.subtitle')}
          </p>
        </div>
      </motion.section>

      <div className='max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16'>
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className='grid grid-cols-2 gap-6 md:grid-cols-4'
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.labelKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className='p-6 text-center bg-white rounded-2xl border border-gray-200'
              >
                <Icon className='mx-auto mb-3 w-8 h-8 text-indigo-600' />
                <div className='text-3xl font-extrabold text-gray-900'>
                  {stat.value}
                </div>
                <div className='mt-1 text-sm text-gray-600'>{t(stat.labelKey)}</div>
              </motion.div>
            );
          })}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className='p-8 bg-white rounded-3xl border border-gray-200 md:p-12'
        >
          <div className='grid gap-8 items-center md:grid-cols-2'>
            <div>
              <h2 className='mb-4 text-3xl font-extrabold text-gray-900'>
                {t('about.mission.title')}
              </h2>
              <p className='mb-6 text-gray-600'>
                {t('about.mission.p1')}
              </p>
              <p className='mb-6 text-gray-600'>
                {t('about.mission.p2')}
              </p>
              <div className='flex gap-2 items-center font-semibold text-indigo-600'>
                <Globe className='w-5 h-5' />
                <span>{t('about.mission.shipping')}</span>
              </div>
            </div>
            <div className='grid gap-3 sm:grid-cols-3'>
              {[
                {
                  titleKey: 'about.features.delivery.title',
                  icon: Truck,
                  textKey: 'about.features.delivery.text',
                  tone: 'from-amber-500/15 via-rose-500/10 to-fuchsia-500/15',
                },
                {
                  titleKey: 'common.security',
                  icon: ShieldCheck,
                  textKey: 'about.features.security.text',
                  tone: 'from-cyan-500/15 via-emerald-500/10 to-lime-500/15',
                },
                {
                  titleKey: 'about.features.care.title',
                  icon: Heart,
                  textKey: 'about.features.care.text',
                  tone: 'from-indigo-500/15 via-purple-500/10 to-fuchsia-500/15',
                },
              ].map((f) => (
                <div
                  key={f.titleKey}
                  className={`rounded-2xl border border-gray-200 bg-gradient-to-br ${f.tone} p-4`}
                >
                  <div className='inline-flex justify-center items-center w-10 h-10 rounded-2xl bg-white/40'>
                    <f.icon className='w-5 h-5 text-indigo-950' />
                  </div>
                  <div className='mt-3 text-sm font-extrabold text-indigo-950'>
                    {t(f.titleKey)}
                  </div>
                  <div className='mt-1 text-sm font-semibold text-indigo-950/80'>
                    {t(f.textKey)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className='mb-8 text-3xl font-extrabold text-center text-gray-900'>
            {t('about.team.title')}
          </h2>
          <div className='grid grid-cols-2 gap-6 md:grid-cols-4'>
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className='overflow-hidden bg-white rounded-2xl border border-gray-200'
              >
                <div className='relative aspect-square'>
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className='object-cover'
                  />
                </div>
                <div className='p-4'>
                  <h3 className='font-bold text-gray-900'>{member.name}</h3>
                  <p className='text-sm text-gray-600'>{t(member.roleKey)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.article
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className='p-8 bg-white rounded-3xl border border-gray-200 md:p-12'
        >
          <h2 className='mb-4 text-2xl font-extrabold tracking-tight text-gray-900'>
            {t('about.howWeShop.title')}
          </h2>
          <p className='mt-3 mb-6 max-w-3xl text-sm font-semibold text-gray-600'>
            {t('about.howWeShop.intro')}
          </p>

          <div className='grid gap-4 md:grid-cols-3'>
            {[
              {
                titleKey: 'about.howWeShop.catalog.title',
                textKey: 'about.howWeShop.catalog.text',
              },
              {
                titleKey: 'about.howWeShop.checkout.title',
                textKey: 'about.howWeShop.checkout.text',
              },
              {
                titleKey: 'about.howWeShop.afterPurchase.title',
                textKey: 'about.howWeShop.afterPurchase.text',
              },
            ].map((s) => (
              <motion.section
                key={s.titleKey}
                whileHover={{ y: -3 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className='p-5 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200'
              >
                <div className='text-sm font-extrabold text-gray-900'>
                  {t(s.titleKey)}
                </div>
                <div className='mt-2 text-sm font-semibold text-gray-600'>
                  {t(s.textKey)}
                </div>
              </motion.section>
            ))}
          </div>
        </motion.article>
      </div>
    </div>
  );
}
