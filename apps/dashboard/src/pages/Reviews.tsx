import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquareReply, Trash2 } from 'lucide-react';
// @ts-ignore
import { DataTable } from 'primereact/datatable';
// @ts-ignore
import { Column } from 'primereact/column';
// @ts-ignore
import { InputText } from 'primereact/inputtext';
// @ts-ignore
import { Dropdown } from 'primereact/dropdown';
// @ts-ignore
import { Button } from 'primereact/button';
// @ts-ignore
import { Dialog } from 'primereact/dialog';
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
import { useT } from '../i18n/I18nProvider';
import { PageHeader } from '../components/ui/PageHeader';

// @ts-ignore - PrimeReact types are bundled
const ColumnWrapper = Column as any;
// @ts-ignore - PrimeReact types are bundled
const DropdownWrapper = Dropdown as any;
// @ts-ignore - PrimeReact types are bundled
const DataTableWrapper = DataTable as any;
// @ts-ignore - PrimeReact types are bundled
const InputTextWrapper = InputText as any;
// @ts-ignore - PrimeReact types are bundled
const DialogWrapper = Dialog as any;

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
  const productOf = (r: AdminReview) =>
    productLabel(r, t('reviews.productFallback'));
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
      toast.success(
        replying.reply
          ? t('reviews.replyUpdated')
          : t('reviews.replyPublished'),
      );
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
    const ok = await confirm({
      message: t('reviews.confirmDelete'),
      danger: true,
      confirmLabel: t('common.delete'),
    });
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
      <PageHeader
        title={t('reviews.title')}
        description={t('reviews.subtitle')}
      />

      <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-end'>
        <InputTextWrapper
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
          placeholder={t('reviews.searchPlaceholder')}
          className='w-full sm:w-64'
        />
        <DropdownWrapper
          value={ratingFilter}
          options={[5, 4, 3, 2, 1].map((r) => ({
            label: t(r === 1 ? 'reviews.starOne' : 'reviews.starMany', {
              n: formatNumber(r),
            }),
            value: r,
          }))}
          onChange={(e) => {
            setRatingFilter(e.value);
            resetPage();
          }}
          placeholder={t('reviews.filterRating')}
          className='w-full sm:w-40'
          showClear
        />
        <Button
          label={t('reviews.searchLabel')}
          onClick={() => {
            setAppliedQ(search.trim());
            resetPage();
          }}
          className='w-full sm:w-auto'
        />
        {(appliedQ || ratingFilter) && (
          <Button
            label='Clear'
            onClick={() => {
              setSearch('');
              setAppliedQ('');
              setRatingFilter('');
              resetPage();
            }}
            severity='secondary'
            className='w-full sm:w-auto'
          />
        )}
      </div>

      {reviewsQ.isLoading && (
        <p className='py-10 text-center text-sm text-gray-500'>
          {t('reviews.loading')}
        </p>
      )}

      {reviewsQ.isError && (
        <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'>
          {errorMessage(reviewsQ.error, t('reviews.loadFailed'))}
        </div>
      )}

      {!reviewsQ.isLoading && !reviewsQ.isError && (
        <div className='rounded-xl border border-gray-200 bg-card shadow-sm dark:border-gray-700 dark:bg-gray-800'>
          <DataTableWrapper
            value={reviews}
            paginator
            rows={25}
            totalRecords={meta?.total}
            lazy
            onPage={table.setPage}
            first={(meta?.page ? meta.page - 1 : 0) * 25}
            loading={reviewsQ.isFetching}
            emptyMessage={t('reviews.empty')}
            sortField={table.sort}
            sortOrder={table.order === 'asc' ? 1 : -1}
            onSort={table.toggleSort}
            className='p-datatable-sm'
          >
            <ColumnWrapper
              header={t('reviews.columns.product')}
              body={(review: any) => productOf(review)}
            />
            <ColumnWrapper
              header={t('reviews.columns.user')}
              body={(review: any) => userOf(review)}
            />
            <ColumnWrapper
              field='rating'
              header={t('reviews.columns.rating')}
              sortable
              body={(review: any) => (
                <span dir='ltr'>{formatNumber(review.rating)}/5</span>
              )}
            />
            <ColumnWrapper
              header={t('reviews.columns.comment')}
              body={(review: any) => (
                <div>
                  <p className='truncate' dir='auto'>
                    {review.comment || '—'}
                  </p>
                  {review.reply?.text && (
                    <p
                      className='mt-0.5 truncate text-xs text-primary'
                      title={review.reply.text}
                    >
                      {t('reviews.replied', { text: review.reply.text })}
                    </p>
                  )}
                </div>
              )}
            />
            <ColumnWrapper
              field='createdAt'
              header={t('reviews.columns.date')}
              sortable
              body={(review: any) =>
                review.createdAt ? formatDate(review.createdAt) : '—'
              }
            />
            <ColumnWrapper
              header={t('common.actions')}
              body={(review: any) => (
                <div className='flex items-center gap-1'>
                  {can('reviews:write') && (
                    <button
                      type='button'
                      onClick={() => openReply(review)}
                      className='rounded p-1.5 hover:bg-accent transition-colors duration-200'
                      aria-label={
                        review.reply
                          ? t('reviews.editReply')
                          : t('reviews.replyTo')
                      }
                      title={
                        review.reply
                          ? t('reviews.editReply')
                          : t('reviews.reply')
                      }
                    >
                      <MessageSquareReply
                        className={`icon-sm rtl:-scale-x-100 ${review.reply ? 'text-primary' : 'text-muted-foreground'}`}
                        aria-hidden
                      />
                    </button>
                  )}
                  {can('reviews:delete') && (
                    <button
                      type='button'
                      onClick={() => void handleDelete(review)}
                      disabled={deleteMut.isPending}
                      className='rounded p-1.5 hover:bg-destructive/10 transition-colors duration-200'
                      aria-label={t('reviews.deleteReview')}
                    >
                      <Trash2
                        className='icon-sm text-muted-foreground hover:text-destructive transition-colors duration-200'
                        aria-hidden
                      />
                    </button>
                  )}
                </div>
              )}
            />
          </DataTable>
        </div>
      )}

      <DialogWrapper
        visible={!!replying}
        onHide={() => setReplying(null)}
        header={t('reviews.replyTitle')}
        modal
        className='w-full max-w-lg'
      >
          title={replying.reply ? t('reviews.editReply') : t('reviews.replyTo')}
          busy={replyBusy}
          maxWidthClass='max-w-lg'
        >
          <blockquote className='mb-4 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900'>
            <p className='mb-1 text-xs text-gray-500'>
              {userOf(replying)} · {productOf(replying)} ·{' '}
              <span
                className='text-amber-600 dark:text-amber-400'
                dir='ltr'
              >
                {formatNumber(replying.rating)}/5
              </span>
            </p>
            <p
              className='whitespace-pre-line text-gray-800 dark:text-gray-200'
              dir='auto'
            >
              {replying.comment || '—'}
            </p>
          </blockquote>
          <form
            onSubmit={handleSaveReply}
            className='space-y-3'
          >
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('reviews.storeReply')}
              </span>
              <textarea
                rows={4}
                maxLength={1000}
                value={replyText}
                dir='auto'
                onChange={(e) => setReplyText(e.target.value)}
                aria-describedby='reply-help'
                className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              />
              <span
                id='reply-help'
                className='mt-1 block text-xs text-gray-500 dark:text-gray-400'
              >
                {t('reviews.replyHint')}{' '}
                <span dir='ltr'>{formatNumber(replyText.length)}/1000</span>
              </span>
            </label>
            <div className='flex flex-wrap items-center justify-between gap-2 pt-2'>
              {replying.reply ? (
                <Button
                  type='button'
                  disabled={replyBusy}
                  onClick={() => void handleRemoveReply()}
                  severity='danger'
                  label={t('reviews.removeReply')}
                />
              ) : (
                <span />
              )}
              <div className='flex gap-2'>
                <Button
                  type='button'
                  disabled={replyBusy}
                  onClick={() => setReplying(null)}
                  severity='secondary'
                  label={t('common.cancel')}
                />
                <Button
                  type='submit'
                  disabled={replyBusy}
                  label={
                    replyMut.isPending
                      ? t('common.saving')
                      : t('reviews.publishReply')
                  }
                />
              </div>
            </div>
            </form>
          </DialogWrapper>
      )}
    </motion.div>
  );
}
