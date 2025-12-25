import { createContext, useContext, ReactNode } from "react";
import { useWishlist, WishlistItem } from "@/hooks/useWishlist";

interface WishlistContextType {
  wishlistItems: WishlistItem[];
  loading: boolean;
  addToWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (itemId: string) => Promise<void>;
  clearWishlist: () => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<void>;
  wishlistCount: number;
  refetch: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const wishlist = useWishlist();

  return (
    <WishlistContext.Provider value={wishlist}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlistContext = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlistContext must be used within a WishlistProvider");
  }
  return context;
};
