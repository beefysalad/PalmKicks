"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useBrand, useUpdateBrand } from "@/lib/brands/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const EditBrandPage = () => {
  const router = useRouter();
  const params = useParams();
  const brandId = params.id as string;

  const { data: brand, isLoading, error } = useBrand(brandId);
  const updateBrandMutation = useUpdateBrand();
  const [formData, setFormData] = useState({
    name: "",
  });

  useEffect(() => {
    if (brand) {
      setFormData({ name: brand.name });
    }
  }, [brand]);

  useEffect(() => {
    if (error) {
      toast.error("Brand not found");
      router.push("/admin/brands");
    }
  }, [error, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Brand name is required");
      return;
    }

    try {
      await updateBrandMutation.mutateAsync({
        id: brandId,
        payload: { name: formData.name.trim() },
      });
      toast.success("Brand updated successfully");
      router.push("/admin/brands");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update brand"
      );
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!brand) {
    return <div>Brand not found</div>;
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

            <div className='flex gap-4'>
              <Button type='submit' disabled={updateBrandMutation.isPending}>
                {updateBrandMutation.isPending ? "Updating..." : "Update Brand"}
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => router.back()}
                disabled={updateBrandMutation.isPending}
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
