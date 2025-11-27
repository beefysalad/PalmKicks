"use client";

import { useState, useMemo } from "react";
import { useOrders } from "@/lib/orders/hooks";
import { Search, SlidersHorizontal, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/order-status-badge";
import { Order } from "@/app/shared/types/order";

const ITEMS_PER_PAGE = 10;

const OrdersListPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading } = useOrders({
    page: currentPage,
    pageSize: ITEMS_PER_PAGE,
    ...(filterStatus !== "all"
      ? { status: filterStatus as Order["status"] }
      : {}),
  });
  const orders = useMemo(() => data?.items ?? [], [data]);
  const totalOrders = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalOrders / ITEMS_PER_PAGE));
  const handlePageChange = (page: number) =>
    setCurrentPage(Math.min(Math.max(1, page), totalPages));

  // Total can shrink (e.g. after a delete): never sit past the last page.
  // Adjusting state during render is the supported way to derive it.
  if (data && currentPage > totalPages) setCurrentPage(totalPages);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };



  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [orders, searchQuery]);

  if (isLoading) {
    return (
      <div className='space-y-4 p-4'>
        <div>
          <h1 className='text-2xl font-bold'>Orders</h1>
          <p className='text-sm text-muted-foreground'>
            View and manage customer orders
          </p>
        </div>
        <div className='py-12 text-center text-muted-foreground'>
          Loading orders...
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-background pb-4'>
      {/* Header */}
      <div className='sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        <div className='p-4'>
          <h1 className='text-2xl font-bold'>Orders</h1>
          <p className='text-sm text-muted-foreground'>
            {totalOrders} {totalOrders === 1 ? "order" : "orders"}
          </p>
        </div>

        {/* Search Bar */}
        <div className='px-4 pb-3'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Search orders on this page...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-9 pr-12'
            />
            <Button
              variant='ghost'
              size='sm'
              className='absolute right-1 top-1/2 h-7 -translate-y-1/2'
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className='h-4 w-4' />
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className='border-t bg-muted/30 p-4'>
            <div>
              <label className='mb-1.5 block text-xs font-medium text-muted-foreground'>
                Order Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
              >
                <option value='all'>All Statuses</option>
                <option value='pending'>Pending</option>
                <option value='confirmed'>Confirmed</option>
                <option value='processing'>Processing</option>
                <option value='shipped'>Shipped</option>
                <option value='delivered'>Delivered</option>
                <option value='cancelled'>Cancelled</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Orders List */}
      <div className='space-y-3 p-4'>
        {filteredOrders.length === 0 ? (
          <div className='py-12 text-center'>
            <Package className='mx-auto h-12 w-12 text-muted-foreground/50 mb-4' />
            <p className='text-muted-foreground'>No orders found</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <Link
              key={order.id}
              href={`/admin/orders/${order.id}`}
              className='block rounded-lg border bg-card overflow-hidden transition-shadow hover:shadow-md active:scale-[0.98]'
            >
              <div className='p-4'>
                {/* Order Header */}
                <div className='flex items-start justify-between gap-3 mb-3'>
                  <div className='flex-1 min-w-0'>
                    <div className='font-mono text-sm font-semibold text-primary mb-1.5'>
                      #{order.id.toUpperCase()}
                    </div>
                    <div className='flex flex-wrap items-center gap-2 mb-1.5'>
                      <OrderStatusBadge status={order.status} />
                      <PaymentStatusBadge status={order.paymentStatus} />
                      <span className='text-xs text-muted-foreground'>
                        {formatDate(order.createdAt)} •{" "}
                        {formatTime(order.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className='text-right flex-shrink-0'>
                    <div className='font-bold text-lg'>
                      {formatCurrency(order.total)}
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                <div className='space-y-1 mb-3'>
                  <div className='font-medium text-sm'>
                    {order.customerName}
                  </div>
                  <div className='text-xs text-muted-foreground truncate'>
                    {order.customerEmail}
                  </div>
                </div>

                {/* Order Stats */}
                <div className='flex items-center justify-between pt-3 border-t'>
                  <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                    <Package className='h-3.5 w-3.5' />
                    <span>
                      {order.items.length}{" "}
                      {order.items.length === 1 ? "item" : "items"}
                    </span>
                  </div>
                  <div className='text-xs text-primary font-medium'>
                    View Details →
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalOrders > 0 && totalPages > 1 && (
        <div className='px-4 pb-4'>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
          <p className='text-center text-xs text-muted-foreground mt-2'>
            Page {currentPage} of {totalPages}
          </p>
        </div>
      )}
    </div>
  );
};

export default OrdersListPage;
