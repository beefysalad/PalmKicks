"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateBrand } from "@/lib/brands/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { brandsSchema, TBrandsSchema } from "../brandsZod";

const NewBrandPage = () => {
  const router = useRouter();
  const createBrandMutation = useCreateBrand();

  const form = useForm<TBrandsSchema>({
    resolver: zodResolver(brandsSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = (values: TBrandsSchema) =>
    createBrandMutation.mutateAsync(values);

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
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
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
