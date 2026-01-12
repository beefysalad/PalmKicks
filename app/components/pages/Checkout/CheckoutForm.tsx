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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { generateOrderId, saveOrder } from "@/lib/orders";
import { motion } from "framer-motion";
import { CheckCircle2, MapPin, Truck } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCart } from "../../shared/CartProvider";
import ProgressIndicator from "./ProgressIndicator";
import { useForm } from "react-hook-form";
import { checkoutSchema, TCheckoutSchema } from "./checkoutZod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";

export enum DeliveryMethod {
  Shipping = "shipping",
  Meetup = "meetup",
}

const CheckoutForm = () => {
  const { items, total, clearCart } = useCart();
  const router = useRouter();

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(
    DeliveryMethod.Shipping
  );

  const form = useForm<TCheckoutSchema>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      zipCode: "",
      meetupLocation: "",
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (values: TCheckoutSchema) => {
      if (items.length === 0) {
        throw new Error("Cart is empty");
      }

      if (!deliveryMethod) {
        throw new Error("Please select a delivery method");
      }

      const orderId = generateOrderId();
      const order = {
        id: orderId,
        items: items.map((item) => ({ ...item })),
        customer: values,
        deliveryMethod,
        total,
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      };

      saveOrder(order);
      clearCart();

      return orderId;
    },
    onSuccess: (orderId) => {
      toast.success("Order Placed!", {
        description: `Your order #${orderId} has been placed successfully`,
        duration: 3000,
      });

      setTimeout(() => {
        router.push(`/order/${orderId}`);
      }, 500);
    },
    onError: (error: Error) => {
      toast.error("Order Failed", {
        description: error.message,
        duration: 4000,
      });
    },
  });

  const onSubmit = (values: TCheckoutSchema) => {
    checkoutMutation.mutate(values);
  };

  useEffect(() => {
    if (items.length === 0) {
      router.push("/cart");
    }
  }, [items.length, router]);

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

      <ProgressIndicator deliveryMethod={deliveryMethod} />

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className='grid gap-6 lg:grid-cols-3 lg:gap-8'>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className='lg:col-span-2 space-y-6'
          >
            {/* Delivery Method Card */}
            <Card className='border-2 shadow-sm transition-shadow hover:shadow-md'>
              <CardHeader className='space-y-1 pb-4'>
                <div className='flex items-center gap-2'>
                  <div className='flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary'>
                    1
                  </div>
                  <CardTitle className='text-xl'>Delivery Method</CardTitle>
                </div>
                <CardDescription className='text-sm'>
                  How would you like to receive your order?
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-0'>
                <RadioGroup
                  value={deliveryMethod}
                  onValueChange={(value) =>
                    setDeliveryMethod(value as DeliveryMethod)
                  }
                  className='grid gap-4 sm:grid-cols-2'
                >
                  <Label
                    htmlFor='shipping'
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all hover:bg-secondary/50 ${
                      deliveryMethod === DeliveryMethod.Shipping
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <RadioGroupItem
                      value={DeliveryMethod.Shipping}
                      id='shipping'
                    />
                    <div className='flex-1'>
                      <div className='flex items-center gap-2'>
                        <Truck className='h-5 w-5 text-primary' />
                        <span className='font-semibold'>Ship to Address</span>
                      </div>
                      <p className='mt-1 text-xs text-muted-foreground'>
                        We&apos;ll deliver to your doorstep
                      </p>
                    </div>
                  </Label>

                  <Label
                    htmlFor='meetup'
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all hover:bg-secondary/50 ${
                      deliveryMethod === DeliveryMethod.Meetup
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <RadioGroupItem value={DeliveryMethod.Meetup} id='meetup' />
                    <div className='flex-1'>
                      <div className='flex items-center gap-2'>
                        <MapPin className='h-5 w-5 text-primary' />
                        <span className='font-semibold'>Meet Up</span>
                      </div>
                      <p className='mt-1 text-xs text-muted-foreground'>
                        Pick up at a convenient location{" "}
                        <span className='text-red-500'>
                          (Cebu City Area only)
                        </span>
                      </p>
                    </div>
                  </Label>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Contact Information Card */}
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{
                opacity: deliveryMethod ? 1 : 0.5,
                height: deliveryMethod ? "auto" : 0,
              }}
              transition={{ duration: 0.3 }}
            >
              <Card
                className={`border-2 shadow-sm transition-shadow hover:shadow-md ${
                  !deliveryMethod && "pointer-events-none"
                }`}
              >
                <CardHeader className='space-y-1 pb-4'>
                  <div className='flex items-center gap-2'>
                    <div className='flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary'>
                      2
                    </div>
                    <CardTitle className='text-xl'>
                      Contact Information
                    </CardTitle>
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
                      placeholder='John Patrick'
                      disabled={!deliveryMethod || checkoutMutation.isPending}
                      {...form.register("name")}
                      className='h-11 transition-all focus:ring-2 focus:ring-primary/20'
                    />
                    {form.formState.errors.name && (
                      <p className='text-xs text-destructive'>
                        {form.formState.errors.name.message}
                      </p>
                    )}
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
                        disabled={!deliveryMethod || checkoutMutation.isPending}
                        {...form.register("email")}
                        className='h-11 transition-all focus:ring-2 focus:ring-primary/20'
                      />
                      {form.formState.errors.email && (
                        <p className='text-xs text-destructive'>
                          {form.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='phone' className='text-sm font-medium'>
                        Phone <span className='text-destructive'>*</span>
                      </Label>
                      <Input
                        id='phone'
                        type='tel'
                        placeholder='09123456789'
                        disabled={!deliveryMethod || checkoutMutation.isPending}
                        {...form.register("phone")}
                        className='h-11 transition-all focus:ring-2 focus:ring-primary/20'
                      />
                      {form.formState.errors.phone && (
                        <p className='text-xs text-destructive'>
                          {form.formState.errors.phone.message}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Shipping Address Card */}
            {deliveryMethod === DeliveryMethod.Shipping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className='border-2 shadow-sm transition-shadow hover:shadow-md'>
                  <CardHeader className='space-y-1 pb-4'>
                    <div className='flex items-center gap-2'>
                      <div className='flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary'>
                        3
                      </div>
                      <CardTitle className='text-xl'>
                        Shipping Address
                      </CardTitle>
                    </div>
                    <CardDescription className='text-sm'>
                      Where should we deliver your order?
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4 pt-0'>
                    <div className='space-y-2'>
                      <Label htmlFor='address' className='text-sm font-medium'>
                        Street Address{" "}
                        <span className='text-destructive'>*</span>
                      </Label>
                      <Input
                        id='address'
                        placeholder='123 Main St, Apt 4B'
                        disabled={checkoutMutation.isPending}
                        {...form.register("address")}
                        className='h-11 transition-all focus:ring-2 focus:ring-primary/20'
                      />
                      {form.formState.errors.address && (
                        <p className='text-xs text-destructive'>
                          {form.formState.errors.address.message}
                        </p>
                      )}
                    </div>
                    <div className='grid gap-4 sm:grid-cols-2'>
                      <div className='space-y-2'>
                        <Label htmlFor='city' className='text-sm font-medium'>
                          City <span className='text-destructive'>*</span>
                        </Label>
                        <Input
                          id='city'
                          placeholder='Cebu City'
                          disabled={checkoutMutation.isPending}
                          {...form.register("city")}
                          className='h-11 transition-all focus:ring-2 focus:ring-primary/20'
                        />
                        {form.formState.errors.city && (
                          <p className='text-xs text-destructive'>
                            {form.formState.errors.city.message}
                          </p>
                        )}
                      </div>
                      <div className='space-y-2'>
                        <Label
                          htmlFor='zipCode'
                          className='text-sm font-medium'
                        >
                          ZIP Code <span className='text-destructive'>*</span>
                        </Label>
                        <Input
                          id='zipCode'
                          placeholder='6000'
                          disabled={checkoutMutation.isPending}
                          {...form.register("zipCode")}
                          className='h-11 transition-all focus:ring-2 focus:ring-primary/20'
                        />
                        {form.formState.errors.zipCode && (
                          <p className='text-xs text-destructive'>
                            {form.formState.errors.zipCode.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Meetup Location Card */}
            {deliveryMethod === DeliveryMethod.Meetup && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className='border-2 shadow-sm transition-shadow hover:shadow-md'>
                  <CardHeader className='space-y-1 pb-4'>
                    <div className='flex items-center gap-2'>
                      <div className='flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary'>
                        3
                      </div>
                      <CardTitle className='text-xl'>
                        Meet Up Location
                      </CardTitle>
                    </div>
                    <CardDescription className='text-sm'>
                      Where would you like to meet for pickup?
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4 pt-0'>
                    <div className='space-y-2'>
                      <Label
                        htmlFor='meetupLocation'
                        className='text-sm font-medium'
                      >
                        Preferred Location{" "}
                        <span className='text-destructive'>*</span>
                      </Label>
                      <Input
                        id='meetupLocation'
                        placeholder='e.g., SM City Cebu, Near Mabolo'
                        disabled={checkoutMutation.isPending}
                        {...form.register("meetupLocation")}
                        className='h-11 transition-all focus:ring-2 focus:ring-primary/20'
                      />
                      {form.formState.errors.meetupLocation && (
                        <p className='text-xs text-destructive'>
                          {form.formState.errors.meetupLocation.message}
                        </p>
                      )}
                      <p className='text-xs text-muted-foreground'>
                        We&apos;ll coordinate the exact time and place via
                        Instagram
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
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
                      key={`${item.id}-${item.size}-${item.color}`}
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
                          Size {item.size}, Color {item.color} × {item.quantity}
                        </p>
                        <p className='mt-1 text-sm font-semibold text-primary'>
                          ₱{(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className='space-y-2.5'>
                  <div className='flex justify-between text-sm'>
                    <span className='text-muted-foreground'>Subtotal</span>
                    <span className='font-medium'>₱{total.toFixed(2)}</span>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span className='text-muted-foreground'>
                      {deliveryMethod === DeliveryMethod.Shipping
                        ? "Shipping"
                        : "Meetup"}
                    </span>
                    <span className='font-medium text-primary'>
                      {deliveryMethod === DeliveryMethod.Meetup
                        ? "Free"
                        : "You will shoulder"}
                    </span>
                  </div>
                </div>
                <Separator />
                <div className='flex items-center justify-between rounded-lg bg-primary/5 p-3'>
                  <span className='text-base font-semibold'>Total</span>
                  <span className='text-xl font-bold text-primary'>
                    ₱{total.toFixed(2)}
                  </span>
                </div>

                <div className='rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4'>
                  <div className='mb-2 flex items-center gap-2'>
                    <Image
                      src='/icons/instagram-hover.svg'
                      alt='Instagram'
                      className='w-5 h-5 block'
                      width={20}
                      height={20}
                    />
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
                  disabled={checkoutMutation.isPending || !deliveryMethod}
                >
                  {checkoutMutation.isPending ? (
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
