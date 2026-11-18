import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  BarChart3,
  Calculator,
  Calendar,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Globe,
  Lock,
  MessageCircle,
  Monitor,
  Phone,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  signInStoreOwnerWithGoogle,
} from '../firebase';
import { useStoreOwner } from '../utils/adminAuth';
import {
  getTaiwanDateKey,
  getTaiwanMonthKey,
  getTaiwanWeekMondayKey,
  getTaiwanYearKey,
} from '../utils/analytics';

interface OwnerAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AnalyticsMetrics {
  uniqueVisitors: number;
  dailyVisitHits: number; // Sum of daily unique visits across days (shows repeat return frequency)
  pageViews: number;
  productPageViews: number;
  showroomPageViews: number;
  craftGuideViews: number;
  estimatorUsers: number;
  estimatorSessions: number;
  estimatorActions: number;
  estimatorCopies: number;
  lineQuotes: number;
  phoneClicks: number;
  qrOpens: number;
  deviceMobile: number;
  deviceDesktop: number;
  srcSearch: number;
  srcSocial: number;
  srcDirect: number;
}

interface DailyAnalyticsDoc extends AnalyticsMetrics {
  date: string;
}

interface PeriodAnalyticsDoc extends AnalyticsMetrics {
  id: string;
  periodType: 'week' | 'month' | 'year';
  periodKey: string;
}

interface ModelDailyDoc {
  date: string;
  modelId: string;
  modelName: string;
  views: number;
  lineQuotes: number;
}

type GranularityMode = 'daily' | 'weekly' | 'monthly' | 'yearly';
type RangePreset = 'today' | '7d' | '30d' | 'all';

const OWNER_EMAIL = 'chenwei19970829@gmail.com';

const toNum = (val: unknown): number => (typeof val === 'number' && Number.isFinite(val) ? val : 0);

const shiftDateKey = (dateKey: string, deltaDays: number): string => {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
};

const formatWeekLabel = (mondayKey: string): string => {
  const sundayKey = shiftDateKey(mondayKey, 6);
  return `${mondayKey.slice(5).replace('-', '/')} – ${sundayKey.slice(5).replace('-', '/')}`;
};

const formatMonthLabel = (monthKey: string): string => {
  const [y, m] = monthKey.split('-');
  return `${y}年${Number(m)}月`;
};

const formatYearLabel = (yearKey: string): string => `${yearKey}年`;

interface PeriodRow extends AnalyticsMetrics {
  key: string;
  label: string;
  shortLabel: string;
}

const createEmptyRow = (key: string, label: string, shortLabel: string): PeriodRow => ({
  key,
  label,
  shortLabel,
  uniqueVisitors: 0,
  dailyVisitHits: 0,
  pageViews: 0,
  productPageViews: 0,
  showroomPageViews: 0,
  craftGuideViews: 0,
  estimatorUsers: 0,
  estimatorSessions: 0,
  estimatorActions: 0,
  estimatorCopies: 0,
  lineQuotes: 0,
  phoneClicks: 0,
  qrOpens: 0,
  deviceMobile: 0,
  deviceDesktop: 0,
  srcSearch: 0,
  srcSocial: 0,
  srcDirect: 0,
});

const parseMetricsDoc = (data: Record<string, unknown>): AnalyticsMetrics => ({
  uniqueVisitors: toNum(data.uniqueVisitors),
  dailyVisitHits: toNum(data.uniqueVisitors),
  pageViews: toNum(data.pageViews),
  productPageViews: toNum(data.productPageViews),
  showroomPageViews: toNum(data.showroomPageViews),
  craftGuideViews: toNum(data.craftGuideViews),
  estimatorUsers: toNum(data.estimatorUsers) || toNum(data.estimatorSessions),
  estimatorSessions: toNum(data.estimatorSessions),
  estimatorActions: toNum(data.estimatorActions),
  estimatorCopies: toNum(data.estimatorCopies),
  lineQuotes: toNum(data.lineQuotes),
  phoneClicks: toNum(data.phoneClicks),
  qrOpens: toNum(data.qrOpens),
  deviceMobile: toNum(data.deviceMobile),
  deviceDesktop: toNum(data.deviceDesktop),
  srcSearch: toNum(data.srcSearch),
  srcSocial: toNum(data.srcSocial),
  srcDirect: toNum(data.srcDirect),
});

