"use client";

import { motion } from "framer-motion";

const brands = [
  "Nike",
  "Adidas",
  "New Balance",
  "Converse",
  "Vans",
  "Jordan",
  "Puma",
  "Reebok",
  "On Cloud",
];

const BrandMarquee = () => {
  return (
    <section className='border-b border-border/40 bg-secondary/10 py-6'>
      <div className='relative overflow-hidden'>
        <motion.div
          className='flex gap-12'
          animate={{
            x: [0, -1000],
          }}
          transition={{
            x: {
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "loop",
              duration: 20,
              ease: "linear",
            },
          }}
        >
          {[...brands, ...brands, ...brands].map((brand, index) => (
            <div key={index} className='flex items-center whitespace-nowrap'>
              <span className='text-2xl font-bold tracking-wider text-muted-foreground/50'>
                {brand}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default BrandMarquee;
