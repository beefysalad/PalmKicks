"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useOrder, useUpdateOrderStatus } from "@/lib/orders/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { toast } from "sonner";
import type { Order } from "@/lib/orders/api";
import { ArrowLeft, Package, User, MapPin, Calendar } from "lucide-react";

const OrderDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const { data: order, isLoading } = useOrder(orderId);
  const updateStatusMutation = useUpdateOrderStatus();

  const [status, setStatus] = useState<Order["status"]>(
    order?.status ?? "pending"
  );

  if (!isLoading && !order) {
    toast.error("Order not found");
    router.push("/admin/orders");
    return null;
  }

  const handleStatusUpdate = async () => {
    if (!order) return;

    try {
      await updateStatusMutation.mutateAsync({
        id: order.id,
        status,
      });
    } catch (error) {
      // Error is handled by the hook
    }
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
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: Order["status"]) => {
    const colors = {
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      confirmed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      processing: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      shipped: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      delivered: "bg-green-500/10 text-green-500 border-green-500/20",
    };
    return colors[status] || colors.pending;
  };

  if (isLoading) {
    return (
      <div className='min-h-screen p-4 sm:p-6 lg:p-8'>
        <div className='mx-auto max-w-5xl'>
          <div className='flex items-center gap-3 mb-6'>
            <h1 className='text-2xl sm:text-3xl font-bold'>Order Details</h1>
          </div>
          <div className='py-12 text-center text-muted-foreground'>
            Loading order...
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className='min-h-screen p-4 sm:p-6 lg:p-8'>
      <div className='mx-auto max-w-5xl space-y-6'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => router.back()}
              className='mb-2 -ml-2'
            >
              <ArrowLeft className='h-4 w-4 mr-2' />
              Back
            </Button>
            <h1 className='text-2xl sm:text-3xl font-bold'>Order Details</h1>
            <p className='text-sm text-muted-foreground mt-1'>
              Order ID: {order.id}
            </p>
          </div>
          <div
            className={`inline-flex items-center px-3 py-1.5 rounded-full border text-sm font-medium ${getStatusColor(
              order.status
            )}`}
          >
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className='grid gap-6 lg:grid-cols-3'>
          {/* Left Column - Order Items (Takes 2 columns on large screens) */}
          <div className='lg:col-span-2 space-y-6'>
            <Card>
              <CardHeader className='pb-4'>
                <CardTitle className='flex items-center gap-2 text-lg'>
                  <Package className='h-5 w-5' />
                  Order Items
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                {order.items.map((item, index) => (
                  <div
                    key={index}
                    className='flex gap-3 pb-3 border-b last:border-0 last:pb-0'
                  >
                    <div className='relative h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 overflow-hidden rounded-lg border'>
                      <Image
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        fill
                        className='object-cover'
                      />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <h3 className='font-semibold text-sm sm:text-base line-clamp-2'>
                        {item.name}
                      </h3>
                      <div className='flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs sm:text-sm text-muted-foreground'>
                        <span>Size: {item.size}</span>
                        <span>•</span>
                        <span>Color: {item.color}</span>
                        <span>•</span>
                        <span>Qty: {item.quantity}</span>
                      </div>
                      <p className='mt-1.5 font-semibold text-sm sm:text-base'>
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
                <div className='pt-3 border-t'>
                  <div className='flex justify-between items-center'>
                    <span className='text-base sm:text-lg font-bold'>
                      Total
                    </span>
                    <span className='text-lg sm:text-xl font-bold'>
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Info - Shows below items on mobile */}
            <Card className='lg:hidden'>
              <CardHeader className='pb-4'>
                <CardTitle className='flex items-center gap-2 text-lg'>
                  <User className='h-5 w-5' />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='grid grid-cols-2 gap-3 text-sm'>
                  <div>
                    <p className='text-muted-foreground mb-0.5'>Name</p>
                    <p className='font-medium'>{order.customerName}</p>
                  </div>
                  <div>
                    <p className='text-muted-foreground mb-0.5'>Phone</p>
                    <p className='font-medium'>{order.customerPhone}</p>
                  </div>
                </div>
                <div>
                  <p className='text-sm text-muted-foreground mb-0.5'>Email</p>
                  <p className='font-medium text-sm'>{order.customerEmail}</p>
                </div>
                {(order.shippingAddress || order.meetupLocation) && (
                  <div className='pt-2 border-t'>
                    <p className='text-sm text-muted-foreground mb-0.5 flex items-center gap-1.5'>
                      <MapPin className='h-4 w-4' />
                      {order.meetupLocation
                        ? "Meetup Location"
                        : "Shipping Address"}
                    </p>
                    <p className='font-medium text-sm'>
                      {order.meetupLocation || (
                        <>
                          {order.shippingAddress}, {order.shippingCity},{" "}
                          {order.shippingZipCode}
                        </>
                      )}
                    </p>
                  </div>
                )}
                <div className='pt-2 border-t'>
                  <p className='text-sm text-muted-foreground mb-0.5 flex items-center gap-1.5'>
                    <Calendar className='h-4 w-4' />
                    Order Date
                  </p>
                  <p className='font-medium text-sm'>
                    {formatDate(order.createdAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Customer Info & Status */}
          <div className='space-y-6'>
            {/* Customer Info - Shows on desktop only */}
            <Card className='hidden lg:block'>
              <CardHeader className='pb-4'>
                <CardTitle className='flex items-center gap-2 text-lg'>
                  <User className='h-5 w-5' />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3 text-sm'>
                <div>
                  <p className='text-muted-foreground mb-0.5'>Name</p>
                  <p className='font-medium'>{order.customerName}</p>
                </div>
                <div>
                  <p className='text-muted-foreground mb-0.5'>Email</p>
                  <p className='font-medium break-words'>
                    {order.customerEmail}
                  </p>
                </div>
                <div>
                  <p className='text-muted-foreground mb-0.5'>Phone</p>
                  <p className='font-medium'>{order.customerPhone}</p>
                </div>
                {(order.shippingAddress || order.meetupLocation) && (
                  <div className='pt-2 border-t'>
                    <p className='text-muted-foreground mb-0.5 flex items-center gap-1.5'>
                      <MapPin className='h-4 w-4' />
                      {order.meetupLocation ? "Meetup" : "Address"}
                    </p>
                    <p className='font-medium'>
                      {order.meetupLocation || (
                        <>
                          {order.shippingAddress}, {order.shippingCity},{" "}
                          {order.shippingZipCode}
                        </>
                      )}
                    </p>
                  </div>
                )}
                <div className='pt-2 border-t'>
                  <p className='text-muted-foreground mb-0.5 flex items-center gap-1.5'>
                    <Calendar className='h-4 w-4' />
                    Order Date
                  </p>
                  <p className='font-medium'>{formatDate(order.createdAt)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Order Status Update */}
            <Card>
              <CardContent className='space-y-4'>
                <div>
                  <label className='text-sm font-medium mb-2 block'>
                    Update Order Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as Order["status"])
                    }
                    className='w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
                  >
                    <option value='pending'>Pending</option>
                    <option value='confirmed'>Confirmed</option>
                    <option value='processing'>Processing</option>
                    <option value='shipped'>Shipped</option>
                    <option value='delivered'>Delivered</option>
                  </select>
                </div>
                <Button
                  onClick={handleStatusUpdate}
                  className='w-full'
                  size='lg'
                  disabled={
                    updateStatusMutation.isPending || status === order.status
                  }
                >
                  {updateStatusMutation.isPending
                    ? "Updating..."
                    : "Update Status"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsPage;
