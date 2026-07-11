import { Review } from '@/types';
import { StarRating } from '../rating/StarRating';
import { Trash2, Edit2 } from 'lucide-react';
import { Button } from '../../ui/Button';

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
  if (reviews.length === 0) {
    return (
      <div className='text-center py-12'>
        <p className='text-gray-500 text-lg'>No reviews yet.</p>
        <p className='text-gray-400 text-sm mt-2'>
          Be the first to review this template!
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
                    <p className='font-semibold text-gray-900'>
                      {review.user.username}
                    </p>
                    <p className='text-xs text-gray-500'>
                      {new Date(review.createdAt).toLocaleDateString('en-US', {
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
                      className='text-gray-600 hover:text-indigo-600'
                    >
                      <Edit2 size={16} />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => onDelete(review._id)}
                      disabled={isDeleting}
                      className='text-gray-600 hover:text-red-600'
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              )}
            </div>

            <p className='text-gray-700 leading-relaxed mt-3'>
              {review.comment}
            </p>
          </div>
        );
      })}
    </div>
  );
}
