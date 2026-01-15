"use client";

import { useState, useMemo } from "react";
import { useProducts, useToggleFeatured } from "@/lib/products/hooks";
import { usePagination } from "@/lib/hooks/usePagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import Image from "next/image";

const ITEMS_PER_PAGE = 12;

const FeaturedPage = () => {
  const { data: products = [], isLoading } = useProducts();
  const toggleFeaturedMutation = useToggleFeatured();
  const [searchQuery, setSearchQuery] = useState("");

  const handleToggle = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    try {
      await toggleFeaturedMutation.mutateAsync({
        id: productId,
        featured: !product.featured,
      });
    } catch {
      // Error is handled by the hook
    }
  };

  const featuredProducts = useMemo(() => {
    return products.filter((p) => p.featured);
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;

    const query = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.brand.name.toLowerCase().includes(query)
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

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div>
          <h1 className='text-3xl font-bold'>Featured Collection</h1>
          <p className='text-muted-foreground'>
            Select products to display in the featured carousel on the homepage
          </p>
        </div>
        <div className='py-12 text-center text-muted-foreground'>
          Loading products...
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Featured Collection</h1>
          <p className='text-muted-foreground'>
            Select products to display in the featured carousel on the homepage
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Select Featured Products ({featuredProducts.length} selected)
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
              const isFeatured = product.featured;
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
                        {product.brand.name} • ₱{Number(product.price)}
                      </p>
                    </div>
                    <div className='shrink-0'>
                      <input
                        type='checkbox'
                        checked={isFeatured}
                        onChange={() => handleToggle(product.id)}
                        disabled={toggleFeaturedMutation.isPending}
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
              No products found matching &quot;{searchQuery}&quot;
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
