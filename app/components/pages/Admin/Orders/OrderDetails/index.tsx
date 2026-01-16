"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useDeleteOrder,
  useOrder,
  useUpdateOrderStatus,
} from "@/lib/orders/hooks";
import { Button } from "@/components/ui/button";
import Image from "next/image";

import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  Calendar,
  Trash2,
  Mail,
  Phone,
} from "lucide-react";
import { Order } from "@/app/shared/types/order";

const OrderDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const { data: order, isLoading } = useOrder(orderId);
  const updateStatusMutation = useUpdateOrderStatus();
  const deleteOrderMutation = useDeleteOrder();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [status, setStatus] = useState<Order["status"]>(
    order?.status ?? "pending"
  );

  if (!isLoading && !order) {
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

  const handleDeleteOrder = async () => {
    if (!order) return;

    try {
      await deleteOrderMutation.mutateAsync(order.id);
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setShowDeleteDialog(false);
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
      pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      confirmed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      processing: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      shipped: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
      delivered: "bg-green-500/10 text-green-600 border-green-500/20",
    };
    return colors[status] || colors.pending;
  };

  if (isLoading) {
    return (
      <div className='min-h-screen bg-background'>
        <div className='sticky top-0 z-10 border-b bg-background/95 backdrop-blur'>
          <div className='p-4'>
            <h1 className='text-2xl font-bold'>Order Details</h1>
          </div>
        </div>
        <div className='py-12 text-center text-muted-foreground'>
          Loading order...
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className='min-h-screen bg-background pb-6'>
      {/* Header */}
      <div className='sticky top-0 z-10 border-b bg-background/95 backdrop-blur'>
        <div className='p-4'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => router.back()}
            className='mb-3 -ml-2'
          >
            <ArrowLeft className='h-4 w-4 mr-2' />
            Back to Orders
          </Button>
          <div className='flex items-start justify-between gap-3'>
            <div className='flex-1 min-w-0'>
              <h1 className='text-xl font-bold mb-1'>Order Details</h1>
              <p className='text-xs text-muted-foreground font-mono'>
                #{order.id.toUpperCase()}
              </p>
            </div>
            <span
              className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${getStatusColor(
                order.status
              )}`}
            >
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className='max-w-4xl mx-auto px-4 py-6 space-y-4'>
        {/* Order Summary Card */}
        <div className='rounded-lg border bg-card'>
          <div className='p-4 pb-3 border-b'>
            <div className='flex items-center justify-between'>
              <h2 className='text-base font-semibold flex items-center gap-2'>
                <Package className='h-4 w-4' />
                Order Summary
              </h2>
              <span className='text-xl font-bold'>
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>
          <div className='p-4 space-y-3'>
            {order.items.map((item, index) => (
              <div
                key={index}
                className='flex gap-3 pb-3 border-b last:border-0 last:pb-0'
              >
                <div className='relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border bg-muted'>
                  <Image
                    src={item.image || "/placeholder.svg"}
                    alt={item.name}
                    fill
                    className='object-cover'
                  />
                </div>
                <div className='flex-1 min-w-0'>
                  <h3 className='font-semibold text-sm line-clamp-2 mb-1'>
                    {item.name}
                  </h3>
                  <div className='flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground mb-1.5'>
                    <span>Size: {item.size}</span>
                    <span>•</span>
                    <span>Color: {item.color}</span>
                    <span>•</span>
                    <span>Qty: {item.quantity}</span>
                  </div>
                  <p className='font-semibold text-sm'>
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Info Card */}
        <div className='rounded-lg border bg-card'>
          <div className='p-4 pb-3 border-b'>
            <h2 className='text-base font-semibold flex items-center gap-2'>
              <User className='h-4 w-4' />
              Customer Details
            </h2>
          </div>
          <div className='p-4 space-y-3'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='flex items-start gap-2'>
                <User className='h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0' />
                <div className='min-w-0'>
                  <p className='text-xs text-muted-foreground'>Name</p>
                  <p className='font-medium text-sm'>{order.customerName}</p>
                </div>
              </div>
              <div className='flex items-start gap-2'>
                <Phone className='h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0' />
                <div className='min-w-0'>
                  <p className='text-xs text-muted-foreground'>Phone</p>
                  <p className='font-medium text-sm'>{order.customerPhone}</p>
                </div>
              </div>
            </div>
            <div className='flex items-start gap-2'>
              <Mail className='h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0' />
              <div className='min-w-0 flex-1'>
                <p className='text-xs text-muted-foreground'>Email</p>
                <p className='font-medium text-sm break-all'>
                  {order.customerEmail}
                </p>
              </div>
            </div>
            {(order.shippingAddress || order.meetupLocation) && (
              <div className='flex items-start gap-2 pt-2 border-t'>
                <MapPin className='h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0' />
                <div className='min-w-0 flex-1'>
                  <p className='text-xs text-muted-foreground'>
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
              </div>
            )}
            <div className='flex items-start gap-2 pt-2 border-t'>
              <Calendar className='h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0' />
              <div className='min-w-0'>
                <p className='text-xs text-muted-foreground'>Order Date</p>
                <p className='font-medium text-sm'>
                  {formatDate(order.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Management Card */}
        <div className='rounded-lg border bg-card'>
          <div className='p-4 space-y-4'>
            <div>
              <label className='text-sm font-medium mb-2 block'>
                Update Order Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Order["status"])}
                className='w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
              >
                <option value='pending'>Pending</option>
                <option value='confirmed'>Confirmed</option>
                <option value='processing'>Processing</option>
                <option value='shipped'>Shipped</option>
                <option value='delivered'>Delivered</option>
              </select>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
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
              <Button
                onClick={() => setShowDeleteDialog(true)}
                variant='destructive'
                className='w-full'
                size='lg'
              >
                <Trash2 className='h-4 w-4 mr-2' />
                Delete Order
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className='fixed inset-0 z-50 flex items-end sm:items-center justify-center'>
          <div
            className='absolute inset-0 bg-black/50'
            onClick={() => setShowDeleteDialog(false)}
          />
          <div className='relative w-full max-w-md rounded-t-2xl sm:rounded-lg border bg-card p-6 shadow-lg mx-4 mb-0 sm:mb-4'>
            <h3 className='text-lg font-semibold mb-2 flex items-center gap-2'>
              <Trash2 className='h-5 w-5 text-destructive' />
              Delete Order?
            </h3>
            <p className='text-sm text-muted-foreground mb-6'>
              This will permanently delete order{" "}
              <span className='font-mono font-semibold text-foreground'>
                #{order.id.slice(0, 8).toUpperCase()}
              </span>
              . This action cannot be undone.
            </p>
            <div className='flex gap-3'>
              <Button
                variant='outline'
                onClick={() => setShowDeleteDialog(false)}
                className='flex-1'
              >
                Cancel
              </Button>
              <Button
                variant='destructive'
                onClick={handleDeleteOrder}
                className='flex-1'
                disabled={deleteOrderMutation.isPending}
              >
                {deleteOrderMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailsPage;
