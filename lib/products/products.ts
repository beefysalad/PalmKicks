export interface Product {
  id: string;
  name: string;
  price: number;
  discountPrice?: number;
  gender: "men" | "women" | "kids";
  brand: string;
  category: string;
  image: string;
  images: string[];
  description: string;
  sizes: string[];
  colors: string[];
  inStock: boolean;
}

export const products: Product[] = [
  {
    id: "1",
    name: "Air Jordan 1 Retro High OG",
    price: 2100,
    discountPrice: 1900,
    gender: "men",
    brand: "Nike",
    category: "Basketball",
    image: "/temp/air-jordan-1-retro-high-black-red-white-sneaker.jpg",
    images: [
      "/temp/air-jordan-1-retro-high-black-red-white-sneaker-si.jpg",
      "/temp/air-jordan-1-retro-high-black-red-white-sneaker-to.jpg",
      "/temp/air-jordan-1-retro-high-black-red-white-sneaker-ba.jpg",
    ],
    description:
      "The Air Jordan 1 Retro High OG brings a classic basketball design with premium leather and iconic colorways.",
    sizes: [
      "7",
      "7.5",
      "8",
      "8.5",
      "9",
      "9.5",
      "10",
      "10.5",
      "11",
      "11.5",
      "12",
    ],
    colors: ["Black/Red", "White/Black"],
    inStock: true,
  },
  {
    id: "2",
    name: "Nike Dunk Low",
    price: 1300,
    gender: "women",
    brand: "Nike",
    category: "Lifestyle",
    image: "/temp/nike-dunk-low-panda-black-white-sneaker.jpg",
    images: [
      "/temp/nike-dunk-low-panda-black-white-sneaker-side.jpg",
      "/temp/nike-dunk-low-panda-black-white-sneaker-top.jpg",
    ],
    description:
      "The Nike Dunk Low returns with crisp overlays and classic team colors for a premium take on court-ready style.",
    sizes: [
      "7",
      "7.5",
      "8",
      "8.5",
      "9",
      "9.5",
      "10",
      "10.5",
      "11",
      "11.5",
      "12",
    ],
    colors: ["Black/White", "University Blue"],
    inStock: true,
  },
  {
    id: "3",
    name: "Adidas Yeezy Boost 350 V2",
    price: 2500,
    discountPrice: 2100,
    gender: "men",
    brand: "Adidas",
    category: "Lifestyle",
    image: "/temp/adidas-yeezy-boost-350-v2-cream-white-sneaker.jpg",
    images: [
      "/temp/adidas-yeezy-boost-350-v2-cream-white-sneaker-angl.jpg",
      "/temp/adidas-yeezy-boost-350-v2-cream-white-sneaker-sole.jpg",
    ],
    description:
      "The Yeezy Boost 350 V2 features signature Primeknit construction and a distinctive colorway with full-length Boost cushioning.",
    sizes: [
      "7",
      "7.5",
      "8",
      "8.5",
      "9",
      "9.5",
      "10",
      "10.5",
      "11",
      "11.5",
      "12",
    ],
    colors: ["Cream", "Zebra"],
    inStock: true,
  },
  {
    id: "4",
    name: "New Balance 550",
    price: 1500,
    gender: "women",
    brand: "New Balance",
    category: "Basketball",
    image: "/temp/new-balance-550-white-green-vintage-basketball-sne.jpg",
    images: ["/temp/new-balance-550-white-green-vintage-basketball-sne.jpg"],
    description:
      "The 550 pays homage to the throwback basketball shoe that features a low-profile silhouette and vintage aesthetics.",
    sizes: [
      "7",
      "7.5",
      "8",
      "8.5",
      "9",
      "9.5",
      "10",
      "10.5",
      "11",
      "11.5",
      "12",
    ],
    colors: ["White/Green", "White/Navy"],
    inStock: true,
  },
  {
    id: "5",
    name: "Converse Chuck 70 High",
    price: 1100,
    discountPrice: 900,
    gender: "kids",
    brand: "Converse",
    category: "Lifestyle",
    image: "/temp/converse-chuck-70-high-black-canvas-sneaker.jpg",
    images: ["/temp/converse-chuck-70-high-black-canvas-sneaker-side.jpg"],
    description:
      "The Chuck 70 is built with a premium canvas upper, vintage details, and enhanced cushioning for modern comfort.",
    sizes: [
      "7",
      "7.5",
      "8",
      "8.5",
      "9",
      "9.5",
      "10",
      "10.5",
      "11",
      "11.5",
      "12",
    ],
    colors: ["Black", "White", "Vintage"],
    inStock: true,
  },
  {
    id: "6",
    name: "Vans Old Skool",
    price: 900,
    gender: "kids",
    brand: "Vans",
    category: "Skate",
    image: "/temp/vans-old-skool-black-white-stripe-skate-sneaker.jpg",
    images: ["/temp/vans-old-skool-black-white-stripe-skate-sneaker-an.jpg"],
    description:
      "The Old Skool is a classic skate shoe with durable suede and canvas uppers and the iconic Vans side stripe.",
    sizes: [
      "7",
      "7.5",
      "8",
      "8.5",
      "9",
      "9.5",
      "10",
      "10.5",
      "11",
      "11.5",
      "12",
    ],
    colors: ["Black/White", "Navy", "Checkerboard"],
    inStock: true,
  },
];
