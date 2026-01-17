# 平板與觸控操作規格 (Tablet & Touch Control Specification)

## 概述

本系統需要完整支援平板裝置，讓學生可以在 iPad、Android 平板等設備上流暢操作。主要考量：
- 觸控友善的 UI 設計
- 虛擬搖桿/方向控制
- 響應式版面配置
- 手勢操作支援

---

## 支援裝置規格

### 目標裝置

| 裝置類型 | 螢幕尺寸 | 解析度範圍 | 優先級 |
|---------|---------|-----------|--------|
| iPad | 9.7" - 12.9" | 1024x768 ~ 2732x2048 | ⭐⭐⭐ |
| Android 平板 | 8" - 11" | 1280x800 ~ 2560x1600 | ⭐⭐⭐ |
| 手機（橫向）| 5.5" - 6.7" | 1920x1080 | ⭐⭐ |
| 桌面瀏覽器 | 13"+ | 1366x768+ | ⭐⭐⭐ |

### Breakpoints 設定

```css
/* Tailwind CSS 配置 */
module.exports = {
  theme: {
    screens: {
      'mobile': '320px',      /* 手機 */
      'tablet': '768px',      /* 平板直向 */
      'tablet-lg': '1024px',  /* 平板橫向 / iPad Pro */
      'desktop': '1280px',    /* 桌面 */
      'desktop-lg': '1536px', /* 大螢幕 */
    }
  }
}
```

---

## 觸控控制系統

### 地圖移動控制

#### 方案 A：虛擬搖桿（推薦）

```
┌──────────────────────────────────────────────────────────────┐
│                        地圖探索畫面                           │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │                      地圖區域                            │ │
│  │                                                         │ │
│  │                        🧙                               │ │
│  │                                                         │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────┐                              ┌─────────┐       │
│  │    ↑    │                              │         │       │
│  │  ← ● → │  虛擬搖桿                     │   Ⓐ    │ 互動鍵 │
│  │    ↓    │                              │         │       │
│  └─────────┘                              └─────────┘       │
│                                                              │
│  [道具] [地圖] [角色]                        [選單]          │
└──────────────────────────────────────────────────────────────┘
```

**實作方式：**

```tsx
// components/controls/VirtualJoystick.tsx
import { useState, useRef, useCallback } from 'react';

interface VirtualJoystickProps {
  size?: number;              // 搖桿大小
  onMove: (direction: { x: number; y: number }) => void;
  onRelease: () => void;
}

function VirtualJoystick({ size = 120, onMove, onRelease }: VirtualJoystickProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const handleTouch = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current) return;
    
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // 計算相對位置（-1 到 1）
    const maxDistance = size / 2 - 20;
    let deltaX = touch.clientX - centerX;
    let deltaY = touch.clientY - centerY;
    
    // 限制範圍
    const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
    if (distance > maxDistance) {
      deltaX = (deltaX / distance) * maxDistance;
      deltaY = (deltaY / distance) * maxDistance;
    }
    
    setPosition({ x: deltaX, y: deltaY });
    
    // 正規化為 -1 到 1
    onMove({
      x: deltaX / maxDistance,
      y: deltaY / maxDistance
    });
  }, [size, onMove]);
  
  const handleTouchEnd = useCallback(() => {
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
    onRelease();
  }, [onRelease]);
  
  return (
    <div
      ref={containerRef}
      className="virtual-joystick"
      style={{ width: size, height: size }}
      onTouchStart={() => setIsDragging(true)}
      onTouchMove={handleTouch}
      onTouchEnd={handleTouchEnd}
    >
      {/* 底座 */}
      <div className="joystick-base" />
      
      {/* 搖桿 */}
      <div 
        className="joystick-stick"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`
        }}
      />
    </div>
  );
}
```

**CSS 樣式：**

```css
.virtual-joystick {
  position: fixed;
  bottom: 100px;
  left: 40px;
  z-index: 1000;
}

.joystick-base {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 100%);
  border: 3px solid rgba(255,255,255,0.3);
}

