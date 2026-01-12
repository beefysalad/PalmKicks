"use client";

import { useState, useMemo } from "react";
import { getOrders } from "@/lib/orders";
import { usePagination } from "@/lib/hooks/usePagination";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import Link from "next/link";
import type { Order } from "@/lib/orders";

const ITEMS_PER_PAGE = 10;

const OrdersListPage = () => {
  const [orders] = useState<Order[]>(() => getOrders());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: Order["status"]) => {
    const colors = {
      pending: "bg-yellow-500/10 text-yellow-600",
      confirmed: "bg-blue-500/10 text-blue-600",
      processing: "bg-purple-500/10 text-purple-600",
      shipped: "bg-indigo-500/10 text-indigo-600",
      delivered: "bg-green-500/10 text-green-600",
    };
    return colors[status] || colors.pending;
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        filterStatus === "all" || order.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, filterStatus]);

  const { currentPage, totalPages, paginatedItems: paginatedOrders, handlePageChange } = usePagination({
    items: filteredOrders,
    itemsPerPage: ITEMS_PER_PAGE,
    resetDeps: [searchQuery, filterStatus],
  });

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold'>Orders</h1>
        <p className='text-muted-foreground'>View and manage customer orders</p>
      </div>

      <div className='space-y-4 rounded-lg border bg-card p-4'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='Search by order ID, customer name, or email...'
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            className='pl-9'
          />
        </div>
        <div>
          <label className='mb-1 block text-sm font-medium'>Status</label>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
            }}
            className='rounded-md border border-input bg-background px-3 py-2 text-sm'
          >
            <option value='all'>All Statuses</option>
            <option value='pending'>Pending</option>
            <option value='confirmed'>Confirmed</option>
            <option value='processing'>Processing</option>
            <option value='shipped'>Shipped</option>
            <option value='delivered'>Delivered</option>
          </select>
        </div>
      </div>

      <div className='rounded-lg border bg-card'>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b'>
                <th className='px-4 py-3 text-left text-sm font-medium'>
                  Order ID
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium'>
                  Customer
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium'>
                  Items
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium'>
                  Total
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium'>
                  Status
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium'>
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order) => (
                <tr key={order.id} className='border-b hover:bg-secondary/50'>
                  <td className='px-4 py-3'>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className='text-primary hover:underline'
                    >
                      {order.id}
                    </Link>
                  </td>
                  <td className='px-4 py-3'>
                    <div>
                      <div className='font-medium'>{order.customer.name}</div>
                      <div className='text-sm text-muted-foreground'>
                        {order.customer.email}
                      </div>
                    </div>
                  </td>
                  <td className='px-4 py-3'>
                    {order.items.length} item
                    {order.items.length !== 1 ? "s" : ""}
                  </td>
                  <td className='px-4 py-3 font-medium'>
                    {formatCurrency(order.total)}
                  </td>
                  <td className='px-4 py-3'>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className='px-4 py-3 text-sm text-muted-foreground'>
                    {formatDate(order.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredOrders.length === 0 && (
          <div className='py-12 text-center text-muted-foreground'>
            No orders found
          </div>
        )}
      </div>

      {filteredOrders.length > 0 && (
        <div className='flex items-center justify-between'>
          <p className='text-sm text-muted-foreground'>
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length} orders
          </p>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default OrdersListPage;
