export interface Product {
  id: string;
  name: string;
  price: number;
  discountPrice: number | null;
  sale: boolean;
  gender: "men" | "women" | "kids";
  brandId: string;
  category: string;
  image: string;
  description: string;
  sizes: string[];
  colors: string[];
  inStock: boolean;
  featured: boolean;
  latest: boolean;
  createdAt: string;
  updatedAt: string;
  brand: {
    id: string;
    name: string;
  };
  images: {
    id: string;
    url: string;
    order: number;
  }[];
}

export interface CreateProductPayload {
  name: string;
  brandId?: string;
  brand?: string; // For backward compatibility - will be converted to brandId
  category: string;
  gender: "men" | "women" | "kids";
  price: number | string;
  discountPrice?: number | string;
  sale: boolean;
  description: string;
  image: string;
  additionalImages?: string[];
  sizes?: string[];
  colors?: string[];
  inStock?: boolean;
}

export interface UpdateProductPayload {
  name?: string;
  brandId?: string;
  brand?: string; // For backward compatibility
  category?: string;
  gender?: "men" | "women" | "kids";
  price?: number | string;
  discountPrice?: number | string;
  description?: string;
  image?: string;
  additionalImages?: string[];
  sizes?: string[];
  colors?: string[];
  inStock?: boolean;
  sale?: boolean;
}
export interface Product {
  id: string;
  name: string;
  price: number;
  discountPrice: number | null;
  sale: boolean;
  gender: "men" | "women" | "kids";
  brandId: string;
  category: string;
  image: string;
  description: string;
  sizes: string[];
  colors: string[];
  inStock: boolean;
  featured: boolean;
  latest: boolean;
  createdAt: string;
  updatedAt: string;
  brand: {
    id: string;
    name: string;
  };
  images: {
    id: string;
    url: string;
    order: number;
  }[];
}

export interface CreateProductPayload {
  name: string;
  brandId?: string;
  brand?: string; // For backward compatibility - will be converted to brandId
  category: string;
  gender: "men" | "women" | "kids";
  price: number | string;
  discountPrice?: number | string;
  sale: boolean;
  description: string;
  image: string;
  additionalImages?: string[];
  sizes?: string[];
  colors?: string[];
  inStock?: boolean;
}

export interface UpdateProductPayload {
  name?: string;
  brandId?: string;
  brand?: string; // For backward compatibility
  category?: string;
  gender?: "men" | "women" | "kids";
  price?: number | string;
  discountPrice?: number | string;
  description?: string;
  image?: string;
  additionalImages?: string[];
  sizes?: string[];
  colors?: string[];
  inStock?: boolean;
  sale?: boolean;
}
