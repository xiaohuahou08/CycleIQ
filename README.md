# CycleIQ - 期权交易决策智能系统

> 📈 将碎片化券商数据重建为完整策略周期

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/xiaohuahou08/CycleIQ?style=social)](https://github.com/xiaohuahou08/CycleIQ/stargazers)

---

## 📖 项目简介

CycleIQ 是一款专为**期权 Wheel Strategy** 交易者设计的智能决策系统。它帮助用户：

- 🔄 **追踪完整交易周期** — CSP → Assignment → Covered Call → Exit
- 📊 **量化策略表现** — 自动计算 Premium Income、年化收益率、胜率
- 🧠 **智能决策支持** — 基于 Delta、IV、Theta 等指标的建议
- 📈 **可视化资产组合** — 一目了然的持仓和收益概览

---

## 🎯 核心概念：Wheel Strategy

Wheel Strategy 是一种系统化期权交易策略，通过循环执行以下步骤产生持续收入：

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ┌──────────────┐    卖出虚值看跌期权     ┌──────────────┐      │
│   │              │    (Sell Cash-Secured │              │      │
│   │   等待开仓    │──────── Put) ───────▶│  持有股票    │      │
│   │              │                       │ (Assigned)   │      │
│   └──────────────┘                       └──────┬───────┘      │
│                                                 │              │
│                                                 │ 卖出看涨期权  │
│                                                 │ (Sell        │
│                                                 │ Covered      │
│                                                 │ Call)        │
│                                                 ▼              │
│   ┌──────────────┐    收回现金               ┌──────────────┐    │
│   │              │    (Call Assigned)       │              │    │
│   │   等待开仓    │◀────────────────────────│  卖出股票    │    │
│   │              │                          │  (Called     │    │
│   └──────────────┘                          │  Away)       │    │
│                                              └──────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 关键术语

| 术语 | 英文 | 说明 |
|------|------|------|
| 看跌期权 | Put Option | 赋予买方卖出标的的权利 |
| 看涨期权 | Call Option | 赋予买方买入标的的权利 |
| 保证金 | Margin/Collateral | 卖出期权需冻结的资金 |
| 权利金 | Premium | 期权的价格/收入 |
| 行权价 | Strike Price | 期权合约约定的买卖价格 |
| Delta | Delta | 期权价格对标的资产价格变动的敏感度 |
| 隐含波动率 | IV (Implied Volatility) | 高IV = 高权利金 = 卖方有利 |
| Theta | Theta | 时间价值衰减（期权卖方的朋友） |
| 被行权 | Assigned | 期权买方执行权利，买入/卖出标的 |
| 强制平仓 | Called Away | 持有的股票被以行权价卖出 |

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CycleIQ 系统架构                              │
└─────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │     Users       │
                              │   (Traders)     │
                              └────────┬────────┘
                                       │
                                       │ HTTPS
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js / React)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  Landing    │  │  Dashboard  │  │ Trade List  │  │ Auth UI     │   │
│  │  Page       │  │  (KPI/Pos)  │  │ Cycle View  │  │ (Login/Reg) │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                              │                                          │
│                    ┌─────────┴─────────┐                                │
│                    │   Supabase Auth   │                                │
│                    │  (JWT / Session)  │                                │
│                    └─────────┬─────────┘                                │
└──────────────────────────────┼────────────────────────────────────────┘
                               │ REST API
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Backend (Flask API)                             │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  Auth API   │  │ Cycle API   │  │ Trade API   │  │ Stock API   │   │
│  │  /auth/*    │  │ /api/cycles │  │ /api/trades │  │ /api/stocks │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                              │                                          │
│                    ┌─────────┴─────────┐                                │
│                    │   State Machine   │                                │
│                    │  (Wheel Cycle)    │                                │
│                    └─────────┬─────────┘                                │
└──────────────────────────────┼────────────────────────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
              ▼                                 ▼
┌─────────────────────────┐       ┌─────────────────────────┐
│    PostgreSQL           │       │  Yahoo Finance /        │
│    (Supabase)           │       │  Finnhub API            │
│    (用户数据 + RLS)      │       │  (股票实时价格)          │
└─────────────────────────┘       └─────────────────────────┘
```

### 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | Next.js 15+ / React + Vite + TypeScript | 用户界面 |
| | Tailwind CSS + shadcn/ui | 样式框架 |
| | Supabase JS Client | 认证 & 数据库客户端 |
| **后端** | Flask 3.x | Python Web 框架 |
| | SQLAlchemy + Flask-Migrate (Alembic) | ORM & 数据库迁移 |
| | Supabase Auth (HS256 JWT) | 认证（`require_auth` 装饰器） |
| | Pydantic | 数据验证 |
| **数据库** | PostgreSQL (Supabase) + Row Level Security | 主数据库（每用户数据隔离） |
| **外部 API** | Yahoo Finance / Finnhub | 股票价格数据 |

---

## ✨ 核心功能

### 期权交易周期管理

- 📋 **Wheel Cycle 全流程追踪** — 从 Sell CSP 到 Covered Call 的完整生命周期
- 🔄 **状态机自动化** — 自动处理 6 种状态转换
- 📝 **交易记录管理** — 支持所有期权类型（CSP, CC）及状态（OPEN, CLOSED, ASSIGNED, CALLED_AWAY）

### 数据可视化

- 💹 **实时价格显示** — Yahoo Finance / Finnhub 集成
- 📊 **收益仪表盘** — Premium Income、年化收益率、胜率
- 📈 **持仓概览** — 当前持仓、盈亏、到期日历

### 用户认证

- 🔐 **JWT Token 认证** — 安全可靠
- 📧 **邮箱注册登录** — 密码加密存储
- 🚪 **会话管理** — 登出、Token 刷新

---

## 📋 数据模型

Schema 由 4 张核心表组成，使用 UUID 主键，所有时间戳均为 TIMESTAMPTZ (UTC)，金额字段使用 DECIMAL(12,2)。用户认证通过 Supabase Auth (`auth.users`) 管理，并通过 Row Level Security (RLS) 实现每用户数据隔离。

### users（用户认证）

用户账户由 **Supabase Auth** (`auth.users`) 管理，无需自定义 `public.users` 表。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | 主键（Supabase 自动生成）|
| email | VARCHAR(255) UNIQUE NOT NULL | 登录邮箱 |
| created_at | TIMESTAMPTZ | 创建时间 |

> `wheel_cycles.user_id` 和 `trades.user_id` 均通过外键引用 `auth.users(id)`。所有表启用 Row Level Security (RLS)，确保用户只能访问自己的数据（`WHERE user_id = auth.uid()`）。

### wheel_cycles（交易周期）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | 主键 |
| user_id | UUID FK → users.id NOT NULL | 所属用户 |
| ticker | VARCHAR(20) NOT NULL | 股票代码（如 AAPL）|
| current_state | VARCHAR(30) NOT NULL DEFAULT 'IDLE' | 状态机当前状态 |
| start_date | DATE | 周期开始日期 |
| end_date | DATE | 周期结束日期 |
| shares_held | INTEGER DEFAULT 0 | 持有股票数量（0 或 100 的倍数）|
| cost_basis | DECIMAL(12,2) | 平均成本（被行权时）|
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

### transitions（状态转换记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | 主键 |
| cycle_id | UUID FK → wheel_cycles.id NOT NULL | 关联周期 |
| from_state | VARCHAR(30) NOT NULL | 转换前状态 |
| to_state | VARCHAR(30) NOT NULL | 转换后状态 |
| event | VARCHAR(30) NOT NULL | 触发事件（sell_csp / expire_otm / assigned / sell_cc / roll）|
| premium | DECIMAL(12,2) | 收取的权利金（如适用）|
| strike | DECIMAL(12,2) | 行权价 |
| contracts | INTEGER DEFAULT 1 | 合约数量（1 = 100 股）|
| expiry | DATE | 期权到期日 |
| trade_date | DATE NOT NULL DEFAULT CURRENT_DATE | 交易日期 |
| notes | TEXT | 用户备注（可选）|
| created_at | TIMESTAMPTZ | 创建时间 |

### trades（交易记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | 主键 |
| user_id | UUID FK → users.id NOT NULL | 所属用户 |
| cycle_id | UUID FK → wheel_cycles.id NULLABLE | 关联周期（可为空）|
| ticker | VARCHAR(20) NOT NULL | 股票代码 |
| option_type | VARCHAR(4) NOT NULL CHECK IN ('CSP','CC') | 期权类型 |
| strike | DECIMAL(12,2) NOT NULL | 行权价 |
| expiry | DATE NOT NULL | 到期日 |
| trade_date | DATE NOT NULL DEFAULT CURRENT_DATE | 交易日期 |
| premium | DECIMAL(12,2) NOT NULL | 每合约权利金 |
| delta | DECIMAL(5,3) | Delta 值（如 -0.25）|
| contracts | INTEGER DEFAULT 1 | 合约数量 |
| status | VARCHAR(15) NOT NULL DEFAULT 'OPEN' | OPEN / CLOSED / ASSIGNED / CALLED_AWAY / ROLLED |
| notes | TEXT | 用户备注 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

### 表关系

```
auth.users (Supabase Auth) 1──N wheel_cycles 1──N transitions
auth.users (Supabase Auth) 1──N trades
wheel_cycles               1──N trades (optional link)
```

---

## 🔌 API 接口

### 认证 API

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/logout` | 用户登出 |
| GET | `/api/auth/me` | 获取当前用户 |

### Cycle API

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/cycles` | 获取所有 Cycle |
| POST | `/api/cycles` | 创建新 Cycle |
| GET | `/api/cycles/:id` | 获取单个 Cycle |
| PUT | `/api/cycles/:id` | 更新 Cycle |
| DELETE | `/api/cycles/:id` | 删除 Cycle |
| POST | `/api/cycles/:id/transitions` | 添加状态转换 |
| GET | `/api/cycles/:id/metrics` | 获取统计指标 |

### Trade API

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/trades` | 获取所有 Trade |
| POST | `/api/trades` | 创建新 Trade |
| GET | `/api/trades/:id` | 获取单个 Trade |
| PUT | `/api/trades/:id` | 更新 Trade |
| DELETE | `/api/trades/:id` | 删除 Trade |
| PATCH | `/api/trades/:id/status` | 更新状态 |

### Stock API

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/stocks/quote/:symbol` | 获取股票报价 |

---

## 🚀 快速开始

### 前置要求

- Node.js 18+
- Python 3.11+
- Git

### 克隆项目

```bash
git clone https://github.com/xiaohuahou08/CycleIQ.git
cd CycleIQ
```

### 前端启动

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173

### Next.js Web Scaffold 启动

```bash
cd apps/web
npm install
npm run dev
```

访问 http://localhost:3000

### 后端启动

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
flask run
```

访问 http://localhost:5000

### 环境变量

**前端 (.env)**
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Next.js Web Scaffold (apps/web/.env.local)**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**后端 (.env)**
```env
FLASK_ENV=development
SECRET_KEY=your_secret_key
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DATABASE_POOL_URL=postgresql://user:pass@host:6543/dbname?pgbouncer=true
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
```

---

## 📁 项目结构

```
CycleIQ/
├── apps/
│   └── web/                     # Next.js 15+ Web App Scaffold
│       ├── app/                # App Router pages
│       ├── lib/supabase/       # Supabase client
│       ├── middleware.ts       # Route guard
│       └── package.json
│
├── frontend/                    # React 前端
│   ├── src/
│   │   ├── components/        # UI 组件
│   │   │   ├── Auth/          # 认证组件
│   │   │   ├── Dashboard/     # 仪表盘
│   │   │   ├── Trade/         # 交易组件
│   │   │   └── Cycle/         # Cycle 组件
│   │   ├── pages/             # 页面
│   │   ├── services/          # API 服务
│   │   ├── stores/            # 状态管理
│   │   ├── types/             # TypeScript 类型
│   │   └── App.tsx            # 主应用
│   ├── public/               # 静态资源
│   └── package.json
│
├── backend/                    # Flask 后端
│   ├── app/
│   │   ├── models/             # 数据模型
│   │   ├── routes/            # API 路由
│   │   ├── services/          # 业务逻辑
│   │   ├── state_machine/     # 状态机
│   │   └── schemas/           # 数据验证
│   ├── tests/                 # 测试
│   ├── requirements.txt
│   └── run.py                 # 入口文件
│
├── docs/                      # 文档
├── .github/
│   └── workflows/            # GitHub Actions
├── README.md
└── LICENSE
```

---

## 🧪 测试

```bash
# 后端测试
cd backend
pytest tests/ -v

# 状态机测试
pytest tests/test_state_machine.py -v
```

---

## 📦 部署

### MVP 部署（推荐）

| 服务 | 平台 | 说明 |
|------|------|------|
| **前端** | Vercel | Next.js 原生支持，自动 CI/CD |
| **后端** | Render | Flask API，免费套餐支持 |
| **数据库** | Supabase | PostgreSQL + Auth + RLS，免费套餐 |

### 前端 (Vercel)

推送到 `main` 分支，Vercel 自动检测 Next.js 并完成部署。

```bash
# 本地验证构建
cd apps/web
npm run build
```

### 后端 (Render)

1. 连接 GitHub 仓库
2. 设置 Build Command: `pip install -r requirements.txt`
3. 设置 Start Command: `gunicorn run:app`
4. 配置环境变量（DATABASE_POOL_URL, SUPABASE_JWT_SECRET 等）

> **Keep-Alive**: 免费套餐 15 分钟无流量自动休眠。参考 #52 — 可通过 GitHub Actions Cron 定期 ping `/health` 端点保持活跃。

### 生产部署 (VPS + Docker)

```bash
docker build -t cycleiq-backend ./backend
docker run -d -p 5000:5000 --env-file .env cycleiq-backend
```

### 数据库迁移

```bash
cd backend
# 开发环境（直连，port 5432）
DATABASE_URL=postgresql://... flask db upgrade

# 生产环境通过 Render Shell 执行，使用 DATABASE_URL（非 DATABASE_POOL_URL）
```

---

## 🗺️ MVP Roadmap

以下是 CycleIQ MVP 的完整 Issue 清单（共 13 个）：

| Issue | 标题 | 状态 |
|-------|------|------|
| [#2](https://github.com/xiaohuahou08/CycleIQ/issues/2) | [Docs] Wheel Strategy Bilingual Guide & Terminology Glossary | ✅ Done |
| [#3](https://github.com/xiaohuahou08/CycleIQ/issues/3) | [Feature] Wheel Strategy State Machine (Python Class + Unit Tests) | ✅ Done |
| [#6](https://github.com/xiaohuahou08/CycleIQ/issues/6) | [Feature] Web App Scaffold: Login & Registration (Mock Auth) | ✅ Done |
| [#7](https://github.com/xiaohuahou08/CycleIQ/issues/7) | [Feature] Flask API for Wheel Cycle State Machine | 🔄 In Progress |
| [#8](https://github.com/xiaohuahou08/CycleIQ/issues/8) | [Feature] Flask Auth: Supabase JWT Verification | ✅ Done |
| [#9](https://github.com/xiaohuahou08/CycleIQ/issues/9) | [Feature] Trade Records Management UI (MVP: Add Trade) | ✅ Done |
| [#10](https://github.com/xiaohuahou08/CycleIQ/issues/10) | [Task] Frontend Deployment: Vercel (Next.js) | 🔄 In Progress |
| [#11](https://github.com/xiaohuahou08/CycleIQ/issues/11) | [Spike] Supabase PostgreSQL Setup Research | 🔄 In Progress |
| [#12](https://github.com/xiaohuahou08/CycleIQ/issues/12) | [Task] Backend Deployment: Render (Flask + Health Check Keep-Alive) | ✅ Done |
| [#13](https://github.com/xiaohuahou08/CycleIQ/issues/13) | [Feature] Real-Time Ticker Price Display (Yahoo Finance / Finnhub) | 🔄 In Progress |
| [#14](https://github.com/xiaohuahou08/CycleIQ/issues/14) | [Feature] Landing Page | ✅ Done |
| [#15](https://github.com/xiaohuahou08/CycleIQ/issues/15) | [Feature] Dashboard Home Page | ✅ Done |
| [#16](https://github.com/xiaohuahou08/CycleIQ/issues/16) | [Task] Database Schema & Migration | 🔄 In Progress |

> ✅ Done = 已完成  🔄 In Progress = 进行中

---



## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

---

## 📄 许可证

本项目基于 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 📞 联系方式

- **GitHub**: https://github.com/xiaohuahou08/CycleIQ
- **Email**: xiaohua.hou@gmail.com

---

<p align="center">
  <strong>CycleIQ - 让 Wheel Strategy 交易更智能</strong>
</p>
