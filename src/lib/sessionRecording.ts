// Session Recording - Lightweight mouse/scroll/click event recorder
// Captures user interactions for replay in admin dashboard

import { supabase } from '@/integrations/supabase/client';

interface RecordingEvent {
  t: number; // timestamp offset from start
  type: 'mouse' | 'scroll' | 'click' | 'resize' | 'input' | 'navigate';
  x?: number;
  y?: number;
  scrollY?: number;
  el?: string;
  value?: string;
  w?: number;
  h?: number;
  path?: string;
}

const MAX_EVENTS = 500;
const MOUSE_SAMPLE_INTERVAL = 200; // ms between mouse samples
const FLUSH_INTERVAL = 30_000; // flush every 30s

let recording = false;
let events: RecordingEvent[] = [];
let startTime = 0;
let lastMouseSample = 0;
let sessionId = '';
let fingerprintId = '';
let flushTimer: ReturnType<typeof setInterval> | null = null;

const getSessionId = () => {
  let sid = sessionStorage.getItem('v_sid');
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem('v_sid', sid);
  }
  return sid;
};

const getElementSelector = (el: HTMLElement): string => {
  if (el.id) return `#${el.id}`;
  let selector = el.tagName.toLowerCase();
  if (el.className && typeof el.className === 'string') {
    const cls = el.className.split(' ').filter(c => c && !c.startsWith('__')).slice(0, 2).join('.');
    if (cls) selector += '.' + cls;
  }
  return selector;
};

const addEvent = (evt: RecordingEvent) => {
  if (events.length >= MAX_EVENTS) {
    flushRecording();
  }
  events.push(evt);
};

const flushRecording = async () => {
  if (events.length === 0) return;

  const batch = events.splice(0);
  const duration = batch.length > 0 ? Math.round((batch[batch.length - 1].t) / 1000) : 0;
  const hasRageClicks = batch.filter(e => e.type === 'click').length > 15;
  const hasErrors = false;

  try {
    await supabase.from('session_recordings').insert({
      session_id: sessionId,
      fingerprint_id: fingerprintId,
      page_path: window.location.pathname,
      duration_seconds: duration,
      events_count: batch.length,
      recording_data: batch as any,
      device_type: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
      browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Other',
      os: navigator.userAgent.includes('Windows') ? 'Windows' : navigator.userAgent.includes('Mac') ? 'macOS' : 'Other',
      screen_resolution: `${screen.width}x${screen.height}`,
      has_rage_clicks: hasRageClicks,
      has_dead_clicks: false,
      has_errors: hasErrors,
    });
  } catch (e) {
    console.debug('Session recording flush failed:', e);
  }
};

export const startSessionRecording = (fpId?: string) => {
  if (recording || typeof window === 'undefined') return;
  recording = true;
  startTime = Date.now();
  events = [];
  sessionId = getSessionId();
  fingerprintId = fpId || '';

  // Mouse movement (sampled)
  const mouseHandler = (e: MouseEvent) => {
    const now = Date.now();
    if (now - lastMouseSample < MOUSE_SAMPLE_INTERVAL) return;
    lastMouseSample = now;
    addEvent({
      t: now - startTime,
      type: 'mouse',
      x: Math.round((e.clientX / window.innerWidth) * 1000) / 10,
      y: Math.round((e.clientY / window.innerHeight) * 1000) / 10,
    });
  };

  // Click
  const clickHandler = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    addEvent({
      t: Date.now() - startTime,
      type: 'click',
      x: Math.round((e.clientX / window.innerWidth) * 1000) / 10,
      y: Math.round((e.clientY / window.innerHeight) * 1000) / 10,
      el: getElementSelector(target),
    });
  };

  // Scroll
  let scrollDebounce: ReturnType<typeof setTimeout>;
  const scrollHandler = () => {
    clearTimeout(scrollDebounce);
    scrollDebounce = setTimeout(() => {
      addEvent({
        t: Date.now() - startTime,
        type: 'scroll',
        scrollY: Math.round(window.scrollY),
      });
    }, 100);
  };

  // Resize
  const resizeHandler = () => {
    addEvent({
      t: Date.now() - startTime,
      type: 'resize',
      w: window.innerWidth,
      h: window.innerHeight,
    });
  };

  document.addEventListener('mousemove', mouseHandler, { passive: true });
  document.addEventListener('click', clickHandler, { passive: true });
  window.addEventListener('scroll', scrollHandler, { passive: true });
  window.addEventListener('resize', resizeHandler, { passive: true });

  // Periodic flush
  flushTimer = setInterval(flushRecording, FLUSH_INTERVAL);

  // Flush on page hide
  const unloadHandler = () => {
    flushRecording();
    recording = false;
    document.removeEventListener('mousemove', mouseHandler);
    document.removeEventListener('click', clickHandler);
    window.removeEventListener('scroll', scrollHandler);
    window.removeEventListener('resize', resizeHandler);
    if (flushTimer) clearInterval(flushTimer);
  };

  window.addEventListener('pagehide', unloadHandler, { once: true });
  window.addEventListener('beforeunload', unloadHandler, { once: true });
};

export const stopSessionRecording = () => {
  if (!recording) return;
  flushRecording();
  recording = false;
  if (flushTimer) clearInterval(flushTimer);
};
