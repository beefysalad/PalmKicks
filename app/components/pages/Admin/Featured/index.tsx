"use client";

import { useState, useMemo } from "react";
import { getAllProducts } from "@/lib/admin-products";
import {
  getFeaturedProductIds,
  setFeaturedProductIds,
} from "@/lib/admin-featured";
import { usePagination } from "@/lib/hooks/usePagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import Image from "next/image";
import { toast } from "sonner";
import type { Product } from "@/lib/products/products";

const ITEMS_PER_PAGE = 12;

const FeaturedPage = () => {
  const [products] = useState<Product[]>(() => getAllProducts());
  const [featuredIds, setFeaturedIds] = useState<string[]>(() =>
    getFeaturedProductIds()
  );
  const [searchQuery, setSearchQuery] = useState("");

  const handleToggle = (productId: string) => {
    const newFeatured = featuredIds.includes(productId)
      ? featuredIds.filter((id) => id !== productId)
      : [...featuredIds, productId];

    setFeaturedIds(newFeatured);
  };

  const handleSave = () => {
    setFeaturedProductIds(featuredIds);
    toast.success("Featured collection updated");
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;

    const query = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedProducts,
    handlePageChange,
  } = usePagination({
    items: filteredProducts,
    itemsPerPage: ITEMS_PER_PAGE,
  });

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Featured Collection</h1>
          <p className='text-muted-foreground'>
            Select products to display in the featured carousel on the homepage
          </p>
        </div>
        <Button onClick={handleSave}>Save Changes</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Select Featured Products ({featuredIds.length} selected)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='mb-4'>
            <Input
              type='text'
              placeholder='Search by product name or brand...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='max-w-md'
            />
          </div>
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {paginatedProducts.map((product) => {
              const isFeatured = featuredIds.includes(product.id);
              return (
                <div
                  key={product.id}
                  className={`cursor-pointer rounded-lg border p-4 transition-all ${
                    isFeatured
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => handleToggle(product.id)}
                >
                  <div className='flex items-start gap-4'>
                    <div className='relative h-20 w-20 shrink-0 overflow-hidden rounded'>
                      <Image
                        src={product.image || "/placeholder.svg"}
                        alt={product.name}
                        fill
                        className='object-cover'
                      />
                    </div>
                    <div className='flex-1'>
                      <h3 className='font-semibold'>{product.name}</h3>
                      <p className='text-sm text-muted-foreground'>
                        {product.brand} • ₱{product.price}
                      </p>
                    </div>
                    <div className='shrink-0'>
                      <input
                        type='checkbox'
                        checked={isFeatured}
                        onChange={() => handleToggle(product.id)}
                        className='h-5 w-5 rounded border-gray-300'
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {filteredProducts.length === 0 && searchQuery.trim() && (
            <div className='py-12 text-center text-muted-foreground'>
              No products found matching "{searchQuery}"
            </div>
          )}
          {products.length === 0 && (
            <div className='py-12 text-center text-muted-foreground'>
              No products available. Add products first.
            </div>
          )}
          {filteredProducts.length > ITEMS_PER_PAGE && (
            <div className='mt-6'>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FeaturedPage;
