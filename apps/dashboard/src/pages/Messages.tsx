import { useState } from 'react';
import { CheckCircle2, Inbox, Mail, MailOpen, RotateCcw } from 'lucide-react';
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
import { FormDialog, FormDialogFooter } from '../components/ui/FormDialog';
import { intlLocale, useT } from '../i18n/I18nProvider';
import { PageHeader } from '../components/ui/PageHeader';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { Field, Textarea } from '../components/ui/Field';
import { StatusBadge } from '../components/ui/StatusBadge';
import { buttonVariants, focusRing } from '../components/ui/styles';
import { cn } from '../lib/cn';

// '' = all; labels come from t('messages.all') / tv('contactStatus', …).
const STATUS_FILTERS: Array<'' | ContactMessageStatus> = [
  '',
  'new',
  'read',
  'closed',
];

/** Compact table form, e.g. "Sep 29, 6:35 PM" (year only when not this year). */
function formatShortDate(value: string | null | undefined, tag: string) {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleString(tag, {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== new Date().getFullYear()
      ? { year: 'numeric' }
      : {}),
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Opens the staff member's mail client with the enquiry quoted. The draft goes
 * to the customer, so it stays in the store's customer-facing language.
 */
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
  const { t, tv, locale, formatDateTime, formatNumber } = useT();
  const tag = intlLocale(locale);
  const formatDate = (value?: string | null) =>
    value ? formatDateTime(value) : '—';
  const table = useTableQuery({ limit: 25, sort: 'createdAt', order: 'desc' });
  const { resetPage } = table;
  const [search, setSearch] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | ContactMessageStatus>(
    '',
  );

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
        setViewing(
          await updateMut.mutateAsync({ id: message._id, status: 'read' }),
        );
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
          ? t('messages.closed')
          : status === 'new'
            ? t('messages.markedUnread')
            : t('messages.reopened'),
      );
    } catch (err) {
      toast.error(errorMessage(err, t('messages.updateFailed')));
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
      toast.success(t('messages.noteSaved'));
    } catch (err) {
      toast.error(errorMessage(err, t('messages.noteFailed')));
    }
  }

  const noteChanged = viewing
    ? note.trim() !== (viewing.staffNote || '')
    : false;

  const columns: DataTableColumn<AdminContactMessage>[] = [
    {
      key: 'from',
      header: t('messages.columns.from'),
      className: 'max-w-[13rem]',
      cell: (m) => (
        <div className='flex items-center gap-3'>
          <span
            aria-hidden
            className={cn(
              'size-2 shrink-0 rounded-full',
              m.status === 'new' ? 'bg-foreground' : 'bg-transparent',
            )}
          />
          {/* Customer-written text is often Arabic: dir="auto" gives each
              field its own direction */}
          <div className='min-w-0'>
            <p
              dir='auto'
              className={cn(
                'truncate text-foreground',
                m.status === 'new' && 'font-semibold',
              )}
            >
              {m.name}
            </p>
            <p
              className='truncate text-xs text-muted-foreground'
              dir='ltr'
            >
              {m.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'subject',
      header: t('messages.columns.subject'),
      className: 'max-w-[20rem]',
      cell: (m) => (
        <>
          {/* The subject opens the message: a real button, so the row works
              from the keyboard */}
          <button
            type='button'
            dir='auto'
            onClick={() => void openMessage(m)}
            className={cn(
              'block max-w-full truncate rounded text-start text-foreground underline-offset-4 hover:underline',
              m.status === 'new' && 'font-semibold',
              focusRing,
            )}
          >
            {m.subject}
          </button>
          <p
            dir='auto'
            className='truncate text-xs text-muted-foreground'
          >
            {m.message}
          </p>
        </>
      ),
    },
    {
      key: 'createdAt',
      header: t('messages.columns.received'),
      sortable: true,
      className: 'whitespace-nowrap text-muted-foreground',
      cell: (m) => formatShortDate(m.createdAt, tag),
    },
    {
      key: 'status',
      header: t('messages.columns.status'),
      sortable: true,
      cell: (m) => (
        <StatusBadge status={m.status}>
          {tv('contactStatus', m.status)}
        </StatusBadge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('messages.title')}
        description={t('messages.subtitle')}
      />

      {messagesQ.isError ? (
        <Alert tone='error'>
          {errorMessage(messagesQ.error, t('messages.loadFailed'))}
        </Alert>
      ) : (
        <DataTable
          caption={t('messages.title')}
          data={messages}
          columns={columns}
          getKey={(m) => m._id}
          loading={messagesQ.isLoading}
          fetching={messagesQ.isFetching}
          sort={table.sort}
          order={table.order}
          onSort={table.toggleSort}
          meta={meta}
          onPage={table.setPage}
          onLimit={table.setLimit}
          minWidthClass='min-w-[640px]'
          emptyIcon={<Inbox aria-hidden />}
          emptyTitle={
            appliedQ || statusFilter ? t('messages.noMatch') : t('messages.none')
          }
          toolbar={
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                onSubmit: () => {
                  setAppliedQ(search.trim());
                  resetPage();
                },
                placeholder: t('messages.searchPlaceholder'),
                label: t('messages.searchLabel'),
                submitLabel: t('common.search'),
              }}
              canClear={Boolean(appliedQ)}
              onClear={() => {
                setSearch('');
                setAppliedQ('');
                resetPage();
              }}
            >
              <div
                role='group'
                aria-label={t('messages.filterStatus')}
                className='inline-flex h-control items-center gap-0.5 self-start rounded-control border border-border bg-muted p-0.5'
              >
                {STATUS_FILTERS.map((value) => {
                  const active = statusFilter === value;
                  const count = value && counts ? counts[value] : undefined;
                  return (
                    <button
                      key={value || 'all'}
                      type='button'
                      aria-pressed={active}
                      onClick={() => {
                        setStatusFilter(value);
                        resetPage();
                      }}
                      className={cn(
                        'inline-flex h-full items-center rounded px-3 text-body-sm font-medium transition-colors duration-fast',
                        focusRing,
                        active
                          ? 'border border-border bg-background text-foreground shadow-card'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {value ? tv('contactStatus', value) : t('messages.all')}
                      {count !== undefined && (
                        <span className='ms-1.5 rounded-full bg-foreground/10 px-1.5 text-xs tabular-nums'>
                          {formatNumber(count)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </FilterBar>
          }
        />
      )}

      {viewing && (
        <FormDialog
          onClose={() => setViewing(null)}
          title={<bdi>{viewing.subject}</bdi>}
          busy={updateMut.isPending}
        >
          <dl className='mb-4 grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-2 text-sm'>
            <dt className='text-muted-foreground'>
              {t('messages.columns.from')}
            </dt>
            <dd className='text-foreground'>
              <bdi className='font-medium'>{viewing.name}</bdi>{' '}
              <bdi className='text-muted-foreground'>&lt;{viewing.email}&gt;</bdi>
            </dd>
            <dt className='text-muted-foreground'>
              {t('messages.columns.received')}
            </dt>
            <dd className='tabular-nums text-foreground'>
              {formatDate(viewing.createdAt)}
            </dd>
            <dt className='text-muted-foreground'>
              {t('messages.columns.status')}
            </dt>
            <dd className='flex flex-wrap items-center gap-2'>
              <StatusBadge status={viewing.status}>
                {tv('contactStatus', viewing.status)}
              </StatusBadge>
              {viewing.handledAt && (
                <span className='text-xs text-muted-foreground'>
                  {t('messages.handledBy', {
                    name:
                      viewing.handledBy?.username ||
                      viewing.handledBy?.email ||
                      t('messages.staffFallback'),
                    date: formatDate(viewing.handledAt),
                  })}
                </span>
              )}
            </dd>
          </dl>

          <p
            dir='auto'
            className='mb-5 whitespace-pre-line rounded-badge border border-border bg-muted/60 p-4 text-sm leading-relaxed text-foreground'
          >
            {viewing.message}
          </p>

          {canWrite ? (
            <form
              onSubmit={saveNote}
              className='space-y-2'
            >
              <Field
                label={t('messages.staffNote')}
                hint={
                  <>
                    {t('messages.noteHint')}{' '}
                    <span dir='ltr'>{formatNumber(note.length)}/1000</span>
                  </>
                }
              >
                <Textarea
                  id='staff-note'
                  dir='auto'
                  rows={3}
                  maxLength={1000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
              <Button
                type='submit'
                size='sm'
                disabled={!noteChanged || updateMut.isPending}
              >
                {t('messages.saveNote')}
              </Button>
            </form>
          ) : (
            viewing.staffNote && (
              <p className='text-sm text-muted-foreground'>
                <span className='font-medium text-foreground'>
                  {t('messages.staffNote')}:
                </span>{' '}
                <bdi>{viewing.staffNote}</bdi>
              </p>
            )
          )}

          <FormDialogFooter className='justify-between'>
            <a
              href={replyHref(viewing)}
              className={buttonVariants({ variant: 'primary' })}
            >
              <Mail aria-hidden='true' />
              {t('messages.replyByEmail')}
            </a>
            {canWrite && (
              <div className='flex flex-wrap gap-2'>
                {viewing.status !== 'new' && (
                  <Button
                    variant='ghost'
                    disabled={updateMut.isPending}
                    onClick={() => void setStatus('new')}
                    icon={<MailOpen aria-hidden />}
                  >
                    {t('messages.markUnread')}
                  </Button>
                )}
                {viewing.status === 'closed' ? (
                  <Button
                    disabled={updateMut.isPending}
                    onClick={() => void setStatus('read')}
                    icon={<RotateCcw aria-hidden />}
                  >
                    {t('messages.reopen')}
                  </Button>
                ) : (
                  <Button
                    disabled={updateMut.isPending}
                    onClick={() => void setStatus('closed')}
                    icon={<CheckCircle2 aria-hidden />}
                  >
                    {/* Not just "Close": that is the dialog's own ✕ button */}
                    {t('messages.closeMessage')}
                  </Button>
                )}
              </div>
            )}
          </FormDialogFooter>
        </FormDialog>
      )}
    </>
  );
}
