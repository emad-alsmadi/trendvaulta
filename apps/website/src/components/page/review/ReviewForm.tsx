import { useState } from 'react';
import axios from 'axios';
import { Star } from 'lucide-react';
import { Review, ReviewPayload, ReviewUpdatePayload } from '@/types';
import { Button } from '../../ui/Button';

interface ReviewFormProps {
  productId: string;
  existingReview?: Review | null;
  onSubmit: (data: ReviewPayload | ReviewUpdatePayload) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

/**
 * True when the API refused a review because the shopper has not bought the
 * product (403 + code PURCHASE_REQUIRED). Exported so the parent screen can
 * let this one case bubble through to the form's inline message instead of
 * turning it into a generic error toast.
 */
export function isPurchaseRequiredError(err: unknown): boolean {
  return getErrorCode(err) === 'PURCHASE_REQUIRED';
}

/** Extract the API's `code` field from an Axios error response, if present. */
function getErrorCode(err: unknown): string | undefined {
  if (!axios.isAxiosError(err)) return undefined;
  const data = err.response?.data;
  if (data && typeof data === 'object' && 'code' in data) {
    const code = (data as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

export function ReviewForm({
  productId,
  existingReview,
  onSubmit,
  onCancel,
  isSubmitting,
}: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [purchaseRequiredMessage, setPurchaseRequiredMessage] = useState<
    string | null
  >(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || !comment.trim()) return;

    setPurchaseRequiredMessage(null);

    const data = existingReview
      ? ({ rating, comment } as ReviewUpdatePayload)
      : ({ product: productId, rating, comment } as ReviewPayload);

    try {
      await onSubmit(data);
    } catch (err) {
      // A purchase-gated review gets a friendly inline message instead of
      // the parent's generic error toast; anything else still bubbles up.
      if (isPurchaseRequiredError(err)) {
        setPurchaseRequiredMessage(
          'Only customers who bought this item can review it',
        );
        return;
      }
      throw err;
    }
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
          placeholder='Share your experience with this product...'
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

      {purchaseRequiredMessage && (
        <p
          role='status'
          className='rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800'
        >
          {purchaseRequiredMessage}
        </p>
      )}

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
