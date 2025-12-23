import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import SignIn from "./pages/SignIn";
import Authors from "./pages/Authors";
import Publishers from "./pages/Publishers";
import Wishlist from "./pages/Wishlist";
import Offers from "./pages/Offers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/authors" element={<Authors />} />
          <Route path="/publishers" element={<Publishers />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/preorder" element={<Shop />} />
          <Route path="/lifestyle" element={<Shop />} />
          <Route path="/stationery" element={<Shop />} />
          <Route path="/food" element={<Shop />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
