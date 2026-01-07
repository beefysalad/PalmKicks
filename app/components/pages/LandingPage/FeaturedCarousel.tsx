"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/lib/products";

interface FeaturedCarouselProps {
  products: Product[];
}

const FeaturedCarousel = ({ products }: FeaturedCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % products.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + products.length) % products.length);
  };

  const currentProduct = products[currentIndex];
  return (
    <div className='relative overflow-hidden rounded-lg border border-border/50 bg-secondary/20'>
      <div className='relative aspect-4/5 sm:aspect-video md:aspect-21/9'>
        <AnimatePresence mode='wait'>
          <motion.div
            key={currentIndex}
            initial={shouldReduceMotion ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
            className='absolute inset-0'
          >
            <div className='flex h-full flex-col md:grid md:grid-cols-2'>
              <div className='relative h-56 bg-secondary/30 sm:h-72 md:h-full'>
                <Image
                  src={currentProduct.image || "/placeholder.svg"}
                  alt={currentProduct.name}
                  fill
                  priority={currentIndex === 0}
                  className='object-cover'
                />
              </div>
              <div className='flex flex-col justify-center p-6 sm:p-8 md:p-12'>
                <Badge className='mb-3 w-fit'>{currentProduct.category}</Badge>
                <h3 className='mb-2 text-2xl font-bold sm:text-3xl md:text-4xl'>
                  {currentProduct.name}
                </h3>
                <p className='mb-4 line-clamp-2 text-sm text-muted-foreground sm:text-base'>
                  {currentProduct.description}
                </p>
                <div className='mb-4 flex items-center gap-2 sm:mb-6 sm:gap-3'>
                  {currentProduct.discountPrice ? (
                    <>
                      <span className='text-2xl font-bold text-primary sm:text-3xl'>
                        ${currentProduct.discountPrice}
                      </span>
                      <span className='text-lg text-muted-foreground line-through sm:text-xl'>
                        ${currentProduct.price}
                      </span>
                    </>
                  ) : (
                    <span className='text-2xl font-bold text-primary sm:text-3xl'>
                      ${currentProduct.price}
                    </span>
                  )}
                </div>
                <Button asChild className='w-full sm:w-fit'>
                  <Link href={`/product/${currentProduct.id}`}>
                    View Details
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <Button
          variant='outline'
          size='icon'
          className='absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 bg-background/90 backdrop-blur-sm md:left-4 md:h-10 md:w-10'
          onClick={prevSlide}
          aria-label='Previous slide'
        >
          <ChevronLeft className='h-3 w-3 md:h-4 md:w-4' />
        </Button>
        <Button
          variant='outline'
          size='icon'
          className='absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 bg-background/90 backdrop-blur-sm md:right-4 md:h-10 md:w-10'
          onClick={nextSlide}
          aria-label='Next slide'
        >
          <ChevronRight className='h-3 w-3 md:h-4 md:w-4' />
        </Button>
      </div>

      <div className='flex justify-center gap-2 p-3 sm:p-4'>
        {products.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentIndex
                ? "w-8 bg-primary"
                : "w-2 bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default FeaturedCarousel;
