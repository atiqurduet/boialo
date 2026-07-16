import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { KeyRound, Plus, Trash2, Eye, EyeOff, Copy, Loader2, ShieldAlert, Pencil } from "lucide-react";

interface AppSecret {
  id: string;
  name: string;
  value: string;
  description: string | null;
  category: string;
  is_active: boolean;
  updated_at: string;
}

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "ai", label: "AI / LLM" },
  { value: "sms", label: "SMS" },
  { value: "payment", label: "Payment" },
  { value: "social", label: "Social Media" },
  { value: "email", label: "Email" },
  { value: "courier", label: "Courier" },
  { value: "analytics", label: "Analytics" },
];

const AdminEnvVariables = () => {
  const [loading, setLoading] = useState(true);
  const [secrets, setSecrets] = useState<AppSecret[]>([]);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<AppSecret | null>(null);
  const [form, setForm] = useState({
    name: "",
    value: "",
    description: "",
    category: "general",
    is_active: true,
  });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("app_secrets")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });
    if (error) toast.error("লোড করতে ব্যর্থ: " + error.message);
    else setSecrets((data || []) as AppSecret[]);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", value: "", description: "", category: "general", is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (s: AppSecret) => {
    setEditing(s);
    setForm({
      name: s.name,
      value: s.value,
      description: s.description || "",
      category: s.category,
      is_active: s.is_active,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.value.trim()) {
      toast.error("Name এবং Value দিতে হবে");
      return;
    }
    if (!/^[A-Z_][A-Z0-9_]*$/.test(form.name)) {
      toast.error("Name শুধু বড় হাতের অক্ষর, সংখ্যা ও _ হতে পারে (যেমন OPENAI_API_KEY)");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const payload: any = {
      name: form.name.trim(),
      value: form.value,
      description: form.description || null,
      category: form.category,
      is_active: form.is_active,
    };
    let error;
    if (editing) {
      ({ error } = await (supabase as any).from("app_secrets").update(payload).eq("id", editing.id));
    } else {
      payload.created_by = userData.user?.id;
      ({ error } = await (supabase as any).from("app_secrets").insert(payload));
    }
    setSaving(false);
    if (error) {
      toast.error("সেভ করতে ব্যর্থ: " + error.message);
      return;
    }
    toast.success(editing ? "আপডেট হয়েছে" : "যোগ হয়েছে");
    setDialogOpen(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("app_secrets").delete().eq("id", id);
    if (error) toast.error("ডিলিট করতে ব্যর্থ: " + error.message);
    else {
      toast.success("ডিলিট হয়েছে");
      load();
    }
  };

  const toggle = (id: string) => setVisible((v) => ({ ...v, [id]: !v[id] }));

  const copy = async (v: string) => {
    await navigator.clipboard.writeText(v);
    toast.success("কপি হয়েছে");
  };

  const mask = (v: string) => (v.length <= 8 ? "••••••••" : v.slice(0, 4) + "••••••••" + v.slice(-4));

  const grouped = secrets.reduce<Record<string, AppSecret[]>>((acc, s) => {
    (acc[s.category] ||= []).push(s);
    return acc;
  }, {});

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <KeyRound className="h-6 w-6" /> Environment Variables
            </h1>
            <p className="text-muted-foreground mt-1">
              API keys ও secret values ম্যানেজ করুন। Edge functions এগুলো runtime-এ পড়তে পারবে।
            </p>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" /> নতুন Variable
          </Button>
        </div>

        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="pt-6 flex gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-semibold">সিকিউরিটি নোট</p>
              <p className="text-muted-foreground">
                শুধু super_admin এই পেজ অ্যাক্সেস করতে পারে। Values database-এ store হয় এবং edge functions
                service role দিয়ে <code className="px-1 bg-muted rounded">get_app_secret('NAME')</code> RPC কল করে read করতে পারে।
              </p>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : secrets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              কোনো variable যোগ করা হয়নি। উপরের বাটন থেকে যোগ করুন।
            </CardContent>
          </Card>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <Card key={cat}>
              <CardHeader>
                <CardTitle className="text-lg capitalize">
                  {CATEGORIES.find((c) => c.value === cat)?.label || cat}
                </CardTitle>
                <CardDescription>{items.length}টি variable</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((s) => (
                  <div key={s.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono font-semibold">{s.name}</code>
                        {!s.is_active && <Badge variant="secondary">Inactive</Badge>}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => toggle(s.id)}>
                          {visible[s.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => copy(s.value)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>ডিলিট করবেন?</AlertDialogTitle>
                              <AlertDialogDescription>
                                <code>{s.name}</code> ডিলিট হলে যেসব edge function এটা ব্যবহার করে সেগুলো ভেঙে যেতে পারে।
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>বাতিল</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(s.id)}>ডিলিট</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <div className="text-sm font-mono bg-muted px-2 py-1 rounded break-all">
                      {visible[s.id] ? s.value : mask(s.value)}
                    </div>
                    {s.description && (
                      <p className="text-xs text-muted-foreground">{s.description}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Variable এডিট" : "নতুন Variable"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  placeholder="OPENAI_API_KEY"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })}
                  disabled={!!editing}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  বড় হাতের অক্ষর, সংখ্যা ও _ ব্যবহার করুন
                </p>
              </div>
              <div>
                <Label>Value</Label>
                <Textarea
                  placeholder="sk-..."
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  className="font-mono text-sm"
                  rows={3}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Input
                  placeholder="কোন ফাংশনে ব্যবহৃত হচ্ছে"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(c) => setForm({ ...form, is_active: c })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>বাতিল</Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                সেভ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminEnvVariables;