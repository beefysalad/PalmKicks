import ProductComponent from "@/app/components/pages/Product";
import { products } from "@/lib/products";
import { notFound } from "next/navigation";
import React from "react";

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

const ProductPage = async ({ params }: ProductPageProps) => {
  const { id } = await params;
  const product = products.find((p) => p.id === id);

  if (!product) {
    notFound();
  }
  return <ProductComponent product={product} />;
};

export default ProductPage;
