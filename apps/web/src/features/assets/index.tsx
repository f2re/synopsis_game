import React, { useState } from 'react';
import {
  resolveGraphicUrl,
  getGraphicDescriptor,
  isGraphicApproved,
  getGraphicsByCategory,
  getRejectedGraphics,
  getApprovedGraphics,
  GRAPHIC_ASSET_REGISTRY,
  type GraphicAssetCategory,
  type GraphicAssetStatus,
  type GraphicAssetDescriptor,
} from '@synopsis/world-engine';

export interface PixelGraphicProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  assetId: string;
  fallback?: string;
}

/**
 * React-компонент единой точки входа для графики.
 * Автоматически:
 * - разрешает семантический ID ассета в актуальный URL;
 * - подставляет фолбэк при ошибках или отвергнутом статусе ассета;
 * - применяет image-rendering: pixelated для строгого пиксельного отображения без мыла.
 */
export function PixelGraphic({
  assetId,
  fallback,
  alt = '',
  style,
  onError,
  ...props
}: PixelGraphicProps) {
  const descriptor = getGraphicDescriptor(assetId);
  const initialSrc = resolveGraphicUrl(assetId);
  const [src, setSrc] = useState(initialSrc);
  const [hasFailed, setHasFailed] = useState(false);

  return (
    <img
      src={src}
      alt={alt || descriptor?.name || assetId}
      style={{
        imageRendering: 'pixelated',
        ...style,
      }}
      onError={(e) => {
        if (!hasFailed) {
          setHasFailed(true);
          const fallbackSrc = fallback || descriptor?.fallbackUrl;
          if (fallbackSrc && fallbackSrc !== src) {
            setSrc(fallbackSrc);
            return;
          }
        }
        onError?.(e);
      }}
      {...props}
    />
  );
}

/**
 * Хук для получения разрешённого URL ассета по его ID.
 */
export function useGraphicUrl(assetId: string): string {
  return resolveGraphicUrl(assetId);
}

export {
  resolveGraphicUrl,
  getGraphicDescriptor,
  isGraphicApproved,
  getGraphicsByCategory,
  getRejectedGraphics,
  getApprovedGraphics,
  GRAPHIC_ASSET_REGISTRY,
  type GraphicAssetCategory,
  type GraphicAssetStatus,
  type GraphicAssetDescriptor,
};
