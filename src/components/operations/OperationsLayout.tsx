import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardCheck,
  Truck,
  WalletCards,
  Users,
  LogOut,
  Leaf,
  Menu,
  X,
  Boxes,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import BackgroundSlideshow from "@/components/BackgroundSlideshow";
import { logout } from "@/api";

interface OperationsLayoutProps {
  children: ReactNode;
}

const OperationsLayout = ({ children }: OperationsLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigationItems = [
    { href: "/operations", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/operations/queue", icon: Boxes, label: "Collection Queue" },
    { href: "/operations/quality", icon: ClipboardCheck, label: "Quality" },
    { href: "/operations/quality-history", icon: ClipboardCheck, label: "Quality History" },
    { href: "/operations/dispatch", icon: Truck, label: "Dispatch" },
    { href: "/operations/payouts", icon: WalletCards, label: "Payouts" },
    { href: "/operations/team", icon: Users, label: "Team" },
  ];

  const isActive = (path: string) => {
    if (path === "/operations") return location.pathname === "/operations";
    return location.pathname.startsWith(path);
  };

  const handleNavigation = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-background flex relative">
      <BackgroundSlideshow />
      <div className="relative z-10 flex w-full">
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <div className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card/40 backdrop-blur-sm border-r border-border/50 flex flex-col transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="p-6 border-b border-border/50 flex items-center justify-between">
            <Link to="/operations" className="flex items-center space-x-2">
              <Leaf className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">AgroFresh GH</h1>
                <p className="text-sm text-muted-foreground">Operations Portal</p>
              </div>
            </Link>
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={handleNavigation}
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

          <div className="p-4 space-y-2">
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

        <div className="flex-1 flex flex-col min-w-0">
          <div className="lg:hidden p-4 border-b border-border/50 bg-card/40 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center space-x-2">
                <Leaf className="h-6 w-6 text-primary" />
                <span className="font-semibold text-foreground">Operations</span>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 lg:p-8 bg-card/20 backdrop-blur-sm overflow-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationsLayout;
