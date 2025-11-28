"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useDeleteOrder,
  useOrder,
  useUpdateOrder,
  useResendOrderEmail,
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
import { PAYMENT_METHODS, canSendOrderStatusEmail } from "@/app/shared/order-lifecycle";
import type { PaymentMethod } from "@/app/shared/order-lifecycle";
import type { AdminOrderUpdate } from "@/app/shared/zod/order-zod";
import { changedOrderFields, reconcileOrderDraft, isBackStep, nextStatuses, statusLabel } from "@/lib/orders/ui-helpers";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/order-status-badge";
import { Input } from "@/components/ui/input";
import { Order } from "@/app/shared/types/order";

const OrderDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const { data: order, isLoading, isError, refetch } = useOrder(orderId);
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

  if (isError || !order) {
    return <div className='p-4 space-y-4'>
      <h1 className='text-xl font-semibold'>Could not load this order</h1>
      <Button variant='outline' onClick={() => void refetch()}>Try again</Button>
      <Button variant='ghost' onClick={() => router.push("/admin/orders")}>Back to orders</Button>
    </div>;
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
            <OrderStatusBadge status={order.status} />
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

        <OrderManagement key={order.id} order={order} />
      </div>

    </div>
  );
};

export default OrderDetailsPage;

function OrderManagement({ order }: { order: Order }) {
  const update = useUpdateOrder();
  const remove = useDeleteOrder();
  const resendEmail = useResendOrderEmail();
  const toDraft = (value: Order) => ({
    status: value.status, courier: value.courier ?? "", trackingNumber: value.trackingNumber ?? "",
    paymentMethod: value.paymentMethod ?? "", paymentRef: value.paymentRef ?? "", adminNote: value.adminNote ?? "",
  });
  const [form, setForm] = useState(() => ({ source: order, draft: toDraft(order) }));
  let draft = form.draft;
  if (form.source !== order) {
    draft = reconcileOrderDraft(toDraft(form.source), toDraft(order), draft);
    setForm({ source: order, draft });
  }
  const { status, courier, trackingNumber, paymentMethod, paymentRef, adminNote } = draft;
  const setField = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => {
    setForm((current) => ({ ...current, draft: { ...current.draft, [key]: value } }));
  };
  const [alsoConfirm, setAlsoConfirm] = useState(true);
  const cancelled = order.status === "cancelled";
  const busy = update.isPending || remove.isPending || resendEmail.isPending;
  const confirmedEmailReason = cancelled ? "Cancelled orders cannot send emails"
    : !canSendOrderStatusEmail(order.status, "confirmed") ? "The order must be confirmed before sending a confirmed email" : undefined;
  const shippedEmailReason = cancelled ? "Cancelled orders cannot send emails"
    : !canSendOrderStatusEmail(order.status, "shipped") ? "The order must be shipped before sending a shipped email"
      : !order.courier?.trim() || !order.trackingNumber?.trim() ? "Save a courier and tracking number before sending a shipped email" : undefined;
  const shippingChanges = changedOrderFields(order, { courier, trackingNumber });
  const paymentChanges = changedOrderFields(order, {
    ...(paymentMethod ? { paymentMethod } : {}), paymentRef,
  });
  const noteChanges = changedOrderFields(order, { adminNote });
  const save = async (input: AdminOrderUpdate) => {
    try {
      const saved = await update.mutateAsync({ id: order.id, expectedStatus: order.status, ...input });
      const savedDraft = toDraft(saved);
      setForm((current) => {
        const next = { ...current.draft };
        for (const key of Object.keys(next) as (keyof typeof next)[]) {
          if (key in input || (key === "status" && input.markPaidAndConfirm)) {
            Object.assign(next, { [key]: savedDraft[key] });
          }
        }
        return { ...current, draft: next };
      });
    }
    catch { /* The mutation hook displays the server error. */ }
  };
  const changeStatus = () => {
    if (isBackStep(order.status, status) && !window.confirm(`Move this order back to ${statusLabel[status]}? Payment and shipping details will be kept.`)) return;
    void save({ status, ...(status === "shipped" ? { courier, trackingNumber } : {}) });
  };
  const inputClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

  return <div className='space-y-4'>
    <section className='rounded-lg border bg-card p-4 space-y-4' aria-labelledby='status-heading'>
      <h2 id='status-heading' className='text-base font-semibold'>Order status</h2>
      {cancelled ? <p className='text-sm text-muted-foreground'>Cancelled. You can update the internal note or refund a paid order.</p> : <>
        <label htmlFor='order-status' className='block text-sm font-medium'>Change status</label>
        <select id='order-status' className={inputClass} value={status} disabled={busy} onChange={(event) => setField("status", event.target.value as Order["status"])}>
          <option value={order.status}>{statusLabel[order.status]} (current)</option>
          {nextStatuses(order.status).filter((target) => target !== "cancelled").map((target) => <option key={target} value={target}>{statusLabel[target]}</option>)}
        </select>
        {status === "shipped" && <p className='text-sm text-muted-foreground'>Confirm the courier and tracking number in Shipping below before updating.</p>}
        <div className='flex flex-wrap gap-3'>
          <Button disabled={busy || status === order.status || (status === "shipped" && (!courier.trim() || !trackingNumber.trim()))} onClick={changeStatus}>Update status</Button>
          {nextStatuses(order.status).includes("cancelled") && <Button variant='destructive' disabled={busy} onClick={() => {
            if (window.confirm("Cancel this order? This cannot be undone. Payment status will be kept; refund separately if needed.")) void save({ status: "cancelled" });
          }}>Cancel order</Button>}
        </div>
      </>}
      {cancelled && <Button variant='destructive' disabled={busy} onClick={async () => {
        if (!window.confirm("Permanently delete this cancelled order? This cannot be undone.")) return;
        try { await remove.mutateAsync(order.id); } catch { /* Hook displays error. */ }
      }}>
        <Trash2 className='h-4 w-4 mr-2' />Delete order</Button>}
    </section>

    <section className='rounded-lg border bg-card p-4 space-y-4' aria-labelledby='payment-heading'>
      <div className='flex items-center justify-between gap-3'>
        <h2 id='payment-heading' className='text-base font-semibold'>Payment</h2>
        <PaymentStatusBadge status={order.paymentStatus} />
      </div>
      {order.paidAt && <p className='text-sm text-muted-foreground'>Paid at {new Date(order.paidAt).toLocaleString()}</p>}
      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='space-y-2'>
          <label htmlFor='payment-method' className='block text-sm font-medium'>Method</label>
          <select id='payment-method' className={inputClass} value={paymentMethod} disabled={cancelled || busy} onChange={(event) => setField("paymentMethod", event.target.value)}>
            <option value='' disabled>Choose a method</option>
            {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{({ gcash: "GCash", bank_transfer: "Bank transfer", cash_on_meetup: "Cash on meetup", other: "Other" })[method]}</option>)}
          </select>
        </div>
        <div className='space-y-2'>
          <label htmlFor='payment-ref' className='block text-sm font-medium'>Reference</label>
          <Input id='payment-ref' maxLength={100} value={paymentRef} disabled={cancelled || busy} onChange={(event) => setField("paymentRef", event.target.value)} />
        </div>
      </div>
      {!cancelled && <Button variant='outline' disabled={busy || !Object.keys(paymentChanges).length} onClick={() => void save({ ...paymentChanges, paymentMethod: paymentChanges.paymentMethod as PaymentMethod | undefined })}>Save payment details</Button>}
      {!cancelled && order.paymentStatus === "unpaid" && <div className='space-y-3'>
        {order.status === "pending" && <label className='flex items-center gap-2 text-sm'>
          <input type='checkbox' checked={alsoConfirm} disabled={busy} onChange={(event) => setAlsoConfirm(event.target.checked)} />Also confirm order</label>}
        <Button disabled={busy} onClick={() => void save({ ...paymentChanges, paymentMethod: paymentChanges.paymentMethod as PaymentMethod | undefined, ...(alsoConfirm && order.status === "pending" ? { markPaidAndConfirm: true } : { paymentStatus: "paid" }) })}>Mark paid</Button>
      </div>}
      {order.paymentStatus === "paid" && <div className='flex flex-wrap gap-3'>
        <Button variant='outline' disabled={busy} onClick={() => {
          if (window.confirm("Mark this payment as refunded? Refunded payments cannot be changed again.")) void save({ paymentStatus: "refunded" });
        }}>Mark refunded</Button>
        {!cancelled && <Button variant='outline' disabled={busy} onClick={() => {
          if (window.confirm("Correct this payment to unpaid? The paid timestamp will be cleared.")) void save({ paymentStatus: "unpaid" });
        }}>Correct to unpaid</Button>}
      </div>}
    </section>

    <section className='rounded-lg border bg-card p-4 space-y-4' aria-labelledby='shipping-heading'>
      <h2 id='shipping-heading' className='text-base font-semibold'>Shipping</h2>
      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='space-y-2'>
          <label htmlFor='courier' className='block text-sm font-medium'>Courier{status === "shipped" ? " (required)" : ""}</label>
          <Input id='courier' maxLength={100} required={status === "shipped"} value={courier} disabled={cancelled || busy} onChange={(event) => setField("courier", event.target.value)} />
        </div>
        <div className='space-y-2'>
          <label htmlFor='tracking-number' className='block text-sm font-medium'>Tracking number{status === "shipped" ? " (required)" : ""}</label>
          <Input id='tracking-number' maxLength={100} required={status === "shipped"} value={trackingNumber} disabled={cancelled || busy} onChange={(event) => setField("trackingNumber", event.target.value)} />
        </div>
      </div>
      {order.shippedAt && <p className='text-sm text-muted-foreground'>Shipped at {new Date(order.shippedAt).toLocaleString()}</p>}
      <p className='text-sm text-muted-foreground'>Changing tracking on a shipped order does not email the customer; use Resend shipped email.</p>
      {!cancelled && <Button variant='outline' disabled={busy || !Object.keys(shippingChanges).length || ((order.status === "shipped" || order.status === "delivered") && (!courier.trim() || !trackingNumber.trim()))} onClick={() => void save(shippingChanges)}>Save shipping details</Button>}
    </section>

    <section className='rounded-lg border bg-card p-4 space-y-4' aria-labelledby='email-heading' aria-busy={resendEmail.isPending}>
      <h2 id='email-heading' className='text-base font-semibold'>Order emails</h2>
      <p className='text-sm text-muted-foreground'>Emails use saved order details. Cancelled orders cannot send emails.</p>
      <div className='flex flex-wrap gap-3'>
        <Button variant='outline' disabled={busy || cancelled} onClick={() => resendEmail.mutate({ id: order.id, type: "confirmation" })}>Resend confirmation</Button>
        <Button variant='outline' disabled={busy || !!confirmedEmailReason} title={confirmedEmailReason} onClick={() => resendEmail.mutate({ id: order.id, type: "confirmed" })}>Resend confirmed email</Button>
        <Button variant='outline' disabled={busy || !!shippedEmailReason} title={shippedEmailReason} onClick={() => resendEmail.mutate({ id: order.id, type: "shipped" })}>Resend shipped email</Button>
      </div>
      {(!order.courier?.trim() || !order.trackingNumber?.trim()) && <p className='text-sm text-muted-foreground'>Save a courier and tracking number before sending a shipped email.</p>}
      {resendEmail.isPending && <p role='status' className='text-sm text-muted-foreground'>Sending email…</p>}
    </section>

    <section className='rounded-lg border bg-card p-4 space-y-4' aria-labelledby='note-heading'>
      <h2 id='note-heading' className='text-base font-semibold'>Internal note</h2>
      <p id='note-help' className='text-sm text-muted-foreground'>Visible only to admins. Up to 2,000 characters.</p>
      <label htmlFor='admin-note' className='sr-only'>Internal note</label>
      <textarea id='admin-note' aria-describedby='note-help' className={`${inputClass} min-h-28 resize-y`} rows={4} maxLength={2000} value={adminNote} disabled={busy} onChange={(event) => setField("adminNote", event.target.value)} />
      <Button disabled={busy || !Object.keys(noteChanges).length} onClick={() => void save(noteChanges)}>Save note</Button>
    </section>
  </div>;
}
