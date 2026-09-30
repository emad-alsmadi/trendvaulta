import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, MessageSquare, Search } from 'lucide-react';
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
import { FormDialog } from '../components/ui/FormDialog';
import { useT } from '../i18n/I18nProvider';

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

  async function handleSaveAnswer() {
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
            {t('productQa.title')}
          </h1>
          <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
            {t('productQa.subtitle')}
          </p>
        </div>
      </div>

      <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-center'>
        <form
          className='relative flex-1'
          onSubmit={(e) => {
            e.preventDefault();
            setAppliedQ(search.trim());
            resetPage();
          }}
        >
          <Search
            className='absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400'
            aria-hidden
          />
          <input
            type='search'
            aria-label={t('productQa.searchLabel')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('productQa.searchPlaceholder')}
            className='w-full rounded-lg border border-gray-300 bg-white py-2 ps-10 pe-4 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
          />
        </form>
        <select
          value={filterApproved}
          onChange={(e) => {
            setFilterApproved(e.target.value);
            resetPage();
          }}
          aria-label={t('productQa.filterStatus')}
          className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
        >
          <option value=''>{t('productQa.all')}</option>
          <option value='pending'>{t('productQa.pending')}</option>
          <option value='approved'>{t('productQa.approved')}</option>
        </select>
        <select
          value={`${table.sort}:${table.order}`}
          onChange={(e) => {
            const [field, order] = e.target.value.split(':');
            table.setSort(field, order as SortOrder);
          }}
          aria-label={t('productQa.sortLabel')}
          className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
        >
          <option value='createdAt:desc'>{t('productQa.newest')}</option>
          <option value='createdAt:asc'>{t('productQa.oldest')}</option>
          <option value='helpful:desc'>{t('productQa.mostHelpful')}</option>
        </select>
      </div>

      {qaQ.isLoading && (
        <p className='py-10 text-center text-sm text-gray-500'>
          {t('productQa.loading')}
        </p>
      )}

      {qaQ.isError && (
        <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'>
          {errorMessage(qaQ.error, t('productQa.loadFailed'))}
        </div>
      )}

      {!qaQ.isLoading && !qaQ.isError && (
        <div className='space-y-4'>
          {items.length === 0 ? (
            <p className='py-10 text-center text-sm text-gray-500'>
              {t('productQa.empty')}
            </p>
          ) : (
            items.map((qa) => (
              <div
                key={qa._id}
                className='rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800'
              >
                <div className='mb-4 flex items-start justify-between gap-4'>
                  <div className='flex-1'>
                    <p
                      className='text-sm text-gray-600 dark:text-gray-400'
                      dir='auto'
                    >
                      {/* Products are hard-deleted — product can be null. */}
                      {qa.product?.title || t('productQa.deletedProduct')}
                    </p>
                    <p className='mt-2 font-medium text-gray-900 dark:text-white'>
                      {t('productQa.question', { text: '' })}
                      <bdi>{qa.question}</bdi>
                    </p>
                    {qa.answer && (
                      <p className='mt-2 text-gray-700 dark:text-gray-300'>
                        {t('productQa.answer', { text: '' })}
                        <bdi>{qa.answer}</bdi>
                      </p>
                    )}
                    <div className='mt-2 flex items-center gap-4 text-xs text-gray-500'>
                      <span>
                        {t('productQa.askedBy', {
                          name:
                            qa.askedBy?.username || t('productQa.anonymous'),
                        })}
                      </span>
                      {qa.answeredBy && (
                        <span>
                          {t('productQa.answeredBy', {
                            name:
                              qa.answeredBy?.username ||
                              t('productQa.anonymous'),
                          })}
                        </span>
                      )}
                      <span>
                        {t('productQa.helpful', {
                          count: formatNumber(qa.helpful),
                        })}
                      </span>
                      <span>
                        {t('productQa.notHelpful', {
                          count: formatNumber(qa.notHelpful),
                        })}
                      </span>
                    </div>
                  </div>
                  <div className='flex gap-2'>
                    {can('content:write') && (
                      <button
                        type='button'
                        onClick={() => openEdit(qa)}
                        className='rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700'
                        aria-label={t('productQa.editAnswer')}
                      >
                        <MessageSquare
                          className='h-4 w-4 text-gray-500'
                          aria-hidden
                        />
                      </button>
                    )}
                    {can('content:delete') && (
                      <button
                        type='button'
                        onClick={() => void handleDelete(qa)}
                        disabled={deleteMut.isPending}
                        className='rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40'
                        aria-label={t('common.delete')}
                      >
                        <Trash2
                          className='h-4 w-4 text-red-500'
                          aria-hidden
                        />
                      </button>
                    )}
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      qa.approved
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}
                  >
                    {qa.approved
                      ? t('productQa.approved')
                      : t('productQa.pending')}
                  </span>
                  {!qa.approved && (
                    <button
                      type='button'
                      onClick={() => void handleApprove(qa, true)}
                      className='rounded-lg bg-green-500 px-3 py-1 text-xs font-medium text-white hover:bg-green-600'
                    >
                      {t('productQa.approve')}
                    </button>
                  )}
                  {qa.approved && (
                    <button
                      type='button'
                      onClick={() => void handleApprove(qa, false)}
                      className='rounded-lg bg-gray-500 px-3 py-1 text-xs font-medium text-white hover:bg-gray-600'
                    >
                      {t('productQa.unapprove')}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
          <TablePagination
            meta={meta}
            busy={qaQ.isFetching}
            onPage={table.setPage}
            onLimit={table.setLimit}
          />
        </div>
      )}

      {editing && (
        <FormDialog
          onClose={closeEdit}
          title={t('productQa.form.title')}
          busy={saving}
          maxWidthClass='max-w-2xl'
        >
          <div className='space-y-4'>
            <div>
              <p
                className='text-sm text-gray-600 dark:text-gray-400'
                dir='auto'
              >
                {editing.product?.title || t('productQa.deletedProduct')}
              </p>
              <p className='mt-2 font-medium text-gray-900 dark:text-white'>
                {t('productQa.question', { text: '' })}
                <bdi>{editing.question}</bdi>
              </p>
            </div>
            <label className='block text-sm'>
              <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                {t('productQa.form.answer')}
              </span>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={4}
                placeholder={t('productQa.form.placeholder')}
                dir='auto'
                className='w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white'
              />
            </label>
            <div className='flex items-center gap-2'>
              <input
                type='checkbox'
                id='approve'
                checked={editing.approved}
                onChange={(e) => {
                  const approved = e.target.checked;
                  // Keep local state in sync so the checkbox reflects the
                  // change and Save doesn't send a stale `approved`.
                  setEditing((prev) => (prev ? { ...prev, approved } : prev));
                  const payload: ProductQAAnswerPayload = { approved };
                  void answerMut.mutateAsync({ id: editing._id, payload });
                }}
                disabled={saving}
              />
              <label
                htmlFor='approve'
                className='text-sm text-gray-700 dark:text-gray-300'
              >
                {t('productQa.form.approve')}
              </label>
            </div>
            <div className='flex justify-end gap-2 pt-2'>
              <button
                type='button'
                disabled={saving}
                onClick={closeEdit}
                className='rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              >
                {t('common.cancel')}
              </button>
              <button
                type='button'
                disabled={saving}
                onClick={handleSaveAnswer}
                className='rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60'
              >
                {saving ? t('common.saving') : t('productQa.form.save')}
              </button>
            </div>
          </div>
        </FormDialog>
      )}
    </motion.div>
  );
}
