import React from "react";
import FloatingOrbs from "./FloatingOrbs";
import Hero from "./Hero";
import BrandMarquee from "./BrandMarquee";
import Featured from "./Featured";
import WhyPalmKicks from "./WhyPalmKicks";
import Collections from "./Collections";

const LandingPageCOmponent = () => {
  return (
    <main className='min-h-screen'>
      <section className='container mx-auto relative overflow-hidden from-background via-background to-secondary/20 py-20 md:py-28 lg:py-36'>
        <FloatingOrbs />
        <Hero />
      </section>
      <BrandMarquee />
      <Featured />
      <WhyPalmKicks />
      <Collections />
    </main>
  );
};

export default LandingPageCOmponent;
