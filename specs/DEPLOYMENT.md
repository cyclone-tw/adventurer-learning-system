# 部署配置規格 (Deployment Specification)

## Zeabur 部署架構

```
Zeabur Project: adventurer-learning-system
├── Service: web (React Frontend)
│   ├── Type: Static Site
│   ├── Build: npm run build
│   └── Output: dist/
│
├── Service: api (Node.js Backend)
│   ├── Type: Node.js
│   ├── Port: 3000
│   └── Start: npm start
│
└── Service: mongodb (Database)
    ├── Type: MongoDB
    └── Version: 6.0
```

---

## 環境變數配置

### 後端 (api) 環境變數

| 變數名稱 | 說明 | 範例值 |
|---------|------|--------|
| `NODE_ENV` | 執行環境 | `production` |
| `PORT` | 服務端口 | `3000` |
| `MONGO_URL` | MongoDB 連線字串 | Zeabur 自動注入 |
| `JWT_SECRET` | JWT 加密密鑰 | `your-super-secret-key` |
| `JWT_EXPIRES_IN` | Token 過期時間 | `7d` |
| `CORS_ORIGIN` | 允許的前端網域 | `https://your-app.zeabur.app` |

### 前端 (web) 環境變數

| 變數名稱 | 說明 | 範例值 |
|---------|------|--------|
| `VITE_API_URL` | 後端 API 網址 | `https://api.your-app.zeabur.app` |
| `VITE_APP_NAME` | 應用程式名稱 | `冒險者學習系統` |

---

## 專案配置檔案

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 根目錄 package.json

```json
{
  "name": "adventurer-learning-system",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "pnpm -r --parallel run dev",
    "build": "pnpm -r run build",
    "lint": "pnpm -r run lint",
    "test": "pnpm -r run test"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

### apps/server/package.json

```json
{
  "name": "@als/server",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src/",
    "test": "vitest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-validator": "^7.0.1",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/cors": "^2.8.17",
    "tsx": "^4.6.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
```

### apps/web/package.json

```json
{
  "name": "@als/web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src/"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "zustand": "^4.4.7",
    "axios": "^1.6.2",
    "recharts": "^2.10.3",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.2.0",
    "lucide-react": "^0.303.0",
    "@tanstack/react-query": "^5.17.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.10"
  }
}
```

---

## Zeabur 服務配置

### zeabur.json (根目錄)

```json
{
  "$schema": "https://json-schema.zeabur.app/v2/project.json",
  "build": {
    "web": {
      "type": "static",
      "root": "apps/web",
      "build_command": "pnpm install && pnpm build",
      "output_dir": "dist"
    },
    "api": {
      "type": "nodejs",
      "root": "apps/server",
      "build_command": "pnpm install && pnpm build",
      "start_command": "pnpm start"
    }
  }
}
```

---

## 目錄結構建立腳本

```bash
#!/bin/bash

# 建立專案目錄結構
mkdir -p adventurer-learning-system/{apps/{web/src/{components,pages,stores,hooks,services,utils},server/src/{routes,controllers,models,middleware,utils}},packages/shared/src,specs}

# 進入專案目錄
cd adventurer-learning-system

# 初始化 pnpm workspace
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# 初始化根目錄 package.json
cat > package.json << 'EOF'
{
  "name": "adventurer-learning-system",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "pnpm -r --parallel run dev",
    "build": "pnpm -r run build",
    "lint": "pnpm -r run lint"
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  }
}
EOF

echo "✅ 專案結構建立完成！"
```

---

## 本地開發流程

### 1. 環境準備

```bash
# 安裝 pnpm
npm install -g pnpm

# 安裝所有依賴
pnpm install

# 複製環境變數範本
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

### 2. 啟動本地 MongoDB（使用 Docker）

```bash
docker run -d \
  --name als-mongodb \
  -p 27017:27017 \
  -v als-mongo-data:/data/db \
  mongo:6.0
```

### 3. 啟動開發伺服器

```bash
# 同時啟動前後端
pnpm dev

# 或分別啟動
pnpm --filter @als/server dev  # 後端 http://localhost:3000
pnpm --filter @als/web dev     # 前端 http://localhost:5173
```

---

## Zeabur 部署步驟

### 1. 連結 GitHub Repository

1. 登入 [Zeabur Dashboard](https://dash.zeabur.com)
2. 建立新專案
3. 點擊「Deploy New Service」→「Git」
4. 選擇你的 GitHub repository

### 2. 部署 MongoDB

1. 在同一專案中點擊「Deploy New Service」
2. 選擇「Marketplace」→「MongoDB」
3. Zeabur 會自動產生 `MONGO_URL` 並注入到其他服務

### 3. 配置環境變數

在 Zeabur Dashboard 的每個服務中設定環境變數：

**api 服務：**
```
NODE_ENV=production
JWT_SECRET=<生成一個安全的隨機字串>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=<你的前端網址>
```

**web 服務：**
```
VITE_API_URL=<你的 API 網址>
```

### 4. 設定自訂網域（選用）

1. 在服務設定中點擊「Networking」
2. 新增自訂網域
3. 依照指示設定 DNS CNAME 記錄

---

## CI/CD 流程

Zeabur 會自動：
1. 偵測 GitHub push 事件
2. 執行 build 指令
3. 重新部署服務
4. 執行健康檢查

### GitHub Actions（選用，用於測試）

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
          
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test
```

---

## 監控與日誌

### Zeabur 內建監控

- 服務狀態（Running / Stopped / Error）
- CPU / Memory 使用量
- 網路流量
- 部署歷史

### 日誌查看

```bash
# 在 Zeabur Dashboard 的服務頁面
# 點擊「Logs」標籤即可查看即時日誌
```

### 錯誤追蹤（建議整合）

可考慮整合：
- Sentry（錯誤追蹤）
- LogRocket（前端 session replay）
