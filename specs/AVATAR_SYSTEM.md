# 角色系統與紙娃娃規格 (Avatar & Paper Doll System Specification)

## 概述

本系統提供完整的角色自訂功能，讓學生可以：
1. 創建並自訂自己的冒險者外觀（紙娃娃系統）
2. 購買並裝備各種道具改變外觀
3. 在地圖探索與戰鬥中使用自訂角色

---

## 紙娃娃系統架構

### 圖層結構（由下至上）

```
Layer 7: effects      特效層（光環、翅膀動畫）
Layer 6: accessory    配件層（寵物、翅膀、光環）
Layer 5: weapon       武器層（劍、法杖、書本）
Layer 4: armor        盔甲層（胸甲、外套）
Layer 3: outfit       服裝層（衣服、褲子）
Layer 2: hair         頭髮層（髮型、髮色）
Layer 1: face         臉部層（表情、眼睛、嘴巴）
Layer 0: body         身體層（膚色、體型）
```

### 資料結構

```typescript
// 角色部件定義
interface AvatarPart {
  _id: ObjectId;
  
  // 基本資訊
  name: string;                     // 部件名稱
  category: AvatarCategory;         // 部件類別
  layer: number;                    // 圖層順序 (0-7)
  
  // 圖片資源
  assets: {
    idle: string;                   // 靜態圖片 URL
    walk?: string[];                // 行走動畫幀
    attack?: string[];              // 攻擊動畫幀
    hurt?: string[];                // 受傷動畫幀
    spriteSheet?: {                 // Sprite Sheet 配置
      url: string;
      frameWidth: number;
      frameHeight: number;
      animations: Record<string, {
        row: number;
        frames: number;
        frameRate: number;
      }>;
    };
  };
  
  // 定位與縮放
  transform: {
    offsetX: number;                // X 偏移
    offsetY: number;                // Y 偏移
    scale: number;                  // 縮放比例
    anchor: { x: number; y: number }; // 錨點
  };
  
  // 顏色自訂
  colorizable: boolean;             // 是否可改變顏色
  defaultColor?: string;            // 預設顏色
  colorMask?: string;               // 顏色遮罩圖 URL
  
  // 取得方式
  acquisition: {
    type: 'default' | 'shop' | 'achievement' | 'event' | 'custom';
    price?: number;                 // 商店價格
    achievementId?: ObjectId;       // 關聯成就
    levelRequired?: number;         // 等級需求
  };
  
  // 稀有度
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  
  // 系統屬性
  isDefault: boolean;               // 是否為預設部件
  isCustom: boolean;                // 是否為使用者上傳
  uploadedBy?: ObjectId;            // 上傳者（教師）
  isActive: boolean;
  createdAt: Date;
}

type AvatarCategory = 
  | 'body'        // 身體
  | 'skin_tone'   // 膚色
  | 'face'        // 臉型
  | 'eyes'        // 眼睛
  | 'mouth'       // 嘴巴
  | 'hair'        // 髮型
  | 'hair_color'  // 髮色
  | 'outfit'      // 服裝
  | 'armor'       // 盔甲
  | 'weapon'      // 武器
  | 'accessory'   // 配件
  | 'effects';    // 特效

// 學生角色配置
interface StudentAvatar {
  _id: ObjectId;
  userId: ObjectId;
  
  name: string;                     // 角色名稱
  
  // 各部位當前裝備
  equipped: {
    body: ObjectId;
    skinTone: string;               // 膚色 Hex
    face: ObjectId;
    eyes: ObjectId;
    eyeColor: string;               // 眼睛顏色 Hex
    mouth: ObjectId;
    hair: ObjectId;
    hairColor: string;              // 頭髮顏色 Hex
    outfit: ObjectId;
    armor?: ObjectId;
    weapon?: ObjectId;
    accessory?: ObjectId;
    effects?: ObjectId;
  };
  
  // 預覽用的合成圖片（快取）
  compositeImageUrl?: string;
  compositeUpdatedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 角色編輯器 UI

### 編輯器佈局

```
┌─────────────────────────────────────────────────────────────┐
│                      角色編輯器                               │
├───────────────────────┬─────────────────────────────────────┤
│                       │                                     │
│    ┌─────────────┐    │   部件選擇區                         │
│    │             │    │   ┌─────────────────────────────┐   │
│    │   角色預覽   │    │   │ [身體] [臉部] [頭髮] [服裝] │   │
│    │             │    │   │ [盔甲] [武器] [配件] [特效] │   │
│    │   (動態)    │    │   └─────────────────────────────┘   │
│    │             │    │                                     │
│    └─────────────┘    │   ┌─────┬─────┬─────┬─────┐        │
│                       │   │ 🎀 │ 👑 │ 🎩 │ 🧢 │        │
│    ┌───────────────┐  │   ├─────┼─────┼─────┼─────┤        │
│    │ 旋轉  縮放    │  │   │ 🎀 │ 👑 │ 🎩 │ 🧢 │        │
│    └───────────────┘  │   └─────┴─────┴─────┴─────┘        │
│                       │                                     │
│    [試穿] [儲存]      │   顏色選擇：[●][●][●][●][自訂]      │
│                       │                                     │
└───────────────────────┴─────────────────────────────────────┘
```

### React 組件規格

```tsx
// components/avatar/AvatarEditor.tsx
interface AvatarEditorProps {
  studentId: string;
  initialAvatar?: StudentAvatar;
  availableParts: AvatarPart[];      // 學生擁有的部件
  onSave: (avatar: StudentAvatar) => Promise<void>;
  onCancel: () => void;
}

