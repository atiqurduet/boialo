import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Users,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Ban,
  CheckCircle,
} from "lucide-react";

interface CustomerProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

interface RiskProfile {
  id: string;
  user_id: string;
  phone_verified: boolean;
  total_orders: number;
  successful_orders: number;
  cancelled_orders: number;
  returned_orders: number;
  risk_score: number;
  is_blacklisted: boolean;
  blacklist_reason: string | null;
  notes: string | null;
}

const AdminCustomers = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [notes, setNotes] = useState("");

  const { data: customers, isLoading } = useQuery({
    queryKey: ["admin-customers", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CustomerProfile[];
    },
  });

  const fetchRiskProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("customer_risk_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data as RiskProfile | null;
  };

  const openCustomerDetails = async (customer: CustomerProfile) => {
    setSelectedCustomer(customer);
    try {
      const profile = await fetchRiskProfile(customer.id);
      setRiskProfile(profile);
      setBlacklistReason(profile?.blacklist_reason || "");
      setNotes(profile?.notes || "");
    } catch (error) {
      console.error("Error fetching risk profile:", error);
      setRiskProfile(null);
    }
  };

  const updateRiskProfile = useMutation({
    mutationFn: async (updates: Partial<RiskProfile>) => {
      if (!selectedCustomer) return;

      if (riskProfile) {
        const { error } = await supabase
          .from("customer_risk_profiles")
          .update(updates)
          .eq("user_id", selectedCustomer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("customer_risk_profiles")
          .insert({ user_id: selectedCustomer.id, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      toast.success("Customer profile updated");
      if (selectedCustomer) {
        fetchRiskProfile(selectedCustomer.id).then(setRiskProfile);
      }
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  const toggleBlacklist = () => {
    const newStatus = !riskProfile?.is_blacklisted;
    updateRiskProfile.mutate({
      is_blacklisted: newStatus,
      blacklist_reason: newStatus ? blacklistReason : null,
    });
  };

  const saveNotes = () => {
    updateRiskProfile.mutate({ notes });
  };

  const getRiskBadge = (score: number) => {
    if (score < 30) return <Badge className="bg-green-500">Low Risk</Badge>;
    if (score < 60) return <Badge className="bg-yellow-500">Medium Risk</Badge>;
    return <Badge className="bg-red-500">High Risk</Badge>;
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Customer Management
          </h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers?.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      {customer.full_name || "N/A"}
                    </TableCell>
                    <TableCell>{customer.email || "N/A"}</TableCell>
                    <TableCell>{customer.phone || "N/A"}</TableCell>
                    <TableCell>
                      {new Date(customer.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCustomerDetails(customer)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Customer Details</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-6">
                            {/* Customer Info */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Name</Label>
                                <p className="font-medium">{selectedCustomer?.full_name || "N/A"}</p>
                              </div>
                              <div>
                                <Label>Email</Label>
                                <p className="font-medium">{selectedCustomer?.email || "N/A"}</p>
                              </div>
                              <div>
                                <Label>Phone</Label>
                                <p className="font-medium">{selectedCustomer?.phone || "N/A"}</p>
                              </div>
                              <div>
                                <Label>Member Since</Label>
                                <p className="font-medium">
                                  {selectedCustomer?.created_at
                                    ? new Date(selectedCustomer.created_at).toLocaleDateString()
                                    : "N/A"}
                                </p>
                              </div>
                            </div>

                            {/* Risk Assessment */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <Shield className="h-5 w-5" />
                                  Risk Assessment
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="text-center p-3 bg-muted rounded-lg">
                                    <p className="text-2xl font-bold">{riskProfile?.total_orders || 0}</p>
                                    <p className="text-sm text-muted-foreground">Total Orders</p>
                                  </div>
                                  <div className="text-center p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                                    <p className="text-2xl font-bold text-green-600">{riskProfile?.successful_orders || 0}</p>
                                    <p className="text-sm text-muted-foreground">Successful</p>
                                  </div>
                                  <div className="text-center p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                                    <p className="text-2xl font-bold text-yellow-600">{riskProfile?.cancelled_orders || 0}</p>
                                    <p className="text-sm text-muted-foreground">Cancelled</p>
                                  </div>
                                  <div className="text-center p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                                    <p className="text-2xl font-bold text-red-600">{riskProfile?.returned_orders || 0}</p>
                                    <p className="text-sm text-muted-foreground">Returned</p>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span>Risk Score:</span>
                                    {getRiskBadge(riskProfile?.risk_score || 50)}
                                    <span className="text-muted-foreground">
                                      ({riskProfile?.risk_score || 50}/100)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {riskProfile?.phone_verified ? (
                                      <Badge variant="outline" className="text-green-600">
                                        <ShieldCheck className="h-3 w-3 mr-1" />
                                        Phone Verified
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-yellow-600">
                                        <ShieldAlert className="h-3 w-3 mr-1" />
                                        Phone Not Verified
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Blacklist Controls */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  {riskProfile?.is_blacklisted ? (
                                    <Ban className="h-5 w-5 text-red-500" />
                                  ) : (
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                  )}
                                  Account Status
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={riskProfile?.is_blacklisted || false}
                                      onCheckedChange={toggleBlacklist}
                                    />
                                    <span>
                                      {riskProfile?.is_blacklisted
                                        ? "Blacklisted"
                                        : "Active Account"}
                                    </span>
                                  </div>
                                </div>
                                {(riskProfile?.is_blacklisted || blacklistReason) && (
                                  <div className="space-y-2">
                                    <Label>Blacklist Reason</Label>
                                    <Input
                                      value={blacklistReason}
                                      onChange={(e) => setBlacklistReason(e.target.value)}
                                      placeholder="Enter reason for blacklisting..."
                                    />
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            {/* Notes */}
                            <div className="space-y-2">
                              <Label>Admin Notes</Label>
                              <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add notes about this customer..."
                                rows={3}
                              />
                              <Button onClick={saveNotes} size="sm">
                                Save Notes
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminCustomers;
