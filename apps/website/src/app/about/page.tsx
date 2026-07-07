'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Sparkles, Rocket, ShieldCheck, Palette } from 'lucide-react';

export default function AboutPage() {
  return (
    <div>
      <motion.div
        aria-hidden
        className='pointer-events-none absolute inset-0'
        animate={{
          backgroundPositionX: ['0%', '100%'],
          backgroundPositionY: ['0%', '100%'],
        }}
        transition={{
          duration: 26,
          repeat: Infinity,
          repeatType: 'mirror',
          ease: 'linear',
        }}
        style={{
          backgroundImage: "url('/about-bg.svg')",
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
      />

      <div className='relative mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6 lg:px-8'>
        <motion.article
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className='rounded-3xl border border-white/35 bg-white/40 p-8 backdrop-blur-xl'
        >
          <div className='grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center'>
            <div>
              <div className='inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/45 px-3 py-1 text-xs font-extrabold text-indigo-950'>
                <Sparkles className='h-4 w-4 text-fuchsia-700' />
                About the experience
              </div>
              <h1 className='mt-4 text-4xl font-extrabold tracking-tight text-indigo-950 sm:text-5xl'>
                Craftify — a modern templates marketplace UI that feels alive
              </h1>
              <p className='mt-4 max-w-2xl text-sm font-semibold text-indigo-950/80'>
                This frontend is designed as a premium, vibrant and animated
                catalog—matching the backend API while keeping every interaction
                smooth, colorful and responsive.
              </p>

              <div className='mt-6 grid gap-3 sm:grid-cols-3'>
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
                    className={`rounded-2xl border border-white/35 bg-gradient-to-br ${f.tone} p-4`}
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

            <motion.div
              className='relative'
              animate={{ y: [0, -10, 0], rotate: [0, 0.6, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className='rounded-3xl border border-white/35 bg-white/30 p-3 backdrop-blur-xl'>
                <Image
                  src='/about-hero.svg'
                  alt='Templates marketplace illustration'
                  width={1200}
                  height={900}
                  className='h-auto w-full rounded-2xl'
                  priority
                />
              </div>
            </motion.div>
          </div>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className='rounded-3xl border border-white/35 bg-white/35 p-8 backdrop-blur-xl'
        >
          <h2 className='text-2xl font-extrabold tracking-tight text-indigo-950'>
            How the architecture is shaped
          </h2>
          <p className='mt-3 max-w-3xl text-sm font-semibold text-indigo-950/80'>
            The app follows an API-first approach. Pages are structured to be
            reusable and scalable, with motion layers to keep the UI dynamic.
          </p>

          <div className='mt-6 grid gap-4 lg:grid-cols-3'>
            {[
              {
                title: 'Frontend stack',
                text: 'Next.js (App Router), TypeScript, Tailwind, framer-motion.',
              },
              {
                title: 'State & data',
                text: 'Redux Toolkit for catalog queries, pagination, and auth state.',
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
                className='rounded-2xl border border-white/35 bg-gradient-to-br from-white/25 via-white/20 to-white/10 p-5'
              >
                <div className='text-sm font-extrabold text-indigo-950'>
                  {s.title}
                </div>
                <div className='mt-2 text-sm font-semibold text-indigo-950/80'>
                  {s.text}
                </div>
              </motion.section>
            ))}
          </div>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className='rounded-3xl border border-white/35 bg-white/35 p-8 backdrop-blur-xl'
        >
          <h2 className='text-2xl font-extrabold tracking-tight text-indigo-950'>
            Motion, but still professional
          </h2>
          <p className='mt-3 max-w-3xl text-sm font-semibold text-indigo-950/80'>
            The background drifts endlessly, the hero floats subtly, and each
            section enters with smooth transitions—keeping the page alive
            without being distracting.
          </p>
        </motion.article>
      </div>
    </div>
  );
}
