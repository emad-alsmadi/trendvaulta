'use client';

import {
  useMyReviews,
  useDeleteReviewMutation,
} from '@/hooks/reviews/reviewsQuery';
import { Trash2, Pencil, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { StarRating } from '@/components/page/rating/StarRating';
import { intlLocale } from '@/lib/locale';
import { logErrorForDev } from '@/lib/userFacingError';
import { ListSkeleton, PageHeaderSkeleton } from '@/components/ui/Skeleton';
import { PANEL, PILL, UserEmptyState, UserPageHeader } from '../UserPage';

const ACTION_BASE =
  'inline-flex items-center gap-1.5 rounded-full bg-stone-200/60 px-3.5 py-2 text-xs font-semibold text-ink transition-colors duration-(--dur-fast) hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 disabled:pointer-events-none disabled:opacity-50';

export default function UserReviewsPage() {
  const { t, locale } = useTranslation();
  const confirm = useConfirm();
  const { data: reviews, isLoading, error } = useMyReviews();
  const deleteReview = useDeleteReviewMutation();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getProductId = (product: string | { _id?: string } | null | undefined): string => {
    if (!product) return '';
    return typeof product === 'string' ? product : product._id || '';
  };

  const getProductTitle = (product: unknown): string => {
    const title = (product as { title?: unknown } | null)?.title;
    return typeof title === 'string' && title ? title : t('userArea.reviews.product');
  };

  const handleDelete = (reviewId: string, productId: string) =>
    confirm({
      variant: 'danger',
      title: t('userArea.reviews.deleteConfirm'),
      confirmLabel: t('addresses.delete'),
      cancelLabel: t('confirmDialog.cancel'),
      onConfirm: async () => {
        setDeletingId(reviewId);
        try {
          await deleteReview.mutateAsync({ reviewId, productId });
        } catch (err) {
          logErrorForDev(err);
        } finally {
          setDeletingId(null);
        }
      },
    });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(intlLocale(locale), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div>
        <PageHeaderSkeleton className='mb-8' />
        <ListSkeleton rows={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${PANEL} text-sm font-medium text-rose-700`}>
        {t('userArea.reviews.loadError')}
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className='space-y-6'>
        <UserPageHeader title={t('userArea.reviews.title')} />
        <UserEmptyState
          icon={<MessageSquare className='h-6 w-6' strokeWidth={1.5} aria-hidden />}
          title={t('userArea.reviews.emptyTitle')}
          description={t('userArea.reviews.emptyDescription')}
          action={
            <Link
              href='/products'
              className='inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-bold text-white shadow-soft transition-colors hover:bg-stone-800'
            >
              {t('userArea.reviews.browseProducts')}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <UserPageHeader
        title={t('userArea.reviews.title')}
        action={
          <span className={PILL}>
            {t('userArea.reviews.count', { count: reviews.length })}
          </span>
        }
      />

      <ul className='space-y-9'>
        {reviews.map((review) => {
          const productId = getProductId(review.product);
          return (
            <li key={review._id} className={PANEL}>
              <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                <div className='min-w-0'>
                  <Link
                    href={`/products/${productId}`}
                    className='text-base font-semibold text-ink transition-colors hover:text-accent'
                  >
                    {getProductTitle(review.product)}
                  </Link>
                  <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1'>
                    <StarRating
                      rating={review.rating}
                      size={15}
                      showValue={false}
                    />
                    <span className='text-xs text-ink-muted'>
                      {formatDate(review.createdAt)}
                    </span>
                  </div>
                </div>
                <div className='flex shrink-0 flex-wrap gap-2'>
                  <Link
                    href={`/products/${productId}`}
                    className={`${ACTION_BASE} hover:bg-ink`}
                  >
                    <Pencil className='h-3.5 w-3.5' aria-hidden />
                    {t('addresses.edit')}
                  </Link>
                  <button
                    type='button'
                    onClick={() => void handleDelete(review._id, productId)}
                    disabled={deletingId === review._id || deleteReview.isPending}
                    className={`${ACTION_BASE} hover:bg-rose-600`}
                  >
                    <Trash2 className='h-3.5 w-3.5' aria-hidden />
                    {deletingId === review._id
                      ? t('userArea.reviews.deleting')
                      : t('addresses.delete')}
                  </button>
                </div>
              </div>
              {review.comment && (
                <p className='mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-muted'>
                  {review.comment}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {/* Help */}
      <div className='flex flex-col gap-5 pt-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='min-w-0'>
          <h2 className='text-heading text-ink'>{t('userArea.reviews.helpTitle')}</h2>
          <p className='mt-1.5 text-sm leading-relaxed text-ink-muted'>
            {t('userArea.reviews.helpDescription')}
          </p>
        </div>
        <div className='flex shrink-0 flex-wrap gap-2'>
          <Link
            href='/faq'
            className='inline-flex h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-stone-800'
          >
            {t('orders.viewFaq')}
          </Link>
          <Link
            href='/contact'
            className='inline-flex h-11 items-center rounded-full bg-stone-200/60 px-5 text-sm font-semibold text-ink transition-colors hover:bg-stone-200'
          >
            {t('orders.contactSupport')}
          </Link>
        </div>
      </div>
    </div>
  );
}
