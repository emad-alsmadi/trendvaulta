import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { useAdminContactMessages } from '../hooks/useAdminInbox';
import { errorMessage, type ContactMessageStatus } from '../lib/api';
import { useTableQuery } from '../hooks/useTableQuery';
import { TablePagination } from '../components/ui/TablePagination';

const STATUS_BADGE: Record<ContactMessageStatus, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  read: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  closed: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
};

export default function ContactMessages() {
  const table = useTableQuery({ limit: 25 });
  const { resetPage } = table;
  const [status, setStatus] = useState<ContactMessageStatus | ''>('');

  const messagesQ = useAdminContactMessages({
    page: table.page,
    limit: table.limit,
    status: status || undefined,
  });
  const messages = messagesQ.data?.data || [];
  const meta = messagesQ.data?.meta;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Contact Messages
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Enquiries sent from the storefront contact form, newest first. Reply
          by email.
        </p>
      </div>

      <div className="mb-6">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ContactMessageStatus | '');
            resetPage();
          }}
          aria-label="Filter by status"
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="read">Read</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {messagesQ.isLoading && (
        <p className="py-10 text-center text-sm text-gray-500">Loading messages…</p>
      )}

      {messagesQ.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errorMessage(messagesQ.error, 'Failed to load messages')}
        </div>
      )}

      {!messagesQ.isLoading && !messagesQ.isError && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {messages.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-500">
              No messages yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {messages.map((msg) => (
                <li key={msg._id} className="px-4 py-3">
                  <details>
                    <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {msg.subject}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[msg.status] ?? STATUS_BADGE.read}`}
                      >
                        {msg.status}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {msg.name} · {msg.email}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 sm:ml-auto">
                        {new Date(msg.createdAt).toLocaleString()}
                      </span>
                    </summary>
                    <p className="mt-3 whitespace-pre-line break-words text-sm text-gray-700 dark:text-gray-200">
                      {msg.message}
                    </p>
                    <a
                      href={`mailto:${msg.email}?subject=${encodeURIComponent(`Re: ${msg.subject}`)}`}
                      className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      <Mail className="h-4 w-4" />
                      Reply to {msg.name}
                    </a>
                  </details>
                </li>
              ))}
            </ul>
          )}
          <div className="px-4 pb-4">
            <TablePagination
              meta={meta}
              busy={messagesQ.isFetching}
              onPage={table.setPage}
              onLimit={table.setLimit}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
