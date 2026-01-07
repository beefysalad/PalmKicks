"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

import { motion } from "framer-motion";
import { useCart } from "./CartProvider";

const Navbar = () => {
  const { items } = useCart();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className='sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'
    >
      <div className='w-full flex h-16 items-center justify-between px-4'>
        <Link href='/' className='flex items-center'>
          <Image
            src='/logo.png'
            alt='Palm Kicks'
            width={40}
            height={40}
            className='h-10 w-10 rounded-full'
          />
          <span className='ml-2 hidden text-xl font-bold sm:inline'>
            Palm Kicks
          </span>
        </Link>

        <nav className='flex items-center gap-2'>
          <Button variant='ghost' asChild>
            <Link href='/shop'>Shop</Link>
          </Button>
          <Button variant='ghost' asChild>
            <Link href='/track'>
              <Package className='h-4 w-4' />
              <span className='ml-2 hidden sm:inline'>Track</span>
            </Link>
          </Button>
          <Button variant='ghost' asChild className='relative'>
            <Link href='/cart'>
              <ShoppingCart className='h-4 w-4' />
              <span className='ml-2 hidden sm:inline'>Cart</span>
              {itemCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className='absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground'
                >
                  {itemCount}
                </motion.span>
              )}
            </Link>
          </Button>
        </nav>
      </div>
    </motion.header>
  );
};

export default Navbar;
