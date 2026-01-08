"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Package, ShoppingBag, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "./CartProvider";
import { useState } from "react";

const Navbar = () => {
  const { items } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className='sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'
    >
      <div className='w-full flex h-16 items-center justify-between px-4'>
        <Link href='/' className='flex items-center' onClick={closeMenu}>
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

        {/* Desktop Navigation */}
        <nav className='hidden items-center gap-2 sm:flex'>
          <Button variant='ghost' asChild>
            <Link href='/shop'>
              <ShoppingBag className='h-4 w-4' />
              <span className='ml-2'>Shop</span>
            </Link>
          </Button>
          <Button variant='ghost' asChild>
            <Link href='/track'>
              <Package className='h-4 w-4' />
              <span className='ml-2'>Track Order</span>
            </Link>
          </Button>
          <Button variant='ghost' asChild className='relative'>
            <Link href='/cart'>
              <ShoppingCart className='h-4 w-4' />
              <span className='ml-2'>Cart</span>
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

        {/* Mobile Hamburger Button */}
        <Button
          variant='ghost'
          size='icon'
          onClick={toggleMenu}
          aria-label='Toggle menu'
          className='sm:hidden'
        >
          {isMenuOpen ? (
            <X className='h-5 w-5' />
          ) : (
            <Menu className='h-5 w-5' />
          )}
        </Button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className='fixed inset-0 top-16 bg-background/80 backdrop-blur-sm sm:hidden'
              onClick={closeMenu}
            />
            {/* Menu Panel */}
            <motion.nav
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className='fixed right-0 top-16 z-50 h-[calc(100vh-4rem)] w-64 border-l border-border bg-background p-4 sm:hidden'
            >
              <div className='flex flex-col gap-2'>
                <Button
                  variant='ghost'
                  className='w-full justify-start'
                  asChild
                  onClick={closeMenu}
                >
                  <Link href='/shop' className='flex items-center gap-3'>
                    <ShoppingBag className='h-5 w-5' />
                    <span>Shop</span>
                  </Link>
                </Button>
                <Button
                  variant='ghost'
                  className='w-full justify-start'
                  asChild
                  onClick={closeMenu}
                >
                  <Link href='/track' className='flex items-center gap-3'>
                    <Package className='h-5 w-5' />
                    <span>Track Order</span>
                  </Link>
                </Button>
                <Button
                  variant='ghost'
                  className='w-full justify-start relative'
                  asChild
                  onClick={closeMenu}
                >
                  <Link href='/cart' className='flex items-center gap-3'>
                    <ShoppingCart className='h-5 w-5' />
                    <span>Cart</span>
                    {itemCount > 0 && (
                      <span className='ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground'>
                        {itemCount}
                      </span>
                    )}
                  </Link>
                </Button>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Navbar;
