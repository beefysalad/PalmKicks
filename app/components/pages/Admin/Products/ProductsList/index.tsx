"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/lib/hooks/usePagination";
import {
  useDeleteProduct,
  useProducts,
  useToggleFeatured,
} from "@/lib/products/hooks";
import {
  Edit,
  Plus,
  Search,
  Star,
  Trash2,
  SlidersHorizontal,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

const ITEMS_PER_PAGE = 7;

const ProductsListPage = () => {
  const { data: products = [], isLoading } = useProducts();
  const deleteProductMutation = useDeleteProduct();
  const toggleFeaturedMutation = useToggleFeatured();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterGender, setFilterGender] = useState<string>("all");
  const [filterStock, setFilterStock] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const handleDelete = async (id: string) => {
    try {
      await deleteProductMutation.mutateAsync(id);
      setDeleteConfirm(null);
    } catch {
      // Error is handled by the hook
    }
  };

  const handleToggleFeatured = async (id: string) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;

    try {
      await toggleFeaturedMutation.mutateAsync({
        id,
        featured: !product.featured,
      });
    } catch {
      // Error is handled by the hook
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.brand.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        filterCategory === "all" || product.category === filterCategory;
      const matchesGender =
        filterGender === "all" || product.gender === filterGender;
      const matchesStock =
        filterStock === "all" ||
        (filterStock === "in" && product.inStock) ||
        (filterStock === "out" && !product.inStock);

      return matchesSearch && matchesCategory && matchesGender && matchesStock;
    });
  }, [products, searchQuery, filterCategory, filterGender, filterStock]);

  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedProducts,
    handlePageChange,
  } = usePagination({
    items: filteredProducts,
    itemsPerPage: ITEMS_PER_PAGE,
    resetDeps: [searchQuery, filterCategory, filterGender, filterStock],
  });

  const categories = Array.from(new Set(products.map((p) => p.category)));

  if (isLoading) {
    return (
      <div className='space-y-4 p-4'>
        <div>
          <h1 className='text-2xl font-bold'>Products</h1>
          <p className='text-sm text-muted-foreground'>
            Manage your product catalog
          </p>
        </div>
        <div className='py-12 text-center text-muted-foreground'>
          Loading products...
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-background pb-4'>
      {/* Header */}
      <div className='sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        <div className='flex items-center justify-between p-4'>
          <div>
            <h1 className='text-2xl font-bold'>Products</h1>
            <p className='text-sm text-muted-foreground'>
              {filteredProducts.length}{" "}
              {filteredProducts.length === 1 ? "product" : "products"}
            </p>
          </div>
          <Button size='sm' asChild className='h-9'>
            <Link href='/admin/products/new'>
              <Plus className='mr-1 h-4 w-4' />
              Add
            </Link>
          </Button>
        </div>

        {/* Search Bar */}
        <div className='px-4 pb-3'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Search products...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-9 pr-12'
            />
            <Button
              variant='ghost'
              size='sm'
              className='absolute right-1 top-1/2 h-7 -translate-y-1/2'
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className='h-4 w-4' />
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className='border-t bg-muted/30 p-4'>
            <div className='space-y-3'>
              <div>
                <label className='mb-1.5 block text-xs font-medium text-muted-foreground'>
                  Category
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                >
                  <option value='all'>All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='mb-1.5 block text-xs font-medium text-muted-foreground'>
                    Gender
                  </label>
                  <select
                    value={filterGender}
                    onChange={(e) => setFilterGender(e.target.value)}
                    className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                  >
                    <option value='all'>All</option>
                    <option value='men'>Men</option>
                    <option value='women'>Women</option>
                    <option value='kids'>Kids</option>
                  </select>
                </div>
                <div>
                  <label className='mb-1.5 block text-xs font-medium text-muted-foreground'>
                    Stock
                  </label>
                  <select
                    value={filterStock}
                    onChange={(e) => setFilterStock(e.target.value)}
                    className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                  >
                    <option value='all'>All</option>
                    <option value='in'>In Stock</option>
                    <option value='out'>Out of Stock</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Products List */}
      <div className='space-y-3 p-4'>
        {paginatedProducts.length === 0 ? (
          <div className='py-12 text-center'>
            <p className='text-muted-foreground'>No products found</p>
          </div>
        ) : (
          paginatedProducts.map((product) => (
            <div
              key={product.id}
              className='rounded-lg border bg-card overflow-hidden'
            >
              <div className='flex gap-3 p-3'>
                {/* Product Image */}
                <div className='relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-muted'>
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    fill
                    className='object-cover'
                  />
                </div>

                {/* Product Info */}
                <div className='flex-1 min-w-0'>
                  <div className='flex items-start justify-between gap-2 mb-1'>
                    <div className='flex-1 min-w-0'>
                      <h3 className='font-semibold text-sm leading-tight truncate'>
                        {product.name}
                      </h3>
                      <p className='text-xs text-muted-foreground mt-0.5'>
                        {product.brand.name}
                      </p>
                    </div>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8 flex-shrink-0'
                      onClick={() => handleToggleFeatured(product.id)}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          product.featured
                            ? "fill-yellow-500 text-yellow-500"
                            : "text-muted-foreground"
                        }`}
                      />
                    </Button>
                  </div>

                  <div className='flex items-center gap-2 mb-2'>
                    <span className='text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded'>
                      {product.category}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${
                        product.inStock
                          ? "bg-green-500/10 text-green-600"
                          : "bg-red-500/10 text-red-600"
                      }`}
                    >
                      {product.inStock ? "In Stock" : "Out of Stock"}
                    </span>
                  </div>

                  <div className='flex items-center justify-between'>
                    <div>
                      {product.discountPrice ? (
                        <div className='flex items-baseline gap-1.5'>
                          <span className='font-bold text-primary'>
                            ₱{Number(product.discountPrice).toLocaleString()}
                          </span>
                          <span className='text-xs text-muted-foreground line-through'>
                            ₱{Number(product.price).toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <span className='font-bold'>
                          ₱{Number(product.price).toLocaleString()}
                        </span>
                      )}
                    </div>

                    <div className='flex items-center gap-1'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-8 w-8'
                        asChild
                      >
                        <Link href={`/admin/products/${product.id}`}>
                          <Edit className='h-4 w-4' />
                        </Link>
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-8 w-8'
                        onClick={() => setDeleteConfirm(product.id)}
                      >
                        <Trash2 className='h-4 w-4 text-destructive' />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {filteredProducts.length > 0 && totalPages > 1 && (
        <div className='px-4 pb-4'>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
          <p className='text-center text-xs text-muted-foreground mt-2'>
            Page {currentPage} of {totalPages}
          </p>
        </div>
      )}

      {deleteConfirm && (
        <div className='fixed inset-0 z-50 flex items-end justify-center sm:items-center'>
          <div
            className='absolute inset-0 bg-black/50'
            onClick={() => setDeleteConfirm(null)}
          />
          <div className='relative w-full max-w-md rounded-t-2xl sm:rounded-lg border bg-card p-6 shadow-lg mx-4 mb-0 sm:mb-4'>
            <h3 className='mb-2 text-lg font-semibold'>Delete Product?</h3>
            <p className='mb-6 text-sm text-muted-foreground'>
              This action cannot be undone. The product will be permanently
              removed.
            </p>
            <div className='flex gap-3'>
              <Button
                variant='destructive'
                className='flex-1'
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteProductMutation.isPending}
              >
                {deleteProductMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
              <Button
                variant='outline'
                className='flex-1'
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsListPage;
