import { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PopupBanner {
  id: string;
  title: string;
  description: string | null;
  button_text: string | null;
  button_link: string | null;
  badge_text: string | null;
  image_url: string | null;
  background_color: string | null;
  text_color: string | null;
  popup_type: string;
  position: string | null;
  width: number | null;
  height: number | null;
  border_radius: number | null;
  padding: number | null;
  text_align: string | null;
  title_size: string | null;
  animation: string | null;
  trigger_type: string | null;
  trigger_delay: number | null;
  trigger_scroll_percent: number | null;
  show_frequency: string | null;
  show_close_button: boolean | null;
  close_on_overlay_click: boolean | null;
  auto_close_seconds: number | null;
  show_on_pages: string[] | null;
  exclude_pages: string[] | null;
  show_to_logged_in: boolean | null;
  show_to_guests: boolean | null;
  device_target: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean | null;
}

const STORAGE_KEY = 'popup_banner_dismissed';

const getDismissedMap = (): Record<string, number> => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
};

const shouldShow = (popup: PopupBanner): boolean => {
  const map = getDismissedMap();
  const ts = map[popup.id];
  if (!ts) return true;
  const freq = popup.show_frequency || 'every_visit';
  if (freq === 'once') return false;
  if (freq === 'once_per_session') return false; // handled via sessionStorage
  const now = Date.now();
  if (freq === 'once_per_day') return now - ts > 86400000;
  if (freq === 'once_per_week') return now - ts > 604800000;
  return true; // every_visit
};

const titleSizeMap: Record<string, string> = {
  sm: 'text-lg', md: 'text-xl', lg: 'text-2xl', xl: 'text-3xl', '2xl': 'text-4xl',
};

const animationMap: Record<string, string> = {
  fade: 'animate-in fade-in duration-300',
  slide_up: 'animate-in slide-in-from-bottom duration-300',
  slide_down: 'animate-in slide-in-from-top duration-300',
  slide_left: 'animate-in slide-in-from-right duration-300',
  slide_right: 'animate-in slide-in-from-left duration-300',
  zoom: 'animate-in zoom-in-95 duration-300',
  bounce: 'animate-in zoom-in-95 duration-500',
};

const positionClasses: Record<string, string> = {
  center: 'items-center justify-center',
  top: 'items-start justify-center pt-20',
  bottom: 'items-end justify-center pb-20',
  left: 'items-center justify-start pl-6',
  right: 'items-center justify-end pr-6',
  top_left: 'items-start justify-start pt-20 pl-6',
  top_right: 'items-start justify-end pt-20 pr-6',
  bottom_left: 'items-end justify-start pb-20 pl-6',
  bottom_right: 'items-end justify-end pb-20 pr-6',
};

