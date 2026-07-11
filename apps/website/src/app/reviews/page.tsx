'use client';

import { useMyReviews, useDeleteReview } from '@/hooks/reviews/reviewsQuery';
import { Review } from '@/types';
import { Star, Trash2, Edit, Calendar, MessageSquare, FileText } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function ReviewsPage() {
  const { data: reviews, isLoading, error } = useMyReviews();
  const deleteReview = useDeleteReview();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (reviewId: string) => {
    if (confirm('Are you sure you want to delete this review?')) {
      setDeletingId(reviewId);
      try {
        await deleteReview.mutateAsync(reviewId);
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'
        }`}
      />
    ));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">My Reviews</h1>
          <div className="text-white">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">My Reviews</h1>
          <div className="text-red-400">Failed to load reviews</div>
        </div>
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">My Reviews</h1>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 text-center">
            <MessageSquare className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h2 className="text-xl text-white mb-2">No reviews yet</h2>
            <p className="text-gray-300">
              Start reviewing templates you've purchased to share your experience with others.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">My Reviews</h1>
          <div className="text-purple-300 text-sm">
            {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          </div>
        </div>

        <div className="grid gap-6">
          {reviews.map((review) => (
            <div
              key={review._id}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:border-purple-500/50 transition-all"
            >
              <div className="flex flex-col md:flex-row gap-6">
                {/* Template Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        Template Review
                      </h3>
                      <div className="flex items-center gap-1 mb-2">
                        {renderStars(review.rating)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(review.createdAt)}</span>
                    </div>
                  </div>

                  {/* Comment */}
                  <div className="bg-white/5 rounded-xl p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-200 leading-relaxed">{review.comment}</p>
                    </div>
                  </div>

                  {/* Template Link */}
                  <Link
                    href={`/templates/${review.template}`}
                    className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors text-sm font-medium"
                  >
                    <FileText className="w-4 h-4" />
                    View Template
                  </Link>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 justify-center md:w-32">
                  <Link
                    href={`/templates/${review.template}`}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-all text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Link>

                  <button
                    onClick={() => handleDelete(review._id)}
                    disabled={deletingId === review._id || deleteReview.isPending}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    {deletingId === review._id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
