'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // In a real app, this would send the form data to an API
    setTimeout(() => setSubmitted(false), 3000);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
            Get in Touch
          </div>
          <h1 className='text-4xl font-extrabold text-gray-900 mb-4'>
            Contact Us
          </h1>
          <p className='text-lg text-gray-600 max-w-2xl mx-auto'>
            Questions about orders, products, or returns? Send a message — the
            TrendVaulta care team usually replies within 24 hours.
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
                Contact Information
              </h3>
              <div className='space-y-4'>
                <div className='flex items-start gap-3'>
                  <div className='bg-fuchsia-100 p-3 rounded-lg'>
                    <Mail className='h-5 w-5 text-fuchsia-600' />
                  </div>
                  <div>
                    <div className='font-semibold text-gray-900'>Email</div>
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
                    <div className='font-semibold text-gray-900'>Phone</div>
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
                    <div className='font-semibold text-gray-900'>Studio</div>
                    <div className='text-sm text-gray-600'>
                      120 Market Avenue
                      <br />
                      Retail District, NY 10001
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className='bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-500 rounded-2xl p-6 text-white'>
              <h3 className='font-bold mb-2'>Need help faster?</h3>
              <p className='text-sm text-white/90 mb-4'>
                Browse the Help Center for shipping, returns, and order guides.
              </p>
              <div className='flex flex-wrap gap-2'>
                <Link
                  href='/help'
                  className='inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold transition-colors'
                >
                  Help Center
                </Link>
                <Link
                  href='/faq'
                  className='inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-semibold transition-colors'
                >
                  FAQ
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
                    Message Sent!
                  </h3>
                  <p className='text-gray-600'>
                    Thank you for reaching out. We&apos;ll get back to you within 24
                    hours.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className='grid md:grid-cols-2 gap-6 mb-6'>
                    <div>
                      <label
                        htmlFor='name'
                        className='block text-sm font-semibold text-gray-900 mb-2'
                      >
                        Name
                      </label>
                      <input
                        type='text'
                        id='name'
                        name='name'
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className='w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors'
                        placeholder='Your name'
                      />
                    </div>
                    <div>
                      <label
                        htmlFor='email'
                        className='block text-sm font-semibold text-gray-900 mb-2'
                      >
                        Email
                      </label>
                      <input
                        type='email'
                        id='email'
                        name='email'
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className='w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors'
                        placeholder='your@email.com'
                      />
                    </div>
                  </div>

                  <div className='mb-6'>
                    <label
                      htmlFor='subject'
                      className='block text-sm font-semibold text-gray-900 mb-2'
                    >
                      Subject
                    </label>
                    <select
                      id='subject'
                      name='subject'
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className='w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors'
                    >
                      <option value=''>Select a subject</option>
                      <option value='order'>Order or tracking</option>
                      <option value='product'>Product question</option>
                      <option value='return'>Return or refund</option>
                      <option value='billing'>Payment / billing</option>
                      <option value='other'>Other</option>
                    </select>
                  </div>

                  <div className='mb-6'>
                    <label
                      htmlFor='message'
                      className='block text-sm font-semibold text-gray-900 mb-2'
                    >
                      Message
                    </label>
                    <textarea
                      id='message'
                      name='message'
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={6}
                      className='w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition-colors resize-none'
                      placeholder='How can we help you?'
                    />
                  </div>

                  <button
                    type='submit'
                    className='w-full inline-flex items-center justify-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors'
                  >
                    <Send className='h-4 w-4' />
                    Send Message
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
