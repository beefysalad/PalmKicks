"use client";
import { products } from "@/lib/products";
import { useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ProductCard from "./ProductCard";
enum Filter {
  MEN = "men",
  WOMEN = "women",
  KIDS = "kids",
  ALL = "all",
}
const Shop = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filter, setFilter] = useState<Filter>(Filter.ALL);

  const filteredProducts = products.filter((p) => {
    const matchesFilter = filter === "all" || p.gender === filter;
    const matchesSearch = p.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <main className='min-h-screen'>
      <section className='border-b border-border/40 bg-secondary/20 py-12'>
        <div className='w-full px-4'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className='mx-auto max-w-3xl text-center'
          >
            <h1 className='mb-4 text-balance text-4xl font-bold tracking-tighter sm:text-5xl'>
              Shop All <span className='text-primary'>Sneakers</span>
            </h1>
            <p className='text-pretty text-muted-foreground'>
              Browse our complete collection of premium sneakers for men, women,
              and kids
            </p>
          </motion.div>
        </div>
      </section>

      <section className='py-8'>
        <div className='w-full px-4'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className='mb-6'
          >
            <div className='relative mx-auto max-w-md'>
              <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                type='text'
                placeholder='Search sneakers...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-9'
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className='mb-8 flex flex-wrap items-center gap-2'
          >
            <span className='text-sm font-medium text-muted-foreground'>
              Filter by:
            </span>
            <Button
              variant={filter === Filter.ALL ? "default" : "outline"}
              size='sm'
              onClick={() => setFilter(Filter.ALL)}
            >
              All
            </Button>
            <Button
              variant={filter === Filter.MEN ? "default" : "outline"}
              size='sm'
              onClick={() => setFilter(Filter.MEN)}
            >
              Men
            </Button>
            <Button
              variant={filter === Filter.WOMEN ? "default" : "outline"}
              size='sm'
              onClick={() => setFilter(Filter.WOMEN)}
            >
              Women
            </Button>
            <Button
              variant={filter === Filter.KIDS ? "default" : "outline"}
              size='sm'
              onClick={() => setFilter(Filter.KIDS)}
            >
              Kids
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {filteredProducts.length > 0 ? (
              <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                {filteredProducts.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className='py-16 text-center'>
                <p className='text-muted-foreground'>
                  No products found in this category
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </main>
  );
};

export default Shop;
