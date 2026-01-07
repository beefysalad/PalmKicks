"use client";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { Instagram, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "../../shared/CartProvider";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { generateOrderId, saveOrder } from "@/lib/orders";
import { toast } from "sonner";

const CheckoutForm = () => {
  const { items, total, clearCart } = useCart();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    zipCode: "",
  });

  useEffect(() => {
    if (items.length === 0) {
      router.push("/cart");
    }
  }, [items.length, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (items.length === 0) {
      toast.error("Cart is empty", {
        description: "Please add items to your cart before checking out",
        duration: 4000,
      });
      setIsSubmitting(false);
      return;
    }

    const orderId = generateOrderId();
    const order = {
      id: orderId,
      items: items.map((item) => ({ ...item })),
      customer: formData,
      total,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    };

    saveOrder(order);
    clearCart();

    toast.success("Order Placed!", {
      description: `Your order #${orderId} has been placed successfully`,
      duration: 3000,
    });

    setTimeout(() => {
      router.push(`/order/${orderId}`);
    }, 500);
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className='mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className='mb-8'
      >
        <h1 className='mb-2 text-3xl font-bold tracking-tight sm:text-4xl'>
          Checkout
        </h1>
        <p className='text-muted-foreground'>
          Complete your order by filling in your details below
        </p>
      </motion.div>

      {/* Progress Indicator */}
      <div className='mb-8 hidden sm:block'>
        <div className='flex items-center justify-center gap-2'>
          <div className='flex items-center gap-2'>
            <div className='flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground'>
              1
            </div>
            <span className='text-sm font-medium text-foreground'>
              Contact & Shipping
            </span>
          </div>
          <div className='h-px w-12 bg-border' />
          <div className='flex items-center gap-2'>
            <div className='flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-muted-foreground'>
              2
            </div>
            <span className='text-sm font-medium text-muted-foreground'>
              Review & Pay
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className='grid gap-6 lg:grid-cols-3 lg:gap-8'>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className='lg:col-span-2 space-y-6'
          >
            {/* Contact Information Card */}
            <Card className='border-2 shadow-sm transition-shadow hover:shadow-md'>
              <CardHeader className='space-y-1 pb-4'>
                <div className='flex items-center gap-2'>
                  <div className='flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary'>
                    1
                  </div>
                  <CardTitle className='text-xl'>Contact Information</CardTitle>
                </div>
                <CardDescription className='text-sm'>
                  We&apos;ll use this to contact you about your order
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4 pt-0'>
                <div className='space-y-2'>
                  <Label htmlFor='name' className='text-sm font-medium'>
                    Full Name <span className='text-destructive'>*</span>
                  </Label>
                  <Input
                    id='name'
                    placeholder='John Doe'
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className='h-11 transition-all focus:ring-2 focus:ring-primary/20'
                  />
                </div>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <div className='space-y-2'>
                    <Label htmlFor='email' className='text-sm font-medium'>
                      Email <span className='text-destructive'>*</span>
                    </Label>
                    <Input
                      id='email'
                      type='email'
                      placeholder='john@example.com'
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className='h-11 transition-all focus:ring-2 focus:ring-primary/20'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='phone' className='text-sm font-medium'>
                      Phone <span className='text-destructive'>*</span>
                    </Label>
                    <Input
                      id='phone'
                      type='tel'
                      placeholder='+1 (555) 000-0000'
                      required
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className='h-11 transition-all focus:ring-2 focus:ring-primary/20'
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address Card */}
            <Card className='border-2 shadow-sm transition-shadow hover:shadow-md'>
              <CardHeader className='space-y-1 pb-4'>
                <div className='flex items-center gap-2'>
                  <div className='flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary'>
                    2
                  </div>
                  <CardTitle className='text-xl'>Shipping Address</CardTitle>
                </div>
                <CardDescription className='text-sm'>
                  Where should we deliver your order?
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4 pt-0'>
                <div className='space-y-2'>
                  <Label htmlFor='address' className='text-sm font-medium'>
                    Street Address <span className='text-destructive'>*</span>
                  </Label>
                  <Input
                    id='address'
                    placeholder='123 Main St, Apt 4B'
                    required
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className='h-11 transition-all focus:ring-2 focus:ring-primary/20'
                  />
                </div>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <div className='space-y-2'>
                    <Label htmlFor='city' className='text-sm font-medium'>
                      City <span className='text-destructive'>*</span>
                    </Label>
                    <Input
                      id='city'
                      placeholder='Los Angeles'
                      required
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      className='h-11 transition-all focus:ring-2 focus:ring-primary/20'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='zipCode' className='text-sm font-medium'>
                      ZIP Code <span className='text-destructive'>*</span>
                    </Label>
                    <Input
                      id='zipCode'
                      placeholder='90001'
                      required
                      value={formData.zipCode}
                      onChange={(e) =>
                        setFormData({ ...formData, zipCode: e.target.value })
                      }
                      className='h-11 transition-all focus:ring-2 focus:ring-primary/20'
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Order Summary Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className='lg:sticky lg:top-24 lg:self-start'
          >
            <Card className='border-2 shadow-lg'>
              <CardHeader className='border-b pb-4'>
                <CardTitle className='text-lg'>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4 pt-4'>
                <div className='max-h-[280px] space-y-3 overflow-y-auto pr-2'>
                  {items.map((item) => (
                    <div
                      key={`${item.id}-${item.size}`}
                      className='flex gap-3 rounded-lg border border-border/50 bg-secondary/20 p-2 transition-colors hover:bg-secondary/30'
                    >
                      <div className='relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-border bg-background'>
                        <Image
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          width={64}
                          height={64}
                          className='h-full w-full object-cover'
                        />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='truncate text-sm font-medium'>
                          {item.name}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          Size {item.size} × {item.quantity}
                        </p>
                        <p className='mt-1 text-sm font-semibold text-primary'>
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className='space-y-2.5'>
                  <div className='flex justify-between text-sm'>
                    <span className='text-muted-foreground'>Subtotal</span>
                    <span className='font-medium'>${total.toFixed(2)}</span>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span className='text-muted-foreground'>Shipping</span>
                    <span className='font-medium text-primary'>FREE</span>
                  </div>
                </div>
                <Separator />
                <div className='flex items-center justify-between rounded-lg bg-primary/5 p-3'>
                  <span className='text-base font-semibold'>Total</span>
                  <span className='text-xl font-bold text-primary'>
                    ${total.toFixed(2)}
                  </span>
                </div>

                <div className='rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4'>
                  <div className='mb-2 flex items-center gap-2'>
                    <Instagram className='h-4 w-4 text-primary' />
                    <span className='text-sm font-semibold text-foreground'>
                      Payment Instructions
                    </span>
                  </div>
                  <p className='text-xs leading-relaxed text-muted-foreground'>
                    After placing your order, you&apos;ll receive an Order ID.
                    Please send this ID to our Instagram page{" "}
                    <span className='font-semibold text-primary'>
                      @palmkicks
                    </span>{" "}
                    to complete your purchase.
                  </p>
                </div>

                <Button
                  type='submit'
                  size='lg'
                  className='w-full text-base font-semibold shadow-md transition-all hover:shadow-lg'
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className='flex items-center gap-2'>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className='h-4 w-4 rounded-full border-2 border-current border-t-transparent'
                      />
                      Processing...
                    </span>
                  ) : (
                    <span className='flex items-center gap-2'>
                      <CheckCircle2 className='h-5 w-5' />
                      Place Order
                    </span>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </form>
    </div>
  );
};

export default CheckoutForm;
