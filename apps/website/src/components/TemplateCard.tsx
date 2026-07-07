import Image from 'next/image';
import Link from 'next/link';
import { normalizeRemoteImageSrc, remoteCoverLoader } from '@/lib/utils';
import { Template } from '@/types';
import { Button } from './ui/Button';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface TemplateCardProps {
  template: Template;
}

export function TemplateCard({ template }: TemplateCardProps) {
  const creatorName =
    typeof template.author === 'string'
      ? template.author
      : template.author.name;

  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className='group relative rounded-3xl bg-gradient-to-br from-amber-500/25 via-fuchsia-500/20 to-cyan-500/25 p-[1px]'
      style={{ perspective: 900 }}
    >
      <motion.div
        animate={{ rotateY: hovered ? 180 : 0 }}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
        className='relative h-full rounded-3xl'
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div
          className='rounded-3xl border border-white/40 bg-white/45 p-4 shadow-sm backdrop-blur-xl'
          style={{ backfaceVisibility: 'hidden' }}
        >
          <Link href={`/templates/${template._id}`}>
            <div className='relative mb-3 aspect-[3/4] w-full overflow-hidden rounded-2xl bg-white/30'>
              <Image
                loader={remoteCoverLoader}
                src={normalizeRemoteImageSrc(template.cover)}
                alt={template.title}
                fill
                className='object-cover transition-transform duration-500 group-hover:scale-110'
                sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
              />
              <div className='pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100' />
            </div>
          </Link>

          <div className='space-y-2'>
            <h3 className='line-clamp-2 text-base font-extrabold tracking-tight text-indigo-950'>
              {template.title}
            </h3>
            <p className='text-xs font-extrabold text-indigo-900/80'>
              by {creatorName}
            </p>
            <div className='flex items-center justify-between'>
              <p className='text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-700 via-indigo-700 to-cyan-700'>
                ${template.price.toFixed(2)}
              </p>
              <span className='rounded-full bg-gradient-to-r from-emerald-400 to-lime-400 px-3 py-1 text-xs font-extrabold text-emerald-950'>
                In stock
              </span>
            </div>
            <Link href={`/templates/${template._id}`}>
              <Button className='w-full'>View Details</Button>
            </Link>
          </div>
        </div>

        <div
          className='absolute inset-0 rounded-3xl border border-white/40 bg-white/45 p-4 shadow-sm backdrop-blur-xl'
          style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
        >
          <div className='flex h-full flex-col justify-between'>
            <div>
              <div className='text-xs font-extrabold uppercase tracking-widest text-indigo-900/80'>
                Quick peek
              </div>
              <div className='mt-2 text-lg font-extrabold tracking-tight text-indigo-950'>
                {creatorName}
              </div>
              <div className='mt-3 rounded-2xl bg-gradient-to-br from-fuchsia-600 via-indigo-600 to-cyan-500 p-[1px]'>
                <div className='rounded-2xl bg-white/60 p-4 text-sm font-semibold text-indigo-950/90'>
                  Hover to flip back. Click to open details.
                </div>
              </div>
            </div>

            <Link href={`/templates/${template._id}`}>
              <Button className='w-full'>Open template</Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
