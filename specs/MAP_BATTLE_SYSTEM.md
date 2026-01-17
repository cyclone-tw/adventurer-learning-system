# 地圖探索與戰鬥系統規格 (Map Exploration & Battle System Specification)

## 概述

學生以第三人稱視角操控角色在 2D/2.5D 地圖中探索，遇到怪物時進入 RPG 風格的戰鬥畫面，通過答題來攻擊怪物。

---

## 地圖系統架構

### 視角與操作

```
┌──────────────────────────────────────────────────────────────┐
│                        地圖探索畫面                           │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │     🌲    🌲         👾         🌲                      │ │
│  │                    (怪物)                               │ │
│  │  🌲      🏠                          🌲    🌲          │ │
│  │                                                         │ │
│  │              🧙                                         │ │
│  │            (玩家)                                       │ │
│  │  🌲                   💎          🌲                    │ │
│  │                     (寶箱)                              │ │
│  │     🌲    🌲                  🌲         🌲            │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  [WASD/方向鍵移動]  [空白鍵互動]                             │
│                                                              │
│  ┌────────────────────┐  ┌────────────────────────────────┐ │
│  │ Lv.5 小明          │  │ 任務: 打敗 3 隻數學精靈       │ │
│  │ ████████░░ 1250 EXP│  │ 進度: ██░░░ 1/3              │ │
│  │ 💰 350             │  └────────────────────────────────┘ │
│  └────────────────────┘                                      │
└──────────────────────────────────────────────────────────────┘
```

### 視角類型選項

| 視角 | 技術實現 | 適合場景 | 複雜度 |
|------|---------|---------|--------|
| **俯視 2D** | Canvas/CSS | 簡單地圖 | ⭐ |
| **等距 2.5D** | Canvas + 排序 | 中等地圖 | ⭐⭐ |
| **第三人稱 2D** | Sprite 動畫 | 橫向捲軸 | ⭐⭐ |
| **偽 3D** | react-three-fiber | 進階效果 | ⭐⭐⭐ |

### 建議方案：等距視角 (Isometric)

使用等距視角可以營造深度感，同時保持 2D 開發的簡潔性。

---

## 資料結構

### 地圖定義

```typescript
interface GameMap {
  _id: ObjectId;
  
  // 基本資訊
  name: string;                     // 地圖名稱
  subject: string;                  // 對應學科
  description: string;              // 地圖描述
  
  // 視覺設定
  theme: 'forest' | 'castle' | 'cave' | 'temple' | 'village' | 'snow';
  backgroundUrl: string;            // 背景圖片
  tilesetUrl: string;               // 地磚圖集
  ambientMusic?: string;            // 背景音樂
  
  // 地圖尺寸
  width: number;                    // 格子數
  height: number;
  tileSize: number;                 // 每格像素大小
  
  // 地圖數據
  layers: {
    ground: number[][];             // 地面層
    obstacles: number[][];          // 障礙物層
    decorations: number[][];        // 裝飾層
  };
  
  // 物件放置
  objects: MapObject[];
  
  // 進入條件
  requirements: {
    levelRequired: number;
    previousMapId?: ObjectId;
    statRequired?: { subject: string; value: number };
  };
  
  createdAt: Date;
  updatedAt: Date;
}

interface MapObject {
  id: string;
  type: 'monster' | 'npc' | 'chest' | 'portal' | 'save_point';
  position: { x: number; y: number };
  
  // 怪物專屬
  monsterData?: {
    name: string;
    imageUrl: string;
    difficulty: 'easy' | 'medium' | 'hard';
    questionPool: {
      subject: string;
      categoryId?: ObjectId;
      count: number;                // 需要答對幾題才能擊敗
    };
    rewards: {
      exp: number;
      gold: number;
      dropItems?: { itemId: ObjectId; chance: number }[];
    };
    respawnTime: number;            // 重生時間（秒）
  };
  
  // NPC 專屬
  npcData?: {
    name: string;
    imageUrl: string;
    dialogues: string[];
    questId?: ObjectId;
  };
  
  // 寶箱專屬
  chestData?: {
    items: { itemId: ObjectId; quantity: number }[];
    gold: number;
    isOneTime: boolean;
  };
}
```

### 玩家在地圖中的狀態

```typescript
interface PlayerMapState {
  mapId: ObjectId;
  position: { x: number; y: number };
  direction: 'up' | 'down' | 'left' | 'right';
  
  // 已完成的物件
  completedObjects: string[];       // 已開過的寶箱、已打敗的怪物
  
  // 當前任務進度
  currentQuests: {
    questId: ObjectId;
    progress: number;
    target: number;
  }[];
  
  lastSavePoint?: { x: number; y: number };
  lastUpdated: Date;
}
```

---

## 地圖探索引擎

### React 組件架構

