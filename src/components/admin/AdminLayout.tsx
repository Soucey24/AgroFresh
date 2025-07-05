import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  CreditCard,
  Settings, 
  LogOut,
  Leaf
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import BackgroundSlideshow from "@/components/BackgroundSlideshow";
import { logout } from "@/api";

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/users", icon: Users, label: "Users" },
    { href: "/admin/crops", icon: Package, label: "Crops" },
    { href: "/admin/orders", icon: ShoppingCart, label: "Orders" },
    { href: "/admin/payments", icon: CreditCard, label: "Payments" },
    { href: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background flex relative">
      <BackgroundSlideshow />
      <div className="relative z-10 flex w-full">
        {/* Sidebar */}
        <div className="w-64 bg-card/40 backdrop-blur-sm border-r border-border/50 flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-border/50">
            <Link to="/" className="flex items-center space-x-2">
              <Leaf className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">AgroFresh GH</h1>
                <p className="text-sm text-muted-foreground">Admin Panel</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <Separator />

          {/* User Actions */}
          <div className="p-4 space-y-2">
            <Link to="/">
              <Button variant="outline" className="w-full justify-start">
                <Leaf className="h-4 w-4 mr-2" />
                Back to Site
              </Button>
            </Link>
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={async () => {
                await logout();
                navigate("/");
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 bg-card/20 backdrop-blur-sm">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
