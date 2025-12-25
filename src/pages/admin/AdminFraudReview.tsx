import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface OrderReview {
  id: string;
  order_id: string;
  status: string;
  reason: string | null;
  notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  orders: {
    order_number: string;
    full_name: string;
    phone: string;
    address: string;
    total: number;
    payment_method: string;
    user_id: string;
  };
}

interface RiskProfile {
  phone_verified: boolean;
  total_orders: number;
  cancelled_orders: number;
  returned_orders: number;
  risk_score: number;
  is_blacklisted: boolean;
}

const AdminFraudReview = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedReview, setSelectedReview] = useState<OrderReview | null>(null);
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null);
  const [notes, setNotes] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-fraud-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_reviews")
        .select(`
          *,
          orders (
            order_number,
            full_name,
            phone,
            address,
            total,
            payment_method,
            user_id
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OrderReview[];
    },
  });

  const pendingReviews = reviews?.filter((r) => r.status === "pending") || [];
  const reviewedOrders = reviews?.filter((r) => r.status !== "pending") || [];

  const fetchRiskProfile = async (userId: string) => {
    const { data } = await supabase
      .from("customer_risk_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return data as RiskProfile | null;
  };

  const openReviewDialog = async (review: OrderReview) => {
    setSelectedReview(review);
    setNotes(review.notes || "");
    setDialogOpen(true);

    if (review.orders?.user_id) {
      const profile = await fetchRiskProfile(review.orders.user_id);
      setRiskProfile(profile);
    }
  };

  const reviewMutation = useMutation({
    mutationFn: async ({ reviewId, status, notes }: { reviewId: string; status: string; notes: string }) => {
      const { error } = await supabase
        .from("order_reviews")
        .update({
          status,
          notes,
          reviewer_id: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", reviewId);
      if (error) throw error;

      // Update order review status
      if (selectedReview?.order_id) {
        await supabase
          .from("orders")
          .update({ review_status: status })
          .eq("id", selectedReview.order_id);
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-fraud-reviews"] });
      toast.success(`Order ${status === "approved" ? "approved" : "rejected"}`);
      setDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to update review: " + error.message);
    },
  });

  const handleApprove = () => {
    if (!selectedReview) return;
    reviewMutation.mutate({ reviewId: selectedReview.id, status: "approved", notes });
  };

  const handleReject = () => {
    if (!selectedReview) return;
    reviewMutation.mutate({ reviewId: selectedReview.id, status: "rejected", notes });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
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
            <ShieldAlert className="h-6 w-6" />
            Fraud Review Queue
          </h1>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {pendingReviews.length} Pending
          </Badge>
        </div>

        {/* Pending Reviews */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Orders Requiring Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingReviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>No orders pending review</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingReviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell className="font-medium">
                        {review.orders?.order_number}
                      </TableCell>
                      <TableCell>{review.orders?.full_name}</TableCell>
                      <TableCell>{review.orders?.phone}</TableCell>
                      <TableCell>৳{review.orders?.total?.toLocaleString()}</TableCell>
                      <TableCell>{review.orders?.payment_method}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{review.reason || "Manual Review"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openReviewDialog(review)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reviewed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewedOrders.slice(0, 10).map((review) => (
                  <TableRow key={review.id}>
                    <TableCell className="font-medium">
                      {review.orders?.order_number}
                    </TableCell>
                    <TableCell>{review.orders?.full_name}</TableCell>
                    <TableCell>{getStatusBadge(review.status)}</TableCell>
                    <TableCell>
                      {review.reviewed_at
                        ? new Date(review.reviewed_at).toLocaleString()
                        : "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Review Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Order #{selectedReview?.orders?.order_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Order Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Customer</Label>
                  <p className="font-medium">{selectedReview?.orders?.full_name}</p>
                </div>
                <div>
                  <Label>Phone</Label>
                  <p className="font-medium">{selectedReview?.orders?.phone}</p>
                </div>
                <div>
                  <Label>Address</Label>
                  <p className="font-medium">{selectedReview?.orders?.address}</p>
                </div>
                <div>
                  <Label>Total Amount</Label>
                  <p className="font-medium">৳{selectedReview?.orders?.total?.toLocaleString()}</p>
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <p className="font-medium">{selectedReview?.orders?.payment_method}</p>
                </div>
                <div>
                  <Label>Flag Reason</Label>
                  <Badge variant="outline">{selectedReview?.reason || "Manual Review"}</Badge>
                </div>
              </div>

              {/* Risk Profile */}
              {riskProfile && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer Risk Profile</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-xl font-bold">{riskProfile.total_orders}</p>
                        <p className="text-xs text-muted-foreground">Total Orders</p>
                      </div>
                      <div className="text-center p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                        <p className="text-xl font-bold text-yellow-600">{riskProfile.cancelled_orders}</p>
                        <p className="text-xs text-muted-foreground">Cancelled</p>
                      </div>
                      <div className="text-center p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                        <p className="text-xl font-bold text-red-600">{riskProfile.returned_orders}</p>
                        <p className="text-xs text-muted-foreground">Returned</p>
                      </div>
                      <div className="text-center p-3 rounded-lg">
                        {getRiskBadge(riskProfile.risk_score)}
                        <p className="text-xs text-muted-foreground mt-1">Score: {riskProfile.risk_score}/100</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {riskProfile.phone_verified ? (
                        <Badge variant="outline" className="text-green-600">Phone Verified</Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600">Phone Not Verified</Badge>
                      )}
                      {riskProfile.is_blacklisted && (
                        <Badge className="bg-red-500">Blacklisted</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label>Review Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this review..."
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <Button
                  onClick={handleApprove}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={reviewMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Order
                </Button>
                <Button
                  onClick={handleReject}
                  variant="destructive"
                  className="flex-1"
                  disabled={reviewMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Order
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminFraudReview;
