"use client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Product } from "@/lib/products";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

interface ProductCardProps {
  product: Product;
  index: number;
}
const ProductCard = ({ product, index }: ProductCardProps) => {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.3, delay: shouldReduceMotion ? 0 : index * 0.05 }}
    >
      <Link href={`/product/${product.id}`}>
        <Card className='group overflow-hidden border-border/50 bg-card transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10'>
          <CardContent className='p-0'>
            <div className='relative aspect-square overflow-hidden bg-secondary/30'>
              <motion.div
                whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <Image
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  width={400}
                  height={400}
                  loading='lazy'
                  className='h-full w-full object-cover'
                />
              </motion.div>
              {product.discountPrice && (
                <Badge className='absolute right-2 top-2 bg-primary text-primary-foreground'>
                  SALE
                </Badge>
              )}
              {!product.inStock && (
                <div className='absolute inset-0 flex items-center justify-center bg-background/80'>
                  <Badge variant='secondary'>Out of Stock</Badge>
                </div>
              )}
            </div>
            <div className='p-4'>
              <div className='mb-1 flex items-start justify-between gap-2'>
                <h3 className='text-balance font-semibold leading-tight group-hover:text-primary'>
                  {product.name}
                </h3>
              </div>
              <p className='mb-2 text-sm text-muted-foreground'>
                {product.brand}
              </p>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  {product.discountPrice ? (
                    <>
                      <p className='text-lg font-bold text-primary'>
                        ${product.discountPrice}
                      </p>
                      <p className='text-sm text-muted-foreground line-through'>
                        ${product.price}
                      </p>
                    </>
                  ) : (
                    <p className='text-lg font-bold text-primary'>
                      ${product.price}
                    </p>
                  )}
                </div>
                <Badge variant='outline' className='text-xs'>
                  {product.category}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
