import { doc, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { isStoreOwnerLoggedIn } from './adminAuth';

// Safe analytics & retargeting event dispatcher (Google Ads / GA4 / Meta Pixel + Firestore Owner Analytics)

declare global {
  interface Window {
    dataLayer?: Array<unknown>;
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export type DailyMetricField =
  | 'uniqueVisitors'
  | 'pageViews'
  | 'productPageViews'
  | 'showroomPageViews'
  | 'craftGuideViews'
  | 'estimatorUsers'
  | 'estimatorSessions'
  | 'estimatorActions'
  | 'estimatorCopies'
  | 'lineQuotes'
  | 'phoneClicks'
  | 'qrOpens'
  | 'deviceMobile'
  | 'deviceDesktop'
  | 'srcSearch'
  | 'srcSocial'
  | 'srcDirect';

export type MetricIncrements = Partial<Record<DailyMetricField, number>>;

const VISIT_STORAGE_KEYS = {
  day: 'hhcat_last_visit_day_v1',
  week: 'hhcat_last_visit_week_v1',
  month: 'hhcat_last_visit_month_v1',
  year: 'hhcat_last_visit_year_v1',
} as const;

const EST_USER_STORAGE_KEYS = {
  day: 'hhcat_last_est_day_v1',
  week: 'hhcat_last_est_week_v1',
  month: 'hhcat_last_est_month_v1',
  year: 'hhcat_last_est_year_v1',
} as const;

const ESTIMATOR_SESSION_KEY = 'hhcat_est_session_day_v1';

let lastPageVisitKey = '';
let lastPageVisitTs = 0;
let hasRecordedInitialPage = false;
let lastModelViewKey = '';
let lastModelViewTs = 0;
let lastLineTrackTs = 0;

export const getTaiwanDateKey = (date: Date = new Date()): string => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    const taipeiTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return taipeiTime.toISOString().slice(0, 10);
  }
};

export const getTaiwanWeekMondayKey = (dateKey: string = getTaiwanDateKey()): string => {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1));
  const day = dt.getUTCDay(); // 0=Sun..6=Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  dt.setUTCDate(dt.getUTCDate() + diffToMon);
  return dt.toISOString().slice(0, 10);
};

export const getTaiwanMonthKey = (dateKey: string = getTaiwanDateKey()): string => {
  return dateKey.slice(0, 7);
};

export const getTaiwanYearKey = (dateKey: string = getTaiwanDateKey()): string => {
  return dateKey.slice(0, 4);
};

const isCrawlerOrBot = (): boolean => {
  if (typeof navigator === 'undefined') return true;
  if (navigator.webdriver) return true;
  const ua = navigator.userAgent || '';
  return /bot|crawl|spider|slurp|googlebot|bingbot|yandex|baidu|duckduckbot|facebookexternalhit|line-poker|headless/i.test(
    ua
  );
};

export const shouldSkipTracking = (): boolean => {
  if (typeof window === 'undefined') return true;
  if (isCrawlerOrBot()) return true;
  if (isStoreOwnerLoggedIn()) return true;
  const ownerEmail = auth.currentUser?.email?.toLowerCase();
  if (ownerEmail === 'chenwei19970829@gmail.com') return true;
  return false;
};

const detectDeviceField = (): 'deviceMobile' | 'deviceDesktop' => {
  if (typeof window === 'undefined') return 'deviceDesktop';
  const ua = navigator.userAgent || '';
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || window.innerWidth < 768) {
    return 'deviceMobile';
  }
  return 'deviceDesktop';
};

const detectSourceField = (): 'srcSearch' | 'srcSocial' | 'srcDirect' => {
  if (typeof window === 'undefined') return 'srcDirect';
  let sourceHint = '';
  try {
    const params = new URLSearchParams(window.location.search);
    const utm = params.get('utm_source') || params.get('source') || '';
    const ref = document.referrer || '';
    sourceHint = `${utm} ${ref}`.toLowerCase();
  } catch {
    sourceHint = (document.referrer || '').toLowerCase();
  }

  if (/(google\.|bing\.|yahoo\.|duckduckgo\.|baidu\.|yandex\.)/.test(sourceHint)) {
    return 'srcSearch';
  }
  if (/(facebook\.|fb\.|fbclid|instagram\.|threads\.|line\.me|line\.naver|liff|t\.co|youtube\.|tiktok\.)/.test(sourceHint)) {
    return 'srcSocial';
  }
  return 'srcDirect';
};

