# 冒險者教學成長系統 - 開發筆記

> 這份文件記錄了專案的開發流程、架構決策、偵錯經驗，方便日後回顧與維護。

---

## 目錄

1. [專案概述](#專案概述)
2. [技術架構](#技術架構)
3. [開發歷程](#開發歷程)
4. [專案結構說明](#專案結構說明)
5. [核心功能實作筆記](#核心功能實作筆記)
6. [常見問題與偵錯](#常見問題與偵錯)
7. [開發工具與指令](#開發工具與指令)
8. [素材資源說明](#素材資源說明)
9. [下次開發繼續點](#下次開發繼續點)

---

## 專案概述

### 這是什麼？

一個**遊戲化教育平台**，讓國小到國中的學生透過「冒險闖關」的方式學習數學、國語等科目。

### 核心概念

```
答題 = 打怪
經驗值 = 學習成果
金幣 = 獎勵機制
裝備 = 成就展示
```

### 兩種使用者角色

| 角色 | 功能 |
|------|------|
| **學生（冒險者）** | 答題、打怪、賺金幣、買裝備、換裝、看排行榜 |
| **教師（管理者）** | 管理題庫、建立班級、追蹤學習數據、產出報表 |

---

## 技術架構

### 技術棧選擇理由

| 技術 | 選擇 | 為什麼選它 |
|------|------|-----------|
| **前端框架** | React + Vite | 快速開發、熱更新、生態系豐富 |
| **樣式** | Tailwind CSS | 快速 UI 開發、不用寫 CSS 檔案 |
| **狀態管理** | Zustand | 比 Redux 簡單、輕量、夠用 |
| **後端** | Node.js + Express | JavaScript 全端、容易上手 |
| **資料庫** | MongoDB | Schema 彈性、適合遊戲道具這類多變資料 |
| **認證** | JWT | 無狀態、前後端分離友善 |
| **部署** | Zeabur | 一鍵部署、免費額度夠用 |

### Monorepo 結構

專案使用 **pnpm workspace** 管理，好處是：
- 前後端可以共用型別定義
- 一個指令同時啟動開發伺服器
- 依賴統一管理，不會版本衝突

```
adventurer-learning-system/
├── apps/
│   ├── web/         # React 前端
│   └── server/      # Express 後端
├── packages/
│   └── shared/      # 共用程式碼（型別、常數）
├── specs/           # 規格文件（設計藍圖）
└── package.json     # 根目錄設定
```

---

## 開發歷程

### Commit 1: 專案初始化 (2025-01-17)

**做了什麼：**
1. 建立完整的 monorepo 架構
2. 撰寫所有規格文件（specs/）
3. 設定前後端基礎框架
4. 實作認證系統（登入/註冊）
5. 建立題庫管理功能
6. 實作商店與道具系統
7. 建立教師後台基礎功能

**關鍵決策：**
- 採用 Spec-Driven Development（先寫規格再寫程式碼）
- 規格文件放在 `/specs` 給 Claude Code 讀取，確保一致性

### Commit 2: 地圖探索引擎 (2025-01-19)

**做了什麼：**
1. 實作 `GameMapEngine` 組件（Canvas 2D 渲染）
2. 整合像素風格遊戲素材（玩家、怪物、地磚）
3. 實作鍵盤控制（WASD/方向鍵）
4. 實作觸控控制（虛擬搖桿）
5. 建立 MapDemo 測試頁面
6. 新增 PROGRESS.md 追蹤開發進度

**技術亮點：**
- Canvas 像素渲染，關閉 `imageSmoothingEnabled` 保持像素清晰
- Sprite 動畫系統（玩家四方向動畫）
- 視角跟隨（Camera Follow）讓玩家保持在畫面中央
- 圖片快取機制避免重複載入

---

## 專案結構說明

### 前端重要目錄

```
apps/web/src/
├── components/          # 可重用組件
│   ├── ui/             # 基礎 UI（Button, Card...）
│   ├── game/           # 遊戲相關（地圖引擎、戰鬥）
│   ├── game-ui/        # RPG 風格 UI 組件
│   ├── avatar/         # 紙娃娃系統
│   ├── layout/         # 版面配置
│   └── notifications/  # 通知彈窗
├── pages/               # 頁面
│   ├── student/        # 學生端頁面
│   └── teacher/        # 教師端頁面
├── services/           # API 呼叫函式
├── stores/             # Zustand 狀態管理
├── utils/              # 工具函數
└── App.tsx             # 路由設定
```

### 後端重要目錄

```
apps/server/src/
├── controllers/        # 業務邏輯
├── models/             # Mongoose 資料模型
├── routes/             # API 路由定義
├── middleware/         # 中間件（認證、錯誤處理）
├── config/             # 設定檔
└── utils/              # 工具函數
```

### 素材目錄

```
apps/web/public/assets/sprites/
├── characters/         # 角色（玩家、怪物）
│   ├── player.png      # 玩家 48x48，多方向動畫
│   ├── skeleton.png    # 骷髏 48x48
│   └── slime.png       # 史萊姆 32x32
├── objects/            # 物件（寶箱、裝飾）
├── particles/          # 粒子特效
└── tilesets/           # 地磚圖集
    ├── grass.png       # 草地
    ├── plains.png      # 平原
    └── water*.png      # 水（動畫）
```

---

## 核心功能實作筆記

### 1. 地圖引擎 (GameMapEngine)

**檔案位置：** `apps/web/src/components/game/GameMapEngine.tsx`

**運作原理：**
```
1. 載入所有素材圖片（快取）
2. 根據地圖資料渲染 Canvas
   - 先畫地面層（grass tileset）
   - 再畫障礙物層（plains tileset）
   - 最後畫物件與玩家
3. 監聽鍵盤/觸控輸入
4. 檢查碰撞後更新位置
5. 重新渲染畫面
```

**關鍵程式碼片段：**
```typescript
// 關閉圖片平滑，保持像素風格
ctx.imageSmoothingEnabled = false;

// 視角跟隨玩家
let cameraX = playerPosition.x - Math.floor(viewportWidth / 2);
let cameraY = playerPosition.y - Math.floor(viewportHeight / 2);
// 限制視角不超出地圖邊界
cameraX = Math.max(0, Math.min(width - viewportWidth, cameraX));
```

### 2. 虛擬搖桿 (VirtualJoystick)

**檔案位置：** `apps/web/src/components/game-ui/VirtualJoystick.tsx`

**運作原理：**
```
1. 監聽 touchstart/touchmove/touchend
2. 計算觸控點相對搖桿中心的偏移
3. 轉換為 -1 到 1 的方向向量
4. 根據向量判斷上下左右
5. 定時觸發移動（150ms 間隔）
```

### 3. 認證流程

**流程圖：**
```
登入頁 → POST /auth/login → 取得 JWT
       → 儲存到 localStorage
       → 設定 Axios 預設 Header
       → 導向對應 Dashboard
```

### 4. 路由保護 (ProtectedRoute)

**檔案位置：** `apps/web/src/App.tsx`

```typescript
// 檢查是否登入 + 角色權限
if (!isAuthenticated) → 導向首頁
if (角色不符) → 導向對應的 Dashboard
```

---

## 常見問題與偵錯

### 問題 1: Canvas 圖片模糊

**症狀：** 像素素材看起來糊糊的

**原因：** 瀏覽器預設會平滑縮放圖片

**解法：**
```typescript
// 在 Canvas context 設定
ctx.imageSmoothingEnabled = false;

// 在 CSS 設定
canvas { image-rendering: pixelated; }
```

### 問題 2: 圖片載入失敗

**症狀：** 畫面上顯示 emoji 備用圖示，而非正式素材

**偵錯步驟：**
1. 開啟瀏覽器 DevTools → Network
2. 檢查圖片請求是否 404
3. 確認圖片路徑是否正確（應為 `/assets/sprites/...`）
4. 確認檔案有放在 `apps/web/public/` 下

### 問題 3: 鍵盤輸入沒反應

**症狀：** 按 WASD 沒有移動

**可能原因：**
1. Canvas 沒有 focus
2. 其他元素攔截了事件
3. `isMoving` 狀態卡住了

**偵錯：**
```javascript
// 在 handleKeyDown 加 console.log
console.log('Key pressed:', e.key);
console.log('isMoving:', isMoving);
```

### 問題 4: Mongoose 重複索引警告

**症狀：** 終端機顯示 `DeprecationWarning: collection.ensureIndex is deprecated`

**解法：** 在 MongoDB 連線設定加上：
```javascript
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
```

### 問題 5: JWT 過期導致 API 失敗

**症狀：** 突然所有 API 都回 401

**解法：**
1. 清除 localStorage 的 token
2. 重新登入
3. 或在前端加入自動 refresh token 機制

### 問題 6: ⚠️ 網路連線失敗（前端無法連到後端）【重要】

**症狀：**
- 登入時顯示「網路連線失敗」
- `curl` 直接測 API 正常
- 瀏覽器直接開 `http://localhost:3000/api/v1/health` 正常
- 但前端就是連不上

**根本原因：** `.env.local` 覆蓋了 API URL

**偵錯步驟：**
```bash
# 檢查 .env.local 的 VITE_API_URL
cat apps/web/.env.local

# 如果顯示非 localhost 的 IP（如 172.x.x.x），這就是問題
```

**解法：**
```bash
# 修正 .env.local
echo "VITE_API_URL=http://localhost:3000" > apps/web/.env.local

# 重啟 dev server（Vite 需要重啟才會載入新環境變數）
# 停止現有 server，然後重新執行 pnpm dev
```

**為什麼會發生：**
- 可能之前在不同網路環境（如手機熱點）開發時設定了其他 IP
- `.env.local` 優先級高於 `.env`，會覆蓋設定

**預防措施：**
- 每次開發前確認 `apps/web/.env.local` 的 `VITE_API_URL` 是 `http://localhost:3000`
- 或直接刪除 `.env.local`，讓系統使用 `.env` 的預設值

### 問題 7: Google OAuth 登入失敗

**症狀：** 點擊 Google 登入後顯示「已封鎖存取權：授權錯誤」，錯誤碼 400

**可能原因：**
1. Google Cloud Console 的 OAuth consent screen 未設定正確 scopes
2. Credentials 的 redirect URI 不正確
3. Google People API 未啟用

**解法：**
1. 到 Google Cloud Console → APIs & Services → OAuth consent screen
2. 確認已加入 scopes: `openid`, `userinfo.email`, `userinfo.profile`
3. 到 Credentials → OAuth 2.0 Client ID，確認 Authorized redirect URIs 包含：
   ```
   http://localhost:3000/api/v1/auth/google/callback
   ```
4. 啟用 Google People API

### 問題 8: 題目管理頁面空白（TypeError: Cannot read properties of undefined）

**症狀：**
- 點擊「題目管理」後頁面空白
- Console 顯示：`Uncaught TypeError: Cannot read properties of undefined (reading 'totalAttempts')`
- 錯誤位置：`Questions.tsx:364`

**根本原因：**
資料庫中的題目資料可能缺少 `stats` 欄位，導致 `question.stats.totalAttempts` 讀取 undefined 時崩潰。

**解法：**
在 `apps/web/src/pages/teacher/Questions.tsx` 中，將：
```typescript
正確率: {question.correctRate}%
作答次數: {question.stats.totalAttempts}
經驗值: {question.baseExp} / 金幣: {question.baseGold}
```
改為使用 optional chaining 和 nullish coalescing：
```typescript
正確率: {question.correctRate ?? 0}%
作答次數: {question.stats?.totalAttempts ?? 0}
經驗值: {question.baseExp ?? 0} / 金幣: {question.baseGold ?? 0}
```

**為什麼會發生：**
- 可能是手動新增題目時沒有初始化 `stats` 欄位
- 或是資料庫遷移時舊資料缺少這個欄位
- 後端 API 回傳的資料結構與前端預期不一致

**預防措施：**
- 前端讀取 API 資料時，對可能為 undefined 的欄位使用 optional chaining (`?.`)
- 後端在建立題目時確保 `stats` 欄位有預設值

---

## 開發工具與指令

### 啟動開發環境

```bash
# ⚠️ 重要：啟動前先檢查 API URL 設定
cat apps/web/.env.local
# 確認是 VITE_API_URL=http://localhost:3000
# 如果是其他 IP，請修正或刪除此檔案

# 1. 啟動 MongoDB (Docker)
docker start mongodb

# 2. 安裝依賴（只需做一次）
pnpm install

# 3. 同時啟動前後端
pnpm dev

# 只啟動前端
pnpm --filter web dev

# 只啟動後端
pnpm --filter server dev
```

### 測試地圖

```bash
# 啟動後開啟
http://localhost:5173/demo/map
```

### Git 操作

```bash
# 查看狀態
git status

# 查看提交歷史
git log --oneline

# 建立提交
git add .
git commit -m "feat: 描述做了什麼"
```

### Claude Code 常用提示詞

```bash
# 開始新任務
請閱讀 specs/TASKS.md，開始 Task X.X

# 繼續上次進度
請閱讀 PROGRESS.md，繼續上次待處理的項目

# 偵錯
這個功能有 bug：[錯誤訊息]
請幫我修復

# 理解程式碼
請解釋 GameMapEngine 的 Canvas 渲染流程
```

---

## 素材資源說明

### 玩家素材規格

| 檔案 | 尺寸 | 說明 |
|------|------|------|
| player.png | 48x48 每格 | 6 排動畫（idle、移動、各方向）|
| skeleton.png | 48x48 每格 | 骷髏戰士，多排動畫 |
| slime.png | 32x32 每格 | 史萊姆，簡單彈跳動畫 |

### Tileset 規格

| 檔案 | 格子尺寸 | 用途 |
|------|---------|------|
| grass.png | 16x16 | 草地變化 |
| plains.png | 16x16 | 樹木、石頭等障礙物 |
| water*.png | 16x16 | 水面動畫（6 幀）|

### 渲染縮放

原始素材是 16x16 或 32x32，渲染時放大到 48x48：
```typescript
const renderTileSize = 48; // 統一渲染尺寸
ctx.drawImage(
  tilesetImg,
  srcX, srcY, 16, 16,  // 原始尺寸
  destX, destY, 48, 48 // 渲染尺寸
);
```

---

## 下次開發繼續點

### 優先處理

- [ ] 後台系統 debug
- [ ] 題目系統 debug

### 功能擴充

- [ ] 戰鬥畫面 UI（RPG 風格血條、選項）
- [ ] 3D 風格地圖升級（等距 2.5D）
- [ ] 更多地圖主題
- [ ] 音效整合
- [ ] PWA 離線支援

### 如何繼續

1. 開啟專案：`cd adventurer-learning-system && claude`
2. 告訴 Claude：「請閱讀 PROGRESS.md 和 DEVELOPMENT_NOTES.md，繼續上次待處理的項目」

---

## 附錄：規格文件索引

| 文件 | 內容 | 什麼時候看 |
|------|------|-----------|
| specs/PROJECT.md | 專案總覽、願景 | 想了解整體目標時 |
| specs/DATA_MODELS.md | 資料庫結構 | 要新增/修改資料欄位時 |
| specs/API_SPEC.md | API 規格 | 要串接/新增 API 時 |
| specs/GAME_LOGIC.md | 遊戲邏輯 | 要調整經驗值、獎勵公式時 |
| specs/FRONTEND_SPEC.md | 前端組件 | 要新增頁面/組件時 |
| specs/AVATAR_SYSTEM.md | 紙娃娃系統 | 要處理角色裝扮時 |
| specs/MAP_BATTLE_SYSTEM.md | 地圖戰鬥 | 要修改地圖/戰鬥邏輯時 |
| specs/UI_DESIGN.md | UI 設計 | 要調整視覺風格時 |
| specs/TABLET_TOUCH.md | 觸控設計 | 要優化平板體驗時 |
| specs/DEPLOYMENT.md | 部署設定 | 要上線部署時 |
| specs/TASKS.md | 任務清單 | 不知道下一步做什麼時 |

---

*最後更新：2026-01-20*
*Made with Claude Code*
