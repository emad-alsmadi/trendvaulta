import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Search } from 'lucide-react';
import {
  useAdminContactMessages,
  useUpdateContactMessageMutation,
} from '../hooks/useAdminContactMessages';
import {
  errorMessage,
  type AdminContactMessage,
  type ContactMessageStatus,
} from '../lib/api';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../components/ui/Toast';
import { useTableQuery } from '../hooks/useTableQuery';
import { SortableHeader } from '../components/ui/SortableHeader';
import { TablePagination } from '../components/ui/TablePagination';
import { FormDialog } from '../components/ui/FormDialog';

const STATUS_FILTERS: { value: '' | ContactMessageStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'closed', label: 'Closed' },
];

const STATUS_BADGE: Record<ContactMessageStatus, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  read: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  closed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
};

function StatusBadge({ status }: { status: ContactMessageStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[status]}`}
    >
      {status}
    </span>
  );
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '—';
}

/** Compact table form, e.g. "Sep 29, 6:35 PM" (year only when not this year). */
function formatShortDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Opens the staff member's mail client with the enquiry quoted. */
function replyHref(message: AdminContactMessage) {
  const subject = /^re:/i.test(message.subject)
    ? message.subject
    : `Re: ${message.subject}`;
  const quoted = message.message
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
  const body = `Hi ${message.name},\n\n\n\n${quoted}`;
  return `mailto:${message.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function Messages() {
  const { can } = usePermissions();
  const canWrite = can('content:write');
  const toast = useToast();
  const table = useTableQuery({ limit: 25, sort: 'createdAt', order: 'desc' });
  const { resetPage } = table;
  const [search, setSearch] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | ContactMessageStatus>('');

  const messagesQ = useAdminContactMessages({
    ...table.params,
    q: appliedQ || undefined,
    status: statusFilter || undefined,
  });
  const updateMut = useUpdateContactMessageMutation();

  const messages = messagesQ.data?.data || [];
  const meta = messagesQ.data?.meta;
  const counts = messagesQ.data?.counts;

  const [viewing, setViewing] = useState<AdminContactMessage | null>(null);
  const [note, setNote] = useState('');

  async function openMessage(message: AdminContactMessage) {
    setViewing(message);
    setNote(message.staffNote || '');
    // Opening an unread message reads it, as in any inbox
    if (canWrite && message.status === 'new') {
      try {
        setViewing(await updateMut.mutateAsync({ id: message._id, status: 'read' }));
      } catch {
        // Still readable; the status just stays "new"
      }
    }
  }

  async function setStatus(status: ContactMessageStatus) {
    if (!viewing) return;
    try {
      const updated = await updateMut.mutateAsync({ id: viewing._id, status });
      setViewing(updated);
      toast.success(
        status === 'closed'
          ? 'Message closed'
          : status === 'new'
            ? 'Marked as unread'
            : 'Message reopened',
      );
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update the message'));
    }
  }

  async function saveNote(e: React.FormEvent) {
    e.preventDefault();
    if (!viewing) return;
    try {
      const updated = await updateMut.mutateAsync({
        id: viewing._id,
        staffNote: note.trim(),
      });
      setViewing(updated);
      setNote(updated.staffNote || '');
      toast.success('Note saved');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save the note'));
    }
  }

  const noteChanged = viewing ? note.trim() !== (viewing.staffNote || '') : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Messages
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Enquiries sent from the storefront contact form.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div
          role="group"
          aria-label="Filter by status"
          className="flex flex-wrap gap-2"
        >
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.value;
            const count = f.value && counts ? counts[f.value] : undefined;
            return (
              <button
                key={f.value || 'all'}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setStatusFilter(f.value);
                  resetPage();
                }}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-700'
                }`}
              >
                {f.label}
                {count !== undefined && <span className="ms-1.5 opacity-80">{count}</span>}
              </button>
            );
          })}
        </div>
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setAppliedQ(search.trim());
            resetPage();
          }}
        >
          <Search className="absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            aria-label="Search messages by sender or subject"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email or subject…"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 ps-10 pe-4 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </form>
      </div>

      {messagesQ.isLoading && (
        <p className="py-10 text-center text-sm text-gray-500">
          Loading messages…
        </p>
      )}

      {messagesQ.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errorMessage(messagesQ.error, 'Failed to load messages')}
        </div>
      )}

      {!messagesQ.isLoading && !messagesQ.isError && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider dark:bg-gray-700">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-start [&>th]:font-medium [&>th]:text-gray-500 dark:[&>th]:text-gray-300">
                  <th scope="col">From</th>
                  <th scope="col">Subject</th>
                  <SortableHeader
                    field="createdAt"
                    active={table.sort}
                    order={table.order}
                    onSort={table.toggleSort}
                  >
                    Received
                  </SortableHeader>
                  <SortableHeader
                    field="status"
                    active={table.sort}
                    order={table.order}
                    onSort={table.toggleSort}
                  >
                    Status
                  </SortableHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {messages.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-500">
                      {appliedQ || statusFilter ? 'No messages match.' : 'No messages yet.'}
                    </td>
                  </tr>
                ) : (
                  messages.map((m) => (
                    <tr
                      key={m._id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/60 ${
                        m.status === 'new' ? 'font-semibold' : ''
                      }`}
                    >
                      {/* Customer-written text is often Arabic: dir="auto"
                          gives each field its own direction */}
                      <td className="max-w-[12rem] px-4 py-3 text-sm">
                        <p dir="auto" className="truncate text-gray-900 dark:text-white">
                          {m.name}
                        </p>
                        <p className="truncate text-xs font-normal text-gray-500">{m.email}</p>
                      </td>
                      <td className="max-w-[18rem] px-4 py-3 text-sm">
                        {/* The subject opens the message: a real button, so
                            the row works from the keyboard */}
                        <button
                          type="button"
                          dir="auto"
                          onClick={() => void openMessage(m)}
                          className="block max-w-full truncate text-start text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {m.subject}
                        </button>
                        <p dir="auto" className="truncate text-xs font-normal text-gray-500">
                          {m.message}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-normal text-gray-500">
                        {formatShortDate(m.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={m.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            meta={meta}
            busy={messagesQ.isFetching}
            onPage={table.setPage}
            onLimit={table.setLimit}
          />
        </div>
      )}

      {viewing && (
        <FormDialog
          onClose={() => setViewing(null)}
          title={<bdi>{viewing.subject}</bdi>}
          busy={updateMut.isPending}
          maxWidthClass="max-w-2xl"
        >
          <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-gray-500">From</dt>
            <dd className="text-gray-900 dark:text-white">
              <bdi>{viewing.name}</bdi> &lt;{viewing.email}&gt;
            </dd>
            <dt className="text-gray-500">Received</dt>
            <dd className="text-gray-900 dark:text-white">{formatDate(viewing.createdAt)}</dd>
            <dt className="text-gray-500">Status</dt>
            <dd>
              <StatusBadge status={viewing.status} />
              {viewing.handledAt && (
                <span className="ms-2 text-xs text-gray-500">
                  by {viewing.handledBy?.username || viewing.handledBy?.email || 'staff'},{' '}
                  {formatDate(viewing.handledAt)}
                </span>
              )}
            </dd>
          </dl>

          <p
            dir="auto"
            className="mb-5 whitespace-pre-line rounded-lg bg-gray-50 p-4 text-sm text-gray-800 dark:bg-gray-900 dark:text-gray-200"
          >
            {viewing.message}
          </p>

          {canWrite ? (
            <form onSubmit={saveNote} className="mb-5 text-sm">
              <label
                htmlFor="staff-note"
                className="mb-1 block font-medium text-gray-700 dark:text-gray-300"
              >
                Staff note
              </label>
              <textarea
                id="staff-note"
                dir="auto"
                rows={3}
                maxLength={1000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                aria-describedby="note-help"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
              <span id="note-help" className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                Internal only, never sent to the customer. {note.length}/1000
              </span>
              <button
                type="submit"
                disabled={!noteChanged || updateMut.isPending}
                className="mt-2 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
              >
                Save note
              </button>
            </form>
          ) : (
            viewing.staffNote && (
              <p className="mb-5 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Staff note:</span> {viewing.staffNote}
              </p>
            )
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
            <a
              href={replyHref(viewing)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Reply by email
            </a>
            {canWrite && (
              <div className="flex gap-2">
                {viewing.status !== 'new' && (
                  <button
                    type="button"
                    disabled={updateMut.isPending}
                    onClick={() => void setStatus('new')}
                    className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-60 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Mark unread
                  </button>
                )}
                {viewing.status === 'closed' ? (
                  <button
                    type="button"
                    disabled={updateMut.isPending}
                    onClick={() => void setStatus('read')}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-gray-800 ring-1 ring-gray-300 hover:bg-gray-50 disabled:opacity-60 dark:text-gray-100 dark:ring-gray-600 dark:hover:bg-gray-700"
                  >
                    Reopen
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={updateMut.isPending}
                    onClick={() => void setStatus('closed')}
                    className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    {/* Not just "Close": that is the dialog's own ✕ button */}
                    Close message
                  </button>
                )}
              </div>
            )}
          </div>
        </FormDialog>
      )}
    </motion.div>
  );
}
