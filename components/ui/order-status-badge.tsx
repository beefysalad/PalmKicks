import type { OrderStatus, PaymentStatus } from "@/app/shared/order-lifecycle";
import { paymentLabel, statusColor, statusLabel } from "@/lib/orders/ui-helpers";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusColor[status]}`}>{statusLabel[status]}</span>;
}
export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const color = status === "paid" ? "bg-green-500/10 text-green-600" : status === "refunded" ? "bg-muted text-muted-foreground" : "bg-yellow-500/10 text-yellow-600";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${color}`}>{paymentLabel[status]}</span>;
}