.joystick-stick {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 50px;
  height: 50px;
  margin: -25px;
  border-radius: 50%;
  background: radial-gradient(circle, #DAA520 0%, #8B4513 100%);
  border: 2px solid #FFD700;
  box-shadow: 0 4px 8px rgba(0,0,0,0.5);
  transition: transform 0.05s;
}
```

#### 方案 B：點擊移動（輔助）

```tsx
// components/map/TapToMove.tsx
interface TapToMoveProps {
  onTap: (position: { x: number; y: number }) => void;
}

function TapToMove({ onTap }: TapToMoveProps) {
  const handleTap = (e: React.TouchEvent | React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;
    
    onTap({ x, y });
  };
  
  return (
    <div 
      className="tap-area absolute inset-0"
      onClick={handleTap}
      onTouchStart={handleTap}
    />
  );
}

/**
 * 使用方式：
 * 1. 點擊地圖上的位置
 * 2. 顯示路徑指示線
 * 3. 角色自動尋路移動到該位置
 */
```

#### 方案 C：D-Pad 方向鍵（傳統）

```
     ┌─────┐
     │  ↑  │
┌────┼─────┼────┐
│ ←  │     │  → │
└────┼─────┼────┘
     │  ↓  │
     └─────┘
```

```tsx
// components/controls/DPad.tsx
function DPad({ onPress, onRelease }: DPadProps) {
  return (
    <div className="dpad-container">
      <button 
        className="dpad-btn dpad-up"
        onTouchStart={() => onPress('up')}
        onTouchEnd={() => onRelease('up')}
      >
        ▲
      </button>
      <button 
        className="dpad-btn dpad-left"
        onTouchStart={() => onPress('left')}
        onTouchEnd={() => onRelease('left')}
      >
        ◄
      </button>
      <button 
        className="dpad-btn dpad-right"
        onTouchStart={() => onPress('right')}
        onTouchEnd={() => onRelease('right')}
      >
        ►
      </button>
      <button 
        className="dpad-btn dpad-down"
        onTouchStart={() => onPress('down')}
        onTouchEnd={() => onRelease('down')}
      >
        ▼
      </button>
    </div>
  );
}
```

---

### 戰鬥畫面觸控

#### 選項按鈕設計（平板優化）

```
┌──────────────────────────────────────────────────────────────┐
│                        ⚔️ 戰鬥中 ⚔️                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│     🧙 玩家                           👾 怪物                │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   題目區域（較大字體，方便閱讀）                              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────────────┐    ┌─────────────────────┐        │
│   │                     │    │                     │        │
│   │       A. 13         │    │       B. 15         │        │
│   │                     │    │                     │        │
│   │   (大按鈕 80x80px)  │    │   (大按鈕 80x80px)  │        │
│   └─────────────────────┘    └─────────────────────┘        │
│                                                              │
│   ┌─────────────────────┐    ┌─────────────────────┐        │
│   │                     │    │                     │        │
│   │       C. 17         │    │       D. 20         │        │
│   │                     │    │                     │        │
│   └─────────────────────┘    └─────────────────────┘        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**觸控友善設計原則：**

```css
/* 最小點擊區域：44x44px（Apple HIG）/ 48x48px（Material Design） */
.touch-target {
  min-width: 48px;
  min-height: 48px;
  padding: 12px;
}

/* 選項按鈕（平板） */
@media (min-width: 768px) {
  .answer-option {
    min-height: 80px;
    font-size: 1.25rem;
    padding: 20px;
    margin: 8px;
  }
}

/* 選項按鈕（手機橫向） */
@media (max-width: 767px) and (orientation: landscape) {
  .answer-option {
    min-height: 60px;
    font-size: 1rem;
    padding: 12px;
    margin: 4px;
  }
}
```

---

### 角色編輯器觸控

#### 拖曳與縮放

```tsx
// components/avatar/TouchAvatarEditor.tsx
import { useGesture } from '@use-gesture/react';

function TouchAvatarEditor() {
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  
  // 多點觸控手勢
  const bind = useGesture({
    // 雙指旋轉預覽角色
    onRotate: ({ offset: [angle] }) => {
      setRotation(angle);
    },
    // 雙指縮放
    onPinch: ({ offset: [scale] }) => {
      setZoom(Math.max(0.5, Math.min(2, scale)));
    },
    // 單指滑動切換部件
    onDrag: ({ direction: [dx], velocity }) => {
      if (velocity > 0.5) {
        if (dx > 0) nextPart();
        else prevPart();
      }
    }
  });
  
  return (
    <div {...bind()} className="avatar-preview-touch">
      <AvatarPreview 
        rotation={rotation}
        zoom={zoom}
      />
    </div>
  );
}
```

#### 部件選擇（滑動切換）

```
┌──────────────────────────────────────────────────────────────┐
│                      角色編輯器（平板）                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│              ┌─────────────────────────┐                     │
│              │                         │                     │
│              │      角色預覽區         │                     │
│              │    (可旋轉/縮放)        │                     │
│              │                         │                     │
│              └─────────────────────────┘                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ [身體] [臉部] [頭髮] [服裝] [武器] [配件]  ← 滑動    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  ◄  │ 🎀 │ 👑 │ 🎩 │ 🧢 │ 🎀 │ 👑 │  ►              │ │
│  │      ← 左右滑動切換部件 →                              │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  顏色選擇：[●][●][●][●][●][●][●][●]  ← 水平滑動      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│             [取消]                    [儲存]                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 響應式 UI 設計

### 導航列（平板 vs 桌面）

#### 桌面版：側邊欄

```
┌────────┬─────────────────────────────────────┐
│        │                                     │
│  🏠    │                                     │
│  首頁  │                                     │
│        │           主要內容區                │
│  🗺️    │                                     │
│  地圖  │                                     │
│        │                                     │
│  🛒    │                                     │
│  商店  │                                     │
│        │                                     │
│  👤    │                                     │
│  角色  │                                     │
│        │                                     │
└────────┴─────────────────────────────────────┘
```

#### 平板版：底部導航

```
┌──────────────────────────────────────────────┐
│                                              │
│                                              │
│               主要內容區                      │
│                                              │
│                                              │
├──────────────────────────────────────────────┤
│  🏠      🗺️       🛒       👤       ⚙️      │
│  首頁    地圖     商店     角色     設定     │
└──────────────────────────────────────────────┘
```

### React 組件實作

```tsx
// components/layout/AdaptiveNavigation.tsx
import { useMediaQuery } from '@/hooks/useMediaQuery';

function AdaptiveNavigation() {
  const isTablet = useMediaQuery('(max-width: 1024px)');
  
  if (isTablet) {
    return <BottomNavigation />;
  }
  
  return <SideNavigation />;
}

// hooks/useMediaQuery.ts
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [query]);
  
  return matches;
}
```

### 底部導航組件

```tsx
// components/layout/BottomNavigation.tsx
interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

