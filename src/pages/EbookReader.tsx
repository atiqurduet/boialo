import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft, ZoomIn, ZoomOut, Maximize, Minimize,
  ChevronLeft, ChevronRight, Loader2, BookOpen, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

const EbookReader = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchReadUrl = useCallback(async () => {
    if (!user || !slug) return;

    try {
      setLoading(true);
      setError(null);

      // Get product id from slug
      const { data: product } = await supabase
        .from("digital_products")
        .select("id, title_bn")
        .eq("slug", slug)
        .eq("product_type", "ebook")
        .single();

      if (!product) {
        setError("বইটি খুঁজে পাওয়া যায়নি");
        return;
      }

      setBookTitle(product.title_bn);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        setError("অনুগ্রহ করে লগইন করুন");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/secure-read`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ product_id: product.id }),
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        setError(errData.error || "অ্যাক্সেস পাওয়া যাচ্ছে না");
        return;
      }

      const data = await response.json();
      setPdfUrl(data.url);
    } catch {
      setError("কিছু ভুল হয়েছে");
    } finally {
      setLoading(false);
    }
  }, [user, slug]);

  useEffect(() => {
    if (!user) {
      toast.error("পড়তে হলে লগইন করুন");
      navigate(`/ebooks/${slug}`);
      return;
    }
    fetchReadUrl();
  }, [user, fetchReadUrl, navigate, slug]);

  // Refresh URL before expiry (every 12 minutes for 15-min URLs)
  useEffect(() => {
    if (!pdfUrl) return;
    const interval = setInterval(fetchReadUrl, 12 * 60 * 1000);
    return () => clearInterval(interval);
  }, [pdfUrl, fetchReadUrl]);

  // Disable right-click
  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">বই লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <Shield className="w-14 h-14 text-destructive mx-auto opacity-60" />
          <h2 className="text-xl font-bold">{error}</h2>
          <p className="text-sm text-muted-foreground">
            এই বইটি পড়তে হলে আপনাকে এটি কিনতে হবে অথবা লগইন করতে হবে।
          </p>
          <Button onClick={() => navigate(`/ebooks/${slug}`)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> বইয়ের পেজে ফিরুন
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-zinc-900 flex flex-col select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Top Bar */}
      <div className="bg-zinc-800/95 backdrop-blur border-b border-zinc-700 px-4 py-2 flex items-center justify-between z-50 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/ebooks/${slug}`)}
            className="text-zinc-300 hover:text-white hover:bg-zinc-700 gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">ফিরুন</span>
          </Button>
          <div className="hidden sm:flex items-center gap-2 text-zinc-300">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium truncate max-w-[300px]">{bookTitle}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-zinc-300 hover:text-white hover:bg-zinc-700 h-8 w-8"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 relative">
        {pdfUrl && (
          <iframe
            ref={iframeRef}
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
            className="w-full h-full absolute inset-0"
            title={bookTitle}
            sandbox="allow-scripts allow-same-origin"
            style={{ userSelect: "none" }}
          />
        )}
        {/* Overlay to prevent save-as on PDF */}
        <div className="absolute top-0 right-0 w-12 h-12 bg-transparent" />
      </div>

      {/* Security notice */}
      <div className="bg-zinc-800/80 text-center py-1.5 text-[11px] text-zinc-500 border-t border-zinc-700 shrink-0">
        <Shield className="w-3 h-3 inline mr-1 -mt-0.5" />
        সুরক্ষিত রিডার — শুধুমাত্র পড়ার জন্য
      </div>
    </div>
  );
};

export default EbookReader;
