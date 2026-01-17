# 冒險者教學成長系統 (Adventurer Learning System)

> 一個遊戲化的教育平台，讓學習變成一場冒險！

## 📚 Spec 文件總覽

本專案採用 **Spec-Driven Development**，所有規格文件位於 `/specs` 目錄：

| 文件 | 說明 |
|------|------|
| [PROJECT.md](./specs/PROJECT.md) | 專案總覽、願景、技術棧、開發階段 |
| [DATA_MODELS.md](./specs/DATA_MODELS.md) | MongoDB 資料模型定義 |
| [API_SPEC.md](./specs/API_SPEC.md) | RESTful API 規格 |
| [GAME_LOGIC.md](./specs/GAME_LOGIC.md) | 遊戲化邏輯（經驗值、獎勵、成就） |
| [FRONTEND_SPEC.md](./specs/FRONTEND_SPEC.md) | 前端組件與頁面規格 |
| [AVATAR_SYSTEM.md](./specs/AVATAR_SYSTEM.md) | 🆕 紙娃娃角色系統、圖層合成、自訂素材上傳 |
| [MAP_BATTLE_SYSTEM.md](./specs/MAP_BATTLE_SYSTEM.md) | 🆕 地圖探索、第三人稱視角、RPG 戰鬥系統 |
| [UI_DESIGN.md](./specs/UI_DESIGN.md) | 🆕 RPG 風格 UI 設計、素材資源、動畫效果 |
| [TABLET_TOUCH.md](./specs/TABLET_TOUCH.md) | 🆕 平板觸控、虛擬搖桿、響應式設計、PWA |
| [DEPLOYMENT.md](./specs/DEPLOYMENT.md) | Zeabur 部署配置 |
| [TASKS.md](./specs/TASKS.md) | 開發任務清單（Claude Code 專用） |

---

## 🚀 如何在 Claude Code 中使用

### 方式一：從頭開始建立專案

```bash
# 1. 在 Claude Code 中開啟新對話
# 2. 上傳整個 specs 資料夾，或者貼上相關 spec 內容
# 3. 告訴 Claude Code 開始任務：

claude "請根據 specs/TASKS.md 中的 Task 1.1，初始化專案結構"
```

### 方式二：指定特定任務

```bash
# 直接指定你要進行的任務
claude "我要實作使用者認證功能，請參考：
- specs/DATA_MODELS.md 的 User model
- specs/API_SPEC.md 的 Auth API
開始撰寫程式碼"
```

### 方式三：請 Claude Code 閱讀 spec 後規劃

```bash
claude "請閱讀 specs/ 目錄下的所有文件，
然後告訴我建議的開發順序，
以及每個階段預計需要多少時間"
```

---

## 📁 最終專案結構

```
adventurer-learning-system/
├── apps/
│   ├── web/                 # React 前端（Vite + Tailwind）
│   │   ├── src/
│   │   │   ├── components/  # UI 組件
│   │   │   ├── pages/       # 頁面
│   │   │   ├── stores/      # Zustand 狀態
│   │   │   ├── hooks/       # 自訂 Hooks
│   │   │   ├── services/    # API 服務
│   │   │   └── utils/       # 工具函數
│   │   └── package.json
│   │
│   └── server/              # Express 後端
│       ├── src/
│       │   ├── routes/      # API 路由
│       │   ├── controllers/ # 控制器
│       │   ├── models/      # Mongoose Models
│       │   ├── middleware/  # 中間件
│       │   └── utils/       # 工具函數
│       └── package.json
│
├── packages/
│   └── shared/              # 共用程式碼
│
├── specs/                   # 規格文件 ← 你現在在這裡
│   ├── PROJECT.md
│   ├── DATA_MODELS.md
│   ├── API_SPEC.md
│   ├── GAME_LOGIC.md
│   ├── FRONTEND_SPEC.md
│   ├── DEPLOYMENT.md
│   └── TASKS.md
│
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

---

## 🎮 功能特色

### 學生端（冒險者介面）
- 🗺️ **地圖探索** - 第三人稱視角在 2D 地圖中移動探索
- ⚔️ **RPG 戰鬥** - 遇到怪物進入戰鬥畫面，答題即攻擊
- 👤 **紙娃娃系統** - 自訂角色外觀、髮型、服裝、武器
- 💰 **積分商店** - 用金幣購買裝備與道具
- 🎭 **角色裝扮** - 多圖層疊加、顏色自訂、動畫效果
- 🏆 **成就與排行榜** - 解鎖成就、與同學競爭
- 📱 **平板優化** - 虛擬搖桿、觸控友善、響應式設計

### 教師端（管理後台）
- 📝 **題庫管理** - 支援多學科、Markdown 格式、冒險敘事
- 👥 **班級管理** - 學生分組與追蹤
- 📊 **數據分析** - 能力雷達圖、弱點分析
- 📄 **報表輸出** - PDF / Excel 格式
- 🎨 **素材上傳** - 自訂角色部件與裝備圖片

### 遊戲化設計
- 🌲 **主題地圖** - 數學森林、語文神殿、科學實驗室...
- 👾 **特色怪物** - 數字精靈、文字妖怪、公式怪獸...
- ✨ **RPG 風格 UI** - 不是無聊的企業系統，是真正的遊戲介面！

### 跨平台支援
- 💻 **桌面瀏覽器** - 鍵盤 WASD/方向鍵控制
- 📱 **iPad / Android 平板** - 虛擬搖桿 + 觸控操作
- 📲 **PWA 支援** - 可安裝到主畫面、離線快取

---

## 🛠️ 技術棧

- **前端**: React + Vite + Tailwind CSS + Zustand
- **後端**: Node.js + Express + MongoDB
- **部署**: Zeabur
- **認證**: JWT

---

## 📝 開發筆記

### 建議的開發順序

1. **Phase 1-3** - 基礎建設、認證、題目系統
2. **Phase 4-5** - 答題系統、商店系統
3. **Phase 6-7** - 教師後台、基礎遊戲化
4. **Phase 8** - 🆕 紙娃娃角色系統
5. **Phase 9** - 🆕 地圖探索系統
6. **Phase 10** - 🆕 RPG 戰鬥系統
7. **Phase 11** - 🆕 UI 美化（RPGUI 整合）
8. **Phase 12** - Zeabur 部署、效能優化

### Claude Code 提示詞範例

```bash
# 新功能開發
claude "實作商店購買功能，需要：
1. 檢查金幣是否足夠
2. 檢查等級是否符合
3. 扣除金幣並新增道具到背包
參考 specs/API_SPEC.md 的 POST /shop/purchase"

# 除錯
claude "答題後經驗值沒有正確更新，
預期：答對 medium 題目應獲得 50 exp
實際：只獲得 0 exp
請檢查 specs/GAME_LOGIC.md 的獎勵公式並修復 bug"

# 樣式調整
claude "ShopItemCard 的稀有度邊框顏色需要調整：
- legendary 要有金色發光效果
參考 specs/FRONTEND_SPEC.md 的說明"
```

---

## 📞 問題回報

開發過程中遇到問題，可以：
1. 檢查對應的 spec 文件是否有說明
2. 在 Claude Code 中描述問題，附上錯誤訊息
3. 參考 TASKS.md 中的任務驗收標準

---

Made with ❤️ for better learning experiences
