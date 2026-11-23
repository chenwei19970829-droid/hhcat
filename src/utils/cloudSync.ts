export const FIRESTORE_CONSOLE_URL =
  'https://console.firebase.google.com/project/gen-lang-client-0675160212/firestore/databases/ai-studio-0eb43169-fc2e-4d1c-873c-6aa9069c80d5/data?openUpgradeDialog=true';

export const TARGET_FIRESTORE_DOC_BYTES = 760_000;
export const HARD_FIRESTORE_DOC_BYTES = 920_000;

export function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || '');
  return /resource[-_]exhausted|quota\s*exceeded|429|free daily read units/i.test(msg);
}

export function isSizeLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || '');
  return /exceeds the maximum allowed size|longer than|1048\d{3}|invalid-argument|payload.*too large/i.test(msg);
}

export function formatFirestoreActionError(err: unknown, actionLabel: string): string {
  const msg = err instanceof Error ? err.message : String(err || '');
  if (isQuotaError(err)) {
    const isReadAction = /^(讀取|手動重整)/.test(actionLabel.trim());
    if (isReadAction) {
      return '今日 Firebase 免費「讀取」額度已達上限（Quota exceeded：訪客瀏覽、爬蟲或重新整理網頁都會消耗每日讀取額度，並非您今天上傳失敗）。目前先顯示本機已快取的照片，請等待每日額度重置（台灣時間約下午 3～4 點）或至 Firebase Console 確認方案。';
    }
    return '今日 Firebase 免費讀寫額度已達上限（Quota exceeded），目前無法同步寫入雲端，所以手機端暫時看不到本次變更。請等待每日額度重置（台灣時間約下午 3～4 點）或前往 Firebase Console 確認方案，目前您編輯的內容未遺失。';
  }
  if (isSizeLimitError(err)) {
    return '單筆照片與資料總容量超過雲端 Firestore 1MB 上限（手機將無法同步），請減少幾張照片後重新儲存。';
  }
  if (/permission[-_]denied|missing or insufficient permissions/i.test(msg)) {
    return `${actionLabel}失敗：雲端資料庫存取權限不足（Permission Denied），請確認規則已部署或重新授權。`;
  }
  if (/offline|network|unavailable|failed to fetch/i.test(msg)) {
    return `${actionLabel}失敗：目前網路不穩或無法連線至雲端資料庫，請檢查連線後再試。`;
  }
  return `${actionLabel}失敗（${msg || '未知錯誤'}），請稍後再試。`;
}

export function estimateUtf8Bytes(value: unknown): number {
  const json = JSON.stringify(value);
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(json).length;
  }
  return json.length * 2;
}

export function recompressDataUrl(
  dataUrl: string,
  maxDimension: number,
  quality: number
): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export interface FitImagesOptions {
  primaryField?: string;
  arrayField?: string;
}

export async function fitImagesWithinFirestoreLimit(
  images: string[],
  metaFields: Record<string, unknown>,
  options: FitImagesOptions = {}
): Promise<
  | { ok: true; images: string[]; estimatedBytes: number }
  | { ok: false; reason: string; estimatedBytes: number }
> {
  const primaryField = options.primaryField ?? 'imageUrl';
  const arrayField = options.arrayField;

  const calcTotal = (imgs: string[]) => {
    const payload: Record<string, unknown> = {
      ...metaFields,
      [primaryField]: imgs[0] || ''
    };
    if (arrayField) {
      payload[arrayField] = imgs;
    }
    return estimateUtf8Bytes(payload);
  };

  const initialBytes = calcTotal(images);
  if (initialBytes <= TARGET_FIRESTORE_DOC_BYTES) {
    return { ok: true, images, estimatedBytes: initialBytes };
  }

  const tiers: Array<[number, number]> = [
    [720, 0.62],
    [580, 0.52],
    [480, 0.44],
    [400, 0.36]
  ];

  let current = [...images];
  for (const [maxDim, quality] of tiers) {
    current = await Promise.all(current.map((img) => recompressDataUrl(img, maxDim, quality)));
    const bytes = calcTotal(current);
    if (bytes <= TARGET_FIRESTORE_DOC_BYTES) {
      return { ok: true, images: current, estimatedBytes: bytes };
    }
  }

  const finalBytes = calcTotal(current);
  if (finalBytes <= HARD_FIRESTORE_DOC_BYTES) {
    return { ok: true, images: current, estimatedBytes: finalBytes };
  }

  return {
    ok: false,
    estimatedBytes: finalBytes,
    reason:
      '照片張數過多導致總容量超過雲端單筆 1MB 上限（手機將無法同步），建議每筆保留 1～8 張精選角度後再發佈。'
  };
}

export function loadRecoveryQueue<T>(storageKey: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecoveryQueue<T>(storageKey: string, items: T[]) {
  if (typeof window === 'undefined') return;
  try {
    if (items.length === 0) {
      localStorage.removeItem(storageKey);
    } else {
      localStorage.setItem(storageKey, JSON.stringify(items));
    }
  } catch (err) {
    console.warn('Could not persist recovery queue:', err);
  }
}
