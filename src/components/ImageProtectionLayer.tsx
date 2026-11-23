import React from 'react';
import { WATERMARK_LOGO_SRC } from '../utils/watermark';

export interface ImageProtectionLayerProps {
  /** Whether to draw the visual Logo badge + diagonal watermark overlay (false when already baked into JPEG pixels) */
  showVisualLogo?: boolean;
  /** Where to place the corner store logo seal so it never overlaps card badges or owner buttons */
  badgePosition?: 'bottom-right' | 'bottom-left' | 'above-bottom-right' | 'top-right-below';
  /** Visual scale of the logo stamp */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to render the subtle diagonal anti-crop brand pattern across the photo */
  showDiagonalText?: boolean;
}

export const protectedMediaContainerProps = {
  onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  onDragStart: (e: React.DragEvent) => e.preventDefault()
};

const POSITION_CLASSES: Record<NonNullable<ImageProtectionLayerProps['badgePosition']>, string> = {
  'bottom-right': 'bottom-2.5 right-2.5',
  'bottom-left': 'bottom-2.5 left-2.5',
  'above-bottom-right': 'bottom-11 right-2.5',
  'top-right-below': 'top-12 right-2.5'
};

export const ImageProtectionLayer: React.FC<ImageProtectionLayerProps> = ({
  showVisualLogo = true,
  badgePosition = 'bottom-right',
  size = 'md',
  showDiagonalText = true
}) => {
  const logoSizeClass =
    size === 'lg' ? 'w-7 h-7 sm:w-8 sm:h-8' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const titleSizeClass =
    size === 'lg' ? 'text-[11px] sm:text-xs' : size === 'sm' ? 'text-[9px]' : 'text-[10px]';

  return (
    <>
      {showVisualLogo && showDiagonalText && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none select-none overflow-hidden flex items-center justify-center z-[4]"
        >
          <div className="grid grid-cols-2 gap-x-14 gap-y-12 -rotate-[22deg] scale-125">
            {Array.from({ length: 4 }).map((_, idx) => (
              <span
                key={idx}
                className="text-[10px] sm:text-[11px] font-medium tracking-widest text-white/[0.13] whitespace-nowrap drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)]"
              >
                花花招財貓 · hhcat.cc
              </span>
            ))}
          </div>
        </div>
      )}

      {showVisualLogo && (
        <div
          aria-hidden="true"
          className={`absolute ${POSITION_CLASSES[badgePosition]} pointer-events-none select-none z-[5] flex items-center gap-1.5 opacity-45`}
        >
          <div className={`${logoSizeClass} rounded-full overflow-hidden shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.18)]`}>
            <img
              src={WATERMARK_LOGO_SRC}
              alt=""
              className="w-full h-full object-cover pointer-events-none select-none"
              draggable={false}
            />
          </div>
          <span
            className={`font-serif-title font-semibold text-white/95 ${titleSizeClass} tracking-wide whitespace-nowrap drop-shadow-[0_1px_2px_rgba(28,25,23,0.45)]`}
          >
            花花招財貓
          </span>
        </div>
      )}
    </>
  );
};
