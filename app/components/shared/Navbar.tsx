"use client";
import { Button } from "@/components/ui/button";
import { Menu, ShoppingCart, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  const cartCount = 3;

  const navLinks = [
    { href: "/shop", label: "Shop" },
    { href: "/track", label: "Track Order" },
  ];
  return (
    <nav className='sticky top-0 z-50 backdrop-blur-xl bg-black/80 border-b border-white/5'>
      <div className='container mx-auto px-4'>
        <div className='flex items-center justify-between h-16'>
          {/* Logo */}
          <Link
            href='/'
            className='flex items-center gap-2 hover:opacity-80 transition-opacity'
          >
            <Image
              src='/logo.jpg'
              alt='Palmkicks Logo'
              width={40}
              height={40}
              className='rounded-full'
            />
            <span className='text-lg font-bold tracking-tight'>Palm Kicks</span>
          </Link>

          {/* Desktop Navigation */}
          <div className='hidden md:flex items-center gap-6'>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className='text-sm text-muted-foreground hover:text-primary transition-colors'
              >
                {link.label}
              </Link>
            ))}
            <Link href='/cart' className='relative'>
              <Button variant='ghost' size='icon' className='relative'>
                <ShoppingCart className='h-5 w-5' />
                {cartCount > 0 && (
                  <span className='absolute top-0 right-0 bg-primary text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center'>
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className='md:hidden flex items-center gap-2'>
            <Link href='/cart' className='relative'>
              <Button variant='ghost' size='icon' className='relative'>
                <ShoppingCart className='h-5 w-5' />
                {cartCount > 0 && (
                  <span className='absolute top-0 right-0 bg-primary text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center'>
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className='h-5 w-5' />
              ) : (
                <Menu className='h-5 w-5' />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className='md:hidden pb-4 animate-in slide-in-from-top-2'>
            <div className='flex flex-col gap-3'>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className='text-sm text-muted-foreground hover:text-primary transition-colors py-2'
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
