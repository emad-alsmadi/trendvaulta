import { useState } from 'react';
import { Star } from 'lucide-react';
import { Review, ReviewPayload, ReviewUpdatePayload } from '@/types';
import { Button } from '../../ui/Button';

interface ReviewFormProps {
  templateId: string;
  existingReview?: Review | null;
  onSubmit: (data: ReviewPayload | ReviewUpdatePayload) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function ReviewForm({
  templateId,
  existingReview,
  onSubmit,
  onCancel,
  isSubmitting,
}: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || !comment.trim()) return;

    const data = existingReview
      ? ({ rating, comment } as ReviewUpdatePayload)
      : ({ template: templateId, rating, comment } as ReviewPayload);

    await onSubmit(data);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className='space-y-4'
    >
      <div>
        <label className='block text-sm font-semibold text-gray-700 mb-2'>
          Rating
        </label>
        <div className='flex gap-1'>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type='button'
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className='transition-transform hover:scale-110'
            >
              <Star
                size={28}
                className={
                  star <= (hoverRating || rating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-gray-300'
                }
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor='comment'
          className='block text-sm font-semibold text-gray-700 mb-2'
        >
          Your Review
        </label>
        <textarea
          id='comment'
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder='Share your experience with this template...'
          rows={4}
          className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none'
          required
          minLength={3}
          maxLength={1000}
        />
        <p className='text-xs text-gray-500 mt-1'>
          {comment.length}/1000 characters
        </p>
      </div>

      <div className='flex gap-3'>
        <Button
          type='submit'
          disabled={isSubmitting || rating === 0 || !comment.trim()}
          className='flex-1'
        >
          {isSubmitting
            ? 'Submitting...'
            : existingReview
              ? 'Update Review'
              : 'Submit Review'}
        </Button>
        {onCancel && (
          <Button
            type='button'
            variant='outline'
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
