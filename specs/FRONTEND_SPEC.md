# 前端組件規格 (Frontend Components Specification)

## 頁面路由結構

```
/                           # 首頁（登入/註冊）
├── /student                # 學生介面
│   ├── /dashboard          # 學生儀表板（主頁）
│   ├── /adventure          # 冒險地圖
│   │   └── /:mapId         # 特定地圖
│   ├── /battle             # 答題戰鬥畫面
│   │   └── /:questionId
│   ├── /shop               # 商店
│   ├── /inventory          # 道具庫
│   ├── /avatar             # 角色裝扮
│   ├── /achievements       # 成就
│   ├── /leaderboard        # 排行榜
│   └── /profile            # 個人資料
│
└── /teacher                # 教師介面
    ├── /dashboard          # 教師儀表板
    ├── /questions          # 題目管理
    │   ├── /new            # 新增題目
    │   └── /:id/edit       # 編輯題目
    ├── /classes            # 班級管理
    │   └── /:id            # 班級詳情
    ├── /students           # 學生管理
    │   └── /:id            # 學生詳情
    └── /reports            # 報表中心
```

---

## 共用組件 (Shared Components)

### Layout 組件

```tsx
// components/layout/StudentLayout.tsx
interface StudentLayoutProps {
  children: React.ReactNode;
}

/**
 * 學生介面主框架
 * - 頂部：狀態列（等級、經驗條、金幣）
 * - 左側：導航選單
 * - 主體：內容區域
 */
```

```tsx
// components/layout/TeacherLayout.tsx
interface TeacherLayoutProps {
  children: React.ReactNode;
}

/**
 * 教師介面主框架
 * - 頂部：應用程式列
 * - 左側：側邊導航
 * - 主體：內容區域
 */
```

---

### UI 基礎組件

#### Button
```tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}
```

#### Card
```tsx
interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}
```

#### Modal
```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}
```

#### ProgressBar
```tsx
interface ProgressBarProps {
  value: number;        // 當前值
  max: number;          // 最大值
  showLabel?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}
```

---

## 學生端組件

### 狀態列 (StatusBar)

```tsx
// components/student/StatusBar.tsx
interface StatusBarProps {
  level: number;
  currentExp: number;
  expToNextLevel: number;
  gold: number;
  streak: number;
  avatarUrl: string;
}

/**
 * 顯示內容：
 * ┌──────────────────────────────────────────────────────┐
 * │ [Avatar] Lv.5 小明    ████████░░ 1250/2000    💰 350 │
 * │                       EXP                    🔥 x3   │
 * └──────────────────────────────────────────────────────┘
 */
```

### 能力雷達圖 (StatsRadar)

```tsx
// components/student/StatsRadar.tsx
interface StatsRadarProps {
  stats: {
    chinese: number;
    math: number;
    english?: number;
    science?: number;
    social?: number;
  };
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

/**
 * 使用 Recharts 的 RadarChart
 * 顯示各科目能力值的雷達圖
 */
```

### 冒險地圖 (AdventureMap)

```tsx
// components/student/AdventureMap.tsx
interface MapNode {
  id: string;
  name: string;
  type: 'stage' | 'boss' | 'checkpoint';
  status: 'locked' | 'available' | 'completed';
  position: { x: number; y: number };
  rewards?: { exp: number; gold: number };
}

interface AdventureMapProps {
  mapId: string;
  mapName: string;
  backgroundUrl: string;
  nodes: MapNode[];
  currentNodeId?: string;
  onNodeClick: (nodeId: string) => void;
}

/**
 * 視覺設計：
 * - 背景：主題地圖圖片
 * - 節點：圓形圖標，以路徑連接
 * - 狀態顏色：
 *   - locked: 灰色 + 鎖頭圖標
 *   - available: 金色 + 發光動畫
 *   - completed: 綠色 + 勾勾
 */
```

### 戰鬥畫面 (BattleScene)

```tsx
// components/student/BattleScene.tsx
interface BattleSceneProps {
  question: {
    content: string;
    adventureContext?: {
      description: string;
      monsterName: string;
      monsterImageUrl: string;
    };
    options: Array<{ id: string; text: string }>;
    difficulty: string;
  };
  playerAvatar: string;
  playerHp: number;      // 用於視覺效果
  timeLimit?: number;
  onAnswer: (answerId: string) => void;
  onTimeout: () => void;
}

/**
 * 畫面配置：
 * ┌────────────────────────────────────────┐
 * │     [怪物圖片]          [玩家角色]      │
 * │     數學精靈                小明        │
 * ├────────────────────────────────────────┤
 * │  「森林裡的精靈問你一個問題...」        │
 * │                                        │
 * │  ┌─────────────────────────────────┐   │
 * │  │ 5 + 3 = ?                       │   │
 * │  └─────────────────────────────────┘   │
 * │                                        │
 * │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐     │
 * │  │  A  │ │  B  │ │  C  │ │  D  │     │
 * │  │  6  │ │  7  │ │  8  │ │  9  │     │
 * │  └─────┘ └─────┘ └─────┘ └─────┘     │
 * │                                        │
 * │           ⏱️ 00:25                     │
 * └────────────────────────────────────────┘
 */
```

### 答題結果 (BattleResult)

```tsx
// components/student/BattleResult.tsx
interface BattleResultProps {
  isCorrect: boolean;
  correctAnswer: string;
  explanation?: string;
  rewards: {
    exp: number;
    gold: number;
    bonuses: Array<{ label: string; value: string }>;
  };
  levelUp?: {
    newLevel: number;
    unlockedItems?: string[];
  };
  onContinue: () => void;
  onBackToMap: () => void;
}

/**
 * 正確時：
 * - 勝利動畫 + 音效
 * - 顯示獲得獎勵（動畫數字跳動）
 * - 顯示加成明細
 *
 * 錯誤時：
 * - 安慰動畫
 * - 顯示正確答案與解析
 * - 鼓勵訊息
 */
```

