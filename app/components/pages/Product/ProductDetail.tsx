"use client";
import { Product } from "@/lib/products";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "../../shared/CartProvider";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, ShoppingCart, Trash2, Eye } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import Link from "next/link";

interface ProductDetailProps {
  product: Product;
}

const ProductDetail = ({ product }: ProductDetailProps) => {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<number>(0);
  const { items, addItem, removeItem } = useCart();
  const router = useRouter();

  const allImages = [product.image, ...product.images];

  // Check if this product with selected size is already in cart
  const isInCart = selectedSize
    ? items.some((item) => item.id === product.id && item.size === selectedSize)
    : false;

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error("Size Required", {
        description: "Please select a size before adding to cart",
        duration: 4000,
      });
      return;
    }

    if (!product.inStock) {
      toast.info("Out of Stock", {
        description: "This item is currently unavailable",
        duration: 4000,
      });
      return;
    }

    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      size: selectedSize,
      quantity: 1,
    });

    toast.success("Added to Cart", {
      description: `${product.name} (Size ${selectedSize}) has been added to your cart`,
      duration: 3000,
    });
  };

  const handleRemoveFromCart = () => {
    if (!selectedSize) return;

    removeItem(product.id, selectedSize);
    toast.success("Removed from Cart", {
      description: `${product.name} (Size ${selectedSize}) has been removed from your cart`,
      duration: 3000,
    });
  };
  return (
    <div className='mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>
      <Button variant='ghost' onClick={() => router.back()} className='mb-6'>
        <ArrowLeft className='mr-2 h-4 w-4' />
        Back
      </Button>

      <div className='grid gap-6 lg:grid-cols-2 lg:gap-12'>
        {/* Image Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className='space-y-3'
        >
          <div className='relative flex items-center justify-center overflow-hidden rounded-lg border-2 border-border bg-secondary/20 p-4'>
            <div className='relative max-h-[400px] w-full md:max-h-[500px]'>
              <Image
                src={allImages[selectedImage] || "/placeholder.svg"}
                alt={product.name}
                width={500}
                height={500}
                className='h-full w-full object-contain'
                priority
              />
            </div>
          </div>
          <div className='grid grid-cols-4 gap-2 sm:grid-cols-5'>
            {allImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(idx)}
                className={`relative aspect-square overflow-hidden rounded-md border-2 transition-all ${
                  selectedImage === idx
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Image
                  src={img || "/placeholder.svg"}
                  alt={`${product.name} view ${idx + 1}`}
                  width={100}
                  height={100}
                  className='h-full w-full object-cover'
                />
              </button>
            ))}
          </div>
        </motion.div>

        {/* Product Info Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className='space-y-6'
        >
          {/* Header */}
          <div className='space-y-2'>
            <div className='flex items-start justify-between gap-4'>
              <div className='flex-1'>
                <h1 className='mb-2 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl'>
                  {product.name}
                </h1>
                <p className='text-lg text-muted-foreground'>{product.brand}</p>
              </div>
              <Badge variant='outline' className='shrink-0'>
                {product.category}
              </Badge>
            </div>
          </div>

          {/* Price */}
          <div className='flex items-baseline gap-3'>
            <p className='text-3xl font-bold text-primary sm:text-4xl'>
              ${product.price}
            </p>
            {product.discountPrice && (
              <p className='text-xl text-muted-foreground line-through'>
                ${product.discountPrice}
              </p>
            )}
          </div>

          {/* Description */}
          <div className='space-y-2'>
            <p className='text-pretty leading-relaxed text-muted-foreground'>
              {product.description}
            </p>
          </div>

          <Separator />

          {/* Size Selection */}
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <h3 className='text-sm font-semibold uppercase tracking-wider'>
                Select Size (US)
              </h3>
              {!selectedSize && (
                <span className='text-xs text-destructive'>Required</span>
              )}
            </div>
            <div className='grid grid-cols-4 gap-2 sm:grid-cols-6'>
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`relative flex h-11 items-center justify-center rounded-md border-2 font-semibold transition-all ${
                    selectedSize === size
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : "border-border bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50"
                  }`}
                >
                  {size}
                  {selectedSize === size && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className='absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary'
                    >
                      <Check className='h-3 w-3 text-primary-foreground' />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className='space-y-3'>
            <h3 className='text-sm font-semibold uppercase tracking-wider'>
              Available Colors
            </h3>
            <div className='flex flex-wrap gap-2'>
              {product.colors.map((color) => (
                <Badge
                  key={color}
                  variant='secondary'
                  className='px-3 py-1.5 text-sm'
                >
                  {color}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Add to Cart Section - Hidden on mobile, shown on desktop */}
          <div className='hidden space-y-3 lg:block'>
            {isInCart ? (
              <div className='space-y-2'>
                <Button
                  size='lg'
                  variant='destructive'
                  className='w-full text-base font-semibold shadow-md transition-all hover:shadow-lg'
                  onClick={handleRemoveFromCart}
                >
                  <Trash2 className='mr-2 h-5 w-5' />
                  Remove from Cart
                </Button>
                <Button
                  size='lg'
                  variant='outline'
                  className='w-full text-base font-semibold'
                  asChild
                >
                  <Link href='/cart'>
                    <Eye className='mr-2 h-5 w-5' />
                    View Cart
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <Button
                  size='lg'
                  className='w-full text-base font-semibold shadow-md transition-all hover:shadow-lg'
                  onClick={handleAddToCart}
                  disabled={!product.inStock || !selectedSize}
                >
                  <ShoppingCart className='mr-2 h-5 w-5' />
                  {!selectedSize
                    ? "Select a Size"
                    : product.inStock
                    ? "Add to Cart"
                    : "Out of Stock"}
                </Button>
                {!product.inStock && (
                  <p className='text-center text-sm text-muted-foreground'>
                    This item is currently unavailable
                  </p>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Sticky Action Bar for Mobile */}
      <div className='fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm lg:hidden'>
        <div className='mx-auto max-w-7xl px-4 py-3'>
          {isInCart ? (
            <div className='flex gap-2'>
              <Button
                size='lg'
                variant='destructive'
                className='flex-1'
                onClick={handleRemoveFromCart}
              >
                <Trash2 className='mr-2 h-5 w-5' />
                Remove
              </Button>
              <Button size='lg' variant='outline' className='flex-1' asChild>
                <Link href='/cart'>
                  <Eye className='mr-2 h-5 w-5' />
                  View Cart
                </Link>
              </Button>
            </div>
          ) : (
            <Button
              size='lg'
              className='w-full'
              onClick={handleAddToCart}
              disabled={!product.inStock || !selectedSize}
            >
              <ShoppingCart className='mr-2 h-5 w-5' />
              {!selectedSize
                ? "Select a Size"
                : product.inStock
                ? "Add to Cart"
                : "Out of Stock"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
