// Network & API Performance Monitoring
// Tracks API response times, error rates, slow queries, and connection quality
import { serverTrack } from './serverTracking';

interface APIMetrics {
  url: string;
  method: string;
  status: number;
  duration: number;
  size: number;
  timestamp: number;
  isError: boolean;
  errorMessage?: string;
}

const metrics: APIMetrics[] = [];
const REPORT_INTERVAL = 60_000; // Report every 60s
const MAX_METRICS = 100;
let reportTimer: ReturnType<typeof setInterval> | null = null;

// Monkey-patch fetch to intercept API calls
export const startNetworkMonitoring = () => {
  if (typeof window === 'undefined') return;

  const originalFetch = window.fetch;

  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const startTime = performance.now();
    const request = args[0];
    const url = typeof request === 'string' ? request : (request as Request).url;
    const method = (args[1]?.method || 'GET').toUpperCase();

    // Skip monitoring our own tracking calls
    if (url.includes('/server-track') || url.includes('/v1/rest/')) {
      return originalFetch.apply(this, args);
    }

    try {
      const response = await originalFetch.apply(this, args);
      const duration = Math.round(performance.now() - startTime);

      const metric: APIMetrics = {
        url: sanitizeUrl(url),
        method,
        status: response.status,
        duration,
        size: parseInt(response.headers.get('content-length') || '0', 10),
        timestamp: Date.now(),
        isError: !response.ok,
      };

      recordMetric(metric);

      // Alert on slow APIs (>3s)
      if (duration > 3000) {
        serverTrack('SlowAPI', {
          url: metric.url,
          method,
          duration,
          status: response.status,
        });
      }

      return response;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      
      recordMetric({
        url: sanitizeUrl(url),
        method,
        status: 0,
        duration,
        size: 0,
        timestamp: Date.now(),
        isError: true,
        errorMessage: (error as Error).message,
      });

      serverTrack('NetworkError', {
        url: sanitizeUrl(url),
        method,
        error: (error as Error).message,
        duration,
      });

      throw error;
    }
  };

  // Monitor connection quality changes
  const conn = (navigator as any).connection;
  if (conn) {
    conn.addEventListener('change', () => {
      serverTrack('ConnectionChange', {
        effectiveType: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt,
        saveData: conn.saveData,
      });
    });
  }

  // Monitor online/offline status
  window.addEventListener('online', () => serverTrack('NetworkStatus', { online: true }));
  window.addEventListener('offline', () => serverTrack('NetworkStatus', { online: false }));

  // Periodic reporting
  reportTimer = setInterval(reportMetrics, REPORT_INTERVAL);

  // Resource loading performance
  trackResourcePerformance();
};

const sanitizeUrl = (url: string): string => {
  try {
    const u = new URL(url, window.location.origin);
    // Remove sensitive params
    u.searchParams.delete('apikey');
    u.searchParams.delete('token');
    u.searchParams.delete('key');
    // Truncate path UUIDs
    return u.pathname.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, ':id');
  } catch { return url.split('?')[0]; }
};

const recordMetric = (metric: APIMetrics) => {
  metrics.push(metric);
  if (metrics.length > MAX_METRICS) metrics.shift();
};

const reportMetrics = () => {
  if (metrics.length === 0) return;

  const batch = metrics.splice(0);
  const totalRequests = batch.length;
  const errors = batch.filter(m => m.isError).length;
  const avgDuration = Math.round(batch.reduce((sum, m) => sum + m.duration, 0) / totalRequests);
  const p95Duration = batch
    .map(m => m.duration)
    .sort((a, b) => a - b)[Math.floor(totalRequests * 0.95)] || 0;
  const slowRequests = batch.filter(m => m.duration > 2000).length;

  // Group by endpoint
  const endpoints = new Map<string, { count: number; errors: number; avgDuration: number }>();
  batch.forEach(m => {
    const key = `${m.method} ${m.url}`;
    const existing = endpoints.get(key) || { count: 0, errors: 0, avgDuration: 0 };
    existing.count++;
    if (m.isError) existing.errors++;
    existing.avgDuration = Math.round(
      (existing.avgDuration * (existing.count - 1) + m.duration) / existing.count
    );
    endpoints.set(key, existing);
  });

  serverTrack('NetworkReport', {
    total_requests: totalRequests,
    error_count: errors,
    error_rate: Math.round((errors / totalRequests) * 100),
    avg_duration_ms: avgDuration,
    p95_duration_ms: p95Duration,
    slow_requests: slowRequests,
    top_endpoints: Array.from(endpoints.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([endpoint, stats]) => ({ endpoint, ...stats })),
    connection: (navigator as any).connection?.effectiveType || 'unknown',
  });
};

// Track resource loading (images, scripts, stylesheets)
const trackResourcePerformance = () => {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceResourceTiming[];
      const slowResources = entries.filter(e => e.duration > 2000);

      if (slowResources.length > 0) {
        serverTrack('SlowResources', {
          resources: slowResources.map(r => ({
            name: r.name.split('/').pop()?.split('?')[0],
            type: r.initiatorType,
            duration: Math.round(r.duration),
            size: r.transferSize,
          })),
        });
      }
    });
    observer.observe({ type: 'resource', buffered: false });
  } catch {}
};

// Get current network stats (for admin)
export const getNetworkStats = () => ({
  totalTracked: metrics.length,
  connection: (navigator as any).connection?.effectiveType || 'unknown',
  online: navigator.onLine,
});

export const stopNetworkMonitoring = () => {
  if (reportTimer) clearInterval(reportTimer);
  reportMetrics(); // Flush remaining
};
