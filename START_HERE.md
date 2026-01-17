# 🚀 Claude Code 快速啟動指南

## 你只需要做 3 件事

### Step 1：下載並解壓縮
把 `adventurer-learning-system-specs.zip` 解壓縮到你想要的位置，例如：
```
~/projects/adventurer-learning-system/
```

### Step 2：在 Claude Code 中開啟專案
```bash
cd ~/projects/adventurer-learning-system
claude
```

### Step 3：讓 Claude Code 讀取規格
複製貼上這段話給 Claude Code：

```
請閱讀 specs/ 資料夾中的所有 .md 文件，這是我的專案規格。
閱讀完後，從 TASKS.md 的 Task 1.1 開始，幫我初始化專案結構。
```

---

## 📁 資料夾結構說明

```
adventurer-learning-system/          ← 你的專案根目錄
│
├── specs/                           ← 規格文件（給 Claude Code 讀的）
│   ├── PROJECT.md                   ← 專案總覽（先讀這個）
│   ├── TASKS.md                     ← 開發任務清單（照這個做）
│   ├── DATA_MODELS.md               ← 資料庫設計
│   ├── API_SPEC.md                  ← API 規格
│   ├── GAME_LOGIC.md                ← 遊戲邏輯
│   ├── FRONTEND_SPEC.md             ← 前端組件
│   ├── AVATAR_SYSTEM.md             ← 紙娃娃系統
│   ├── MAP_BATTLE_SYSTEM.md         ← 地圖與戰鬥
│   ├── UI_DESIGN.md                 ← UI 設計
│   ├── TABLET_TOUCH.md              ← 平板觸控
│   └── DEPLOYMENT.md                ← 部署設定
│
├── README.md                        ← 專案說明
│
└── （之後 Claude Code 會在這裡建立程式碼）
    ├── apps/
    │   ├── web/                     ← React 前端
    │   └── server/                  ← Express 後端
    └── packages/
        └── shared/                  ← 共用程式碼
```

---

## 🎯 常用指令範例

### 開始新任務
```
請開始 Task 1.1，初始化專案結構
```

### 繼續上次進度
```
我們上次做到 Task 2.1，請繼續
```

### 針對特定功能
```
請閱讀 specs/AVATAR_SYSTEM.md，幫我建立紙娃娃系統
```

### 除錯
```
這個功能有 bug：[貼上錯誤訊息]
請參考 specs/API_SPEC.md 修復
```

---

## ⚠️ 重要提醒

1. **specs/ 資料夾不要動** - 這些是設計文件，不是程式碼
2. **程式碼會建在根目錄** - Claude Code 會自動建立 apps/ 等資料夾
3. **按順序開發** - 照著 TASKS.md 的順序做，不要跳著做

---

## 📋 開發階段速覽

| Phase | 內容 | 預估時間 |
|-------|------|---------|
| 1-3 | 基礎建設、認證、題目系統 | 1-2 天 |
| 4-5 | 答題獎勵、商店系統 | 1 天 |
| 6-7 | 教師後台、成就排行 | 1 天 |
| 8 | 紙娃娃角色系統 | 1 天 |
| 9-10 | 地圖探索、RPG 戰鬥 | 2 天 |
| 11 | UI 美化、平板觸控 | 1 天 |
| 12 | 部署上線 | 半天 |

---

就這樣！開始吧 🎮
