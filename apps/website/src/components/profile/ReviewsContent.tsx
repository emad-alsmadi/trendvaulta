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
import { useState } from 'react';

export default function ReviewsContent() {
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
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        Failed to load reviews
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No reviews yet</h2>
        <p className="text-gray-600">
          Start reviewing templates you've purchased to share your experience with others.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
        <div className="text-sm text-gray-600">
          {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                Template
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                Rating
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                Comment
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {reviews.map((review) => (
              <tr key={review._id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4">
                  <a
                    href={`/templates/${getTemplateId(review.template)}`}
                    className="font-semibold text-gray-900 hover:text-fuchsia-600 transition"
                  >
                    Template
                  </a>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    {renderStars(review.rating)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-xs text-sm text-gray-600 line-clamp-2">
                    {review.comment}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(review.createdAt)}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <a
                      href={`/templates/${getTemplateId(review.template)}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-fuchsia-600 hover:text-fuchsia-700 transition"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </a>
                    <button
                      onClick={() =>
                        handleDelete(review._id, getTemplateId(review.template))
                      }
                      disabled={
                        deletingId === review._id || deleteReview.isPending
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-gray-400 hover:text-red-600 transition disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deletingId === review._id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 rounded-lg p-6 text-white">
        <h3 className="font-bold mb-2">Need help with your reviews?</h3>
        <p className="text-white/90 text-sm mb-4">
          If you have questions about reviewing templates, please check our FAQ or contact support.
        </p>
        <div className="flex gap-3">
          <a
            href="/faq"
            className="inline-flex items-center gap-2 bg-white text-fuchsia-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition text-sm"
          >
            <FolderOpen className="w-4 h-4" />
            View FAQ
          </a>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg font-semibold hover:bg-white/30 transition text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
