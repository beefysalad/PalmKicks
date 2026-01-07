"use client";
import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import FeaturedCarousel from "./FeaturedCarousel";
import { products } from "@/lib/products";

const Featured = () => {
  const shouldReduceMotion = useReducedMotion();
  const featuredProducts = products.slice(0, 4);
  return (
    <section className='py-12 md:py-16'>
      <div className='w-full px-4'>
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.4 }}
          className='mb-8 text-center'
        >
          <div className='mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary'>
            <TrendingUp className='h-4 w-4' />
            Trending Now
          </div>
          <h2 className='text-3xl font-bold md:text-4xl'>
            Featured Collection
          </h2>
          <p className='mt-2 text-muted-foreground'>
            Handpicked sneakers just for you
          </p>
        </motion.div>
        <FeaturedCarousel products={featuredProducts} />
      </div>
    </section>
  );
};

export default Featured;