/**
 * 功能：
 * 1. 即時預覽角色外觀變化
 * 2. 分類瀏覽可用部件
 * 3. 顏色選擇器（膚色、髮色、眼睛顏色）
 * 4. 360度旋轉預覽
 * 5. 動畫預覽（走路、攻擊）
 * 6. 儲存配置
 */

// components/avatar/AvatarPreview.tsx
interface AvatarPreviewProps {
  avatar: StudentAvatar;
  parts: Map<ObjectId, AvatarPart>;
  size: 'small' | 'medium' | 'large' | 'full';
  animation?: 'idle' | 'walk' | 'attack' | 'hurt';
  direction?: 'left' | 'right' | 'up' | 'down';
  showEffects?: boolean;
}

/**
 * 使用 Canvas 或 CSS 圖層疊加渲染角色
 * 支援動畫播放
 */

// components/avatar/PartSelector.tsx
interface PartSelectorProps {
  category: AvatarCategory;
  parts: AvatarPart[];
  selectedId?: ObjectId;
  onSelect: (part: AvatarPart) => void;
  showLocked?: boolean;              // 顯示未解鎖的部件（灰色）
}

// components/avatar/ColorPicker.tsx
interface ColorPickerProps {
  label: string;
  value: string;
  presets?: string[];                // 預設顏色
  onChange: (color: string) => void;
}
```

---

## 圖層合成引擎

### Canvas 合成方案

```typescript
// utils/avatarRenderer.ts

interface RenderOptions {
  width: number;
  height: number;
  scale: number;
  animation: string;
  frame: number;
}

class AvatarRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageCache: Map<string, HTMLImageElement>;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.imageCache = new Map();
  }

  /**
   * 渲染完整角色
   */
  async render(avatar: StudentAvatar, parts: AvatarPart[], options: RenderOptions): Promise<void> {
    // 清空畫布
    this.ctx.clearRect(0, 0, options.width, options.height);

    // 按圖層順序排序
    const sortedParts = this.getSortedParts(avatar, parts);

    // 依序繪製每個圖層
    for (const part of sortedParts) {
      await this.renderPart(part, avatar, options);
    }
  }

  /**
   * 渲染單個部件
   */
  private async renderPart(
    part: AvatarPart, 
    avatar: StudentAvatar, 
    options: RenderOptions
  ): Promise<void> {
    const image = await this.loadImage(this.getImageUrl(part, options.animation, options.frame));
    
    // 應用顏色（如果需要）
    if (part.colorizable) {
      const color = this.getPartColor(part, avatar);
      // 使用 Canvas 濾鏡或色相調整
      this.applyColorFilter(image, color);
    }

    // 計算位置和縮放
    const { offsetX, offsetY, scale } = part.transform;
    const x = (options.width / 2) + offsetX;
    const y = (options.height / 2) + offsetY;

    // 繪製
    this.ctx.drawImage(
      image,
      x - (image.width * scale) / 2,
      y - (image.height * scale) / 2,
      image.width * scale,
      image.height * scale
    );
  }

  /**
   * 應用顏色濾鏡
   */
  private applyColorFilter(image: HTMLImageElement, color: string): void {
    // 創建臨時 canvas 進行顏色處理
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    
    tempCanvas.width = image.width;
    tempCanvas.height = image.height;
    
    // 繪製原圖
    tempCtx.drawImage(image, 0, 0);
    
    // 獲取像素數據
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    
    // 解析目標顏色
    const targetColor = this.hexToRgb(color);
    
    // 色相調整演算法
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) { // 非透明像素
        // 保持亮度，調整色相
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3 / 255;
        data[i] = targetColor.r * brightness;
        data[i + 1] = targetColor.g * brightness;
        data[i + 2] = targetColor.b * brightness;
      }
    }
    
    tempCtx.putImageData(imageData, 0, 0);
  }

  /**
   * 導出為圖片
   */
  exportAsDataUrl(): string {
    return this.canvas.toDataURL('image/png');
  }

  /**
   * 導出為 Blob
   */
  async exportAsBlob(): Promise<Blob> {
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => resolve(blob!), 'image/png');
    });
  }
}
```

---

## 自訂素材上傳系統

### 教師上傳介面

```tsx
// pages/teacher/AssetUpload.tsx

