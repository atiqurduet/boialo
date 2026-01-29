import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Loader2, GripVertical } from "lucide-react";

interface RefundPolicy {
  id: string;
  title_bn: string;
  title_en: string | null;
  content_bn: string;
  content_en: string | null;
  is_active: boolean;
  sort_order: number;
}

const AdminRefundPolicy = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<RefundPolicy | null>(null);
  const [formData, setFormData] = useState({
    title_bn: "",
    title_en: "",
    content_bn: "",
    content_en: "",
    is_active: true,
    sort_order: 0,
  });

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["admin-refund-policies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("refund_policies")
        .select("*")
        .order("sort_order", { ascending: true });
      
      if (error) throw error;
      return data as RefundPolicy[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingPolicy) {
        const { error } = await supabase
          .from("refund_policies")
          .update(data)
          .eq("id", editingPolicy.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("refund_policies")
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingPolicy ? "পলিসি আপডেট হয়েছে" : "পলিসি তৈরি হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["admin-refund-policies"] });
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("refund_policies")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("পলিসি মুছে ফেলা হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["admin-refund-policies"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      title_bn: "",
      title_en: "",
      content_bn: "",
      content_en: "",
      is_active: true,
      sort_order: 0,
    });
    setEditingPolicy(null);
    setOpen(false);
  };

  const handleEdit = (policy: RefundPolicy) => {
    setEditingPolicy(policy);
    setFormData({
      title_bn: policy.title_bn,
      title_en: policy.title_en || "",
      content_bn: policy.content_bn,
      content_en: policy.content_en || "",
      is_active: policy.is_active,
      sort_order: policy.sort_order,
    });
    setOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">রিফান্ড পলিসি</h1>
            <p className="text-muted-foreground">রিফান্ড পলিসি কন্টেন্ট ম্যানেজ করুন</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                নতুন সেকশন
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPolicy ? "পলিসি সম্পাদনা" : "নতুন পলিসি সেকশন"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>শিরোনাম (বাংলা) *</Label>
                    <Input
                      value={formData.title_bn}
                      onChange={(e) => setFormData({ ...formData, title_bn: e.target.value })}
                      placeholder="রিফান্ড শর্তাবলী"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Title (English)</Label>
                    <Input
                      value={formData.title_en}
                      onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                      placeholder="Refund Terms"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>কন্টেন্ট (বাংলা) *</Label>
                  <Textarea
                    value={formData.content_bn}
                    onChange={(e) => setFormData({ ...formData, content_bn: e.target.value })}
                    placeholder="রিফান্ড পলিসির বিস্তারিত..."
                    rows={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content (English)</Label>
                  <Textarea
                    value={formData.content_en}
                    onChange={(e) => setFormData({ ...formData, content_en: e.target.value })}
                    placeholder="Detailed refund policy..."
                    rows={8}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>সর্ট অর্ডার</Label>
                    <Input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label>সক্রিয়</Label>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={resetForm}>
                    বাতিল
                  </Button>
                  <Button
                    onClick={() => saveMutation.mutate(formData)}
                    disabled={saveMutation.isPending || !formData.title_bn || !formData.content_bn}
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {editingPolicy ? "আপডেট করুন" : "সেভ করুন"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>পলিসি সেকশনসমূহ</CardTitle>
            <CardDescription>ওয়েবসাইটে দেখানো রিফান্ড পলিসির সেকশনগুলো</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </div>
            ) : policies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                কোনো পলিসি নেই। নতুন সেকশন যোগ করুন।
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>শিরোনাম</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead className="text-right">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell>
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell className="font-medium">{policy.title_bn}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          policy.is_active 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {policy.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(policy)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("এই পলিসি মুছে ফেলতে চান?")) {
                              deleteMutation.mutate(policy.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminRefundPolicy;
