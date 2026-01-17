import { Configurations } from "@/app/generated/prisma/client";

// Get initials from username
export const getInitials = (username: string) => {
  return username
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const getDevelopmentEnvironment = () => {
  return process.env.NEXT_PUBLIC_ENVIRONMENT === "DEV" ? "Development" : "";
};

export const getConfigValue = (
  configs: Configurations[],
  key: string
): string => {
  return configs.find((config) => config.key === key)?.value || "";
};

export const configKeyFormat = (key: string): string => {
  return key.replace(/\s+/g, "_").toUpperCase();
};
