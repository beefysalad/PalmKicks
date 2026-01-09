"use client";
import {
  CheckCircle2,
  Clock,
  Home,
  Package,
  Search,
  Truck,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { getOrderById, Order } from "@/lib/orders";
import { Label } from "@/components/ui/label";

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
    description: "Payment confirmed, preparing your order",
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
  const [order, setOrder] = useState<Order | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return;

    const foundOrder = getOrderById(orderId.trim());
    setOrder(foundOrder || null);
    setSearched(true);
  };

  const currentStatusIndex = order
    ? statusSteps.findIndex((step) => step.status === order.status)
    : -1;
  return (
    <div className='mx-auto max-w-3xl'>
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
              <Button type='submit'>
                <Search className='h-4 w-4' />
                Track
              </Button>
            </form>
          </CardContent>
        </Card>

        <AnimatePresence mode='wait'>
          {searched && !order && (
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
                </CardHeader>
                <CardContent>
                  <div className='space-y-6'>
                    {statusSteps.map((step, index) => {
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
                    {order.items.map((item) => (
                      <div
                        key={`${item.id}-${item.size}-${item.color}`}
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
                            Size {item.size}, Color {item.color} × {item.quantity}
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
                  <CardTitle>Shipping Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className='font-medium'>{order.customer.name}</p>
                  <p className='text-sm text-muted-foreground'>
                    {order.customer.email}
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    {order.customer.phone}
                  </p>
                  <p className='mt-2 text-sm text-muted-foreground'>
                    {order.customer.address}
                    <br />
                    {order.customer.city}, {order.customer.zipCode}
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
