import { useState } from 'react';
import {
  Check,
  MessageCircle,
  MessageSquare,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Undo2,
} from 'lucide-react';
import {
  useAdminProductQA,
  useAnswerProductQAMutation,
  useDeleteProductQAMutation,
} from '../hooks/useAdminProductQA';
import {
  errorMessage,
  type AdminProductQA,
  type ProductQAAnswerPayload,
} from '../lib/api';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { useTableQuery, type SortOrder } from '../hooks/useTableQuery';
import { TablePagination } from '../components/ui/TablePagination';
import { FormDialog, FormDialogFooter } from '../components/ui/FormDialog';
import { useT } from '../i18n/I18nProvider';
import { PageHeader } from '../components/ui/PageHeader';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { FilterBar, FilterBarItem } from '../components/ui/FilterBar';
import { Field, Select, Switch, Textarea } from '../components/ui/Field';
import { StatusBadge } from '../components/ui/StatusBadge';

export default function ProductQA() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, formatNumber } = useT();
  const table = useTableQuery({ limit: 25, sort: 'createdAt', order: 'desc' });
  const { resetPage } = table;
  const [search, setSearch] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [filterApproved, setFilterApproved] = useState<string>('');
  const [editing, setEditing] = useState<AdminProductQA | null>(null);
  const [answer, setAnswer] = useState('');

  // Search, approval filter, sort and paging all run server-side
  // (GET /qa/admin), so they cover every question, not just one page.
  const qaQ = useAdminProductQA({
    ...table.params,
    q: appliedQ || undefined,
    approved:
      filterApproved === 'approved'
        ? 'true'
        : filterApproved === 'pending'
          ? 'false'
          : undefined,
  });
  const answerMut = useAnswerProductQAMutation();
  const deleteMut = useDeleteProductQAMutation();

  const saving = answerMut.isPending;

  const items = qaQ.data?.data || [];
  const meta = qaQ.data?.meta;
  const filtered =
    Boolean(appliedQ || filterApproved) ||
    table.sort !== 'createdAt' ||
    table.order !== 'desc';

  function openEdit(qa: AdminProductQA) {
    setEditing(qa);
    setAnswer(qa.answer || '');
  }

  function closeEdit() {
    setEditing(null);
    setAnswer('');
  }

  async function handleApprove(qa: AdminProductQA, approved: boolean) {
    const payload: ProductQAAnswerPayload = { approved };
    if (!qa.answer && approved) {
      toast.error(t('productQa.needAnswer'));
      return;
    }
    try {
      await answerMut.mutateAsync({ id: qa._id, payload });
    } catch (err) {
      toast.error(errorMessage(err, t('productQa.updateFailed')));
    }
  }

  async function handleSaveAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const payload: ProductQAAnswerPayload = {
      answer: answer.trim(),
      approved: editing.approved,
    };
    try {
      await answerMut.mutateAsync({ id: editing._id, payload });
      closeEdit();
    } catch (err) {
      toast.error(errorMessage(err, t('productQa.saveFailed')));
    }
  }

  async function handleDelete(qa: AdminProductQA) {
    const ok = await confirm({
      message: t('productQa.confirmDelete'),
      danger: true,
      confirmLabel: t('common.delete'),
    });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(qa._id);
    } catch (err) {
      toast.error(errorMessage(err, t('productQa.deleteFailed')));
    }
  }

  return (
    <>
      <PageHeader
        title={t('productQa.title')}
        description={t('productQa.subtitle')}
      />

      <Card className='mb-4 p-3 sm:p-4'>
        <FilterBar
          search={{
            value: search,
            onChange: setSearch,
            onSubmit: () => {
              setAppliedQ(search.trim());
              resetPage();
            },
            placeholder: t('productQa.searchPlaceholder'),
            label: t('productQa.searchLabel'),
            submitLabel: t('common.search'),
          }}
          canClear={filtered}
          onClear={() => {
            setSearch('');
            setAppliedQ('');
            setFilterApproved('');
            table.setSort('createdAt', 'desc');
          }}
        >
          <FilterBarItem>
            <Select
              value={filterApproved}
              onChange={(e) => {
                setFilterApproved(e.target.value);
                resetPage();
              }}
              aria-label={t('productQa.filterStatus')}
            >
              <option value=''>{t('productQa.all')}</option>
              <option value='pending'>{t('productQa.pending')}</option>
              <option value='approved'>{t('productQa.approved')}</option>
            </Select>
          </FilterBarItem>
          <FilterBarItem>
            <Select
              value={`${table.sort}:${table.order}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split(':');
                table.setSort(field, order as SortOrder);
              }}
              aria-label={t('productQa.sortLabel')}
            >
              <option value='createdAt:desc'>{t('productQa.newest')}</option>
              <option value='createdAt:asc'>{t('productQa.oldest')}</option>
              <option value='helpful:desc'>{t('productQa.mostHelpful')}</option>
            </Select>
          </FilterBarItem>
        </FilterBar>
      </Card>

      {qaQ.isError ? (
        <Alert tone='error'>
          {errorMessage(qaQ.error, t('productQa.loadFailed'))}
        </Alert>
      ) : qaQ.isLoading ? (
        <div className='space-y-3'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Card
              key={i}
              className='space-y-3'
            >
              <Skeleton className='w-1/4' />
              <Skeleton className='w-3/4' />
              <Skeleton className='w-1/2' />
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<MessageCircle aria-hidden />}
            title={t('productQa.empty')}
          />
        </Card>
      ) : (
        <div
          className='space-y-3'
          aria-busy={qaQ.isFetching || undefined}
        >
          {items.map((qa) => (
            <Card
              key={qa._id}
              as='article'
              className='p-5'
            >
              <div className='flex items-start gap-4'>
                <div className='min-w-0 flex-1 space-y-3'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <StatusBadge status={qa.approved ? 'approved' : 'pending'}>
                      {qa.approved
                        ? t('productQa.approved')
                        : t('productQa.pending')}
                    </StatusBadge>
                    <span
                      className='truncate text-body-sm text-muted-foreground'
                      dir='auto'
                    >
                      {/* Products are hard-deleted — product can be null. */}
                      {qa.product?.title || t('productQa.deletedProduct')}
                    </span>
                  </div>

                  <div className='flex gap-3'>
                    <span
                      aria-hidden
                      className='flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground'
                    >
                      Q
                    </span>
                    <p className='pt-0.5 font-medium text-foreground'>
                      <bdi>{qa.question}</bdi>
                    </p>
                  </div>
                  {qa.answer && (
                    <div className='flex gap-3'>
                      <span
                        aria-hidden
                        className='flex size-6 shrink-0 items-center justify-center rounded-full border border-border-strong text-xs font-bold text-foreground'
                      >
                        A
                      </span>
                      <p className='pt-0.5 text-foreground/80'>
                        <bdi>{qa.answer}</bdi>
                      </p>
                    </div>
                  )}

                  <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground'>
                    <span>
                      {t('productQa.askedBy', {
                        name: qa.askedBy?.username || t('productQa.anonymous'),
                      })}
                    </span>
                    {qa.answeredBy && (
                      <span>
                        {t('productQa.answeredBy', {
                          name:
                            qa.answeredBy?.username || t('productQa.anonymous'),
                        })}
                      </span>
                    )}
                    <span
                      className='inline-flex items-center gap-1 tabular-nums'
                      title={t('productQa.helpful', {
                        count: formatNumber(qa.helpful),
                      })}
                    >
                      <ThumbsUp
                        className='size-3.5'
                        aria-hidden
                      />
                      <span className='sr-only'>
                        {t('productQa.helpful', { count: '' })}
                      </span>
                      {formatNumber(qa.helpful)}
                    </span>
                    <span
                      className='inline-flex items-center gap-1 tabular-nums'
                      title={t('productQa.notHelpful', {
                        count: formatNumber(qa.notHelpful),
                      })}
                    >
                      <ThumbsDown
                        className='size-3.5'
                        aria-hidden
                      />
                      <span className='sr-only'>
                        {t('productQa.notHelpful', { count: '' })}
                      </span>
                      {formatNumber(qa.notHelpful)}
                    </span>
                  </div>
                </div>

                <div className='flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center'>
                  {can('content:write') &&
                    (qa.approved ? (
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => void handleApprove(qa, false)}
                        disabled={saving}
                        icon={<Undo2 aria-hidden />}
                      >
                        {t('productQa.unapprove')}
                      </Button>
                    ) : (
                      <Button
                        size='sm'
                        variant='primary'
                        onClick={() => void handleApprove(qa, true)}
                        disabled={saving}
                        icon={<Check aria-hidden />}
                      >
                        {t('productQa.approve')}
                      </Button>
                    ))}
                  <div className='flex items-center gap-0.5'>
                    {can('content:write') && (
                      <IconButton
                        icon={<MessageSquare aria-hidden />}
                        label={t('productQa.editAnswer')}
                        onClick={() => openEdit(qa)}
                      />
                    )}
                    {can('content:delete') && (
                      <IconButton
                        icon={<Trash2 aria-hidden />}
                        label={t('common.delete')}
                        onClick={() => void handleDelete(qa)}
                        disabled={deleteMut.isPending}
                      />
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
          <TablePagination
            meta={meta}
            busy={qaQ.isFetching}
            onPage={table.setPage}
            onLimit={table.setLimit}
            className='pt-2'
          />
        </div>
      )}

      {editing && (
        <FormDialog
          onClose={closeEdit}
          title={t('productQa.form.title')}
          description={editing.product?.title || t('productQa.deletedProduct')}
          busy={saving}
        >
          <form onSubmit={handleSaveAnswer}>
            <div className='mb-5 flex gap-3 rounded-badge border border-border bg-muted/60 p-4'>
              <span
                aria-hidden
                className='flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground'
              >
                Q
              </span>
              <p className='pt-0.5 font-medium text-foreground'>
                <bdi>{editing.question}</bdi>
              </p>
            </div>
            <div className='space-y-4'>
              <Field label={t('productQa.form.answer')}>
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={4}
                  placeholder={t('productQa.form.placeholder')}
                  dir='auto'
                />
              </Field>
              <Switch
                checked={editing.approved}
                onCheckedChange={(approved) => {
                  // Keep local state in sync so the switch reflects the
                  // change and Save doesn't send a stale `approved`.
                  setEditing((prev) => (prev ? { ...prev, approved } : prev));
                  const payload: ProductQAAnswerPayload = { approved };
                  void answerMut.mutateAsync({ id: editing._id, payload });
                }}
                disabled={saving}
                label={t('productQa.form.approve')}
              />
            </div>
            <FormDialogFooter>
              <Button
                variant='ghost'
                disabled={saving}
                onClick={closeEdit}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type='submit'
                variant='primary'
                loading={saving}
              >
                {t('productQa.form.save')}
              </Button>
            </FormDialogFooter>
          </form>
        </FormDialog>
      )}
    </>
  );
}
