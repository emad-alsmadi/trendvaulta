import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAdminSubscribers } from '../hooks/useAdminInbox';
import { errorMessage, type SubscriberStatus } from '../lib/api';
import { useTableQuery } from '../hooks/useTableQuery';
import { TablePagination } from '../components/ui/TablePagination';

const STATUS_BADGE: Record<SubscriberStatus, string> = {
  subscribed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  unsubscribed: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
};

const STATUS_LABEL: Record<SubscriberStatus, string> = {
  subscribed: 'Subscribed',
  pending: 'Awaiting confirmation',
  unsubscribed: 'Unsubscribed',
};

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

export default function Subscribers() {
  const table = useTableQuery({ limit: 25 });
  const [status, setStatus] = useState<SubscriberStatus | ''>('subscribed');

  const subsQ = useAdminSubscribers({
    page: table.page,
    limit: table.limit,
    status: status || undefined,
  });
  const items = subsQ.data?.data || [];
  const total = subsQ.data?.meta?.total;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
            Newsletter subscribers
          </h1>
          <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
            Only confirmed (subscribed) addresses may be emailed.
            {typeof total === 'number' ? ` ${total} in this view.` : ''}
          </p>
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as SubscriberStatus | '');
            table.resetPage();
          }}
          aria-label='Filter by status'
          className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
        >
          <option value='subscribed'>Subscribed</option>
          <option value='pending'>Awaiting confirmation</option>
          <option value='unsubscribed'>Unsubscribed</option>
          <option value=''>All</option>
        </select>
      </div>

      {subsQ.isError && (
        <div className='mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'>
          {errorMessage(subsQ.error, 'Failed to load subscribers')}
        </div>
      )}

      <section className='overflow-x-auto rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800'>
        {subsQ.isLoading ? (
          <p className='py-10 text-center text-sm text-gray-500'>Loading…</p>
        ) : items.length === 0 ? (
          <p className='py-10 text-center text-sm text-gray-500'>
            No subscribers in this view.
          </p>
        ) : (
          <table className='w-full min-w-[560px] text-sm'>
            <thead>
              <tr className='border-b border-gray-200 text-left text-gray-500 dark:border-gray-700'>
                <th scope='col' className='pb-2 font-medium'>Email</th>
                <th scope='col' className='pb-2 font-medium'>Status</th>
                <th scope='col' className='pb-2 font-medium'>Source</th>
                <th scope='col' className='pb-2 font-medium'>Signed up</th>
                <th scope='col' className='pb-2 font-medium'>Confirmed</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100 dark:divide-gray-700'>
              {items.map((sub) => (
                <tr key={sub._id}>
                  <td className='py-3 pr-3 text-gray-900 dark:text-white'>{sub.email}</td>
                  <td className='py-3 pr-3'>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[sub.status]}`}
                    >
                      {STATUS_LABEL[sub.status]}
                    </span>
                  </td>
                  <td className='py-3 pr-3 capitalize text-gray-600 dark:text-gray-400'>
                    {sub.source}
                  </td>
                  <td className='py-3 pr-3 text-gray-600 dark:text-gray-400'>
                    {formatDate(sub.createdAt)}
                  </td>
                  <td className='py-3 text-gray-600 dark:text-gray-400'>
                    {formatDate(sub.confirmedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <TablePagination
          meta={subsQ.data?.meta}
          busy={subsQ.isFetching}
          onPage={table.setPage}
          onLimit={table.setLimit}
        />
      </section>
    </motion.div>
  );
}
