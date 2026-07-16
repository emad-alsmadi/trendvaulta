import Image from 'next/image';
import Link from 'next/link';
import { normalizeRemoteImageSrc, remoteCoverLoader } from '@/lib/utils';
import { Template } from '@/types';
import { Button } from '../../ui/Button';
import { WishlistButton } from '../wishlist/WishlistButton';
import { StarRating } from '../rating/StarRating';
import { motion } from 'framer-motion';
import { ShoppingCart, Eye } from 'lucide-react';

interface TemplateCardProps {
  template: Template;
}

export function TemplateCard({ template }: TemplateCardProps) {
  const creatorName =
    typeof template.creator === 'string'
      ? template.creator
      : template.creator?.name || 'Unknown Creator';

  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className='group bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300'
    >
      {/* Image Container */}
      <div className='relative aspect-[16/9] w-full overflow-hidden bg-gray-100'>
        <Link
          href={`/templates/${template._id}`}
          className='absolute inset-0 z-0'
        >
          <Image
            loader={remoteCoverLoader}
            src={normalizeRemoteImageSrc(template.cover)}
            alt={template.title}
            fill
            className='object-cover transition-transform duration-700 group-hover:scale-110'
            sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
          />
        </Link>

        {/* Overlay Actions */}
        <div className='absolute top-3 right-3 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0'>
          <WishlistButton
            templateId={template._id}
            variant='icon'
            className='bg-white/95 text-gray-700 hover:text-red-500 hover:bg-white shadow-md hover:shadow-lg transition-all duration-200'
          />
        </div>

        {/* Quick View Overlay */}
        <div className='absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6'>
          <Link
            href={`/templates/${template._id}`}
            className='inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold text-sm hover:bg-fuchsia-600 hover:text-white transition-all duration-200 shadow-lg hover:shadow-xl transform translate-y-4 group-hover:translate-y-0'
          >
            <Eye className='h-4 w-4' />
            Quick View
          </Link>
        </div>

        {/* Category Badge */}
        <div className='absolute top-3 left-3 z-10'>
          <span className='inline-block px-3 py-1 bg-fuchsia-600 text-white text-xs font-semibold rounded-full shadow-md'>
            Template
          </span>
        </div>
      </div>

      {/* Content */}
      <div className='p-5 space-y-3'>
        {/* Title */}
        <Link href={`/templates/${template._id}`}>
          <h3 className='line-clamp-2 text-lg font-bold text-gray-900 group-hover:text-fuchsia-600 transition-colors duration-200'>
            {template.title}
          </h3>
        </Link>

        {/* Author */}
        <p className='text-sm text-gray-600 flex items-center gap-1'>
          by{' '}
          <span className='font-semibold text-gray-900 hover:text-fuchsia-600 transition-colors cursor-pointer'>
            {creatorName}
          </span>
        </p>

        {/* Rating and Reviews */}
        <div className='flex items-center gap-3'>
          <StarRating
            rating={template.averageRating}
            size={14}
            showValue={true}
          />
          {template.reviewCount > 0 && (
            <span className='text-xs text-gray-500'>
              ({template.reviewCount})
            </span>
          )}
        </div>

        {/* Price and Action */}
        <div className='flex items-center justify-between pt-4 border-t border-gray-100'>
          <div className='flex flex-col'>
            <span className='text-2xl font-extrabold text-gray-900'>
              ${template.price.toFixed(2)}
            </span>
            <span className='text-xs text-green-600 font-semibold flex items-center gap-1'>
              <span className='w-2 h-2 bg-green-500 rounded-full'></span>
              In Stock
            </span>
          </div>
          <Link href={`/templates/${template._id}`}>
            <Button
              size='sm'
              className='gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200'
            >
              <ShoppingCart className='h-4 w-4' />
              Add
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
