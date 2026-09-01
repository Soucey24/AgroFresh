import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Farmers from "./pages/Farmers";
import AddProduct from "./pages/AddProduct";
import RequireAuth from "./components/RequireAuth";
import Buyers from "./pages/Buyers";
import Checkout from "./pages/Checkout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminCrops from "./pages/admin/Crops";
import AdminOrders from "./pages/admin/Orders";
import AdminPayments from "./pages/admin/Payments";
import Payouts from "./pages/admin/Payouts";
import Operations from "./pages/admin/Operations";
import OperationsDashboardPage from "./pages/operations/OperationsDashboardPage";
import OperationsQueuePage from "./pages/operations/OperationsQueuePage";
import OperationsQualityPage from "./pages/operations/OperationsQualityPage";
import OperationsDispatchPage from "./pages/operations/OperationsDispatchPage";
import OperationsPayoutsPage from "./pages/operations/OperationsPayoutsPage";
import OperationsTeamPage from "./pages/operations/OperationsTeamPage";
import BuyerOrders from "./pages/BuyerOrders";
import FarmerOrders from "./pages/FarmerOrders";
import Settings from "./pages/admin/Settings";
import Verifications from "./pages/admin/Verifications";
import Reports from "./pages/admin/Reports";
import FarmerInsights from "./pages/FarmerInsights";
import FarmerVerification from "./pages/FarmerVerification";
import FarmerQuickActionPage from "./pages/FarmerQuickActionPage";
import OrderConfirmation from "./pages/OrderConfirmation";
import Profile from "./pages/Profile";
import OperationsProfile from "./pages/OperationsProfile";
import ChangePassword from "./pages/ChangePassword";
import DeliveryTracking from './pages/DeliveryTracking';

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
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/change-password" element={<RequireAuth><ChangePassword /></RequireAuth>} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/farmers" element={<RequireAuth><Farmers /></RequireAuth>} />
          <Route path="/farmers/add" element={<RequireAuth><AddProduct /></RequireAuth>} />
          <Route path="/farmers/sales-report" element={<RequireAuth><FarmerQuickActionPage mode="sales" /></RequireAuth>} />
          <Route path="/farmers/payouts" element={<RequireAuth><FarmerQuickActionPage mode="payout" /></RequireAuth>} />
          <Route path="/farmers/availability" element={<RequireAuth><FarmerQuickActionPage mode="availability" /></RequireAuth>} />
          <Route path="/buyers" element={<Buyers />} />
          <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/verifications" element={<Verifications />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/crops" element={<AdminCrops />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/payments" element={<AdminPayments />} />
          <Route path="/admin/payouts" element={<Payouts />} />
          <Route path="/admin/operations" element={<RequireAuth><Operations section="dashboard" /></RequireAuth>} />
          <Route path="/operations" element={<RequireAuth><OperationsDashboardPage isAdminMode={false} /></RequireAuth>} />
          <Route path="/operations/queue" element={<RequireAuth><OperationsQueuePage /></RequireAuth>} />
          <Route path="/operations/quality" element={<RequireAuth><OperationsQualityPage /></RequireAuth>} />
          <Route path="/operations/dispatch" element={<RequireAuth><OperationsDispatchPage /></RequireAuth>} />
          <Route path="/operations/payouts" element={<RequireAuth><OperationsPayoutsPage /></RequireAuth>} />
          <Route path="/operations/team" element={<RequireAuth><OperationsTeamPage /></RequireAuth>} />
          <Route path="/admin/settings" element={<Settings />} />
          <Route path="/buyer-orders" element={<BuyerOrders />} />
          <Route path="/farmer-orders" element={<FarmerOrders />} />
          <Route path="/farmer-insights/:cropId" element={<FarmerInsights />} />
          <Route path="/verify-farmer" element={<FarmerVerification />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/operations-profile" element={<RequireAuth><OperationsProfile /></RequireAuth>} />
          <Route path="/delivery-tracking/:orderId" element={<DeliveryTracking />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
