"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateBrand } from "@/lib/brands/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const NewBrandPage = () => {
  const router = useRouter();
  const createBrandMutation = useCreateBrand();
  const [formData, setFormData] = useState({
    name: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Brand name is required");
      return;
    }

    try {
      await createBrandMutation.mutateAsync({ name: formData.name.trim() });
      toast.success("Brand created successfully");
      router.push("/admin/brands");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create brand"
      );
    }
  };

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold'>Add New Brand</h1>
        <p className='text-muted-foreground'>
          Create a new brand for your store
        </p>
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
              <Button type='submit' disabled={createBrandMutation.isPending}>
                {createBrandMutation.isPending ? "Creating..." : "Create Brand"}
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => router.back()}
                disabled={createBrandMutation.isPending}
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

export default NewBrandPage;
