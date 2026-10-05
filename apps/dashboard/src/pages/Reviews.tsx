import { useState } from 'react';
import {
  Check,
  CornerDownRight,
  EyeOff,
  MessageSquareReply,
  Star,
  Trash2,
} from 'lucide-react';
import {
  useAdminReviews,
  useDeleteAdminReviewMutation,
  useDeleteReviewReplyMutation,
  useModerateReviewMutation,
  useReplyToReviewMutation,
} from '../hooks/useAdminReviews';
import { errorMessage, type AdminReview } from '../lib/api';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { useTableQuery } from '../hooks/useTableQuery';
import { useT } from '../i18n/I18nProvider';
import { PageHeader } from '../components/ui/PageHeader';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import {
  DataTable,
  RowActions,
  type DataTableColumn,
} from '../components/ui/DataTable';
import { FilterBar, FilterBarItem } from '../components/ui/FilterBar';
import { Field, Select, Textarea } from '../components/ui/Field';
import { FormDialog, FormDialogFooter } from '../components/ui/FormDialog';
import { Rating } from '../components/ui/Rating';
import { StatusBadge } from '../components/ui/StatusBadge';

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
  const ratingLabel = (n: number) =>
    t(n === 1 ? 'reviews.starOne' : 'reviews.starMany', { n: formatNumber(n) });
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
  const moderateMut = useModerateReviewMutation();

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

  async function handleModerate(review: AdminReview, status: 'approved' | 'rejected') {
    try {
      await moderateMut.mutateAsync({ id: review._id, status });
      toast.success(
        status === 'approved' ? t('reviews.approved') : t('reviews.rejected'),
      );
    } catch (err) {
      toast.error(errorMessage(err, t('reviews.moderateFailed')));
    }
  }

  const columns: DataTableColumn<AdminReview>[] = [
    {
      key: 'product',
      header: t('reviews.columns.product'),
      className: 'max-w-[14rem]',
      cell: (review) => (
        <span
          className='block truncate font-medium text-foreground'
          dir='auto'
        >
          {productOf(review)}
        </span>
      ),
    },
    {
      key: 'user',
      header: t('reviews.columns.user'),
      className: 'max-w-[14rem]',
      cell: (review) => (
        <span
          className='block truncate text-muted-foreground'
          dir='auto'
        >
          {userOf(review)}
        </span>
      ),
    },
    {
      key: 'rating',
      header: t('reviews.columns.rating'),
      sortable: true,
      cell: (review) => (
        <Rating
          value={review.rating}
          label={ratingLabel(review.rating)}
        />
      ),
    },
    {
      key: 'status',
      header: t('reviews.columns.status'),
      cell: (review) => {
        const status = review.status ?? 'approved';
        return (
          <StatusBadge status={status}>
            {t(`reviews.status.${status}`)}
          </StatusBadge>
        );
      },
    },
    {
      key: 'comment',
      header: t('reviews.columns.comment'),
      className: 'max-w-[22rem]',
      cell: (review) => (
        <>
          <p
            className='truncate'
            dir='auto'
            title={review.comment || undefined}
          >
            {review.comment || '—'}
          </p>
          {review.reply?.text && (
            <p
              className='mt-1 flex items-center gap-1 text-xs text-muted-foreground'
              title={review.reply.text}
            >
              <CornerDownRight
                className='size-3 shrink-0 rtl:-scale-x-100'
                aria-hidden
              />
              <span
                className='truncate'
                dir='auto'
              >
                {review.reply.text}
              </span>
            </p>
          )}
        </>
      ),
    },
    {
      key: 'createdAt',
      header: t('reviews.columns.date'),
      sortable: true,
      className: 'whitespace-nowrap text-muted-foreground',
      cell: (review) => (review.createdAt ? formatDate(review.createdAt) : '—'),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      actions: true,
      cell: (review) => {
        const status = review.status ?? 'approved';
        return (
          <RowActions>
            {can('reviews:write') && status !== 'approved' && (
              <IconButton
                icon={<Check aria-hidden />}
                label={t('reviews.approve')}
                onClick={() => void handleModerate(review, 'approved')}
                disabled={moderateMut.isPending}
              />
            )}
            {can('reviews:write') && status !== 'rejected' && (
              <IconButton
                icon={<EyeOff aria-hidden />}
                label={t('reviews.reject')}
                onClick={() => void handleModerate(review, 'rejected')}
                disabled={moderateMut.isPending}
              />
            )}
            {can('reviews:write') && (
              <IconButton
                icon={
                  <MessageSquareReply
                    className='rtl:-scale-x-100'
                    aria-hidden
                  />
                }
                label={
                  review.reply ? t('reviews.editReply') : t('reviews.replyTo')
                }
                onClick={() => openReply(review)}
                className={review.reply ? 'text-foreground' : undefined}
              />
            )}
            {can('reviews:delete') && (
              <IconButton
                icon={<Trash2 aria-hidden />}
                label={t('reviews.deleteReview')}
                onClick={() => void handleDelete(review)}
                disabled={deleteMut.isPending}
              />
            )}
          </RowActions>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title={t('reviews.title')}
        description={t('reviews.subtitle')}
      />

      {reviewsQ.isError ? (
        <Alert tone='error'>
          {errorMessage(reviewsQ.error, t('reviews.loadFailed'))}
        </Alert>
      ) : (
        <DataTable
          caption={t('reviews.title')}
          data={reviews}
          columns={columns}
          getKey={(review) => review._id}
          loading={reviewsQ.isLoading}
          fetching={reviewsQ.isFetching}
          sort={table.sort}
          order={table.order}
          onSort={table.toggleSort}
          meta={meta}
          onPage={table.setPage}
          onLimit={table.setLimit}
          emptyIcon={<Star aria-hidden />}
          emptyTitle={t('reviews.empty')}
          toolbar={
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                onSubmit: () => {
                  setAppliedQ(search.trim());
                  resetPage();
                },
                placeholder: t('reviews.searchPlaceholder'),
                label: t('reviews.searchLabel'),
                submitLabel: t('common.search'),
              }}
              canClear={Boolean(appliedQ || ratingFilter)}
              onClear={() => {
                setSearch('');
                setAppliedQ('');
                setRatingFilter('');
                resetPage();
              }}
            >
              <FilterBarItem>
                <Select
                  aria-label={t('reviews.filterRating')}
                  value={ratingFilter}
                  onChange={(e) => {
                    setRatingFilter(e.target.value);
                    resetPage();
                  }}
                >
                  <option value=''>{t('reviews.allRatings')}</option>
                  {[5, 4, 3, 2, 1].map((r) => (
                    <option
                      key={r}
                      value={r}
                    >
                      {ratingLabel(r)}
                    </option>
                  ))}
                </Select>
              </FilterBarItem>
            </FilterBar>
          }
        />
      )}

      {replying && (
        <FormDialog
          onClose={() => setReplying(null)}
          title={t('reviews.replyTitle')}
          busy={replyBusy}
        >
          <figure className='mb-5 rounded-badge border border-border bg-muted/60 p-4'>
            <figcaption className='mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground'>
              <Rating
                value={replying.rating}
                label={ratingLabel(replying.rating)}
              />
              <span dir='auto'>{userOf(replying)}</span>
              <span aria-hidden>·</span>
              <span dir='auto'>{productOf(replying)}</span>
            </figcaption>
            <blockquote
              className='whitespace-pre-line text-sm text-foreground'
              dir='auto'
            >
              {replying.comment || '—'}
            </blockquote>
          </figure>
          <form onSubmit={handleSaveReply}>
            <Field
              label={t('reviews.storeReply')}
              hint={
                <>
                  {t('reviews.replyHint')}{' '}
                  <span dir='ltr'>{formatNumber(replyText.length)}/1000</span>
                </>
              }
            >
              <Textarea
                rows={4}
                maxLength={1000}
                value={replyText}
                dir='auto'
                onChange={(e) => setReplyText(e.target.value)}
              />
            </Field>
            <FormDialogFooter>
              {replying.reply && (
                <Button
                  variant='destructive'
                  className='me-auto'
                  disabled={replyBusy}
                  onClick={() => void handleRemoveReply()}
                  icon={<Trash2 aria-hidden />}
                >
                  {t('reviews.removeReply')}
                </Button>
              )}
              <Button
                variant='ghost'
                disabled={replyBusy}
                onClick={() => setReplying(null)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type='submit'
                variant='primary'
                loading={replyMut.isPending}
                disabled={replyBusy}
              >
                {t('reviews.publishReply')}
              </Button>
            </FormDialogFooter>
          </form>
        </FormDialog>
      )}
    </>
  );
}
