'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/contexts/TranslationContext';
import {
  ReviewForm,
  isPurchaseRequiredError,
} from '@/components/page/review/ReviewForm';
import { ReviewList } from '@/components/page/review/ReviewList';
import { StarRating } from '@/components/page/rating/StarRating';
import { useMe } from '@/hooks/auth/authQuery';
import {
  useCreateReviewMutation,
  useDeleteReviewMutation,
  useProductReviews,
  useUpdateReviewMutation,
} from '@/hooks/reviews/reviewsQuery';
import { buildLoginUrl } from '@/lib/safeRedirect';
import {
  getUserFacingErrorMessage,
  logErrorForDev,
} from '@/lib/userFacingError';
import type { Review, ReviewPayload, ReviewUpdatePayload } from '@/types';
import { useHasAuthToken } from '@/hooks/auth/useHasAuthToken';
import { ListSkeleton } from '@/components/ui/Skeleton';

type Props = {
  productId: string;
  /** Product-level aggregates (the list below may be a subset). */
  averageRating: number;
  reviewCount: number;
};

/**
 * PDP customer reviews — GET /api/reviews/product/:productId plus the
 * authenticated create / update / delete flows. The shopper's own review is
 * derived from the public list (no private call for anonymous visitors).
 */
export function ProductReviewsSection({
  productId,
  averageRating,
  reviewCount,
}: Props) {
  const pathname = usePathname();
  const { toast } = useToast();
  const { t } = useTranslation();
  const isAuthenticated = useHasAuthToken();
  const meQuery = useMe();
  const currentUserId = meQuery.data?.user?._id;

  const reviewsQuery = useProductReviews(productId);
  const createReview = useCreateReviewMutation();
  const updateReview = useUpdateReviewMutation();
  const deleteReview = useDeleteReviewMutation();

  const [editing, setEditing] = useState<Review | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const reviews = reviewsQuery.data ?? [];
  const myReview =
    currentUserId != null
      ? reviews.find((r) => r.user?._id === currentUserId) ?? null
      : null;

  const isSubmitting = createReview.isPending || updateReview.isPending;

  const handleSubmit = async (data: ReviewPayload | ReviewUpdatePayload) => {
    try {
      if (editing) {
        await updateReview.mutateAsync({
          reviewId: editing._id,
          payload: data as ReviewUpdatePayload,
        });
        toast(t('reviews.updated'), { variant: 'success' });
      } else {
        await createReview.mutateAsync(data as ReviewPayload);
        toast(t('reviews.thanks'), { variant: 'success' });
      }
      setEditing(null);
      setFormOpen(false);
    } catch (err) {
      // The purchase gate is an expected outcome, not a failure: let it
      // bubble back to ReviewForm, which shows it inline next to the fields.
      // Everything else keeps the generic toast.
      if (isPurchaseRequiredError(err)) throw err;
      logErrorForDev(err);
      toast(getUserFacingErrorMessage(err, t('reviews.saveError'), t), {
        variant: 'error',
      });
    }
  };

  const handleDelete = async (reviewId: string) => {
    try {
      await deleteReview.mutateAsync({ reviewId, productId });
      toast(t('reviews.deleted'), { variant: 'success' });
      setEditing(null);
      setFormOpen(false);
    } catch (err) {
      logErrorForDev(err);
      toast(getUserFacingErrorMessage(err, t('reviews.deleteError'), t), {
        variant: 'error',
      });
    }
  };

  const showForm = formOpen || editing != null;
  // One sentence with a {signIn} slot so the link can sit anywhere in the
  // translated text (word order differs between English and Arabic).
  const [signInBefore, signInAfter] = t('reviews.signInToReview').split(
    '{signIn}',
  );

  // Star distribution from the loaded reviews (5 → 1).
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => Math.round(r.rating) === stars).length,
  }));

  return (
    <section
      aria-labelledby='pdp-reviews-heading'
      className='grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-16'
    >
      {/* Summary — stays in view next to a long list */}
      <div className='lg:sticky lg:top-24 lg:self-start'>
        <h2
          id='pdp-reviews-heading'
          className='text-2xl font-semibold tracking-tight text-ink'
        >
          {t('productPage.reviews.title')}
        </h2>

        <div className='mt-6 flex items-end gap-4'>
          <span className='text-6xl font-semibold leading-none tabular-nums tracking-tight text-ink'>
            {averageRating.toFixed(1)}
          </span>
          <div className='pb-1'>
            <StarRating rating={averageRating} size={18} showValue={false} />
            <p className='mt-1.5 text-sm text-ink-muted'>
              {t('productPage.reviewCount', { count: reviewCount })}
            </p>
          </div>
        </div>

        {reviews.length > 0 && (
          <ul className='mt-6 space-y-2'>
            {distribution.map(({ stars, count }) => (
              <li
                key={stars}
                className='flex items-center gap-3 text-xs tabular-nums text-ink-muted'
              >
                <span className='inline-flex w-7 shrink-0 items-center gap-1'>
                  {stars}
                  <Star
                    className='h-3 w-3 fill-amber-400 text-amber-400'
                    aria-hidden
                  />
                </span>
                <span className='h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted'>
                  <span
                    className='block h-full rounded-full bg-ink transition-[width] duration-(--dur-slow) ease-brand'
                    style={{ width: `${(count / reviews.length) * 100}%` }}
                  />
                </span>
                <span className='w-6 shrink-0 text-end'>{count}</span>
              </li>
            ))}
          </ul>
        )}

        <div className='mt-6 border-t border-line pt-6'>
          {isAuthenticated ? (
            !showForm && (
              <Button
                type='button'
                variant='line'
                className='w-full'
                onClick={() => {
                  if (myReview) setEditing(myReview);
                  else setFormOpen(true);
                }}
              >
                <MessageSquare className='h-4 w-4' aria-hidden />
                {myReview
                  ? t('reviews.editYourReview')
                  : t('reviews.writeReview')}
              </Button>
            )
          ) : (
            <p className='text-sm text-ink-muted'>
              {signInBefore}
              <Link
                href={buildLoginUrl(pathname)}
                className='font-semibold text-ink underline underline-offset-4 hover:text-accent'
              >
                {t('reviews.signIn')}
              </Link>
              {signInAfter}
            </p>
          )}
        </div>
      </div>

      <div className='min-w-0'>
        {isAuthenticated && showForm && (
          <div className='mb-8 rounded-card bg-surface-muted p-5 sm:p-6'>
            <h3 className='mb-4 text-heading text-ink'>
              {editing ? t('reviews.editYourReview') : t('reviews.writeReview')}
            </h3>
            <ReviewForm
              key={editing?._id ?? 'new'}
              productId={productId}
              existingReview={editing}
              onSubmit={handleSubmit}
              onCancel={() => {
                setEditing(null);
                setFormOpen(false);
              }}
              isSubmitting={isSubmitting}
            />
          </div>
        )}

        {reviewsQuery.isLoading ? (
          <ListSkeleton rows={2} thumb={false} label={t('reviews.loading')} className='py-2' />
        ) : reviewsQuery.error ? (
          <div className='flex flex-wrap items-center gap-3 rounded-control border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800'>
            <span>{t('reviews.loadError')}</span>
            <Button
              type='button'
              size='sm'
              variant='line'
              onClick={() => reviewsQuery.refetch()}
            >
              {t('reviews.retry')}
            </Button>
          </div>
        ) : (
          <ReviewList
            reviews={reviews}
            currentUserId={currentUserId}
            onEdit={(review) => setEditing(review)}
            onDelete={handleDelete}
            isDeleting={deleteReview.isPending}
          />
        )}
      </div>
    </section>
  );
}