function BottomNavigation() {
  const navItems: NavItem[] = [
    { id: 'home', label: '首頁', icon: <HomeIcon />, path: '/student/dashboard' },
    { id: 'map', label: '冒險', icon: <MapIcon />, path: '/student/adventure' },
    { id: 'shop', label: '商店', icon: <ShopIcon />, path: '/student/shop' },
    { id: 'avatar', label: '角色', icon: <UserIcon />, path: '/student/avatar' },
    { id: 'settings', label: '設定', icon: <SettingsIcon />, path: '/student/settings' },
  ];
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-game-dark border-t-2 border-game-gold z-50">
      <div className="flex h-full">
        {navItems.map(item => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) => `
              flex-1 flex flex-col items-center justify-center
              text-xs touch-target
              ${isActive ? 'text-game-gold' : 'text-gray-400'}
            `}
          >
            <span className="text-xl mb-1">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
```

---

## 手勢操作總覽

| 手勢 | 動作 | 使用場景 |
|------|------|---------|
| **單指點擊** | 選擇/確認 | 所有按鈕、選項 |
| **單指滑動** | 捲動/切換 | 列表、部件選擇 |
| **單指長按** | 查看詳情 | 道具說明、怪物資訊 |
| **雙指縮放** | 放大/縮小 | 角色預覽、地圖 |
| **雙指旋轉** | 旋轉視角 | 角色預覽 |
| **左滑** | 返回/上一項 | 導航、部件切換 |
| **右滑** | 下一項 | 部件切換 |
| **下拉** | 重新整理 | 列表頁面 |

### 手勢庫推薦

```bash
# 安裝 use-gesture（輕量、React 優化）
npm install @use-gesture/react

# 或 Hammer.js（功能完整）
npm install hammerjs @types/hammerjs
```

---

## 觸控回饋

### 視覺回饋

```css
/* 點擊效果 */
.touch-feedback {
  transition: transform 0.1s, opacity 0.1s;
}

.touch-feedback:active {
  transform: scale(0.95);
  opacity: 0.8;
}

/* 漣漪效果（Material 風格） */
.ripple {
  position: relative;
  overflow: hidden;
}

.ripple::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  pointer-events: none;
  background-image: radial-gradient(circle, rgba(255,255,255,0.3) 10%, transparent 10.01%);
  background-repeat: no-repeat;
  background-position: 50%;
  transform: scale(10, 10);
  opacity: 0;
  transition: transform 0.5s, opacity 1s;
}

