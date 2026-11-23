export const WATERMARK_LOGO_SRC = '/assets/aistudio/logo_6994c231.jpg';

let cachedLogoPromise: Promise<HTMLImageElement | null> | null = null;

export function loadWatermarkLogo(): Promise<HTMLImageElement | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (cachedLogoPromise) return cachedLogoPromise;

  cachedLogoPromise = new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, 2500);

    img.onload = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(img);
    };

    img.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      cachedLogoPromise = null;
      resolve(null);
    };

    img.src = WATERMARK_LOGO_SRC;
  });

  return cachedLogoPromise;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export interface CanvasWatermarkOptions {
  includeDiagonal?: boolean;
}

/**
 * Permanently bakes the 花花招財貓 official logo badge + subtle diagonal anti-crop watermark
 * directly into the canvas pixels before JPEG export.
 */
export async function drawBrandWatermarkOnCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  options: CanvasWatermarkOptions = {}
): Promise<void> {
  const w = canvas.width;
  const h = canvas.height;
  if (w < 80 || h < 80) return;

  const minSide = Math.min(w, h);
  const includeDiagonal = options.includeDiagonal !== false;
  const logoImg = await loadWatermarkLogo();

  // 1. Ultra-subtle diagonal anti-crop watermark (sparse & low opacity so wood grain stays crystal clear)
  if (includeDiagonal) {
    ctx.save();
    const diagFontSize = Math.round(Math.max(11, Math.min(17, minSide * 0.026)));
    ctx.font = `500 ${diagFontSize}px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const cx = w / 2;
    const cy = h / 2;
    ctx.translate(cx, cy);
    ctx.rotate((-22 * Math.PI) / 180);

    const span = Math.hypot(w, h);
    const stepX = Math.max(280, Math.round(w * 0.58));
    const stepY = Math.max(185, Math.round(h * 0.44));

    let rowIdx = 0;
    for (let y = -span * 0.48; y <= span * 0.48; y += stepY) {
      const offsetX = rowIdx % 2 === 0 ? 0 : stepX * 0.48;
      for (let x = -span * 0.52; x <= span * 0.52; x += stepX) {
        const px = x + offsetX;
        ctx.fillStyle = 'rgba(28, 25, 23, 0.06)';
        ctx.fillText('花花招財貓 · hhcat.cc', px + 0.8, y + 0.8);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.11)';
        ctx.fillText('花花招財貓 · hhcat.cc', px, y);
      }
      rowIdx += 1;
    }
    ctx.restore();
  }

  // 2. Translucent corner LOGO + light brand signature (no heavy opaque white card)
  ctx.save();
  const logoSize = Math.round(Math.min(34, Math.max(22, minSide * 0.056)));
  const gap = Math.round(logoSize * 0.28);
  const titleSize = Math.round(Math.max(11, logoSize * 0.44));
  const margin = Math.round(Math.max(10, minSide * 0.024));

  ctx.font = `600 ${titleSize}px "Noto Serif TC", "Noto Sans TC", "PingFang TC", sans-serif`;
  const titleText = '花花招財貓';
  const titleWidth = ctx.measureText(titleText).width;
  const totalW = (logoImg ? logoSize + gap : 0) + titleWidth;

  const startX = Math.max(margin, w - totalW - margin);
  const centerY = Math.max(margin + logoSize / 2, h - margin - logoSize / 2);

  ctx.globalAlpha = 0.42;

  let textX = startX;
  if (logoImg) {
    const lx = startX;
    const ly = centerY - logoSize / 2;
    ctx.save();
    drawRoundedRectPath(ctx, lx, ly, logoSize, logoSize, Math.round(logoSize * 0.5));
    ctx.clip();
    ctx.drawImage(logoImg, lx, ly, logoSize, logoSize);
    ctx.restore();
    textX = lx + logoSize + gap;
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(28, 25, 23, 0.32)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fillText(titleText, textX, centerY);
  ctx.restore();
}

/**
 * Applies the permanent logo watermark onto an existing Data URL.
 */
export function applyWatermarkToDataUrl(
  dataUrl: string,
  quality = 0.74
): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0);
      await drawBrandWatermarkOnCanvas(canvas, ctx, { includeDiagonal: true });
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
