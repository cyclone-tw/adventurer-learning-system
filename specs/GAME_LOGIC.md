# 遊戲化邏輯規格 (Game Logic Specification)

## 經驗值與升級系統

### 等級經驗值需求表

| 等級 | 累積經驗值 | 該級需求 | 稱號 |
|------|-----------|---------|------|
| 1 | 0 | 100 | 見習冒險者 |
| 2 | 100 | 150 | 初階冒險者 |
| 3 | 250 | 225 | 冒險者 |
| 4 | 475 | 340 | 資深冒險者 |
| 5 | 815 | 510 | 菁英冒險者 |
| 6 | 1325 | 765 | 高階冒險者 |
| 7 | 2090 | 1150 | 勇者見習生 |
| 8 | 3240 | 1725 | 勇者 |
| 9 | 4965 | 2590 | 資深勇者 |
| 10 | 7555 | 3885 | 傳奇勇者 |
| ... | 公式計算 | floor(100 * 1.5^(level-1)) | ... |

### 經驗值計算公式

```javascript
function calculateExpToNextLevel(level) {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}
```

---

## 答題獎勵系統

### 基礎獎勵表

| 難度 | 基礎 EXP | 基礎 Gold | 答對加成 | 答錯獎勵 |
|------|---------|----------|---------|---------|
| easy | 30 | 10 | 1.0x | 5 EXP |
| medium | 50 | 20 | 1.0x | 8 EXP |
| hard | 80 | 35 | 1.0x | 12 EXP |

### 獎勵計算函數

```javascript
/**
 * 計算答題獎勵
 * @param {boolean} isCorrect - 是否答對
 * @param {string} difficulty - 難度 (easy/medium/hard)
 * @param {number} timeSpentSeconds - 花費秒數
 * @param {number} currentStreak - 當前連續答對數
 * @param {object} equipmentBonus - 裝備加成
 */
function calculateRewards(isCorrect, difficulty, timeSpentSeconds, currentStreak, equipmentBonus = {}) {
  const BASE_REWARDS = {
    easy: { exp: 30, gold: 10 },
    medium: { exp: 50, gold: 20 },
    hard: { exp: 80, gold: 35 }
  };

  const WRONG_ANSWER_EXP = {
    easy: 5,
    medium: 8,
    hard: 12
  };

  // 答錯只給安慰經驗值，不給金幣
  if (!isCorrect) {
    return {
      exp: WRONG_ANSWER_EXP[difficulty],
      gold: 0,
      multiplier: 1,
      bonuses: []
    };
  }

  let baseExp = BASE_REWARDS[difficulty].exp;
  let baseGold = BASE_REWARDS[difficulty].gold;
  let multiplier = 1;
  let bonuses = [];

  // 時間加成（答題夠快）
  const TIME_THRESHOLDS = {
    easy: { fast: 15, superFast: 8 },
    medium: { fast: 30, superFast: 15 },
    hard: { fast: 60, superFast: 30 }
  };

  if (timeSpentSeconds <= TIME_THRESHOLDS[difficulty].superFast) {
    multiplier += 0.5;
    bonuses.push({ type: 'speed', label: '閃電快答', value: '+50%' });
  } else if (timeSpentSeconds <= TIME_THRESHOLDS[difficulty].fast) {
    multiplier += 0.25;
    bonuses.push({ type: 'speed', label: '快速作答', value: '+25%' });
  }

  // 連續答對加成
  if (currentStreak >= 10) {
    multiplier += 0.5;
    bonuses.push({ type: 'streak', label: '超級連擊', value: '+50%' });
  } else if (currentStreak >= 5) {
    multiplier += 0.3;
    bonuses.push({ type: 'streak', label: '連擊加成', value: '+30%' });
  } else if (currentStreak >= 3) {
    multiplier += 0.15;
    bonuses.push({ type: 'streak', label: '小連擊', value: '+15%' });
  }

  // 裝備加成
  if (equipmentBonus.expBoost) {
    const boost = equipmentBonus.expBoost / 100;
    multiplier += boost;
    bonuses.push({ type: 'equipment', label: '裝備加成', value: `+${equipmentBonus.expBoost}%` });
  }

  return {
    exp: Math.floor(baseExp * multiplier),
    gold: Math.floor(baseGold * multiplier),
    multiplier: multiplier,
    bonuses: bonuses
  };
}
```

---

## 能力值系統

### 科目能力值計算

每個科目的能力值（0-100）基於該科目的答題表現計算：

```javascript
/**
 * 更新科目能力值
 * @param {number} currentStat - 當前能力值
 * @param {boolean} isCorrect - 是否答對
 * @param {string} difficulty - 題目難度
 */
function updateSubjectStat(currentStat, isCorrect, difficulty) {
  const DIFFICULTY_WEIGHT = {
    easy: 1,
    medium: 2,
    hard: 3
  };

  const weight = DIFFICULTY_WEIGHT[difficulty];
  
  if (isCorrect) {
    // 答對：向 100 靠近
    const gain = (100 - currentStat) * 0.05 * weight;
    return Math.min(100, currentStat + gain);
  } else {
    // 答錯：向 50 靠近（不會降到太低）
    const targetFloor = 50;
    if (currentStat > targetFloor) {
      const loss = (currentStat - targetFloor) * 0.08 * weight;
      return Math.max(targetFloor, currentStat - loss);
    }
    return currentStat;
  }
}
```

### 能力雷達圖顯示

能力值直接對應雷達圖的各軸：
- chinese: 國語
- math: 數學
- english: 英語
- science: 自然
- social: 社會

