# UI 設計與素材規格 (UI Design & Assets Specification)

## 設計原則

### 核心風格
- **遊戲化視覺**：不使用企業風格 UI，改用 RPG 遊戲風格
- **手繪質感**：邊框、按鈕帶有手繪筆觸
- **奇幻氛圍**：魔法元素、羊皮紙質感、寶石裝飾
- **色彩鮮明**：使用飽和度較高的配色

### 拒絕的風格 ❌
- Material Design 預設樣式
- Bootstrap 原生樣式
- 企業系統風格的表格和表單
- 過於扁平化的設計

### 追求的風格 ✅
- Final Fantasy / Dragon Quest 選單風格
- 手機 RPG 遊戲 UI
- 像素藝術或手繪風格
- 有深度感的面板和按鈕

---

## 推薦 UI 資源

### 🎮 RPG 風格 CSS 框架

#### 1. RPGUI（強烈推薦）
```
網址：https://ronenness.github.io/RPGUI/
GitHub：https://github.com/RonenNess/RPGUI
授權：MIT
```

**特色：**
- 純 CSS + 少量 JS
- 完整的 RPG 風格組件
- 包含對話框、按鈕、進度條、滑桿等
- 開箱即用，無需設計

**安裝：**
```html
<link href="rpgui.css" rel="stylesheet">
<script src="rpgui.js"></script>
```

**使用範例：**
```html
<!-- RPG 風格按鈕 -->
<button class="rpgui-button">開始冒險</button>

<!-- RPG 風格對話框 -->
<div class="rpgui-container framed">
  <p>歡迎來到數學森林！</p>
</div>

<!-- RPG 風格進度條 -->
<div class="rpgui-progress">
  <div class="rpgui-progress-fill" style="width: 75%"></div>
</div>
```

#### 2. NES.css（8-bit 像素風）
```
網址：https://nostalgic-css.github.io/NES.css/
GitHub：https://github.com/nostalgic-css/NES.css
授權：MIT
```

**適合：** 懷舊像素風格的學習系統

#### 3. PaperCSS（手繪風）
```
網址：https://www.getpapercss.com/
GitHub：https://github.com/papercss/papercss
授權：ISC
```

**適合：** 可愛、輕鬆的學習氛圍

---

### 🎨 React UI 組件庫

#### 基礎組件庫（搭配遊戲主題客製化）

| 名稱 | 說明 | 客製化難度 |
|------|------|-----------|
| **HeroUI** | 現代、美觀，基於 Tailwind | ⭐⭐ |
| **shadcn/ui** | 無樣式組件，完全可控 | ⭐⭐⭐ |
| **Radix UI** | 無障礙原始組件 | ⭐⭐⭐ |

**建議策略：**
使用 shadcn/ui 或 Radix UI 作為功能基礎，搭配 RPGUI 的視覺樣式覆蓋。

---

### 🖼️ 遊戲 UI 素材包

#### 免費素材

| 來源 | 網址 | 內容 |
|------|------|------|
| **itch.io UI** | https://itch.io/game-assets/free/tag-user-interface | 各式 UI 套件 |
| **Franuka RPG UI** | https://franuka.itch.io/rpg-ui-pack | 高品質 RPG UI（$5 起） |
| **Kenney UI Pack** | https://kenney.nl/assets/ui-pack | CC0 免費 |
| **craftpix.net** | https://craftpix.net/categorys/gui/ | 免費 + 付費 |

#### 推薦免費 UI 包

**1. Medieval Fantasy UI（ToffeeCraft）**
```
網址：https://itch.io/s/105050/toffeecraft-user-interfaces
包含：按鈕、對話框、血條、物品欄框架
```

**2. Shikashi's Fantasy Icons Pack**
```
網址：https://cheekyinkling.itch.io/shikashis-fantasy-icons-pack
包含：技能圖標、物品圖標、狀態圖標
```

**3. Raven Fantasy Icons（8000+ 圖標）**
```
網址：https://clockworkraven.itch.io/raven-fantasy-icons
包含：海量像素風格圖標
```

---

## UI 組件設計規格

### 顏色系統

