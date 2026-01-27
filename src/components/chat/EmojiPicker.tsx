import { useState, useRef, useEffect } from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

const EmojiPicker = ({ onEmojiSelect }: EmojiPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (emoji: any) => {
    onEmojiSelect(emoji.native);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={pickerRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 h-8 w-8"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Smile className="h-4 w-4" />
      </Button>
      {isOpen && (
        <div className="absolute bottom-12 left-0 z-50">
          <Picker
            data={data}
            onEmojiSelect={handleSelect}
            theme="light"
            previewPosition="none"
            skinTonePosition="none"
            maxFrequentRows={2}
            perLine={7}
          />
        </div>
      )}
    </div>
  );
};

export default EmojiPicker;
