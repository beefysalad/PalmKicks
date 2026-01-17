// prisma/seed.ts
import { PrismaClient, Gender } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create the adapter
const adapter = new PrismaPg(pool);

// Create Prisma client with adapter
const prisma = new PrismaClient({ adapter });

async function adminSeed() {
  const {
    ADMIN_SEED_USERNAME,
    ADMIN_SEED_PASSWORD,
    ADMIN_SEED_SUPERUSER,
    ADMIN_SEED_SUPERPASSWORD,
  } = process.env;

  if (
    !ADMIN_SEED_USERNAME ||
    !ADMIN_SEED_PASSWORD ||
    !ADMIN_SEED_SUPERUSER ||
    !ADMIN_SEED_SUPERPASSWORD
  ) {
    throw new Error("Admin seed environment variables are not set");
  }

  const accountToCreate = [
    {
      username: ADMIN_SEED_USERNAME,
      password: ADMIN_SEED_PASSWORD,
    },
    {
      username: ADMIN_SEED_SUPERUSER,
      password: ADMIN_SEED_SUPERPASSWORD,
    },
  ];

  for (const account of accountToCreate) {
    const existing = await prisma.admin.findUnique({
      where: { username: account.username },
    });

    if (existing) {
      console.log(`Admin ${account.username} already exists! Skipping`);
      continue;
    }

    await prisma.admin.create({
      data: {
        username: account.username,
        password: await bcrypt.hash(account.password, 10),
      },
    });

    console.log(`Admin ${account.username} created`);
  }
}
async function configSeed() {
  const {
    NEXT_PUBLIC_FACEBOOK_URL,
    NEXT_PUBLIC_INSTAGRAM_URL,
    NEXT_PUBLIC_CONTACT_EMAIL,
    NEXT_PUBLIC_TIKTOK_URL,
  } = process.env;

  if (
    !NEXT_PUBLIC_FACEBOOK_URL ||
    !NEXT_PUBLIC_INSTAGRAM_URL ||
    !NEXT_PUBLIC_CONTACT_EMAIL ||
    !NEXT_PUBLIC_TIKTOK_URL
  ) {
    throw new Error("Config seed environment variables are not set");
  }
  const configsToCreate = [
    {
      key: "FACEBOOK_URL",
      value: NEXT_PUBLIC_FACEBOOK_URL,
    },
    {
      key: "INSTAGRAM_URL",
      value: NEXT_PUBLIC_INSTAGRAM_URL,
    },
    {
      key: "CONTACT_EMAIL",
      value: NEXT_PUBLIC_CONTACT_EMAIL,
    },
    {
      key: "TIKTOK_URL",
      value: NEXT_PUBLIC_TIKTOK_URL,
    },
  ];

  for (const config of configsToCreate) {
    const existing = await prisma.configurations.findUnique({
      where: { key: config.key },
    });

    if (existing) {
      console.log(`Config ${config.key} already exists! Skipping`);
      continue;
    }

    await prisma.configurations.create({
      data: {
        key: config.key,
        value: config.value,
      },
    });

    console.log(`Config ${config.key} created`);
  }
}
async function brandSeed() {
  const brands = [
    {
      name: "Nike",
    },
    {
      name: "Adidas",
    },
    {
      name: "Puma",
    },
    {
      name: "Reebok",
    },
  ];
  const existingBrands = await prisma.brand.findMany();
  if (existingBrands.length > 0) {
    console.log("Brands already exist. Skipping seed.");
    return;
  }
  for (const brand of brands) {
    await prisma.brand.create({
      data: brand,
    });
  }
}

