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
