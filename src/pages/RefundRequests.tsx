import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, RotateCcw, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { Link, Navigate } from "react-router-dom";

const REFUND_REASONS = [
  "প্রোডাক্ট ড্যামেজড",
  "ভুল প্রোডাক্ট",
  "প্রোডাক্ট পছন্দ হয়নি",
  "ডেলিভারি দেরি",
  "অন্যান্য",
];

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "অপেক্ষমাণ", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  approved: { label: "অনুমোদিত", color: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "প্রত্যাখ্যাত", color: "bg-red-100 text-red-800", icon: XCircle },
  processing: { label: "প্রসেসিং", color: "bg-blue-100 text-blue-800", icon: Clock },
  completed: { label: "সম্পন্ন", color: "bg-purple-100 text-purple-800", icon: CheckCircle },
};

const RefundRequests = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  if (!user) return <Navigate to="/signin" />;

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["my-refund-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("refund_requests")
        .select("*, orders(order_number, total)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: eligibleOrders = [] } = useQuery({
    queryKey: ["eligible-orders-for-refund", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, total, created_at")
        .eq("user_id", user!.id)
        .in("status", ["delivered", "shipped"])
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;

      // Filter out orders with existing refund requests
      const { data: existingRequests } = await supabase
        .from("refund_requests")
        .select("order_id")
        .eq("user_id", user!.id);

      const existingOrderIds = new Set((existingRequests || []).map(r => r.order_id));
      return (data || []).filter(o => !existingOrderIds.has(o.id));
    },
    enabled: !!user,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const order = eligibleOrders.find(o => o.id === selectedOrder);
      if (!order) throw new Error("অর্ডার নির্বাচন করুন");

      const { error } = await supabase.from("refund_requests").insert({
        order_id: selectedOrder,
        user_id: user!.id,
        reason,
        description: description || null,
        refund_amount: order.total,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("রিফান্ড রিকোয়েস্ট জমা হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["my-refund-requests"] });
      queryClient.invalidateQueries({ queryKey: ["eligible-orders-for-refund"] });
      setDialogOpen(false);
      setSelectedOrder("");
      setReason("");
      setDescription("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="container py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">রিফান্ড রিকোয়েস্ট</h1>
              <p className="text-muted-foreground">আপনার রিফান্ড রিকোয়েস্ট ম্যানেজ করুন</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={eligibleOrders.length === 0}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  নতুন রিকোয়েস্ট
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>রিফান্ড রিকোয়েস্ট</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>অর্ডার নির্বাচন করুন *</Label>
                    <Select value={selectedOrder} onValueChange={setSelectedOrder}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="অর্ডার বাছাই করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        {eligibleOrders.map(order => (
                          <SelectItem key={order.id} value={order.id}>
                            {order.order_number} - ৳{order.total}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>কারণ *</Label>
                    <Select value={reason} onValueChange={setReason}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="কারণ বাছাই করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        {REFUND_REASONS.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>বিস্তারিত (ঐচ্ছিক)</Label>
                    <Textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="সমস্যার বিস্তারিত বর্ণনা..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => submitMutation.mutate()}
                    disabled={!selectedOrder || !reason || submitMutation.isPending}
                  >
                    {submitMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    রিকোয়েস্ট জমা দিন
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl">
              <RotateCcw className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-bold mb-2">কোনো রিফান্ড রিকোয়েস্ট নেই</h2>
              <p className="text-muted-foreground text-sm">ডেলিভারি হওয়া অর্ডারের জন্য রিফান্ড রিকোয়েস্ট করতে পারবেন</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((req: any) => {
                const status = STATUS_MAP[req.status] || STATUS_MAP.pending;
                const StatusIcon = status.icon;
                return (
                  <div key={req.id} className="bg-card rounded-xl p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-sm text-muted-foreground">{req.orders?.order_number}</p>
                        <p className="font-medium mt-1">{req.reason}</p>
                        {req.description && <p className="text-sm text-muted-foreground mt-1">{req.description}</p>}
                        <p className="text-primary font-bold mt-2">৳{req.refund_amount}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(req.created_at), "dd/MM/yyyy")}
                        </p>
                      </div>
                    </div>
                    {req.admin_notes && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm">
                        <span className="font-medium">এডমিন নোট: </span>{req.admin_notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RefundRequests;
