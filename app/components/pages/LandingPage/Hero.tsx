"use client";
import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import PulsingBackground from "../../shared/PulsingBackground";
const Hero = () => {
  return (
    <section className='relative min-h-screen flex items-center justify-center overflow-hidden bg-background pt-20'>
      <PulsingBackground />

      <div className='container mx-auto px-4 relative z-10'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className='flex flex-col items-center justify-center text-center space-y-8 max-w-4xl mx-auto'
        >
          <div className='space-y-6'>
            <h1 className='text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-balance leading-tight'>
              Explore the tropics,
              <br />
              <span className='text-primary'>one step at a time.</span>
            </h1>
            <p className='text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto'>
              Handpicked pairs. Limited stock. Zero fakes.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <Button
              asChild
              size='lg'
              className='bg-primary hover:bg-primary/90 text-background px-8 h-12 text-lg'
            >
              <Link href='/shop'>Shop Now</Link>
            </Button>
          </motion.div>

          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            className='pt-8'
          >
            <p className='text-sm text-muted-foreground'>Scroll to explore</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
