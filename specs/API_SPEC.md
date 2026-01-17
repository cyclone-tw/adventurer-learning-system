# API 規格 (API Specification)

## 概覽

- **Base URL**: `https://your-domain.zeabur.app/api/v1`
- **認證方式**: JWT Bearer Token
- **回應格式**: JSON

## 通用回應格式

### 成功回應
```json
{
  "success": true,
  "data": { ... }
}
```

### 錯誤回應
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

### 分頁回應
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 認證 API (Auth)

### POST /auth/register
註冊新帳號

**Request Body:**
```json
{
  "email": "student@example.com",
  "password": "securePassword123",
  "displayName": "小明",
  "role": "student",
  "classJoinCode": "ABC123"  // 學生選填
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "email": "student@example.com",
      "displayName": "小明",
      "role": "student"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### POST /auth/login
登入

**Request Body:**
```json
{
  "email": "student@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### GET /auth/me
取得當前使用者資訊

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "email": "student@example.com",
    "displayName": "小明",
    "role": "student",
    "studentProfile": {
      "level": 5,
      "exp": 1250,
      "expToNextLevel": 2000,
      "gold": 350,
      "stats": {
        "chinese": 72,
        "math": 85
      }
    }
  }
}
```

---

## 題目 API (Questions)

### GET /questions
取得題目列表（教師用 / 篩選用）

**Query Parameters:**
| 參數 | 類型 | 說明 |
|------|------|------|
| subject | string | 學科篩選 |
| categoryId | string | 分類篩選 |
| difficulty | string | 難度篩選 |
| page | number | 頁碼（預設 1） |
| limit | number | 每頁數量（預設 20） |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "subject": "math",
      "difficulty": "medium",
      "content": {
        "text": "12 + 8 = ?",
        "adventureContext": {
          "description": "一隻小妖精擋住了你的去路..."
        }
      },
      "type": "single_choice",
      "options": [
        { "id": "A", "text": "18" },
        { "id": "B", "text": "20" },
        { "id": "C", "text": "22" }
      ]
    }
  ],
  "pagination": { ... }
}
```

---

### GET /questions/random
取得隨機題目（學生答題用）

**Query Parameters:**
| 參數 | 類型 | 說明 |
|------|------|------|
| subject | string | 學科（必填） |
| difficulty | string | 難度（選填） |
| count | number | 數量（預設 1，最多 10） |
| excludeIds | string | 排除的題目 ID（逗號分隔） |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "subject": "math",
    "content": { ... },
    "options": [ ... ],
    "difficulty": "medium",
    "baseExp": 50,
    "baseGold": 20
    // 注意：不包含 answer 欄位
  }
}
```

---

### POST /questions
建立新題目（教師）

**Headers:** `Authorization: Bearer <token>` (需要 teacher 角色)

**Request Body:**
```json
{
  "subject": "math",
  "categoryId": "...",
  "difficulty": "medium",
  "type": "single_choice",
  "content": {
    "text": "小明有 5 顆蘋果，小華給了他 3 顆，請問小明現在有幾顆蘋果？",
    "adventureContext": {
      "description": "森林裡的精靈問你一個問題...",
      "monsterName": "數學精靈"
    }
  },
  "options": [
    { "id": "A", "text": "6" },
    { "id": "B", "text": "7" },
    { "id": "C", "text": "8" },
    { "id": "D", "text": "9" }
  ],
  "answer": {
    "correct": "C",
    "explanation": "5 + 3 = 8，所以小明現在有 8 顆蘋果。"
  },
  "tags": ["加法", "應用題"]
}
```

---

### PUT /questions/:id
更新題目（教師）

---

### DELETE /questions/:id
刪除題目（教師，軟刪除）

---

## 答題 API (Attempts)

### POST /attempts
提交答案

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "questionId": "...",
  "answer": "C",
  "timeSpentSeconds": 25
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "isCorrect": true,
    "correctAnswer": "C",
    "explanation": "5 + 3 = 8...",
    "rewards": {
      "exp": 75,
      "gold": 30,
      "bonusMultiplier": 1.5,
      "bonusReason": "答題迅速"
    },
    "userProgress": {
      "newExp": 1325,
      "newGold": 380,
      "leveledUp": false,
      "newLevel": 5,
      "expToNextLevel": 675,
      "streak": 3
    }
  }
}
```