async function productSeed() {
  const existingProducts = await prisma.product.findMany();
  if (existingProducts.length > 0) {
    console.log("Products already exist. Skipping seed.");
    return;
  }

  // Get brand IDs for reference
  const nike = await prisma.brand.findFirst({ where: { name: "Nike" } });
  const adidas = await prisma.brand.findFirst({ where: { name: "Adidas" } });
  const puma = await prisma.brand.findFirst({ where: { name: "Puma" } });
  const reebok = await prisma.brand.findFirst({ where: { name: "Reebok" } });

  if (!nike || !adidas || !puma || !reebok) {
    throw new Error("Brands must be seeded before products");
  }

  const products = [
    {
      name: "Nike Kobe 9 EM Low Protro 'Purple Dynasty'🔥",
      price: 11999.97,
      discountPrice: null,
      gender: Gender.men,
      brandId: nike.id,
      category: "Basketball",
      image:
        "https://res.cloudinary.com/drgnvg987/image/upload/v1768500837/products/jpt0dsknxivzcbwglrsh.jpg",
      description: "High-performance basketball shoes with premium cushioning",
      sizes: ["7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11"],
      colors: ["Black/Red", "Purple Dynasty"],
      inStock: true,
      featured: true,
      latest: false,
      sale: false,
    },
    {
      name: "Nike Air Jordan 1 Retro High",
      price: 13500.0,
      discountPrice: 12000.0,
      gender: Gender.men,
      brandId: nike.id,
      category: "Basketball",
      image:
        "https://res.cloudinary.com/drgnvg987/image/upload/v1768495155/products/gymxrw1nlspfdfd47len.jpg",
      description: "Classic basketball sneaker with iconic style",
      sizes: ["8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12"],
      colors: ["Black/Red", "White/Black", "Royal Blue"],
      inStock: true,
      featured: true,
      latest: true,
      sale: true,
    },
    {
      name: "Adidas Ultraboost 22",
      price: 9999.99,
      discountPrice: 8499.99,
      gender: Gender.women,
      brandId: adidas.id,
      category: "Running",
      image:
        "https://res.cloudinary.com/drgnvg987/image/upload/v1768495155/products/gymxrw1nlspfdfd47len.jpg",
      description: "Ultimate comfort and energy return for runners",
      sizes: ["5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5"],
      colors: ["Black/White", "Grey/Blue", "Navy"],
      inStock: true,
      featured: false,
      latest: true,
      sale: true,
    },
    {
      name: "Puma Suede Classic",
      price: 5999.0,
      discountPrice: null,
      gender: Gender.men,
      brandId: puma.id,
      category: "Lifestyle",
      image:
        "https://res.cloudinary.com/drgnvg987/image/upload/v1768500837/products/jpt0dsknxivzcbwglrsh.jpg",
      description: "Timeless style with premium suede construction",
      sizes: ["6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"],
      colors: ["Black", "Navy", "Red", "Green"],
      inStock: true,
      featured: false,
      latest: false,
      sale: false,
    },
    {
      name: "Nike Zoom Freak 4",
      price: 10500.0,
      discountPrice: 9200.0,
      gender: Gender.men,
      brandId: nike.id,
      category: "Basketball",
      image:
        "https://res.cloudinary.com/drgnvg987/image/upload/v1768495155/products/gymxrw1nlspfdfd47len.jpg",
      description: "Giannis signature shoe with explosive responsiveness",
      sizes: ["8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "13"],
      colors: ["White/Gold", "Black/Green"],
      inStock: true,
      featured: true,
      latest: true,
      sale: true,
    },
    {
      name: "Adidas Predator Edge",
      price: 12999.0,
      discountPrice: null,
      gender: Gender.men,
      brandId: adidas.id,
      category: "Football",
      image:
        "https://res.cloudinary.com/drgnvg987/image/upload/v1768500837/products/jpt0dsknxivzcbwglrsh.jpg",
      description: "Premium football boots for precision control",
      sizes: ["7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11"],
      colors: ["Black/Pink", "White/Black"],
      inStock: false,
      featured: false,
      latest: true,
      sale: false,
    },
    {
      name: "Reebok Classic Leather",
      price: 6499.0,
      discountPrice: 5499.0,
      gender: Gender.women,
      brandId: reebok.id,
      category: "Lifestyle",
      image:
        "https://res.cloudinary.com/drgnvg987/image/upload/v1768495155/products/gymxrw1nlspfdfd47len.jpg",
      description: "Iconic silhouette with soft leather upper",
      sizes: ["5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9"],
      colors: ["White", "Black", "Grey"],
      inStock: true,
      featured: false,
      latest: false,
      sale: true,
    },
    {
      name: "Nike Pegasus 40",
      price: 8999.0,
      discountPrice: null,
      gender: Gender.kids,
      brandId: nike.id,
      category: "Running",
      image:
        "https://res.cloudinary.com/drgnvg987/image/upload/v1768500837/products/jpt0dsknxivzcbwglrsh.jpg",
      description: "Versatile running shoe for daily training",
      sizes: ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5"],
      colors: ["Black/White", "Blue/Orange", "Grey/Pink"],
      inStock: true,
      featured: true,
      latest: true,
      sale: false,
    },
    {
      name: "Puma RS-X Reinvention",
      price: 7499.0,
      discountPrice: 6299.0,
      gender: Gender.women,
      brandId: puma.id,
      category: "Lifestyle",
      image:
        "https://res.cloudinary.com/drgnvg987/image/upload/v1768495155/products/gymxrw1nlspfdfd47len.jpg",
      description: "Bold design with retro-futuristic aesthetic",
      sizes: ["5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9"],
      colors: ["Multi-color", "Black/White", "White/Blue"],
      inStock: true,
      featured: false,
      latest: true,
      sale: true,
    },
    {
      name: "Adidas Samba OG",
      price: 6999.0,
      discountPrice: null,
      gender: Gender.men,
      brandId: adidas.id,
      category: "Lifestyle",
      image:
        "https://res.cloudinary.com/drgnvg987/image/upload/v1768500837/products/jpt0dsknxivzcbwglrsh.jpg",
      description: "Classic indoor football shoe turned street style icon",
      sizes: [
        "6",
        "6.5",
        "7",
        "7.5",
        "8",
        "8.5",
        "9",
        "9.5",
        "10",
        "10.5",
        "11",
      ],
      colors: ["Black/White", "White/Green", "Navy/White"],
      inStock: true,
      featured: true,
      latest: false,
      sale: false,
    },
    {
      name: "Nike Air Force 1 Low",
      price: 7999.0,
      discountPrice: 6999.0,
      gender: Gender.kids,
      brandId: nike.id,
      category: "Lifestyle",
      image:
        "https://res.cloudinary.com/drgnvg987/image/upload/v1768495155/products/gymxrw1nlspfdfd47len.jpg",
      description: "Classic basketball silhouette for kids",
      sizes: ["10.5", "11", "11.5", "12", "12.5", "13", "13.5", "1", "1.5"],
      colors: ["White", "Black", "White/Red"],
      inStock: true,
      featured: false,
      latest: false,
      sale: true,
    },
    {
      name: "Reebok Nano X3",
      price: 9499.0,
      discountPrice: null,
      gender: Gender.women,
      brandId: reebok.id,
      category: "Training",
      image:
        "https://res.cloudinary.com/drgnvg987/image/upload/v1768500837/products/jpt0dsknxivzcbwglrsh.jpg",
      description: "Versatile training shoe for CrossFit and gym workouts",
      sizes: ["5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5"],
      colors: ["Black/Grey", "Pink/White", "Blue"],
      inStock: true,
      featured: true,
      latest: true,
      sale: false,
    },
  ];

  for (const product of products) {
    await prisma.product.create({
      data: product,
    });
  }

  console.log(`✅ Seeded ${products.length} products`);
}

async function main() {
  console.log("Starting seed...");
  await adminSeed();
  await brandSeed();
  await productSeed();
  await configSeed();
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
  })
  .finally(async () => {
    await pool.end();
    await prisma.$disconnect();
  });
