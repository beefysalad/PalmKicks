"use client";

import { useProducts } from "@/lib/products/hooks";
import { useOrders } from "@/lib/orders/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingBag, DollarSign, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { useMemo } from "react";
import { Order } from "@/app/shared/types/order";

const DashboardPage = () => {
  const { data: products = [] } = useProducts();
  const { data: orders = [], isLoading: isLoadingOrders } = useOrders();

  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter((order) => order.status !== "pending")
      .reduce((sum, order) => sum + order.total, 0);
    const pendingOrders = orders.filter(
      (order) => order.status === "pending"
    ).length;

    return {
      totalProducts: products.length,
      totalOrders: orders.length,
      totalRevenue,
      pendingOrders,
    };
  }, [products, orders]);

  const recentOrders = useMemo(() => {
    const sorted = [...orders].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return sorted.slice(0, 10);
  }, [orders]);

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

  return (
    <div className='space-y-8'>
      <div>
        <h1 className='text-3xl font-bold'>Dashboard</h1>
        <p className='text-muted-foreground'>
          Overview of your store statistics
        </p>
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
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
            <CardTitle className='text-sm font-medium'>Total Revenue</CardTitle>
            <DollarSign className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className='text-xs text-muted-foreground'>All time revenue</p>
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
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
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
