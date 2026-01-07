"use client";
import { motion, useReducedMotion } from "framer-motion";
import { Zap, Shield, Package, ShoppingBag } from "lucide-react";
const WhyPalmKicks = () => {
  const shouldReduceMotion = useReducedMotion();
  return (
    <section className='border-y border-border/40 bg-secondary/20 py-12 md:py-16'>
      <div className='w-full px-4'>
        <ShoppingBag className='mx-auto mb-4 h-8 w-8 text-primary' />
        <motion.h1
          className='mb-10 text-center text-3xl font-bold md:text-4xl'
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.4 }}
        >
          Why Choose Palm Kicks
        </motion.h1>
        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8'>
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
            viewport={{ once: true }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.3,
              delay: shouldReduceMotion ? 0 : 0.05,
            }}
            className='flex flex-col items-center rounded-lg bg-background/50 p-6 text-center backdrop-blur '
          >
            <div className='mb-4 rounded-full bg-primary/10 p-4'>
              <Zap className='h-7 w-7 text-primary' />
            </div>
            <h3 className='mb-2 text-lg font-semibold'>Nationwide Shipping</h3>
            <p className='text-sm text-muted-foreground'>
              Fast and reliable delivery across the country
            </p>
          </motion.div>
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
            viewport={{ once: true }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.3,
              delay: shouldReduceMotion ? 0 : 0.1,
            }}
            className='flex flex-col items-center rounded-lg bg-background/50 p-6 text-center backdrop-blur '
          >
            <div className='mb-4 rounded-full bg-primary/10 p-4'>
              <Shield className='h-7 w-7 text-primary' />
            </div>
            <h3 className='mb-2 text-lg font-semibold'>100% Authentic</h3>
            <p className='text-sm text-muted-foreground'>
              Only genuine products from verified sources
            </p>
          </motion.div>
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
            viewport={{ once: true }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.3,
              delay: shouldReduceMotion ? 0 : 0.15,
            }}
            className='flex flex-col items-center rounded-lg bg-background/50 p-6 text-center backdrop-blur sm:col-span-2 lg:col-span-1'
          >
            <div className='mb-4 rounded-full bg-primary/10 p-4'>
              <Package className='h-7 w-7 text-primary' />
            </div>
            <h3 className='mb-2 text-lg font-semibold'>Easy Tracking</h3>
            <p className='text-sm text-muted-foreground'>
              Track your order status anytime, anywhere
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default WhyPalmKicks;
