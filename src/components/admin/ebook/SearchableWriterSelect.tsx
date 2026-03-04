import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, X, User } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Writer {
  id: string;
  name_bn: string;
  name_en?: string;
}

interface SearchableWriterSelectProps {
  label: string;
  writers: Writer[];
  selectedId: string;
  onSelect: (id: string, name: string) => void;
  placeholder?: string;
}

export const SearchableWriterSelect = ({ label, writers, selectedId, onSelect, placeholder = "খুঁজুন..." }: SearchableWriterSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return writers;
    const q = search.toLowerCase();
    return writers.filter(w => 
      w.name_bn.toLowerCase().includes(q) || 
      (w.name_en && w.name_en.toLowerCase().includes(q))
    );
  }, [writers, search]);

  const selectedWriter = writers.find(w => w.id === selectedId && selectedId !== "none");
  const displayName = selectedWriter ? `${selectedWriter.name_bn}${selectedWriter.name_en ? ` (${selectedWriter.name_en})` : ""}` : "";

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between h-10 font-normal text-sm"
          >
            <span className={`truncate ${!displayName ? "text-muted-foreground" : ""}`}>
              {displayName || "নির্বাচন করুন"}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {selectedWriter && (
                <span
                  role="button"
                  className="p-0.5 rounded hover:bg-muted"
                  onClick={e => { e.stopPropagation(); onSelect("none", ""); }}
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </span>
              )}
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                className="h-8 text-sm pl-8"
                placeholder={placeholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <ScrollArea className="max-h-[240px]">
            <div className="p-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">কোনো ফলাফল নেই</p>
              ) : (
                filtered.map(w => (
                  <button
                    key={w.id}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedId === w.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                    }`}
                    onClick={() => { onSelect(w.id, w.name_bn); setOpen(false); setSearch(""); }}
                  >
                    <span>{w.name_bn}</span>
                    {w.name_en && <span className="text-xs text-muted-foreground ml-1.5">({w.name_en})</span>}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
};
