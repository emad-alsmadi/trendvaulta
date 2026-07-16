'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Rocket,
  ShieldCheck,
  Palette,
  Users,
  Download,
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
    role: 'Lead Developer',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
  },
  {
    name: 'Emily Davis',
    role: 'Product Manager',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200',
  },
];

const stats = [
  { value: '50K+', label: 'Templates', icon: Palette },
  { value: '10K+', label: 'Creators', icon: Users },
  { value: '1M+', label: 'Downloads', icon: Download },
  { value: '4.8', label: 'Average Rating', icon: Star },
];

export default function AboutPage() {
  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className='bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-500 py-20'
      >
        <div className='max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 text-center'>
          <div className='inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-4 py-2 text-sm font-extrabold text-white mb-6'>
            <Sparkles className='h-4 w-4' />
            About Craftify
          </div>
          <h1 className='text-4xl sm:text-5xl font-extrabold text-white mb-4'>
            The World's Best Templates Marketplace
          </h1>
          <p className='text-lg text-white/90 max-w-2xl mx-auto'>
            We're on a mission to empower creators with beautiful, professional
            templates
          </p>
        </div>
      </motion.section>

      <div className='max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16'>
        {/* Stats Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className='grid grid-cols-2 md:grid-cols-4 gap-6'
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
                className='bg-white rounded-2xl border border-gray-200 p-6 text-center'
              >
                <Icon className='h-8 w-8 text-indigo-600 mx-auto mb-3' />
                <div className='text-3xl font-extrabold text-gray-900'>
                  {stat.value}
                </div>
                <div className='text-sm text-gray-600 mt-1'>{stat.label}</div>
              </motion.div>
            );
          })}
        </motion.section>

        {/* Mission Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className='bg-white rounded-3xl border border-gray-200 p-8 md:p-12'
        >
          <div className='grid md:grid-cols-2 gap-8 items-center'>
            <div>
              <h2 className='text-3xl font-extrabold text-gray-900 mb-4'>
                Our Mission
              </h2>
              <p className='text-gray-600 mb-6'>
                Craftify was founded with a simple goal: to make professional
                design accessible to everyone. We believe that great design
                shouldn't be reserved for those with big budgets.
              </p>
              <p className='text-gray-600 mb-6'>
                Our platform connects talented creators from around the world
                with businesses and individuals looking for beautiful,
                functional templates. Every template on our platform is
                carefully curated to ensure the highest quality.
              </p>
              <div className='flex items-center gap-2 text-indigo-600 font-semibold'>
                <Globe className='h-5 w-5' />
                <span>Serving creators in 150+ countries</span>
              </div>
            </div>
            <div className='grid gap-3 sm:grid-cols-3'>
              {[
                {
                  title: 'Speed',
                  icon: Rocket,
                  text: 'Search, filter and paginate with silky UI transitions.',
                  tone: 'from-amber-500/15 via-rose-500/10 to-fuchsia-500/15',
                },
                {
                  title: 'Security',
                  icon: ShieldCheck,
                  text: 'Auth flows built to integrate directly with your API.',
                  tone: 'from-cyan-500/15 via-emerald-500/10 to-lime-500/15',
                },
                {
                  title: 'Style',
                  icon: Palette,
                  text: 'Modern gradients, motion layers and micro-interactions.',
                  tone: 'from-indigo-500/15 via-purple-500/10 to-fuchsia-500/15',
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className={`rounded-2xl border border-gray-200 bg-gradient-to-br ${f.tone} p-4`}
                >
                  <div className='inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/40'>
                    <f.icon className='h-5 w-5 text-indigo-950' />
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

        {/* Team Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className='text-3xl font-extrabold text-gray-900 mb-8 text-center'>
            Meet Our Team
          </h2>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className='bg-white rounded-2xl border border-gray-200 overflow-hidden'
              >
                <div className='aspect-square relative'>
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

        {/* Architecture Section */}
        <motion.article
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className='bg-white rounded-3xl border border-gray-200 p-8 md:p-12'
        >
          <h2 className='text-2xl font-extrabold tracking-tight text-gray-900 mb-4'>
            Built with Modern Technology
          </h2>
          <p className='mt-3 max-w-3xl text-sm font-semibold text-gray-600 mb-6'>
            The app follows an API-first approach. Pages are structured to be
            reusable and scalable, with motion layers to keep the UI dynamic.
          </p>

          <div className='grid gap-4 md:grid-cols-3'>
            {[
              {
                title: 'Frontend stack',
                text: 'Next.js (App Router), TypeScript, Tailwind, framer-motion.',
              },
              {
                title: 'State & data',
                text: 'React Query for catalog queries, pagination, and auth state.',
              },
              {
                title: 'API matching',
                text: 'Requests use /api and /password rewrites to match your backend routes.',
              },
            ].map((s) => (
              <motion.section
                key={s.title}
                whileHover={{ y: -3 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className='rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5'
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