---

### GET /attempts/history
取得答題歷史

**Query Parameters:**
| 參數 | 類型 | 說明 |
|------|------|------|
| subject | string | 學科篩選 |
| startDate | string | 開始日期（ISO 8601） |
| endDate | string | 結束日期 |
| page | number | 頁碼 |
| limit | number | 每頁數量 |

---

## 商店 API (Shop)

### GET /shop/items
取得商店道具列表

**Query Parameters:**
| 參數 | 類型 | 說明 |
|------|------|------|
| type | string | 道具類型篩選 |
| rarity | string | 稀有度篩選 |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "勇者之劍",
      "description": "傳說中的勇者所使用的劍",
      "type": "equipment",
      "slot": "weapon",
      "rarity": "rare",
      "imageUrl": "/images/items/sword.png",
      "price": { "gold": 500 },
      "levelRequired": 10,
      "effects": { "expBoost": 10 },
      "owned": false,
      "canAfford": true,
      "meetsLevelReq": false
    }
  ]
}
```

---

### POST /shop/purchase
購買道具

**Request Body:**
```json
{
  "itemId": "..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "item": { ... },
    "newGold": 850,
    "inventory": { ... }
  }
}
```

---

## 角色 API (Avatar)

### GET /avatar
取得當前角色配置

### PUT /avatar/equip
裝備道具

**Request Body:**
```json
{
  "slot": "weapon",
  "itemId": "..."  // null 表示卸下
}
```

---

## 班級 API (Classes) - 教師用

### GET /classes
取得教師管理的班級列表

### POST /classes
建立新班級

### GET /classes/:id/students
取得班級學生列表

### GET /classes/:id/stats
取得班級統計數據

**Response (200):**
```json
{
  "success": true,
  "data": {
    "className": "五年一班",
    "studentCount": 28,
    "summary": {
      "totalAttempts": 1250,
      "avgCorrectRate": 72.5,
      "avgLevel": 4.2
    },
    "subjectStats": {
      "math": { "avgScore": 78, "weakTopics": ["分數", "面積"] },
      "chinese": { "avgScore": 71, "weakTopics": ["成語", "閱讀理解"] }
    },
    "topStudents": [ ... ],
    "needsAttention": [ ... ]
  }
}
```

---

## 報表 API (Reports) - 教師用

### POST /reports/generate
產生報表

**Request Body:**
```json
{
  "type": "class_summary" | "student_detail" | "question_analysis",
  "classId": "...",
  "studentId": "...",  // 選填
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "format": "pdf" | "excel"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "reportId": "...",
    "downloadUrl": "/api/v1/reports/download/...",
    "expiresAt": "2024-01-15T12:00:00Z"
  }
}
```

---

## 錯誤代碼對照表

| 代碼 | HTTP Status | 說明 |
|------|-------------|------|
| AUTH_INVALID_CREDENTIALS | 401 | 帳號或密碼錯誤 |
| AUTH_TOKEN_EXPIRED | 401 | Token 已過期 |
| AUTH_UNAUTHORIZED | 403 | 無權限執行此操作 |
| USER_NOT_FOUND | 404 | 使用者不存在 |
| QUESTION_NOT_FOUND | 404 | 題目不存在 |
| INSUFFICIENT_GOLD | 400 | 金幣不足 |
| LEVEL_REQUIREMENT_NOT_MET | 400 | 等級不足 |
| CLASS_NOT_FOUND | 404 | 班級不存在 |
| INVALID_JOIN_CODE | 400 | 班級代碼無效 |
