import { useState } from 'react';
import { Mail } from 'lucide-react';
import { useAdminSubscribers } from '../hooks/useAdminSubscribers';
import {
  errorMessage,
  type AdminSubscriber,
  type SubscriberStatus,
} from '../lib/api';
import { useTableQuery } from '../hooks/useTableQuery';
import { useT } from '../i18n/I18nProvider';
import { PageHeader } from '../components/ui/PageHeader';
import { Alert } from '../components/ui/Alert';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { FilterBar, FilterBarItem } from '../components/ui/FilterBar';
import { Select } from '../components/ui/Field';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';

export default function Subscribers() {
  const { t, formatDate, formatNumber } = useT();
  const table = useTableQuery({ limit: 25 });
  const [status, setStatus] = useState<SubscriberStatus | ''>('subscribed');

  const subsQ = useAdminSubscribers({
    page: table.page,
    limit: table.limit,
    status: status || undefined,
  });
  const items = subsQ.data?.data || [];
  const total = subsQ.data?.meta?.total;

  const columns: DataTableColumn<AdminSubscriber>[] = [
    {
      key: 'email',
      header: t('subscribers.columns.email'),
      cell: (sub) => (
        <span
          className='font-medium text-foreground'
          dir='ltr'
        >
          {sub.email}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('subscribers.columns.status'),
      cell: (sub) => (
        <StatusBadge status={sub.status}>
          {t(`subscribers.status.${sub.status}`)}
        </StatusBadge>
      ),
    },
    {
      key: 'source',
      header: t('subscribers.columns.source'),
      cell: (sub) => (
        <Badge plain>{t(`subscribers.source.${sub.source}`)}</Badge>
      ),
    },
    {
      key: 'createdAt',
      header: t('subscribers.columns.signedUp'),
      className: 'whitespace-nowrap text-muted-foreground',
      cell: (sub) => formatDate(sub.createdAt),
    },
    {
      key: 'confirmedAt',
      header: t('subscribers.columns.confirmed'),
      className: 'whitespace-nowrap text-muted-foreground',
      cell: (sub) => (sub.confirmedAt ? formatDate(sub.confirmedAt) : '—'),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('subscribers.title')}
        description={
          <>
            {t('subscribers.subtitle')}
            {typeof total === 'number' && (
              <span className='ms-1 font-medium text-foreground'>
                {t('subscribers.inView', { count: formatNumber(total) })}
              </span>
            )}
          </>
        }
      />

      {subsQ.isError && (
        <Alert
          tone='error'
          className='mb-4'
        >
          {errorMessage(subsQ.error, t('subscribers.loadFailed'))}
        </Alert>
      )}

      <DataTable
        caption={t('subscribers.title')}
        data={items}
        columns={columns}
        getKey={(sub) => sub._id}
        loading={subsQ.isLoading}
        fetching={subsQ.isFetching}
        meta={subsQ.data?.meta}
        onPage={table.setPage}
        onLimit={table.setLimit}
        minWidthClass='min-w-[600px]'
        emptyIcon={<Mail aria-hidden />}
        emptyTitle={t('subscribers.empty')}
        toolbar={
          <FilterBar>
            <FilterBarItem className='sm:w-56'>
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as SubscriberStatus | '');
                  table.resetPage();
                }}
                aria-label={t('subscribers.filterStatus')}
              >
                <option value='subscribed'>
                  {t('subscribers.status.subscribed')}
                </option>
                <option value='pending'>
                  {t('subscribers.status.pending')}
                </option>
                <option value='unsubscribed'>
                  {t('subscribers.status.unsubscribed')}
                </option>
                <option value=''>{t('subscribers.all')}</option>
              </Select>
            </FilterBarItem>
          </FilterBar>
        }
      />
    </>
  );
}