```tsx
// components/map/GameMapEngine.tsx
interface GameMapEngineProps {
  map: GameMap;
  playerState: PlayerMapState;
  avatar: StudentAvatar;
  onEncounter: (object: MapObject) => void;
  onMove: (position: { x: number; y: number }) => void;
}

/**
 * 主要功能：
 * 1. 渲染地圖圖層
 * 2. 渲染玩家角色（含動畫）
 * 3. 渲染 NPC 和怪物
 * 4. 處理鍵盤/觸控輸入
 * 5. 碰撞檢測
 * 6. 視角跟隨（Camera Follow）
 */
```

### 移動與碰撞系統

```typescript
// utils/mapEngine.ts

class MapEngine {
  private map: GameMap;
  private playerPos: { x: number; y: number };
  
  /**
   * 檢查位置是否可通行
   */
  isWalkable(x: number, y: number): boolean {
    // 邊界檢查
    if (x < 0 || x >= this.map.width || y < 0 || y >= this.map.height) {
      return false;
    }
    
    // 障礙物檢查
    const obstacle = this.map.layers.obstacles[y][x];
    if (obstacle !== 0) {
      return false;
    }
    
    return true;
  }
  
  /**
   * 移動玩家
   */
  movePlayer(direction: 'up' | 'down' | 'left' | 'right'): MoveResult {
    const delta = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };
    
    const newX = this.playerPos.x + delta[direction].x;
    const newY = this.playerPos.y + delta[direction].y;
    
    if (!this.isWalkable(newX, newY)) {
      return { success: false, reason: 'blocked' };
    }
    
    this.playerPos = { x: newX, y: newY };
    
    // 檢查是否觸發遭遇
    const encounter = this.checkEncounter(newX, newY);
    
    return { 
      success: true, 
      newPosition: this.playerPos,
      encounter 
    };
  }
  
  /**
   * 檢查是否遭遇物件
   */
  checkEncounter(x: number, y: number): MapObject | null {
    for (const obj of this.map.objects) {
      if (obj.position.x === x && obj.position.y === y) {
        return obj;
      }
    }
    return null;
  }
}

interface MoveResult {
  success: boolean;
  reason?: string;
  newPosition?: { x: number; y: number };
  encounter?: MapObject | null;
}
```

---

## 戰鬥系統

### 戰鬥畫面佈局

```
┌──────────────────────────────────────────────────────────────┐
│                        ⚔️ 戰鬥中 ⚔️                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────┐              ┌────────────────────────┐ │
│  │                │              │                        │ │
│  │   🧙 玩家     │              │     👾 數學精靈        │ │
│  │                │   VS         │                        │ │
│  │   HP ████████  │              │   HP ██████░░░░        │ │
│  │                │              │                        │ │
│  └────────────────┘              └────────────────────────┘ │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  「精靈揮動魔杖，向你發出挑戰！」                      │ │
│  │                                                        │ │
│  │  ══════════════════════════════════════════════════    │ │
│  │                                                        │ │
│  │   小明有 12 顆蘋果，給了小華 5 顆，                    │ │
│  │   又買了 8 顆。請問小明現在有幾顆蘋果？                │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │             │  │             │  │             │         │
│  │   A. 13     │  │   B. 15     │  │   C. 17     │         │
│  │             │  │             │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  ┌─────────────┐                          ⏱️ 00:45          │
│  │   D. 20     │                                            │
│  └─────────────┘                                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 戰鬥流程

```
1. 遭遇怪物
   ↓
2. 進入戰鬥畫面（過場動畫）
   ↓
3. 顯示怪物資訊與敘述
   ↓
4. 出題（根據怪物設定的題庫）
   ↓
5. 玩家回答
   ↓
   ├─→ 答對：播放攻擊動畫 → 怪物扣血
   │        ↓
   │        怪物 HP > 0 → 回到步驟 4
   │        怪物 HP <= 0 → 勝利結算
   │
   └─→ 答錯：播放怪物攻擊動畫 → 顯示正確答案
            ↓
            繼續下一題 → 回到步驟 4
   ↓
6. 戰鬥結束
   ├─→ 勝利：顯示獎勵（EXP、金幣、掉落物）
   └─→ 逃跑：返回地圖（無獎勵）
```

### 戰鬥組件規格

```tsx
// components/battle/BattleScene.tsx
interface BattleSceneProps {
  player: {
    avatar: StudentAvatar;
    name: string;
    level: number;
    stats: Record<string, number>;
  };
  monster: {
    name: string;
    imageUrl: string;
    description: string;
    totalHp: number;        // 需要答對的題數
    currentHp: number;
    attackAnimationUrl?: string;
  };
  question: {
    content: string;
    type: 'single_choice' | 'fill_blank';
    options?: Array<{ id: string; text: string }>;
    timeLimit?: number;
  };
  onAnswer: (answer: string) => void;
  onFlee: () => void;
}

// components/battle/BattleResult.tsx  
interface BattleResultProps {
  victory: boolean;
  rewards?: {
    exp: number;
    gold: number;
    items?: Array<{ name: string; imageUrl: string; quantity: number }>;
    levelUp?: boolean;
    newLevel?: number;
  };
  stats: {
    questionsAnswered: number;
    correctCount: number;
    timeSpent: number;
  };
  onContinue: () => void;
}

