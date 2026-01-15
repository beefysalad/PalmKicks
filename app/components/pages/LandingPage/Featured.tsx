"use client";
import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import FeaturedCarousel from "./FeaturedCarousel";
import { useFeaturedProducts } from "@/lib/products/hooks";

const Featured = () => {
  const shouldReduceMotion = useReducedMotion();
  const { data: featuredProducts = [], isLoading: isLoadingFeatured } =
    useFeaturedProducts();

  // Only show products with featured: true
  const displayProducts = featuredProducts;
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
        {isLoadingFeatured ? (
          <div className='rounded-2xl bg-card p-12 text-center'>
            <p className='text-muted-foreground'>
              Loading featured products...
            </p>
          </div>
        ) : displayProducts.length > 0 ? (
          <FeaturedCarousel products={displayProducts} />
        ) : (
          <div className='rounded-2xl bg-card p-12 text-center'>
            <p className='text-muted-foreground'>
              No featured products available
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default Featured;
