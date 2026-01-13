"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getOrderById } from "@/lib/orders/orders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { toast } from "sonner";
import type { Order } from "@/lib/orders/orders";

const OrderDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order] = useState<Order | null>(() => getOrderById(orderId) || null);
  const [status, setStatus] = useState<Order["status"]>(() => {
    const foundOrder = getOrderById(orderId);
    return foundOrder?.status || "pending";
  });

  useEffect(() => {
    if (!order) {
      toast.error("Order not found");
      router.push("/admin/orders");
    }
  }, [order, router]);

  const handleStatusUpdate = () => {
    if (!order) return;

    const orders = JSON.parse(
      localStorage.getItem("palm-kicks-orders") || "[]"
    );
    const index = orders.findIndex((o: Order) => o.id === order.id);

    if (index !== -1) {
      orders[index].status = status;
      localStorage.setItem("palm-kicks-orders", JSON.stringify(orders));
      toast.success("Order status updated");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!order) {
    return <div>Loading...</div>;
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Order Details</h1>
          <p className='text-muted-foreground'>Order ID: {order.id}</p>
        </div>
        <Button variant='outline' onClick={() => router.back()}>
          Back to Orders
        </Button>
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {order.items.map((item, index) => (
              <div
                key={index}
                className='flex gap-4 border-b pb-4 last:border-0'
              >
                <div className='relative h-20 w-20 overflow-hidden rounded'>
                  <Image
                    src={item.image || "/placeholder.svg"}
                    alt={item.name}
                    fill
                    className='object-cover'
                  />
                </div>
                <div className='flex-1'>
                  <h3 className='font-semibold'>{item.name}</h3>
                  <p className='text-sm text-muted-foreground'>
                    Size: {item.size} • Color: {item.color} • Qty:{" "}
                    {item.quantity}
                  </p>
                  <p className='mt-1 font-medium'>
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
            <div className='border-t pt-4'>
              <div className='flex justify-between text-lg font-bold'>
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2'>
              <div>
                <p className='text-sm text-muted-foreground'>Name</p>
                <p className='font-medium'>{order.customer.name}</p>
              </div>
              <div>
                <p className='text-sm text-muted-foreground'>Email</p>
                <p className='font-medium'>{order.customer.email}</p>
              </div>
              <div>
                <p className='text-sm text-muted-foreground'>Phone</p>
                <p className='font-medium'>{order.customer.phone}</p>
              </div>
              <div>
                <p className='text-sm text-muted-foreground'>Address</p>
                <p className='font-medium'>
                  {order.customer.address}
                  <br />
                  {order.customer.city}, {order.customer.zipCode}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Status</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <label className='mb-2 block text-sm font-medium'>
                  Update Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Order["status"])}
                  className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                >
                  <option value='pending'>Pending</option>
                  <option value='confirmed'>Confirmed</option>
                  <option value='processing'>Processing</option>
                  <option value='shipped'>Shipped</option>
                  <option value='delivered'>Delivered</option>
                </select>
              </div>
              <Button onClick={handleStatusUpdate} className='w-full'>
                Update Status
              </Button>
              <div>
                <p className='text-sm text-muted-foreground'>Order Date</p>
                <p className='font-medium'>{formatDate(order.createdAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsPage;
