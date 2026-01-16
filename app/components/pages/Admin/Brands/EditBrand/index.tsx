"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBrand, useUpdateBrand } from "@/lib/brands/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  brandsSchema,
  TBrandsSchema,
} from "../../../../../shared/zod/brands-zod";

const EditBrandPage = () => {
  const router = useRouter();
  const params = useParams();
  const brandId = params.id as string;

  const { data: brand, isLoading, error } = useBrand(brandId);
  const updateBrandMutation = useUpdateBrand();
  const form = useForm<TBrandsSchema>({
    resolver: zodResolver(brandsSchema),
    defaultValues: {
      name: brand?.name || "",
    },
  });
  useEffect(() => {
    if (brand) {
      form.reset({
        name: brand.name,
      });
    }
  }, [brand, form]);

  const onSubmit = (values: TBrandsSchema) => {
    updateBrandMutation.mutateAsync({
      id: brandId,
      payload: values,
    });
  };

  useEffect(() => {
    if (error) {
      toast.error("Brand not found");
      router.push("/admin/brands");
    }
  }, [error, router]);

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
          <form
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              toast.error(errors.name?.message);
            })}
            className='space-y-4'
          >
            <div className='space-y-2'>
              <Label htmlFor='name'>
                Brand Name <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='name'
                {...form.register("name")}
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
