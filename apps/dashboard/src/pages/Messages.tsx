import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import {
  useAdminContactMessages,
  useUpdateContactStatusMutation,
} from '../hooks/useAdminInbox';
import {
  errorMessage,
  type AdminContactMessage,
  type ContactMessageStatus,
} from '../lib/api';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { useTableQuery } from '../hooks/useTableQuery';
import { TablePagination } from '../components/ui/TablePagination';

const STATUS_BADGE: Record<ContactMessageStatus, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  read: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  closed: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
};

const STATUS_LABEL: Record<ContactMessageStatus, string> = {
  new: 'New',
  read: 'Read',
  closed: 'Closed',
};

export default function Messages() {
  const { can } = usePermissions();
  const toast = useToast();
  const table = useTableQuery({ limit: 25 });
  const [status, setStatus] = useState<ContactMessageStatus | ''>('new');

  // Newest first (server order); the status filter runs server-side.
  const messagesQ = useAdminContactMessages({
    page: table.page,
    limit: table.limit,
    status: status || undefined,
  });
  const updateMut = useUpdateContactStatusMutation();
  const items = messagesQ.data?.data || [];
  const canWrite = can('content:write');

  async function setMessageStatus(
    msg: AdminContactMessage,
    next: ContactMessageStatus,
  ) {
    try {
      await updateMut.mutateAsync({ id: msg._id, status: next });
      toast.success(`Marked "${msg.subject}" as ${STATUS_LABEL[next].toLowerCase()}.`);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update message'));
    }
  }

  const busyId = updateMut.isPending ? updateMut.variables?.id : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
            Messages
          </h1>
          <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
            Enquiries from the storefront contact form, newest first.
          </p>
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ContactMessageStatus | '');
            table.resetPage();
          }}
          aria-label='Filter by status'
          className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
        >
          <option value='new'>New</option>
          <option value='read'>Read</option>
          <option value='closed'>Closed</option>
          <option value=''>All</option>
        </select>
      </div>

      {messagesQ.isLoading && (
        <p className='py-10 text-center text-sm text-gray-500'>Loading messages…</p>
      )}

      {messagesQ.isError && (
        <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'>
          {errorMessage(messagesQ.error, 'Failed to load messages')}
        </div>
      )}

      {!messagesQ.isLoading && !messagesQ.isError && (
        <div className='space-y-4'>
          {items.length === 0 ? (
            <p className='py-10 text-center text-sm text-gray-500'>
              No messages{status ? ` marked ${STATUS_LABEL[status].toLowerCase()}` : ''}.
            </p>
          ) : (
            items.map((msg) => (
              <article
                key={msg._id}
                className='rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800'
              >
                <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
                  <div className='min-w-0'>
                    <h2 className='font-semibold text-gray-900 dark:text-white'>
                      {msg.subject}
                    </h2>
                    <p className='mt-0.5 text-sm text-gray-600 dark:text-gray-400'>
                      {msg.name} ·{' '}
                      <a
                        href={`mailto:${msg.email}?subject=${encodeURIComponent(`Re: ${msg.subject}`)}`}
                        className='text-blue-600 hover:underline dark:text-blue-400'
                      >
                        {msg.email}
                      </a>{' '}
                      · {new Date(msg.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`self-start rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[msg.status]}`}
                  >
                    {STATUS_LABEL[msg.status]}
                  </span>
                </div>
                <p className='mt-3 whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-200'>
                  {msg.message}
                </p>
                {canWrite && (
                  <div className='mt-4 flex flex-wrap items-center gap-2'>
                    <a
                      href={`mailto:${msg.email}?subject=${encodeURIComponent(`Re: ${msg.subject}`)}`}
                      className='inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'
                    >
                      <Mail className='h-3.5 w-3.5' />
                      Reply by email
                    </a>
                    {msg.status === 'new' && (
                      <button
                        type='button'
                        onClick={() => void setMessageStatus(msg, 'read')}
                        disabled={busyId === msg._id}
                        className='rounded-lg bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50'
                      >
                        Mark read
                      </button>
                    )}
                    {msg.status !== 'closed' ? (
                      <button
                        type='button'
                        onClick={() => void setMessageStatus(msg, 'closed')}
                        disabled={busyId === msg._id}
                        className='rounded-lg bg-gray-500 px-3 py-1 text-xs font-medium text-white hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50'
                      >
                        Close
                      </button>
                    ) : (
                      <button
                        type='button'
                        onClick={() => void setMessageStatus(msg, 'read')}
                        disabled={busyId === msg._id}
                        className='rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))
          )}
          <TablePagination
            meta={messagesQ.data?.meta}
            busy={messagesQ.isFetching}
            onPage={table.setPage}
            onLimit={table.setLimit}
          />
        </div>
      )}
    </motion.div>
  );
}
