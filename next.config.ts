import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "shoenami.com.ph",
      },
      {
        protocol: "https",
        hostname: "**.shoenami.com.ph",
      },
      // Allow common image hosting services
      {
        protocol: "https",
        hostname: "**.imgur.com",
      },
      {
        protocol: "https",
        hostname: "**.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "**.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.pexels.com",
      },
    ],
    // Allow all external images (less secure but more flexible for admin panel)
    // Uncomment the line below if you want to allow any external image
    // unoptimized: true,
  },
};

export default nextConfig;
