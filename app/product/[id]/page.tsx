"use client";

import ProductComponent from "@/app/components/pages/Product";
import { useProduct } from "@/lib/products/hooks";
import { useParams } from "next/navigation";

const ProductPage = () => {
  const params = useParams();
  const id = params.id as string;
  const { data: product, isLoading } = useProduct(id);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!product) {
    return <div>Product not found</div>;
  }

  return <ProductComponent product={product} />;
};

export default ProductPage;
