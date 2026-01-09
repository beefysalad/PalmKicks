"use client";

import { useState } from "react";
import { getAllProducts, deleteProduct } from "@/lib/admin-products";
import { toggleFeatured, isFeatured } from "@/lib/admin-featured";
import { Search, Plus, Edit, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/products";
import { toast } from "sonner";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(() => getAllProducts());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterGender, setFilterGender] = useState<string>("all");
  const [filterStock, setFilterStock] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadProducts = () => {
    const allProducts = getAllProducts();
    setProducts(allProducts);
  };

  const handleDelete = (id: string) => {
    if (deleteProduct(id)) {
      toast.success("Product deleted");
      loadProducts();
    } else {
      toast.error("Failed to delete product");
    }
    setDeleteConfirm(null);
  };

  const handleToggleFeatured = (id: string) => {
    toggleFeatured(id);
    toast.success(
      isFeatured(id) ? "Added to featured" : "Removed from featured"
    );
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchQuery.toLowerCase());
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

  const categories = Array.from(new Set(products.map((p) => p.category)));

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

      {/* Filters */}
      <div className='space-y-4 rounded-lg border bg-card p-4'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='Search by name or brand...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-9'
          />
        </div>
        <div className='flex flex-wrap gap-4'>
          <div>
            <label className='mb-1 block text-sm font-medium'>Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
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
              onChange={(e) => setFilterGender(e.target.value)}
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
              onChange={(e) => setFilterStock(e.target.value)}
              className='rounded-md border border-input bg-background px-3 py-2 text-sm'
            >
              <option value='all'>All</option>
              <option value='in'>In Stock</option>
              <option value='out'>Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
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
              {filteredProducts.map((product) => (
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
                  <td className='px-4 py-3'>{product.brand}</td>
                  <td className='px-4 py-3'>
                    {product.discountPrice ? (
                      <div>
                        <span className='font-medium text-primary'>
                          ₱{product.discountPrice}
                        </span>
                        <span className='ml-2 text-sm text-muted-foreground line-through'>
                          ₱{product.price}
                        </span>
                      </div>
                    ) : (
                      <span className='font-medium'>₱{product.price}</span>
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
                          isFeatured(product.id)
                            ? "Remove from featured"
                            : "Add to featured"
                        }
                      >
                        <Star
                          className={`h-4 w-4 ${
                            isFeatured(product.id)
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

      {/* Delete Confirmation Modal */}
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
              >
                Delete
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
}
