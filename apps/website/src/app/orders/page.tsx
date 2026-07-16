'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Loader2,
  Receipt,
  ArrowRight,
  ExternalLink,
  FolderOpen,
} from 'lucide-react';
import { useMyOrders } from '@/hooks/orders/ordersQuery';
import {
  getUserFacingErrorMessage,
  logErrorForDev,
} from '@/lib/userFacingError';

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return value;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'paid':
      return 'Paid';
    case 'shipped':
      return 'Shipped';
    case 'delivered':
      return 'Delivered';
    case 'canceled':
      return 'Canceled';
    default:
      return status;
  }
}

function paymentBadgeClass(paymentStatus?: string) {
  const p = paymentStatus ?? 'pending';
  switch (p) {
    case 'paid':
      return 'bg-emerald-100 text-emerald-700';
    case 'failed':
    case 'refunded':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-amber-100 text-amber-700';
  }
}

function paymentBadgeLabel(paymentStatus?: string) {
  const p = paymentStatus ?? 'pending';
  switch (p) {
    case 'paid':
      return 'Paid';
    case 'pending':
    case 'unpaid':
      return 'Awaiting payment';
    case 'failed':
      return 'Payment failed';
    case 'refunded':
      return 'Refunded';
    default:
      return p;
  }
}

function statusClass(status: string) {
  switch (status) {
    case 'paid':
    case 'delivered':
      return 'bg-emerald-100 text-emerald-700';
    case 'shipped':
      return 'bg-cyan-100 text-cyan-700';
    case 'canceled':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-amber-100 text-amber-700';
  }
}

export default function OrdersPage() {
  const q = useMyOrders();
  const orders = q.data || [];

  if (q.isLoading) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='animate-pulse'>
            <div className='h-8 bg-gray-200 rounded w-48 mb-8'></div>
            <div className='h-64 bg-gray-200 rounded'></div>
          </div>
        </div>
      </div>
    );
  }

  if (q.error) {
    logErrorForDev(q.error);
    const msg = getUserFacingErrorMessage(q.error, 'Failed to load orders');
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='bg-red-50 border border-red-200 rounded-lg p-4 text-red-800'>
            {msg}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Breadcrumb */}
        <nav className='flex items-center gap-2 text-sm text-gray-600 mb-8'>
          <Link
            href='/'
            className='hover:text-fuchsia-600'
          >
            Home
          </Link>
          <span>/</span>
          <span className='text-gray-900'>My Orders</span>
        </nav>

        <div className='flex gap-8'>
          {/* Sidebar */}
          <aside className='w-64 flex-shrink-0 hidden lg:block'>
            <div className='bg-white rounded-lg border border-gray-200 p-4 sticky top-8'>
              <h3 className='font-bold text-gray-900 mb-4'>Account</h3>
              <nav className='space-y-1'>
                <Link
                  href='/profile'
                  className='block px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-fuchsia-600 transition'
                >
                  Profile
                </Link>
                <Link
                  href='/orders'
                  className='block px-4 py-2 rounded-lg bg-fuchsia-50 text-fuchsia-700 font-semibold'
                >
                  Orders
                </Link>
                <Link
                  href='/downloads'
                  className='block px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-fuchsia-600 transition'
                >
                  Downloads
                </Link>
                <Link
                  href='/wishlist'
                  className='block px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-fuchsia-600 transition'
                >
                  Wishlist
                </Link>
                <Link
                  href='/reviews'
                  className='block px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-fuchsia-600 transition'
                >
                  Reviews
                </Link>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <div className='flex-1'>
            <h1 className='text-2xl font-bold text-gray-900 mb-6'>My Orders</h1>

            {orders.length === 0 ? (
              <div className='bg-white rounded-lg border border-gray-200 p-12 text-center'>
                <div className='mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-fuchsia-100 text-fuchsia-600 mb-4'>
                  <Receipt className='h-6 w-6' />
                </div>
                <h2 className='text-xl font-semibold text-gray-900 mb-2'>
                  No orders yet
                </h2>
                <p className='text-gray-600 mb-6'>
                  Start browsing templates and place your first order.
                </p>
                <Link
                  href='/'
                  className='inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 text-white font-semibold rounded-lg hover:brightness-110 transition'
                >
                  Browse templates
                </Link>
              </div>
            ) : (
              <>
                <div className='bg-white rounded-lg border border-gray-200 overflow-hidden'>
                  <table className='w-full'>
                    <thead className='bg-gray-50 border-b border-gray-200'>
                      <tr>
                        <th className='px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider'>
                          Order
                        </th>
                        <th className='px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider'>
                          Date
                        </th>
                        <th className='px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider'>
                          Status
                        </th>
                        <th className='px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider'>
                          Payment
                        </th>
                        <th className='px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider'>
                          Total
                        </th>
                        <th className='px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider'>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-200'>
                      {orders.map((o) => (
                        <tr
                          key={o._id}
                          className='hover:bg-gray-50 transition'
                        >
                          <td className='px-6 py-4'>
                            <div className='font-semibold text-gray-900'>
                              #{o._id.slice(-6).toUpperCase()}
                            </div>
                          </td>
                          <td className='px-6 py-4'>
                            <div className='text-sm text-gray-600'>
                              {formatDate(o.createdAt)}
                            </div>
                          </td>
                          <td className='px-6 py-4'>
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusClass(
                                o.status,
                              )}`}
                            >
                              {statusLabel(o.status)}
                            </span>
                          </td>
                          <td className='px-6 py-4'>
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${paymentBadgeClass(
                                o.paymentStatus,
                              )}`}
                            >
                              {paymentBadgeLabel(o.paymentStatus)}
                            </span>
                          </td>
                          <td className='px-6 py-4'>
                            <div className='font-semibold text-gray-900'>
                              ${o.totalPrice.toFixed(2)}
                            </div>
                          </td>
                          <td className='px-6 py-4'>
                            <Link
                              href={`/orders/${o._id}`}
                              className='inline-flex items-center gap-1 text-sm font-semibold text-fuchsia-600 hover:text-fuchsia-700 transition'
                            >
                              View
                              <ArrowRight className='w-4 h-4' />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Help Section */}
                <div className='mt-8 bg-gradient-to-br from-fuchsia-600 via-purple-600 to-cyan-500 rounded-lg p-6 text-white'>
                  <h3 className='font-bold mb-2'>
                    Need help with your orders?
                  </h3>
                  <p className='text-white/90 text-sm mb-4'>
                    If you have questions about your order status or payment,
                    please check our FAQ or contact support.
                  </p>
                  <div className='flex gap-3'>
                    <Link
                      href='/faq'
                      className='inline-flex items-center gap-2 bg-white text-fuchsia-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition text-sm'
                    >
                      <FolderOpen className='w-4 h-4' />
                      View FAQ
                    </Link>
                    <Link
                      href='/contact'
                      className='inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg font-semibold hover:bg-white/30 transition text-sm'
                    >
                      <ExternalLink className='w-4 h-4' />
                      Contact Support
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
