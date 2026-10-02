import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  BarChart3,
  DollarSign,
  Package,
  PieChart as PieChartIcon,
  RefreshCw,
  ShoppingCart,
  Tag,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAdminOrders } from '../hooks/useAdminOrders';
import { useAdminStats } from '../hooks/useAdminStats';
import { errorMessage, type AdminOrder } from '../lib/api';
import { chartTheme, money } from '../lib/chartTheme';
import { intlLocale, useT } from '../i18n/I18nProvider';
import { useTheme } from '../hooks/useTheme';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, StatCard, KeyValue } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Skeleton, SkeletonCard, SkeletonRow } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Alert } from '../components/ui/Alert';
import { buttonVariants } from '../components/ui/styles';
import { cn } from '../lib/cn';

function shortId(id: string) {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function customerLabel(order: AdminOrder, fallback: string) {
  if (order.user && typeof order.user === 'object') {
    return order.user.email || order.user.username || fallback;
  }
  return typeof order.user === 'string' ? order.user : fallback;
}

function isPaidLike(order: AdminOrder) {
  return (
    order.paymentStatus === 'paid' ||
    ['paid', 'shipped', 'delivered'].includes(order.status)
  );
}

const STATUS_ORDER = [
  'pending',
  'paid',
  'shipped',
  'delivered',
  'canceled',
  'needs_attention',
  'refunded',
] as const;

/** Monday-first, matching the dashboard.* day labels. */
const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

/** Greys for the donut, darkest first; segments also carry a gap and a legend. */
const DONUT_LIGHT = ['#0a0a0a', '#404040', '#737373', '#a3a3a3', '#c4c4c4', '#262626', '#8a8a8a'];
const DONUT_DARK = ['#fafafa', '#d4d4d4', '#a3a3a3', '#737373', '#525252', '#e5e5e5', '#8a8a8a'];

function ChartSkeleton() {
  return (
    <Skeleton
      variant='custom'
      className='h-64 w-full rounded-badge'
    />
  );
}

export default function Dashboard() {
  const statsQ = useAdminStats();
  const ordersQ = useAdminOrders({ limit: 50 });
  const { t, tv, locale, formatCurrency, formatDate, formatDateTime, formatNumber } =
    useT();
  const { theme } = useTheme();
  const ink = chartTheme(theme);
  const tag = intlLocale(locale);
  const formatMoney = (n: number) => money(n, tag);

  const recentOrders = ordersQ.data?.data ?? [];
  const stats = statsQ.data;

  const usersCount = stats?.users ?? 0;
  const productsTotal = stats?.products ?? 0;
  const brandsTotal = stats?.brands ?? 0;
  const ordersTotal =
    stats?.orders ?? ordersQ.data?.meta?.total ?? recentOrders.length ?? 0;

  const samplePaidRevenue = recentOrders
    .filter(isPaidLike)
    .reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);
  const paidRevenue = stats?.paidRevenue ?? samplePaidRevenue;
  const revenueFromStats = typeof stats?.paidRevenue === 'number';

  const statusCounts = STATUS_ORDER.map((status) => ({
    status,
    count:
      stats?.statusCounts?.[status] ??
      recentOrders.filter((o) => o.status === status).length,
  }));
  const statusTotal = statusCounts.reduce((sum, s) => sum + s.count, 0);
  const statusFromStats = Boolean(stats?.statusCounts);

  const loading = statsQ.isLoading || ordersQ.isLoading;
  const anyError = statsQ.isError || ordersQ.isError;
  const fetching = statsQ.isFetching || ordersQ.isFetching;

  const refetchAll = () => {
    void statsQ.refetch();
    void ordersQ.refetch();
  };

  // Latest paid orders, oldest → newest so the line reads left to right.
  const revenueChartData = recentOrders
    .filter(isPaidLike)
    .slice(0, 12)
    .reverse()
    .map((order) => ({
      date: order.createdAt ? formatDate(order.createdAt) : '—',
      revenue: Number(order.totalPrice || 0),
    }));

  const donutColors = theme === 'dark' ? DONUT_DARK : DONUT_LIGHT;
  const orderStatusChartData = statusCounts
    .filter((s) => s.count > 0)
    .map((s) => ({ name: tv('orderStatus', s.status), value: s.count }));

  // Real distribution of the latest orders over the week (getDay: 0 = Sunday).
  const weekdayCounts = WEEKDAYS.map(() => 0);
  for (const order of recentOrders) {
    if (!order.createdAt) continue;
    const day = new Date(order.createdAt).getDay();
    weekdayCounts[(day + 6) % 7] += 1;
  }
  const weeklyOrdersData = WEEKDAYS.map((day, i) => ({
    day: t(`dashboard.${day}`),
    orders: weekdayCounts[i],
  }));
  const busiest = Math.max(...weekdayCounts);

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: ink.surface,
      border: `1px solid ${ink.border}`,
      borderRadius: 8,
      boxShadow: '0 8px 24px -6px rgb(0 0 0 / 0.15)',
      fontSize: 12,
    },
    labelStyle: { color: ink.revenue, fontWeight: 600 },
    itemStyle: { color: ink.revenue },
    cursor: { stroke: ink.axis, strokeDasharray: '3 3' },
  } as const;

  return (
    <div className='space-y-6'>
      <PageHeader
        title={t('dashboard.title')}
        description={t('dashboard.subtitle')}
        className='mb-2'
        actions={
          <Button
            onClick={refetchAll}
            disabled={fetching}
            icon={
              <RefreshCw
                className={cn(fetching && 'animate-spin')}
                aria-hidden
              />
            }
          >
            {t('dashboard.refresh')}
          </Button>
        }
      />

      {anyError && (
        <Alert
          tone='error'
          title={t('dashboard.someFailed')}
        >
          {statsQ.isError && (
            <p>
              {t('dashboard.statsError', {
                message: errorMessage(statsQ.error, t('dashboard.error')),
              })}
            </p>
          )}
          {ordersQ.isError && (
            <p>
              {t('dashboard.ordersError', {
                message: errorMessage(ordersQ.error, t('dashboard.error')),
              })}
            </p>
          )}
        </Alert>
      )}

      {/* Level 1 — KPIs */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              label={
                revenueFromStats
                  ? t('dashboard.revenue')
                  : t('dashboard.revenueSample')
              }
              value={formatMoney(paidRevenue)}
              icon={<DollarSign />}
              footer={
                <p className='text-body-sm text-muted-foreground'>
                  {revenueFromStats
                    ? t('dashboard.revenueHint')
                    : t('dashboard.revenueSampleHint', {
                        count: recentOrders.length,
                      })}
                </p>
              }
              className='bg-primary text-primary-foreground [&_p]:text-primary-foreground/70 [&_p.text-kpi]:text-primary-foreground [&>span]:border-primary-foreground/20 [&>span]:bg-primary-foreground/10 [&>span]:text-primary-foreground'
            />
            <StatCard
              label={t('dashboard.orders')}
              value={formatNumber(ordersTotal)}
              icon={<ShoppingCart />}
              footer={
                <p className='text-body-sm text-muted-foreground'>
                  {t('dashboard.ordersHint')}
                </p>
              }
            />
            <StatCard
              label={t('dashboard.products')}
              value={formatNumber(productsTotal)}
              icon={<Package />}
              footer={
                <p className='text-body-sm text-muted-foreground'>
                  {t('dashboard.productsHint')}
                </p>
              }
            />
            <StatCard
              label={t('dashboard.users')}
              value={formatNumber(usersCount)}
              icon={<Users />}
              footer={
                <p className='text-body-sm text-muted-foreground'>
                  {t('dashboard.usersHint')}
                </p>
              }
            />
          </>
        )}
      </div>

      {/* Level 2 — main trend + status mix */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        <Card className='lg:col-span-2'>
          <CardHeader
            icon={<TrendingUp />}
            title={t('dashboard.revenueTrend')}
            description={t('dashboard.revenueTrendDesc')}
          />
          {loading ? (
            <ChartSkeleton />
          ) : revenueChartData.length === 0 ? (
            <EmptyState
              icon={<TrendingUp aria-hidden />}
              title={t('dashboard.noRevenueData')}
              className='h-64'
            />
          ) : (
            <div
              className='h-64'
              role='img'
              aria-label={t('dashboard.revenueTrend')}
            >
              <ResponsiveContainer
                width='100%'
                height='100%'
              >
                <AreaChart
                  data={revenueChartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id='revenueFill'
                      x1='0'
                      y1='0'
                      x2='0'
                      y2='1'
                    >
                      <stop
                        offset='0%'
                        stopColor={ink.revenue}
                        stopOpacity={0.18}
                      />
                      <stop
                        offset='100%'
                        stopColor={ink.revenue}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray='3 3'
                    stroke={ink.grid}
                    vertical={false}
                  />
                  <XAxis
                    dataKey='date'
                    stroke={ink.muted}
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: ink.axis }}
                    reversed={locale === 'ar'}
                    minTickGap={16}
                  />
                  <YAxis
                    stroke={ink.muted}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    orientation={locale === 'ar' ? 'right' : 'left'}
                    tickFormatter={(value: number) => formatMoney(value)}
                  />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(value: number) => [
                      formatMoney(value),
                      t('dashboard.revenue'),
                    ]}
                  />
                  <Area
                    type='monotone'
                    dataKey='revenue'
                    stroke={ink.revenue}
                    strokeWidth={2}
                    fill='url(#revenueFill)'
                    dot={{ r: 3, fill: ink.surface, stroke: ink.revenue, strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: ink.revenue, stroke: ink.surface }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            icon={<PieChartIcon />}
            title={
              statusFromStats
                ? t('dashboard.statusAll')
                : t('dashboard.statusLatest')
            }
            actions={
              <Link
                to='/orders'
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'sm' }),
                  '-me-2',
                )}
              >
                {t('dashboard.viewOrders')}
                <ArrowUpRight
                  className='rtl:-scale-x-100'
                  aria-hidden
                />
              </Link>
            }
          />
          {loading ? (
            <ChartSkeleton />
          ) : orderStatusChartData.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart aria-hidden />}
              title={t('dashboard.noOrders')}
            />
          ) : (
            <>
              <div className='relative h-44'>
                <ResponsiveContainer
                  width='100%'
                  height='100%'
                >
                  <PieChart>
                    <Pie
                      data={orderStatusChartData}
                      cx='50%'
                      cy='50%'
                      innerRadius={52}
                      outerRadius={76}
                      paddingAngle={2}
                      stroke={ink.surface}
                      strokeWidth={2}
                      dataKey='value'
                    >
                      {orderStatusChartData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={donutColors[index % donutColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center'>
                  <span className='text-section tabular-nums text-foreground'>
                    {formatNumber(statusTotal)}
                  </span>
                  <span className='text-caption uppercase text-muted-foreground'>
                    {t('dashboard.orders')}
                  </span>
                </div>
              </div>
              <ul className='mt-4 space-y-2'>
                {statusCounts
                  .filter((s) => s.count > 0)
                  .map(({ status, count }, index) => (
                    <li
                      key={status}
                      className='flex items-center gap-2 text-body-sm'
                    >
                      <span
                        aria-hidden
                        className='size-2.5 shrink-0 rounded-sm'
                        style={{
                          backgroundColor:
                            donutColors[index % donutColors.length],
                        }}
                      />
                      <span className='flex-1 truncate text-foreground'>
                        {tv('orderStatus', status)}
                      </span>
                      <span className='tabular-nums text-muted-foreground'>
                        {formatNumber(count)}
                      </span>
                      <span className='w-10 text-end tabular-nums text-muted-foreground'>
                        {Math.round((count / Math.max(1, statusTotal)) * 100)}%
                      </span>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      {/* Level 3 — supporting analytics */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        <Card className='lg:col-span-2'>
          <CardHeader
            icon={<BarChart3 />}
            title={t('dashboard.weeklyOrders')}
            description={t('dashboard.weeklyOrdersDesc')}
          />
          {loading ? (
            <ChartSkeleton />
          ) : recentOrders.length === 0 ? (
            <EmptyState
              icon={<BarChart3 aria-hidden />}
              title={t('dashboard.noOrders')}
              className='h-64'
            />
          ) : (
            <div
              className='h-64'
              role='img'
              aria-label={t('dashboard.weeklyOrders')}
            >
              <ResponsiveContainer
                width='100%'
                height='100%'
              >
                <BarChart
                  data={weeklyOrdersData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray='3 3'
                    stroke={ink.grid}
                    vertical={false}
                  />
                  <XAxis
                    dataKey='day'
                    stroke={ink.muted}
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: ink.axis }}
                    reversed={locale === 'ar'}
                  />
                  <YAxis
                    stroke={ink.muted}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={32}
                    orientation={locale === 'ar' ? 'right' : 'left'}
                  />
                  <Tooltip
                    {...tooltipStyle}
                    cursor={{ fill: ink.grid }}
                    formatter={(value: number) => [
                      formatNumber(value),
                      t('dashboard.orders'),
                    ]}
                  />
                  <Bar
                    dataKey='orders'
                    radius={[4, 4, 0, 0]}
                    maxBarSize={44}
                  >
                    {weeklyOrdersData.map((d, i) => (
                      <Cell
                        key={i}
                        // The busiest day is solid; the rest step back.
                        fill={d.orders === busiest && busiest > 0 ? ink.bar : ink.barAlt}
                        fillOpacity={d.orders === busiest ? 1 : 0.55}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            icon={<Tag />}
            title={t('dashboard.catalog')}
          />
          {loading ? (
            <div className='space-y-3'>
              <Skeleton />
              <Skeleton className='w-5/6' />
              <Skeleton className='w-2/3' />
            </div>
          ) : (
            <>
              <dl className='divide-y divide-border'>
                {(
                  [
                    ['dashboard.products', productsTotal, '/products'],
                    ['dashboard.brands', brandsTotal, '/brands'],
                    ['dashboard.users', usersCount, '/users'],
                  ] as const
                ).map(([label, count, to]) => (
                  <KeyValue
                    key={label}
                    label={t(label)}
                  >
                    <Link
                      to={to}
                      className='inline-flex items-center gap-1 rounded font-semibold tabular-nums text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    >
                      {formatNumber(count)}
                      <ArrowUpRight
                        className='size-3.5 text-muted-foreground rtl:-scale-x-100'
                        aria-hidden
                      />
                    </Link>
                  </KeyValue>
                ))}
              </dl>
              <p className='mt-4 rounded-badge bg-muted/60 p-3 text-xs text-muted-foreground'>
                {revenueFromStats
                  ? t('dashboard.statsNote')
                  : t('dashboard.fallbackNote')}
              </p>
            </>
          )}
        </Card>
      </div>

      {/* Level 4 — operational */}
      <Card padded={false}>
        <div className='p-5 pb-0 sm:p-6 sm:pb-0'>
          <CardHeader
            icon={<ShoppingCart />}
            title={t('dashboard.recent')}
            actions={
              <Link
                to='/orders'
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'sm' }),
                  '-me-2',
                )}
              >
                {t('dashboard.manage')}
                <ArrowUpRight
                  className='rtl:-scale-x-100'
                  aria-hidden
                />
              </Link>
            }
          />
        </div>
        {ordersQ.isLoading ? (
          <div className='divide-y divide-border border-t border-border px-5 sm:px-6'>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart aria-hidden />}
            title={t('dashboard.noRecent')}
          />
        ) : (
          <ul className='divide-y divide-border border-t border-border'>
            {recentOrders.slice(0, 8).map((order) => (
              <li key={order._id}>
                <Link
                  to={`/orders/${order._id}`}
                  className='flex flex-wrap items-center justify-between gap-3 px-5 py-3 transition-colors duration-fast hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-6'
                >
                  <div className='flex min-w-0 flex-1 items-center gap-3'>
                    <span
                      aria-hidden
                      className='flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold uppercase text-muted-foreground'
                    >
                      {customerLabel(order, '?').charAt(0)}
                    </span>
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-medium text-foreground'>
                        {customerLabel(order, t('dashboard.customerFallback'))}
                      </p>
                      <p className='truncate text-xs text-muted-foreground'>
                        <span
                          className='font-mono'
                          dir='ltr'
                        >
                          #{shortId(order._id)}
                        </span>
                        {order.createdAt
                          ? ` · ${formatDateTime(order.createdAt)}`
                          : ''}
                      </p>
                    </div>
                  </div>
                  <div className='flex shrink-0 items-center gap-4'>
                    <StatusBadge status={order.status}>
                      {tv('orderStatus', order.status)}
                    </StatusBadge>
                    <div className='w-24 text-end'>
                      <p className='text-sm font-semibold tabular-nums text-foreground'>
                        {formatCurrency(Number(order.totalPrice || 0))}
                      </p>
                      {order.paymentStatus && (
                        <p className='text-xs text-muted-foreground'>
                          {tv('paymentStatus', order.paymentStatus)}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
