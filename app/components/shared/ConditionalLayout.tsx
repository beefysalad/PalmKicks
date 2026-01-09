"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { Fragment } from "react";
export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  if (isAdminRoute) {
    return <Fragment>{children}</Fragment>;
  }

  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