/**
 * 教師可以上傳自訂的角色部件
 * 上傳流程：
 * 1. 選擇部件類別
 * 2. 上傳圖片（支援 PNG with alpha）
 * 3. 設定圖層偏移與縮放
 * 4. 預覽效果
 * 5. 設定取得方式（商店/成就/活動）
 * 6. 儲存
 */

interface AssetUploadProps {
  onUpload: (asset: Partial<AvatarPart>) => Promise<void>;
}

// 上傳規格
const UPLOAD_SPECS = {
  maxFileSize: 2 * 1024 * 1024,      // 2MB
  allowedFormats: ['image/png'],
  recommendedSize: {
    body: { width: 128, height: 256 },
    hair: { width: 128, height: 128 },
    weapon: { width: 64, height: 128 },
    accessory: { width: 64, height: 64 },
  },
  requireTransparency: true,
};
```

### 素材管理 API

```typescript
// POST /api/v1/assets/upload
// 上傳新素材

// Request: multipart/form-data
// - file: 圖片檔案
// - metadata: JSON 字串
//   {
//     name: string,
//     category: AvatarCategory,
//     layer: number,
//     transform: { offsetX, offsetY, scale },
//     colorizable: boolean,
//     acquisition: { type, price?, levelRequired? }
//   }

// Response:
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "自訂劍",
    "assets": {
      "idle": "https://storage.../sword-idle.png"
    },
    // ...
  }
}

// GET /api/v1/assets
// 取得素材列表（含教師自訂）

// DELETE /api/v1/assets/:id
// 刪除自訂素材（僅限上傳者或管理員）
```

---

## 預設角色部件清單

### 基礎部件（免費）

| 類別 | 數量 | 說明 |
|------|------|------|
| body | 3 | 基礎體型（標準、健壯、纖細） |
| skin_tone | 8 | 膚色選項 |
| face | 5 | 臉型 |
| eyes | 10 | 眼睛樣式 |
| mouth | 6 | 嘴巴樣式 |
| hair | 15 | 基礎髮型 |
| outfit | 5 | 初始服裝 |

### 商店部件

| 稀有度 | 價格範圍 | 等級需求 |
|--------|---------|---------|
| common | 50-150 | 1-3 |
| uncommon | 150-400 | 3-5 |
| rare | 400-800 | 5-7 |
| epic | 800-1500 | 7-9 |
| legendary | 1500-3000 | 10+ |

---

## 推薦素材資源

### 免費素材來源

| 來源 | 網址 | 說明 |
|------|------|------|
| itch.io | https://itch.io/game-assets/tag-character | 大量免費角色素材 |
| OpenGameArt | https://opengameart.org | CC 授權遊戲素材 |
| Kenney | https://kenney.nl/assets | 高品質免費素材包 |
| craftpix.net | https://craftpix.net/freebies/ | 免費 2D 遊戲素材 |

### 素材規格建議

```
角色尺寸: 128x256 px（適合 2D 橫向捲軸/等距視角）
動畫格式: Sprite Sheet，每個動作 4-8 幀
圖層順序: 嚴格遵循 Layer 0-7
透明背景: 必須使用 PNG 格式
色彩模式: RGBA
```

---

## 實作優先順序

### Phase 1（MVP）
- [ ] 基礎角色渲染（靜態）
- [ ] 5 種基礎髮型、3 種服裝
- [ ] 顏色選擇（膚色、髮色）
- [ ] 角色預覽組件

### Phase 2
- [ ] 完整編輯器 UI
- [ ] 商店購買裝備
- [ ] 裝備系統整合

### Phase 3
- [ ] 動畫支援
- [ ] 教師素材上傳
- [ ] 稀有度特效