```css
:root {
  /* 主要色彩 */
  --color-primary: #8B5A2B;        /* 木頭棕 - 邊框 */
  --color-secondary: #DAA520;      /* 金色 - 強調 */
  --color-accent: #4169E1;         /* 皇家藍 - 互動 */
  
  /* 背景色 */
  --bg-parchment: #F5DEB3;         /* 羊皮紙 */
  --bg-dark: #2C1810;              /* 深木紋 */
  --bg-panel: rgba(139, 69, 19, 0.8); /* 半透明面板 */
  
  /* 狀態色 */
  --color-hp: #DC143C;             /* HP 紅 */
  --color-mp: #4169E1;             /* MP 藍 */
  --color-exp: #FFD700;            /* EXP 金 */
  --color-success: #228B22;        /* 成功綠 */
  --color-error: #B22222;          /* 錯誤紅 */
  
  /* 稀有度色彩 */
  --rarity-common: #9E9E9E;        /* 灰 */
  --rarity-uncommon: #4CAF50;      /* 綠 */
  --rarity-rare: #2196F3;          /* 藍 */
  --rarity-epic: #9C27B0;          /* 紫 */
  --rarity-legendary: #FF9800;     /* 橙/金 */
}
```

### 字型建議

```css
/* 標題字型 - 奇幻風格 */
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');

/* 內文字型 - 易讀 */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap');

:root {
  --font-title: 'Cinzel', 'Noto Sans TC', serif;
  --font-body: 'Noto Sans TC', sans-serif;
}

h1, h2, h3, .game-title {
  font-family: var(--font-title);
}

body, p, button {
  font-family: var(--font-body);
}
```

---

## 核心 UI 組件

### 遊戲面板 (GamePanel)

```tsx
// components/ui/GamePanel.tsx
interface GamePanelProps {
  title?: string;
  variant?: 'default' | 'golden' | 'dark' | 'parchment';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

/**
 * 視覺效果：
 * - 木紋邊框（帶陰影）
 * - 角落金屬裝飾
 * - 羊皮紙背景
 * - 標題裝飾橫幅
 */
```

**CSS 範例：**
```css
.game-panel {
  background: 
    url('/assets/ui/panel-bg.png') center/cover,
    linear-gradient(#f5deb3, #deb887);
  border: 4px solid #8B4513;
  border-image: url('/assets/ui/border-wood.png') 30 round;
  box-shadow: 
    inset 0 0 20px rgba(0,0,0,0.3),
    0 4px 8px rgba(0,0,0,0.5);
  border-radius: 8px;
  padding: 20px;
}

.game-panel::before {
  content: '';
  position: absolute;
  top: -8px; left: -8px;
  width: 24px; height: 24px;
  background: url('/assets/ui/corner-metal.png');
}
```

### 遊戲按鈕 (GameButton)

```tsx
// components/ui/GameButton.tsx
interface GameButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'golden';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

/**
 * 視覺效果：
 * - 3D 凸起效果
 * - Hover 時發光
 * - Click 時按下動畫
 * - 禁用時灰色 + 無法點擊
 */
```

**CSS 範例：**
```css
.game-button {
  background: linear-gradient(180deg, #DAA520 0%, #B8860B 100%);
  border: 3px solid #8B4513;
  border-radius: 4px;
  color: #2C1810;
  font-weight: bold;
  padding: 12px 24px;
  text-shadow: 1px 1px 0 rgba(255,255,255,0.3);
  box-shadow: 
    inset 0 2px 0 rgba(255,255,255,0.3),
    inset 0 -2px 0 rgba(0,0,0,0.2),
    0 4px 0 #654321;
  transform: translateY(0);
  transition: all 0.1s;
}

.game-button:hover {
  filter: brightness(1.1);
  box-shadow: 
    inset 0 2px 0 rgba(255,255,255,0.3),
    inset 0 -2px 0 rgba(0,0,0,0.2),
    0 4px 0 #654321,
    0 0 15px rgba(218, 165, 32, 0.5);
}

.game-button:active {
  transform: translateY(4px);
  box-shadow: 
    inset 0 2px 0 rgba(0,0,0,0.2),
    0 0 0 #654321;
}
```

### 血條/經驗條 (GameProgressBar)

```tsx
// components/ui/GameProgressBar.tsx
interface GameProgressBarProps {
  type: 'hp' | 'mp' | 'exp' | 'timer';
  current: number;
  max: number;
  showLabel?: boolean;
  animated?: boolean;
}

/**
 * 視覺效果：
 * - HP: 紅色漸層 + 心形圖標
 * - MP: 藍色漸層 + 魔法圖標
 * - EXP: 金色漸層 + 星形圖標
 * - 填充動畫（數值變化時）
 * - 低血量時閃爍
 */
```

### 物品欄格子 (InventorySlot)

```tsx
// components/ui/InventorySlot.tsx
interface InventorySlotProps {
  item?: {
    id: string;
    name: string;
    imageUrl: string;
    quantity?: number;
    rarity?: Rarity;
  };
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  onClick?: () => void;
  onDrop?: (item: DragItem) => void;
}

/**
 * 視覺效果：
 * - 石頭/金屬質感邊框
 * - 稀有度發光效果
 * - 數量角標
 * - 拖放功能
 * - 空格時顯示虛線
 */
```

