import React from 'react';
import {
  AlertTriangle,
  CheckCircle,
  CloudOff,
  ExternalLink,
  RefreshCw,
  X
} from 'lucide-react';
import { FIRESTORE_CONSOLE_URL } from '../utils/cloudSync';

export interface CloudErrorState {
  message: string;
  isQuota: boolean;
}

export interface RecoveryDisplayItem {
  id: string;
  title: string;
  subtitle: string;
  thumbnailUrl?: string;
}

interface CloudSyncStatusBarProps {
  sectionLabel: string;
  cloudError: CloudErrorState | null;
  onDismissError: () => void;
  onRetrySync?: () => void;
  syncNoticeBanner: string | null;
  onDismissNotice: () => void;
  recoveryItems?: RecoveryDisplayItem[];
  isSyncing?: boolean;
  onSyncRecoveryItem?: (id: string) => void;
  onDiscardRecoveryItem?: (id: string) => void;
  onSyncAllRecoveryItems?: () => void;
}

export const CloudSyncStatusBar: React.FC<CloudSyncStatusBarProps> = ({
  sectionLabel,
  cloudError,
  onDismissError,
  onRetrySync,
  syncNoticeBanner,
  onDismissNotice,
  recoveryItems = [],
  isSyncing = false,
  onSyncRecoveryItem,
  onDiscardRecoveryItem,
  onSyncAllRecoveryItems
}) => {
  return (
    <>
      {cloudError && (
        <div className="mb-6 p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs sm:text-sm text-rose-950 space-y-2 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <CloudOff className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-rose-900">
                  「{sectionLabel}」雲端同步異常（這就是手機／平板與電腦看到不同內容的原因）
                </div>
                <p className="text-rose-800 leading-relaxed">{cloudError.message}</p>
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  {cloudError.isQuota && (
                    <a
                      href={FIRESTORE_CONSOLE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>開啟 Firebase Firestore 資料庫與額度面板</span>
                    </a>
                  )}
                  {onRetrySync && (
                    <button
                      type="button"
                      onClick={onRetrySync}
                      disabled={isSyncing}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-900 text-xs font-semibold hover:bg-rose-100 disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>重試雲端連線</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onDismissError}
              className="p-1 text-rose-600 hover:bg-rose-100 rounded-lg shrink-0"
              title="關閉錯誤通知"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {recoveryItems.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl text-xs space-y-3 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-2 text-amber-950">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm">
                  偵測到 {recoveryItems.length} 筆「{sectionLabel}」僅存於此裝置本機、尚未成功同步至雲端（手機目前看不到）
                </div>
                <p className="text-amber-900 mt-0.5 leading-relaxed">
                  通常是因為先前照片過大超過雲端 1MB 上限或當時額度／網路受限。當雲端恢復連線後，點擊「壓縮並補傳至雲端」即可補發讓所有手機、電腦、平板同步看到。
                </p>
              </div>
            </div>
            {recoveryItems.length > 1 && onSyncAllRecoveryItems && (
              <button
                type="button"
                disabled={isSyncing}
                onClick={onSyncAllRecoveryItems}
                className="px-3.5 py-2 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-semibold transition-colors disabled:opacity-50 shrink-0"
              >
                {isSyncing ? '正在補傳...' : `一鍵壓縮補傳全部 (${recoveryItems.length} 筆)`}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {recoveryItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-amber-200"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.thumbnailUrl && (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-11 h-11 rounded-lg object-cover border border-stone-200 shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-stone-900 truncate">{item.title}</div>
                    <div className="text-[11px] text-stone-500 font-mono truncate">{item.subtitle}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {onSyncRecoveryItem && (
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={() => onSyncRecoveryItem(item.id)}
                      className="px-3 py-1.5 rounded-lg bg-amber-900 hover:bg-amber-800 text-white font-semibold transition-colors disabled:opacity-50"
                    >
                      壓縮並補傳至雲端
                    </button>
                  )}
                  {onDiscardRecoveryItem && (
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={() => onDiscardRecoveryItem(item.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold transition-colors"
                    >
                      捨棄本機暫存
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {syncNoticeBanner && (
        <div className="mb-6 p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm text-emerald-950 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="font-semibold">{syncNoticeBanner}</span>
          </div>
          <button
            type="button"
            onClick={onDismissNotice}
            className="p-1 text-emerald-700 hover:bg-emerald-100 rounded-lg shrink-0"
            title="關閉提示"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
};
