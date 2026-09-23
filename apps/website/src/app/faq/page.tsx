'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sparkles, HelpCircle } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

/** Message keys, resolved with t() at render. `id` is the stable category id. */
const faqs = [
  {
    id: 'general',
    categoryKey: 'faq.categories.general',
    questions: [
      { q: 'faq.items.whatIs.q', a: 'faq.items.whatIs.a' },
      { q: 'faq.items.howToPurchase.q', a: 'faq.items.howToPurchase.a' },
      { q: 'faq.items.canReturn.q', a: 'faq.items.canReturn.a' },
    ],
  },
  {
    id: 'shipping',
    categoryKey: 'faq.categories.shipping',
    questions: [
      { q: 'faq.items.shippingMethods.q', a: 'faq.items.shippingMethods.a' },
      { q: 'faq.items.international.q', a: 'faq.items.international.a' },
      { q: 'faq.items.trackOrder.q', a: 'faq.items.trackOrder.a' },
    ],
  },
  {
    id: 'payments',
    categoryKey: 'faq.categories.payments',
    questions: [
      { q: 'faq.items.paymentMethods.q', a: 'faq.items.paymentMethods.a' },
      { q: 'faq.items.refundPolicy.q', a: 'faq.items.refundPolicy.a' },
      { q: 'faq.items.securePayments.q', a: 'faq.items.securePayments.a' },
    ],
  },
  {
    id: 'support',
    categoryKey: 'faq.categories.support',
    questions: [
      { q: 'faq.items.orderSupport.q', a: 'faq.items.orderSupport.a' },
      { q: 'faq.items.customOrders.q', a: 'faq.items.customOrders.a' },
      { q: 'faq.items.damagedItem.q', a: 'faq.items.damagedItem.a' },
    ],
  },
];

export default function FAQPage() {
  const { t } = useTranslation();
  const [openCategory, setOpenCategory] = useState<string | null>('general');
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);

  const toggleCategory = (category: string) => {
    setOpenCategory(openCategory === category ? null : category);
    setOpenQuestion(null);
  };

  const toggleQuestion = (index: number) => {
    setOpenQuestion(openQuestion === index ? null : index);
  };

  return (
    <div className='min-h-screen bg-gray-50 py-12'>
      <div className='max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className='text-center mb-12'
        >
          <div className='inline-flex items-center gap-2 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-xs font-extrabold text-fuchsia-700 mb-4'>
            <Sparkles className='h-4 w-4' />
            {t('productQa.helpCenter')}
          </div>
          <h1 className='text-4xl font-extrabold text-gray-900 mb-4'>
            {t('faq.title')}
          </h1>
          <p className='text-lg text-gray-600 max-w-2xl mx-auto'>
            {t('faq.subtitle')}
          </p>
        </motion.div>

        {/* FAQ Content */}
        <div className='grid lg:grid-cols-[300px_1fr] gap-8'>
          {/* Categories Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className='hidden lg:block'
          >
            <div className='bg-white rounded-2xl border border-gray-200 p-4 sticky top-24'>
              <h3 className='font-bold text-gray-900 mb-4 flex items-center gap-2'>
                <HelpCircle className='h-5 w-5 text-fuchsia-600' />
                {t('common.categories')}
              </h3>
              <nav className='space-y-1'>
                {faqs.map((faq) => (
                  <button
                    key={faq.id}
                    onClick={() => toggleCategory(faq.id)}
                    className={`w-full text-start px-4 py-2 rounded-lg transition-colors ${
                      openCategory === faq.id
                        ? 'bg-fuchsia-50 text-fuchsia-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {t(faq.categoryKey)}
                  </button>
                ))}
              </nav>
            </div>
          </motion.div>

          {/* Questions */}
          <div className='space-y-6'>
            {faqs.map((faq) => (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className='bg-white rounded-2xl border border-gray-200 overflow-hidden'
              >
                {/* Mobile Category Header */}
                <button
                  onClick={() => toggleCategory(faq.id)}
                  className='lg:hidden w-full px-6 py-4 flex items-center justify-between border-b border-gray-200'
                >
                  <span className='font-bold text-gray-900'>
                    {t(faq.categoryKey)}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-500 transition-transform ${
                      openCategory === faq.id ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Desktop Category Header */}
                <div className='hidden lg:block px-6 py-4 border-b border-gray-200 bg-gray-50'>
                  <h3 className='font-bold text-gray-900'>
                    {t(faq.categoryKey)}
                  </h3>
                </div>

                {/* Questions */}
                <AnimatePresence>
                  {(openCategory === faq.id || !openCategory) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className='overflow-hidden'
                    >
                      {faq.questions.map((item, index) => (
                        <div
                          key={index}
                          className='border-b border-gray-200 last:border-b-0'
                        >
                          <button
                            onClick={() => toggleQuestion(index)}
                            className='w-full px-6 py-4 flex items-center justify-between text-start hover:bg-gray-50 transition-colors'
                          >
                            <span className='font-semibold text-gray-900 pe-4'>
                              {t(item.q)}
                            </span>
                            <ChevronDown
                              className={`h-5 w-5 text-gray-500 transition-transform shrink-0 ${
                                openQuestion === index ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                          <AnimatePresence>
                            {openQuestion === index && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className='overflow-hidden'
                              >
                                <div className='px-6 pb-4 pt-2 text-gray-600'>
                                  {t(item.a)}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className='mt-12 bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-500 rounded-2xl p-8 text-center text-white'
        >
          <h2 className='text-2xl font-extrabold mb-2'>
            {t('faq.cta.title')}
          </h2>
          <p className='text-white/90 mb-6'>
            {t('faq.cta.text')}
          </p>
          <button className='inline-flex items-center gap-2 bg-white text-fuchsia-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors'>
            {t('faq.cta.button')}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
