'use client';

import { useMyOrders } from '@/hooks/orders/ordersQuery';
import { ArrowRight, Calendar, Hash, FolderOpen, ExternalLink } from 'lucide-react';
import type { OrderStatus, PaymentStatus } from '@/types';

export default function OrdersContent() {
  const { data: orders, isLoading, error } = useMyOrders();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const statusClass = (status: OrderStatus) => {
    const classes = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-emerald-100 text-emerald-800',
      shipped: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      canceled: 'bg-red-100 text-red-800',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  };

  const statusLabel = (status: OrderStatus) => {
    const labels = {
      pending: 'Pending',
      paid: 'Paid',
      shipped: 'Shipped',
      delivered: 'Delivered',
      canceled: 'Canceled',
    };
    return labels[status] || status;
  };

  const paymentBadgeClass = (status?: PaymentStatus) => {
    const classes = {
      unpaid: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-emerald-100 text-emerald-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-orange-100 text-orange-800',
    };
    return classes[status || 'unpaid'] || 'bg-gray-100 text-gray-800';
  };

  const paymentBadgeLabel = (status?: PaymentStatus) => {
    const labels = {
      unpaid: 'Unpaid',
      pending: 'Pending',
      paid: 'Paid',
      failed: 'Failed',
      refunded: 'Refunded',
    };
    return labels[status || 'unpaid'] || status;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        Failed to load orders
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <Hash className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h2>
        <p className="text-gray-600">
          Your order history will appear here once you make a purchase.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                Order
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                Payment
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order._id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Hash className="w-4 h-4" />
                    <span className="font-semibold text-gray-900">
                      #{order._id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass(
                      order.status
                    )}`}
                  >
                    {statusLabel(order.status)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentBadgeClass(
                      order.paymentStatus
                    )}`}
                  >
                    {paymentBadgeLabel(order.paymentStatus)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-semibold text-gray-900">
                    ${order.totalPrice.toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <a
                    href={`/orders/${order._id}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-fuchsia-600 hover:text-fuchsia-700 transition"
                  >
                    View <ArrowRight className="w-4 h-4" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 rounded-lg p-6 text-white">
        <h3 className="font-bold mb-2">Need help with your orders?</h3>
        <p className="text-white/90 text-sm mb-4">
          If you have questions about your orders, please check our FAQ or contact support.
        </p>
        <div className="flex gap-3">
          <a
            href="/faq"
            className="inline-flex items-center gap-2 bg-white text-fuchsia-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition text-sm"
          >
            <FolderOpen className="w-4 h-4" />
            View FAQ
          </a>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg font-semibold hover:bg-white/30 transition text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
