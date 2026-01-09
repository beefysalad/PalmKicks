"use client";
import { motion } from "framer-motion";
import { getOrderById } from "@/lib/orders";
import { useMemo } from "react";
import { CheckCircle2, Copy, Instagram, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface OrderConfirmationProps {
  orderId: string;
}
const OrderConfirmation = ({ orderId }: OrderConfirmationProps) => {
  const order = useMemo(() => {
    return getOrderById(orderId) || null;
  }, [orderId]);

  const copyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(orderId);
      toast.success("Copied!", {
        description: "Order ID copied to clipboard",
        duration: 3000,
      });
    } catch {
      toast.error("Failed to copy", {
        description: "Please try again",
        duration: 3000,
      });
    }
  };

  if (!order) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='flex min-h-[60vh] flex-col items-center justify-center text-center'
      >
        <Package className='mb-4 h-16 w-16 text-muted-foreground' />
        <h2 className='mb-2 text-2xl font-bold'>Order not found</h2>
        <p className='mb-6 text-muted-foreground'>
          The order ID you&apos;re looking for doesn&apos;t exist
        </p>
        <Button asChild>
          <Link href='/'>Return to Shop</Link>
        </Button>
      </motion.div>
    );
  }

  return (
    <div className='mx-auto max-w-3xl'>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className='mb-8 text-center'>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className='mb-4 flex justify-center'
          >
            <CheckCircle2 className='h-16 w-16 text-primary' />
          </motion.div>
          <h1 className='mb-2 text-3xl font-bold'>Order Confirmed!</h1>
          <p className='text-muted-foreground'>
            Thank you for your order. We&apos;ve received it successfully.
          </p>
        </div>

        <Card className='mb-6'>
          <CardHeader>
            <CardTitle>Order ID</CardTitle>
            <CardDescription>Save this ID to track your order</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex items-center gap-2'>
              <code className='flex-1 rounded-lg bg-secondary/50 px-4 py-3 text-lg font-mono font-bold'>
                {orderId}
              </code>
              <Button size='icon' variant='outline' onClick={copyOrderId}>
                <Copy className='h-4 w-4' />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className='mb-6 border-primary/20 bg-primary/5'>
          <CardContent className='pt-6'>
            <div className='flex gap-4'>
              <Instagram className='h-10 w-10 flex-shrink-0 text-primary' />
              <div>
                <h3 className='mb-2 font-semibold'>
                  Next Step: Complete Your Payment
                </h3>
                <p className='mb-4 text-sm text-muted-foreground'>
                  To finalize your order, please send your Order ID to our
                  Instagram page. Our team will confirm your payment and process
                  your order.
                </p>
                <Button asChild size='sm' className='gap-2'>
                  <a
                    href={process.env.NEXT_PUBLIC_INSTAGRAM_URL || "#"}
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    <Instagram className='h-4 w-4' />
                    Message @palmkicks
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='mb-6'>
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
              <span className='text-primary'>₱{order.total.toFixed(2)}</span>
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

        <div className='mt-8 flex gap-4'>
          <Button asChild variant='outline' className='flex-1 bg-transparent'>
            <Link href='/track'>Track Your Order</Link>
          </Button>
          <Button asChild className='flex-1'>
            <Link href='/'>Continue Shopping</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default OrderConfirmation;
