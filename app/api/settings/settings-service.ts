import bcrypt from "bcryptjs";
import prisma from "../../../lib/prisma";

export interface ChangePasswordData {
  username: string;
  currentPassword: string;
  newPassword: string;
}

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
    },
  });
}
