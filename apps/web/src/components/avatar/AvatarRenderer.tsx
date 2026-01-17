import { useRef, useEffect, useCallback, useState } from 'react';
import { AvatarPart, EquippedParts, LAYER_ORDER, AvatarCategory } from '../../services/paperDoll';

interface AvatarRendererProps {
  equipped: EquippedParts;
  width?: number;
  height?: number;
  animation?: 'idle' | 'walk' | 'attack' | 'hurt';
  direction?: 'left' | 'right';
  showEffects?: boolean;
  className?: string;
  onRenderComplete?: (dataUrl: string) => void;
}

// 顏色處理工具
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 };
};

// 圖片快取
const imageCache = new Map<string, HTMLImageElement>();

const loadImage = (src: string): Promise<HTMLImageElement> => {
  if (imageCache.has(src)) {
    return Promise.resolve(imageCache.get(src)!);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
};

// 應用顏色到圖像
const applyColor = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  color: string,
  x: number,
  y: number,
  width: number,
  height: number
): void => {
  // 創建臨時 canvas
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = image.width;
  tempCanvas.height = image.height;
  const tempCtx = tempCanvas.getContext('2d')!;

  // 繪製原圖
  tempCtx.drawImage(image, 0, 0);

  // 獲取像素數據
  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imageData.data;

  // 解析目標顏色
  const targetColor = hexToRgb(color);

  // 色相調整演算法 - 保持亮度，調整色相
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) {
      // 非透明像素
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3 / 255;
      data[i] = Math.round(targetColor.r * brightness);
      data[i + 1] = Math.round(targetColor.g * brightness);
      data[i + 2] = Math.round(targetColor.b * brightness);
    }
  }

  tempCtx.putImageData(imageData, 0, 0);

  // 繪製到主 canvas
  ctx.drawImage(tempCanvas, x, y, width, height);
};

const AvatarRenderer = ({
  equipped,
  width = 256,
  height = 256,
  animation = 'idle',
  direction = 'right',
  showEffects = true,
  className = '',
  onRenderComplete,
}: AvatarRendererProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 獲取部件物件（可能是字串 ID 或完整物件）
  const getPartObject = useCallback(
    (part: AvatarPart | string | undefined): AvatarPart | null => {
      if (!part) return null;
      if (typeof part === 'string') return null; // 需要從 API 獲取
      return part;
    },
    []
  );

  // 渲染角色
  const render = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      setIsLoading(true);
      setError(null);

      // 清空畫布
      ctx.clearRect(0, 0, width, height);

      // 如果是向左，翻轉畫布
      if (direction === 'left') {
        ctx.save();
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }

      // 收集要渲染的部件（按圖層順序）
      const partsToRender: {
        part: AvatarPart;
        color?: string;
        category: AvatarCategory;
      }[] = [];

      for (const category of LAYER_ORDER) {
        let partKey = category as keyof EquippedParts;
        // skin_tone 不是部件，是顏色
        if (category === 'skin_tone') continue;

        const part = getPartObject(equipped[partKey] as AvatarPart | string);
        if (!part) continue;
        if (category === 'effects' && !showEffects) continue;

        // 確定是否需要應用顏色
        let color: string | undefined;
        if (part.colorizable) {
          switch (category) {
            case 'body':
              color = equipped.skinTone;
              break;
            case 'hair':
              color = equipped.hairColor;
              break;
            case 'eyes':
              color = equipped.eyeColor;
              break;
          }
        }

        partsToRender.push({ part, color, category });
      }

      // 依序渲染每個圖層
      for (const { part, color } of partsToRender) {
        const imageUrl = part.assets.idle;
        if (!imageUrl) continue;

        try {
          const image = await loadImage(imageUrl);

          // 計算繪製位置
          const { offsetX, offsetY, scale } = part.transform;
          const drawWidth = image.width * scale;
          const drawHeight = image.height * scale;
          const x = width / 2 + offsetX - (drawWidth * part.transform.anchor.x);
          const y = height / 2 + offsetY - (drawHeight * part.transform.anchor.y);

          if (color && part.colorizable) {
            // 應用顏色
            applyColor(ctx, image, color, x, y, drawWidth, drawHeight);
          } else {
            // 直接繪製
            ctx.drawImage(image, x, y, drawWidth, drawHeight);
          }
        } catch (err) {
          console.warn(`Failed to load image for ${part.name}:`, err);
        }
      }

      // 恢復畫布狀態
      if (direction === 'left') {
        ctx.restore();
      }

      setIsLoading(false);

      // 回傳渲染結果
      if (onRenderComplete) {
        onRenderComplete(canvas.toDataURL('image/png'));
      }
    } catch (err) {
      console.error('Avatar render error:', err);
      setError('渲染失敗');
      setIsLoading(false);
    }
  }, [equipped, width, height, direction, showEffects, getPartObject, onRenderComplete]);

  // 當配置變化時重新渲染
  useEffect(() => {
    render();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50/80">
          <span className="text-sm text-red-500">{error}</span>
        </div>
      )}
    </div>
  );
};

// 預覽用的簡化版渲染器（使用 CSS 圖層疊加）
interface AvatarPreviewProps {
  equipped: EquippedParts;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AvatarPreview = ({ equipped, size = 'md', className = '' }: AvatarPreviewProps) => {
  const sizeMap = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  // 簡化版：使用 emoji 或占位圖
  const getPartObject = (part: AvatarPart | string | undefined): AvatarPart | null => {
    if (!part) return null;
    if (typeof part === 'string') return null;
    return part;
  };

  const bodyPart = getPartObject(equipped.body);
  const hairPart = getPartObject(equipped.hair);
  const outfitPart = getPartObject(equipped.outfit);

  return (
    <div
      className={`
        ${sizeMap[size]}
        rounded-full
        bg-gradient-to-br from-purple-100 to-pink-100
        flex items-center justify-center
        overflow-hidden
        border-2 border-purple-200
        ${className}
      `}
    >
      {/* 簡化的角色展示 */}
      <div className="text-4xl">
        {hairPart?.assets?.idle ? (
          <img
            src={hairPart.assets.idle}
            alt="avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          '🧑'
        )}
      </div>
    </div>
  );
};

export default AvatarRenderer;
