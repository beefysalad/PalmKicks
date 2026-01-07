import React from "react";
import ProductDetail from "./ProductDetail";
import { Product } from "@/lib/products";

interface ProductProps {
  product: Product;
}
const ProductComponent = ({ product }: ProductProps) => {
  return (
    <main className='min-h-screen py-12'>
      <div className='w-full px-4'>
        <ProductDetail product={product} />
      </div>
    </main>
  );
};

export default ProductComponent;
