import { useState } from "react";
import { LogoUpload } from "@/components/admin/LogoUpload";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, Search, Star, ExternalLink, Copy } from "lucide-react";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { SafeHTML } from "@/components/SafeHTML";

const AdminBlog = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [form, setForm] = useState({
    title_bn: "",
    title_en: "",
    slug: "",
    excerpt_bn: "",
    content_bn: "",
    featured_image: "",
    category: "general",
    tags: "",
    status: "draft",
    meta_title: "",
    meta_description: "",
    is_featured: false,
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const filteredPosts = posts.filter((post: any) => {
    const matchSearch =
      !searchQuery ||
      post.title_bn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.title_en?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "all" || post.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
        published_at: data.status === "published" ? new Date().toISOString() : null,
      };

      if (editingPost) {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", editingPost.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_posts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      setDialogOpen(false);
      resetForm();
      toast.success(editingPost ? "পোস্ট আপডেট হয়েছে" : "পোস্ট তৈরি হয়েছে");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success("পোস্ট মুছে ফেলা হয়েছে");
    },
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ id, is_featured }: { id: string; is_featured: boolean }) => {
      const { error } = await supabase.from("blog_posts").update({ is_featured }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    },
  });

  const duplicatePost = async (post: any) => {
    const { id, created_at, updated_at, view_count, published_at, ...rest } = post;
    const { error } = await supabase.from("blog_posts").insert({
      ...rest,
      title_bn: `${rest.title_bn} (কপি)`,
      slug: `${rest.slug}-copy-${Date.now()}`,
      status: "draft",
      is_featured: false,
    });
    if (error) toast.error(error.message);
    else {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success("পোস্ট ডুপ্লিকেট হয়েছে");
    }
  };

  const resetForm = () => {
    setEditingPost(null);
    setForm({
      title_bn: "", title_en: "", slug: "", excerpt_bn: "", content_bn: "",
      featured_image: "", category: "general", tags: "", status: "draft",
      meta_title: "", meta_description: "", is_featured: false,
    });
  };

  const openEdit = (post: any) => {
    setEditingPost(post);
    setForm({
      title_bn: post.title_bn || "",
      title_en: post.title_en || "",
      slug: post.slug || "",
      excerpt_bn: post.excerpt_bn || "",
      content_bn: post.content_bn || "",
      featured_image: post.featured_image || "",
      category: post.category || "general",
      tags: post.tags?.join(", ") || "",
      status: post.status || "draft",
      meta_title: post.meta_title || "",
      meta_description: post.meta_description || "",
      is_featured: post.is_featured || false,
    });
    setDialogOpen(true);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s\u0980-\u09FF-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const publishedCount = posts.filter((p: any) => p.status === "published").length;
  const draftCount = posts.filter((p: any) => p.status === "draft").length;
  const totalViews = posts.reduce((sum: number, p: any) => sum + (p.view_count || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">ব্লগ ম্যানেজমেন্ট</h1>
            <p className="text-sm text-muted-foreground mt-1">
              মোট {posts.length} পোস্ট · {publishedCount} প্রকাশিত · {draftCount} ড্রাফট · {totalViews} ভিউ
            </p>
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> নতুন পোস্ট
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="পোস্ট খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="স্ট্যাটাস" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সকল স্ট্যাটাস</SelectItem>
              <SelectItem value="published">প্রকাশিত</SelectItem>
              <SelectItem value="draft">ড্রাফট</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl shadow-sm border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>শিরোনাম</TableHead>
                <TableHead>ক্যাটাগরি</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
                <TableHead>ফিচার্ড</TableHead>
                <TableHead>ভিউ</TableHead>
                <TableHead>তারিখ</TableHead>
                <TableHead className="text-right">অ্যাকশন</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPosts.map((post: any) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {post.featured_image && (
                        <img src={post.featured_image} alt="" className="w-10 h-10 rounded object-cover" />
                      )}
                      <div>
                        <p className="font-medium line-clamp-1">{post.title_bn}</p>
                        {post.title_en && <p className="text-xs text-muted-foreground line-clamp-1">{post.title_en}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{post.category || "—"}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={post.status === "published" ? "default" : "secondary"}>
                      {post.status === "published" ? "প্রকাশিত" : "ড্রাফট"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={post.is_featured || false}
                      onCheckedChange={(v) => toggleFeatured.mutate({ id: post.id, is_featured: v })}
                    />
                  </TableCell>
                  <TableCell>{post.view_count || 0}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {post.published_at
                      ? format(new Date(post.published_at), "d MMM yyyy", { locale: bn })
                      : format(new Date(post.created_at), "d MMM yyyy", { locale: bn })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {post.status === "published" && (
                        <Button size="icon" variant="ghost" asChild>
                          <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => {
                        setPreviewContent(post.content_bn || "");
                        setPreviewOpen(true);
                      }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => duplicatePost(post)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(post)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => { if (confirm("মুছে ফেলতে চান?")) deleteMutation.mutate(post.id); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredPosts.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    কোনো পোস্ট নেই
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? "পোস্ট সম্পাদনা" : "নতুন পোস্ট"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }}
            className="space-y-4"
          >
            <Tabs defaultValue="content">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="content">কনটেন্ট</TabsTrigger>
                <TabsTrigger value="media">মিডিয়া ও ক্যাটাগরি</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>শিরোনাম (বাংলা) *</Label>
                    <Input
                      value={form.title_bn}
                      onChange={(e) => setForm({ ...form, title_bn: e.target.value, slug: generateSlug(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Title (English)</Label>
                    <Input value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                </div>
                <div>
                  <Label>সংক্ষিপ্ত বিবরণ (Excerpt)</Label>
                  <Textarea
                    value={form.excerpt_bn}
                    onChange={(e) => setForm({ ...form, excerpt_bn: e.target.value })}
                    rows={2}
                    placeholder="পোস্টের সংক্ষিপ্ত বিবরণ লিখুন..."
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>কনটেন্ট (HTML)</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={() => {
                      setPreviewContent(form.content_bn);
                      setPreviewOpen(true);
                    }}>
                      <Eye className="w-3.5 h-3.5 mr-1" /> প্রিভিউ
                    </Button>
                  </div>
                  <Textarea
                    value={form.content_bn}
                    onChange={(e) => setForm({ ...form, content_bn: e.target.value })}
                    rows={14}
                    className="font-mono text-sm"
                    placeholder="<h2>শিরোনাম</h2><p>আপনার কনটেন্ট এখানে লিখুন...</p>"
                  />
                </div>
              </TabsContent>

              <TabsContent value="media" className="space-y-4 mt-4">
                <div>
                  <Label>ফিচার ইমেজ</Label>
                  <LogoUpload
                    value={form.featured_image}
                    onChange={(url) => setForm({ ...form, featured_image: url })}
                    label="ফিচার ইমেজ"
                    folder="blog"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>ক্যাটাগরি</Label>
                    <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                  </div>
                  <div>
                    <Label>স্ট্যাটাস</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">ড্রাফট</SelectItem>
                        <SelectItem value="published">প্রকাশিত</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>ট্যাগ (কমা দিয়ে আলাদা)</Label>
                  <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="বই, রিভিউ, সাহিত্য" />
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.is_featured}
                    onCheckedChange={(v) => setForm({ ...form, is_featured: v })}
                  />
                  <Label className="flex items-center gap-1">
                    <Star className="w-4 h-4" /> ফিচার্ড পোস্ট
                  </Label>
                </div>
              </TabsContent>

              <TabsContent value="seo" className="space-y-4 mt-4">
                <div>
                  <Label>Meta Title</Label>
                  <Input
                    value={form.meta_title}
                    onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
                    placeholder={form.title_bn}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{form.meta_title?.length || 0}/60 অক্ষর</p>
                </div>
                <div>
                  <Label>Meta Description</Label>
                  <Textarea
                    value={form.meta_description}
                    onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
                    rows={2}
                    placeholder={form.excerpt_bn}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{form.meta_description?.length || 0}/160 অক্ষর</p>
                </div>
                {/* SEO Preview */}
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">Google প্রিভিউ</p>
                  <p className="text-primary text-base font-medium line-clamp-1">
                    {form.meta_title || form.title_bn || "পোস্ট শিরোনাম"}
                  </p>
                  <p className="text-primary/70 text-xs">boialo.lovable.app/blog/{form.slug || "..."}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {form.meta_description || form.excerpt_bn || "পোস্টের বিবরণ এখানে দেখা যাবে..."}
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                বাতিল
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>কনটেন্ট প্রিভিউ</DialogTitle>
          </DialogHeader>
          <SafeHTML html={previewContent} className="prose prose-lg max-w-none text-foreground" allowRich={true} />
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminBlog;
