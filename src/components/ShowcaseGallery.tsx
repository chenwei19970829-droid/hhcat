import React, { useState, useEffect, useRef } from 'react';
import { ShowcasePhoto, INITIAL_SHOWCASE_PHOTOS, STORE_INFO } from '../data/catVillaData';
import { Upload, Plus, Filter, Maximize2, Trash2, CheckCircle, Image as ImageIcon, MessageCircle, AlertCircle } from 'lucide-react';

interface ShowcaseGalleryProps {
  onOpenImageZoom: (title: string, imageUrl: string, subtitle?: string) => void;
}

const STORAGE_KEY = 'huahua_custom_showcase_photos_v1';

export const ShowcaseGallery: React.FC<ShowcaseGalleryProps> = ({ onOpenImageZoom }) => {
  const [photos, setPhotos] = useState<ShowcasePhoto[]>([]);
  const [selectedSize, setSelectedSize] = useState<'all' | '60' | '90' | '120' | '150' | '180'>('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Upload Form State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSizeCategory, setUploadSizeCategory] = useState<'60' | '90' | '120' | '150' | '180'>('120');
  const [uploadDimensions, setUploadDimensions] = useState('150-60-120');
  const [uploadCustomerNote, setUploadCustomerNote] = useState('');
  const [uploadTags, setUploadTags] = useState('客製實品, 實木貓屋');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load photos from localStorage or fallback to initial
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPhotos(parsed);
      } else {
        setPhotos(INITIAL_SHOWCASE_PHOTOS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SHOWCASE_PHOTOS));
      }
    } catch {
      setPhotos(INITIAL_SHOWCASE_PHOTOS);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('請上傳有效的圖片檔案（JPG、PNG、WEBP 等）');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setUploadError('圖片檔案大小請在 8MB 以內');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewImage) {
      setUploadError('請先選擇要上傳的貓別墅實品照片！');
      return;
    }

    if (!uploadTitle.trim()) {
      setUploadError('請輸入作品名稱或款式標題');
      return;
    }

    setIsUploading(true);

    const newPhoto: ShowcasePhoto = {
      id: `custom-${Date.now()}`,
      title: uploadTitle.trim(),
      sizeCategory: uploadSizeCategory,
      dimensionsText: uploadDimensions.trim() || `${uploadSizeCategory}cm 系列`,
      imageUrl: previewImage,
      customerNote: uploadCustomerNote.trim() || '店主精選客製實品照，支援同款專屬訂製。',
      date: '剛剛新增',
      tags: uploadTags.split(/[,， ]+/).filter(Boolean),
      isCustomUpload: true
    };

    const updated = [newPhoto, ...photos];
    setPhotos(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('LocalStorage limit reached or disabled:', err);
    }

    // Reset Form
    setIsUploading(false);
    setIsUploadModalOpen(false);
    setPreviewImage(null);
    setUploadTitle('');
    setUploadCustomerNote('');
    setSelectedSize(uploadSizeCategory); // Auto jump to the uploaded category!
  };

  const handleDeletePhoto = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('確定要刪除這張客製實品照片嗎？')) return;

    const updated = photos.filter((p) => p.id !== id);
    setPhotos(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPhotos = photos.filter((photo) => {
    if (selectedSize === 'all') return true;
    return photo.sizeCategory === selectedSize;
  });

  return (
    <section id="showcase" className="py-16 sm:py-20 bg-[#FAF7F2] border-b border-stone-200 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading & Owner Upload Button */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Customer Gallery & Showcase
            </div>
            <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
              客製實品相冊 · 依尺寸一目瞭然
            </h2>
            <p className="text-sm text-stone-600 mt-1 max-w-2xl">
              店主用心為每位毛孩量身打造的真實完工照！您可以直接依照尺寸分類快速瀏覽對應款式，店主亦可隨時在線擴充最新完工作品。
            </p>
          </div>

          {/* Action: Open Upload Modal */}
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-xl shadow-xs transition-all self-start md:self-auto active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ 店主上傳客製實品照</span>
          </button>
        </div>

        {/* Size Filter Pills / Segmented Bar */}
        <div className="flex flex-wrap items-center gap-2 pb-6 border-b border-stone-200">
          <span className="text-xs text-stone-500 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            <span>尺寸篩選：</span>
          </span>

          <button
            type="button"
            onClick={() => setSelectedSize('all')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
              selectedSize === 'all'
                ? 'bg-amber-900 text-white shadow-xs font-semibold'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            全部實品 ({photos.length})
          </button>

          {(['60', '90', '120', '150', '180'] as const).map((size) => {
            const count = photos.filter((p) => p.sizeCategory === size).length;
            return (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  selectedSize === size
                    ? 'bg-amber-900 text-white shadow-xs font-semibold'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                {size}cm 系列 ({count})
              </button>
            );
          })}
        </div>

        {/* Photos Grid */}
        {filteredPhotos.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-stone-300 mt-6">
            <ImageIcon className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-sm text-stone-600 font-medium">
              目前 {selectedSize}cm 系列尚未有實品照
            </p>
            <p className="text-xs text-stone-400 mt-1">
              歡迎點擊上方「+ 店主上傳客製實品照」立即新增此尺寸照片！
            </p>
            <button
              type="button"
              onClick={() => {
                setUploadSizeCategory(selectedSize === 'all' ? '120' : selectedSize);
                setIsUploadModalOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-amber-900 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>立即上傳此尺寸照片</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => onOpenImageZoom(photo.title, photo.imageUrl, photo.customerNote)}
                className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md hover:border-amber-800/40 transition-all cursor-pointer group flex flex-col"
              >
                {/* Image Container */}
                <div className="relative aspect-4/3 bg-stone-100 overflow-hidden flex items-center justify-center p-2">
                  <img
                    src={photo.imageUrl}
                    alt={photo.title}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Size Pill */}
                  <div className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-xs text-white text-[11px] font-mono px-2 py-0.5 rounded">
                    長度 {photo.sizeCategory}cm 系列
                  </div>

                  {/* Zoom Icon */}
                  <div className="absolute top-3 right-3 p-1.5 bg-white/90 rounded-md text-stone-700 shadow-xs group-hover:bg-amber-900 group-hover:text-white transition-colors">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>

                  {/* Custom Upload Badge & Delete Option */}
                  {photo.isCustomUpload && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                      <span className="bg-amber-800 text-white text-[10px] px-2 py-0.5 rounded font-medium">
                        店主新增
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeletePhoto(photo.id, e)}
                        className="bg-red-600/90 hover:bg-red-700 text-white p-1 rounded transition-colors"
                        title="刪除此相片"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Details Footer */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h3 className="font-serif-title font-bold text-stone-900 text-sm group-hover:text-amber-900 transition-colors line-clamp-1">
                      {photo.title}
                    </h3>
                    <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                      {photo.customerNote}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                    <span className="font-mono text-stone-600 font-medium">
                      {photo.dimensionsText}
                    </span>
                    <a
                      href={`${STORE_INFO.lineUrl}?text=${encodeURIComponent(
                        `您好！我在相冊看到這款【${photo.title} (${photo.dimensionsText})】，想詢問客製相同規格報價！`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold"
                    >
                      <MessageCircle className="w-3 h-3" />
                      <span>洽詢此實例</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Modal for Store Owner */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-fadeIn">
            <div
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 overflow-y-auto max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif-title font-bold text-stone-900 text-base">
                      上傳客製實品照片
                    </h3>
                    <p className="text-xs text-stone-500">
                      填寫尺寸與客戶作品備註，方便訪客依尺寸快速檢索
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="text-stone-400 hover:text-stone-700 text-lg font-bold p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSavePhoto} className="mt-4 space-y-4">
                {uploadError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Image Picker */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    實品照片檔案 *
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  {previewImage ? (
                    <div className="relative aspect-16/9 bg-stone-100 rounded-xl overflow-hidden border border-stone-200 flex items-center justify-center">
                      <img
                        src={previewImage}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-2 right-2 bg-stone-900/80 text-white text-xs px-2.5 py-1 rounded-md"
                      >
                        更換圖片
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-stone-300 hover:border-amber-700 bg-stone-50 rounded-xl p-8 text-center cursor-pointer transition-colors"
                    >
                      <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                      <p className="text-xs font-medium text-stone-700">
                        點擊選擇照片 或 拖曳檔案至此
                      </p>
                      <p className="text-[11px] text-stone-400 mt-1">
                        支援 JPG、PNG、WEBP，大小建議 8MB 內
                      </p>
                    </div>
                  )}
                </div>

                {/* Size Category */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    尺寸分類 (長度歸類) *
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {(['60', '90', '120', '150', '180'] as const).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setUploadSizeCategory(size)}
                        className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                          uploadSizeCategory === size
                            ? 'bg-amber-900 text-white border-amber-900 font-semibold'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        {size}cm
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    作品名稱 / 款式標題 *
                  </label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="例如：台中南屯 150-60-120 雙太空艙實裝"
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-800"
                    required
                  />
                </div>

                {/* Dimensions */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    尺寸標記 (高-深-長)
                  </label>
                  <input
                    type="text"
                    value={uploadDimensions}
                    onChange={(e) => setUploadDimensions(e.target.value)}
                    placeholder="例如：150-60-120 cm"
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-800"
                  />
                </div>

                {/* Customer Note */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    客製內容與客人反饋說明
                  </label>
                  <textarea
                    rows={2}
                    value={uploadCustomerNote}
                    onChange={(e) => setUploadCustomerNote(e.target.value)}
                    placeholder="例如：客人加裝抽屜、全景太空艙與天然劍麻抓柱，雙貓入住超適應！"
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-800"
                  />
                </div>

                {/* Modal Buttons */}
                <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-5 py-2 text-xs font-semibold text-white bg-amber-900 hover:bg-amber-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{isUploading ? '儲存中...' : '確認上傳發佈'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
