import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Farmers from "./pages/Farmers";
import Buyers from "./pages/Buyers";
import Checkout from "./pages/Checkout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminCrops from "./pages/admin/Crops";
import AdminOrders from "./pages/admin/Orders";
import AdminPayments from "./pages/admin/Payments";
import BuyerOrders from "./pages/BuyerOrders";
import FarmerOrders from "./pages/FarmerOrders";
import Settings from "./pages/admin/Settings";
import OrderConfirmation from "./pages/OrderConfirmation";
import Profile from "./pages/Profile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/farmers" element={<Farmers />} />
          <Route path="/buyers" element={<Buyers />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/crops" element={<AdminCrops />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/payments" element={<AdminPayments />} />
          <Route path="/admin/settings" element={<Settings />} />
          <Route path="/buyer-orders" element={<BuyerOrders />} />
          <Route path="/farmer-orders" element={<FarmerOrders />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
          <Route path="/profile" element={<Profile />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
