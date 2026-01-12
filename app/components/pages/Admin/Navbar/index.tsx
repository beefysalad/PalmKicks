import {
  LayoutDashboard,
  Package,
  Tag,
  Star,
  Sparkles,
  ShoppingBag,
  LogOut,
  User,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getInitials } from "@/helpers";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
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

            {/* Desktop Navigation */}
            <div className='hidden gap-1 lg:flex'>
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

          <div className='flex items-center gap-3'>
            {/* Profile Dropdown */}
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

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant='ghost' size='icon' className='lg:hidden'>
                  <Menu className='h-5 w-5' />
                </Button>
              </SheetTrigger>
              <SheetContent side='right' className='w-64'>
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className='mt-6 flex flex-col gap-2'>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link key={item.href} href={item.href}>
                        <Button
                          variant={isActive ? "default" : "ghost"}
                          className='w-full justify-start gap-2'
                        >
                          <Icon className='h-4 w-4' />
                          {item.label}
                        </Button>
                      </Link>
                    );
                  })}
                  <DropdownMenuSeparator className='my-2' />
                  <Link href='/'>
                    <Button variant='ghost' className='w-full justify-start'>
                      View Site
                    </Button>
                  </Link>
                  <Button
                    variant='ghost'
                    className='w-full justify-start gap-2 text-destructive hover:text-destructive'
                    onClick={handleLogout}
                  >
                    <LogOut className='h-4 w-4' />
                    Logout
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;
