// prisma/seed.ts
import { PrismaClient } from "../app/generated/prisma/client";
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
  const username = process.env.ADMIN_SEED_USERNAME;
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!username || !password) {
    throw new Error("ADMIN_SEED_USERNAME and ADMIN_SEED_PASSWORD are not set");
  }

  const existingAdmin = await prisma.admin.findUnique({
    where: { username: username },
  });

  if (existingAdmin) {
    console.log("Admin user already exists. Skipping seed.");
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.admin.create({
    data: {
      username: username,
      password: hashedPassword,
    },
  });
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
async function main() {
  console.log("Starting seed...");
  await adminSeed();
  await brandSeed();
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
    await prisma.$disconnect();
  });
