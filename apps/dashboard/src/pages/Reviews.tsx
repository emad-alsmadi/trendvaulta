import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Trash2 } from 'lucide-react';
import {
  useAdminReviews,
  useDeleteAdminReviewMutation,
} from '../hooks/useAdminReviews';
import { errorMessage, type AdminReview } from '../lib/api';

function productLabel(review: AdminReview) {
  if (review.product && typeof review.product === 'object') {
    return review.product.title || review.product.sku || 'Product';
  }
  return typeof review.product === 'string' ? review.product : '—';
}

function userLabel(review: AdminReview) {
  if (review.user && typeof review.user === 'object') {
    return review.user.email || review.user.username || 'User';
  }
  return typeof review.user === 'string' ? review.user : '—';
}

export default function Reviews() {
  const reviewsQ = useAdminReviews({ limit: 100 });
  const deleteMut = useDeleteAdminReviewMutation();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const list = reviewsQ.data?.data || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => {
      const hay = [
        r.comment,
        String(r.rating),
        productLabel(r),
        userLabel(r),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [reviewsQ.data, search]);

  async function handleDelete(review: AdminReview) {
    const ok = window.confirm('Delete this review permanently?');
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(review._id);
    } catch (err) {
      window.alert(errorMessage(err, 'Could not delete review'));
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Reviews
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Moderate customer product reviews (admin delete).
        </p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by product, user, or comment…"
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {reviewsQ.isLoading && (
        <p className="py-10 text-center text-sm text-gray-500">
          Loading reviews…
        </p>
      )}

      {reviewsQ.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errorMessage(reviewsQ.error, 'Failed to load reviews')}
        </div>
      )}

      {!reviewsQ.isLoading && !reviewsQ.isError && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {['Product', 'User', 'Rating', 'Comment', 'Date', 'Actions'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-gray-500"
                    >
                      No reviews found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((review) => (
                    <tr
                      key={review._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/60"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {productLabel(review)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {userLabel(review)}
                      </td>
                      <td className="px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
                        {review.rating}/5
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {review.comment || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {review.createdAt
                          ? new Date(review.createdAt).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => void handleDelete(review)}
                          disabled={deleteMut.isPending}
                          className="rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40"
                          aria-label="Delete review"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {reviewsQ.data?.meta && (
            <p className="border-t border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-gray-700">
              Showing {filtered.length} of {reviewsQ.data.meta.total} reviews
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
