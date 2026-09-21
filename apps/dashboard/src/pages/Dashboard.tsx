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

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function shortId(id: string) {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function customerLabel(order: AdminOrder) {
  if (order.user && typeof order.user === 'object') {
    return order.user.email || order.user.username || 'Customer';
  }
  return typeof order.user === 'string' ? order.user : 'Customer';
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
      label: 'Users',
      value: loading && statsQ.isLoading ? '—' : String(usersCount),
      icon: Users,
      href: '/users',
      hint: 'From GET /admin/stats',
      iconWrap: 'bg-blue-100 dark:bg-blue-900',
      iconClass: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Products',
      value: loading && statsQ.isLoading ? '—' : String(productsTotal),
      icon: Package,
      href: '/products',
      hint: 'Catalog total (incl. inactive)',
      iconWrap: 'bg-emerald-100 dark:bg-emerald-900',
      iconClass: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Orders',
      value:
        loading && (statsQ.isLoading || ordersQ.isLoading)
          ? '—'
          : String(ordersTotal),
      icon: ShoppingCart,
      href: '/orders',
      hint: 'All-time order count',
      iconWrap: 'bg-violet-100 dark:bg-violet-900',
      iconClass: 'text-violet-600 dark:text-violet-400',
    },
    {
      label: revenueFromStats ? 'Paid revenue' : 'Paid revenue (sample)',
      value:
        loading && (statsQ.isLoading || (!revenueFromStats && ordersQ.isLoading))
          ? '—'
          : formatMoney(paidRevenue),
      icon: DollarSign,
      href: '/orders',
      hint: revenueFromStats
        ? 'Sum of all paid-like orders'
        : `Sum of paid-like orders in latest ${recentOrders.length}`,
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
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Live counts from admin APIs — not mock data.
          </p>
        </div>
        <button
          type="button"
          onClick={refetchAll}
          className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${
              statsQ.isFetching || ordersQ.isFetching ? 'animate-spin' : ''
            }`}
          />
          Refresh
        </button>
      </div>

      {anyError && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          Some metrics failed to load.
          {statsQ.isError && (
            <span className="block">
              Stats: {errorMessage(statsQ.error, 'error')}
            </span>
          )}
          {ordersQ.isError && (
            <span className="block">
              Orders: {errorMessage(ordersQ.error, 'error')}
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
                    <Icon className={`h-6 w-6 ${stat.iconClass}`} />
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
                ? 'Order status (all orders)'
                : 'Order status (latest 50)'}
            </h2>
            <Link
              to="/orders"
              className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              View orders
            </Link>
          </div>
          {statsQ.isLoading && !statusFromStats && ordersQ.isLoading ? (
            <p className="py-10 text-center text-sm text-gray-500">Loading…</p>
          ) : statusCounts.every((s) => s.count === 0) &&
            recentOrders.length === 0 &&
            !stats ? (
            <p className="py-10 text-center text-sm text-gray-500">
              No orders yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {statusCounts.map(({ status, count }) => (
                <li key={status}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium capitalize text-gray-800 dark:text-gray-200">
                      {status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-gray-500">{count}</span>
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
              Catalog snapshot
            </h2>
            <span className="inline-flex items-center gap-1 text-sm text-gray-500">
              <Tag className="h-4 w-4" />
              Brands: {statsQ.isLoading ? '—' : brandsTotal}
            </span>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/50">
              <dt className="text-gray-600 dark:text-gray-400">Products</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">
                <Link to="/products" className="hover:underline">
                  {productsTotal}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/50">
              <dt className="text-gray-600 dark:text-gray-400">Brands</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">
                <Link to="/brands" className="hover:underline">
                  {brandsTotal}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/50">
              <dt className="text-gray-600 dark:text-gray-400">Users</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">
                <Link to="/users" className="hover:underline">
                  {usersCount}
                </Link>
              </dd>
            </div>
            <p className="pt-2 text-xs text-gray-400">
              {revenueFromStats
                ? 'Metrics from GET /admin/stats — paid revenue includes all paid-like orders.'
                : 'Stats API unavailable — revenue falls back to the latest orders page.'}
            </p>
          </dl>
        </section>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Recent orders
          </h2>
          <Link
            to="/orders"
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Manage
          </Link>
        </div>
        {ordersQ.isLoading ? (
          <p className="py-8 text-center text-sm text-gray-500">Loading orders…</p>
        ) : recentOrders.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">No recent orders.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentOrders.slice(0, 8).map((order) => (
              <li
                key={order._id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div>
                  <p className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                    {shortId(order._id)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {customerLabel(order)}
                    {order.createdAt
                      ? ` · ${new Date(order.createdAt).toLocaleString()}`
                      : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    ${Number(order.totalPrice || 0).toFixed(2)}
                  </p>
                  <p className="text-xs capitalize text-gray-500">
                    {order.status}
                    {order.paymentStatus ? ` · ${order.paymentStatus}` : ''}
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
