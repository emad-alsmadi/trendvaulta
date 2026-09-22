'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { ReviewForm } from '@/components/page/review/ReviewForm';
import { ReviewList } from '@/components/page/review/ReviewList';
import { useMe } from '@/hooks/auth/authQuery';
import {
  useCreateReviewMutation,
  useDeleteReviewMutation,
  useProductReviews,
  useUpdateReviewMutation,
} from '@/hooks/reviews/reviewsQuery';
import { getAuthToken } from '@/lib/authCookies';
import { buildLoginUrl } from '@/lib/safeRedirect';
import {
  getUserFacingErrorMessage,
  logErrorForDev,
} from '@/lib/userFacingError';
import type { Review, ReviewPayload, ReviewUpdatePayload } from '@/types';

type Props = {
  productId: string;
};

/**
 * PDP customer reviews — GET /api/reviews/product/:productId plus the
 * authenticated create / update / delete flows. The shopper's own review is
 * derived from the public list (no private call for anonymous visitors).
 */
export function ProductReviewsSection({ productId }: Props) {
  const pathname = usePathname();
  const { toast } = useToast();
  const isAuthenticated = Boolean(getAuthToken());
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
        toast('Review updated', { variant: 'success' });
      } else {
        await createReview.mutateAsync(data as ReviewPayload);
        toast('Thanks for your review!', { variant: 'success' });
      }
      setEditing(null);
      setFormOpen(false);
    } catch (err) {
      logErrorForDev(err);
      toast(getUserFacingErrorMessage(err, 'Could not save your review'), {
        variant: 'error',
      });
    }
  };

  const handleDelete = async (reviewId: string) => {
    try {
      await deleteReview.mutateAsync({ reviewId, productId });
      toast('Review deleted', { variant: 'success' });
      setEditing(null);
      setFormOpen(false);
    } catch (err) {
      logErrorForDev(err);
      toast(getUserFacingErrorMessage(err, 'Could not delete your review'), {
        variant: 'error',
      });
    }
  };

  const showForm = formOpen || editing != null;

  return (
    <div className='space-y-6'>
      {isAuthenticated ? (
        showForm ? (
          <div className='rounded-2xl border border-stone-200 bg-stone-50/60 p-5'>
            <h3 className='mb-4 text-lg font-bold text-stone-900'>
              {editing ? 'Edit your review' : 'Write a review'}
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
        ) : (
          <Button
            type='button'
            variant='outline'
            className='gap-2'
            onClick={() => {
              if (myReview) setEditing(myReview);
              else setFormOpen(true);
            }}
          >
            <MessageSquare className='h-4 w-4' />
            {myReview ? 'Edit your review' : 'Write a review'}
          </Button>
        )
      ) : (
        <p className='text-sm text-stone-600'>
          <Link
            href={buildLoginUrl(pathname)}
            className='font-bold text-fuchsia-700 hover:underline'
          >
            Sign in
          </Link>{' '}
          to write a review.
        </p>
      )}

      {reviewsQuery.isLoading ? (
        <div className='flex items-center gap-2 py-6 text-sm text-stone-500'>
          <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
          Loading reviews…
        </div>
      ) : reviewsQuery.error ? (
        <div className='flex flex-wrap items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800'>
          <span>Reviews could not be loaded right now.</span>
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={() => reviewsQuery.refetch()}
          >
            Retry
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
  );
}
