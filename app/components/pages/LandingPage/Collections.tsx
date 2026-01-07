"use client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { products } from "@/lib/products";
import ProductCard from "./ProductCard";

const Collections = () => {
  return (
    <section className='py-12 md:py-16'>
      <div className='w-full px-4'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className='mb-8'
        >
          <h2 className='text-3xl font-bold md:text-4xl'>Latest Collection</h2>
          <p className='mt-2 text-muted-foreground'>
            Browse our curated selection of premium sneakers
          </p>
        </motion.div>
        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className='mt-8 text-center'
        >
          <Button size='lg' variant='outline' asChild>
            <Link href='/shop'>View All Products</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default Collections;
