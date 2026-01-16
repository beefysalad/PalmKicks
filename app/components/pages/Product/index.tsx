import { Product } from "@/app/shared/types/product";
import ProductDetail from "./ProductDetail";

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
