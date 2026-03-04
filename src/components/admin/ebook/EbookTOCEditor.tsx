import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, List } from "lucide-react";

interface TOCItem {
  title: string;
  page?: number;
}

interface EbookTOCEditorProps {
  items: TOCItem[];
  onChange: (items: TOCItem[]) => void;
}

export const EbookTOCEditor = ({ items, onChange }: EbookTOCEditorProps) => {
  const [newTitle, setNewTitle] = useState("");
  const [newPage, setNewPage] = useState<number | "">("");

  const addItem = () => {
    if (!newTitle.trim()) return;
    onChange([...items, { title: newTitle.trim(), page: newPage ? Number(newPage) : undefined }]);
    setNewTitle("");
    setNewPage("");
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newItems = [...items];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    onChange(newItems);
  };

  const updateItem = (index: number, field: keyof TOCItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <List className="w-4 h-4 text-primary" />
        <Label className="font-medium">সূচিপত্র (Table of Contents)</Label>
      </div>

      {items.length > 0 && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 group">
              <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs font-mono text-muted-foreground w-6 shrink-0">{index + 1}.</span>
              <Input
                value={item.title}
                onChange={e => updateItem(index, "title", e.target.value)}
                className="h-8 text-sm flex-1"
                placeholder="অধ্যায়ের নাম"
              />
              <Input
                type="number"
                value={item.page || ""}
                onChange={e => updateItem(index, "page", Number(e.target.value))}
                className="h-8 text-sm w-20"
                placeholder="পৃষ্ঠা"
              />
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(index, "up")} disabled={index === 0}>
                  <ChevronUp className="w-3.5 h-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(index, "down")} disabled={index === items.length - 1}>
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(index)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="নতুন অধ্যায়ের নাম..."
          className="h-9 text-sm flex-1"
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
        />
        <Input
          type="number"
          value={newPage}
          onChange={e => setNewPage(e.target.value ? Number(e.target.value) : "")}
          placeholder="পৃষ্ঠা"
          className="h-9 text-sm w-20"
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
        />
        <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={!newTitle.trim()} className="h-9 gap-1">
          <Plus className="w-3.5 h-3.5" /> যোগ
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3 border border-dashed rounded-lg">
          কোনো অধ্যায় যোগ হয়নি। উপরের ফিল্ড থেকে যোগ করুন।
        </p>
      )}
    </div>
  );
};
