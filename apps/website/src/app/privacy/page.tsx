'use client';

import { motion } from 'framer-motion';
import { Sparkles, Shield } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

export default function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <div className='min-h-screen bg-gray-50 py-12'>
      <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className='text-center mb-12'
        >
          <div className='inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700 mb-4'>
            <Sparkles className='h-4 w-4' />
            {t('legal.badge')}
          </div>
          <h1 className='text-4xl font-extrabold text-gray-900 mb-4'>
            {t('privacyPage.title')}
          </h1>
          <p className='text-lg text-gray-600'>{t('legal.lastUpdated')}</p>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className='bg-white rounded-2xl border border-gray-200 p-8 space-y-8'
        >
          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2'>
              <Shield className='h-6 w-6 text-fuchsia-600' />
              {t('privacyPage.sections.s1.heading')}
            </h2>
            <p className='text-gray-600 leading-relaxed mb-4'>
              {t('privacyPage.sections.s1.p1')}
            </p>
            <p className='text-gray-600 leading-relaxed'>
              {t('privacyPage.sections.s1.p2')}
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              {t('privacyPage.sections.s2.heading')}
            </h2>
            <p className='text-gray-600 leading-relaxed mb-4'>
              {t('privacyPage.sections.s2.p1')}
            </p>
            <p className='text-gray-600 leading-relaxed'>
              {t('privacyPage.sections.s2.p2')}
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              {t('privacyPage.sections.s3.heading')}
            </h2>
            <p className='text-gray-600 leading-relaxed mb-4'>
              {t('privacyPage.sections.s3.p1')}
            </p>
            <p className='text-gray-600 leading-relaxed'>
              {t('privacyPage.sections.s3.p2')}
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              {t('privacyPage.sections.s4.heading')}
            </h2>
            <p className='text-gray-600 leading-relaxed mb-4'>
              {t('privacyPage.sections.s4.p1')}
            </p>
            <p className='text-gray-600 leading-relaxed'>
              {t('privacyPage.sections.s4.p2')}
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              {t('privacyPage.sections.s5.heading')}
            </h2>
            <p className='text-gray-600 leading-relaxed mb-4'>
              {t('privacyPage.sections.s5.p1')}
            </p>
            <p className='text-gray-600 leading-relaxed'>
              {t('privacyPage.sections.s5.p2')}
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              {t('privacyPage.sections.s6.heading')}
            </h2>
            <p className='text-gray-600 leading-relaxed mb-4'>
              {t('privacyPage.sections.s6.p1')}
            </p>
            <p className='text-gray-600 leading-relaxed'>
              {t('privacyPage.sections.s6.p2')}
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              {t('privacyPage.sections.s7.heading')}
            </h2>
            <p className='text-gray-600 leading-relaxed'>
              {t('privacyPage.sections.s7.p1')}
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              {t('privacyPage.sections.s8.heading')}
            </h2>
            <p className='text-gray-600 leading-relaxed'>
              {t('privacyPage.sections.s8.p1')}
            </p>
          </section>

          <section>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>
              {t('privacyPage.sections.s9.heading')}
            </h2>
            <p className='text-gray-600 leading-relaxed'>
              {t('privacyPage.sections.s9.p1')}
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
