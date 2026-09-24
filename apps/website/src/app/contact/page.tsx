'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { z } from 'zod';
import {
  Sparkles,
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { useSendContactMessage } from '@/hooks/marketing/marketingMutations';
import {
  getUserFacingErrorMessage,
  logErrorForDev,
} from '@/lib/userFacingError';
import { useTranslation } from '@/contexts/TranslationContext';

/**
 * Mirrors the server's Joi rules so the shopper sees problems before posting.
 * Issue messages are message keys, translated where the errors render.
 */
const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'contact.errors.nameMin')
    .max(80, 'contact.errors.nameMax'),
  email: z.string().trim().email('footer.newsletterError'),
  subject: z
    .string()
    .trim()
    .min(2, 'contact.errors.subjectMin')
    .max(120, 'contact.errors.subjectMax'),
  message: z
    .string()
    .trim()
    .min(10, 'contact.errors.messageMin')
    .max(2000, 'contact.errors.messageMax'),
});

type FieldErrors = Partial<
  Record<'name' | 'email' | 'subject' | 'message', string>
>;

export default function ContactPage() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    // Honeypot: hidden from real users, so anything here means a bot. The
    // server silently discards those submissions.
    website: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const sendMessage = useSendContactMessage();
  const submitted = sendMessage.isSuccess;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsed = contactSchema.safeParse(formData);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (key && !errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    try {
      await sendMessage.mutateAsync({
        ...parsed.data,
        website: formData.website,
      });
    } catch (err) {
      logErrorForDev(err);
      setFormError(
        getUserFacingErrorMessage(
          err,
          t('contact.errors.sendFailed'),
          t,
        ),
      );
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) =>
      prev[name as keyof FieldErrors]
        ? { ...prev, [name]: undefined }
        : prev,
    );
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
          <div className='inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700 mb-4'>
            <Sparkles className='h-4 w-4' />
            {t('contact.badge')}
          </div>
          <h1 className='text-4xl font-extrabold text-gray-900 mb-4'>
            {t('contact.title')}
          </h1>
          <p className='text-lg text-gray-600 max-w-2xl mx-auto'>
            {t('contact.subtitle')}
          </p>
        </motion.div>

        <div className='grid lg:grid-cols-3 gap-8'>
          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className='space-y-6'
          >
            <div className='bg-white rounded-2xl border border-gray-200 p-6'>
              <h3 className='font-bold text-gray-900 mb-4'>
                {t('contact.info.title')}
              </h3>
              <div className='space-y-4'>
                <div className='flex items-start gap-3'>
                  <div className='bg-fuchsia-100 p-3 rounded-lg'>
                    <Mail className='h-5 w-5 text-fuchsia-600' />
                  </div>
                  <div>
                    <div className='font-semibold text-gray-900'>
                      {t('auth.email')}
                    </div>
                    <div className='text-sm text-gray-600'>
                      support@trendvaulta.com
                    </div>
                  </div>
                </div>
                <div className='flex items-start gap-3'>
                  <div className='bg-fuchsia-100 p-3 rounded-lg'>
                    <Phone className='h-5 w-5 text-fuchsia-600' />
                  </div>
                  <div>
                    <div className='font-semibold text-gray-900'>
                      {t('checkout.phone')}
                    </div>
                    <div className='text-sm text-gray-600'>
                      +1 (555) 123-4567
                    </div>
                  </div>
                </div>
                <div className='flex items-start gap-3'>
                  <div className='bg-fuchsia-100 p-3 rounded-lg'>
                    <MapPin className='h-5 w-5 text-fuchsia-600' />
                  </div>
                  <div>
                    <div className='font-semibold text-gray-900'>
                      {t('contact.info.studio')}
                    </div>
                    <div className='text-sm text-gray-600'>
                      {t('contact.info.addressLine1')}
                      <br />
                      {t('contact.info.addressLine2')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className='bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-500 rounded-2xl p-6 text-white'>
              <h3 className='font-bold mb-2'>{t('contact.helpFaster.title')}</h3>
              <p className='text-sm text-white/90 mb-4'>
                {t('contact.helpFaster.text')}
              </p>
              <div className='flex flex-wrap gap-2'>
                <Link
                  href='/help'
                  className='inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold transition-colors'
                >
                  {t('productQa.helpCenter')}
                </Link>
                <Link
                  href='/faq'
                  className='inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-semibold transition-colors'
                >
                  {t('contact.helpFaster.faq')}
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className='lg:col-span-2'
          >
            <div className='bg-white rounded-2xl border border-gray-200 p-8'>
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className='text-center py-12'
                >
                  <div className='bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4'>
                    <CheckCircle className='h-8 w-8 text-green-600' />
                  </div>
                  <h3 className='text-2xl font-bold text-gray-900 mb-2'>
                    {t('contact.success.title')}
                  </h3>
                  <p className='text-gray-600'>
                    {t('contact.success.text')}
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  <div className='grid md:grid-cols-2 gap-6 mb-6'>
                    <div>
                      <label
                        htmlFor='name'
                        className='block text-sm font-semibold text-gray-900 mb-2'
                      >
                        {t('addresses.name')}
                      </label>
                      <input
                        type='text'
                        id='name'
                        aria-invalid={fieldErrors.name ? true : undefined}
                        aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                        name='name'
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className='w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors'
                        placeholder={t('checkoutPage.form.namePlaceholder')}
                      />
                      {fieldErrors.name && (
                        <p id='name-error' role='alert' className='mt-1 text-sm text-rose-600'>
                          {t(fieldErrors.name)}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor='email'
                        className='block text-sm font-semibold text-gray-900 mb-2'
                      >
                        {t('auth.email')}
                      </label>
                      <input
                        type='email'
                        id='email'
                        aria-invalid={fieldErrors.email ? true : undefined}
                        aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                        name='email'
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className='w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors'
                        placeholder='your@email.com'
                      />
                      {fieldErrors.email && (
                        <p id='email-error' role='alert' className='mt-1 text-sm text-rose-600'>
                          {t(fieldErrors.email)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className='mb-6'>
                    <label
                      htmlFor='subject'
                      className='block text-sm font-semibold text-gray-900 mb-2'
                    >
                      {t('contact.form.subject')}
                    </label>
                    <select
                      id='subject'
                      aria-invalid={fieldErrors.subject ? true : undefined}
                      aria-describedby={fieldErrors.subject ? 'subject-error' : undefined}
                      name='subject'
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className='w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors'
                    >
                      <option value=''>{t('contact.form.subjectPlaceholder')}</option>
                      <option value='order'>{t('contact.form.subjects.order')}</option>
                      <option value='product'>
                        {t('contact.form.subjects.product')}
                      </option>
                      <option value='return'>{t('contact.form.subjects.return')}</option>
                      <option value='billing'>
                        {t('contact.form.subjects.billing')}
                      </option>
                      <option value='other'>{t('contact.form.subjects.other')}</option>
                    </select>
                    {fieldErrors.subject && (
                      <p id='subject-error' role='alert' className='mt-1 text-sm text-rose-600'>
                        {t(fieldErrors.subject)}
                      </p>
                    )}
                  </div>

                  <div className='mb-6'>
                    <label
                      htmlFor='message'
                      className='block text-sm font-semibold text-gray-900 mb-2'
                    >
                      {t('contact.form.message')}
                    </label>
                    <textarea
                      id='message'
                      aria-invalid={fieldErrors.message ? true : undefined}
                      aria-describedby={fieldErrors.message ? 'message-error' : undefined}
                      name='message'
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={6}
                      className='w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition-colors resize-none'
                      placeholder={t('contact.form.messagePlaceholder')}
                      maxLength={2000}
                    />
                    {fieldErrors.message && (
                      <p id='message-error' role='alert' className='mt-1 text-sm text-rose-600'>
                        {t(fieldErrors.message)}
                      </p>
                    )}
                  </div>

                  {/*
                    Honeypot: positioned off-screen and hidden from assistive
                    tech, so only automated submitters ever fill it in.
                  */}
                  <div aria-hidden className='hidden'>
                    <label htmlFor='website'>Website</label>
                    <input
                      type='text'
                      id='website'
                      name='website'
                      value={formData.website}
                      onChange={handleChange}
                      tabIndex={-1}
                      autoComplete='off'
                    />
                  </div>

                  {formError && (
                    <p
                      role='alert'
                      className='mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700'
                    >
                      {formError}
                    </p>
                  )}

                  <button
                    type='submit'
                    disabled={sendMessage.isPending}
                    className='w-full inline-flex items-center justify-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    {sendMessage.isPending ? (
                      <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
                    ) : (
                      <Send className='h-4 w-4' />
                    )}
                    {sendMessage.isPending ? t('returns.sending') : t('contact.form.submit')}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
