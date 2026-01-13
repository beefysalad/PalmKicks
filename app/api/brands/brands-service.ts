import prisma from "../../../lib/prisma";

export interface Brand {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getBrands(): Promise<Brand[]> {
  const brands = await prisma.brand.findMany({
    orderBy: { createdAt: "desc" },
  });
  return brands;
}

export async function getBrandById(id: string): Promise<Brand | null> {
  const brand = await prisma.brand.findUnique({
    where: { id },
  });
  return brand;
}

export async function addBrand(data: { name: string }): Promise<Brand> {
  const brand = await prisma.brand.create({
    data: { name: data.name },
  });
  return brand;
}

export async function updateBrand(
  id: string,
  updates: { name?: string }
): Promise<Brand> {
  const brand = await prisma.brand.update({
    where: { id },
    data: updates,
  });
  return brand;
}

export async function deleteBrand(id: string): Promise<void> {
  await prisma.brand.delete({
    where: { id },
  });
}
