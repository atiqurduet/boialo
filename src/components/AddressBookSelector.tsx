import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { MapPin, Check } from "lucide-react";

interface Address {
  id: string;
  label: string | null;
  full_name: string;
  phone: string;
  address: string;
  area: string | null;
  city: string | null;
  division: string | null;
  postal_code: string | null;
  is_default: boolean | null;
}

interface AddressBookSelectorProps {
  onSelect: (address: { fullName: string; phone: string; address: string; division?: string }) => void;
}

export const AddressBookSelector = ({ onSelect }: AddressBookSelectorProps) => {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("address_book")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .then(({ data }) => {
        if (data) setAddresses(data);
      });
  }, [user]);

  if (addresses.length === 0) return null;

  const handleSelect = (addr: Address) => {
    setSelectedId(addr.id);
    const parts = [addr.address, addr.area, addr.city, addr.postal_code, addr.division].filter(Boolean);
    onSelect({
      fullName: addr.full_name,
      phone: addr.phone,
      address: parts.join(", "),
      division: addr.division || undefined,
    });
  };

  return (
    <div className="mb-4">
      <p className="text-sm font-medium mb-2 flex items-center gap-1">
        <MapPin className="w-4 h-4" />
        সংরক্ষিত ঠিকানা থেকে বাছুন
      </p>
      <div className="flex flex-wrap gap-2">
        {addresses.map((addr) => (
          <Button
            key={addr.id}
            type="button"
            variant={selectedId === addr.id ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => handleSelect(addr)}
          >
            {selectedId === addr.id && <Check className="w-3 h-3 mr-1" />}
            {addr.label || addr.full_name}
            {addr.is_default && " (ডিফল্ট)"}
          </Button>
        ))}
      </div>
    </div>
  );
};
