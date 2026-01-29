import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, User } from "lucide-react";

interface CustomerAddressBookProps {
  customerId: string;
}

export const CustomerAddressBook = ({ customerId }: CustomerAddressBookProps) => {
  const { data: addresses, isLoading } = useQuery({
    queryKey: ["customer-addresses", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("address_book")
        .select("*")
        .eq("user_id", customerId)
        .order("is_default", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-4">লোড হচ্ছে...</div>;
  }

  if (!addresses?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>কোনো ঠিকানা সেভ করা নেই</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          ঠিকানা বুক ({addresses.length}টি)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {addresses.map((address) => (
          <div
            key={address.id}
            className={`p-3 rounded-lg border ${
              address.is_default ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {address.label && (
                  <Badge variant="secondary">{address.label}</Badge>
                )}
                {address.is_default && (
                  <Badge variant="default">ডিফল্ট</Badge>
                )}
                {address.is_verified && (
                  <Badge variant="outline" className="text-green-600">
                    ভেরিফাইড
                  </Badge>
                )}
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <p className="flex items-center gap-2">
                <User className="h-3 w-3 text-muted-foreground" />
                {address.full_name}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-muted-foreground" />
                {address.phone}
              </p>
              <p className="flex items-start gap-2">
                <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                <span>
                  {address.address}
                  {address.area && `, ${address.area}`}
                  {address.city && `, ${address.city}`}
                  {address.division && `, ${address.division}`}
                  {address.postal_code && ` - ${address.postal_code}`}
                </span>
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
