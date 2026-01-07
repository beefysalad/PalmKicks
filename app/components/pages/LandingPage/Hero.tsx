"use client";
import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
const Hero = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className='container relative z-10 px-4'>
      <div className='mx-auto max-w-4xl text-center'>
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.3, delay: shouldReduceMotion ? 0 : 0.1 }}
          className='mb-6 inline-block'
        >
          <Image
            src='/logo.jpg'
            alt='Palm Kicks Logo'
            width={140}
            height={140}
            priority
            className='mx-auto h-28 w-28 rounded-full md:h-36 md:w-36'
          />
        </motion.div>

        <motion.h1
          className='mb-6 text-balance text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl'
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.4, delay: shouldReduceMotion ? 0 : 0.15 }}
        >
          Your Premium Destination for{" "}
          <span className='text-primary'>Authentic Sneakers</span>
        </motion.h1>

        <motion.p
          className='mx-auto mb-8 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg md:text-xl'
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.4, delay: shouldReduceMotion ? 0 : 0.2 }}
        >
          Explore the Tropics <span className='text-primary'>one step</span> at
          a time
        </motion.p>

        <motion.div
          className='flex flex-col items-center justify-center gap-3 sm:flex-row'
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.4, delay: shouldReduceMotion ? 0 : 0.25 }}
        >
          <Button size='lg' asChild className='w-full gap-2 sm:w-auto'>
            <Link href='/shop'>
              Shop Now <ArrowRight className='h-4 w-4' />
            </Link>
          </Button>
          <Button
            size='lg'
            variant='outline'
            asChild
            className='w-full bg-transparent sm:w-auto'
          >
            <Link href='/track'>Track Order</Link>
          </Button>
        </motion.div>

        {/* Stats section */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.4, delay: shouldReduceMotion ? 0 : 0.3 }}
          className='mt-12 grid grid-cols-3 gap-6 md:mt-16'
        >
          <div>
            <p className='text-3xl font-bold text-primary md:text-4xl'>100+</p>
            <p className='mt-1 text-sm text-muted-foreground'>Premium Kicks</p>
          </div>
          <div>
            <p className='text-3xl font-bold text-primary md:text-4xl'>100%</p>
            <p className='mt-1 text-sm text-muted-foreground'>Authentic</p>
          </div>
          <div>
            <p className='text-3xl font-bold text-primary md:text-4xl'>Fast</p>
            <p className='mt-1 text-sm text-muted-foreground'>Shipping</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Hero;
