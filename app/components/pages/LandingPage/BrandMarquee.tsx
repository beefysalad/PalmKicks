import React from "react";
import BrandLogo from "./BrandLogo";

const BrandMarquee = () => {
  const brands = [
    "Nike",
    "Jordan",
    "Adidas",
    "New Balance",
    "Puma",
    "Converse",
  ];

  // Duplicate brands for seamless loop
  const duplicatedBrands = [...brands, ...brands];
  return (
    <section className='py-12 border-y border-white/5 bg-black/50 overflow-hidden'>
      <div className='mb-8'>
        <p className='text-center text-sm text-muted-foreground uppercase tracking-widest'>
          Brands We Carry
        </p>
      </div>

      {/* Marquee container */}
      <div className='relative'>
        {/* Fade gradients on edges */}
        <div className='absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10' />
        <div className='absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10' />

        {/* Scrolling content */}
        <div className='flex gap-12 md:gap-16 animate-marquee items-center justify-center'>
          {duplicatedBrands.map((brand, index) => (
            <div
              key={index}
              className='flex-shrink-0 flex items-center justify-center'
            >
              <BrandLogo brand={brand} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandMarquee;
