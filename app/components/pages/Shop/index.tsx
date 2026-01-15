"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/lib/hooks/usePagination";
import { useProducts } from "@/lib/products/hooks";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import ProductCard from "./ProductCard";

enum Filter {
  MEN = "men",
  WOMEN = "women",
  KIDS = "kids",
  ALL = "all",
}

const ITEMS_PER_PAGE = 12;

const Shop = () => {
  const { data: products = [], isLoading } = useProducts();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filter, setFilter] = useState<Filter>(Filter.ALL);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesFilter = filter === "all" || p.gender === filter;
      const matchesSearch = p.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [products, filter, searchQuery]);

  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedProducts,
    handlePageChange,
  } = usePagination({
    items: filteredProducts,
    itemsPerPage: ITEMS_PER_PAGE,
    resetDeps: [searchQuery, filter],
  });

  const handleFilterChange = (newFilter: Filter) => {
    setFilter(newFilter);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

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
                onChange={(e) => handleSearchChange(e.target.value)}
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
              onClick={() => handleFilterChange(Filter.ALL)}
            >
              All
            </Button>
            <Button
              variant={filter === Filter.MEN ? "default" : "outline"}
              size='sm'
              onClick={() => handleFilterChange(Filter.MEN)}
            >
              Men
            </Button>
            <Button
              variant={filter === Filter.WOMEN ? "default" : "outline"}
              size='sm'
              onClick={() => handleFilterChange(Filter.WOMEN)}
            >
              Women
            </Button>
            <Button
              variant={filter === Filter.KIDS ? "default" : "outline"}
              size='sm'
              onClick={() => handleFilterChange(Filter.KIDS)}
            >
              Kids
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {isLoading ? (
              <div className='py-16 text-center'>
                <p className='text-muted-foreground'>Loading products...</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              <>
                <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                  {paginatedProducts.map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      index={index}
                    />
                  ))}
                </div>
                <div className='mt-8'>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              </>
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
