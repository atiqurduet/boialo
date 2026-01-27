import { X, FileText, Image } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StagedAttachmentProps {
  file: File;
  previewUrl?: string;
  onRemove: () => void;
}

const StagedAttachment = ({ file, previewUrl, onRemove }: StagedAttachmentProps) => {
  const isImage = file.type.startsWith("image/");

  return (
    <div className="relative inline-flex items-center gap-2 bg-muted rounded-lg p-2 pr-8 max-w-[200px]">
      {isImage && previewUrl ? (
        <img
          src={previewUrl}
          alt={file.name}
          className="h-10 w-10 rounded object-cover"
        />
      ) : (
        <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
          <FileText className="h-5 w-5 text-primary" />
        </div>
      )}
      <span className="text-xs truncate max-w-[100px]">{file.name}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default StagedAttachment;