export const OwnerAnalyticsModal: React.FC<OwnerAnalyticsModalProps> = ({ isOpen, onClose }) => {
  const { isOwner } = useStoreOwner();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(() => auth.currentUser);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');

  const [dailyDocs, setDailyDocs] = useState<DailyAnalyticsDoc[]>([]);
  const [periodDocs, setPeriodDocs] = useState<PeriodAnalyticsDoc[]>([]);
  const [modelDocs, setModelDocs] = useState<ModelDailyDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [granularity, setGranularity] = useState<GranularityMode>('daily');
  const [rangePreset, setRangePreset] = useState<RangePreset>('30d');
  const [hoveredChartIdx, setHoveredChartIdx] = useState<number | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const isFirebaseOwner =
    Boolean(firebaseUser?.email) &&
    firebaseUser!.email!.toLowerCase() === OWNER_EMAIL &&
    firebaseUser!.emailVerified !== false;

  useEffect(() => {
    if (!isOpen || !isOwner || !authReady || !isFirebaseOwner) {
      return;
    }

    setLoading(true);
    setLoadError('');

    const dailyQuery = query(
      collection(db, 'analyticsDaily'),
      orderBy('date', 'desc'),
      limit(365)
    );

    const periodQuery = query(
      collection(db, 'analyticsPeriods'),
      orderBy('periodKey', 'desc'),
      limit(200)
    );

    const modelQuery = query(
      collection(db, 'analyticsModelDaily'),
      orderBy('date', 'desc'),
      limit(500)
    );

    const unsubDaily = onSnapshot(
      dailyQuery,
      (snapshot) => {
        const rows: DailyAnalyticsDoc[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as Record<string, unknown>;
          rows.push({
            date: typeof data.date === 'string' ? data.date : d.id,
            ...parseMetricsDoc(data),
          });
        });
        rows.sort((a, b) => b.date.localeCompare(a.date));
        setDailyDocs(rows);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        setLoadError('無法讀取網站觀看紀錄，請確認已使用店主 Google 帳號登入並部署最新安全規則。');
        try {
          handleFirestoreError(error, OperationType.LIST, 'analyticsDaily');
        } catch {
          // Handled cleanly in UI
        }
      }
    );

    const unsubPeriods = onSnapshot(
      periodQuery,
      (snapshot) => {
        const rows: PeriodAnalyticsDoc[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as Record<string, unknown>;
          const pType = data.periodType;
          if (pType === 'week' || pType === 'month' || pType === 'year') {
            rows.push({
              id: d.id,
              periodType: pType,
              periodKey: typeof data.periodKey === 'string' ? data.periodKey : d.id.slice(2),
              ...parseMetricsDoc(data),
            });
          }
        });
        setPeriodDocs(rows);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'analyticsPeriods');
        } catch {
          // Non-blocking fallback to daily aggregation if needed
        }
      }
    );

    const unsubModels = onSnapshot(
      modelQuery,
      (snapshot) => {
        const rows: ModelDailyDoc[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          rows.push({
            date: typeof data.date === 'string' ? data.date : '',
            modelId: typeof data.modelId === 'string' ? data.modelId : d.id,
            modelName: typeof data.modelName === 'string' ? data.modelName : d.id,
            views: toNum(data.views),
            lineQuotes: toNum(data.lineQuotes),
          });
        });
        setModelDocs(rows);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'analyticsModelDaily');
        } catch {
          // Non-blocking for secondary breakdown
        }
      }
    );

    return () => {
      unsubDaily();
      unsubPeriods();
      unsubModels();
    };
  }, [isOpen, isOwner, authReady, isFirebaseOwner]);

  const todayKey = getTaiwanDateKey();
  const yesterdayKey = shiftDateKey(todayKey, -1);
  const sevenDaysAgoKey = shiftDateKey(todayKey, -6);
  const thirtyDaysAgoKey = shiftDateKey(todayKey, -29);
  const thisWeekMonday = getTaiwanWeekMondayKey(todayKey);
  const thisMonthKey = getTaiwanMonthKey(todayKey);
  const thisYearKey = getTaiwanYearKey(todayKey);

  // Build deduplicated PeriodRow lists for weekly, monthly, yearly by merging analyticsPeriods + dailyDocs
  const buildPeriodRows = (type: 'week' | 'month' | 'year'): PeriodRow[] => {
    const periodDocMap = new Map<string, PeriodAnalyticsDoc>();
    for (const p of periodDocs) {
      if (p.periodType === type) {
        periodDocMap.set(p.periodKey, p);
      }
    }

    const dailyAggMap = new Map<
      string,
      { sum: PeriodRow; maxDailyUnique: number; maxDailyEstUsers: number }
    >();

    const ensureAgg = (key: string) => {
      let existing = dailyAggMap.get(key);
      if (!existing) {
        const label =
          type === 'week'
            ? `${formatWeekLabel(key)}${key === thisWeekMonday ? ' (本週)' : ''}`
            : type === 'month'
              ? `${formatMonthLabel(key)}${key === thisMonthKey ? ' (本月)' : ''}`
              : `${formatYearLabel(key)}${key === thisYearKey ? ' (今年)' : ''}`;
        const shortLabel =
          type === 'week'
            ? key.slice(5)
            : type === 'month'
              ? `${Number(key.slice(5))}月`
              : `${key}年`;
        existing = {
          sum: createEmptyRow(key, label, shortLabel),
          maxDailyUnique: 0,
          maxDailyEstUsers: 0,
        };
        dailyAggMap.set(key, existing);
      }
      return existing;
    };

    for (const d of dailyDocs) {
      const key =
        type === 'week'
          ? getTaiwanWeekMondayKey(d.date)
          : type === 'month'
            ? getTaiwanMonthKey(d.date)
            : getTaiwanYearKey(d.date);
      const agg = ensureAgg(key);
      agg.maxDailyUnique = Math.max(agg.maxDailyUnique, d.uniqueVisitors);
      agg.maxDailyEstUsers = Math.max(agg.maxDailyEstUsers, d.estimatorUsers);
      agg.sum.dailyVisitHits += d.uniqueVisitors;
      agg.sum.pageViews += d.pageViews;
      agg.sum.productPageViews += d.productPageViews;
      agg.sum.showroomPageViews += d.showroomPageViews;
      agg.sum.craftGuideViews += d.craftGuideViews;
      agg.sum.estimatorSessions += d.estimatorSessions;
      agg.sum.estimatorActions += d.estimatorActions;
      agg.sum.estimatorCopies += d.estimatorCopies;
      agg.sum.lineQuotes += d.lineQuotes;
      agg.sum.phoneClicks += d.phoneClicks;
      agg.sum.qrOpens += d.qrOpens;
      agg.sum.deviceMobile += d.deviceMobile;
      agg.sum.deviceDesktop += d.deviceDesktop;
      agg.sum.srcSearch += d.srcSearch;
      agg.sum.srcSocial += d.srcSocial;
      agg.sum.srcDirect += d.srcDirect;
    }

    // Ensure any period present ONLY in analyticsPeriods (e.g., older years beyond 365 daily docs) is also included
    for (const p of periodDocMap.values()) {
      ensureAgg(p.periodKey);
    }

    const result: PeriodRow[] = [];
    for (const [key, agg] of dailyAggMap.entries()) {
      const pDoc = periodDocMap.get(key);
      if (pDoc) {
        result.push({
          ...agg.sum,
          // Deduplicated unique count comes directly from analyticsPeriods, clamped >= largest single day
          uniqueVisitors: Math.max(pDoc.uniqueVisitors, agg.maxDailyUnique),
          estimatorUsers: Math.max(pDoc.estimatorUsers, agg.maxDailyEstUsers),
          pageViews: Math.max(pDoc.pageViews, agg.sum.pageViews),
          productPageViews: Math.max(pDoc.productPageViews, agg.sum.productPageViews),
          showroomPageViews: Math.max(pDoc.showroomPageViews, agg.sum.showroomPageViews),
          craftGuideViews: Math.max(pDoc.craftGuideViews, agg.sum.craftGuideViews),
          estimatorSessions: Math.max(pDoc.estimatorSessions, agg.sum.estimatorSessions),
          estimatorActions: Math.max(pDoc.estimatorActions, agg.sum.estimatorActions),
          estimatorCopies: Math.max(pDoc.estimatorCopies, agg.sum.estimatorCopies),
          lineQuotes: Math.max(pDoc.lineQuotes, agg.sum.lineQuotes),
          phoneClicks: Math.max(pDoc.phoneClicks, agg.sum.phoneClicks),
          qrOpens: Math.max(pDoc.qrOpens, agg.sum.qrOpens),
          deviceMobile: pDoc.deviceMobile || agg.sum.deviceMobile,
          deviceDesktop: pDoc.deviceDesktop || agg.sum.deviceDesktop,
          srcSearch: pDoc.srcSearch || agg.sum.srcSearch,
          srcSocial: pDoc.srcSocial || agg.sum.srcSocial,
          srcDirect: pDoc.srcDirect || agg.sum.srcDirect,
        });
      } else {
        // Fallback before analyticsPeriods has entries for historical dates
        result.push({
          ...agg.sum,
          uniqueVisitors: agg.sum.dailyVisitHits,
          estimatorUsers: agg.sum.estimatorSessions,
        });
      }
    }

    return result.sort((a, b) => b.key.localeCompare(a.key));
  };

  const weeklyRows = useMemo(() => buildPeriodRows('week'), [dailyDocs, periodDocs, thisWeekMonday]);
  const monthlyRows = useMemo(() => buildPeriodRows('month'), [dailyDocs, periodDocs, thisMonthKey]);
  const yearlyRows = useMemo(() => buildPeriodRows('year'), [dailyDocs, periodDocs, thisYearKey]);

  const dailyRowMap = useMemo(() => {
    const map = new Map<string, DailyAnalyticsDoc>();
    for (const d of dailyDocs) {
      map.set(d.date, d);
    }
    return map;
  }, [dailyDocs]);

  // 4-Tier Top Quick Summary (今日 / 本週 / 本月 / 今年)
  const tierSummary = useMemo(() => {
    const todayDoc = dailyRowMap.get(todayKey);
    const yesterdayDoc = dailyRowMap.get(yesterdayKey);
    const thisWeekRow = weeklyRows.find((r) => r.key === thisWeekMonday);
    const thisMonthRow = monthlyRows.find((r) => r.key === thisMonthKey);
    const thisYearRow = yearlyRows.find((r) => r.key === thisYearKey);

    const summarize = (row?: AnalyticsMetrics | null) => ({
      visitors: row?.uniqueVisitors ?? 0,
      hits: row?.dailyVisitHits ?? 0,
      pageViews: row?.pageViews ?? 0,
      estUsers: row?.estimatorUsers ?? 0,
      estSessions: row?.estimatorSessions ?? 0,
      inquiries: (row?.lineQuotes ?? 0) + (row?.phoneClicks ?? 0) + (row?.qrOpens ?? 0),
    });

    return {
      today: summarize(todayDoc),
      yesterday: summarize(yesterdayDoc),
      week: summarize(thisWeekRow),
      month: summarize(thisMonthRow),
      year: summarize(thisYearRow),
    };
  }, [
    dailyRowMap,
    todayKey,
    yesterdayKey,
    weeklyRows,
    thisWeekMonday,
    monthlyRows,
    thisMonthKey,
    yearlyRows,
    thisYearKey,
  ]);

  // Range Filter for Daily & Top Models
  const rangeStartDate = useMemo(() => {
    if (rangePreset === 'today') return todayKey;
    if (rangePreset === '7d') return sevenDaysAgoKey;
    if (rangePreset === '30d') return thirtyDaysAgoKey;
    return '';
  }, [rangePreset, todayKey, sevenDaysAgoKey, thirtyDaysAgoKey]);

  const filteredDailyRows: PeriodRow[] = useMemo(() => {
    const filtered = rangeStartDate
      ? dailyDocs.filter((d) => d.date >= rangeStartDate)
      : dailyDocs;
    return filtered.map((d) => ({
      ...d,
      key: d.date,
      label: d.date === todayKey ? `${d.date} (今日)` : d.date === yesterdayKey ? `${d.date} (昨日)` : d.date,
      shortLabel: d.date.slice(5),
    }));
  }, [dailyDocs, rangeStartDate, todayKey, yesterdayKey]);

  // Active rows according to selected granularity (日 / 週 / 月 / 年)
  const activeRows: PeriodRow[] = useMemo(() => {
    if (granularity === 'daily') return filteredDailyRows;
    if (granularity === 'weekly') return weeklyRows;
    if (granularity === 'monthly') return monthlyRows;
    return yearlyRows;
  }, [granularity, filteredDailyRows, weeklyRows, monthlyRows, yearlyRows]);

  // Summary KPIs for the current view/range
  const activeSummary: AnalyticsMetrics = useMemo(() => {
    const emptyMetrics = (): AnalyticsMetrics => ({
      uniqueVisitors: 0,
      dailyVisitHits: 0,
      pageViews: 0,
      productPageViews: 0,
      showroomPageViews: 0,
      craftGuideViews: 0,
      estimatorUsers: 0,
      estimatorSessions: 0,
      estimatorActions: 0,
      estimatorCopies: 0,
      lineQuotes: 0,
      phoneClicks: 0,
      qrOpens: 0,
      deviceMobile: 0,
      deviceDesktop: 0,
      srcSearch: 0,
      srcSocial: 0,
      srcDirect: 0,
    });

    if (granularity === 'weekly' && rangePreset === 'today') {
      return weeklyRows[0] || emptyMetrics();
    }
    if (granularity === 'monthly' && rangePreset === 'today') {
      return monthlyRows[0] || emptyMetrics();
    }
    if (granularity === 'yearly') {
      return yearlyRows.reduce<AnalyticsMetrics>(
        (acc, r) => ({
          uniqueVisitors: acc.uniqueVisitors + r.uniqueVisitors,
          dailyVisitHits: acc.dailyVisitHits + r.dailyVisitHits,
          pageViews: acc.pageViews + r.pageViews,
          productPageViews: acc.productPageViews + r.productPageViews,
          showroomPageViews: acc.showroomPageViews + r.showroomPageViews,
          craftGuideViews: acc.craftGuideViews + r.craftGuideViews,
          estimatorUsers: acc.estimatorUsers + r.estimatorUsers,
          estimatorSessions: acc.estimatorSessions + r.estimatorSessions,
          estimatorActions: acc.estimatorActions + r.estimatorActions,
          estimatorCopies: acc.estimatorCopies + r.estimatorCopies,
          lineQuotes: acc.lineQuotes + r.lineQuotes,
          phoneClicks: acc.phoneClicks + r.phoneClicks,
          qrOpens: acc.qrOpens + r.qrOpens,
          deviceMobile: acc.deviceMobile + r.deviceMobile,
          deviceDesktop: acc.deviceDesktop + r.deviceDesktop,
          srcSearch: acc.srcSearch + r.srcSearch,
          srcSocial: acc.srcSocial + r.srcSocial,
          srcDirect: acc.srcDirect + r.srcDirect,
        }),
        emptyMetrics()
      );
    }

    if (granularity === 'monthly' && monthlyRows.length > 0 && rangePreset === '30d') {
      return monthlyRows[0];
    }

    return activeRows.reduce<AnalyticsMetrics>(
      (acc, r) => ({
        uniqueVisitors: acc.uniqueVisitors + r.uniqueVisitors,
        dailyVisitHits: acc.dailyVisitHits + r.dailyVisitHits,
        pageViews: acc.pageViews + r.pageViews,
        productPageViews: acc.productPageViews + r.productPageViews,
        showroomPageViews: acc.showroomPageViews + r.showroomPageViews,
        craftGuideViews: acc.craftGuideViews + r.craftGuideViews,
        estimatorUsers: acc.estimatorUsers + r.estimatorUsers,
        estimatorSessions: acc.estimatorSessions + r.estimatorSessions,
        estimatorActions: acc.estimatorActions + r.estimatorActions,
        estimatorCopies: acc.estimatorCopies + r.estimatorCopies,
        lineQuotes: acc.lineQuotes + r.lineQuotes,
        phoneClicks: acc.phoneClicks + r.phoneClicks,
        qrOpens: acc.qrOpens + r.qrOpens,
        deviceMobile: acc.deviceMobile + r.deviceMobile,
        deviceDesktop: acc.deviceDesktop + r.deviceDesktop,
        srcSearch: acc.srcSearch + r.srcSearch,
        srcSocial: acc.srcSocial + r.srcSocial,
        srcDirect: acc.srcDirect + r.srcDirect,
      }),
      emptyMetrics()
    );
  }, [
    granularity,
    rangePreset,
    activeRows,
    weeklyRows,
    monthlyRows,
    yearlyRows,
    thisWeekMonday,
    thisMonthKey,
  ]);

  // Continuous calendar bar chart series (fills missing 0-visitor days in daily mode!)
  const chartSeries: PeriodRow[] = useMemo(() => {
    if (granularity === 'daily') {
      const daysCount = rangePreset === 'today' ? 7 : rangePreset === '7d' ? 7 : 14;
      const series: PeriodRow[] = [];
      for (let i = daysCount - 1; i >= 0; i--) {
        const dKey = shiftDateKey(todayKey, -i);
        const found = dailyRowMap.get(dKey);
        if (found) {
          series.push({
            ...found,
            key: dKey,
            label: dKey === todayKey ? `${dKey} (今日)` : dKey,
            shortLabel: dKey.slice(5),
          });
        } else {
          series.push(createEmptyRow(dKey, dKey, dKey.slice(5)));
        }
      }
      return series;
    }

    const maxBars = 12;
    return activeRows.slice(0, maxBars).reverse();
  }, [granularity, rangePreset, todayKey, dailyRowMap, activeRows]);

  const maxChartValue = useMemo(() => {
    let maxVal = 1;
    for (const item of chartSeries) {
      maxVal = Math.max(maxVal, item.uniqueVisitors, item.estimatorUsers);
    }
    return maxVal;
  }, [chartSeries]);

  // Top Viewed Models in selected range
  const topModels = useMemo(() => {
    const map = new Map<
      string,
      { modelId: string; modelName: string; views: number; lineQuotes: number }
    >();
    const modelStartDate =
      granularity === 'yearly' ? `${thisYearKey}-01-01` : rangeStartDate;
    for (const row of modelDocs) {
      if (modelStartDate && row.date < modelStartDate) continue;
      const existing = map.get(row.modelId) || {
        modelId: row.modelId,
        modelName: row.modelName,
        views: 0,
        lineQuotes: 0,
      };
      existing.views += row.views;
      existing.lineQuotes += row.lineQuotes;
      if (row.modelName) existing.modelName = row.modelName;
      map.set(row.modelId, existing);
    }
    return Array.from(map.values())
      .sort((a, b) => b.views - a.views || b.lineQuotes - a.lineQuotes)
      .slice(0, 8);
  }, [modelDocs, rangeStartDate, granularity, thisYearKey]);

  const handleGoogleConnect = async () => {
    setAuthBusy(true);
    setAuthError('');
    try {
      const user = await signInStoreOwnerWithGoogle();
      if (user && user.email?.toLowerCase() !== OWNER_EMAIL) {
        setAuthError(
          `您登入的帳號 (${user.email || '未知'}) 不是店主授權帳號 (${OWNER_EMAIL})，請切換帳號再試。`
        );
      }
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      if (code === 'auth/unauthorized-domain') {
        setAuthError(
          '目前網域尚未加入 Firebase Google 登入白名單：請到 Firebase Console → Authentication → Settings → Authorized domains 新增 hhcat.cc，即可直接於官網一鍵開啟紀錄。'
        );
      } else if (code === 'auth/popup-closed-by-user') {
        setAuthError('您已取消 Google 登入視窗。');
      } else {
        setAuthError('Google 登入驗證失敗，請確認瀏覽器未阻擋彈出視窗後重試。');
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleExportCsv = () => {
    if (activeRows.length === 0) return;
    const headers = [
      '統計區間',
      '不重複拜訪人數(真實去重)',
      '跨日訪問人次(含回訪)',
      '網頁總瀏覽次數',
      '計算機使用人數',
      '計算機調整試算次數',
      '一鍵複製報價單',
      'LINE帶價與預約諮詢',
      '電話點擊',
      'LINE QR開啟',
      '商品獨立頁瀏覽',
      '豐原門市頁瀏覽',
      '實木工藝頁瀏覽',
      '手機訪客',
      '電腦平板訪客',
      '搜尋引擎來源',
      '社群LINE來源',
      '直接與其他來源',
    ];
    const lines = activeRows.map((r) =>
      [
        `"${r.label}"`,
        r.uniqueVisitors,
        r.dailyVisitHits,
        r.pageViews,
        r.estimatorUsers,
        r.estimatorActions,
        r.estimatorCopies,
        r.lineQuotes,
        r.phoneClicks,
        r.qrOpens,
        r.productPageViews,
        r.showroomPageViews,
        r.craftGuideViews,
        r.deviceMobile,
        r.deviceDesktop,
        r.srcSearch,
        r.srcSocial,
        r.srcDirect,
      ].join(',')
    );
    const csvContent = '\uFEFF' + [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `花花招財貓_網站觀看紀錄_${granularity}_${todayKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen || !isOwner) return null;

  const totalInquiries =
    activeSummary.lineQuotes + activeSummary.phoneClicks + activeSummary.qrOpens;
  const estimatorRate =
    activeSummary.uniqueVisitors > 0
      ? Math.round((activeSummary.estimatorUsers / activeSummary.uniqueVisitors) * 100)
      : 0;
  const inquiryRate =
    activeSummary.uniqueVisitors > 0
      ? Math.round((totalInquiries / activeSummary.uniqueVisitors) * 100)
      : 0;

  const totalDeviceTracked = activeSummary.deviceMobile + activeSummary.deviceDesktop;
  const mobilePct =
    totalDeviceTracked > 0
      ? Math.round((activeSummary.deviceMobile / totalDeviceTracked) * 100)
      : 0;
  const desktopPct = totalDeviceTracked > 0 ? 100 - mobilePct : 0;

  const totalSourceTracked =
    activeSummary.srcSearch + activeSummary.srcSocial + activeSummary.srcDirect;
  const searchPct =
    totalSourceTracked > 0 ? Math.round((activeSummary.srcSearch / totalSourceTracked) * 100) : 0;
  const socialPct =
    totalSourceTracked > 0 ? Math.round((activeSummary.srcSocial / totalSourceTracked) * 100) : 0;
  const directPct = totalSourceTracked > 0 ? Math.max(0, 100 - searchPct - socialPct) : 0;

  const todayDelta = tierSummary.today.visitors - tierSummary.yesterday.visitors;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="店主專屬網站觀看與計算機紀錄"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl max-h-[92vh] bg-[#FAF8F5] rounded-2xl border border-stone-300 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between gap-4 shrink-0 border-b border-stone-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-800/80 text-amber-200 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-serif-title font-bold text-base sm:text-lg truncate">
                花花招財貓 · 日／週／月／年 網站觀看與計算機紀錄
              </h2>
              <p className="text-xs text-stone-400 truncate">
                僅限店主 Google 帳號 ({OWNER_EMAIL}) 加密讀取 · 已自動依日/週/月/年獨立去重並排除店主本機瀏覽
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isFirebaseOwner && activeRows.length > 0 && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>匯出報表</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
              aria-label="關閉觀看紀錄"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {!authReady ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center space-y-3">
              <RefreshCw className="w-6 h-6 text-amber-800 animate-spin mx-auto" />
              <div className="text-sm font-semibold text-stone-700">正在驗證店主雲端權限...</div>
            </div>
          ) : !isFirebaseOwner ? (
            <div className="max-w-lg mx-auto my-6 bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-serif-title text-lg font-bold text-stone-900">
                  連結 Google 店主帳號讀取加密數據
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  資料庫安全規則僅開放給 <strong className="font-mono text-stone-800">{OWNER_EMAIL}</strong> 讀取，確保訪客與競爭對手完全無法看到您的日／週／月／年流量與計算機統計。
                </p>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 text-left leading-relaxed">
                  {authError}
                </div>
              )}

              <button
                type="button"
                disabled={authBusy}
                onClick={handleGoogleConnect}
                className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 disabled:opacity-60 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2.5 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>
                  {authBusy ? '正在開啟 Google 驗證...' : `以 Google 店主帳號 (${OWNER_EMAIL}) 開啟紀錄`}
                </span>
              </button>
            </div>
          ) : (
            <>
              {loadError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  {loadError}
                </div>
              )}

              {/* Strip 1: 日 / 週 / 月 / 年 4-Tier True Unique Visitor Overview (Clickable to switch view) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setGranularity('daily')}
                  className={`text-left rounded-xl border p-4 space-y-1.5 transition-all ${
                    granularity === 'daily'
                      ? 'bg-white border-amber-800 ring-1 ring-amber-800/20'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span className="font-semibold text-stone-700">今日拜訪人數</span>
                    <span className="font-mono">{todayKey.slice(5)}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-2xl font-bold font-mono tabular-nums text-stone-900">
                      {tierSummary.today.visitors.toLocaleString()}
                      <span className="text-xs font-sans font-normal text-stone-500 ml-1">人</span>
                    </div>
                    <span className="text-[11px] font-mono tabular-nums text-stone-500">
                      昨日 {tierSummary.yesterday.visitors}（{todayDelta >= 0 ? `+${todayDelta}` : todayDelta}）
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 font-mono tabular-nums">
                    瀏覽 {tierSummary.today.pageViews} · 計算機 {tierSummary.today.estUsers} 人 · 諮詢 {tierSummary.today.inquiries}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setGranularity('weekly')}
                  className={`text-left rounded-xl border p-4 space-y-1.5 transition-all ${
                    granularity === 'weekly'
                      ? 'bg-white border-amber-800 ring-1 ring-amber-800/20'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span className="font-semibold text-amber-900">本週不重複人數</span>
                    <span>週一起算</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-2xl font-bold font-mono tabular-nums text-amber-900">
                      {tierSummary.week.visitors.toLocaleString()}
                      <span className="text-xs font-sans font-normal text-stone-500 ml-1">人</span>
                    </div>
                    <span className="text-[11px] font-mono tabular-nums text-stone-500">
                      含回訪 {tierSummary.week.hits} 人次
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 font-mono tabular-nums">
                    瀏覽 {tierSummary.week.pageViews} · 計算機 {tierSummary.week.estUsers} 人 · 諮詢 {tierSummary.week.inquiries}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setGranularity('monthly')}
                  className={`text-left rounded-xl border p-4 space-y-1.5 transition-all ${
                    granularity === 'monthly'
                      ? 'bg-white border-amber-800 ring-1 ring-amber-800/20'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span className="font-semibold text-emerald-800">本月不重複人數</span>
                    <span className="font-mono">{thisMonthKey}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-2xl font-bold font-mono tabular-nums text-emerald-800">
                      {tierSummary.month.visitors.toLocaleString()}
                      <span className="text-xs font-sans font-normal text-stone-500 ml-1">人</span>
                    </div>
                    <span className="text-[11px] font-mono tabular-nums text-stone-500">
                      含回訪 {tierSummary.month.hits} 人次
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 font-mono tabular-nums">
                    瀏覽 {tierSummary.month.pageViews} · 計算機 {tierSummary.month.estUsers} 人 · 諮詢 {tierSummary.month.inquiries}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setGranularity('yearly')}
                  className={`text-left rounded-xl border p-4 space-y-1.5 transition-all ${
                    granularity === 'yearly'
                      ? 'bg-white border-amber-800 ring-1 ring-amber-800/20'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span className="font-semibold text-stone-800">今年不重複人數</span>
                    <span className="font-mono">{thisYearKey}年</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-2xl font-bold font-mono tabular-nums text-stone-900">
                      {tierSummary.year.visitors.toLocaleString()}
                      <span className="text-xs font-sans font-normal text-stone-500 ml-1">人</span>
                    </div>
                    <span className="text-[11px] font-mono tabular-nums text-stone-500">
                      含回訪 {tierSummary.year.hits} 人次
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 font-mono tabular-nums">
                    瀏覽 {tierSummary.year.pageViews} · 計算機 {tierSummary.year.estUsers} 人 · 諮詢 {tierSummary.year.inquiries}
                  </div>
                </button>
              </div>

              {/* Filter Bar: 日 / 週 / 月 / 年 Segmented Switch + Range Preset */}
              <div className="bg-white rounded-xl border border-stone-200 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg w-fit overflow-x-auto">
                  {(
                    [
                      { id: 'daily', label: '每日明細' },
                      { id: 'weekly', label: '每週統計' },
                      { id: 'monthly', label: '每月統計' },
                      { id: 'yearly', label: '每年統計' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setGranularity(tab.id);
                        setHoveredChartIdx(null);
                      }}
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                        granularity === tab.id
                          ? 'bg-white text-stone-900 shadow-2xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {granularity === 'daily' ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-stone-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>顯示天數：</span>
                    </span>
                    <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg">
                      {(
                        [
                          { id: 'today', label: '今日' },
                          { id: '7d', label: '近 7 天' },
                          { id: '30d', label: '近 30 天' },
                          { id: 'all', label: '全部紀錄' },
                        ] as const
                      ).map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setRangePreset(preset.id)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                            rangePreset === preset.id
                              ? 'bg-amber-900 text-white'
                              : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-stone-500">
                    「不重複人數」為該{granularity === 'weekly' ? '週' : granularity === 'monthly' ? '月' : '年'}真實獨立訪客（同一客人多次回訪只計 1 人）
                  </div>
                )}
              </div>

              {/* Strip 2: Detailed 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-stone-200 p-4 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs text-stone-500 block">
                      {granularity === 'daily'
                        ? '區間每日拜訪加總'
                        : granularity === 'weekly'
                          ? '近期週別不重複拜訪'
                          : granularity === 'monthly'
                            ? '統計月份不重複拜訪'
                            : '歷年不重複拜訪人數'}
                    </span>
                    <div className="text-2xl font-bold font-mono tabular-nums text-stone-900">
                      {activeSummary.uniqueVisitors.toLocaleString()}
                      <span className="text-xs font-sans font-normal text-stone-500 ml-1">人</span>
                    </div>
                    <span className="text-[11px] text-stone-500 font-mono tabular-nums block">
                      總瀏覽 {activeSummary.pageViews.toLocaleString()} 次 · 回訪 {activeSummary.dailyVisitHits.toLocaleString()} 人次
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-900 shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-stone-200 p-4 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs text-stone-500 block">估價計算機使用統計</span>
                    <div className="text-2xl font-bold font-mono tabular-nums text-stone-900">
                      {activeSummary.estimatorUsers.toLocaleString()}
                      <span className="text-xs font-sans font-normal text-stone-500 ml-1">人</span>
                    </div>
                    <span className="text-[11px] text-stone-500 font-mono tabular-nums block">
                      調整規格 {activeSummary.estimatorActions.toLocaleString()} 次 · 佔訪客 {estimatorRate}%
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 shrink-0">
                    <Calculator className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-stone-200 p-4 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs text-stone-500 block">LINE / 電話 / QR 諮詢動作</span>
                    <div className="text-2xl font-bold font-mono tabular-nums text-[#059669]">
                      {totalInquiries.toLocaleString()}
                    </div>
                    <span className="text-[11px] text-stone-500 font-mono tabular-nums block">
                      LINE {activeSummary.lineQuotes} · 電話 {activeSummary.phoneClicks} · QR {activeSummary.qrOpens}（{inquiryRate}%）
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50 text-[#06C755] shrink-0">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-stone-200 p-4 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs text-stone-500 block">深度頁面與複製清單</span>
                    <div className="text-2xl font-bold font-mono tabular-nums text-stone-900">
                      {activeSummary.productPageViews.toLocaleString()}
                      <span className="text-xs font-sans font-normal text-stone-500 ml-1">單品頁</span>
                    </div>
                    <span className="text-[11px] text-stone-500 font-mono tabular-nums block">
                      門市 {activeSummary.showroomPageViews} · 工藝 {activeSummary.craftGuideViews} · 複製 {activeSummary.estimatorCopies}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-100 text-stone-700 shrink-0">
                    <Eye className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Loading / Empty / Full Analytics Content */}
              {loading && dailyDocs.length === 0 && periodDocs.length === 0 ? (
                <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center space-y-2">
                  <RefreshCw className="w-5 h-5 text-amber-800 animate-spin mx-auto" />
                  <p className="text-xs text-stone-500">正在載入日／週／月／年統計資料...</p>
                </div>
              ) : dailyDocs.length === 0 && periodDocs.length === 0 ? (
                <div className="bg-white rounded-2xl border border-stone-200 p-8 sm:p-10 text-center space-y-3">
                  <TrendingUp className="w-8 h-8 text-amber-800 mx-auto" />
                  <h3 className="font-serif-title font-bold text-base text-stone-900">
                    日／週／月／年精準追蹤已就緒
                  </h3>
                  <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                    為避免灌水，<strong>店主登入狀態下的瀏覽不會計入</strong>。您可以用手機無痕視窗打開 <span className="font-mono">https://hhcat.cc</span> 瀏覽並試算一次，這裡就會立刻顯示每日、每週、每月、每年真實拜訪人數與裝置來源！
                  </p>
                </div>
              ) : (
                <>
                  {/* Trend Chart + Device & Source Analytics */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left: Continuous Trend Chart */}
                    <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 p-5 flex flex-col justify-between space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-sm text-stone-900">
                            {granularity === 'daily'
                              ? `每日拜訪人數 vs 計算機人數（連續 ${chartSeries.length} 天）`
                              : granularity === 'weekly'
                                ? '每週真實不重複人數 vs 計算機人數'
                                : granularity === 'monthly'
                                  ? '每月真實不重複人數 vs 計算機人數'
                                  : '每年真實不重複人數 vs 計算機人數'}
                          </h3>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            游標移至或點擊長條可檢視該期完整數字
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-stone-600">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-xs bg-amber-800 inline-block" />
                            <span>拜訪人數</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                            <span>計算機人數</span>
                          </span>
                        </div>
                      </div>

                      {/* Hover readout bar */}
                      <div className="min-h-[30px] px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-100 text-xs flex flex-wrap items-center justify-between gap-2 font-mono tabular-nums">
                        {hoveredChartIdx !== null && chartSeries[hoveredChartIdx] ? (
                          <>
                            <span className="font-sans font-semibold text-stone-800">
                              {chartSeries[hoveredChartIdx].label}
                            </span>
                            <span className="text-stone-600">
                              拜訪 <strong className="text-amber-900">{chartSeries[hoveredChartIdx].uniqueVisitors}</strong> 人 · 瀏覽{' '}
                              <strong>{chartSeries[hoveredChartIdx].pageViews}</strong> 次 · 計算機{' '}
                              <strong className="text-emerald-700">{chartSeries[hoveredChartIdx].estimatorUsers}</strong> 人 ({chartSeries[hoveredChartIdx].estimatorActions} 調整) · 諮詢{' '}
                              <strong>
                                {chartSeries[hoveredChartIdx].lineQuotes +
                                  chartSeries[hoveredChartIdx].phoneClicks +
                                  chartSeries[hoveredChartIdx].qrOpens}
                              </strong>
                            </span>
                          </>
                        ) : (
                          <span className="font-sans text-stone-400">
                            將游標移至下方長條圖，即時檢視單日／單週／單月／單年數據
                          </span>
                        )}
                      </div>

                      {/* Bar Chart Area */}
                      <div className="h-48 flex items-end gap-1.5 sm:gap-2.5 pt-4 pb-1 border-b border-stone-200 overflow-x-auto">
                        {chartSeries.map((item, idx) => {
                          const vHeight =
                            item.uniqueVisitors > 0
                              ? Math.max(8, Math.round((item.uniqueVisitors / maxChartValue) * 100))
                              : 2;
                          const eHeight =
                            item.estimatorUsers > 0
                              ? Math.max(8, Math.round((item.estimatorUsers / maxChartValue) * 100))
                              : 2;
                          return (
                            <div
                              key={item.key}
                              onMouseEnter={() => setHoveredChartIdx(idx)}
                              onClick={() => setHoveredChartIdx(idx)}
                              className={`flex-1 min-w-[26px] h-full flex flex-col justify-end items-center gap-1 cursor-pointer rounded-t-lg px-0.5 transition-colors ${
                                hoveredChartIdx === idx ? 'bg-amber-50/70' : 'hover:bg-stone-50'
                              }`}
                            >
                              <div className="w-full flex-1 flex items-end justify-center gap-1">
                                <div
                                  style={{ height: `${vHeight}%` }}
                                  className={`w-2.5 sm:w-3.5 rounded-t-xs transition-all ${
                                    item.uniqueVisitors > 0 ? 'bg-amber-800' : 'bg-stone-200'
                                  }`}
                                  title={`${item.label} 拜訪人數：${item.uniqueVisitors}`}
                                />
                                <div
                                  style={{ height: `${eHeight}%` }}
                                  className={`w-2.5 sm:w-3.5 rounded-t-xs transition-all ${
                                    item.estimatorUsers > 0 ? 'bg-emerald-600' : 'bg-stone-200'
                                  }`}
                                  title={`${item.label} 計算機人數：${item.estimatorUsers}`}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-stone-500 whitespace-nowrap">
                                {item.shortLabel}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: Device & Traffic Source + Top Models */}
                    <div className="lg:col-span-5 space-y-5">
                      {/* Device & Source Card */}
                      <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-sm text-stone-900">訪客裝置與來源管道</h3>
                          <span className="text-[11px] font-mono text-stone-400">
                            樣本 {totalDeviceTracked} 人
                          </span>
                        </div>

                        {/* Device Breakdown */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="inline-flex items-center gap-1.5 text-stone-700 font-medium">
                              <Smartphone className="w-3.5 h-3.5 text-amber-800" />
                              <span>手機版 ({mobilePct}%)</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-stone-600 font-medium">
                              <Monitor className="w-3.5 h-3.5 text-stone-500" />
                              <span>電腦 / 平板 ({desktopPct}%)</span>
                            </span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-stone-100 overflow-hidden flex">
                            <div
                              style={{ width: `${mobilePct}%` }}
                              className="h-full bg-amber-800 transition-all"
                            />
                            <div
                              style={{ width: `${desktopPct}%` }}
                              className="h-full bg-stone-400 transition-all"
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-stone-500">
                            <span>{activeSummary.deviceMobile} 人</span>
                            <span>{activeSummary.deviceDesktop} 人</span>
                          </div>
                        </div>

                        {/* Source Breakdown */}
                        <div className="pt-3 border-t border-stone-100 space-y-2">
                          <div className="text-xs font-medium text-stone-700 flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-emerald-700" />
                            <span>進站流量來源</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                              <span className="text-[11px] text-stone-500 block">Google 等搜尋</span>
                              <span className="font-mono tabular-nums font-bold text-stone-900 text-sm">
                                {activeSummary.srcSearch} 人
                              </span>
                              <span className="text-[10px] font-mono text-stone-400 block">
                                {searchPct}%
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                              <span className="text-[11px] text-stone-500 block">FB / IG / LINE</span>
                              <span className="font-mono tabular-nums font-bold text-stone-900 text-sm">
                                {activeSummary.srcSocial} 人
                              </span>
                              <span className="text-[10px] font-mono text-stone-400 block">
                                {socialPct}%
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                              <span className="text-[11px] text-stone-500 block">直接輸入 / 其他</span>
                              <span className="font-mono tabular-nums font-bold text-stone-900 text-sm">
                                {activeSummary.srcDirect} 人
                              </span>
                              <span className="text-[10px] font-mono text-stone-400 block">
                                {directPct}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Top Models Compact Card */}
                      <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-sm text-stone-900">熱門貓別墅獨立頁排行</h3>
                            <p className="text-[11px] text-stone-500 mt-0.5">
                              單品頁瀏覽與傳 LINE 詢價排行
                            </p>
                          </div>
                          <span className="text-[11px] font-mono text-stone-400">
                            TOP {topModels.length}
                          </span>
                        </div>

                        {topModels.length === 0 ? (
                          <div className="py-6 text-center text-xs text-stone-400">
                            此區間尚無單獨款式頁瀏覽紀錄
                          </div>
                        ) : (
                          <div className="divide-y divide-stone-100 max-h-52 overflow-y-auto pr-1">
                            {topModels.map((m, idx) => (
                              <div
                                key={m.modelId}
                                className="py-2 flex items-center justify-between gap-3 text-xs"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="w-5 h-5 rounded-md bg-stone-100 text-stone-700 font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                                    {idx + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="font-semibold text-stone-900 truncate">
                                      {m.modelName}
                                    </div>
                                    <div className="text-[10px] font-mono text-stone-400 truncate">
                                      /villa/{m.modelId}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right font-mono tabular-nums shrink-0">
                                  <span className="font-bold text-stone-900">{m.views} 看</span>
                                  <span className="text-stone-300 mx-1">/</span>
                                  <span className="text-emerald-700 font-semibold">
                                    {m.lineQuotes} 詢
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Data Table */}
                  <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between gap-2">
                      <h3 className="font-bold text-sm text-stone-900">
                        {granularity === 'daily'
                          ? '每日網站觀看與計算機明細表'
                          : granularity === 'weekly'
                            ? '每週真實去重統計明細表'
                            : granularity === 'monthly'
                              ? '每月真實去重統計明細表'
                              : '每年真實去重統計明細表'}
                      </h3>
                      <span className="text-xs text-stone-500 font-mono tabular-nums">
                        共 {activeRows.length} 筆
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-stone-50 border-b border-stone-200 text-stone-600">
                            <th className="py-2.5 px-4 font-semibold whitespace-nowrap">統計時間</th>
                            <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                              {granularity === 'daily' ? '拜訪人數' : '不重複人數'}
                            </th>
                            {granularity !== 'daily' && (
                              <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                                跨日回訪人次
                              </th>
                            )}
                            <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                              總瀏覽次
                            </th>
                            <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                              計算機人數
                            </th>
                            <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                              試算調整
                            </th>
                            <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                              <span className="inline-flex items-center gap-1">
                                <Copy className="w-3 h-3" />
                                複製
                              </span>
                            </th>
                            <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                              <span className="inline-flex items-center gap-1">
                                <MessageCircle className="w-3 h-3 text-[#06C755]" />
                                LINE
                              </span>
                            </th>
                            <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                              <span className="inline-flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                電話
                              </span>
                            </th>
                            <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                              <span className="inline-flex items-center gap-1">
                                <QrCode className="w-3 h-3" />
                                QR
                              </span>
                            </th>
                            <th className="py-2.5 px-4 font-semibold text-right whitespace-nowrap">
                              <span className="inline-flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" />
                                單品 / 門市頁
                              </span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {activeRows.map((row) => (
                            <tr key={row.key} className="hover:bg-stone-50/80 transition-colors">
                              <td className="py-2.5 px-4 font-medium text-stone-900 whitespace-nowrap font-mono">
                                {row.label}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-amber-900">
                                {row.uniqueVisitors.toLocaleString()}
                              </td>
                              {granularity !== 'daily' && (
                                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-stone-500">
                                  {row.dailyVisitHits.toLocaleString()}
                                </td>
                              )}
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-stone-700">
                                {row.pageViews.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-emerald-700">
                                {row.estimatorUsers.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-stone-600">
                                {row.estimatorActions.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-stone-600">
                                {row.estimatorCopies.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-[#059669]">
                                {row.lineQuotes.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-stone-600">
                                {row.phoneClicks.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-stone-600">
                                {row.qrOpens.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono tabular-nums text-stone-500">
                                {row.productPageViews} / {row.showroomPageViews}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