const SinglePopup = ({ popup, onDismiss }: { popup: PopupBanner; onDismiss: () => void }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const delay = popup.trigger_type === 'after_delay' ? (popup.trigger_delay || 0) * 1000 : 0;

    if (popup.trigger_type === 'on_scroll') {
      const handler = () => {
        const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
        if (pct >= (popup.trigger_scroll_percent || 50)) {
          setVisible(true);
          window.removeEventListener('scroll', handler);
        }
      };
      window.addEventListener('scroll', handler);
      return () => window.removeEventListener('scroll', handler);
    }

    if (popup.trigger_type === 'on_exit') {
      const handler = (e: MouseEvent) => {
        if (e.clientY <= 0) { setVisible(true); document.removeEventListener('mouseout', handler); }
      };
      document.addEventListener('mouseout', handler);
      return () => document.removeEventListener('mouseout', handler);
    }

    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [popup]);

  useEffect(() => {
    if (visible && popup.auto_close_seconds) {
      const t = setTimeout(onDismiss, popup.auto_close_seconds * 1000);
      return () => clearTimeout(t);
    }
  }, [visible, popup.auto_close_seconds, onDismiss]);

  if (!visible) return null;

  const isBar = popup.popup_type === 'top_bar' || popup.popup_type === 'bottom_bar';
  const isFullscreen = popup.popup_type === 'fullscreen';
  const anim = animationMap[popup.animation || 'fade'] || animationMap.fade;
  const pos = positionClasses[popup.position || 'center'] || positionClasses.center;

  const contentStyle: React.CSSProperties = {
    backgroundColor: popup.background_color || '#ffffff',
    color: popup.text_color || '#000000',
    borderRadius: isBar ? 0 : `${popup.border_radius ?? 16}px`,
    padding: `${popup.padding ?? 32}px`,
    maxWidth: isBar || isFullscreen ? '100%' : `${popup.width || 500}px`,
    width: isBar ? '100%' : undefined,
    minHeight: popup.height ? `${popup.height}px` : undefined,
    textAlign: (popup.text_align || 'center') as React.CSSProperties['textAlign'],
  };

  const handleOverlayClick = () => {
    if (popup.close_on_overlay_click !== false) onDismiss();
  };

  // Top/Bottom bar rendering
  if (isBar) {
    return (
      <div className={cn('fixed left-0 right-0 z-[9999] shadow-lg', anim, popup.popup_type === 'top_bar' ? 'top-0' : 'bottom-0')} style={contentStyle}>
        <div className="container mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {popup.image_url && <img src={popup.image_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />}
            <div className="min-w-0">
              {popup.title && <p className={cn('font-bold', titleSizeMap[popup.title_size || 'md'] || 'text-lg')}>{popup.title}</p>}
              {popup.description && <p className="text-sm opacity-80 truncate">{popup.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {popup.button_text && popup.button_link && (
              <Link to={popup.button_link} onClick={onDismiss} className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">{popup.button_text}</Link>
            )}
            {popup.show_close_button !== false && (
              <button onClick={onDismiss} className="p-1 rounded-full hover:bg-black/10 transition-colors"><X className="h-4 w-4" /></button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Modal / Fullscreen / Slide-in
  return (
    <div className={cn('fixed inset-0 z-[9999] flex', pos)} onClick={handleOverlayClick}>
      <div className="absolute inset-0 bg-black/50" />
      <div className={cn('relative z-10', anim, isFullscreen && 'w-full h-full')} style={isFullscreen ? { ...contentStyle, borderRadius: 0, width: '100%', height: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' } : contentStyle} onClick={e => e.stopPropagation()}>
        {popup.show_close_button !== false && (
          <button onClick={onDismiss} className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-black/10 transition-colors z-20"><X className="h-5 w-5" /></button>
        )}
        {popup.image_url && (
          <img src={popup.image_url} alt="" className="w-full max-h-48 object-cover rounded-lg mb-4" style={{ borderRadius: `${Math.max((popup.border_radius ?? 16) - 8, 0)}px` }} />
        )}
        {popup.badge_text && (
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary mb-3">{popup.badge_text}</span>
        )}
        {popup.title && <h2 className={cn('font-bold mb-2', titleSizeMap[popup.title_size || 'lg'])}>{popup.title}</h2>}
        {popup.description && <p className="opacity-80 mb-4">{popup.description}</p>}
        {popup.button_text && popup.button_link && (
          <Link to={popup.button_link} onClick={onDismiss} className="inline-block px-6 py-2.5 rounded-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">{popup.button_text}</Link>
        )}
      </div>
    </div>
  );
};

export const PopupBannerRenderer = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const isAdmin = location.pathname.startsWith('/admin');

  const { data: popups = [] } = useQuery({
    queryKey: ['active-popup-banners'],
    queryFn: async () => {
      const { data } = await supabase
        .from('popup_banners')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      return (data || []) as PopupBanner[];
    },
    staleTime: 60000,
    enabled: !isAdmin,
  });

  const now = new Date();
  const filtered = popups.filter(p => {
    if (dismissed.has(p.id)) return false;
    if (!shouldShow(p)) return false;

    // Session check
    if (p.show_frequency === 'once_per_session') {
      if (sessionStorage.getItem(`popup_${p.id}`)) return false;
    }

    // Date range
    if (p.start_date && new Date(p.start_date) > now) return false;
    if (p.end_date && new Date(p.end_date) < now) return false;

    // Auth targeting
    if (!p.show_to_guests && !user) return false;
    if (!p.show_to_logged_in && user) return false;

    // Page targeting
    const pages = p.show_on_pages?.filter(Boolean) || [];
    if (pages.length > 0 && !pages.includes(location.pathname)) return false;
    const excl = p.exclude_pages?.filter(Boolean) || [];
    if (excl.includes(location.pathname)) return false;

    // Device (basic)
    if (p.device_target === 'mobile' && window.innerWidth > 768) return false;
    if (p.device_target === 'desktop' && window.innerWidth <= 768) return false;
    if (p.device_target === 'tablet' && (window.innerWidth <= 768 || window.innerWidth > 1024)) return false;

    return true;
  });

  const handleDismiss = useCallback((id: string, freq: string | null) => {
    setDismissed(prev => new Set(prev).add(id));
    const map = getDismissedMap();
    map[id] = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    if (freq === 'once_per_session') sessionStorage.setItem(`popup_${id}`, '1');
  }, []);

  if (isAdmin || filtered.length === 0) return null;

  return (
    <>
      {filtered.map(p => (
        <SinglePopup key={p.id} popup={p} onDismiss={() => handleDismiss(p.id, p.show_frequency)} />
      ))}
    </>
  );
};
