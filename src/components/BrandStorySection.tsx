import React, { useState, useEffect, useRef } from 'react';
import {
  HUA_HUA_STORY,
  HuaHuaPhoto,
  STORE_INFO,
  DEPTH_SURCHARGE_TIERS,
  HEIGHT_SURCHARGE_TIERS
} from '../data/catVillaData';
import {
  Heart,
  Calendar,
  Sparkles,
  Camera,
  Upload,
  Plus,
  Trash2,
  Maximize2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  MessageCircle,
  Clock,
  Instagram,
  Facebook
} from 'lucide-react';

interface BrandStorySectionProps {
  onOpenImageZoom?: (title: string, imageUrl: string, subtitle?: string) => void;
}

const LOCAL_STORAGE_KEY = 'huahua_brand_custom_photos_v1';

export const BrandStorySection: React.FC<BrandStorySectionProps> = ({ onOpenImageZoom }) => {
  // Timeline photos state: merges curated photos + user uploaded photos
  const [customPhotos, setCustomPhotos] = useState<HuaHuaPhoto[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New photo form state
  const [newTitle, setNewTitle] = useState('');
  const [newAgeStage, setNewAgeStage] = useState('');
  const [newDateStr, setNewDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [newCaption, setNewCaption] = useState('');
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // Load custom photos from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCustomPhotos(parsed);
        }
      }
    } catch (err) {
      console.warn('Failed to parse saved custom Hua Hua photos', err);
    }
  }, []);

  // Save to localStorage
  const saveCustomPhotos = (photos: HuaHuaPhoto[]) => {
    setCustomPhotos(photos);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(photos));
    } catch (err) {
      console.warn('Failed to save to localStorage', err);
    }
  };

  const allPhotos: HuaHuaPhoto[] = [...HUA_HUA_STORY.initialPhotos, ...customPhotos];

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('請選擇圖片檔案（JPG / PNG / WebP）');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setFormError('圖片大小請小於 8MB');
      return;
    }

    setFormError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setPreviewDataUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleAddPhotoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewDataUrl) {
      setFormError('請先選擇並預覽要上傳的花花照片');
      return;
    }
    if (!newTitle.trim()) {
      setFormError('請輸入照片標題');
      return;
    }

    const newPhotoItem: HuaHuaPhoto = {
      id: `hh-custom-${Date.now()}`,
      title: newTitle.trim(),
      ageStage: newAgeStage.trim() || '幸福日常',
      dateStr: newDateStr || '近期拍攝',
      imageUrl: previewDataUrl,
      storyCaption: newCaption.trim() || '花花在門店的可愛留影',
      isCustomUpload: true
    };

    const updated = [...customPhotos, newPhotoItem];
    saveCustomPhotos(updated);

    // Reset form
    setNewTitle('');
    setNewAgeStage('');
    setNewCaption('');
    setPreviewDataUrl('');
    setFormError('');
    setIsUploadModalOpen(false);
  };

  const handleDeleteCustomPhoto = (id: string) => {
    if (window.confirm('確定要移除此張自訂的花花照片嗎？')) {
      const updated = customPhotos.filter((p) => p.id !== id);
      saveCustomPhotos(updated);
    }
  };

  return (
    <section id="story" className="py-16 sm:py-24 bg-[#FAF7F2] border-b border-stone-200 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-amber-900 bg-amber-500/10 border border-amber-600/20 mb-3">
            <Heart className="w-3.5 h-3.5 text-amber-800 fill-amber-800" />
            <span>Brand Story & Muse · 品牌背後的故事</span>
          </div>
          <h2 className="font-serif-title text-2xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            店名「花花招財貓」的由來與初心
          </h2>
          <p className="text-sm sm:text-base text-stone-600 mt-2 leading-relaxed">
            不想讓貓咪住到爛木頭！純實木板厚度足足 1.5cm，從親手接生剪臍帶的早產貓「花花」，到打造每一座溫暖堅固的健康城堡。
          </p>
        </div>

        {/* Brand Narrative Card & Hua Hua Bio */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-14">
          {/* Left Column: Founder Journey & Core Mission */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-stone-100 pb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                Founding Journey
              </span>
              <h3 className="font-serif-title text-xl sm:text-2xl font-bold text-stone-900 mt-0.5">
                一隻早產貓，改變了我們對「貓別墅」的堅持
              </h3>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-stone-700 leading-relaxed">
              {HUA_HUA_STORY.biography.map((paragraph, idx) => (
                <p key={idx} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Core Mission Banner */}
            <div className="p-4 sm:p-5 bg-amber-50 rounded-xl border border-amber-200/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-950 uppercase tracking-wide">
                <ShieldCheck className="w-4 h-4 text-amber-800 shrink-0" />
                <span>店長核心承諾 · 純實木板厚度 1.5cm</span>
              </div>
              <p className="text-xs sm:text-sm text-amber-900 font-medium leading-relaxed">
                {HUA_HUA_STORY.missionStatement}
              </p>
              <p className="text-[11px] text-stone-500 pt-1 border-t border-amber-200/60">
                網路上許多標榜實木的產品使用廉價薄木板、合成夾板甚至貼皮，容易吸濕發霉且散發化學膠味。花花招財貓堅持全實木1.5cm紮實厚度，經久耐用數十年。
              </p>
            </div>

            {/* Social Media Links & Store Visit Notice */}
            <div className="pt-2 border-t border-stone-100 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={STORE_INFO.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl transition-colors"
                >
                  <Facebook className="w-3.5 h-3.5 text-blue-600" />
                  <span>FB 粉絲專頁：花花招財貓</span>
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </a>

                <a
                  href={STORE_INFO.threadsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl transition-colors"
                >
                  <span className="font-mono text-xs font-bold">@</span>
                  <span>Threads：hhcat.1226</span>
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </a>

                <a
                  href={STORE_INFO.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl transition-colors"
                >
                  <Instagram className="w-3.5 h-3.5 text-pink-600" />
                  <span>IG：hhcat.1226</span>
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </a>
              </div>

              {/* Store Reservation Warning */}
              <div className="p-3.5 bg-rose-50/80 rounded-xl border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">⚠️ 門店參觀請務必提前預約：</strong>
                  <span>{STORE_INFO.storeNotice}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Muse Profile Card & Custom Photo 1:1 Promise */}
          <div className="lg:col-span-5 space-y-6">
            {/* Hua Hua Profile Card */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div>
                  <div className="text-[11px] font-bold text-amber-800 tracking-wider uppercase">
                    Honorary Store Manager
                  </div>
                  <h4 className="font-serif-title text-xl font-bold text-stone-900">
                    {HUA_HUA_STORY.catName}
                  </h4>
                </div>
                <span className="px-2.5 py-1 text-[11px] font-semibold text-amber-900 bg-amber-100/70 rounded-full">
                  {HUA_HUA_STORY.role}
                </span>
              </div>

              {/* Bio Meta Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                  <span className="text-[11px] text-stone-400 block">出生日期</span>
                  <span className="font-bold text-stone-800">{HUA_HUA_STORY.birthday}</span>
                </div>
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                  <span className="text-[11px] text-stone-400 block">性別 / 狀態</span>
                  <span className="font-bold text-stone-800">{HUA_HUA_STORY.gender}</span>
                </div>
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                  <span className="text-[11px] text-stone-400 block">品種毛色</span>
                  <span className="font-bold text-stone-800">{HUA_HUA_STORY.breed}</span>
                </div>
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                  <span className="text-[11px] text-stone-400 block">實體門店</span>
                  <span className="font-bold text-stone-800">臺中豐原圓環西路97號</span>
                </div>
              </div>

              {/* Latest Hero Photo of Hua Hua */}
              <div
                className="relative rounded-xl overflow-hidden aspect-4/3 bg-stone-100 border border-stone-200 cursor-pointer group"
                onClick={() =>
                  onOpenImageZoom &&
                  onOpenImageZoom(
                    '花花（榮譽店長）實拍',
                    '/assets/aistudio/8fdb297a6c7229bdd19a04f83e4243b_0047682f.jpg',
                    '2021年6月23日出生，英短藍貓（母貓已絕育）。打個大哈欠，滿滿幸福安全感！'
                  )
                }
                title="點擊放大查看花花"
              >
                <img
                  src="/assets/aistudio/8fdb297a6c7229bdd19a04f83e4243b_0047682f.jpg"
                  alt="花花在實木貓別墅打哈欠"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 right-3 text-white flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold">打個大哈欠 滿滿幸福安全感</div>
                    <div className="text-[10px] text-stone-200">2021/6/23生 · 英短藍貓（已絕育）</div>
                  </div>
                  <div className="p-1.5 bg-black/40 backdrop-blur-xs rounded-lg text-white">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Surcharge & Photo 1:1 Promise Box */}
            <div className="bg-[#FAF5EC] rounded-2xl border border-amber-900/15 p-5 space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase">
                <Sparkles className="w-4 h-4 text-amber-800" />
                <span>客製化深度、高度與 1:1 照圖打造</span>
              </div>

              <div className="text-xs text-stone-700 space-y-2">
                <p className="leading-relaxed">
                  <strong>📸 依圖 1:1 客製：</strong>您可以把在網路上看到的照片或喜愛的款式發給店長，我這邊皆可直接<strong>【依照照片量身製作】</strong>！
                </p>
                <p className="leading-relaxed">
                  <strong>📐 尺寸隨意修改：</strong>高度、深度、長度皆可客製。深度超過60cm或高度超過180cm每10cm一個計費區間：
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-xl border border-stone-200 font-mono">
                  <div>
                    <span className="text-stone-400 block">深度超過 60cm：</span>
                    <span className="font-bold text-amber-900">每 +10cm 加收 $3,000</span>
                    <span className="text-[10px] text-stone-500 block">(例 61-70cm +3000, 71-80 +6000)</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block">高度超過 180cm：</span>
                    <span className="font-bold text-amber-900">每 +10cm 加收 $1,000</span>
                    <span className="text-[10px] text-stone-500 block">(例 181-190cm +1000, 191-200 +2000)</span>
                  </div>
                </div>
                <p className="text-[11px] text-stone-500">
                  ※ 客製化安裝費用會根據尺寸大小與內部樣式變動；若現場無電梯需爬樓梯搬運，需額外提前報備加收樓層費，具體請加 LINE 諮詢。
                </p>
              </div>

              <a
                href={`${STORE_INFO.lineUrl}?text=${encodeURIComponent(
                  '您好！我想提供我喜歡的款式照片諮詢 1:1 客製化實木貓別墅，想討論尺寸與排單報價！'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-[#06C755] hover:bg-[#05b34c] rounded-xl shadow-xs transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>傳照片至 LINE 諮詢 1:1 客製</span>
              </a>
            </div>
          </div>
        </div>

        {/* Chronological Photo Gallery of Hua Hua's Growth */}
        <div className="pt-8 border-t border-stone-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                Growth Chronicles
              </div>
              <h3 className="font-serif-title text-xl sm:text-2xl font-bold text-stone-900 mt-0.5">
                花花成長歷程寫真（出生到長大依序排列）
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                記錄花花從早產只有巴掌大、針筒人工餵養，到健康長大成為門店小店長與城堡主人的珍貴時刻
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-amber-900 bg-amber-100/80 hover:bg-amber-200/90 border border-amber-300 rounded-xl transition-all self-start sm:self-auto shrink-0 shadow-xs"
            >
              <Upload className="w-4 h-4 text-amber-900" />
              <span>上傳花花新照片 / 成長紀錄</span>
            </button>
          </div>

          {/* Timeline Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {allPhotos.map((photo, index) => (
              <div
                key={photo.id}
                className="bg-white rounded-xl border border-stone-200 overflow-hidden hover:shadow-md hover:border-amber-800/40 transition-all flex flex-col group relative"
              >
                {/* Photo Thumbnail */}
                <div
                  className="relative aspect-4/3 bg-stone-100 cursor-pointer overflow-hidden flex items-center justify-center"
                  onClick={() =>
                    onOpenImageZoom &&
                    onOpenImageZoom(
                      photo.title,
                      photo.imageUrl,
                      `${photo.ageStage} · ${photo.dateStr} · ${photo.storyCaption}`
                    )
                  }
                  title="點擊放大觀看照片"
                >
                  <img
                    src={photo.imageUrl}
                    alt={photo.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Stage Badge on Top Left */}
                  <div className="absolute top-2.5 left-2.5 bg-stone-900/80 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-2xs">
                    {index + 1}. {photo.ageStage}
                  </div>

                  {/* Zoom indicator */}
                  <div className="absolute top-2.5 right-2.5 p-1.5 bg-white/80 backdrop-blur-xs rounded-md text-stone-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>

                  {/* Custom upload tag if applicable */}
                  {photo.isCustomUpload && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCustomPhoto(photo.id);
                      }}
                      className="absolute bottom-2.5 right-2.5 p-1.5 bg-red-600/90 text-white rounded-md hover:bg-red-700 transition-colors shadow-xs"
                      title="刪除此張自訂照片"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Caption & Metadata */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-1.5">
                  <div>
                    <h5 className="font-bold text-stone-900 text-xs line-clamp-1 group-hover:text-amber-900 transition-colors">
                      {photo.title}
                    </h5>
                    <div className="text-[11px] text-stone-500 line-clamp-2 mt-1 leading-snug">
                      {photo.storyCaption}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-stone-400" />
                      {photo.dateStr}
                    </span>
                    <span className="text-amber-800 font-medium">花花招財貓</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal for Store Owner to Upload New Photos of Hua Hua */}
      {isUploadModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setIsUploadModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200 relative animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <h4 className="font-serif-title font-bold text-stone-900 text-base">
                  上傳花花新照片 / 成長寫真
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPhotoSubmit} className="space-y-3.5 text-xs">
              {/* File input */}
              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  選擇照片檔案 (支援 JPG / PNG / WebP)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="w-full text-xs text-stone-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-900 hover:file:bg-amber-200 cursor-pointer"
                />
              </div>

              {/* Preview Box */}
              {previewDataUrl && (
                <div className="relative rounded-xl overflow-hidden aspect-4/3 bg-stone-100 border border-stone-200 max-h-48 mx-auto">
                  <img
                    src={previewDataUrl}
                    alt="上傳預覽"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  照片標題 *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例如：花花在門店巡視貓別墅、花花一歲生日..."
                  required
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                />
              </div>

              {/* Age stage & Date row */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    成長階段 / 年齡
                  </label>
                  <input
                    type="text"
                    value={newAgeStage}
                    onChange={(e) => setNewAgeStage(e.target.value)}
                    placeholder="例如：3歲成貓、店長上班"
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    拍攝日期
                  </label>
                  <input
                    type="text"
                    value={newDateStr}
                    onChange={(e) => setNewDateStr(e.target.value)}
                    placeholder="例如：2026年近期"
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                  />
                </div>
              </div>

              {/* Story Description */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  照片故事簡述
                </label>
                <textarea
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  rows={2}
                  placeholder="簡短描述當時的故事或花花有趣的舉動..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                />
              </div>

              {formError && (
                <div className="p-2 bg-red-50 text-red-700 rounded-lg text-xs">
                  {formError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-amber-900 hover:bg-amber-800 text-white font-semibold rounded-xl transition-colors shadow-xs"
                >
                  儲存並加入成長相冊
                </button>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl transition-colors"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
