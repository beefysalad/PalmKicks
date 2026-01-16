"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import AdminNavbar from "../components/pages/Admin/Navbar";
import { toast } from "sonner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, data: session } = useSession();

  useEffect(() => {
    if (status === "unauthenticated" && pathname !== "/admin/login") {
      router.push("/admin/login");
    }
    if (session?.user.firstTimeLogin) {
      router.push("/admin/settings");
    }
  }, [status, pathname, router, session]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className='min-h-screen bg-background'>
      {/* Admin Navbar */}
      <AdminNavbar />
      {/* Main Content */}
      <main
        className='container mx-auto px-4 py-8'
        suppressHydrationWarning={true}
      >
        {children}
      </main>
    </div>
  );
}
