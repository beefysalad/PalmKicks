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
import { Edit, Plus, Search, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

const ITEMS_PER_PAGE = 10;

const ProductsListPage = () => {
  const { data: products = [], isLoading } = useProducts();
  const deleteProductMutation = useDeleteProduct();
  const toggleFeaturedMutation = useToggleFeatured();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterGender, setFilterGender] = useState<string>("all");
  const [filterStock, setFilterStock] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold'>Products</h1>
            <p className='text-muted-foreground'>Manage your product catalog</p>
          </div>
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
          <h1 className='text-3xl font-bold'>Products</h1>
          <p className='text-muted-foreground'>Manage your product catalog</p>
        </div>
        <Button asChild>
          <Link href='/admin/products/new'>
            <Plus className='mr-2 h-4 w-4' />
            Add Product
          </Link>
        </Button>
      </div>

      <div className='space-y-4 rounded-lg border bg-card p-4'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='Search by name or brand...'
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            className='pl-9'
          />
        </div>
        <div className='flex flex-wrap gap-4'>
          <div>
            <label className='mb-1 block text-sm font-medium'>Category</label>
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
              }}
              className='rounded-md border border-input bg-background px-3 py-2 text-sm'
            >
              <option value='all'>All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className='mb-1 block text-sm font-medium'>Gender</label>
            <select
              value={filterGender}
              onChange={(e) => {
                setFilterGender(e.target.value);
              }}
              className='rounded-md border border-input bg-background px-3 py-2 text-sm'
            >
              <option value='all'>All</option>
              <option value='men'>Men</option>
              <option value='women'>Women</option>
              <option value='kids'>Kids</option>
            </select>
          </div>
          <div>
            <label className='mb-1 block text-sm font-medium'>Stock</label>
            <select
              value={filterStock}
              onChange={(e) => {
                setFilterStock(e.target.value);
              }}
              className='rounded-md border border-input bg-background px-3 py-2 text-sm'
            >
              <option value='all'>All</option>
              <option value='in'>In Stock</option>
              <option value='out'>Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      <div className='rounded-lg border bg-card'>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b'>
                <th className='px-4 py-3 text-left text-sm font-medium'>
                  Image
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium'>
                  Name
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium'>
                  Brand
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium'>
                  Price
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium'>
                  Stock
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product) => (
                <tr key={product.id} className='border-b'>
                  <td className='px-4 py-3'>
                    <div className='relative h-16 w-16 overflow-hidden rounded'>
                      <Image
                        src={product.image || "/placeholder.svg"}
                        alt={product.name}
                        fill
                        className='object-cover'
                      />
                    </div>
                  </td>
                  <td className='px-4 py-3'>
                    <div className='font-medium'>{product.name}</div>
                    <div className='text-sm text-muted-foreground'>
                      {product.category}
                    </div>
                  </td>
                  <td className='px-4 py-3'>{product.brand.name}</td>
                  <td className='px-4 py-3'>
                    {product.discountPrice ? (
                      <div>
                        <span className='font-medium text-primary'>
                          ₱{Number(product.discountPrice)}
                        </span>
                        <span className='ml-2 text-sm text-muted-foreground line-through'>
                          ₱{Number(product.price)}
                        </span>
                      </div>
                    ) : (
                      <span className='font-medium'>
                        ₱{Number(product.price)}
                      </span>
                    )}
                  </td>
                  <td className='px-4 py-3'>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        product.inStock
                          ? "bg-green-500/10 text-green-600"
                          : "bg-red-500/10 text-red-600"
                      }`}
                    >
                      {product.inStock ? "In Stock" : "Out of Stock"}
                    </span>
                  </td>
                  <td className='px-4 py-3'>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => handleToggleFeatured(product.id)}
                        title={
                          product.featured
                            ? "Remove from featured"
                            : "Add to featured"
                        }
                      >
                        <Star
                          className={`h-4 w-4 ${
                            product.featured
                              ? "fill-yellow-500 text-yellow-500"
                              : ""
                          }`}
                        />
                      </Button>
                      <Button variant='ghost' size='icon' asChild>
                        <Link href={`/admin/products/${product.id}`}>
                          <Edit className='h-4 w-4' />
                        </Link>
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => setDeleteConfirm(product.id)}
                      >
                        <Trash2 className='h-4 w-4 text-destructive' />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredProducts.length === 0 && (
          <div className='py-12 text-center text-muted-foreground'>
            No products found
          </div>
        )}
      </div>

      {filteredProducts.length > 0 && (
        <div className='flex items-center justify-between'>
          <p className='text-sm text-muted-foreground'>
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of{" "}
            {filteredProducts.length} products
          </p>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {deleteConfirm && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <div className='rounded-lg border bg-card p-6 shadow-lg'>
            <h3 className='mb-2 text-lg font-semibold'>Confirm Delete</h3>
            <p className='mb-4 text-sm text-muted-foreground'>
              Are you sure you want to delete this product? This action cannot
              be undone.
            </p>
            <div className='flex gap-2'>
              <Button
                variant='destructive'
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteProductMutation.isPending}
              >
                {deleteProductMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
              <Button variant='outline' onClick={() => setDeleteConfirm(null)}>
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
