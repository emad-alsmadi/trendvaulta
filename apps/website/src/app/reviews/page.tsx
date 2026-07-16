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
  FileText,
  ExternalLink,
  FolderOpen,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function ReviewsPage() {
  const { data: reviews, isLoading, error } = useMyReviews();
  const deleteReview = useDeleteReviewMutation();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getTemplateId = (template: string | any): string => {
    if (!template) return '';
    return typeof template === 'string' ? template : template._id || '';
  };

  const handleDelete = async (reviewId: string, templateId: string) => {
    if (confirm('Are you sure you want to delete this review?')) {
      setDeletingId(reviewId);
      try {
        await deleteReview.mutateAsync({ reviewId, templateId });
      } catch (error) {
        console.error('Delete failed:', error);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='animate-pulse'>
            <div className='h-8 bg-gray-200 rounded w-48 mb-8'></div>
            <div className='h-64 bg-gray-200 rounded'></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='bg-red-50 border border-red-200 rounded-lg p-4 text-red-800'>
            Failed to load reviews
          </div>
        </div>
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <h1 className='text-2xl font-bold text-gray-900 mb-8'>My Reviews</h1>
          <div className='bg-white rounded-lg border border-gray-200 p-12 text-center'>
            <MessageSquare className='w-16 h-16 text-gray-400 mx-auto mb-4' />
            <h2 className='text-xl font-semibold text-gray-900 mb-2'>
              No reviews yet
            </h2>
            <p className='text-gray-600 mb-6'>
              Start reviewing templates you've purchased to share your
              experience with others.
            </p>
            <Link
              href='/'
              className='inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 text-white font-semibold rounded-lg hover:brightness-110 transition'
            >
              Browse Templates
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Breadcrumb */}
        <nav className='flex items-center gap-2 text-sm text-gray-600 mb-8'>
          <Link
            href='/'
            className='hover:text-fuchsia-600'
          >
            Home
          </Link>
          <span>/</span>
          <span className='text-gray-900'>My Reviews</span>
        </nav>

        <div className='flex gap-8'>
          {/* Sidebar */}
          <aside className='w-64 flex-shrink-0 hidden lg:block'>
            <div className='bg-white rounded-lg border border-gray-200 p-4 sticky top-8'>
              <h3 className='font-bold text-gray-900 mb-4'>Account</h3>
              <nav className='space-y-1'>
                <Link
                  href='/profile'
                  className='block px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-fuchsia-600 transition'
                >
                  Profile
                </Link>
                <Link
                  href='/orders'
                  className='block px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-fuchsia-600 transition'
                >
                  Orders
                </Link>
                <Link
                  href='/downloads'
                  className='block px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-fuchsia-600 transition'
                >
                  Downloads
                </Link>
                <Link
                  href='/wishlist'
                  className='block px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-fuchsia-600 transition'
                >
                  Wishlist
                </Link>
                <Link
                  href='/reviews'
                  className='block px-4 py-2 rounded-lg bg-fuchsia-50 text-fuchsia-700 font-semibold'
                >
                  Reviews
                </Link>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <div className='flex-1'>
            <div className='flex items-center justify-between mb-6'>
              <h1 className='text-2xl font-bold text-gray-900'>My Reviews</h1>
              <div className='text-sm text-gray-600'>
                {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </div>
            </div>

            <div className='bg-white rounded-lg border border-gray-200 overflow-hidden'>
              <table className='w-full'>
                <thead className='bg-gray-50 border-b border-gray-200'>
                  <tr>
                    <th className='px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider'>
                      Template
                    </th>
                    <th className='px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider'>
                      Rating
                    </th>
                    <th className='px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider'>
                      Comment
                    </th>
                    <th className='px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider'>
                      Date
                    </th>
                    <th className='px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200'>
                  {reviews.map((review) => (
                    <tr
                      key={review._id}
                      className='hover:bg-gray-50 transition'
                    >
                      <td className='px-6 py-4'>
                        <Link
                          href={`/templates/${getTemplateId(review.template)}`}
                          className='font-semibold text-gray-900 hover:text-fuchsia-600 transition'
                        >
                          Template
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
                            href={`/templates/${getTemplateId(review.template)}`}
                            className='inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-fuchsia-600 hover:text-fuchsia-700 transition'
                          >
                            <Edit className='w-4 h-4' />
                            Edit
                          </Link>
                          <button
                            onClick={() =>
                              handleDelete(
                                review._id,
                                getTemplateId(review.template),
                              )
                            }
                            disabled={
                              deletingId === review._id ||
                              deleteReview.isPending
                            }
                            className='inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-gray-400 hover:text-red-600 transition disabled:opacity-50'
                          >
                            <Trash2 className='w-4 h-4' />
                            {deletingId === review._id
                              ? 'Deleting...'
                              : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Help Section */}
            <div className='mt-8 bg-gradient-to-br from-fuchsia-600 via-purple-600 to-cyan-500 rounded-lg p-6 text-white'>
              <h3 className='font-bold mb-2'>Need help with your reviews?</h3>
              <p className='text-white/90 text-sm mb-4'>
                If you have questions about reviewing templates, please check
                our FAQ or contact support.
              </p>
              <div className='flex gap-3'>
                <Link
                  href='/faq'
                  className='inline-flex items-center gap-2 bg-white text-fuchsia-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition text-sm'
                >
                  <FolderOpen className='w-4 h-4' />
                  View FAQ
                </Link>
                <Link
                  href='/contact'
                  className='inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg font-semibold hover:bg-white/30 transition text-sm'
                >
                  <ExternalLink className='w-4 h-4' />
                  Contact Support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