### 對話框 (GameDialog)

```tsx
// components/ui/GameDialog.tsx
interface GameDialogProps {
  speaker?: {
    name: string;
    avatarUrl: string;
    position?: 'left' | 'right';
  };
  content: string;
  choices?: Array<{
    text: string;
    action: () => void;
  }>;
  onNext?: () => void;
  typewriter?: boolean;   // 打字機效果
}

/**
 * 視覺效果：
 * - 說話者頭像（大）
 * - 羊皮紙對話框
 * - 打字機文字顯示
 * - 選項按鈕（如果有）
 * - 按任意鍵繼續提示
 */
```

---

## 動畫效果

### 使用 Framer Motion

```tsx
import { motion } from 'framer-motion';

// 物品獲得動畫
const itemAcquireAnimation = {
  initial: { scale: 0, rotate: -180, opacity: 0 },
  animate: { 
    scale: 1, 
    rotate: 0, 
    opacity: 1,
    transition: { type: 'spring', stiffness: 200 }
  },
  exit: { scale: 0, opacity: 0 }
};

// 金幣增加動畫
const goldIncreaseAnimation = {
  initial: { y: 0, opacity: 1 },
  animate: { 
    y: -30, 
    opacity: 0,
    transition: { duration: 0.8 }
  }
};

// 升級特效
const levelUpAnimation = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.2, 1],
    filter: [
      'brightness(1)',
      'brightness(2)',
      'brightness(1)'
    ],
    transition: { duration: 0.5 }
  }
};
```

### CSS 動畫

```css
/* 閃爍效果（低血量） */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.low-hp {
  animation: blink 0.5s infinite;
}

/* 發光效果（傳說道具） */
@keyframes glow {
  0%, 100% { 
    box-shadow: 0 0 5px #FFD700, 0 0 10px #FFD700; 
  }
  50% { 
    box-shadow: 0 0 15px #FFD700, 0 0 30px #FFD700; 
  }
}

.legendary {
  animation: glow 2s infinite;
}

/* 漂浮效果（寶箱） */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.floating {
  animation: float 2s ease-in-out infinite;
}
```

---

## 音效設計

### 推薦音效資源

| 來源 | 網址 | 說明 |
|------|------|------|
| **Freesound** | https://freesound.org | 大量免費音效 |
| **Kenney** | https://kenney.nl/assets?q=audio | CC0 遊戲音效 |
| **OpenGameArt Audio** | https://opengameart.org/art-search-advanced?field_art_type_tid%5B%5D=13 | 遊戲音樂音效 |

### 需要的音效列表

| 場景 | 音效 | 說明 |
|------|------|------|
| 按鈕 | button_click.mp3 | 點擊反饋 |
| 正確 | correct.mp3 | 答對時 |
| 錯誤 | wrong.mp3 | 答錯時 |
| 升級 | level_up.mp3 | 升級慶祝 |
| 獲得金幣 | coin.mp3 | 金幣音效 |
| 獲得物品 | item_get.mp3 | 物品獲得 |
| 開寶箱 | chest_open.mp3 | 寶箱開啟 |
| 攻擊 | attack.mp3 | 攻擊動作 |
| 怪物受傷 | monster_hurt.mp3 | 怪物被擊中 |
| 勝利 | victory.mp3 | 戰鬥勝利 |

---

## 整合建議

### 方案 1：RPGUI + Tailwind（最快）

```bash
# 安裝
npm install rpgui tailwindcss

# 在 CSS 中引入
@import 'rpgui/dist/rpgui.css';
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 方案 2：shadcn/ui + 自訂主題

```bash
# 安裝 shadcn/ui
npx shadcn-ui@latest init

# 自訂主題變數覆蓋預設樣式
# 下載 UI 素材包製作 border-image 等效果
```

### 方案 3：完全自訂

```
1. 下載 Franuka RPG UI Pack 或類似素材
2. 切圖製作 9-slice 邊框
3. 編寫自訂 CSS 組件
4. 搭配 Radix UI 處理互動邏輯
```

---

## 實作優先順序

### Phase 1
- [ ] 整合 RPGUI 基礎樣式
- [ ] 建立 GamePanel、GameButton
- [ ] 建立血條/經驗條

### Phase 2
- [ ] 建立物品欄 UI
- [ ] 建立對話框系統
- [ ] 整合基礎動畫

### Phase 3
- [ ] 音效系統
- [ ] 進階動畫效果
- [ ] 自訂素材整合
