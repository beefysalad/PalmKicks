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
    <div className='relative overflow-hidden rounded-2xl bg-card shadow-lg transition-shadow duration-300 hover:shadow-xl'>
      <div className='relative min-h-[500px] md:min-h-[500px]'>
        <AnimatePresence mode='wait'>
          <motion.div
            key={currentIndex}
            initial={shouldReduceMotion ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.4,
              ease: "easeInOut",
            }}
            className='absolute inset-0'
          >
            <div className='flex h-full min-h-[500px] flex-col md:grid md:grid-cols-2 md:min-h-[500px]'>
              {/* Image Section */}
              <div className='relative h-56 min-h-[224px] overflow-hidden bg-secondary/20 sm:h-64 sm:min-h-[256px] md:h-full md:min-h-0'>
                <Image
                  src={currentProduct.image || "/placeholder.svg"}
                  alt={currentProduct.name}
                  fill
                  priority={currentIndex === 0}
                  className='object-cover'
                  sizes='(max-width: 768px) 100vw, 50vw'
                />
              </div>

              {/* Content Section */}
              <div className='flex flex-col justify-center p-6 pb-12 sm:p-8 sm:pb-14 md:p-12 md:pb-16'>
                <div className='space-y-4 sm:space-y-5'>
                  <Badge className='w-fit bg-primary/10 text-primary hover:bg-primary/20'>
                    {currentProduct.category}
                  </Badge>

                  <h3 className='text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl'>
                    {currentProduct.name}
                  </h3>

                  <p className='line-clamp-2 text-sm leading-relaxed text-muted-foreground sm:text-base'>
                    {currentProduct.description}
                  </p>

                  <div className='flex items-baseline gap-3 pt-1'>
                    {currentProduct.discountPrice ? (
                      <>
                        <span className='text-3xl font-bold text-primary sm:text-4xl md:text-5xl'>
                          ${currentProduct.discountPrice}
                        </span>
                        <span className='text-xl text-muted-foreground line-through sm:text-2xl'>
                          ${currentProduct.price}
                        </span>
                      </>
                    ) : (
                      <span className='text-3xl font-bold text-primary sm:text-4xl md:text-5xl'>
                        ${currentProduct.price}
                      </span>
                    )}
                  </div>

                  <div className='pt-4 sm:pt-5'>
                    <Button
                      asChild
                      size='lg'
                      className='w-full font-semibold shadow-md transition-all hover:shadow-lg sm:w-auto'
                    >
                      <Link href={`/product/${currentProduct.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <Button
          variant='ghost'
          size='icon'
          className='absolute left-3 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-md shadow-md transition-all hover:bg-background hover:shadow-lg md:left-6 md:h-12 md:w-12'
          onClick={prevSlide}
          aria-label='Previous slide'
        >
          <ChevronLeft className='h-5 w-5 md:h-6 md:w-6' />
        </Button>
        <Button
          variant='ghost'
          size='icon'
          className='absolute right-3 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-md shadow-md transition-all hover:bg-background hover:shadow-lg md:right-6 md:h-12 md:w-12'
          onClick={nextSlide}
          aria-label='Next slide'
        >
          <ChevronRight className='h-5 w-5 md:h-6 md:w-6' />
        </Button>
      </div>

      {/* Carousel Indicators */}
      <div className='flex items-center justify-center gap-2 border-t border-border/50 bg-secondary/5 px-4 py-4 sm:py-5'>
        {products.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`rounded-full transition-all duration-300 ${
              index === currentIndex
                ? "h-2.5 w-8 bg-primary shadow-sm"
                : "h-2 w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default FeaturedCarousel;