.ripple:active::after {
  transform: scale(0, 0);
  opacity: 0.3;
  transition: 0s;
}
```

### 震動回饋（Haptic Feedback）

```tsx
// utils/haptics.ts
export const haptics = {
  // 輕微震動（按鈕點擊）
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },
  
  // 中等震動（成功）
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  },
  
  // 強烈震動（錯誤/警告）
  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50]);
    }
  },
  
  // 成功模式
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 50, 30]);
    }
  },
  
  // 錯誤模式
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 30, 100, 30, 100]);
    }
  }
};

// 使用範例
function AnswerButton({ onSelect }: Props) {
  const handleClick = () => {
    haptics.light();
    onSelect();
  };
  
  return <button onClick={handleClick}>A. 答案</button>;
}
```

---

## 效能優化

### 觸控事件優化

```tsx
// 使用 passive 監聽器提升滾動效能
useEffect(() => {
  const handler = (e: TouchEvent) => {
    // 處理觸控
  };
  
  element.addEventListener('touchmove', handler, { passive: true });
  
  return () => element.removeEventListener('touchmove', handler);
}, []);
```

### 防止雙擊縮放

```css
/* 防止 iOS 雙擊縮放 */
* {
  touch-action: manipulation;
}

/* 特定元素禁用所有手勢（如遊戲畫布） */
.game-canvas {
  touch-action: none;
}
```

### 視口設定

```html
<!-- index.html -->
<meta 
  name="viewport" 
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
>

<!-- 防止 iOS 橡皮筋效果 -->
<meta name="apple-mobile-web-app-capable" content="yes">
```

---

## 離線支援（PWA）

### Service Worker 配置

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '冒險者學習系統',
        short_name: '冒險學習',
        description: '遊戲化教育平台',
        theme_color: '#8B4513',
        background_color: '#2C1810',
        display: 'standalone',
        orientation: 'any',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        // 快取遊戲素材
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50 }
            }
          }
        ]
      }
    })
  ]
});
```

---

## 實作優先順序

### Phase 1（基礎觸控）
- [ ] 虛擬搖桿組件
- [ ] 觸控友善按鈕尺寸
- [ ] 底部導航列
- [ ] 基本響應式佈局

### Phase 2（進階手勢）
- [ ] 角色編輯器滑動切換
- [ ] 地圖縮放手勢
- [ ] 長按查看詳情

### Phase 3（優化）
- [ ] 震動回饋
- [ ] PWA 離線支援
- [ ] 效能優化

---

## 測試檢查清單

### 觸控測試
- [ ] 所有按鈕可正常點擊（≥48px）
- [ ] 虛擬搖桿操作流暢
- [ ] 沒有誤觸問題
- [ ] 長按不會觸發系統選單

### 響應式測試
- [ ] iPad 9.7" 直向/橫向
- [ ] iPad Pro 12.9" 直向/橫向
- [ ] Android 10" 平板
- [ ] 手機橫向模式

### 效能測試
- [ ] 觸控回應時間 < 100ms
- [ ] 地圖滾動流暢（60fps）
- [ ] 動畫不卡頓