// components/battle/AttackAnimation.tsx
interface AttackAnimationProps {
  type: 'player_attack' | 'monster_attack' | 'critical' | 'miss';
  onComplete: () => void;
}
```

### 戰鬥動畫效果

```typescript
// 使用 Framer Motion 製作攻擊動畫
import { motion, AnimatePresence } from 'framer-motion';

const attackAnimations = {
  // 玩家攻擊怪物
  playerAttack: {
    initial: { x: 0 },
    animate: { 
      x: [0, 100, 0],
      transition: { duration: 0.5, times: [0, 0.3, 1] }
    }
  },
  
  // 怪物受傷震動
  monsterHurt: {
    animate: {
      x: [0, -10, 10, -10, 10, 0],
      filter: ['brightness(1)', 'brightness(2)', 'brightness(1)'],
      transition: { duration: 0.3 }
    }
  },
  
  // 傷害數字飄出
  damageNumber: {
    initial: { y: 0, opacity: 1, scale: 0.5 },
    animate: { 
      y: -50, 
      opacity: 0, 
      scale: 1.5,
      transition: { duration: 0.8 }
    }
  },
  
  // 怪物攻擊
  monsterAttack: {
    initial: { x: 0 },
    animate: {
      x: [0, -50, 0],
      transition: { duration: 0.4 }
    }
  }
};
```

---

## 地圖主題設計

### 學科對應地圖

| 學科 | 地圖主題 | 視覺風格 | 怪物類型 |
|------|---------|---------|---------|
| 數學 | 數學森林 | 綠色、魔法符號 | 數字精靈、公式怪獸 |
| 國語 | 文字神殿 | 古典、書卷 | 文字妖怪、詩詞精靈 |
| 英語 | 英語城堡 | 歐式、字母裝飾 | 單字騎士、文法龍 |
| 自然 | 科學實驗室 | 科技風、試管 | 元素怪、實驗生物 |
| 社會 | 歷史遺跡 | 古蹟、地圖 | 歷史幽靈、地理獸 |

### 地圖素材來源

| 資源 | 網址 | 授權 |
|------|------|------|
| itch.io 地圖包 | https://itch.io/game-assets/tag-tilemap | 各種授權 |
| OpenGameArt | https://opengameart.org/art-search?keys=tileset | CC |
| Kenney | https://kenney.nl/assets?q=2d | CC0 |

---

## 技術實現建議

### 方案 A：純 Canvas 2D（推薦入門）

```typescript
// 使用 HTML5 Canvas
class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  
  renderMap(map: GameMap): void {
    // 繪製地面
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        this.drawTile(x, y, map.layers.ground[y][x]);
      }
    }
    
    // 繪製物件（怪物、NPC）
    for (const obj of map.objects) {
      this.drawObject(obj);
    }
    
    // 繪製玩家
    this.drawPlayer();
  }
}
```

### 方案 B：react-three-fiber 2.5D（進階）

```tsx
// 使用 react-three-fiber 的等距視角
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';

function IsometricMap({ map, player }: Props) {
  return (
    <Canvas>
      <OrthographicCamera 
        makeDefault 
        position={[0, 10, 10]}
        rotation={[-Math.PI / 4, 0, 0]}
        zoom={50}
      />
      
      <MapTiles tiles={map.layers.ground} />
      <MapObjects objects={map.objects} />
      <PlayerSprite avatar={player.avatar} position={player.position} />
      
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} />
    </Canvas>
  );
}
```

### 方案 C：Phaser.js 整合（專業遊戲開發）

```typescript
// 使用 Phaser.js 遊戲引擎
import Phaser from 'phaser';

class MapScene extends Phaser.Scene {
  create() {
    // 載入地圖
    this.map = this.make.tilemap({ key: 'map' });
    
    // 創建玩家精靈
    this.player = this.physics.add.sprite(400, 300, 'player');
    
    // 碰撞設定
    this.physics.add.collider(this.player, this.obstacles);
    
    // 怪物遭遇
    this.physics.add.overlap(
      this.player, 
      this.monsters, 
      this.onMonsterEncounter,
      null,
      this
    );
  }
}

// 嵌入 React
function GameContainer() {
  const gameRef = useRef<Phaser.Game>();
  
  useEffect(() => {
    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game-container',
      scene: [MapScene, BattleScene],
      physics: { default: 'arcade' }
    });
    
    return () => gameRef.current?.destroy(true);
  }, []);
  
  return <div id="game-container" />;
}
```

---

## 實作優先順序

### Phase 1：基礎地圖
- [ ] 簡單格子地圖（Canvas 2D）
- [ ] 玩家移動（鍵盤控制）
- [ ] 基本碰撞檢測

### Phase 2：物件互動
- [ ] 怪物顯示與遭遇觸發
- [ ] 寶箱開啟
- [ ] NPC 對話

### Phase 3：戰鬥系統
- [ ] 戰鬥畫面 UI
- [ ] 答題與攻擊動畫
- [ ] 勝負判定與結算

### Phase 4：進階效果
- [ ] 等距視角升級
- [ ] 精緻動畫
- [ ] 音效與背景音樂
