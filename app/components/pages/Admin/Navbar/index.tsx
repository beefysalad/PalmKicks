import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDevelopmentEnvironment, getInitials } from "@/helpers";
import {
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/brands", label: "Brands", icon: Tag },
  { href: "/admin/featured", label: "Featured", icon: Star },
  { href: "/admin/latest", label: "Latest", icon: Sparkles },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
];

const AdminNavbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/admin/login");
    router.refresh();
  };

  if (status === "loading") {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div>Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const username = session.user?.username || "Admin";

  return (
    <div className='sticky top-0 z-50 w-full border-b border-border bg-card shadow-sm'>
      {/* Main Navbar */}
      <nav className='border-b border-border/40 lg:border-b-0'>
        <div className='container mx-auto px-4'>
          <div className='flex h-16 items-center justify-between'>
            {/* Left Section - Logo & Desktop Nav */}
            <div className='flex items-center gap-6'>
              <Link
                href='/admin/dashboard'
                className='text-xl font-bold text-foreground'
              >
                Admin Panel {getDevelopmentEnvironment()}
              </Link>

              {/* Desktop Navigation */}
              <div className='hidden gap-1 lg:flex'>
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

            {/* Right Section - Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  className='relative h-10 gap-2 rounded-full pl-2 pr-3'
                >
                  <Avatar className='h-8 w-8'>
                    <AvatarFallback className='bg-primary text-primary-foreground'>
                      {getInitials(username)}
                    </AvatarFallback>
                  </Avatar>
                  <span className='hidden text-sm font-medium md:inline-block'>
                    {username}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className='w-56' align='end' forceMount>
                <DropdownMenuLabel className='font-normal'>
                  <div className='flex flex-col space-y-1'>
                    <p className='text-sm font-medium leading-none'>
                      {username}
                    </p>
                    <p className='text-xs leading-none text-muted-foreground'>
                      Administrator
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href='/' className='cursor-pointer'>
                    View Site
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className='cursor-pointer text-destructive focus:text-destructive'
                  onClick={handleLogout}
                >
                  <LogOut className='mr-2 h-4 w-4' />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Mobile Horizontal Scroll Menu */}
      <div className='scrollbar-hide overflow-x-auto bg-muted/30 lg:hidden'>
        <div className='flex gap-1.5 px-4 py-2.5'>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className='flex-shrink-0'>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size='sm'
                  className='gap-2 whitespace-nowrap px-4'
                >
                  <Icon className='h-4 w-4' />
                  <span className='text-sm font-medium'>{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Add this style tag to hide scrollbar */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default AdminNavbar;
