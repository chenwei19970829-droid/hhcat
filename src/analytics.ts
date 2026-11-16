// Safe analytics & retargeting event dispatcher (Google Ads / GA4 / Meta Pixel)
// Safely fires events only when tracking tags are loaded in the browser

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export const trackEvent = (eventName: string, params?: Record<string, unknown>) => {
  if (typeof window === 'undefined') return;
  try {
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: eventName, ...params });
    }
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params || {});
    }
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', eventName, params || {});
    }
  } catch {
    // Non-blocking fallback
  }
};
