import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquareReply, Search, Trash2 } from 'lucide-react';
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
import { FormDialog } from '../components/ui/FormDialog';
import { useT } from '../i18n/I18nProvider';

function productLabel(review: AdminReview, fallback: string) {
  if (review.product && typeof review.product === 'object') {
    return review.product.title || review.product.sku || fallback;
  }
  return typeof review.product === 'string' ? review.product : '—';
}

function userLabel(review: AdminReview, fallback: string) {
  if (review.user && typeof review.user === 'object') {
    return review.user.email || review.user.username || fallback;
  }
  return typeof review.user === 'string' ? review.user : '—';
}

export default function Reviews() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, formatDate, formatNumber } = useT();
  const productOf = (r: AdminReview) => productLabel(r, t('reviews.productFallback'));
  const userOf = (r: AdminReview) => userLabel(r, t('reviews.userFallback'));
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
      toast.error(t('reviews.replyTooShort'));
      return;
    }
    try {
      await replyMut.mutateAsync({ id: replying._id, text });
      toast.success(replying.reply ? t('reviews.replyUpdated') : t('reviews.replyPublished'));
      setReplying(null);
    } catch (err) {
      toast.error(errorMessage(err, t('reviews.replyFailed')));
    }
  }

  async function handleRemoveReply() {
    if (!replying) return;
    const ok = await confirm({
      message: t('reviews.confirmRemoveReply'),
      danger: true,
      confirmLabel: t('reviews.remove'),
    });
    if (!ok) return;
    try {
      await deleteReplyMut.mutateAsync(replying._id);
      toast.success(t('reviews.replyRemoved'));
      setReplying(null);
    } catch (err) {
      toast.error(errorMessage(err, t('reviews.removeFailed')));
    }
  }

  async function handleDelete(review: AdminReview) {
    const ok = await confirm({ message: t('reviews.confirmDelete'), danger: true, confirmLabel: t('common.delete') });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(review._id);
    } catch (err) {
      toast.error(errorMessage(err, t('reviews.deleteFailed')));
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
          {t('reviews.title')}
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {t('reviews.subtitle')}
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
          <Search className="absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="search"
            aria-label={t('reviews.searchLabel')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('reviews.searchPlaceholder')}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 ps-10 pe-4 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </form>
        <select
          value={ratingFilter}
          onChange={(e) => {
            setRatingFilter(e.target.value);
            resetPage();
          }}
          aria-label={t('reviews.filterRating')}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="">{t('reviews.allRatings')}</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {t(r === 1 ? 'reviews.starOne' : 'reviews.starMany', { n: formatNumber(r) })}
            </option>
          ))}
        </select>
      </div>

      {reviewsQ.isLoading && (
        <p className="py-10 text-center text-sm text-gray-500">
          {t('reviews.loading')}
        </p>
      )}

      {reviewsQ.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errorMessage(reviewsQ.error, t('reviews.loadFailed'))}
        </div>
      )}

      {!reviewsQ.isLoading && !reviewsQ.isError && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider dark:bg-gray-700">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-start [&>th]:font-medium [&>th]:text-gray-500 dark:[&>th]:text-gray-300">
                  <th scope="col">{t('reviews.columns.product')}</th>
                  <th scope="col">{t('reviews.columns.user')}</th>
                  <SortableHeader
                    field="rating"
                    active={table.sort}
                    order={table.order}
                    onSort={table.toggleSort}
                  >
                    {t('reviews.columns.rating')}
                  </SortableHeader>
                  <th scope="col">{t('reviews.columns.comment')}</th>
                  <SortableHeader
                    field="createdAt"
                    active={table.sort}
                    order={table.order}
                    onSort={table.toggleSort}
                  >
                    {t('reviews.columns.date')}
                  </SortableHeader>
                  <th scope="col">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {reviews.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-gray-500"
                    >
                      {t('reviews.empty')}
                    </td>
                  </tr>
                ) : (
                  reviews.map((review) => (
                    <tr
                      key={review._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/60"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {productOf(review)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {userOf(review)}
                      </td>
                      <td className="px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
                        <span dir="ltr">{formatNumber(review.rating)}/5</span>
                      </td>
                      <td className="max-w-xs px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        <p className="truncate" dir="auto">{review.comment || '—'}</p>
                        {review.reply?.text && (
                          <p
                            className="mt-0.5 truncate text-xs text-blue-600 dark:text-blue-400"
                            title={review.reply.text}
                          >
                            {t('reviews.replied', { text: review.reply.text })}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {review.createdAt ? formatDate(review.createdAt) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                        {can('reviews:write') && (
                          <button
                            type="button"
                            onClick={() => openReply(review)}
                            className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                            aria-label={review.reply ? t('reviews.editReply') : t('reviews.replyTo')}
                            title={review.reply ? t('reviews.editReply') : t('reviews.reply')}
                          >
                            <MessageSquareReply
                              className={`h-4 w-4 rtl:-scale-x-100 ${review.reply ? 'text-blue-500' : 'text-gray-500'}`}
                              aria-hidden
                            />
                          </button>
                        )}
                        {can('reviews:delete') && (
                          <button
                            type="button"
                            onClick={() => void handleDelete(review)}
                            disabled={deleteMut.isPending}
                            className="rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40"
                            aria-label={t('reviews.deleteReview')}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" aria-hidden />
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
        <FormDialog
          onClose={() => setReplying(null)}
          title={replying.reply ? t('reviews.editReply') : t('reviews.replyTo')}
          busy={replyBusy}
          maxWidthClass="max-w-lg"
        >
          <blockquote className="mb-4 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900">
            <p className="mb-1 text-xs text-gray-500">
              {userOf(replying)} · {productOf(replying)} ·{' '}
              <span className="text-amber-600 dark:text-amber-400" dir="ltr">
                {formatNumber(replying.rating)}/5
              </span>
            </p>
            <p className="whitespace-pre-line text-gray-800 dark:text-gray-200" dir="auto">
              {replying.comment || '—'}
            </p>
          </blockquote>
          <form onSubmit={handleSaveReply} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                {t('reviews.storeReply')}
              </span>
              <textarea
                rows={4}
                maxLength={1000}
                value={replyText}
                dir="auto"
                onChange={(e) => setReplyText(e.target.value)}
                aria-describedby="reply-help"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
              <span id="reply-help" className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                {t('reviews.replyHint')}{' '}
                <span dir="ltr">{formatNumber(replyText.length)}/1000</span>
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
                  {t('reviews.removeReply')}
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
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={replyBusy}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60"
                >
                  {replyMut.isPending ? t('common.saving') : t('reviews.publishReply')}
                </button>
              </div>
            </div>
          </form>
        </FormDialog>
      )}
    </motion.div>
  );
}
