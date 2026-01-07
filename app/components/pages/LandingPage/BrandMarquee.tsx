"use client";

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
        <div className='flex animate-marquee gap-12'>
          {[...brands, ...brands].map((brand, index) => (
            <div key={index} className='flex items-center whitespace-nowrap'>
              <span className='text-2xl font-bold tracking-wider text-muted-foreground/50'>
                {brand}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandMarquee;
