"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateProduct } from "@/lib/products/hooks";
import { useBrands } from "@/lib/brands/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Image from "next/image";
import { X } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productFormSchema, TProductFormSchema } from "../productZod";
import axios from "axios";
const NewProductPage = () => {
  const router = useRouter();
  const { data: brands = [] } = useBrands();
  const createProductMutation = useCreateProduct();

  const [uploading, setUploading] = useState<boolean>(false);
  const [mainImagePreview, setMainImagePreview] = useState<string>("");
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);

  const form = useForm<TProductFormSchema>({
    // @ts-expect-error - React Hook Form type inference issue with default values
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      brandId: "",
      category: "",
      gender: "men" as const,
      price: "",
      discountPrice: undefined,
      description: "",
      image: "",
      additionalImages: [],
      sizes: [],
      colors: [],
      inStock: true,
      sale: false,
    },
  });
  const sale = form.watch("sale");
  const handleFileUpload = async (file: File, isMain: boolean = false) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const response = await axios.post("/api/upload", uploadFormData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      const imageUrl = response.data.url;

      if (isMain) {
        form.setValue("image", imageUrl);
        setMainImagePreview(imageUrl);
      } else {
        const newImages = [...additionalImages, imageUrl];
        setAdditionalImages(newImages);
        form.setValue("additionalImages", newImages);
      }

      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };
  const handleMultipleFileUpload = async (files: FileList) => {
    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (imageFiles.length === 0) {
      toast.error("Please upload at least one image file");
      return;
    }

    if (imageFiles.length !== files.length) {
      toast.warning("Some files were skipped (only images are allowed)");
    }

    setUploading(true);
    const uploadedUrls: string[] = [];
    let successCount = 0;
    let failCount = 0;

    try {
      // Upload all files in parallel
      const uploadPromises = imageFiles.map(async (file) => {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append("file", file);

          const response = await axios.post("/api/upload", uploadFormData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
          uploadedUrls.push(response.data.url);
          successCount++;
        } catch (error) {
          console.error(`Upload error for ${file.name}:`, error);
          failCount++;
        }
      });

      await Promise.all(uploadPromises);

      // Update state with all uploaded images
      if (uploadedUrls.length > 0) {
        const newImages = [...additionalImages, ...uploadedUrls];
        setAdditionalImages(newImages);
        form.setValue("additionalImages", newImages);
      }

      // Show appropriate toast message
      if (failCount === 0) {
        toast.success(`${successCount} image(s) uploaded successfully`);
      } else if (successCount > 0) {
        toast.warning(`${successCount} image(s) uploaded, ${failCount} failed`);
      } else {
        toast.error("Failed to upload images");
      }
    } finally {
      setUploading(false);
    }
  };
  const removeAdditionalImage = (index: number) => {
    const newImages = additionalImages.filter((_, i) => i !== index);
    setAdditionalImages(newImages);
    form.setValue("additionalImages", newImages);
  };

  const onSubmit = async (values: TProductFormSchema) => {
    // Transform price and discountPrice from string to number
    const payload = {
      ...values,
      price:
        typeof values.price === "string"
          ? parseFloat(values.price)
          : values.price,
      discountPrice:
        sale === true
          ? typeof values.discountPrice === "string"
            ? parseFloat(values.discountPrice)
            : values.discountPrice
          : undefined,
    };

    await createProductMutation.mutateAsync(payload);
  };

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold'>Add New Product</h1>
        <p className='text-muted-foreground'>
          Create a new product for your store
        </p>
      </div>

      <form
        onSubmit={form.handleSubmit(
          // @ts-expect-error - React Hook Form type inference issue
          onSubmit
        )}
      >
        <div className='grid gap-6 md:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='name'>
                  Product Name <span className='text-destructive'>*</span>
                </Label>
                <Input id='name' {...form.register("name")} required />
                {form.formState.errors.name && (
                  <p className='text-sm text-destructive'>
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='brandId'>
                  Brand{" "}
                  <Link
                    href={"/admin/brands"}
                    className='text-muted-foreground text-xs'
                  >
                    (add here)
                  </Link>{" "}
                  <span className='text-destructive'>*</span>
                </Label>
                {brands.length > 0 ? (
                  <select
                    id='brandId'
                    {...form.register("brandId")}
                    className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                    required
                  >
                    <option value=''>Select a brand</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id='brandId'
                    {...form.register("brandId")}
                    placeholder='Enter brand ID'
                    required
                  />
                )}
                {form.formState.errors.brandId && (
                  <p className='text-sm text-destructive'>
                    {form.formState.errors.brandId.message}
                  </p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='category'>Category</Label>
                <Input
                  id='category'
                  {...form.register("category")}
                  placeholder='e.g., Basketball, Lifestyle'
                />
                {form.formState.errors.category && (
                  <p className='text-sm text-destructive'>
                    {form.formState.errors.category.message}
                  </p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='gender'>Gender</Label>
                <select
                  id='gender'
                  {...form.register("gender")}
                  className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                >
                  <option value='men'>Men</option>
                  <option value='women'>Women</option>
                  <option value='kids'>Kids</option>
                </select>
                {form.formState.errors.gender && (
                  <p className='text-sm text-destructive'>
                    {form.formState.errors.gender.message}
                  </p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='description'>Description</Label>
                <textarea
                  id='description'
                  {...form.register("description")}
                  rows={4}
                  className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                />
                {form.formState.errors.description && (
                  <p className='text-sm text-destructive'>
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing & Images</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='price'>
                  Price <span className='text-destructive'>*</span>
                </Label>
                <Input
                  id='price'
                  type='number'
                  step='0.01'
                  min='0'
                  {...form.register("price", { valueAsNumber: false })}
                  required
                />
                {form.formState.errors.price && (
                  <p className='text-sm text-destructive'>
                    {form.formState.errors.price.message}
                  </p>
                )}
              </div>

              <div className='space-y-2 '>
                <div className='flex-col'>
                  <div className='flex items-center space-x-2'>
                    <input
                      id='sale'
                      type='checkbox'
                      {...form.register("sale")}
                      disabled={createProductMutation.isPending}
                      className='h-5 w-5 rounded border-gray-300'
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Label htmlFor='sale'>On sale</Label>
                  </div>
                </div>
              </div>
              <div className='space-y-2'>
                {sale ? (
                  <div>
                    <Label htmlFor='discountPrice'>Discount Price</Label>
                    <Input
                      id='discountPrice'
                      type='number'
                      step='0.01'
                      min='0'
                      {...form.register("discountPrice", {
                        valueAsNumber: false,
                      })}
                    />
                    {form.formState.errors.discountPrice && (
                      <p className='text-sm text-destructive'>
                        {form.formState.errors.discountPrice.message}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='mainImage'>
                  Main Image <span className='text-destructive'>*</span>
                </Label>
                <div className='space-y-2'>
                  <Input
                    id='mainImage'
                    type='file'
                    accept='image/*'
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(file, true);
                      }
                    }}
                    disabled={uploading}
                    className='cursor-pointer'
                  />
                  {mainImagePreview && (
                    <div className='relative h-32 w-32 overflow-hidden rounded border'>
                      <Image
                        src={mainImagePreview}
                        alt='Main image preview'
                        fill
                        className='object-cover'
                      />
                      <button
                        type='button'
                        onClick={() => {
                          setMainImagePreview("");
                          form.setValue("image", "");
                        }}
                        className='absolute right-1 top-1 rounded-full bg-destructive p-1 text-white hover:bg-destructive/80'
                      >
                        <X className='h-3 w-3' />
                      </button>
                    </div>
                  )}
                </div>
                {form.formState.errors.image && (
                  <p className='text-sm text-destructive'>
                    {form.formState.errors.image.message}
                  </p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='additionalImages'>Additional Images</Label>
                <div className='space-y-2'>
                  <Input
                    id='additionalImages'
                    type='file'
                    accept='image/*'
                    multiple
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        handleMultipleFileUpload(files);
                      }
                    }}
                    disabled={uploading}
                    className='cursor-pointer'
                  />
                  {uploading && (
                    <p className='text-sm text-muted-foreground'>
                      Uploading images...
                    </p>
                  )}
                  {additionalImages.length > 0 && (
                    <div className='grid grid-cols-4 gap-2'>
                      {additionalImages.map((img, index) => (
                        <div
                          key={index}
                          className='relative h-20 w-20 overflow-hidden rounded border'
                        >
                          <Image
                            src={img}
                            alt={`Additional image ${index + 1}`}
                            fill
                            className='object-cover'
                          />
                          <button
                            type='button'
                            onClick={() => removeAdditionalImage(index)}
                            className='absolute right-1 top-1 rounded-full bg-destructive p-1 text-white hover:bg-destructive/80'
                          >
                            <X className='h-3 w-3' />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Variants</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='sizes'>Sizes (comma-separated)</Label>
                <Input
                  id='sizes'
                  placeholder='7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12'
                  onChange={(e) => {
                    const value = e.target.value;
                    const sizesArray = value
                      ? value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                      : [];
                    form.setValue("sizes", sizesArray);
                  }}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='colors'>Colors (comma-separated)</Label>
                <Input
                  id='colors'
                  placeholder='Black/Red, White/Black'
                  onChange={(e) => {
                    const value = e.target.value;
                    const colorsArray = value
                      ? value
                          .split(",")
                          .map((c) => c.trim())
                          .filter(Boolean)
                      : [];
                    form.setValue("colors", colorsArray);
                  }}
                />
              </div>

              <div className='flex items-center space-x-2'>
                <input
                  type='checkbox'
                  id='inStock'
                  {...form.register("inStock")}
                  className='h-4 w-4 rounded border-gray-300'
                />
                <Label htmlFor='inStock'>In Stock</Label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className='mt-6 flex gap-4'>
          <Button type='submit' disabled={createProductMutation.isPending}>
            {createProductMutation.isPending ? "Creating..." : "Create Product"}
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => router.back()}
            disabled={createProductMutation.isPending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewProductPage;
