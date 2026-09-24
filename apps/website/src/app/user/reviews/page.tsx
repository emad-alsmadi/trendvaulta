'use client';

import {
  useMyReviews,
  useDeleteReviewMutation,
} from '@/hooks/reviews/reviewsQuery';
import {
  Star,
  Trash2,
  Edit,
  Calendar,
  MessageSquare,
  ExternalLink,
  FolderOpen,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { getAuthToken } from '@/lib/authCookies';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { intlLocale } from '@/lib/locale';

export default function UserReviewsPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const isAuthenticated = !!getAuthToken();
  const { data: reviews, isLoading, error } = useMyReviews();
  const deleteReview = useDeleteReviewMutation();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  const getProductId = (product: string | { _id?: string } | null | undefined): string => {
    if (!product) return '';
    return typeof product === 'string' ? product : product._id || '';
  };

  const getProductTitle = (product: unknown): string => {
    const title = (product as { title?: unknown } | null)?.title;
    return typeof title === 'string' && title ? title : t('userArea.reviews.product');
  };

  const handleDelete = async (reviewId: string, productId: string) => {
    if (confirm(t('userArea.reviews.deleteConfirm'))) {
      setDeletingId(reviewId);
      try {
        await deleteReview.mutateAsync({ reviewId, productId });
      } catch (error) {
        console.error('Delete failed:', error);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(intlLocale(locale), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  if (isLoading) {
    return (
      <div role='status' aria-label={t('common.loading')} className='animate-pulse'>
        <div className='h-8 bg-gray-200 rounded w-48 mb-8'></div>
        <div className='h-64 bg-gray-200 rounded'></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='bg-red-50 border border-red-200 rounded-lg p-4 text-red-800'>
        {t('userArea.reviews.loadError')}
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <>
        <h1 className='mb-6 text-2xl font-extrabold tracking-tight text-indigo-950'>
          {t('userArea.reviews.title')}
        </h1>
        <div className='rounded-3xl border border-white/40 bg-white/55 p-12 text-center shadow-sm backdrop-blur-xl'>
          <MessageSquare className='w-16 h-16 text-gray-400 mx-auto mb-4' />
          <h2 className='text-xl font-semibold text-gray-900 mb-2'>
            {t('userArea.reviews.emptyTitle')}
          </h2>
          <p className='text-gray-600 mb-6'>
            {t('userArea.reviews.emptyDescription')}
          </p>
          <Link
            href='/products'
            className='inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 text-white font-semibold rounded-lg hover:brightness-110 transition'
          >
            {t('userArea.reviews.browseProducts')}
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className='mb-6 flex flex-wrap items-center justify-between gap-2'>
        <h1 className='text-2xl font-extrabold tracking-tight text-indigo-950'>
          {t('userArea.reviews.title')}
        </h1>
        <div className='text-sm font-semibold text-indigo-950/70'>
          {t('userArea.reviews.count', { count: reviews.length })}
        </div>
      </div>

      <div className='overflow-x-auto rounded-3xl border border-white/40 bg-white/55 shadow-sm backdrop-blur-xl'>
        <table className='w-full min-w-[42rem]'>
          <thead className='border-b border-white/40 bg-white/40'>
            <tr>
              <th className='px-6 py-4 text-start text-xs font-bold text-gray-600 uppercase tracking-wider'>
                {t('userArea.reviews.product')}
              </th>
              <th className='px-6 py-4 text-start text-xs font-bold text-gray-600 uppercase tracking-wider'>
                {t('reviews.form.ratingLabel')}
              </th>
              <th className='px-6 py-4 text-start text-xs font-bold text-gray-600 uppercase tracking-wider'>
                {t('userArea.reviews.comment')}
              </th>
              <th className='px-6 py-4 text-start text-xs font-bold text-gray-600 uppercase tracking-wider'>
                {t('orders.table.date')}
              </th>
              <th className='px-6 py-4 text-start text-xs font-bold text-gray-600 uppercase tracking-wider'>
                {t('orders.table.actions')}
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-200'>
            {reviews.map((review) => (
              <tr
                key={review._id}
                className='transition hover:bg-white/50'
              >
                <td className='px-6 py-4'>
                  <Link
                    href={`/products/${getProductId(review.product)}`}
                    className='font-semibold text-gray-900 hover:text-fuchsia-600 transition'
                  >
                    {getProductTitle(review.product)}
                  </Link>
                </td>
                <td className='px-6 py-4'>
                  <div className='flex items-center gap-1'>
                    {renderStars(review.rating)}
                  </div>
                </td>
                <td className='px-6 py-4'>
                  <div className='max-w-xs text-sm text-gray-600 line-clamp-2'>
                    {review.comment}
                  </div>
                </td>
                <td className='px-6 py-4'>
                  <div className='flex items-center gap-2 text-sm text-gray-600'>
                    <Calendar className='w-4 h-4' />
                    <span>{formatDate(review.createdAt)}</span>
                  </div>
                </td>
                <td className='px-6 py-4'>
                  <div className='flex items-center gap-2'>
                    <Link
                      href={`/products/${getProductId(review.product)}`}
                      className='inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-fuchsia-600 hover:text-fuchsia-700 transition'
                    >
                      <Edit className='w-4 h-4' />
                      {t('addresses.edit')}
                    </Link>
                    <button
                      onClick={() =>
                        handleDelete(review._id, getProductId(review.product))
                      }
                      disabled={
                        deletingId === review._id || deleteReview.isPending
                      }
                      className='inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-gray-400 hover:text-red-600 transition disabled:opacity-50'
                    >
                      <Trash2 className='w-4 h-4' />
                      {deletingId === review._id
                        ? t('userArea.reviews.deleting')
                        : t('addresses.delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Help Section */}
      <div className='mt-8 rounded-3xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-cyan-500 p-6 text-white'>
        <h3 className='font-bold mb-2'>
          {t('userArea.reviews.helpTitle')}
        </h3>
        <p className='text-white/90 text-sm mb-4'>
          {t('userArea.reviews.helpDescription')}
        </p>
        <div className='flex gap-3'>
          <Link
            href='/faq'
            className='inline-flex items-center gap-2 bg-white text-fuchsia-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition text-sm'
          >
            <FolderOpen className='w-4 h-4' />
            {t('orders.viewFaq')}
          </Link>
          <Link
            href='/contact'
            className='inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg font-semibold hover:bg-white/30 transition text-sm'
          >
            <ExternalLink className='w-4 h-4' />
            {t('orders.contactSupport')}
          </Link>
        </div>
      </div>
    </>
  );
}
