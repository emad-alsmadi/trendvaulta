import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Trash2, MessageSquare, Search } from 'lucide-react';
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

export default function ProductQA() {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [filterApproved, setFilterApproved] = useState<string>('');
  const [editing, setEditing] = useState<AdminProductQA | null>(null);
  const [answer, setAnswer] = useState('');

  // approved/pending is a server-side filter (GET /qa/admin?approved=…);
  // free-text search stays client-side over the fetched page.
  const qaQ = useAdminProductQA({
    limit: 100,
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

  const filtered =
    qaQ.data?.data?.filter((qa) => {
      const q = search.trim().toLowerCase();
      return (
        !q ||
        qa.question.toLowerCase().includes(q) ||
        qa.product.title.toLowerCase().includes(q) ||
        (qa.answer || '').toLowerCase().includes(q)
      );
    }) || [];

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
      toast.error('Please provide an answer before approving.');
      return;
    }
    try {
      await answerMut.mutateAsync({ id: qa._id, payload });
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update Q&A'));
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
      toast.error(errorMessage(err, 'Could not save answer'));
    }
  }

  async function handleDelete(qa: AdminProductQA) {
    const ok = await confirm({ message: 'Delete this Q&A?', danger: true, confirmLabel: 'Delete' });
    if (!ok) return;
    try {
      await deleteMut.mutateAsync(qa._id);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete Q&A'));
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
            Product Q&A
          </h1>
          <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
            Moderate and answer customer questions.
          </p>
        </div>
      </div>

      <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-center'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400' />
          <input
            type='search'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search by question, product, or answer…'
            className='w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
          />
        </div>
        <select
          value={filterApproved}
          onChange={(e) => setFilterApproved(e.target.value)}
          className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
        >
          <option value=''>All</option>
          <option value='pending'>Pending</option>
          <option value='approved'>Approved</option>
        </select>
      </div>

      {qaQ.isLoading && (
        <p className='py-10 text-center text-sm text-gray-500'>Loading Q&A…</p>
      )}

      {qaQ.isError && (
        <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'>
          {errorMessage(qaQ.error, 'Failed to load Q&A')}
        </div>
      )}

      {!qaQ.isLoading && !qaQ.isError && (
        <div className='space-y-4'>
          {filtered.length === 0 ? (
            <p className='py-10 text-center text-sm text-gray-500'>
              No Q&A found.
            </p>
          ) : (
            filtered.map((qa) => (
              <div
                key={qa._id}
                className='rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800'
              >
                <div className='mb-4 flex items-start justify-between gap-4'>
                  <div className='flex-1'>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      {qa.product.title}
                    </p>
                    <p className='mt-2 font-medium text-gray-900 dark:text-white'>
                      Q: {qa.question}
                    </p>
                    {qa.answer && (
                      <p className='mt-2 text-gray-700 dark:text-gray-300'>
                        A: {qa.answer}
                      </p>
                    )}
                    <div className='mt-2 flex items-center gap-4 text-xs text-gray-500'>
                      <span>Asked by: {qa.askedBy?.username || 'Anonymous'}</span>
                      {qa.answeredBy && (
                        <span>Answered by: {qa.answeredBy.username}</span>
                      )}
                      <span>Helpful: {qa.helpful}</span>
                      <span>Not helpful: {qa.notHelpful}</span>
                    </div>
                  </div>
                  <div className='flex gap-2'>
                    {can('content:write') && (
                      <button
                        type='button'
                        onClick={() => openEdit(qa)}
                        className='rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700'
                        aria-label='Edit answer'
                      >
                        <MessageSquare className='h-4 w-4 text-gray-500' />
                      </button>
                    )}
                    {can('content:delete') && (
                      <button
                        type='button'
                        onClick={() => void handleDelete(qa)}
                        disabled={deleteMut.isPending}
                        className='rounded p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40'
                        aria-label='Delete'
                      >
                        <Trash2 className='h-4 w-4 text-red-500' />
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
                    {qa.approved ? 'Approved' : 'Pending'}
                  </span>
                  {!qa.approved && (
                    <button
                      type='button'
                      onClick={() => void handleApprove(qa, true)}
                      className='rounded-lg bg-green-500 px-3 py-1 text-xs font-medium text-white hover:bg-green-600'
                    >
                      Approve
                    </button>
                  )}
                  {qa.approved && (
                    <button
                      type='button'
                      onClick={() => void handleApprove(qa, false)}
                      className='rounded-lg bg-gray-500 px-3 py-1 text-xs font-medium text-white hover:bg-gray-600'
                    >
                      Unapprove
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {editing && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
          <div className='max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800' role='dialog' aria-modal='true'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-xl font-bold text-gray-900 dark:text-white'>
                Answer Question
              </h2>
              <button
                type='button'
                disabled={saving}
                onClick={closeEdit}
                className='rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700'
              >
                <X className='h-5 w-5' />
              </button>
            </div>
            <div className='space-y-4'>
              <div>
                <p className='text-sm text-gray-600 dark:text-gray-400'>
                  {editing.product.title}
                </p>
                <p className='mt-2 font-medium text-gray-900 dark:text-white'>
                  Q: {editing.question}
                </p>
              </div>
              <label className='block text-sm'>
                <span className='mb-1 block font-medium text-gray-700 dark:text-gray-300'>
                  Your Answer
                </span>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={4}
                  placeholder='Type your answer here...'
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
                  Approve and publish
                </label>
              </div>
              <div className='flex justify-end gap-2 pt-2'>
                <button
                  type='button'
                  disabled={saving}
                  onClick={closeEdit}
                  className='rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                >
                  Cancel
                </button>
                <button
                  type='button'
                  disabled={saving}
                  onClick={handleSaveAnswer}
                  className='rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60'
                >
                  {saving ? 'Saving…' : 'Save Answer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
