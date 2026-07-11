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
    typeof template.author === 'string'
      ? template.author
      : template.author.name;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className='group bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300'
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
            className='object-cover transition-transform duration-500 group-hover:scale-105'
            sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
          />
        </Link>

        {/* Overlay Actions */}
        <div className='absolute top-3 right-3 z-10 flex gap-2'>
          <WishlistButton
            templateId={template._id}
            variant='icon'
            className='bg-white/90 text-gray-700 hover:text-red-500 hover:bg-white shadow-sm'
          />
        </div>

        {/* Quick View Overlay */}
        <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center'>
          <Link
            href={`/templates/${template._id}`}
            className='inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors'
          >
            <Eye className='h-4 w-4' />
            Quick View
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className='p-4 space-y-3'>
        {/* Category Badge */}
        <div className='flex items-center justify-between'>
          <span className='inline-block px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded'>
            Template
          </span>
          <StarRating
            rating={template.averageRating}
            size={12}
            showValue={true}
          />
        </div>

        {/* Title */}
        <Link href={`/templates/${template._id}`}>
          <h3 className='line-clamp-2 text-base font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors'>
            {template.title}
          </h3>
        </Link>

        {/* Author */}
        <p className='text-sm text-gray-600'>
          by <span className='font-medium text-gray-900'>{creatorName}</span>
        </p>

        {/* Review Count */}
        {template.reviewCount > 0 && (
          <p className='text-xs text-gray-500'>
            {template.reviewCount} review{template.reviewCount !== 1 ? 's' : ''}
          </p>
        )}

        {/* Price and Action */}
        <div className='flex items-center justify-between pt-3 border-t border-gray-100'>
          <div className='flex flex-col'>
            <span className='text-2xl font-bold text-gray-900'>
              ${template.price.toFixed(2)}
            </span>
            <span className='text-xs text-green-600 font-medium'>In Stock</span>
          </div>
          <Link href={`/templates/${template._id}`}>
            <Button
              size='sm'
              className='gap-2'
            >
              <ShoppingCart className='h-4 w-4' />
              Add to Cart
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
