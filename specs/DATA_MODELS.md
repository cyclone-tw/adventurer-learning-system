# 資料模型規格 (Data Models Specification)

## MongoDB Collections 概覽

```
├── users          # 所有使用者（學生、教師、管理員）
├── questions      # 題目庫
├── categories     # 題目分類（學科、單元）
├── attempts       # 答題記錄
├── items          # 商店道具定義
├── inventories    # 學生擁有的道具
├── avatars        # 角色外觀配置
├── achievements   # 成就定義
├── classes        # 班級
└── reports        # 報表快照
```

---

## User（使用者）

```typescript
interface User {
  _id: ObjectId;
  
  // 基本資訊
  email: string;                    // 登入用（唯一）
  passwordHash: string;             // bcrypt 加密
  displayName: string;              // 顯示名稱
  role: 'student' | 'teacher' | 'admin';
  
  // 學生專屬欄位
  studentProfile?: {
    level: number;                  // 等級（1 起始）
    exp: number;                    // 經驗值
    expToNextLevel: number;         // 升級所需經驗值
    gold: number;                   // 金幣
    totalQuestionsAnswered: number; // 總答題數
    correctRate: number;            // 正確率 (0-100)
    
    // 各科能力值 (0-100)
    stats: {
      chinese: number;              // 國語
      math: number;                 // 數學
      [subject: string]: number;    // 可擴展其他科目
    };
    
    currentAvatarId: ObjectId;      // 當前使用的角色外觀
    classId?: ObjectId;             // 所屬班級
  };
  
  // 教師專屬欄位
  teacherProfile?: {
    school: string;                 // 學校名稱
    classIds: ObjectId[];           // 管理的班級
  };
  
  // 時間戳記
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
}
```

### 索引
- `email`: unique
- `role`: index
- `studentProfile.classId`: index

---

## Question（題目）

```typescript
interface Question {
  _id: ObjectId;
  
  // 分類
  subject: 'chinese' | 'math' | 'english' | 'science' | 'social';
  categoryId: ObjectId;             // 關聯到 Category
  tags: string[];                   // 標籤（例如：加法、閱讀理解）
  
  // 難度與配分
  difficulty: 'easy' | 'medium' | 'hard';
  baseExp: number;                  // 基礎經驗值
  baseGold: number;                 // 基礎金幣
  
  // 題目內容
  type: 'single_choice' | 'multiple_choice' | 'fill_blank' | 'true_false';
  content: {
    text: string;                   // 題幹（支援 Markdown）
    imageUrl?: string;              // 題目圖片
    
    // 冒險敘事（遊戲化包裝）
    adventureContext?: {
      description: string;          // 例：「你遇到了一隻數學妖精...」
      monsterName?: string;         // 怪物名稱
      monsterImageUrl?: string;     // 怪物圖片
    };
  };
  
  // 選項（選擇題用）
  options?: {
    id: string;                     // 'A', 'B', 'C', 'D'
    text: string;
    imageUrl?: string;
  }[];
  
  // 答案
  answer: {
    correct: string | string[];     // 正確答案（單選為字串，多選為陣列）
    explanation?: string;           // 解析
  };
  
  // 統計
  stats: {
    totalAttempts: number;
    correctCount: number;
    avgTimeSeconds: number;
  };
  
  // 管理
  createdBy: ObjectId;              // 建立者（教師）
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 索引
- `subject`: index
- `categoryId`: index
- `difficulty`: index
- `isActive`: index

---

## Category（題目分類）

```typescript
interface Category {
  _id: ObjectId;
  
  subject: string;                  // 學科
  name: string;                     // 分類名稱（例：「五年級上學期 - 面積計算」）
  description?: string;
  parentId?: ObjectId;              // 父分類（支援巢狀）
  order: number;                    // 排序
  
  // 地圖對應（遊戲化）
  mapConfig?: {
    mapName: string;                // 地圖名稱（例：「數學森林」）
    iconUrl: string;
    backgroundColor: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Attempt（答題記錄）

```typescript
interface Attempt {
  _id: ObjectId;
  
  userId: ObjectId;                 // 學生
  questionId: ObjectId;             // 題目
  
  // 作答內容
  userAnswer: string | string[];    // 學生的答案
  isCorrect: boolean;
  timeSpentSeconds: number;         // 花費時間
  
  // 獲得獎勵
  rewards: {
    exp: number;
    gold: number;
    bonusMultiplier: number;        // 加成倍率（連續答對等）
  };
  
  // 時間
  attemptedAt: Date;
}
```

### 索引
- `userId`: index
- `questionId`: index
- `attemptedAt`: index
- `userId + attemptedAt`: compound index（查詢學生歷史紀錄）

---

## Item（道具定義）

```typescript
interface Item {
  _id: ObjectId;
  
  name: string;                     // 道具名稱
  description: string;
  type: 'equipment' | 'consumable' | 'cosmetic' | 'avatar_part';
  
  // 外觀
  imageUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  
  // 購買條件
  price: {
    gold: number;
    // 未來可擴展其他貨幣
  };
  levelRequired: number;            // 需要達到的等級
  
  // 效果（如果有）
  effects?: {
    expBoost?: number;              // 經驗加成 %
    goldBoost?: number;             // 金幣加成 %
  };
  
  // 裝備位置（如果是裝備類）
  slot?: 'head' | 'body' | 'weapon' | 'accessory';
  
  isActive: boolean;
  createdAt: Date;
}
```

---

## Inventory（學生道具庫存）

```typescript
interface Inventory {
  _id: ObjectId;
  
  userId: ObjectId;
  itemId: ObjectId;
  
  quantity: number;                 // 數量
  isEquipped: boolean;              // 是否裝備中
  acquiredAt: Date;
}
```

### 索引
- `userId`: index
- `userId + itemId`: compound unique

---

## Avatar（角色外觀配置）

```typescript
interface Avatar {
  _id: ObjectId;
  
  userId: ObjectId;
  name: string;                     // 角色名稱
  
  // 外觀組成
  appearance: {
    base: string;                   // 基礎造型 ID
    head?: ObjectId;                // 頭部道具
    body?: ObjectId;                // 身體道具
    weapon?: ObjectId;              // 武器道具
    accessory?: ObjectId;           // 配件道具
  };
  
  isDefault: boolean;               // 是否為預設角色
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Class（班級）

```typescript
interface Class {
  _id: ObjectId;
  
  name: string;                     // 班級名稱（例：「五年一班」）
  teacherId: ObjectId;              // 班導師
  joinCode: string;                 // 加入代碼（6 位英數字）
  
  studentIds: ObjectId[];           // 學生名單
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 索引
- `teacherId`: index
- `joinCode`: unique

---

## Achievement（成就定義）

```typescript
interface Achievement {
  _id: ObjectId;
  
  name: string;
  description: string;
  iconUrl: string;
  
  // 達成條件
  condition: {
    type: 'questions_answered' | 'correct_streak' | 'level_reached' | 'subject_mastery';
    threshold: number;
    subject?: string;               // 特定科目（如果需要）
  };
  
  // 獎勵
  rewards: {
    exp: number;
    gold: number;
    itemId?: ObjectId;              // 贈送道具
  };
  
  isActive: boolean;
}
```

---

## 關聯圖

```
User (student)
  │
  ├── 1:N ──▶ Attempt
  │             │
  │             └── N:1 ──▶ Question ──▶ N:1 ──▶ Category
  │
  ├── 1:N ──▶ Inventory ──▶ N:1 ──▶ Item
  │
  ├── 1:N ──▶ Avatar
  │
  └── N:1 ──▶ Class ──▶ N:1 ──▶ User (teacher)
```
