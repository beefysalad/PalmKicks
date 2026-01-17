import bcrypt from "bcryptjs";
import prisma from "../../../lib/prisma";
import {
  AddConfigDataPayload,
  ChangePasswordData,
} from "@/app/shared/types/settings";
import { Configurations } from "@/app/generated/prisma/client";
import { configKeyFormat } from "@/helpers";

export async function changePassword(
  values: ChangePasswordData
): Promise<void> {
  const user = await prisma.admin.findUnique({
    where: {
      username: values.username,
    },
  });
  if (!user) {
    throw new Error("Admin user not found!");
  }
  const passwordMatch = await bcrypt.compare(
    values.currentPassword,
    user.password
  );
  if (!passwordMatch) {
    throw new Error("Invalid username or password!");
  }
  const hashedPassword = await bcrypt.hash(values.newPassword, 10);

  await prisma.admin.update({
    where: {
      username: values.username,
    },
    data: {
      password: hashedPassword,
      firstTimeLogin: false,
    },
  });
}

export async function addConfig(
  values: AddConfigDataPayload
): Promise<Configurations> {
  try {
    const config = await prisma.configurations.create({
      data: {
        key: configKeyFormat(values.key),
        value: values.value,
      },
    });
    return config;
  } catch (error: any) {
    if (error.code === "P2002") {
      throw new Error("Configuration with this key already exists!");
    }
    throw error;
  }
}

export async function getAllConfigs(
  limit?: number,
  offset?: number
): Promise<Configurations[]> {
  const configs = await prisma.configurations.findMany({
    orderBy: {
      updatedAt: "desc",
    },
    ...(limit && { take: limit }),
    ...(offset && { skip: offset }),
  });
  return configs;
}

export async function updateConfig(
  id: string,
  values: AddConfigDataPayload
): Promise<Configurations> {
  const config = await prisma.configurations.update({
    where: {
      id,
    },
    data: {
      value: values.value,
    },
  });
  return config;
}

export async function deleteConfig(id: string): Promise<void> {
  await prisma.configurations.delete({
    where: {
      id,
    },
  });
}
