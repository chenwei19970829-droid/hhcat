import { drawBrandWatermarkOnCanvas } from './watermark';

export interface CompressImageOptions {
  /** Automatically bake 花花招財貓 logo + anti-crop watermark into the exported JPEG (default true) */
  watermark?: boolean;
  /** Also draw subtle repeating diagonal text across the photo body (default true) */
  includeDiagonalWatermark?: boolean;
}

/**
 * 手機拍照與電腦上傳自動壓縮 ＋ 自動添加品牌防盜 LOGO 浮水印工具
 * 自動微縮長寬至 840~900px 內，並將門市 LOGO 與防盜字樣直接烙印進圖片像素中
 * 確保跨設備 1 秒即時雲端同步且防止有心人盜圖另存
 */
export async function compressImage(
  file: File,
  maxDimension = 900,
  quality = 0.72,
  options: CompressImageOptions = {}
): Promise<string> {
  const shouldWatermark = options.watermark !== false;
  const includeDiagonal = options.includeDiagonalWatermark !== false;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('讀取圖片檔案失敗'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('圖片解析失敗'));
      img.onload = async () => {
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
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        if (shouldWatermark) {
          try {
            await drawBrandWatermarkOnCanvas(canvas, ctx, { includeDiagonal });
          } catch (err) {
            console.warn('Watermark skipped due to canvas error:', err);
          }
        }

        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
