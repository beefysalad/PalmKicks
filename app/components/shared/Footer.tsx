import Link from "next/link";
import Image from "next/image";
import { Instagram, Facebook } from "lucide-react";

const Footer = () => {
  return (
    <footer className='border-t border-border/40 bg-secondary/20'>
      <div className='w-full max-w-7xl mx-auto px-4 py-12'>
        <div className='grid gap-8 md:grid-cols-2 lg:grid-cols-4'>
          <div className='flex flex-col items-center text-center md:items-start md:text-left'>
            <Link href='/' className='mb-4 inline-block'>
              <Image
                src='/logo.jpg'
                alt='Palm Kicks'
                width={80}
                height={80}
                className='h-16 w-16 rounded-full'
              />
            </Link>
            <p className='text-sm text-muted-foreground'>
              Your premium destination for authentic sneakers and streetwear.
            </p>
          </div>

          <div className='text-center md:text-left'>
            <h3 className='mb-4 text-base font-semibold'>Shop</h3>
            <ul className='space-y-3 text-sm text-muted-foreground'>
              <li>
                <Link
                  href='/shop'
                  className='transition-colors hover:text-primary'
                >
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  href='/shop?filter=men'
                  className='transition-colors hover:text-primary'
                >
                  Men
                </Link>
              </li>
              <li>
                <Link
                  href='/shop?filter=women'
                  className='transition-colors hover:text-primary'
                >
                  Women
                </Link>
              </li>
              <li>
                <Link
                  href='/shop?filter=kids'
                  className='transition-colors hover:text-primary'
                >
                  Kids
                </Link>
              </li>
            </ul>
          </div>

          <div className='text-center md:text-left'>
            <h3 className='mb-4 text-base font-semibold'>Support</h3>
            <ul className='space-y-3 text-sm text-muted-foreground'>
              <li>
                <Link
                  href='/track'
                  className='transition-colors hover:text-primary'
                >
                  Track Order
                </Link>
              </li>
              <li>
                <Link href='#' className='transition-colors hover:text-primary'>
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link href='#' className='transition-colors hover:text-primary'>
                  Returns
                </Link>
              </li>
              <li>
                <Link href='#' className='transition-colors hover:text-primary'>
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          <div className='text-center md:text-left'>
            <h3 className='mb-4 text-base font-semibold'>Follow Us</h3>
            <div className='flex gap-4 justify-center md:justify-start'>
              <a
                href={process.env.NEXT_PUBLIC_INSTAGRAM_URL || "#"}
                target='_blank'
                rel='noopener noreferrer'
                className='transition-colors text-muted-foreground hover:text-primary'
              >
                <Instagram className='h-5 w-5' />
              </a>
              <a
                href={process.env.NEXT_PUBLIC_FACEBOOK_URL || "#"}
                target='_blank'
                rel='noopener noreferrer'
                className='transition-colors text-muted-foreground hover:text-primary'
              >
                <Facebook className='h-5 w-5' />
              </a>
            </div>
            <p className='mt-4 text-sm text-muted-foreground'>
              DM us on Instagram{" "}
              <a
                href={process.env.NEXT_PUBLIC_INSTAGRAM_URL || "#"}
                className='text-primary transition-colors hover:underline'
              >
                @palmkicks23
              </a>
            </p>
          </div>
        </div>

        <div className='mt-8 border-t border-border/40 pt-8 text-center text-sm text-muted-foreground'>
          <p>
            &copy; {new Date().getFullYear()} Palm Kicks. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
