import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  Tag,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useAdminOrders } from '../hooks/useAdminOrders';
import { useAdminStats } from '../hooks/useAdminStats';
import { errorMessage, type AdminOrder } from '../lib/api';
import { money } from '../lib/chartTheme';
import { intlLocale, useT } from '../i18n/I18nProvider';

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
  const { t, tv, locale, formatCurrency, formatDateTime, formatNumber } = useT();
  const formatMoney = (n: number) => money(n, intlLocale(locale));

  const recentOrders = ordersQ.data?.data ?? [];
  const stats = statsQ.data;

  const usersCount =
    stats?.users ?? 0;
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

  const cards = [
    {
      label: t('dashboard.users'),
      value: loading && statsQ.isLoading ? '—' : formatNumber(usersCount),
      icon: Users,
      href: '/users',
      hint: t('dashboard.usersHint'),
      iconWrap: 'bg-blue-100 dark:bg-blue-900',
      iconClass: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: t('dashboard.products'),
      value: loading && statsQ.isLoading ? '—' : formatNumber(productsTotal),
      icon: Package,
      href: '/products',
      hint: t('dashboard.productsHint'),
      iconWrap: 'bg-emerald-100 dark:bg-emerald-900',
      iconClass: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: t('dashboard.orders'),
      value:
        loading && (statsQ.isLoading || ordersQ.isLoading)
          ? '—'
          : formatNumber(ordersTotal),
      icon: ShoppingCart,
      href: '/orders',
      hint: t('dashboard.ordersHint'),
      iconWrap: 'bg-violet-100 dark:bg-violet-900',
      iconClass: 'text-violet-600 dark:text-violet-400',
    },
    {
      label: revenueFromStats ? t('dashboard.revenue') : t('dashboard.revenueSample'),
      value:
        loading && (statsQ.isLoading || (!revenueFromStats && ordersQ.isLoading))
          ? '—'
          : formatMoney(paidRevenue),
      icon: DollarSign,
      href: '/orders',
      hint: revenueFromStats
        ? t('dashboard.revenueHint')
        : t('dashboard.revenueSampleHint', { count: recentOrders.length }),
      iconWrap: 'bg-amber-100 dark:bg-amber-900',
      iconClass: 'text-amber-600 dark:text-amber-400',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('dashboard.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={refetchAll}
          className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <RefreshCw
            className={`me-2 h-4 w-4 ${
              statsQ.isFetching || ordersQ.isFetching ? 'animate-spin' : ''
            }`}
            aria-hidden
          />
          {t('dashboard.refresh')}
        </button>
      </div>

      {anyError && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          {t('dashboard.someFailed')}
          {statsQ.isError && (
            <span className="block">
              {t('dashboard.statsError', { message: errorMessage(statsQ.error, t('dashboard.error')) })}
            </span>
          )}
          {ordersQ.isError && (
            <span className="block">
              {t('dashboard.ordersError', { message: errorMessage(ordersQ.error, t('dashboard.error')) })}
            </span>
          )}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={stat.href}
                className="block rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-700"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className={`rounded-lg p-3 ${stat.iconWrap}`}>
                    <Icon className={`h-6 w-6 ${stat.iconClass}`} aria-hidden />
                  </div>
                  {loading && (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  )}
                </div>
                <h3 className="text-sm text-gray-600 dark:text-gray-400">
                  {stat.label}
                </h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-gray-400">{stat.hint}</p>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {statusFromStats
                ? t('dashboard.statusAll')
                : t('dashboard.statusLatest')}
            </h2>
            <Link
              to="/orders"
              className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              {t('dashboard.viewOrders')}
            </Link>
          </div>
          {statsQ.isLoading && !statusFromStats && ordersQ.isLoading ? (
            <p className="py-10 text-center text-sm text-gray-500">{t('dashboard.loading')}</p>
          ) : statusCounts.every((s) => s.count === 0) &&
            recentOrders.length === 0 &&
            !stats ? (
            <p className="py-10 text-center text-sm text-gray-500">
              {t('dashboard.noOrders')}
            </p>
          ) : (
            <ul className="space-y-3">
              {statusCounts.map(({ status, count }) => (
                <li key={status}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {tv('orderStatus', status)}
                    </span>
                    <span className="text-gray-500">{formatNumber(count)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${(count / maxStatus) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('dashboard.catalog')}
            </h2>
            <span className="inline-flex items-center gap-1 text-sm text-gray-500">
              <Tag className="h-4 w-4" aria-hidden />
              {t('dashboard.brandsCount', { count: statsQ.isLoading ? '—' : formatNumber(brandsTotal) })}
            </span>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/50">
              <dt className="text-gray-600 dark:text-gray-400">{t('dashboard.products')}</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">
                <Link to="/products" className="hover:underline">
                  {formatNumber(productsTotal)}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/50">
              <dt className="text-gray-600 dark:text-gray-400">{t('dashboard.brands')}</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">
                <Link to="/brands" className="hover:underline">
                  {formatNumber(brandsTotal)}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/50">
              <dt className="text-gray-600 dark:text-gray-400">{t('dashboard.users')}</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">
                <Link to="/users" className="hover:underline">
                  {formatNumber(usersCount)}
                </Link>
              </dd>
            </div>
            <p className="pt-2 text-xs text-gray-400">
              {revenueFromStats
                ? t('dashboard.statsNote')
                : t('dashboard.fallbackNote')}
            </p>
          </dl>
        </section>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('dashboard.recent')}
          </h2>
          <Link
            to="/orders"
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            {t('dashboard.manage')}
          </Link>
        </div>
        {ordersQ.isLoading ? (
          <p className="py-8 text-center text-sm text-gray-500">{t('dashboard.loadingOrders')}</p>
        ) : recentOrders.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">{t('dashboard.noRecent')}</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentOrders.slice(0, 8).map((order) => (
              <li
                key={order._id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div>
                  <p className="font-mono text-sm font-medium text-gray-900 dark:text-white" dir="ltr">
                    {shortId(order._id)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {customerLabel(order, t('dashboard.customerFallback'))}
                    {order.createdAt ? ` · ${formatDateTime(order.createdAt)}` : ''}
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(Number(order.totalPrice || 0))}
                  </p>
                  <p className="text-xs text-gray-500">
                    {tv('orderStatus', order.status)}
                    {order.paymentStatus ? ` · ${tv('paymentStatus', order.paymentStatus)}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </motion.div>
  );
}
