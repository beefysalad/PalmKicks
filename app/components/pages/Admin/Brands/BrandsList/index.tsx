"use client";

import { useState } from "react";
import { getBrands, deleteBrand } from "@/lib/admin-brands";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import type { Brand } from "@/lib/admin-brands";

const BrandsListPage = () => {
  const [brands, setBrands] = useState<Brand[]>(() => getBrands());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadBrands = () => {
    const allBrands = getBrands();
    setBrands(allBrands);
  };

  const handleDelete = (id: string) => {
    if (deleteBrand(id)) {
      toast.success("Brand deleted");
      loadBrands();
    } else {
      toast.error("Failed to delete brand");
    }
    setDeleteConfirm(null);
  };

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
          brands.map((brand) => (
            <div
              key={brand.id}
              className='rounded-lg border bg-card p-4'
            >
              <div className='flex items-center gap-4'>
                {brand.logo && (
                  <div className='relative h-16 w-16 overflow-hidden rounded'>
                    <Image
                      src={brand.logo}
                      alt={brand.name}
                      fill
                      className='object-contain'
                    />
                  </div>
                )}
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

      {deleteConfirm && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <div className='rounded-lg border bg-card p-6 shadow-lg'>
            <h3 className='mb-2 text-lg font-semibold'>Confirm Delete</h3>
            <p className='mb-4 text-sm text-muted-foreground'>
              Are you sure you want to delete this brand? This action cannot be undone.
            </p>
            <div className='flex gap-2'>
              <Button
                variant='destructive'
                onClick={() => handleDelete(deleteConfirm)}
              >
                Delete
              </Button>
              <Button
                variant='outline'
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

export default BrandsListPage;
