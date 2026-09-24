'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/contexts/TranslationContext';
import {
  ReviewForm,
  isPurchaseRequiredError,
} from '@/components/page/review/ReviewForm';
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
  const { t } = useTranslation();
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

  return (
    <div className='space-y-6'>
      {isAuthenticated ? (
        showForm ? (
          <div className='rounded-2xl border border-stone-200 bg-stone-50/60 p-5'>
            <h3 className='mb-4 text-lg font-bold text-stone-900'>
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
            {myReview ? t('reviews.editYourReview') : t('reviews.writeReview')}
          </Button>
        )
      ) : (
        <p className='text-sm text-stone-600'>
          {signInBefore}
          <Link
            href={buildLoginUrl(pathname)}
            className='font-bold text-fuchsia-700 hover:underline'
          >
            {t('reviews.signIn')}
          </Link>
          {signInAfter}
        </p>
      )}

      {reviewsQuery.isLoading ? (
        <div className='flex items-center gap-2 py-6 text-sm text-stone-500'>
          <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
          {t('reviews.loading')}
        </div>
      ) : reviewsQuery.error ? (
        <div className='flex flex-wrap items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800'>
          <span>{t('reviews.loadError')}</span>
          <Button
            type='button'
            size='sm'
            variant='outline'
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
  );
}
