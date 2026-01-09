"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { logout, isAuthenticated } from "@/lib/admin-auth";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  Tag,
  Star,
  ShoppingBag,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname !== "/admin/login" && !isAuthenticated()) {
      router.push("/admin/login");
    }
  }, [pathname, router]);

  const handleLogout = () => {
    logout();
    router.push("/admin/login");
  };

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/brands", label: "Brands", icon: Tag },
    { href: "/admin/featured", label: "Featured", icon: Star },
    { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  ];

  return (
    <div className='min-h-screen bg-background'>
      {/* Admin Navbar */}
      <nav className='border-b border-border bg-card shadow-sm'>
        <div className='container mx-auto px-4'>
          <div className='flex h-16 items-center justify-between'>
            <div className='flex items-center gap-8'>
              <Link
                href='/admin/dashboard'
                className='text-xl font-bold text-foreground'
              >
                Admin Panel
              </Link>
              <div className='hidden gap-1 md:flex'>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        className='gap-2'
                      >
                        <Icon className='h-4 w-4' />
                        {item.label}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className='flex items-center gap-4'>
              <Link
                href='/'
                className='text-sm text-muted-foreground hover:text-foreground'
              >
                View Site
              </Link>
              <Button variant='ghost' onClick={handleLogout} className='gap-2'>
                <LogOut className='h-4 w-4' />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className='border-b border-border bg-card md:hidden'>
        <div className='container mx-auto px-4 py-2'>
          <div className='flex flex-wrap gap-1'>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size='sm'
                    className='gap-2'
                  >
                    <Icon className='h-4 w-4' />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className='container mx-auto px-4 py-8'>{children}</main>
    </div>
  );
}
