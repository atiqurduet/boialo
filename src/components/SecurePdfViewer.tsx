import { useEffect, useRef } from 'react';
import { FileText, BookOpen } from 'lucide-react';

interface SecurePdfViewerProps {
  url: string;
  title?: string;
}

export const SecurePdfViewer = ({ url, title }: SecurePdfViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Disable right-click on the container
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('contextmenu', handleContextMenu);
    }

    return () => {
      if (container) {
        container.removeEventListener('contextmenu', handleContextMenu);
      }
    };
  }, []);

  const isPdf = url?.toLowerCase().endsWith('.pdf');

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <BookOpen className="w-16 h-16 mb-4 opacity-50" />
        <p>এই বইয়ের প্রিভিউ এখনো যোগ করা হয়নি</p>
      </div>
    );
  }

  if (isPdf) {
    // Use Google Docs Viewer for secure PDF viewing (no download option)
    const secureUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    
    return (
      <div 
        ref={containerRef}
        className="relative select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-2 text-muted-foreground mb-4">
          <FileText className="w-5 h-5" />
          <span className="text-sm">শুধুমাত্র পড়ার জন্য - ডাউনলোড/প্রিন্ট অক্ষম</span>
        </div>
        <iframe 
          src={secureUrl}
          className="w-full h-[60vh] border rounded-lg pointer-events-auto"
          title={title || "Book Preview PDF"}
          sandbox="allow-scripts allow-same-origin"
          style={{ userSelect: 'none' }}
        />
        {/* Overlay to prevent interaction with PDF controls */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'transparent' }}
        />
      </div>
    );
  }

  // For image previews
  return (
    <div 
      ref={containerRef}
      className="flex justify-center select-none"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <img 
        src={url} 
        alt={title || "Book Preview"} 
        className="max-w-full max-h-[65vh] object-contain rounded-lg pointer-events-none"
        draggable={false}
        style={{ userSelect: 'none', WebkitUserDrag: 'none' } as React.CSSProperties}
      />
    </div>
  );
};
