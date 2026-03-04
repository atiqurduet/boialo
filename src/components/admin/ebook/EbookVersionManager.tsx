import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, FileText, CheckCircle, Clock, Loader2, Upload, X } from "lucide-react";
import { useRef } from "react";

interface EbookVersionManagerProps {
  digitalProductId: string;
}

export const EbookVersionManager = ({ digitalProductId }: EbookVersionManagerProps) => {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [newVersion, setNewVersion] = useState({
    version: "",
    changelog_bn: "",
    changelog_en: "",
    file_url: "",
    file_size_mb: 0,
    is_current: false,
  });

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["ebook-versions", digitalProductId],
    queryFn: async () => {
      const { data } = await supabase
        .from("digital_product_versions")
        .select("*")
        .eq("digital_product_id", digitalProductId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!digitalProductId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (newVersion.is_current) {
        await supabase
          .from("digital_product_versions")
          .update({ is_current: false })
          .eq("digital_product_id", digitalProductId);
      }
      const { error } = await supabase.from("digital_product_versions").insert({
        digital_product_id: digitalProductId,
        version: newVersion.version,
        changelog_bn: newVersion.changelog_bn || null,
        changelog_en: newVersion.changelog_en || null,
        file_url: newVersion.file_url || null,
        file_size_mb: newVersion.file_size_mb || null,
        is_current: newVersion.is_current,
        release_date: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ebook-versions"] });
      setShowAdd(false);
      setNewVersion({ version: "", changelog_bn: "", changelog_en: "", file_url: "", file_size_mb: 0, is_current: false });
      toast.success("নতুন ভার্সন যোগ হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("digital_product_versions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ebook-versions"] });
      toast.success("ভার্সন মুছে ফেলা হয়েছে");
    },
  });

  const setCurrentMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("digital_product_versions").update({ is_current: false }).eq("digital_product_id", digitalProductId);
      const { error } = await supabase.from("digital_product_versions").update({ is_current: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ebook-versions"] });
      toast.success("বর্তমান ভার্সন সেট হয়েছে");
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) { toast.error("ফাইল সাইজ ১০০MB এর বেশি"); return; }
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `versions/${digitalProductId}/${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from("digital-files").upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("digital-files").getPublicUrl(fileName);
      setNewVersion(v => ({ ...v, file_url: publicUrl, file_size_mb: Math.round((file.size / 1024 / 1024) * 100) / 100 }));
      toast.success("ফাইল আপলোড হয়েছে");
    } catch { toast.error("আপলোড ব্যর্থ"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" /> ভার্সন ম্যানেজমেন্ট
          <Badge variant="outline" className="text-[10px]">{versions.length}টি</Badge>
        </h4>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(true)} className="gap-1">
          <Plus className="w-3.5 h-3.5" /> নতুন ভার্সন
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : versions.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">কোনো ভার্সন নেই</p>
        </div>
      ) : (
        <div className="space-y-2">
          {versions.map((v: any) => (
            <div key={v.id} className={`flex items-start gap-3 rounded-lg border p-3 ${v.is_current ? "border-primary/40 bg-primary/5" : ""}`}>
              <div className="pt-0.5">
                {v.is_current ? (
                  <CheckCircle className="w-5 h-5 text-primary" />
                ) : (
                  <Clock className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">v{v.version}</span>
                  {v.is_current && <Badge className="text-[10px]">বর্তমান</Badge>}
                  {v.file_size_mb && <span className="text-[10px] text-muted-foreground">{v.file_size_mb}MB</span>}
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(v.release_date || v.created_at).toLocaleDateString("bn-BD")}
                  </span>
                </div>
                {v.changelog_bn && <p className="text-xs text-muted-foreground mt-1">{v.changelog_bn}</p>}
              </div>
              <div className="flex items-center gap-1">
                {!v.is_current && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCurrentMutation.mutate(v.id)}>
                    বর্তমান করুন
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => {
                  if (confirm("এই ভার্সন মুছে ফেলতে চান?")) deleteMutation.mutate(v.id);
                }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>নতুন ভার্সন যোগ করুন</DialogTitle></DialogHeader>
          <input ref={fileRef} type="file" accept=".pdf,.epub,.mobi" onChange={handleFileUpload} className="hidden" />
          <div className="space-y-4">
            <div><Label>ভার্সন নম্বর *</Label><Input placeholder="যেমন: 1.1, 2.0" value={newVersion.version} onChange={e => setNewVersion({ ...newVersion, version: e.target.value })} /></div>
            <div><Label>পরিবর্তনের বিবরণ (বাংলা)</Label><Textarea rows={2} value={newVersion.changelog_bn} onChange={e => setNewVersion({ ...newVersion, changelog_bn: e.target.value })} /></div>
            <div><Label>Changelog (English)</Label><Textarea rows={2} value={newVersion.changelog_en} onChange={e => setNewVersion({ ...newVersion, changelog_en: e.target.value })} /></div>
            <div>
              <Label>ফাইল</Label>
              {newVersion.file_url ? (
                <div className="flex items-center gap-2 mt-1 bg-muted/50 rounded-lg p-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="text-sm flex-1">{newVersion.file_size_mb}MB</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setNewVersion({ ...newVersion, file_url: "", file_size_mb: 0 })}><X className="w-3.5 h-3.5" /></Button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" className="mt-1 gap-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> আপলোড হচ্ছে</> : <><Upload className="w-3.5 h-3.5" /> ফাইল আপলোড</>}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newVersion.is_current} onCheckedChange={v => setNewVersion({ ...newVersion, is_current: v })} />
              <Label>বর্তমান ভার্সন হিসেবে সেট করুন</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>বাতিল</Button>
            <Button onClick={() => addMutation.mutate()} disabled={!newVersion.version || addMutation.isPending}>
              {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />} যোগ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
