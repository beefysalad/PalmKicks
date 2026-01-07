"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "../../shared/CartProvider";
import EmptyCart from "./EmptyCart";

const Cart = () => {
  const { items, updateQuantity, removeItem, total } = useCart();

  if (items.length === 0) {
    return <EmptyCart />;
  }
  return (
    <div className='grid gap-8 lg:grid-cols-3'>
      <div className='lg:col-span-2'>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className='mb-6 text-2xl font-bold md:text-3xl'>Shopping Cart</h1>
          <div className='space-y-4'>
            <AnimatePresence mode='popLayout'>
              {items.map((item) => (
                <motion.div
                  key={`${item.id}-${item.size}`}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, x: -100 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardContent className='p-3 md:p-4'>
                      <div className='flex flex-col gap-4 sm:flex-row'>
                        <div className='relative h-32 w-full flex-shrink-0 overflow-hidden rounded-md border border-border sm:h-24 sm:w-24'>
                          <Image
                            src={item.image || "/placeholder.svg"}
                            alt={item.name}
                            width={128}
                            height={128}
                            className='h-full w-full object-cover'
                          />
                        </div>
                        <div className='flex flex-1 flex-col justify-between gap-3'>
                          <div>
                            <h3 className='font-semibold text-sm md:text-base'>
                              {item.name}
                            </h3>
                            <p className='text-xs md:text-sm text-muted-foreground'>
                              Size: {item.size}
                            </p>
                          </div>
                          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                            <div className='flex items-center gap-2'>
                              <Button
                                size='icon'
                                variant='outline'
                                onClick={() =>
                                  updateQuantity(
                                    item.id,
                                    item.size,
                                    item.quantity - 1
                                  )
                                }
                                className='h-8 w-8'
                              >
                                <Minus className='h-3 w-3' />
                              </Button>
                              <span className='w-8 text-center font-semibold'>
                                {item.quantity}
                              </span>
                              <Button
                                size='icon'
                                variant='outline'
                                onClick={() =>
                                  updateQuantity(
                                    item.id,
                                    item.size,
                                    item.quantity + 1
                                  )
                                }
                                className='h-8 w-8'
                              >
                                <Plus className='h-3 w-3' />
                              </Button>
                            </div>
                            <div className='flex items-center justify-between sm:gap-4'>
                              <p className='font-bold text-primary'>
                                ${(item.price * item.quantity).toFixed(2)}
                              </p>
                              <Button
                                size='icon'
                                variant='ghost'
                                onClick={() => removeItem(item.id, item.size)}
                                className='h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive'
                              >
                                <Trash2 className='h-4 w-4' />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className='lg:sticky lg:top-20'>
          <CardHeader>
            <CardTitle className='text-lg md:text-xl'>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Subtotal</span>
                <span className='font-medium'>${total.toFixed(2)}</span>
              </div>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Shipping</span>
                <span className='font-medium text-xs md:text-sm'>
                  Calculated at checkout
                </span>
              </div>
            </div>
            <Separator />
            <div className='flex justify-between text-lg font-bold'>
              <span>Total</span>
              <span className='text-primary'>${total.toFixed(2)}</span>
            </div>
            <Button asChild size='lg' className='w-full'>
              <Link href='/checkout'>
                Proceed to Checkout
                <ArrowRight className='ml-2 h-4 w-4' />
              </Link>
            </Button>
            <Button
              asChild
              variant='outline'
              size='lg'
              className='w-full bg-transparent'
            >
              <Link href='/'>Continue Shopping</Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Cart;
