import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, ShoppingBag } from "lucide-react";
import Link from "next/link";

const EmptyCart = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className='flex min-h-[60vh] flex-col items-center justify-center text-center'
    >
      <ShoppingBag className='mb-4 h-16 w-16 text-muted-foreground' />
      <h2 className='mb-2 text-2xl font-bold'>Your cart is empty</h2>
      <p className='mb-6 text-muted-foreground'>
        Add some sneakers to get started
      </p>
      <Button asChild size='lg'>
        <Link href='/'>
          Browse Collection
          <ArrowRight className='ml-2 h-4 w-4' />
        </Link>
      </Button>
    </motion.div>
  );
};

export default EmptyCart;
