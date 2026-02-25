import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Plus, Edit, Trash2, Loader2, Truck } from "lucide-react";
import { toast } from "sonner";

const divisions = ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "বরিশাল", "সিলেট", "রংপুর", "ময়মনসিংহ"];

interface DeliveryZone {
  id: string;
  zone_name_bn: string;
  zone_name_en: string | null;
  division: string | null;
  delivery_charge: number;
  estimated_days_min: number;
  estimated_days_max: number;
  is_active: boolean;
  sort_order: number;
}

const emptyZone = {
  zone_name_bn: "",
  zone_name_en: "",
  division: "",
  delivery_charge: 0,
  estimated_days_min: 1,
  estimated_days_max: 3,
  is_active: true,
  sort_order: 0,
};

const AdminDeliveryZones = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryZone | null>(null);
  const [form, setForm] = useState(emptyZone);

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ["delivery-zones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_zones")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as DeliveryZone[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("delivery_zones").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("delivery_zones").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-zones"] });
      setDialogOpen(false);
      toast.success(editing ? "আপডেট হয়েছে" : "যোগ হয়েছে");
    },
    onError: (e) => toast.error("সমস্যা: " + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("delivery_zones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-zones"] });
      toast.success("ডিলিট হয়েছে");
    },
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyZone);
    setDialogOpen(true);
  };

  const openEdit = (zone: DeliveryZone) => {
    setEditing(zone);
    setForm({
      zone_name_bn: zone.zone_name_bn,
      zone_name_en: zone.zone_name_en || "",
      division: zone.division || "",
      delivery_charge: zone.delivery_charge,
      estimated_days_min: zone.estimated_days_min,
      estimated_days_max: zone.estimated_days_max,
      is_active: zone.is_active,
      sort_order: zone.sort_order,
    });
    setDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="h-6 w-6" />
              ডেলিভারি জোন
            </h1>
            <p className="text-muted-foreground">এলাকা ভিত্তিক ডেলিভারি চার্জ সেট করুন</p>
          </div>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" />
            নতুন জোন
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>জোন</TableHead>
                  <TableHead>বিভাগ</TableHead>
                  <TableHead className="text-right">চার্জ</TableHead>
                  <TableHead className="text-center">সময়</TableHead>
                  <TableHead className="text-center">স্ট্যাটাস</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                ) : zones.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">কোন জোন নেই</TableCell></TableRow>
                ) : (
                  zones.map((zone) => (
                    <TableRow key={zone.id}>
                      <TableCell className="font-medium">{zone.zone_name_bn}</TableCell>
                      <TableCell>{zone.division || '-'}</TableCell>
                      <TableCell className="text-right font-bold">৳{zone.delivery_charge}</TableCell>
                      <TableCell className="text-center">{zone.estimated_days_min}-{zone.estimated_days_max} দিন</TableCell>
                      <TableCell className="text-center">
                        {zone.is_active ? (
                          <Badge className="bg-green-500">সক্রিয়</Badge>
                        ) : (
                          <Badge variant="secondary">নিষ্ক্রিয়</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(zone)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(zone.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "জোন এডিট করুন" : "নতুন ডেলিভারি জোন"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>জোনের নাম (বাংলা) *</Label>
              <Input value={form.zone_name_bn} onChange={(e) => setForm({ ...form, zone_name_bn: e.target.value })} />
            </div>
            <div>
              <Label>জোনের নাম (English)</Label>
              <Input value={form.zone_name_en} onChange={(e) => setForm({ ...form, zone_name_en: e.target.value })} />
            </div>
            <div>
              <Label>বিভাগ</Label>
              <Select value={form.division} onValueChange={(v) => setForm({ ...form, division: v })}>
                <SelectTrigger><SelectValue placeholder="বিভাগ নির্বাচন করুন" /></SelectTrigger>
                <SelectContent>
                  {divisions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ডেলিভারি চার্জ (৳)</Label>
              <Input type="number" value={form.delivery_charge} onChange={(e) => setForm({ ...form, delivery_charge: Number(e.target.value) })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ন্যূনতম দিন</Label>
                <Input type="number" value={form.estimated_days_min} onChange={(e) => setForm({ ...form, estimated_days_min: Number(e.target.value) })} />
              </div>
              <div>
                <Label>সর্বোচ্চ দিন</Label>
                <Input type="number" value={form.estimated_days_max} onChange={(e) => setForm({ ...form, estimated_days_max: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>সক্রিয়</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>বাতিল</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.zone_name_bn}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "আপডেট" : "সংরক্ষণ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminDeliveryZones;
