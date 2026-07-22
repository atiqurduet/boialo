import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon } from "lucide-react";
import MediaLibraryModal from "./MediaLibraryModal";

interface Props {
  onSelect: (urls: string[]) => void;
  multiple?: boolean;
  defaultFolder?: string;
  accept?: "image" | "pdf" | "all";
  label?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function MediaPickerButton({
  onSelect,
  multiple = false,
  defaultFolder = "products",
  accept = "image",
  label = "লাইব্রেরি থেকে নিন",
  variant = "outline",
  size = "default",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant={variant} size={size} onClick={() => setOpen(true)} className={className}>
        <ImageIcon className="h-4 w-4 mr-2" />
        {label}
      </Button>
      <MediaLibraryModal
        open={open}
        onOpenChange={setOpen}
        onSelect={onSelect}
        multiple={multiple}
        defaultFolder={defaultFolder}
        accept={accept}
      />
    </>
  );
}

export default MediaPickerButton;
