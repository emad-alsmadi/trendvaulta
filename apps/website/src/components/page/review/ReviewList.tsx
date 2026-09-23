'use client';

import { Review } from '@/types';
import { StarRating } from '../rating/StarRating';
import { Trash2, Edit2, BadgeCheck } from 'lucide-react';
import { Button } from '../../ui/Button';
import { SITE_NAME } from '@/lib/site';
import { useTranslation } from '@/contexts/TranslationContext';
import { intlLocale } from '@/lib/locale';

interface ReviewListProps {
  reviews: Review[];
  currentUserId?: string;
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: string) => Promise<void>;
  isDeleting?: boolean;
}

export function ReviewList({
  reviews,
  currentUserId,
  onEdit,
  onDelete,
  isDeleting,
}: ReviewListProps) {
  const { t, locale } = useTranslation();

  if (reviews.length === 0) {
    return (
      <div className='text-center py-12'>
        <p className='text-gray-500 text-lg'>{t('reviews.list.empty')}</p>
        <p className='text-gray-400 text-sm mt-2'>
          {t('reviews.list.beFirst')}
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {reviews.map((review) => {
        const isOwner = currentUserId === review.user._id;

        return (
          <div
            key={review._id}
            className='bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-white/40 shadow-sm'
          >
            <div className='flex items-start justify-between mb-3'>
              <div className='flex-1'>
                <div className='flex items-center gap-3 mb-2'>
                  <div className='w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold'>
                    {review.user.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className='flex flex-wrap items-center gap-2'>
                      <p className='font-semibold text-gray-900'>
                        {review.user.username}
                      </p>
                      {review.verifiedPurchase && (
                        <span className='inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200'>
                          <BadgeCheck size={12} aria-hidden />
                          {t('reviews.list.verifiedPurchase')}
                        </span>
                      )}
                    </div>
                    <p className='text-xs text-gray-500'>
                      {new Date(review.createdAt).toLocaleDateString(intlLocale(locale), {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <StarRating
                  rating={review.rating}
                  size={16}
                  showValue={false}
                />
              </div>

              {isOwner && (
                <div className='flex gap-2'>
                  {onEdit && (
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => onEdit(review)}
                      aria-label={t('reviews.list.edit')}
                      className='text-gray-600 hover:text-fuchsia-600'
                    >
                      <Edit2 size={16} aria-hidden />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => onDelete(review._id)}
                      disabled={isDeleting}
                      aria-label={t('reviews.list.delete')}
                      className='text-gray-600 hover:text-red-600'
                    >
                      <Trash2 size={16} aria-hidden />
                    </Button>
                  )}
                </div>
              )}
            </div>

            <p className='text-gray-700 leading-relaxed mt-3'>
              {review.comment}
            </p>

            {review.reply?.text && (
              <div className='mt-4 rounded-xl border-s-4 border-blue-500 bg-blue-50/60 px-4 py-3'>
                <p className='text-xs font-semibold uppercase tracking-wide text-blue-700'>
                  {t('reviews.list.storeResponse', { name: SITE_NAME })}
                  {review.reply.repliedAt && (
                    <span className='ms-2 font-normal normal-case tracking-normal text-gray-500'>
                      {new Date(review.reply.repliedAt).toLocaleDateString(intlLocale(locale), {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </p>
                <p className='mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-700'>
                  {review.reply.text}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
