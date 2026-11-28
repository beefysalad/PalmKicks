"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Home,
  Package,
  Search,
  Truck,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { usePublicOrder } from "@/lib/orders/hooks";
import { paymentLabel } from "@/lib/orders/ui-helpers";

const statusSteps = [
  {
    status: "pending",
    label: "Order Placed",
    icon: CheckCircle2,
    description: "Your order has been received",
  },
  {
    status: "confirmed",
    label: "Confirmed",
    icon: Clock,
    description: "Your order is confirmed",
  },
  {
    status: "processing",
    label: "Processing",
    icon: Package,
    description: "Your order is being prepared",
  },
  {
    status: "shipped",
    label: "Shipped",
    icon: Truck,
    description: "Your order is on the way",
  },
  {
    status: "delivered",
    label: "Delivered",
    icon: Home,
    description: "Order delivered successfully",
  },
];

const Tracking = () => {
  const [orderId, setOrderId] = useState("");
  const [searchedOrderId, setSearchedOrderId] = useState<string | null>(null);

  // Use the hook with the searched order ID
  const {
    data: order,
    isLoading,
    error,
  } = usePublicOrder(searchedOrderId || "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    setSearchedOrderId(orderId.trim());
  };

  const currentStatusIndex = order
    ? statusSteps.findIndex((step) => step.status === order.status)
    : -1;

  return (
    <div className='mx-auto max-w-3xl px-4 py-8'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className='mb-8 text-center'>
          <h1 className='mb-2 text-3xl font-bold'>Track Your Order</h1>
          <p className='text-muted-foreground'>
            Enter your order ID to see the latest status
          </p>
        </div>

        <Card className='mb-8'>
          <CardHeader>
            <CardTitle>Order ID</CardTitle>
            <CardDescription>
              Enter the order ID you received after checkout
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className='flex gap-2'>
              <div className='flex-1'>
                <Label htmlFor='orderId' className='sr-only'>
                  Order ID
                </Label>
                <Input
                  id='orderId'
                  placeholder='PK-2026-0001'
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className='font-mono'
                />
              </div>
              <Button type='submit' disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Search className='h-4 w-4' />
                )}
                Track
              </Button>
            </form>
          </CardContent>
        </Card>

        <AnimatePresence mode='wait'>
          {searchedOrderId && error && (
            <motion.div
              key='not-found'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className='border-destructive/20 bg-destructive/5'>
                <CardContent className='py-8 text-center'>
                  <Package className='mx-auto mb-4 h-12 w-12 text-muted-foreground' />
                  <h3 className='mb-2 text-lg font-semibold'>
                    Order Not Found
                  </h3>
                  <p className='text-sm text-muted-foreground'>
                    We couldn&apos;t find an order with that ID. Please check
                    and try again.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {order && (
            <motion.div
              key='order-found'
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className='space-y-6'
            >
              <Card>
                <CardHeader>
                  <CardTitle>Order Status</CardTitle>
                  <CardDescription>Order #{order.id}</CardDescription>
                  <p className='text-sm text-muted-foreground'>Payment: {paymentLabel[order.paymentStatus]}</p>
                </CardHeader>
                <CardContent>
                  <div className='space-y-6'>
                    {order.status === "cancelled" ? <div role='status' className='rounded-lg border border-destructive/30 bg-destructive/5 p-4'>
                      <h3 className='font-semibold'>Cancelled</h3>
                      <p className='mt-1 text-sm text-muted-foreground'>This order has been cancelled. Contact PalmKicks if you need help.</p>
                    </div> : statusSteps.map((step, index) => {
                      const Icon = step.icon;
                      const isCompleted = index <= currentStatusIndex;
                      const isCurrent = index === currentStatusIndex;

                      return (
                        <div key={step.status} className='relative'>
                          {index !== statusSteps.length - 1 && (
                            <div
                              className={`absolute left-5 top-11 h-12 w-0.5 transition-colors ${
                                isCompleted ? "bg-primary" : "bg-border"
                              }`}
                            />
                          )}
                          <div className='flex gap-4'>
                            <motion.div
                              initial={false}
                              animate={{
                                scale: isCurrent ? [1, 1.1, 1] : 1,
                                transition: {
                                  repeat: isCurrent
                                    ? Number.POSITIVE_INFINITY
                                    : 0,
                                  duration: 2,
                                },
                              }}
                              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                                isCompleted
                                  ? "bg-primary text-primary-foreground"
                                  : "border-2 border-border bg-background text-muted-foreground"
                              }`}
                            >
                              <Icon className='h-5 w-5' />
                            </motion.div>
                            <div
                              className={`flex-1 pt-1 ${
                                !isCompleted && "opacity-50"
                              }`}
                            >
                              <h4 className='font-semibold'>{step.label}</h4>
                              <p className='text-sm text-muted-foreground'>
                                {step.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Order Details</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='space-y-3'>
                    {order.items.map((item, index) => (
                      <div
                        key={`${item.name}-${item.size}-${item.color}-${index}`}
                        className='flex gap-3'
                      >
                        <div className='relative h-16 w-16 flex-shrink-0 overflow-hidden rounded border border-border'>
                          <Image
                            src={item.image || "/placeholder.svg"}
                            alt={item.name}
                            width={64}
                            height={64}
                            className='h-full w-full object-cover'
                          />
                        </div>
                        <div className='flex-1'>
                          <p className='font-medium'>{item.name}</p>
                          <p className='text-sm text-muted-foreground'>
                            Size {item.size}, Color {item.color} ×{" "}
                            {item.quantity}
                          </p>
                        </div>
                        <p className='font-semibold text-primary'>
                          ₱{(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className='flex justify-between text-lg font-bold'>
                    <span>Total</span>
                    <span className='text-primary'>
                      ₱{order.total.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    {order.meetupLocation
                      ? "Meetup Location"
                      : "Shipping"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(order.status === "shipped" || order.status === "delivered") && <dl className='mb-4 space-y-2 text-sm'>
                    <div><dt className='text-muted-foreground'>Courier</dt><dd className='font-medium break-words'>{order.courier || "Not available"}</dd></div>
                    <div><dt className='text-muted-foreground'>Tracking number</dt><dd className='font-mono break-all'>{order.trackingNumber || "Not available"}</dd></div>
                  </dl>}
                  <p className='font-medium'>{order.customerFirstName}</p>
                  <p className='mt-2 text-sm'>
                    {order.meetupLocation
                      ? order.meetupLocation
                      : order.shippingCity}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Tracking;
