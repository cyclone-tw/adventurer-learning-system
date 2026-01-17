# 冒險者教學成長系統 (Adventurer Learning System)

## 專案願景
一個將學習遊戲化的教育平台，讓學生透過「冒險闖關」的方式練習國語、數學等科目，獲得積分兌換虛擬寶物與角色裝扮。

## 核心價值
- **高頻激勵**：答題即打怪，積分即升級
- **跨科整合**：統一題庫架構支援多學科
- **數據驅動**：教師可視化追蹤學習成效

## 目標使用者

### 學生（冒險者）
- 國小至國中學生
- 透過答題獲得經驗值與金幣
- 可在商店兌換裝備、更換角色外觀
- 查看自己的能力雷達圖與排行榜

### 教師（管理者）
- 建立與管理題庫（支援多學科）
- 查看班級/個人學習數據統計
- 輸出報表（PDF/Excel）
- 管理學生帳號與班級

## 技術棧

| 層級 | 技術選擇 | 說明 |
|------|---------|------|
| 前端 | React + Vite + Tailwind CSS | 遊戲化 UI、響應式設計 |
| 狀態管理 | Zustand | 輕量、適合即時狀態更新 |
| 後端 | Node.js + Express | RESTful API |
| 資料庫 | MongoDB | 彈性 Schema 適合題目與道具 |
| 認證 | JWT | 無狀態驗證 |
| 部署 | Zeabur | 一鍵部署、自動 CI/CD |

## 專案結構（Monorepo）

```
adventurer-learning-system/
├── apps/
│   ├── web/                 # React 前端
│   │   ├── src/
│   │   │   ├── components/  # 共用組件
│   │   │   ├── pages/       # 頁面
│   │   │   ├── stores/      # Zustand stores
│   │   │   ├── hooks/       # 自訂 hooks
│   │   │   ├── services/    # API 呼叫
│   │   │   └── utils/       # 工具函數
│   │   └── package.json
│   └── server/              # Express 後端
│       ├── src/
│       │   ├── routes/      # API 路由
│       │   ├── controllers/ # 業務邏輯
│       │   ├── models/      # Mongoose models
│       │   ├── middleware/  # 驗證、錯誤處理
│       │   └── utils/       # 工具函數
│       └── package.json
├── packages/
│   └── shared/              # 共用型別與常數
├── specs/                   # 規格文件
├── pnpm-workspace.yaml
└── package.json
```

## 開發階段規劃

### Phase 1：基礎建設（MVP）
- [ ] 專案架構與環境設定
- [ ] 使用者認證系統（登入/註冊）
- [ ] 基本題目 CRUD
- [ ] 學生答題流程
- [ ] 基本積分系統

### Phase 2：遊戲化功能
- [ ] 角色系統與裝備
- [ ] 商店與兌換機制
- [ ] 地圖與關卡系統
- [ ] 成就系統

### Phase 3：管理與分析
- [ ] 教師儀表板
- [ ] 數據統計與圖表
- [ ] 報表輸出功能
- [ ] 班級管理

### Phase 4：優化與擴展
- [ ] 效能優化
- [ ] AI 輔助出題整合
- [ ] 多語言支援
- [ ] 行動裝置優化
