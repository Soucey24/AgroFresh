import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Sprout,
  ShoppingCart,
  PlusCircle,
  LogOut,
  Leaf,
  Menu,
  X,
  BadgeCheck,
  UserCircle2,
  TrendingUp,
  DollarSign,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import BackgroundSlideshow from "@/components/BackgroundSlideshow";
import { getProfile, logout } from "@/api";
import NotificationBell from "@/components/NotificationBell";

interface FarmerLayoutProps {
  children: ReactNode;
}

const FarmerLayout = ({ children }: FarmerLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    getProfile().then((profile) => {
      if (!profile?.error) {
        setUser(profile);
      }
    });
  }, []);

  const navigationItems = [
    { href: "/farmers", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/farmers/add", icon: PlusCircle, label: "Add Product" },
    { href: "/farmers#my-crops", icon: Sprout, label: "My Crops" },
    { href: "/farmer-orders", icon: ShoppingCart, label: "Orders" },
  ];

  const quickActions = [
    { href: '/farmers/sales-report', icon: TrendingUp, label: 'Sales Report' },
    { href: '/farmers/payouts', icon: DollarSign, label: 'Request Payment' },
    { href: '/farmers/availability', icon: Calendar, label: 'Update Availability' },
  ];

  const isActive = (href: string) => {
    const [path, hash] = href.split("#");
    if (location.pathname !== path) return false;
    if (!hash) return location.pathname === path && !location.hash;
    return location.hash === `#${hash}` || (path === "/farmers" && !location.hash && href === "/farmers");
  };

  const handleNavigate = () => {
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setSidebarOpen(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background relative flex">
      <BackgroundSlideshow />
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:fixed inset-y-0 left-0 top-0 z-50 w-72 bg-card/50 backdrop-blur-xl border-r border-border/50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-5 border-b border-border/50 flex items-center justify-between">
          <Link to="/farmers" className="flex items-center gap-3" onClick={handleNavigate}>
            <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Leaf className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">AgroFresh GH</h1>
              <p className="text-xs text-muted-foreground">Farmer Panel</p>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-5 border-b border-border/50">
          <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center text-primary">
                <UserCircle2 className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground truncate">{user?.name || "Farmer"}</div>
                <div className="text-xs text-muted-foreground capitalize truncate">{user?.role || "farmer"}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">
                {user?.verificationStatus === "approved"
                  ? "Verified farmer"
                  : user?.verificationStatus === "pending"
                    ? "Verification pending"
                    : "Verification not submitted"}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={handleNavigate}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors border ${
                isActive(item.href)
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:border-border/40"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
          <div className="mt-5 border-t border-border/50 pt-4">
            <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick Actions</p>
            {quickActions.map((item) => (
              <Link key={item.href} to={item.href} onClick={handleNavigate} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        <Separator />

        <div className="p-4 space-y-3">
          <Link to="/profile" onClick={handleNavigate}>
            <Button variant="outline" className="w-full justify-start rounded-2xl">
              <UserCircle2 className="h-4 w-4 mr-2" />
              Profile
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start rounded-2xl text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 lg:ml-72">
        <div className="lg:hidden p-4 border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-30">
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <Leaf className="h-6 w-6 text-primary flex-shrink-0" />
              <span className="font-semibold text-foreground truncate">Farmer Panel</span>
            </div>
            <NotificationBell />
          </div>
        </div>

        <main className="flex-1 p-4 lg:p-8 overflow-auto bg-card/15 backdrop-blur-sm">
          {children}
        </main>
      </div>
    </div>
  );
};

export default FarmerLayout;