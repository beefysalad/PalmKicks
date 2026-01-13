"use client";

import { useState } from "react";
import { useBrands, useDeleteBrand } from "@/lib/brands/hooks";
import { usePagination } from "@/lib/hooks/usePagination";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import Link from "next/link";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 12;

const BrandsListPage = () => {
  const { data: brands = [], isLoading, error } = useBrands();
  const deleteBrandMutation = useDeleteBrand();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteBrandMutation.mutateAsync(id);
      toast.success("Brand deleted");
      setDeleteConfirm(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete brand"
      );
    }
  };

  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedBrands,
    handlePageChange,
  } = usePagination({
    items: brands,
    itemsPerPage: ITEMS_PER_PAGE,
  });

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold'>Brands</h1>
            <p className='text-muted-foreground'>Manage your brand catalog</p>
          </div>
          <Button asChild>
            <Link href='/admin/brands/new'>
              <Plus className='mr-2 h-4 w-4' />
              Add Brand
            </Link>
          </Button>
        </div>
        <div className='py-12 text-center text-muted-foreground'>
          Loading brands...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold'>Brands</h1>
            <p className='text-muted-foreground'>Manage your brand catalog</p>
          </div>
          <Button asChild>
            <Link href='/admin/brands/new'>
              <Plus className='mr-2 h-4 w-4' />
              Add Brand
            </Link>
          </Button>
        </div>
        <div className='py-12 text-center text-destructive'>
          Error loading brands:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Brands</h1>
          <p className='text-muted-foreground'>Manage your brand catalog</p>
        </div>
        <Button asChild>
          <Link href='/admin/brands/new'>
            <Plus className='mr-2 h-4 w-4' />
            Add Brand
          </Link>
        </Button>
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {brands.length > 0 ? (
          paginatedBrands.map((brand) => (
            <div key={brand.id} className='rounded-lg border bg-card p-4'>
              <div className='flex items-center gap-4'>
                <div className='flex-1'>
                  <h3 className='font-semibold'>{brand.name}</h3>
                </div>
                <div className='flex gap-2'>
                  <Button variant='ghost' size='icon' asChild>
                    <Link href={`/admin/brands/${brand.id}`}>
                      <Edit className='h-4 w-4' />
                    </Link>
                  </Button>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => setDeleteConfirm(brand.id)}
                    disabled={deleteBrandMutation.isPending}
                  >
                    <Trash2 className='h-4 w-4 text-destructive' />
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className='col-span-full py-12 text-center text-muted-foreground'>
            No brands yet. Add your first brand to get started.
          </div>
        )}
      </div>

      {brands.length > ITEMS_PER_PAGE && (
        <div className='mt-6'>
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
              Are you sure you want to delete this brand? This action cannot be
              undone.
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
};

export default BrandsListPage;
