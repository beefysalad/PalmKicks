"use client";

import ProductComponent from "@/app/components/pages/Product";
import { getProductById } from "@/lib/admin-products";
import { notFound, useParams } from "next/navigation";
import { useMemo } from "react";

const ProductPage = () => {
  const params = useParams();
  const id = params.id as string;

  const product = useMemo(() => {
    const foundProduct = getProductById(id);
    if (!foundProduct) {
      notFound();
    }
    return foundProduct;
  }, [id]);

  if (!product) {
    return <div>Loading...</div>;
  }

  return <ProductComponent product={product} />;
};

export default ProductPage;
