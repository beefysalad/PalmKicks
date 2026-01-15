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
import { checkoutFn } from "../../../../lib/checkout/checkout";

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
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

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
    mutationFn: (values: TCheckoutSchema) =>
      checkoutFn({
        values,
        items,
        total,
        deliveryMethod,
        clearCart,
      }),
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
      setIsPlacingOrder(false);
      toast.error("Order Failed", {
        description: error.message,
        duration: 4000,
      });
    },
  });

  const onSubmit = (values: TCheckoutSchema) => {
    setIsPlacingOrder(true);
    checkoutMutation.mutate(values);
  };

  useEffect(() => {
    if (items.length === 0 && !isPlacingOrder) {
      router.push("/cart");
    }
  }, [items.length, isPlacingOrder, router]);

  if (items.length === 0 && !isPlacingOrder) {
    return null;
  }

  if (isPlacingOrder) {
    return (
      <div className='min-h-screen flex items-center justify-center px-4'>
        <div className='max-w-md w-full text-center space-y-4'>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "linear",
            }}
            className='mx-auto h-10 w-10 rounded-full border-2 border-primary border-t-transparent'
          />
          <h1 className='text-2xl font-semibold'>Finalizing your order</h1>
          <p className='text-sm text-muted-foreground'>
            Please wait while we confirm your order and prepare your
            confirmation page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen overflow-x-hidden'>
      <div className='w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8'>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className='mb-6 sm:mb-8'
        >
          <h1 className='mb-2 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl break-words'>
            Checkout
          </h1>
          <p className='text-sm sm:text-base text-muted-foreground'>
            Complete your order by filling in your details below
          </p>
        </motion.div>

        <div className='overflow-x-hidden'>
          <ProgressIndicator deliveryMethod={deliveryMethod} />
        </div>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='w-full overflow-x-hidden'
        >
          <div className='grid gap-6 lg:grid-cols-3 lg:gap-8 w-full'>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className='lg:col-span-2 space-y-4 sm:space-y-6 w-full min-w-0'
            >
              {/* Delivery Method Card */}
              <Card className='border-2 shadow-sm w-full'>
                <CardHeader className='space-y-1 pb-3 sm:pb-4'>
                  <div className='flex items-center gap-2'>
                    <div className='flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary'>
                      1
                    </div>
                    <CardTitle className='text-lg sm:text-xl'>
                      Delivery Method
                    </CardTitle>
                  </div>
                  <CardDescription className='text-xs sm:text-sm'>
                    How would you like to receive your order?
                  </CardDescription>
                </CardHeader>
                <CardContent className='pt-0 w-full'>
                  <RadioGroup
                    value={deliveryMethod}
                    onValueChange={(value) =>
                      setDeliveryMethod(value as DeliveryMethod)
                    }
                    className='grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 w-full'
                  >
                    <Label
                      htmlFor='shipping'
                      className={`flex cursor-pointer items-start gap-2 sm:gap-3 rounded-lg border-2 p-3 sm:p-4 transition-all hover:bg-secondary/50 min-w-0 ${
                        deliveryMethod === DeliveryMethod.Shipping
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <RadioGroupItem
                        value={DeliveryMethod.Shipping}
                        id='shipping'
                        className='mt-0.5 flex-shrink-0'
                      />
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2'>
                          <Truck className='h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0' />
                          <span className='text-sm sm:text-base font-semibold'>
                            Ship to Address
                          </span>
                        </div>
                        <p className='mt-1 text-xs text-muted-foreground'>
                          We&apos;ll deliver to your doorstep
                        </p>
                      </div>
                    </Label>

                    <Label
                      htmlFor='meetup'
                      className={`flex cursor-pointer items-start gap-2 sm:gap-3 rounded-lg border-2 p-3 sm:p-4 transition-all hover:bg-secondary/50 min-w-0 ${
                        deliveryMethod === DeliveryMethod.Meetup
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <RadioGroupItem
                        value={DeliveryMethod.Meetup}
                        id='meetup'
                        className='mt-0.5 flex-shrink-0'
                      />
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2'>
                          <MapPin className='h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0' />
                          <span className='text-sm sm:text-base font-semibold'>
                            Meet Up
                          </span>
                        </div>
                        <p className='mt-1 text-xs text-muted-foreground break-words'>
                          Pick up at a convenient location{" "}
                          <span className='text-red-500'>(Cebu City only)</span>
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
                className='w-full min-w-0'
              >
                <Card
                  className={`border-2 shadow-sm w-full ${
                    !deliveryMethod && "pointer-events-none"
                  }`}
                >
                  <CardHeader className='space-y-1 pb-3 sm:pb-4'>
                    <div className='flex items-center gap-2'>
                      <div className='flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary'>
                        2
                      </div>
                      <CardTitle className='text-lg sm:text-xl'>
                        Contact Information
                      </CardTitle>
                    </div>
                    <CardDescription className='text-xs sm:text-sm'>
                      We&apos;ll use this to contact you about your order
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-3 sm:space-y-4 pt-0'>
                    <div className='space-y-2'>
                      <Label htmlFor='name' className='text-sm font-medium'>
                        Full Name <span className='text-destructive'>*</span>
                      </Label>
                      <Input
                        id='name'
                        placeholder='John Patrick'
                        disabled={!deliveryMethod || checkoutMutation.isPending}
                        {...form.register("name")}
                        className='h-10 sm:h-11'
                      />
                      {form.formState.errors.name && (
                        <p className='text-xs text-destructive'>
                          {form.formState.errors.name.message}
                        </p>
                      )}
                    </div>
                    <div className='grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2'>
                      <div className='space-y-2'>
                        <Label htmlFor='email' className='text-sm font-medium'>
                          Email <span className='text-destructive'>*</span>
                        </Label>
                        <Input
                          id='email'
                          type='email'
                          placeholder='john@example.com'
                          disabled={
                            !deliveryMethod || checkoutMutation.isPending
                          }
                          {...form.register("email")}
                          className='h-10 sm:h-11'
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
                          disabled={
                            !deliveryMethod || checkoutMutation.isPending
                          }
                          {...form.register("phone")}
                          className='h-10 sm:h-11'
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
                  <Card className='border-2 shadow-sm'>
                    <CardHeader className='space-y-1 pb-3 sm:pb-4'>
                      <div className='flex items-center gap-2'>
                        <div className='flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary'>
                          3
                        </div>
                        <CardTitle className='text-lg sm:text-xl'>
                          Shipping Address
                        </CardTitle>
                      </div>
                      <CardDescription className='text-xs sm:text-sm'>
                        Where should we deliver your order?
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-3 sm:space-y-4 pt-0'>
                      <div className='space-y-2'>
                        <Label
                          htmlFor='address'
                          className='text-sm font-medium'
                        >
                          Street Address{" "}
                          <span className='text-destructive'>*</span>
                        </Label>
                        <Input
                          id='address'
                          placeholder='123 Main St, Apt 4B'
                          disabled={checkoutMutation.isPending}
                          {...form.register("address")}
                          className='h-10 sm:h-11'
                        />
                        {form.formState.errors.address && (
                          <p className='text-xs text-destructive'>
                            {form.formState.errors.address.message}
                          </p>
                        )}
                      </div>
                      <div className='grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2'>
                        <div className='space-y-2'>
                          <Label htmlFor='city' className='text-sm font-medium'>
                            City <span className='text-destructive'>*</span>
                          </Label>
                          <Input
                            id='city'
                            placeholder='Cebu City'
                            disabled={checkoutMutation.isPending}
                            {...form.register("city")}
                            className='h-10 sm:h-11'
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
                            className='h-10 sm:h-11'
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
                  <Card className='border-2 shadow-sm'>
                    <CardHeader className='space-y-1 pb-3 sm:pb-4'>
                      <div className='flex items-center gap-2'>
                        <div className='flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary'>
                          3
                        </div>
                        <CardTitle className='text-lg sm:text-xl'>
                          Meet Up Location
                        </CardTitle>
                      </div>
                      <CardDescription className='text-xs sm:text-sm'>
                        Where would you like to meet for pickup?
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-3 sm:space-y-4 pt-0'>
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
                          placeholder='e.g., SM City Cebu'
                          disabled={checkoutMutation.isPending}
                          {...form.register("meetupLocation")}
                          className='h-10 sm:h-11'
                        />
                        {form.formState.errors.meetupLocation && (
                          <p className='text-xs text-destructive'>
                            {form.formState.errors.meetupLocation.message}
                          </p>
                        )}
                        <p className='text-xs text-muted-foreground'>
                          We&apos;ll coordinate via Instagram
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
              className='lg:sticky lg:top-24 lg:self-start w-full min-w-0'
            >
              <Card className='border-2 shadow-lg w-full'>
                <CardHeader className='border-b pb-3 sm:pb-4'>
                  <CardTitle className='text-lg'>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className='space-y-3 sm:space-y-4 pt-3 sm:pt-4 w-full'>
                  <div className='max-h-[240px] sm:max-h-[280px] space-y-2 sm:space-y-3 overflow-y-auto overflow-x-hidden pr-1 sm:pr-2 w-full'>
                    {items.map((item) => (
                      <div
                        key={`${item.id}-${item.size}-${item.color}`}
                        className='flex gap-2 sm:gap-3 rounded-lg border border-border/50 bg-secondary/20 p-2 transition-colors w-full min-w-0'
                      >
                        <div className='relative h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 overflow-hidden rounded-md border border-border bg-background'>
                          <Image
                            src={item.image || "/placeholder.svg"}
                            alt={item.name}
                            width={64}
                            height={64}
                            className='h-full w-full object-cover'
                          />
                        </div>
                        <div className='flex-1 min-w-0 overflow-hidden'>
                          <p className='truncate text-xs sm:text-sm font-medium'>
                            {item.name}
                          </p>
                          <p className='text-[10px] sm:text-xs text-muted-foreground truncate'>
                            Size {item.size}, {item.color} × {item.quantity}
                          </p>
                          <p className='mt-0.5 sm:mt-1 text-xs sm:text-sm font-semibold text-primary'>
                            ₱{(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className='space-y-2'>
                    <div className='flex justify-between text-xs sm:text-sm'>
                      <span className='text-muted-foreground'>Subtotal</span>
                      <span className='font-medium'>₱{total.toFixed(2)}</span>
                    </div>
                    <div className='flex justify-between text-xs sm:text-sm'>
                      <span className='text-muted-foreground'>
                        {deliveryMethod === DeliveryMethod.Shipping
                          ? "Shipping"
                          : "Meetup"}
                      </span>
                      <span className='font-medium text-primary'>
                        {deliveryMethod === DeliveryMethod.Meetup
                          ? "Free"
                          : "To be determined"}
                      </span>
                    </div>
                  </div>
                  <Separator />
                  <div className='flex items-center justify-between rounded-lg bg-primary/5 p-2.5 sm:p-3'>
                    <span className='text-sm sm:text-base font-semibold'>
                      Total
                    </span>
                    <span className='text-lg sm:text-xl font-bold text-primary'>
                      ₱{total.toFixed(2)}
                    </span>
                  </div>

                  <div className='rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-3 sm:p-4'>
                    <div className='mb-2 flex items-center gap-2'>
                      <Image
                        src='/icons/instagram-hover.svg'
                        alt='Instagram'
                        className='w-4 h-4 sm:w-5 sm:h-5 block'
                        width={20}
                        height={20}
                      />
                      <span className='text-xs sm:text-sm font-semibold text-foreground'>
                        Payment Instructions
                      </span>
                    </div>
                    <p className='text-[10px] sm:text-xs leading-relaxed text-muted-foreground'>
                      After placing your order, you&apos;ll receive an Order ID.
                      Send it to{" "}
                      <span className='font-semibold text-primary'>
                        @palmkicks
                      </span>{" "}
                      on Instagram.
                    </p>
                  </div>

                  <Button
                    type='submit'
                    size='lg'
                    className='w-full text-sm sm:text-base font-semibold shadow-md'
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
                        <CheckCircle2 className='h-4 w-4 sm:h-5 sm:w-5' />
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
    </div>
  );
};

export default CheckoutForm;
