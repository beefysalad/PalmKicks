"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useOrders } from "@/lib/orders/hooks";
import { Search, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/order-status-badge";
import type { Order, OrderFilters } from "@/app/shared/types/order";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseOrderFilters, serializeOrderFilters, reconcileOrderFilterDraft, type OrderFilterDraft } from "@/lib/orders/filters-url";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { getApiErrorMessage } from "@/lib/api-error-message";

const ITEMS_PER_PAGE = 10;

const OrdersListPage = () => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams().toString();
  const filters = useMemo(() => parseOrderFilters(new URLSearchParams(params)), [params]);
  const url = serializeOrderFilters(filters);
  const [draftState, setDraftState] = useState<OrderFilterDraft>(() => ({ url, values: filters, pending: [], generation: 0 }));
  const draft = reconcileOrderFilterDraft(draftState, filters);
  if (draft !== draftState) setDraftState(draft);
  const searchQuery = draft.values.q ?? "";
  const searchValue = useMemo(() => ({ q: searchQuery, generation: draft.generation }), [searchQuery, draft.generation]);
  const debounced = useDebouncedValue(searchValue, 300);
  const navigate = useCallback((next: OrderFilters) => {
    const target = serializeOrderFilters(next);
    setDraftState((current) => ({ ...current, values: next,
      pending: target !== url && !current.pending.includes(target) ? [...current.pending, target] : current.pending,
      navigation: target !== url || current.pending.length > 0 ? target : undefined,
    }));
  }, [url]);
  useEffect(() => {
    if (draft.navigation !== undefined) {
      router.replace(`${pathname}${draft.navigation ? `?${draft.navigation}` : ""}`, { scroll: false });
    }
  }, [draft.navigation, pathname, router]);
  const setFilters = (patch: Partial<OrderFilters>) => navigate({ ...draft.values, ...patch, page: 1 });
  const currentPage = filters.page ?? 1;
  const pageSize = filters.pageSize ?? ITEMS_PER_PAGE;
  const { data, isLoading, isFetching, isPlaceholderData, isError, error, refetch } = useOrders({
    ...filters, pageSize,
  });
  const orders = data?.items ?? [];
  const totalOrders = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize));
  const isUpdating = isFetching || serializeOrderFilters(draft.values) !== url;
  const handlePageChange = (page: number) => navigate({ ...draft.values,
    page: searchQuery.trim() !== (filters.q ?? "") ? 1 : Math.min(Math.max(1, page), totalPages),
  });
  // Record automatic navigations while deriving state; the effect above only
  // synchronizes the router, without calling a state setter from an effect.
  const q = debounced.q.trim() || undefined;
  const searchReady = debounced.generation === draft.generation && debounced.q === searchQuery && q !== filters.q;
  const clampReady = data && !isUpdating && !isPlaceholderData && data.page === currentPage && currentPage > totalPages;
  const automatic = searchReady ? { ...draft.values, q, page: 1 } : clampReady ? { ...filters, page: totalPages } : undefined;
  if (automatic) {
    const target = serializeOrderFilters(automatic);
    if (!draft.pending.includes(target)) setDraftState({ ...draft, values: automatic, pending: [...draft.pending, target], navigation: target });
  }

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



  return (
    <div className='min-h-screen bg-background pb-4'>
      {/* Header */}
      <div className='sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        <div className='p-4'>
          <h1 className='text-2xl font-bold'>Orders</h1>
          <p className='text-sm text-muted-foreground'>
            {isUpdating ? "Updating results…" : isError ? "Results unavailable" : `${totalOrders} ${totalOrders === 1 ? "order" : "orders"}`}
          </p>
        </div>

        {/* Search Bar */}
        <div className='px-4 pb-3'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Search all orders…'
              aria-label='Search orders by id, customer name, email or phone'
              maxLength={100}
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setDraftState((current) => ({ ...current, values: { ...current.values, q: value, page: 1 } }));
              }}
              className='pl-9'
            />
          </div>
        </div>

        {/* Filters */}
          <div className='border-t bg-muted/30 p-4 space-y-3'>
            <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
            <div>
              <label htmlFor='status-filter' className='mb-1.5 block text-xs font-medium text-muted-foreground'>
                Order Status
              </label>
              <select
                id='status-filter'
                value={draft.values.status ?? "all"}
                onChange={(e) => setFilters({ status: e.target.value === "all" ? undefined : e.target.value as Order["status"] })}
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
            <div>
              <label htmlFor='payment-filter' className='mb-1.5 block text-xs font-medium text-muted-foreground'>Payment</label>
              <select id='payment-filter' value={draft.values.paymentStatus ?? "all"}
                onChange={(e) => setFilters({ paymentStatus: e.target.value === "all" ? undefined : e.target.value as Order["paymentStatus"] })}
                className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm'>
                <option value='all'>All payments</option><option value='unpaid'>Unpaid</option><option value='paid'>Paid</option><option value='refunded'>Refunded</option>
              </select>
            </div>
            <div>
              <label htmlFor='from-filter' className='mb-1.5 block text-xs font-medium text-muted-foreground'>From</label>
              <Input id='from-filter' type='date' className='min-w-0' value={draft.values.from ?? ""} aria-describedby='date-filter-help'
                onChange={(e) => setFilters({ from: e.target.value || undefined })} />
            </div>
            <div>
              <label htmlFor='to-filter' className='mb-1.5 block text-xs font-medium text-muted-foreground'>To</label>
              <Input id='to-filter' type='date' className='min-w-0' value={draft.values.to ?? ""} aria-describedby='date-filter-help'
                onChange={(e) => setFilters({ to: e.target.value || undefined })} />
            </div>
            </div>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <p id='date-filter-help' className='text-xs text-muted-foreground'>Dates use Manila time (UTC+8), including both selected days.</p>
              <Button variant='ghost' size='sm' onClick={() => navigate({ page: 1 })}>Clear filters</Button>
            </div>
          </div>
      </div>

      {/* Orders List */}
      <div className='space-y-3 p-4' aria-busy={isUpdating}>
        {isLoading ? <p role='status' className='py-12 text-center text-muted-foreground'>Loading orders…</p>
        : isError ? <div role='alert' className='space-y-3 py-8 text-center'>
          <p className='text-destructive'>{getApiErrorMessage(error, "Could not load orders")}</p>
          <Button variant='outline' onClick={() => void refetch()}>Try again</Button>
        </div> : orders.length === 0 ? (
          <div className='py-12 text-center'>
            <Package className='mx-auto h-12 w-12 text-muted-foreground/50 mb-4' />
            <p className='text-muted-foreground'>No orders found</p>
          </div>
        ) : (
          orders.map((order) => (
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
      {!isUpdating && !isError && totalOrders > 0 && totalPages > 1 && (
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
