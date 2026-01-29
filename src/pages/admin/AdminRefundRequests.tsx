import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Eye, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface RefundRequest {
  id: string;
  order_id: string;
  user_id: string;
  reason: string;
  description: string | null;
  refund_amount: number;
  status: string;
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  orders?: {
    order_number: string;
    total: number;
    full_name: string;
    phone: string;
  };
}

const STATUS_OPTIONS = [
  { value: "pending", label: "অপেক্ষমাণ", color: "bg-yellow-100 text-yellow-800" },
  { value: "approved", label: "অনুমোদিত", color: "bg-green-100 text-green-800" },
  { value: "rejected", label: "প্রত্যাখ্যাত", color: "bg-red-100 text-red-800" },
  { value: "processing", label: "প্রসেসিং", color: "bg-blue-100 text-blue-800" },
  { value: "completed", label: "সম্পন্ন", color: "bg-purple-100 text-purple-800" },
];

const REFUND_REASONS = [
  "প্রোডাক্ট ড্যামেজড",
  "ভুল প্রোডাক্ট",
  "প্রোডাক্ট পছন্দ হয়নি",
  "ডেলিভারি দেরি",
  "অন্যান্য",
];

const AdminRefundRequests = () => {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<RefundRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin-refund-requests", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("refund_requests")
        .select(`
          *,
          orders(order_number, total, full_name, phone)
        `)
        .order("created_at", { ascending: false });
      
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as RefundRequest[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("refund_requests")
        .update({
          status,
          admin_notes: notes,
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("রিফান্ড রিকোয়েস্ট আপডেট হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["admin-refund-requests"] });
      setSelectedRequest(null);
      setAdminNotes("");
      setNewStatus("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find((s) => s.value === status);
    return (
      <Badge className={statusOption?.color || "bg-gray-100 text-gray-800"}>
        {statusOption?.label || status}
      </Badge>
    );
  };

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">রিফান্ড রিকোয়েস্ট</h1>
          <p className="text-muted-foreground">কাস্টমার রিফান্ড রিকোয়েস্ট ম্যানেজ করুন</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">মোট</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">অপেক্ষমাণ</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">অনুমোদিত</p>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">প্রত্যাখ্যাত</p>
                  <p className="text-2xl font-bold">{stats.rejected}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>রিকোয়েস্ট লিস্ট</CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="স্ট্যাটাস ফিল্টার" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল</SelectItem>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                কোনো রিফান্ড রিকোয়েস্ট নেই।
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>অর্ডার</TableHead>
                    <TableHead>কাস্টমার</TableHead>
                    <TableHead>কারণ</TableHead>
                    <TableHead>পরিমাণ</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead>তারিখ</TableHead>
                    <TableHead className="text-right">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono">
                        {request.orders?.order_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.orders?.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {request.orders?.phone}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{request.reason}</TableCell>
                      <TableCell>৳{request.refund_amount}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        {format(new Date(request.created_at), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedRequest(request);
                            setAdminNotes(request.admin_notes || "");
                            setNewStatus(request.status);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Detail Modal */}
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>রিফান্ড রিকোয়েস্ট বিস্তারিত</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">অর্ডার নম্বর</Label>
                    <p className="font-mono">{selectedRequest.orders?.order_number}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">রিফান্ড পরিমাণ</Label>
                    <p className="font-bold text-lg">৳{selectedRequest.refund_amount}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">কারণ</Label>
                  <p>{selectedRequest.reason}</p>
                </div>
                {selectedRequest.description && (
                  <div>
                    <Label className="text-muted-foreground">বিস্তারিত</Label>
                    <p className="text-sm">{selectedRequest.description}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>স্ট্যাটাস পরিবর্তন</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>এডমিন নোট</Label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="প্রসেসিং সম্পর্কে নোট..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                    বাতিল
                  </Button>
                  <Button
                    onClick={() => updateMutation.mutate({
                      id: selectedRequest.id,
                      status: newStatus,
                      notes: adminNotes,
                    })}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    আপডেট করুন
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminRefundRequests;
