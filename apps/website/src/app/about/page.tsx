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

const team = [
  {
    name: 'John Smith',
    role: 'CEO & Founder',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
  },
  {
    name: 'Sarah Johnson',
    role: 'Creative Director',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
  },
  {
    name: 'Mike Chen',
    role: 'Head of Merchandising',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
  },
  {
    name: 'Emily Davis',
    role: 'Customer Experience',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200',
  },
];

const stats = [
  { value: '2K+', label: 'Products', icon: Package },
  { value: '120+', label: 'Brands', icon: Store },
  { value: '50K+', label: 'Shoppers', icon: Users },
  { value: '4.8', label: 'Average Rating', icon: Star },
];

export default function AboutPage() {
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
            About TrendVaulta
          </div>
          <h1 className='mb-4 text-4xl font-extrabold text-white sm:text-5xl'>
            Beauty, fashion &amp; lifestyle — curated for everyday style
          </h1>
          <p className='mx-auto max-w-2xl text-lg text-white/90'>
            We help shoppers discover trusted brands and products they love —
            with clear prices, secure checkout, and care you can count on.
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
                key={stat.label}
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
                <div className='mt-1 text-sm text-gray-600'>{stat.label}</div>
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
                Our Mission
              </h2>
              <p className='mb-6 text-gray-600'>
                TrendVaulta was founded to make premium beauty, fashion, and
                lifestyle shopping feel simple and trustworthy — without the
                noise of a generic marketplace.
              </p>
              <p className='mb-6 text-gray-600'>
                We curate products and brands that fit real routines: skincare
                that works, fashion that feels current, and accessories that
                elevate everyday looks. Every listing is reviewed for quality and
                clarity before it reaches the storefront.
              </p>
              <div className='flex gap-2 items-center font-semibold text-indigo-600'>
                <Globe className='w-5 h-5' />
                <span>Shipping to shoppers worldwide</span>
              </div>
            </div>
            <div className='grid gap-3 sm:grid-cols-3'>
              {[
                {
                  title: 'Delivery',
                  icon: Truck,
                  text: 'Tracked shipping options with clear expectations at checkout.',
                  tone: 'from-amber-500/15 via-rose-500/10 to-fuchsia-500/15',
                },
                {
                  title: 'Security',
                  icon: ShieldCheck,
                  text: 'Encrypted payments through Stripe when configured.',
                  tone: 'from-cyan-500/15 via-emerald-500/10 to-lime-500/15',
                },
                {
                  title: 'Care',
                  icon: Heart,
                  text: 'Wishlist, reviews, and support built around real shopping.',
                  tone: 'from-indigo-500/15 via-purple-500/10 to-fuchsia-500/15',
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className={`rounded-2xl border border-gray-200 bg-gradient-to-br ${f.tone} p-4`}
                >
                  <div className='inline-flex justify-center items-center w-10 h-10 rounded-2xl bg-white/40'>
                    <f.icon className='w-5 h-5 text-indigo-950' />
                  </div>
                  <div className='mt-3 text-sm font-extrabold text-indigo-950'>
                    {f.title}
                  </div>
                  <div className='mt-1 text-sm font-semibold text-indigo-950/80'>
                    {f.text}
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
            Meet Our Team
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
                  <p className='text-sm text-gray-600'>{member.role}</p>
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
            How we shop with you
          </h2>
          <p className='mt-3 mb-6 max-w-3xl text-sm font-semibold text-gray-600'>
            TrendVaulta combines a curated catalog with modern shopping tools —
            search, brands, wishlist, reviews, and secure checkout — so finding
            your next favorite product feels effortless.
          </p>

          <div className='grid gap-4 md:grid-cols-3'>
            {[
              {
                title: 'Curated catalog',
                text: 'Beauty, fashion, and lifestyle picks from featured brands.',
              },
              {
                title: 'Confident checkout',
                text: 'Coupons, delivery options, and Stripe-secured payments.',
              },
              {
                title: 'After purchase',
                text: 'Order tracking, returns guidance, and human support.',
              },
            ].map((s) => (
              <motion.section
                key={s.title}
                whileHover={{ y: -3 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className='p-5 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200'
              >
                <div className='text-sm font-extrabold text-gray-900'>
                  {s.title}
                </div>
                <div className='mt-2 text-sm font-semibold text-gray-600'>
                  {s.text}
                </div>
              </motion.section>
            ))}
          </div>
        </motion.article>
      </div>
    </div>
  );
}
