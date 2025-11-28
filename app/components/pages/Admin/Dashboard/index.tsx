"use client";

import { useProducts } from "@/lib/products/hooks";
import { useOrders, useOrderStats } from "@/lib/orders/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingBag, DollarSign, Clock, CreditCard, CircleX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/order-status-badge";
import { LOW_STOCK_THRESHOLD } from "@/lib/stock";

const DashboardPage = () => {
  const { data: products = [] } = useProducts();
  const { data: recentPage, isLoading: isLoadingOrders } = useOrders({
    page: 1,
    pageSize: 10,
  });
  const { data: orderStats, isLoading: isLoadingStats, isError: statsError } = useOrderStats();
  const recentOrders = recentPage?.items ?? [];

  const stats = {
    totalProducts: products.length,
    totalOrders: orderStats?.total ?? 0,
    totalRevenue: orderStats?.revenue ?? 0,
    pendingOrders: orderStats?.byStatus.pending ?? 0,
  };

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
    });
  };



  return (
    <div className='space-y-8'>
      <div>
        <h1 className='text-3xl font-bold'>Dashboard</h1>
        <p className='text-muted-foreground'>
          Overview of your store statistics
        </p>
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Products
            </CardTitle>
            <Package className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.totalProducts}</div>
            <p className='text-xs text-muted-foreground'>
              All products in store
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Orders</CardTitle>
            <ShoppingBag className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.totalOrders}</div>
            <p className='text-xs text-muted-foreground'>All time orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Paid revenue</CardTitle>
            <DollarSign className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className='text-xs text-muted-foreground'>Paid orders, excluding cancellations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Pending Orders
            </CardTitle>
            <Clock className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.pendingOrders}</div>
            <p className='text-xs text-muted-foreground'>Awaiting processing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'><CardTitle className='text-sm font-medium'>Unpaid orders</CardTitle><CreditCard className='h-4 w-4 text-muted-foreground' /></CardHeader>
          <CardContent><div className='text-2xl font-bold'>{orderStats?.unpaidOrders ?? 0}</div><p className='text-xs text-muted-foreground'>Active orders awaiting payment</p></CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'><CardTitle className='text-sm font-medium'>Cancelled orders</CardTitle><CircleX className='h-4 w-4 text-muted-foreground' /></CardHeader>
          <CardContent><div className='text-2xl font-bold'>{orderStats?.byStatus.cancelled ?? 0}</div><p className='text-xs text-muted-foreground'>Excluded from paid revenue</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>Recent Orders</CardTitle>
            <Button asChild variant='outline' size='sm'>
              <Link href='/admin/orders'>View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingOrders ? (
            <p className='py-8 text-center text-muted-foreground'>
              Loading orders...
            </p>
          ) : recentOrders.length > 0 ? (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b'>
                    <th className='px-4 py-2 text-left text-sm font-medium'>
                      Order ID
                    </th>
                    <th className='px-4 py-2 text-left text-sm font-medium'>
                      Customer
                    </th>
                    <th className='px-4 py-2 text-left text-sm font-medium'>
                      Total
                    </th>
                    <th className='px-4 py-2 text-left text-sm font-medium'>
                      Status
                    </th>
                    <th className='px-4 py-2 text-left text-sm font-medium'>
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className='border-b'>
                      <td className='px-4 py-2'>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className='text-primary hover:underline'
                        >
                          {order.id}
                        </Link>
                      </td>
                      <td className='px-4 py-2'>{order.customerName}</td>
                      <td className='px-4 py-2'>
                        {formatCurrency(order.total)}
                      </td>
                      <td className='px-4 py-2'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <OrderStatusBadge status={order.status} />
                          <PaymentStatusBadge status={order.paymentStatus} />
                        </div>
                      </td>
                      <td className='px-4 py-2'>
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className='py-8 text-center text-muted-foreground'>
              No orders yet
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Low stock</CardTitle>
          <p className="text-sm text-muted-foreground">Up to 20 size/color combinations with {LOW_STOCK_THRESHOLD} pairs or fewer, lowest first.</p>
        </CardHeader>
        <CardContent>
          {isLoadingStats ? <p className="text-sm text-muted-foreground">Loading stock…</p>
            : statsError ? <p className="text-sm text-destructive">Stock could not be loaded. Please refresh.</p>
            : orderStats?.lowStock.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Low stock by product, size and color</caption>
                  <thead><tr className="border-b text-left"><th scope="col" className="py-2 pr-4">Product</th><th scope="col" className="p-2">Size</th><th scope="col" className="p-2">Color</th><th scope="col" className="p-2 text-right">Pairs left</th></tr></thead>
                  <tbody>{orderStats.lowStock.map((v) => (
                    <tr key={JSON.stringify([v.productId, v.size, v.color])} className="border-b">
                      <td className="py-3 pr-4"><Link href={`/admin/products/${v.productId}`} className="font-medium text-primary hover:underline">{v.productName}</Link></td>
                      <td className="p-2">{v.size}</td><td className="p-2">{v.color}</td>
                      <td className="p-2 text-right font-medium tabular-nums">{v.stock === 0 ? "Sold out" : v.stock}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <p className="text-sm text-muted-foreground">No low-stock combinations.</p>}
        </CardContent>
      </Card>

      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Manage Products</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='mb-4 text-sm text-muted-foreground'>
              Add, edit, or remove products from your store
            </p>
            <Button asChild>
              <Link href='/admin/products'>Go to Products</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Manage Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='mb-4 text-sm text-muted-foreground'>
              View and update order status
            </p>
            <Button asChild>
              <Link href='/admin/orders'>Go to Orders</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Featured Collection</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='mb-4 text-sm text-muted-foreground'>
              Control which products appear in the featured carousel
            </p>
            <Button asChild>
              <Link href='/admin/featured'>Manage Featured</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