### 商店道具卡 (ShopItemCard)

```tsx
// components/student/ShopItemCard.tsx
interface ShopItemCardProps {
  item: {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    price: number;
    levelRequired: number;
    effects?: { expBoost?: number; goldBoost?: number };
  };
  owned: boolean;
  canAfford: boolean;
  meetsLevelReq: boolean;
  onPurchase: () => void;
  onPreview: () => void;
}

/**
 * 稀有度邊框顏色：
 * - common: 灰色
 * - rare: 藍色
 * - epic: 紫色
 * - legendary: 金色 + 發光
 */
```

### 角色預覽 (AvatarPreview)

```tsx
// components/student/AvatarPreview.tsx
interface AvatarPreviewProps {
  baseAvatar: string;
  equipment: {
    head?: string;
    body?: string;
    weapon?: string;
    accessory?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  showSlots?: boolean;
}

/**
 * 圖層疊加順序（由下至上）：
 * 1. 基礎角色
 * 2. body（身體裝備）
 * 3. head（頭部裝備）
 * 4. weapon（武器）
 * 5. accessory（配件/特效）
 */
```

---

## 教師端組件

### 數據卡片 (StatCard)

```tsx
// components/teacher/StatCard.tsx
interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

/**
 * 儀表板用的統計卡片
 * 例：總答題數、平均正確率、活躍學生數
 */
```

### 題目編輯器 (QuestionEditor)

```tsx
// components/teacher/QuestionEditor.tsx
interface QuestionEditorProps {
  initialData?: Partial<Question>;
  onSave: (data: Question) => Promise<void>;
  onCancel: () => void;
  categories: Category[];
}

/**
 * 編輯器功能：
 * - 學科/分類選擇
 * - 難度選擇
 * - 題幹編輯（支援 Markdown + 圖片上傳）
 * - 選項編輯（可拖曳排序）
 * - 答案設定
 * - 解析編輯
 * - 冒險敘事編輯（選填）
 * - 預覽功能
 */
```

### 學生列表 (StudentTable)

```tsx
// components/teacher/StudentTable.tsx
interface StudentTableProps {
  students: Array<{
    id: string;
    name: string;
    level: number;
    exp: number;
    correctRate: number;
    lastActive: Date;
    stats: Record<string, number>;
  }>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort: (field: string) => void;
  onRowClick: (studentId: string) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

/**
 * 欄位：
 * - 名稱
 * - 等級
 * - 正確率
 * - 最後活躍
 * - 各科能力值（迷你圖表）
 * - 操作按鈕
 */
```

### 報表圖表 (ReportChart)

```tsx
// components/teacher/ReportChart.tsx
interface ReportChartProps {
  type: 'line' | 'bar' | 'pie' | 'radar';
  data: any[];
  title: string;
  xAxisKey?: string;
  yAxisKey?: string;
  colors?: string[];
}

/**
 * 使用 Recharts 繪製
 * 支援響應式大小調整
 */
```

### 班級成績分佈 (ClassDistribution)

```tsx
// components/teacher/ClassDistribution.tsx
interface ClassDistributionProps {
  classId: string;
  subject?: string;
  dateRange?: { start: Date; end: Date };
}

/**
 * 顯示內容：
 * - 成績分佈直方圖
 * - 平均線標示
 * - 可切換科目
 */
```

---

## Zustand Stores

### 使用者狀態 (useUserStore)

```typescript
// stores/userStore.ts
interface UserState {
  user: User | null;
  isLoading: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateGold: (amount: number) => void;
  updateExp: (amount: number) => void;
}
```

### 遊戲狀態 (useGameStore)

```typescript
// stores/gameStore.ts
interface GameState {
  currentQuestion: Question | null;
  streak: number;
  sessionStats: {
    questionsAnswered: number;
    correctCount: number;
    expGained: number;
    goldGained: number;
  };
  
  // Actions
  loadQuestion: (subject: string, difficulty?: string) => Promise<void>;
  submitAnswer: (answer: string, timeSpent: number) => Promise<AnswerResult>;
  resetSession: () => void;
}
```

### 商店狀態 (useShopStore)

```typescript
// stores/shopStore.ts
interface ShopState {
  items: ShopItem[];
  inventory: InventoryItem[];
  isLoading: boolean;
  
  // Actions
  loadItems: () => Promise<void>;
  loadInventory: () => Promise<void>;
  purchaseItem: (itemId: string) => Promise<void>;
  equipItem: (itemId: string, slot: string) => Promise<void>;
}
```

---

## 頁面組件

### 學生儀表板 (StudentDashboard)

```tsx
// pages/student/Dashboard.tsx

/**
 * 顯示內容：
 * 1. 歡迎訊息 + 角色展示
 * 2. 今日進度（每日任務）
 * 3. 能力雷達圖
 * 4. 最近成就
 * 5. 快速開始按鈕（選擇科目開始答題）
 * 6. 排行榜預覽（前 5 名）
 */
```

### 教師儀表板 (TeacherDashboard)

```tsx
// pages/teacher/Dashboard.tsx

/**
 * 顯示內容：
 * 1. 統計卡片列（班級數、學生數、題目數、今日活躍）
 * 2. 班級答題趨勢圖（最近 7 天）
 * 3. 需要關注的學生列表
 * 4. 答錯率最高的題目
 * 5. 快速操作（新增題目、查看報表）
 */
```
