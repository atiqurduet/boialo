import { createContext, useContext, useState, ReactNode } from "react";
import { toast } from "sonner";

interface CompareItem {
  id: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  slug: string;
  author?: string;
  publisher?: string;
  category?: string;
  [key: string]: any;
}

interface CompareContextType {
  items: CompareItem[];
  addToCompare: (item: CompareItem) => void;
  removeFromCompare: (id: string) => void;
  isInCompare: (id: string) => boolean;
  clearCompare: () => void;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export const CompareProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CompareItem[]>([]);

  const addToCompare = (item: CompareItem) => {
    if (items.length >= 3) {
      toast.error("সর্বোচ্চ ৩টি পণ্য তুলনা করা যায়");
      return;
    }
    if (items.find(i => i.id === item.id)) {
      toast.info("এই পণ্যটি ইতিমধ্যে তুলনায় আছে");
      return;
    }
    setItems(prev => [...prev, item]);
    toast.success("তুলনায় যোগ হয়েছে");
  };

  const removeFromCompare = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const isInCompare = (id: string) => items.some(i => i.id === id);

  const clearCompare = () => setItems([]);

  return (
    <CompareContext.Provider value={{ items, addToCompare, removeFromCompare, isInCompare, clearCompare }}>
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
};
