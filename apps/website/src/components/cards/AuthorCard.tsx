'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Creator } from '@/types';
import { User, MapPin } from 'lucide-react';

export function AuthorCard({ author }: { author: Creator }) {
  return (
    <motion.div
      whileHover={{ y: -6, rotateX: 2, rotateY: 2 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className='group relative rounded-3xl bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-fuchsia-500/15 p-[1px]'
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div className='rounded-3xl border border-white/50 bg-white/60 p-5 shadow-sm backdrop-blur-xl'>
        <div className='flex items-start gap-3'>
          <div className='inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 via-rose-500 to-fuchsia-600 text-white shadow-sm'>
            <User className='h-5 w-5' />
          </div>
          <div className='min-w-0'>
            <div className='truncate text-base font-extrabold tracking-tight text-gray-900'>
              {author.name}
            </div>
            <div className='mt-1 inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1 text-xs font-bold text-gray-700'>
              <MapPin className='h-3.5 w-3.5' />
              {author.country}
            </div>
          </div>
        </div>

        <p className='mt-4 line-clamp-2 text-sm text-gray-700'>{author.bio}</p>

        <div className='mt-5'>
          <Link
            href={`/creators/${author._id}`}
            className='inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:brightness-110'
          >
            View profile
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
