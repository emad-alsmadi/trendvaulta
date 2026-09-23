import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquareReply, Search, Trash2, X } from 'lucide-react';
import {
  useAdminReviews,
  useDeleteAdminReviewMutation,
  useDeleteReviewReplyMutation,
  useReplyToReviewMutation,
} from '../hooks/useAdminReviews';
import { errorMessage, type AdminReview } from '../lib/api';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { useTableQuery } from '../hooks/useTableQuery';
import { SortableHeader } from '../components/ui/SortableHeader';
import { TablePagination } from '../components/ui/TablePagination';

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
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const table = useTableQuery({ limit: 25, sort: 'createdAt', order: 'desc' });
  const { resetPage } = table;
  const [search, setSearch] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');

  const reviewsQ = useAdminReviews({
    ...table.params,
    q: appliedQ || undefined,
    rating: ratingFilter ? Number(ratingFilter) : undefined,
  });
  const deleteMut = useDeleteAdminReviewMutation();

  const reviews = reviewsQ.data?.data || [];
  const meta = reviewsQ.data?.meta;

  const replyMut = useReplyToReviewMutation();
  const deleteReplyMut = useDeleteReviewReplyMutation();
  const [replying, setReplying] = useState<AdminReview | null>(null);
  const [replyText, setReplyText] = useState('');
  const replyBusy = replyMut.isPending || deleteReplyMut.isPending;

  function openReply(review: AdminReview) {
    setReplying(review);
    setReplyText(review.reply?.text || '');
  }

  async function handleSaveReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replying) return;
    const text = replyText.trim();
    if (text.length < 2) {
      toast.error('Write a reply of at least 2 characters.');
      return;
    }
    try {
      await replyMut.mutateAsync({ id: replying._id, text });
      toast.success(replying.reply ? 'Reply updated' : 'Reply published');
      setReplying(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save reply'));
    }
  }

  async function handleRemoveReply() {
    if (!replying) return;
    const ok = await confirm({
      message: 'Remove the store reply from this review?',
      danger: true,
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    try {
      await deleteReplyMut.mutateAsync(replying._id);
      toast.success('Reply removed');
      setReplying(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not remove reply'));
    }
  }

  async function handleDelete(review: AdminReview) {
    const ok = await confirm({ message: 'Delete this review permanently?', danger: true, confirmLabel: 'Delete' });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(review._id);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete review'));
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

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setAppliedQ(search.trim());
            resetPage();
          }}
        >
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search review comments…"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </form>
        <select
          value={ratingFilter}
          onChange={(e) => {
            setRatingFilter(e.target.value);
            resetPage();
          }}
          aria-label="Filter by rating"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="">All ratings</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {r} star{r === 1 ? '' : 's'}
            </option>
          ))}
        </select>
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
              <thead className="bg-gray-50 text-xs uppercase tracking-wider dark:bg-gray-700">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-medium [&>th]:text-gray-500 dark:[&>th]:text-gray-300">
                  <th scope="col">Product</th>
                  <th scope="col">User</th>
                  <SortableHeader
                    field="rating"
                    active={table.sort}
                    order={table.order}
                    onSort={table.toggleSort}
                  >
                    Rating
                  </SortableHeader>
                  <th scope="col">Comment</th>
                  <SortableHeader
                    field="createdAt"
                    active={table.sort}
                    order={table.order}
                    onSort={table.toggleSort}
                  >
                    Date
                  </SortableHeader>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {reviews.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-gray-500"
                    >
                      No reviews found.
                    </td>
                  </tr>
                ) : (
                  reviews.map((review) => (
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
                      <td className="max-w-xs px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        <p className="truncate">{review.comment || '—'}</p>
                        {review.reply?.text && (
                          <p
                            className="mt-0.5 truncate text-xs text-blue-600 dark:text-blue-400"
                            title={review.reply.text}
                          >
                            ↳ Replied: {review.reply.text}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {review.createdAt
                          ? new Date(review.createdAt).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                        {can('reviews:write') && (
                          <button
                            type="button"
                            onClick={() => openReply(review)}
                            className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                            aria-label={review.reply ? 'Edit reply' : 'Reply to review'}
                            title={review.reply ? 'Edit reply' : 'Reply'}
                          >
                            <MessageSquareReply
                              className={`h-4 w-4 ${review.reply ? 'text-blue-500' : 'text-gray-500'}`}
                            />
                          </button>
                        )}
                        {can('reviews:delete') && (
                          <button
                            type="button"
                            onClick={() => void handleDelete(review)}
                            disabled={deleteMut.isPending}
                            className="rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40"
                            aria-label="Delete review"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            meta={meta}
            busy={reviewsQ.isFetching}
            onPage={table.setPage}
            onLimit={table.setLimit}
          />
        </div>
      )}

      {replying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800"
            role="dialog"
            aria-modal="true"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {replying.reply ? 'Edit reply' : 'Reply to review'}
              </h2>
              <button
                type="button"
                disabled={replyBusy}
                onClick={() => setReplying(null)}
                className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <blockquote className="mb-4 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900">
              <p className="mb-1 text-xs text-gray-500">
                {userLabel(replying)} · {productLabel(replying)} ·{' '}
                <span className="text-amber-600 dark:text-amber-400">
                  {replying.rating}/5
                </span>
              </p>
              <p className="whitespace-pre-line text-gray-800 dark:text-gray-200">
                {replying.comment || '—'}
              </p>
            </blockquote>
            <form onSubmit={handleSaveReply} className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                  Store reply
                </span>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  aria-describedby="reply-help"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
                <span id="reply-help" className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                  Shown publicly under the review, signed as the store.{' '}
                  {replyText.length}/1000
                </span>
              </label>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                {replying.reply ? (
                  <button
                    type="button"
                    disabled={replyBusy}
                    onClick={() => void handleRemoveReply()}
                    className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    Remove reply
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={replyBusy}
                    onClick={() => setReplying(null)}
                    className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={replyBusy}
                    className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60"
                  >
                    {replyMut.isPending ? 'Saving…' : 'Publish reply'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
