"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getBrandById, updateBrand } from "@/lib/admin-brands";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import type { Brand } from "@/lib/admin-brands";

const EditBrandPage = () => {
  const router = useRouter();
  const params = useParams();
  const brandId = params.id as string;

  const [brand] = useState<Brand | null>(() => {
    const foundBrand = getBrandById(brandId);
    if (!foundBrand) {
      return null;
    }
    return foundBrand;
  });
  const [formData, setFormData] = useState(() => {
    const foundBrand = getBrandById(brandId);
    if (!foundBrand) {
      return { name: "", logo: "" };
    }
    return {
      name: foundBrand.name,
      logo: foundBrand.logo || "",
    };
  });

  useEffect(() => {
    if (!brand) {
      toast.error("Brand not found");
      router.push("/admin/brands");
    }
  }, [brand, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Brand name is required");
      return;
    }

    if (
      updateBrand(brandId, {
        name: formData.name,
        logo: formData.logo || undefined,
      })
    ) {
      toast.success("Brand updated successfully");
      router.push("/admin/brands");
    } else {
      toast.error("Failed to update brand");
    }
  };

  if (!brand) {
    return <div>Loading...</div>;
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold'>Edit Brand</h1>
        <p className='text-muted-foreground'>Update brand information</p>
      </div>

      <Card className='max-w-2xl'>
        <CardHeader>
          <CardTitle>Brand Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='name'>
                Brand Name <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='name'
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                placeholder='e.g., Nike, Adidas'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='logo'>Brand Logo URL (optional)</Label>
              <Input
                id='logo'
                type='url'
                value={formData.logo}
                onChange={(e) =>
                  setFormData({ ...formData, logo: e.target.value })
                }
                placeholder='https://example.com/logo.png'
              />
            </div>

            <div className='flex gap-4'>
              <Button type='submit'>Update Brand</Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditBrandPage;