---

## 商店與道具系統

### 道具稀有度

| 稀有度 | 顏色 | 金幣範圍 | 等級門檻範圍 |
|--------|------|---------|-------------|
| common | 灰色 | 50-200 | 1-3 |
| rare | 藍色 | 200-500 | 3-6 |
| epic | 紫色 | 500-1200 | 6-8 |
| legendary | 金色 | 1200-3000 | 8-10 |

### 裝備加成類型

| 加成類型 | 說明 | 範圍 |
|---------|------|------|
| expBoost | 經驗值加成 | 5%-25% |
| goldBoost | 金幣加成 | 5%-20% |
| streakProtect | 連擊保護（答錯不中斷） | 1-3 次 |

### 裝備欄位

```
┌─────────────────────┐
│        head         │  頭部：帽子、髮型
├─────────────────────┤
│        body         │  身體：服裝、盔甲
├─────────────────────┤
│       weapon        │  武器：劍、法杖、書本
├─────────────────────┤
│     accessory       │  配件：寵物、翅膀、特效
└─────────────────────┘
```

---

## 成就系統

### 成就類型

| 類型 | 說明 | 範例 |
|------|------|------|
| questions_answered | 累積答題數 | 答完 100 題 |
| correct_streak | 連續答對 | 連續答對 20 題 |
| level_reached | 達到等級 | 達到 10 級 |
| subject_mastery | 科目精通 | 數學能力達 90 |
| collection | 收集成就 | 收集 10 件裝備 |
| first_time | 首次達成 | 第一次答對困難題 |

### 成就獎勵範例

```javascript
const achievements = [
  {
    id: 'first_blood',
    name: '初試身手',
    description: '完成你的第一題',
    condition: { type: 'questions_answered', threshold: 1 },
    rewards: { exp: 50, gold: 20 }
  },
  {
    id: 'century',
    name: '百題達人',
    description: '累積作答 100 題',
    condition: { type: 'questions_answered', threshold: 100 },
    rewards: { exp: 500, gold: 200 }
  },
  {
    id: 'streak_master',
    name: '連擊大師',
    description: '連續答對 20 題',
    condition: { type: 'correct_streak', threshold: 20 },
    rewards: { exp: 300, gold: 150, itemId: 'streak_badge' }
  },
  {
    id: 'math_genius',
    name: '數學天才',
    description: '數學能力達到 95',
    condition: { type: 'subject_mastery', subject: 'math', threshold: 95 },
    rewards: { exp: 1000, gold: 500, itemId: 'math_crown' }
  }
];
```

---

## 關卡與地圖系統

### 地圖結構

每個科目對應一張主題地圖：

```
數學森林 (math)
├── 第一區：數字草原 (1-2 級)
│   ├── 關卡 1-1：加法入門
│   ├── 關卡 1-2：減法入門
│   └── BOSS：數字精靈
├── 第二區：運算山谷 (3-4 級)
│   ├── 關卡 2-1：乘法基礎
│   └── ...
└── ...

語文神殿 (chinese)
├── 第一區：識字殿堂
├── 第二區：成語迷宮
└── ...
```

### 關卡解鎖條件

```javascript
function canUnlockStage(student, stage) {
  // 檢查前置關卡
  if (stage.prerequisites) {
    const allPrereqsMet = stage.prerequisites.every(
      prereqId => student.completedStages.includes(prereqId)
    );
    if (!allPrereqsMet) return false;
  }
  
  // 檢查等級需求
  if (student.level < stage.levelRequired) return false;
  
  // 檢查科目能力值需求
  if (stage.statRequired) {
    const { subject, value } = stage.statRequired;
    if (student.stats[subject] < value) return false;
  }
  
  return true;
}
```

---

## 每日任務系統

### 任務類型

| 類型 | 說明 | 獎勵倍率 |
|------|------|---------|
| daily_login | 每日登入 | 1x |
| answer_count | 今日答題數 | 1x |
| correct_count | 今日答對數 | 1.2x |
| subject_practice | 特定科目練習 | 1.5x |
| streak_maintain | 維持連擊 | 1.3x |

### 每日任務範例

```javascript
const dailyQuests = [
  {
    id: 'daily_warmup',
    name: '每日暖身',
    description: '今天答 10 題',
    condition: { type: 'answer_count', threshold: 10 },
    rewards: { exp: 100, gold: 50 }
  },
  {
    id: 'math_practice',
    name: '數學特訓',
    description: '今天練習 5 題數學',
    condition: { type: 'subject_practice', subject: 'math', threshold: 5 },
    rewards: { exp: 80, gold: 40 }
  },
  {
    id: 'perfect_run',
    name: '完美表現',
    description: '今天連續答對 10 題',
    condition: { type: 'streak_maintain', threshold: 10 },
    rewards: { exp: 200, gold: 100 }
  }
];
```

---

## 排行榜系統

### 排行榜類型

| 類型 | 排序依據 | 重置週期 |
|------|---------|---------|
| level | 等級 + 經驗值 | 永久 |
| weekly_exp | 本週獲得經驗 | 每週一 |
| class_rank | 班級內排名 | 永久 |
| subject_rank | 單科能力排名 | 永久 |

### 排行榜獎勵（每週結算）

| 名次 | 金幣獎勵 | 額外獎勵 |
|------|---------|---------|
| 1 | 500 | 限定稱號 |
| 2-3 | 300 | - |
| 4-10 | 150 | - |
| 11-50 | 50 | - |
