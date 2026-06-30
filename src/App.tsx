import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/components/AdminLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Insights from "./pages/Insights";
import Products from "./pages/Products";
import Combos from "./pages/Combos";
import ProductGraph from "./pages/ProductGraph";
import Orders from "./pages/Orders";
// import RecycleBin from "./pages/RecycleBin";
import Coupons from "./pages/Coupons";
import ShippingPolicy from "./pages/ShippingPolicy";
import ReturnPolicy from "./pages/ReturnPolicy";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AdminInfo from "./pages/AdminInfo";
import ContactSubmissions from "./pages/ContactSubmissions";
import Conversations from "./pages/Conversations";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename="/panel">
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="insights" element={<Insights />} />
              <Route path="products" element={<Products />} />
              <Route path="combos" element={<Combos />} />
              {/* <Route path="graph" element={<ProductGraph />} /> */}
              <Route path="orders" element={<Orders />} />
              {/* <Route path="recycle-bin" element={<RecycleBin />} /> */}
              <Route path="coupons" element={<Coupons />} />
              <Route path="shipping-policy" element={<ShippingPolicy />} />
              <Route path="return-policy" element={<ReturnPolicy />} />
              <Route path="privacy-policy" element={<PrivacyPolicy />} />
              <Route path="admin-info" element={<AdminInfo />} />
              <Route path="contact" element={<ContactSubmissions />} />
              <Route path="conversations" element={<Conversations />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
