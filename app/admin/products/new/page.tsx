"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addProduct } from "@/lib/admin-products";
import { getBrands } from "@/lib/admin-brands";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Image from "next/image";
import { X } from "lucide-react";
import Link from "next/link";

export default function NewProductPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [mainImagePreview, setMainImagePreview] = useState<string>("");
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    category: "",
    gender: "men" as "men" | "women" | "kids",
    price: "",
    discountPrice: "",
    description: "",
    image: "",
    images: "",
    sizes: "",
    colors: "",
    inStock: true,
  });

  useEffect(() => {
    const allBrands = getBrands();
    setBrands(allBrands);
  }, []);

  const handleFileUpload = async (file: File, isMain: boolean = false) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      const imageUrl = data.url;

      if (isMain) {
        setFormData((prev) => ({ ...prev, image: imageUrl }));
        setMainImagePreview(imageUrl);
      } else {
        setAdditionalImages((prev) => {
          const newImages = [...prev, imageUrl];
          setFormData((prevForm) => ({
            ...prevForm,
            images: newImages.join(", "),
          }));
          return newImages;
        });
      }

      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const removeAdditionalImage = (index: number) => {
    const newImages = additionalImages.filter((_, i) => i !== index);
    setAdditionalImages(newImages);
    setFormData({
      ...formData,
      images: newImages.join(", "),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.brand ||
      !formData.price ||
      !formData.image
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const product = {
      name: formData.name,
      brand: formData.brand,
      category: formData.category,
      gender: formData.gender,
      price: parseFloat(formData.price),
      discountPrice: formData.discountPrice
        ? parseFloat(formData.discountPrice)
        : undefined,
      description: formData.description,
      image: formData.image,
      images:
        additionalImages.length > 0
          ? additionalImages
          : formData.images
          ? formData.images
              .split(",")
              .map((url) => url.trim())
              .filter(Boolean)
          : [],
      sizes: formData.sizes
        ? formData.sizes
            .split(",")
            .map((size) => size.trim())
            .filter(Boolean)
        : [],
      colors: formData.colors
        ? formData.colors
            .split(",")
            .map((color) => color.trim())
            .filter(Boolean)
        : [],
      inStock: formData.inStock,
    };

    addProduct(product);
    toast.success("Product created successfully");
    router.push("/admin/products");
  };

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold'>Add New Product</h1>
        <p className='text-muted-foreground'>
          Create a new product for your store
        </p>
      </div>

      <form onSubmit={handleSubmit}>
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
                <Input
                  id='name'
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='brand'>
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
                    id='brand'
                    value={formData.brand}
                    onChange={(e) =>
                      setFormData({ ...formData, brand: e.target.value })
                    }
                    className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                    required
                  >
                    <option value=''>Select a brand</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.name}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id='brand'
                    value={formData.brand}
                    onChange={(e) =>
                      setFormData({ ...formData, brand: e.target.value })
                    }
                    placeholder='Enter brand name'
                    required
                  />
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='category'>Category</Label>
                <Input
                  id='category'
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  placeholder='e.g., Basketball, Lifestyle'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='gender'>Gender</Label>
                <select
                  id='gender'
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gender: e.target.value as "men" | "women" | "kids",
                    })
                  }
                  className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                >
                  <option value='men'>Men</option>
                  <option value='women'>Women</option>
                  <option value='kids'>Kids</option>
                </select>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='description'>Description</Label>
                <textarea
                  id='description'
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                  className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                />
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
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  required
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='discountPrice'>Discount Price (optional)</Label>
                <Input
                  id='discountPrice'
                  type='number'
                  step='0.01'
                  min='0'
                  value={formData.discountPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, discountPrice: e.target.value })
                  }
                />
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
                          setFormData({ ...formData, image: "" });
                        }}
                        className='absolute right-1 top-1 rounded-full bg-destructive p-1 text-white hover:bg-destructive/80'
                      >
                        <X className='h-3 w-3' />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='additionalImages'>Additional Images</Label>
                <div className='space-y-2'>
                  <Input
                    id='additionalImages'
                    type='file'
                    accept='image/*'
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(file, false);
                      }
                    }}
                    disabled={uploading}
                    className='cursor-pointer'
                  />
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
                  value={formData.sizes}
                  onChange={(e) =>
                    setFormData({ ...formData, sizes: e.target.value })
                  }
                  placeholder='7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='colors'>Colors (comma-separated)</Label>
                <Input
                  id='colors'
                  value={formData.colors}
                  onChange={(e) =>
                    setFormData({ ...formData, colors: e.target.value })
                  }
                  placeholder='Black/Red, White/Black'
                />
              </div>

              <div className='flex items-center space-x-2'>
                <input
                  type='checkbox'
                  id='inStock'
                  checked={formData.inStock}
                  onChange={(e) =>
                    setFormData({ ...formData, inStock: e.target.checked })
                  }
                  className='h-4 w-4 rounded border-gray-300'
                />
                <Label htmlFor='inStock'>In Stock</Label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className='mt-6 flex gap-4'>
          <Button type='submit'>Create Product</Button>
          <Button type='button' variant='outline' onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
