import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { uploadMediaFile, deleteMediaFile, MEDIA_FOLDERS } from "@/lib/mediaClient";
import { toast } from "sonner";
import { Upload, Trash2, Check, Loader2, Search, FileText, Image as ImageIcon } from "lucide-react";

export interface MediaLibraryItem {
  id: string;
  url: string;
  thumbnail_url: string | null;
  filename: string;
  original_filename: string | null;
  folder: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (urls: string[]) => void;
  multiple?: boolean;
  defaultFolder?: string;
  accept?: "image" | "pdf" | "all";
}

export default function MediaLibraryModal({
  open,
  onOpenChange,
  onSelect,
  multiple = false,
  defaultFolder = "products",
  accept = "image",
}: Props) {
  const [items, setItems] = useState<MediaLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [folder, setFolder] = useState(defaultFolder);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const acceptAttr = accept === "pdf" ? "application/pdf" : accept === "all" ? "image/*,application/pdf" : "image/*";

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("media_library").select("*").order("created_at", { ascending: false }).limit(200);
    if (folder !== "all") q = q.eq("folder", folder);
    if (accept === "image") q = q.like("mime_type", "image/%");
    if (accept === "pdf") q = q.eq("mime_type", "application/pdf");
    const { data } = await q;
    setItems((data as MediaLibraryItem[]) || []);
    setLoading(false);
  }, [folder, accept]);

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      load();
    }
  }, [open, load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.filename.toLowerCase().includes(q) ||
        i.original_filename?.toLowerCase().includes(q),
    );
  }, [items, search]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });
    let ok = 0, fail = 0;
    for (let i = 0; i < files.length; i++) {
      try {
        await uploadMediaFile(files[i], folder === "all" ? "general" : folder);
        ok++;
      } catch (e: any) {
        fail++;
        console.error("upload err", e);
        toast.error(`${files[i].name}: ${e.message || "Upload failed"}`);
      }
      setUploadProgress({ done: i + 1, total: files.length });
    }
    setUploading(false);
    if (ok) toast.success(`${ok}টি ফাইল আপলোড সফল`);
    if (fileRef.current) fileRef.current.value = "";
    load();
  };

  const toggleSelect = (url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else {
        if (!multiple) next.clear();
        next.add(url);
      }
      return next;
    });
  };

  const handleDelete = async (item: MediaLibraryItem) => {
    if (!confirm(`"${item.original_filename || item.filename}" ডিলিট করবেন?`)) return;
    try {
      await deleteMediaFile({ id: item.id, url: item.url, folder: item.folder, filename: item.filename });
      toast.success("ডিলিট হয়েছে");
      load();
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    }
  };

  const handleConfirm = () => {
    onSelect(Array.from(selected));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>মিডিয়া লাইব্রেরি</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 items-center border-b pb-3">
          <Select value={folder} onValueChange={setFolder}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব ফোল্ডার</SelectItem>
              {MEDIA_FOLDERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="সার্চ..." className="pl-8" />
          </div>

          <input
            ref={fileRef}
            type="file"
            accept={acceptAttr}
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{uploadProgress.done}/{uploadProgress.total}</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" />আপলোড</>
            )}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-3">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-16">
              কোনো মিডিয়া পাওয়া যায়নি — উপরের আপলোড বাটন দিয়ে যোগ করুন
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {filtered.map((item) => {
                const isSelected = selected.has(item.url);
                const isPdf = item.mime_type === "application/pdf";
                return (
                  <div
                    key={item.id}
                    className={`relative group border-2 rounded-md overflow-hidden cursor-pointer transition-all ${isSelected ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/50"}`}
                    onClick={() => toggleSelect(item.url)}
                  >
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      {isPdf ? (
                        <div className="flex flex-col items-center gap-1 p-2 text-center">
                          <FileText className="h-10 w-10 text-red-500" />
                          <span className="text-[10px] break-all line-clamp-2">{item.original_filename || item.filename}</span>
                        </div>
                      ) : (
                        <img
                          src={item.thumbnail_url || item.url}
                          alt={item.original_filename || item.filename}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </div>
                    {isSelected && (
                      <div className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3">
          <div className="flex-1 text-sm text-muted-foreground self-center">
            {selected.size > 0 && `${selected.size}টি সিলেক্টেড`}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={handleConfirm} disabled={selected.size === 0}>
            <ImageIcon className="h-4 w-4 mr-2" />
            {multiple ? "সিলেক্ট করুন" : "ব্যবহার করুন"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
