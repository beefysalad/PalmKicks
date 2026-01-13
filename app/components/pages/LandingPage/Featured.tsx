"use client";
import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import FeaturedCarousel from "./FeaturedCarousel";
import { getAllProducts } from "@/lib/admin-products";
import { getFeaturedProductIds } from "@/lib/admin-featured";
import { useState, useLayoutEffect } from "react";
import type { Product } from "@/lib/products/products";

const Featured = () => {
  const shouldReduceMotion = useReducedMotion();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);

  useLayoutEffect(() => {
    // Defer state update to avoid synchronous setState in effect
    // Necessary: accessing localStorage requires client-side execution after mount
    setTimeout(() => {
      const allProducts = getAllProducts();
      const featuredIds = getFeaturedProductIds();

      if (featuredIds.length > 0) {
        // Use featured products from localStorage
        const featured = featuredIds
          .map((id) => allProducts.find((p) => p.id === id))
          .filter((p): p is Product => p !== undefined);
        setFeaturedProducts(
          featured.length > 0 ? featured : allProducts.slice(0, 4)
        );
      } else {
        // Fallback to first 4 products if no featured selection
        setFeaturedProducts(allProducts.slice(0, 4));
      }
    }, 0);
  }, []);
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
        {featuredProducts.length > 0 ? (
          <FeaturedCarousel products={featuredProducts} />
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
