"use client";
import { Product } from "@/lib/products";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "../../shared/CartProvider";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, ShoppingCart } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

interface ProductDetailProps {
  product: Product;
}

const ProductDetail = ({ product }: ProductDetailProps) => {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<number>(0);
  const { addItem } = useCart();
  const router = useRouter();

  const allImages = [product.image, ...product.images];
  const handleAddToCart = () => {
    if (!selectedSize) {
      //   toast({
      //     title: "Size Required",
      //     description: "Please select a size before adding to cart",
      //     variant: "destructive",
      //   });
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

    // toast({
    //   title: "Added to Cart",
    //   description: `${product.name} (Size ${selectedSize}) has been added to your cart`,
    // });
  };
  return (
    <div className='grid gap-8 lg:grid-cols-2'>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Button variant='ghost' onClick={() => router.back()} className='mb-4'>
          <ArrowLeft className='h-4 w-4' />
          Back
        </Button>
        <div className='space-y-4'>
          <div className='relative aspect-square overflow-hidden rounded-lg border border-border bg-secondary/30'>
            <Image
              src={allImages[selectedImage] || "/placeholder.svg"}
              alt={product.name}
              width={600}
              height={600}
              className='h-full w-full object-cover'
              priority
            />
          </div>
          <div className='grid grid-cols-4 gap-2'>
            {allImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(idx)}
                className={`relative aspect-square overflow-hidden rounded-md border-2 transition-all ${
                  selectedImage === idx
                    ? "border-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Image
                  src={img || "/placeholder.svg"}
                  alt={`${product.name} view ${idx + 1}`}
                  width={150}
                  height={150}
                  className='h-full w-full object-cover'
                />
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className='flex flex-col'
      >
        <div className='mb-4 flex items-start justify-between'>
          <div>
            <h1 className='mb-2 text-balance text-3xl font-bold sm:text-4xl'>
              {product.name}
            </h1>
            <p className='text-xl text-muted-foreground'>{product.brand}</p>
          </div>
          <Badge variant='outline'>{product.category}</Badge>
        </div>

        <p className='mb-6 text-4xl font-bold text-primary'>${product.price}</p>

        <p className='mb-8 text-pretty leading-relaxed text-muted-foreground'>
          {product.description}
        </p>

        <div className='mb-6'>
          <h3 className='mb-3 text-sm font-semibold uppercase tracking-wider'>
            Select Size (US)
          </h3>
          <div className='grid grid-cols-4 gap-2 sm:grid-cols-6'>
            {product.sizes.map((size) => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`relative flex h-12 items-center justify-center rounded-md border-2 font-semibold transition-all ${
                  selectedSize === size
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary/30 hover:border-primary/50"
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

        <div className='mb-6'>
          <h3 className='mb-3 text-sm font-semibold uppercase tracking-wider'>
            Available Colors
          </h3>
          <div className='flex flex-wrap gap-2'>
            {product.colors.map((color) => (
              <Badge key={color} variant='secondary'>
                {color}
              </Badge>
            ))}
          </div>
        </div>

        <div className='mt-auto space-y-3'>
          <Button
            size='lg'
            className='w-full'
            onClick={handleAddToCart}
            disabled={!product.inStock}
          >
            <ShoppingCart className='h-5 w-5' />
            {product.inStock ? "Add to Cart" : "Out of Stock"}
          </Button>
          {!product.inStock && (
            <p className='text-center text-sm text-muted-foreground'>
              This item is currently unavailable
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ProductDetail;