const claimPeriodFlag = (storageKey: string, expectedValue: string): boolean => {
  try {
    const existingVal = localStorage.getItem(storageKey);
    if (existingVal !== expectedValue) {
      localStorage.setItem(storageKey, expectedValue);
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const markLineClickTracked = () => {
  lastLineTrackTs = Date.now();
};

export const wasLineRecentlyTracked = (): boolean => {
  return Date.now() - lastLineTrackTs < 800;
};

const buildIncrementPayload = (
  baseFields: Record<string, unknown>,
  metrics: MetricIncrements
): Record<string, unknown> | null => {
  const payload: Record<string, unknown> = {
    ...baseFields,
    updatedAt: serverTimestamp(),
  };
  let hasMetric = false;
  (Object.keys(metrics) as DailyMetricField[]).forEach((key) => {
    const val = metrics[key];
    if (typeof val === 'number' && val > 0) {
      payload[key] = increment(1);
      hasMetric = true;
    }
  });
  return hasMetric ? payload : null;
};

const writeAllPeriodMetrics = async (
  dayMetrics: MetricIncrements,
  weekExtra: MetricIncrements = {},
  monthExtra: MetricIncrements = {},
  yearExtra: MetricIncrements = {}
) => {
  if (shouldSkipTracking()) return;
  const dateKey = getTaiwanDateKey();
  const weekKey = getTaiwanWeekMondayKey(dateKey);
  const monthKey = getTaiwanMonthKey(dateKey);
  const yearKey = getTaiwanYearKey(dateKey);

  // Additive metrics shared across all 4 period tiers (excluding period-deduplicated fields)
  const sharedAdditive: MetricIncrements = { ...dayMetrics };
  delete sharedAdditive.uniqueVisitors;
  delete sharedAdditive.estimatorUsers;
  delete sharedAdditive.deviceMobile;
  delete sharedAdditive.deviceDesktop;
  delete sharedAdditive.srcSearch;
  delete sharedAdditive.srcSocial;
  delete sharedAdditive.srcDirect;

  const writes: Promise<void>[] = [];

  const dailyPayload = buildIncrementPayload({ date: dateKey }, dayMetrics);
  if (dailyPayload) {
    writes.push(
      setDoc(doc(db, 'analyticsDaily', dateKey), dailyPayload, { merge: true }).catch((err) => {
        console.warn('Analytics daily write skipped:', err);
      })
    );
  }

  const weekPayload = buildIncrementPayload(
    { periodType: 'week', periodKey: weekKey },
    { ...sharedAdditive, ...weekExtra }
  );
  if (weekPayload) {
    writes.push(
      setDoc(doc(db, 'analyticsPeriods', `w_${weekKey}`), weekPayload, { merge: true }).catch((err) => {
        console.warn('Analytics week write skipped:', err);
      })
    );
  }

  const monthPayload = buildIncrementPayload(
    { periodType: 'month', periodKey: monthKey },
    { ...sharedAdditive, ...monthExtra }
  );
  if (monthPayload) {
    writes.push(
      setDoc(doc(db, 'analyticsPeriods', `m_${monthKey}`), monthPayload, { merge: true }).catch((err) => {
        console.warn('Analytics month write skipped:', err);
      })
    );
  }

  const yearPayload = buildIncrementPayload(
    { periodType: 'year', periodKey: yearKey },
    { ...sharedAdditive, ...yearExtra }
  );
  if (yearPayload) {
    writes.push(
      setDoc(doc(db, 'analyticsPeriods', `y_${yearKey}`), yearPayload, { merge: true }).catch((err) => {
        console.warn('Analytics year write skipped:', err);
      })
    );
  }

  if (writes.length > 0) {
    await Promise.allSettled(writes);
  }
};

export const recordPageVisit = async (rawPath: string) => {
  const normalizedPath = (rawPath || '/').replace(/\/+$/, '') || '/';
  const now = Date.now();
  if (normalizedPath === lastPageVisitKey && now - lastPageVisitTs < 2000) {
    return;
  }
  lastPageVisitKey = normalizedPath;
  lastPageVisitTs = now;

  // Send SPA virtual page_view (skip very first initial load since gtag('config') already fires it)
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    if (hasRecordedInitialPage) {
      window.gtag('event', 'page_view', {
        page_path: normalizedPath,
        page_location: window.location.href,
        page_title: document.title
      });
    }
    if (normalizedPath === '/taichung-showroom') {
      window.gtag('event', 'high_intent_visit', {
        intent_type: 'showroom_page',
        page_path: normalizedPath
      });
    }
  }
  hasRecordedInitialPage = true;

  if (shouldSkipTracking()) return;

  const dateKey = getTaiwanDateKey();
  const weekKey = getTaiwanWeekMondayKey(dateKey);
  const monthKey = getTaiwanMonthKey(dateKey);
  const yearKey = getTaiwanYearKey(dateKey);

  const deviceField = detectDeviceField();
  const sourceField = detectSourceField();

  const dayMetrics: MetricIncrements = { pageViews: 1 };
  const weekExtra: MetricIncrements = {};
  const monthExtra: MetricIncrements = {};
  const yearExtra: MetricIncrements = {};

  if (claimPeriodFlag(VISIT_STORAGE_KEYS.day, dateKey)) {
    dayMetrics.uniqueVisitors = 1;
    dayMetrics[deviceField] = 1;
    dayMetrics[sourceField] = 1;
  }
  if (claimPeriodFlag(VISIT_STORAGE_KEYS.week, weekKey)) {
    weekExtra.uniqueVisitors = 1;
    weekExtra[deviceField] = 1;
    weekExtra[sourceField] = 1;
  }
  if (claimPeriodFlag(VISIT_STORAGE_KEYS.month, monthKey)) {
    monthExtra.uniqueVisitors = 1;
    monthExtra[deviceField] = 1;
    monthExtra[sourceField] = 1;
  }
  if (claimPeriodFlag(VISIT_STORAGE_KEYS.year, yearKey)) {
    yearExtra.uniqueVisitors = 1;
    yearExtra[deviceField] = 1;
    yearExtra[sourceField] = 1;
  }

  if (normalizedPath.startsWith('/villa/')) {
    dayMetrics.productPageViews = 1;
  } else if (normalizedPath === '/taichung-showroom') {
    dayMetrics.showroomPageViews = 1;
  } else if (normalizedPath === '/guides/solid-wood-craft') {
    dayMetrics.craftGuideViews = 1;
  }

  await writeAllPeriodMetrics(dayMetrics, weekExtra, monthExtra, yearExtra);
};

export const recordModelStat = async (
  modelId: string,
  modelName: string,
  type: 'view' | 'line_quote'
) => {
  if (shouldSkipTracking()) return;
  const safeId = (modelId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  if (!safeId) return;

  const now = Date.now();
  if (type === 'view') {
    if (safeId === lastModelViewKey && now - lastModelViewTs < 2000) {
      return;
    }
    lastModelViewKey = safeId;
    lastModelViewTs = now;
  }

  const dateKey = getTaiwanDateKey();
  const safeName = (modelName || safeId).trim().slice(0, 100) || safeId;
  const statId = `${dateKey}_${safeId}`;

  try {
    await setDoc(
      doc(db, 'analyticsModelDaily', statId),
      {
        date: dateKey,
        modelId: safeId,
        modelName: safeName,
        ...(type === 'view' ? { views: increment(1) } : { lineQuotes: increment(1) }),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Model stat write skipped:', err);
  }

  if (type === 'line_quote') {
    markLineClickTracked();
    await writeAllPeriodMetrics({ lineQuotes: 1 });
  }
};

export const trackEvent = (eventName: string, params?: Record<string, unknown>) => {
  if (typeof window === 'undefined') return;
  const isDuplicateLineClick = eventName === 'line_click' && wasLineRecentlyTracked();
  const isLeadConversion =
    eventName === 'estimator_line_quote' ||
    eventName === 'pdp_line_quote' ||
    eventName === 'showroom_line_booking' ||
    eventName === 'phone_click' ||
    eventName === 'qr_open' ||
    (eventName === 'line_click' && !isDuplicateLineClick);

  try {
    if (Array.isArray(window.dataLayer) && typeof window.gtag !== 'function') {
      window.dataLayer.push({ event: eventName, ...params });
    }
    if (typeof window.gtag === 'function' && !isDuplicateLineClick) {
      window.gtag('event', eventName, params || {});
      if (isLeadConversion) {
        window.gtag('event', 'high_intent_visit', {
          intent_type: eventName,
          ...params
        });
      }
    }
    if (typeof window.fbq === 'function' && !isDuplicateLineClick) {
      window.fbq('trackCustom', eventName, params || {});
    }
  } catch {
    // Non-blocking fallback
  }

  if (shouldSkipTracking()) return;

  const dateKey = getTaiwanDateKey();
  const weekKey = getTaiwanWeekMondayKey(dateKey);
  const monthKey = getTaiwanMonthKey(dateKey);
  const yearKey = getTaiwanYearKey(dateKey);

  if (eventName === 'estimator_used') {
    const dayMetrics: MetricIncrements = {
      estimatorActions: 1,
    };
    const weekExtra: MetricIncrements = {};
    const monthExtra: MetricIncrements = {};
    const yearExtra: MetricIncrements = {};

    try {
      const estDay = sessionStorage.getItem(ESTIMATOR_SESSION_KEY);
      if (estDay !== dateKey) {
        sessionStorage.setItem(ESTIMATOR_SESSION_KEY, dateKey);
        dayMetrics.estimatorSessions = 1;
      }
    } catch {
      // Ignore sessionStorage restrictions
    }

    if (claimPeriodFlag(EST_USER_STORAGE_KEYS.day, dateKey)) {
      dayMetrics.estimatorUsers = 1;
    }
    if (claimPeriodFlag(EST_USER_STORAGE_KEYS.week, weekKey)) {
      weekExtra.estimatorUsers = 1;
    }
    if (claimPeriodFlag(EST_USER_STORAGE_KEYS.month, monthKey)) {
      monthExtra.estimatorUsers = 1;
    }
    if (claimPeriodFlag(EST_USER_STORAGE_KEYS.year, yearKey)) {
      yearExtra.estimatorUsers = 1;
    }

    void writeAllPeriodMetrics(dayMetrics, weekExtra, monthExtra, yearExtra);
  } else if (eventName === 'estimator_copy') {
    void writeAllPeriodMetrics({ estimatorCopies: 1 });
  } else if (eventName === 'estimator_line_quote' || eventName === 'showroom_line_booking') {
    markLineClickTracked();
    void writeAllPeriodMetrics({ lineQuotes: 1 });
  } else if (eventName === 'view_product_page') {
    const modelId = typeof params?.model_id === 'string' ? params.model_id : '';
    const modelName = typeof params?.model_name === 'string' ? params.model_name : modelId;
    if (modelId) {
      void recordModelStat(modelId, modelName, 'view');
    }
  } else if (eventName === 'pdp_line_quote') {
    const modelId = typeof params?.model_id === 'string' ? params.model_id : '';
    const modelName = typeof params?.model_name === 'string' ? params.model_name : modelId;
    if (modelId) {
      void recordModelStat(modelId, modelName, 'line_quote');
    } else {
      markLineClickTracked();
      void writeAllPeriodMetrics({ lineQuotes: 1 });
    }
  } else if (eventName === 'qr_open') {
    void writeAllPeriodMetrics({ qrOpens: 1 });
  } else if (eventName === 'phone_click') {
    void writeAllPeriodMetrics({ phoneClicks: 1 });
  } else if (eventName === 'line_click') {
    if (!wasLineRecentlyTracked()) {
      markLineClickTracked();
      void writeAllPeriodMetrics({ lineQuotes: 1 });
    }
  }
};
