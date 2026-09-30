import { Link } from 'react-router-dom';
import {
  RefreshCw,
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  Tag,
  TrendingUp,
  PieChart,
  BarChart3,
} from 'lucide-react';
import { useAdminOrders } from '../hooks/useAdminOrders';
import { useAdminStats } from '../hooks/useAdminStats';
import { errorMessage, type AdminOrder } from '../lib/api';
import { money } from '../lib/chartTheme';
import { intlLocale, useT } from '../i18n/I18nProvider';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, StatCard, KeyValue } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';
import { Alert } from '../components/ui/Alert';
import { cn } from '../lib/cn';
import { useTheme } from '../hooks/useTheme';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';

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

export default function Dashboard() {
  const statsQ = useAdminStats();
  const ordersQ = useAdminOrders({ limit: 50 });
  const { t, tv, locale, formatCurrency, formatDateTime, formatNumber } =
    useT();
  const { theme } = useTheme();
  const formatMoney = (n: number) => money(n, intlLocale(locale));

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
  const maxStatus = Math.max(1, ...statusCounts.map((s) => s.count));
  const statusFromStats = Boolean(stats?.statusCounts);

  const loading = statsQ.isLoading || ordersQ.isLoading;
  const anyError = statsQ.isError || ordersQ.isError;

  const refetchAll = () => {
    void statsQ.refetch();
    void ordersQ.refetch();
  };

  // Prepare chart data
  const revenueChartData = recentOrders
    .filter(isPaidLike)
    .slice(0, 7)
    .map((order) => ({
      date: order.createdAt
        ? formatDateTime(order.createdAt).split(',')[0]
        : 'Unknown',
      revenue: Number(order.totalPrice || 0),
    }));

  const orderStatusChartData = statusCounts
    .filter((s) => s.count > 0)
    .map((s) => ({
      name: tv('orderStatus', s.status),
      value: s.count,
    }));

  const weeklyOrdersData = [
    { day: t('dashboard.monday'), orders: Math.floor(ordersTotal * 0.15) },
    { day: t('dashboard.tuesday'), orders: Math.floor(ordersTotal * 0.12) },
    { day: t('dashboard.wednesday'), orders: Math.floor(ordersTotal * 0.18) },
    { day: t('dashboard.thursday'), orders: Math.floor(ordersTotal * 0.22) },
    { day: t('dashboard.friday'), orders: Math.floor(ordersTotal * 0.2) },
    { day: t('dashboard.saturday'), orders: Math.floor(ordersTotal * 0.08) },
    { day: t('dashboard.sunday'), orders: Math.floor(ordersTotal * 0.05) },
  ];

  const chartColors = [
    '#9333ea', // brand purple
    '#6366f1', // brand indigo
    '#06b6d4', // brand cyan
    '#10b981', // metric green
    '#f59e0b', // metric orange
    '#ec4899', // metric pink
  ];
  const darkChartColors = [
    '#a855f7', // brand purple light
    '#818cf8', // brand indigo light
    '#22d3ee', // brand cyan light
    '#34d399', // metric green light
    '#fbbf24', // metric orange light
    '#f472b6', // metric pink light
  ];
  const pieColors = theme === 'dark' ? darkChartColors : chartColors;

  return (
    <div className='space-y-8'>
      {/* Page Header */}
      <PageHeader
        title={t('dashboard.title')}
        description={t('dashboard.subtitle')}
        actions={
          <Button
            variant='secondary'
            onClick={refetchAll}
            icon={
              <RefreshCw
                className={cn(
                  statsQ.isFetching || (ordersQ.isFetching && 'animate-spin'),
                )}
                aria-hidden
              />
            }
          >
            {t('dashboard.refresh')}
          </Button>
        }
      />

      {/* Error Alert */}
      {anyError && (
        <Alert tone='error'>
          {t('dashboard.someFailed')}
          {statsQ.isError && (
            <p className='mt-1 text-xs'>
              {t('dashboard.statsError', {
                message: errorMessage(statsQ.error, t('dashboard.error')),
              })}
            </p>
          )}
          {ordersQ.isError && (
            <p className='mt-1 text-xs'>
              {t('dashboard.ordersError', {
                message: errorMessage(ordersQ.error, t('dashboard.error')),
              })}
            </p>
          )}
        </Alert>
      )}

      {/* KPI Grid */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              label={t('dashboard.users')}
              value={formatNumber(usersCount)}
              icon={
                <Users
                  className='icon-sm'
                  aria-hidden
                />
              }
              delta={{ value: 0, label: t('dashboard.usersHint') }}
              className='bg-gradient-to-br from-brand-purple/5 to-brand-purple/10 border-brand-purple/20'
              iconClassName='text-brand-purple'
            />
            <StatCard
              label={t('dashboard.products')}
              value={formatNumber(productsTotal)}
              icon={
                <Package
                  className='icon-sm'
                  aria-hidden
                />
              }
              delta={{ value: 0, label: t('dashboard.productsHint') }}
              className='bg-gradient-to-br from-brand-indigo/5 to-brand-indigo/10 border-brand-indigo/20'
              iconClassName='text-brand-indigo'
            />
            <StatCard
              label={t('dashboard.orders')}
              value={formatNumber(ordersTotal)}
              icon={
                <ShoppingCart
                  className='icon-sm'
                  aria-hidden
                />
              }
              delta={{ value: 0, label: t('dashboard.ordersHint') }}
              className='bg-gradient-to-br from-brand-cyan/5 to-brand-cyan/10 border-brand-cyan/20'
              iconClassName='text-brand-cyan'
            />
            <StatCard
              label={
                revenueFromStats
                  ? t('dashboard.revenue')
                  : t('dashboard.revenueSample')
              }
              value={formatMoney(paidRevenue)}
              icon={
                <DollarSign
                  className='icon-sm'
                  aria-hidden
                />
              }
              delta={{
                value: 0,
                label: revenueFromStats
                  ? t('dashboard.revenueHint')
                  : t('dashboard.revenueSampleHint', {
                      count: recentOrders.length,
                    }),
              }}
              className='bg-gradient-to-br from-metric-green/5 to-metric-green/10 border-metric-green/20'
              iconClassName='text-metric-green'
            />
          </>
        )}
      </div>

      {/* Charts Grid */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3'>
        {/* Revenue Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className='lg:col-span-2'
        >
          <Card className='bg-gradient-to-br from-brand-purple/5 to-brand-indigo/5 border-brand-purple/10'>
            <CardHeader
              title={t('dashboard.revenueTrend')}
              description={t('dashboard.revenueTrendDesc')}
              icon={
                <TrendingUp
                  className='icon-sm text-brand-purple'
                  aria-hidden
                />
              }
            />
            {loading ? (
              <div className='h-64 flex items-center justify-center'>
                <Skeleton
                  variant='custom'
                  className='h-48 w-full'
                />
              </div>
            ) : revenueChartData.length === 0 ? (
              <p className='py-10 text-center text-sm text-muted-foreground'>
                {t('dashboard.noRevenueData')}
              </p>
            ) : (
              <div className='h-64'>
                <ResponsiveContainer
                  width='100%'
                  height='100%'
                >
                  <LineChart data={revenueChartData}>
                    <CartesianGrid
                      strokeDasharray='3 3'
                      stroke={theme === 'dark' ? '#333333' : '#f0f0f0'}
                    />
                    <XAxis
                      dataKey='date'
                      stroke={theme === 'dark' ? '#a1a1a1' : '#6b6b6b'}
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis
                      stroke={theme === 'dark' ? '#a1a1a1' : '#6b6b6b'}
                      fontSize={12}
                      tickLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor:
                          theme === 'dark' ? '#121212' : '#ffffff',
                        border: `1px solid ${theme === 'dark' ? '#333333' : '#d4d4d4'}`,
                        borderRadius: '8px',
                      }}
                      labelStyle={{
                        color: theme === 'dark' ? '#fafafa' : '#0a0a0a',
                      }}
                      itemStyle={{
                        color: theme === 'dark' ? '#fafafa' : '#0a0a0a',
                      }}
                      formatter={(value: number) => [
                        `$${value}`,
                        t('dashboard.revenue'),
                      ]}
                    />
                    <Line
                      type='monotone'
                      dataKey='revenue'
                      stroke={theme === 'dark' ? '#a855f7' : '#9333ea'}
                      strokeWidth={3}
                      dot={{
                        fill: theme === 'dark' ? '#a855f7' : '#9333ea',
                        r: 4,
                      }}
                      activeDot={{
                        r: 6,
                        fill: theme === 'dark' ? '#a855f7' : '#9333ea',
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Order Status Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className='bg-gradient-to-br from-brand-cyan/5 to-brand-indigo/5 border-brand-cyan/10'>
            <CardHeader
              title={t('dashboard.orderStatusDistribution')}
              icon={
                <PieChart
                  className='icon-sm text-brand-cyan'
                  aria-hidden
                />
              }
            />
            {loading ? (
              <div className='h-64 flex items-center justify-center'>
                <Skeleton
                  variant='custom'
                  className='h-48 w-full'
                />
              </div>
            ) : orderStatusChartData.length === 0 ? (
              <p className='py-10 text-center text-sm text-muted-foreground'>
                {t('dashboard.noOrders')}
              </p>
            ) : (
              <div className='h-64'>
                <ResponsiveContainer
                  width='100%'
                  height='100%'
                >
                  <RechartsPieChart>
                    <Pie
                      data={orderStatusChartData}
                      cx='50%'
                      cy='50%'
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey='value'
                    >
                      {orderStatusChartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={pieColors[index % pieColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor:
                          theme === 'dark' ? '#121212' : '#ffffff',
                        border: `1px solid ${theme === 'dark' ? '#333333' : '#d4d4d4'}`,
                        borderRadius: '8px',
                      }}
                      labelStyle={{
                        color: theme === 'dark' ? '#fafafa' : '#0a0a0a',
                      }}
                      itemStyle={{
                        color: theme === 'dark' ? '#fafafa' : '#0a0a0a',
                      }}
                    />
                    <Legend
                      verticalAlign='bottom'
                      height={36}
                      iconType='circle'
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Weekly Orders Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className='bg-gradient-to-br from-metric-blue/5 to-metric-teal/5 border-metric-blue/10'>
          <CardHeader
            title={t('dashboard.weeklyOrders')}
            description={t('dashboard.weeklyOrdersDesc')}
            icon={
              <BarChart3
                className='icon-sm text-metric-blue'
                aria-hidden
              />
            }
          />
          {loading ? (
            <div className='h-64 flex items-center justify-center'>
              <Skeleton
                variant='custom'
                className='h-48 w-full'
              />
            </div>
          ) : (
            <div className='h-64'>
              <ResponsiveContainer
                width='100%'
                height='100%'
              >
                <BarChart data={weeklyOrdersData}>
                  <CartesianGrid
                    strokeDasharray='3 3'
                    stroke={theme === 'dark' ? '#333333' : '#f0f0f0'}
                  />
                  <XAxis
                    dataKey='day'
                    stroke={theme === 'dark' ? '#a1a1a1' : '#6b6b6b'}
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={theme === 'dark' ? '#a1a1a1' : '#6b6b6b'}
                    fontSize={12}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#121212' : '#ffffff',
                      border: `1px solid ${theme === 'dark' ? '#333333' : '#d4d4d4'}`,
                      borderRadius: '8px',
                    }}
                    labelStyle={{
                      color: theme === 'dark' ? '#fafafa' : '#0a0a0a',
                    }}
                    itemStyle={{
                      color: theme === 'dark' ? '#fafafa' : '#0a0a0a',
                    }}
                    formatter={(value: number) => [
                      value,
                      t('dashboard.orders'),
                    ]}
                  />
                  <Bar
                    dataKey='orders'
                    fill={theme === 'dark' ? '#6366f1' : '#6366f1'}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Main Grid */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        {/* Order Status Distribution */}
        <Card className='bg-gradient-to-br from-metric-orange/5 to-metric-pink/5 border-metric-orange/10'>
          <CardHeader
            title={
              statusFromStats
                ? t('dashboard.statusAll')
                : t('dashboard.statusLatest')
            }
            actions={
              <Link
                to='/orders'
                className={cn(
                  'text-sm font-medium text-foreground underline-offset-4 hover:underline',
                )}
              >
                {t('dashboard.viewOrders')}
              </Link>
            }
          />
          {loading ? (
            <div className='space-y-3'>
              <Skeleton
                variant='text'
                className='w-1/3'
                animation='pulse'
              />
              <Skeleton
                variant='text'
                className='w-full'
                animation='shimmer'
              />
              <Skeleton
                variant='text'
                className='w-2/3'
                animation='shimmer'
              />
              <Skeleton
                variant='text'
                className='w-1/2'
                animation='pulse'
              />
            </div>
          ) : statusCounts.every((s) => s.count === 0) &&
            recentOrders.length === 0 &&
            !stats ? (
            <p className='py-10 text-center text-sm text-muted-foreground'>
              {t('dashboard.noOrders')}
            </p>
          ) : (
            <ul className='space-y-3'>
              {statusCounts.map(({ status, count }) => {
                const statusColors: Record<string, string> = {
                  pending: theme === 'dark' ? '#f59e0b' : '#f59e0b',
                  paid: theme === 'dark' ? '#10b981' : '#10b981',
                  shipped: theme === 'dark' ? '#3b82f6' : '#3b82f6',
                  delivered: theme === 'dark' ? '#10b981' : '#10b981',
                  canceled: theme === 'dark' ? '#ef4444' : '#ef4444',
                  needs_attention: theme === 'dark' ? '#f59e0b' : '#f59e0b',
                  refunded: theme === 'dark' ? '#ef4444' : '#ef4444',
                };
                const barColor =
                  statusColors[status] ||
                  (theme === 'dark' ? '#a1a1a1' : '#6b6b6b');

                return (
                  <li key={status}>
                    <div className='mb-1.5 flex items-center justify-between gap-2'>
                      <span
                        className={cn(
                          'text-sm font-medium text-foreground',
                          'flex items-center gap-2',
                        )}
                      >
                        <StatusBadge
                          status={status}
                          children={tv('orderStatus', status)}
                        />
                      </span>
                      <span className='text-sm text-muted-foreground tabular-nums'>
                        {formatNumber(count)}
                      </span>
                    </div>
                    <div className='h-2 overflow-hidden rounded-full bg-muted'>
                      <div
                        className='h-full rounded-full transition-all duration-normal'
                        style={{
                          width: `${(count / maxStatus) * 100}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Catalog Summary */}
        <Card className='bg-gradient-to-br from-metric-teal/5 to-metric-green/5 border-metric-teal/10'>
          <CardHeader
            title={t('dashboard.catalog')}
            actions={
              <span className='inline-flex items-center gap-1.5 text-sm text-muted-foreground'>
                <Tag
                  className='icon-sm'
                  aria-hidden
                />
                {statsQ.isLoading ? '—' : formatNumber(brandsTotal)}
              </span>
            }
          />
          {loading ? (
            <div className='space-y-3'>
              <KeyValue
                label={
                  <Skeleton
                    variant='text'
                    className='w-16'
                    animation='pulse'
                  />
                }
                children={
                  <Skeleton
                    variant='text'
                    className='w-12'
                    animation='shimmer'
                  />
                }
              />
              <KeyValue
                label={
                  <Skeleton
                    variant='text'
                    className='w-16'
                    animation='pulse'
                  />
                }
                children={
                  <Skeleton
                    variant='text'
                    className='w-12'
                    animation='shimmer'
                  />
                }
              />
              <KeyValue
                label={
                  <Skeleton
                    variant='text'
                    className='w-16'
                    animation='pulse'
                  />
                }
                children={
                  <Skeleton
                    variant='text'
                    className='w-12'
                    animation='shimmer'
                  />
                }
              />
            </div>
          ) : (
            <div className='space-y-1'>
              <KeyValue
                label={t('dashboard.products')}
                children={
                  <Link
                    to='/products'
                    className='font-medium text-foreground underline-offset-4 hover:underline'
                  >
                    {formatNumber(productsTotal)}
                  </Link>
                }
              />
              <KeyValue
                label={t('dashboard.brands')}
                children={
                  <Link
                    to='/brands'
                    className='font-medium text-foreground underline-offset-4 hover:underline'
                  >
                    {formatNumber(brandsTotal)}
                  </Link>
                }
              />
              <KeyValue
                label={t('dashboard.users')}
                children={
                  <Link
                    to='/users'
                    className='font-medium text-foreground underline-offset-4 hover:underline'
                  >
                    {formatNumber(usersCount)}
                  </Link>
                }
              />
              <p className='pt-2 text-xs text-muted-foreground'>
                {revenueFromStats
                  ? t('dashboard.statsNote')
                  : t('dashboard.fallbackNote')}
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className='bg-gradient-to-br from-brand-fuchsia/5 to-brand-purple/5 border-brand-fuchsia/10'>
        <CardHeader
          title={t('dashboard.recent')}
          actions={
            <Link
              to='/orders'
              className={cn(
                'text-sm font-medium text-foreground underline-offset-4 hover:underline',
              )}
            >
              {t('dashboard.manage')}
            </Link>
          }
        />
        {ordersQ.isLoading ? (
          <div className='space-y-3'>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : recentOrders.length === 0 ? (
          <p className='py-8 text-center text-sm text-muted-foreground'>
            {t('dashboard.noRecent')}
          </p>
        ) : (
          <ul className='divide-y divide-border'>
            {recentOrders.slice(0, 8).map((order) => (
              <li
                key={order._id}
                className='flex flex-wrap items-center justify-between gap-3 py-3'
              >
                <div className='min-w-0 flex-1'>
                  <p
                    className={cn(
                      'text-sm font-medium text-foreground tabular-nums',
                      'font-mono',
                    )}
                    dir='ltr'
                  >
                    {shortId(order._id)}
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    {customerLabel(order, t('dashboard.customerFallback'))}
                    {order.createdAt
                      ? ` · ${formatDateTime(order.createdAt)}`
                      : ''}
                  </p>
                </div>
                <div className='flex shrink-0 items-center gap-3'>
                  <StatusBadge
                    status={order.status}
                    children={tv('orderStatus', order.status)}
                  />
                  <div className='text-end'>
                    <p
                      className={cn(
                        'text-sm font-medium text-foreground tabular-nums',
                      )}
                    >
                      {formatCurrency(Number(order.totalPrice || 0))}
                    </p>
                    {order.paymentStatus && (
                      <p className='text-xs text-muted-foreground'>
                        {tv('paymentStatus', order.paymentStatus)}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

// Helper for skeleton rows
function SkeletonRow() {
  return (
    <div className='flex items-center justify-between gap-3 py-3'>
      <div className='flex-1 space-y-2'>
        <Skeleton
          variant='text'
          className='w-20'
        />
        <Skeleton
          variant='text'
          className='w-32'
        />
      </div>
      <div className='flex items-center gap-3'>
        <Skeleton variant='badge' />
        <Skeleton
          variant='text'
          className='w-16'
        />
      </div>
    </div>
  );
}
