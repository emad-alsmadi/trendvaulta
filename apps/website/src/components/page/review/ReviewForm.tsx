'use client';

import { useRef, useState } from 'react';
import axios from 'axios';
import { Star } from 'lucide-react';
import { Review, ReviewPayload, ReviewUpdatePayload } from '@/types';
import { Button } from '../../ui/Button';
import { useTranslation } from '@/contexts/TranslationContext';

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
  const { t, dir } = useTranslation();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [ratingError, setRatingError] = useState(false);
  const [purchaseRequiredMessage, setPurchaseRequiredMessage] = useState<
    string | null
  >(null);
  const starRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectRating = (star: number) => {
    setRating(star);
    setRatingError(false);
  };

  /** WAI-ARIA radio group keys; Left/Right follow the visual order (RTL). */
  const handleStarKeyDown = (e: React.KeyboardEvent, star: number) => {
    const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const backward = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    let next: number | null = null;
    if (e.key === forward || e.key === 'ArrowDown') next = star === 5 ? 1 : star + 1;
    else if (e.key === backward || e.key === 'ArrowUp') next = star === 1 ? 5 : star - 1;
    else if (e.key === 'Home') next = 1;
    else if (e.key === 'End') next = 5;
    if (next === null) return;
    e.preventDefault();
    selectRating(next);
    starRefs.current[next - 1]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setRatingError(true);
      starRefs.current[0]?.focus();
      return;
    }
    if (!comment.trim()) return;

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
        setPurchaseRequiredMessage(t('reviews.form.purchaseRequired'));
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
        <p
          id='review-rating-label'
          className='block text-sm font-semibold text-gray-700 mb-2'
        >
          {t('reviews.form.ratingLabel')}
        </p>
        <div
          role='radiogroup'
          aria-labelledby='review-rating-label'
          aria-required='true'
          aria-invalid={ratingError || undefined}
          aria-describedby={ratingError ? 'review-rating-error' : undefined}
          className='flex gap-1'
        >
          {[1, 2, 3, 4, 5].map((star) => {
            const checked = rating === star;
            // Roving tabindex: one tab stop — the chosen star, else the first.
            const focusable = checked || (rating === 0 && star === 1);
            return (
              <button
                key={star}
                ref={(el) => {
                  starRefs.current[star - 1] = el;
                }}
                type='button'
                role='radio'
                aria-checked={checked}
                aria-label={t('reviews.form.starLabel', { count: star })}
                tabIndex={focusable ? 0 : -1}
                onClick={() => selectRating(star)}
                onKeyDown={(e) => handleStarKeyDown(e, star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className='rounded-md transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
              >
                <Star
                  aria-hidden='true'
                  size={28}
                  className={
                    star <= (hoverRating || rating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-gray-300'
                  }
                />
              </button>
            );
          })}
        </div>
        {ratingError && (
          <p
            id='review-rating-error'
            role='alert'
            className='mt-2 text-sm font-semibold text-rose-700'
          >
            {t('reviews.form.ratingRequired')}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor='comment'
          className='block text-sm font-semibold text-gray-700 mb-2'
        >
          {t('reviews.form.commentLabel')}
        </label>
        <textarea
          id='comment'
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t('reviews.form.commentPlaceholder')}
          rows={4}
          className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none'
          required
          minLength={3}
          maxLength={1000}
        />
        <p className='text-xs text-gray-500 mt-1'>
          {t('reviews.form.charCount', { count: comment.length, max: 1000 })}
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
        {/* Not disabled for a missing rating: submitting explains what's
            missing (a disabled button gives screen readers no reason). */}
        <Button
          type='submit'
          disabled={isSubmitting}
          className='flex-1'
        >
          {isSubmitting
            ? t('reviews.form.submitting')
            : existingReview
              ? t('reviews.form.update')
              : t('reviews.form.submit')}
        </Button>
        {onCancel && (
          <Button
            type='button'
            variant='outline'
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {t('confirmDialog.cancel')}
          </Button>
        )}
      </div>
    </form>
  );
}
