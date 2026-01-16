"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Package, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

import { motion } from "framer-motion";
import { useCart } from "./CartProvider";
import { getDevelopmentEnvironment } from "@/helpers";

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
          <span className='ml-2 text-xl font-bold'>
            Palm Kicks ({getDevelopmentEnvironment()})
          </span>
        </Link>

        <nav className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon'
            asChild
            className='sm:w-auto sm:px-4'
          >
            <Link href='/shop'>
              <ShoppingBag className='h-5 w-5' />
              <span className='ml-2 hidden sm:inline'>Shop</span>
            </Link>
          </Button>
          <Button
            variant='ghost'
            size='icon'
            asChild
            className='sm:w-auto sm:px-4'
          >
            <Link href='/track'>
              <Package className='h-5 w-5' />
              <span className='ml-2 hidden sm:inline'>Track Order</span>
            </Link>
          </Button>
          <Button
            variant='ghost'
            size='icon'
            asChild
            className='relative sm:w-auto sm:px-4'
          >
            <Link href='/cart'>
              <ShoppingCart className='h-5 w-5' />
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
