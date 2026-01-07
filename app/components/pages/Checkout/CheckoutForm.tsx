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
import { Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "../../shared/CartProvider";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { generateOrderId, saveOrder } from "@/lib/orders";

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
      //   toast({
      //     title: "Cart is empty",
      //     description: "Please add items to your cart before checking out",
      //     variant: "destructive",
      //   });
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

    setTimeout(() => {
      router.push(`/order/${orderId}`);
    }, 500);
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className='grid gap-8 lg:grid-cols-3'>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className='lg:col-span-2'
        >
          <h1 className='mb-6 text-3xl font-bold'>Checkout</h1>

          <Card className='mb-6'>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                We&apos;ll use this to contact you about your order
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='name'>Full Name</Label>
                <Input
                  id='name'
                  placeholder='John Doe'
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='email'>Email</Label>
                  <Input
                    id='email'
                    type='email'
                    placeholder='john@example.com'
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='phone'>Phone</Label>
                  <Input
                    id='phone'
                    type='tel'
                    placeholder='+1 (555) 000-0000'
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='address'>Street Address</Label>
                <Input
                  id='address'
                  placeholder='123 Main St'
                  required
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='city'>City</Label>
                  <Input
                    id='city'
                    placeholder='Los Angeles'
                    required
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='zipCode'>ZIP Code</Label>
                  <Input
                    id='zipCode'
                    placeholder='90001'
                    required
                    value={formData.zipCode}
                    onChange={(e) =>
                      setFormData({ ...formData, zipCode: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className='sticky top-20'>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='max-h-60 space-y-3 overflow-auto'>
                {items.map((item) => (
                  <div key={`${item.id}-${item.size}`} className='flex gap-3'>
                    <div className='relative h-16 w-16 flex-shrink-0 overflow-hidden rounded border border-border'>
                      <Image
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        width={64}
                        height={64}
                        className='h-full w-full object-cover'
                      />
                    </div>
                    <div className='flex-1 text-sm'>
                      <p className='font-medium'>{item.name}</p>
                      <p className='text-muted-foreground'>
                        Size {item.size} × {item.quantity}
                      </p>
                      <p className='font-semibold text-primary'>
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
              <div className='space-y-2'>
                <div className='flex justify-between text-sm'>
                  <span className='text-muted-foreground'>Subtotal</span>
                  <span className='font-medium'>${total.toFixed(2)}</span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span className='text-muted-foreground'>Shipping</span>
                  <span className='font-medium'>FREE</span>
                </div>
              </div>
              <Separator />
              <div className='flex justify-between text-lg font-bold'>
                <span>Total</span>
                <span className='text-primary'>${total.toFixed(2)}</span>
              </div>

              <div className='rounded-lg border border-primary/20 bg-primary/5 p-4'>
                <div className='mb-2 flex items-center gap-2 text-sm font-semibold'>
                  <Instagram className='h-4 w-4 text-primary' />
                  <span>Payment Instructions</span>
                </div>
                <p className='text-balance text-xs text-muted-foreground'>
                  After placing your order, you&apos;ll receive an Order ID.
                  Please send this ID to our Instagram page @palmkicks to
                  complete your purchase.
                </p>
              </div>

              <Button
                type='submit'
                size='lg'
                className='w-full'
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : "Place Order"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </form>
  );
};

export default CheckoutForm;
