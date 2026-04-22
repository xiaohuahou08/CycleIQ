# CycleIQ - 期权交易决策智能系统

> 📈 将碎片化券商数据重建为完整策略周期

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/xiaohuahou08/CycleIQ?style=social)](https://github.com/xiaohuahou08/CycleIQ/stargazers)
[![Twitter Follow](https://img.shields.io/twitter/follow/CycleIQ?style=social)](https://twitter.com/CycleIQ)

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
│   │   等待开仓    │◀────────────────────────│  持有股票    │    │
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
│                           Frontend (React)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  Dashboard  │  │ Trade List  │  │ Cycle View  │  │   Auth UI   │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                              │                                          │
│                    ┌─────────┴─────────┐                                │
│                    │   State Store   │                                │
│                    │   (Zustand)     │                                │
│                    └─────────┬─────────┘                                │
└──────────────────────────────┼────────────────────────────────────────┘
                               │ REST API
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Backend (Flask API)                             │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  Auth API  │  │ Cycle API   │  │ Trade API   │  │ Stock API   │   │
│  │  /auth/*   │  │ /api/cycles │  │ /api/trades │  │ /api/stocks │   │
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
│    Supabase             │       │  Yahoo Finance /        │
│    PostgreSQL           │       │  Finnhub API            │
│    (User Data)          │       │  (Stock Prices)         │
└─────────────────────────┘       └─────────────────────────┘
```

### 技术栈详情

#### Frontend
- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Charts**: Chart.js / Recharts
- **Deployment**: GitHub Pages

#### Backend
- **Framework**: Flask 3.x
- **Language**: Python 3.11+
- **ORM**: SQLAlchemy
- **Authentication**: Flask-JWT-Extended / Supabase Auth
- **Validation**: Marshmallow / Pydantic
- **Testing**: pytest
- **Deployment**: Render / VPS + Docker

#### Database
- **Primary DB**: PostgreSQL (Supabase)
- **ORM**: SQLAlchemy

#### External APIs
- **Stock Prices**: Yahoo Finance / Finnhub
- **Auth**: Supabase Auth / JWT

---

## ✨ 功能特性

### MVP (目标 2026-04-25)

- [ ] **#3 State Machine** — Wheel Cycle 状态机核心逻辑
  - 6 个状态：WAITING_CSP, HOLDING_CSP, HOLDING_STOCK, HOLDING_CC, COMPLETED, ROLLED
  - 8 种转换事件：sell_csp, expire_otm, assigned, sell_cc, called_away, roll, close, force_close

- [ ] **#8 Flask Auth API** — 用户认证系统
  - 注册 / 登录 / 登出
  - JWT Token 认证
  - 密码安全（bcrypt 哈希）

- [ ] **#6 Web App Scaffold** — 前端基础架构
  - React + Vite + TypeScript
  - 路由系统
  - 状态管理
  - Mock Auth（开发阶段）

- [ ] **#7 Flask Cycle + Trade API** — 核心业务 API
  - Cycle CRUD + 状态转换
  - Trade CRUD + 状态更新
  - 交易指标计算

- [ ] **#9 Trade Records Management UI** — 交易记录管理
  - 交易列表（支持筛选、排序）
  - 新建/编辑交易表单
  - 实时价格显示

- [ ] **#13 Ticker Price Display** — 股票价格显示
  - Yahoo Finance / Finnhub 集成
  - 实时价格 + 涨跌幅
  - 自动刷新

- [ ] **#10 Frontend Deployment** — 前端部署
  - GitHub Pages 自动部署
  - GitHub Actions CI/CD

- [ ] **#11 Supabase PostgreSQL Setup** — 数据库配置
  - Supabase 项目创建
  - 数据库 Schema 设计
  - 连接配置

- [ ] **#12 Backend Deployment** — 后端部署
  - Render / VPS 部署
  - 环境变量配置
  - SSL 证书

### Future Iterations

- [ ] **数据导入** — 从券商 CSV/Excel 导入交易记录
- [ ] **回测引擎** — 基于历史数据的策略回测
- [ ] **通知系统** — 期权到期、价格异动提醒
- [ ] **税务报告** — 交易收益税务计算
- [ ] **Circle Visualization** — Wheel Cycle 圆形可视化
- [ ] **移动端 App** — iOS/Android 原生应用

---

## 📋 数据模型

### Wheel Cycle

```
WheelCycle
├── id: UUID (Primary Key)
├── user_id: UUID (Foreign Key)
├── ticker: String (股票代码，如 AAPL)
├── status: Enum (状态)
├── entry_date: Date
├── exit_date: Date (nullable)
├── target_premium: Decimal
├── actual_premium: Decimal
├── notes: Text
├── created_at: DateTime
└── updated_at: DateTime
```

### Transition

```
Transition
├── id: UUID (Primary Key)
├── cycle_id: UUID (Foreign Key)
├── from_state: Enum
├── to_state: Enum
├── event: String (转换事件)
├── trade_id: UUID (nullable, Foreign Key)
├── premium: Decimal
├── delta: Decimal
├── notes: Text
└── created_at: DateTime
```

### Trade

```
Trade
├── id: UUID (Primary Key)
├── cycle_id: UUID (Foreign Key)
├── user_id: UUID (Foreign Key)
├── ticker: String
├── option_type: Enum (CALL / PUT)
├── strike: Decimal
├── expiry: Date
├── trade_date: Date
├── premium: Decimal
├── delta: Decimal
├── contracts: Integer
├── status: Enum (OPEN / CLOSED / ASSIGNED / CALLED_AWAY)
├── notes: Text
├── created_at: DateTime
└── updated_at: DateTime
```

### User

```
User
├── id: UUID (Primary Key)
├── email: String (Unique)
├── password_hash: String
├── name: String
├── created_at: DateTime
└── updated_at: DateTime
```

---

## 🚀 快速开始

### 前置要求

- Node.js 18+
- Python 3.11+
- Git
- Supabase 账户（可选，本地开发可用 SQLite）

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

### 后端启动

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
export FLASK_ENV=development  # Windows: $env:FLASK_ENV=development
flask run
```

访问 http://localhost:5000

### 环境变量

**Frontend (.env)**
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Backend (.env)**
```env
FLASK_ENV=development
SECRET_KEY=your_secret_key
DATABASE_URL=sqlite:///cycleiq.db
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET_KEY=your_jwt_secret
```

---

## 📁 项目结构

```
CycleIQ/
├── frontend/                    # React 前端
│   ├── src/
│   │   ├── components/        # React 组件
│   │   │   ├── Auth/          # 认证组件
│   │   │   ├── Dashboard/     # 仪表盘组件
│   │   │   ├── Trade/         # 交易组件
│   │   │   └── Cycle/          # Cycle 组件
│   │   ├── pages/             # 页面
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Trades.tsx
│   │   │   └── Cycles.tsx
│   │   ├── services/          # API 服务
│   │   │   ├── api.ts         # Axios 配置
│   │   │   ├── auth.ts        # 认证 API
│   │   │   ├── cycles.ts      # Cycle API
│   │   │   ├── trades.ts      # Trade API
│   │   │   └── stocks.ts      # 股票价格 API
│   │   ├── stores/            # 状态管理
│   │   │   ├── authStore.ts
│   │   │   ├── cycleStore.ts
│   │   │   └── tradeStore.ts
│   │   ├── types/             # TypeScript 类型
│   │   │   ├── auth.ts
│   │   │   ├── cycle.ts
│   │   │   └── trade.ts
│   │   ├── utils/             # 工具函数
│   │   └── App.tsx            # 主应用
│   ├── public/               # 静态资源
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/                    # Flask 后端
│   ├── app/
│   │   ├── __init__.py        # App Factory
│   │   ├── config.py          # 配置
│   │   ├── models/             # 数据模型
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── cycle.py
│   │   │   ├── transition.py
│   │   │   └── trade.py
│   │   ├── routes/            # API 路由
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── cycles.py
│   │   │   ├── trades.py
│   │   │   └── stocks.py
│   │   ├── services/          # 业务逻辑
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── cycle_service.py
│   │   │   ├── trade_service.py
│   │   │   └── stock_service.py
│   │   ├── state_machine/     # 状态机
│   │   │   ├── __init__.py
│   │   │   └── wheel_cycle.py
│   │   └── schemas/           # 数据验证
│   │       ├── __init__.py
│   │       ├── auth.py
│   │       ├── cycle.py
│   │       └── trade.py
│   ├── tests/                 # 测试
│   │   ├── __init__.py
│   │   ├── test_auth.py
│   │   ├── test_cycles.py
│   │   ├── test_trades.py
│   │   └── test_state_machine.py
│   ├── migrations/            # 数据库迁移
│   ├── requirements.txt
│   ├── run.py               # 入口文件
│   └── config.py
│
├── docs/                      # 文档
│   ├── wheel-strategy-guide.md
│   ├── terminology-glossary.md
│   └── api-reference.md
│
├── .github/
│   └── workflows/            # GitHub Actions
│       ├── frontend-deploy.yml
│       └── backend-deploy.yml
│
├── README.md                  # 项目说明
├── LICENSE                    # MIT License
└── .gitignore
```

---

## 🔌 API 参考

### 认证 API

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/logout` | 用户登出 |
| GET | `/api/auth/me` | 获取当前用户信息 |

### Cycle API

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/cycles` | 获取所有 Cycle |
| POST | `/api/cycles` | 创建新 Cycle |
| GET | `/api/cycles/:id` | 获取单个 Cycle |
| PUT | `/api/cycles/:id` | 更新 Cycle |
| DELETE | `/api/cycles/:id` | 删除 Cycle |
| POST | `/api/cycles/:id/transitions` | 添加转换事件 |
| GET | `/api/cycles/:id/metrics` | 获取 Cycle 指标 |

### Trade API

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/trades` | 获取所有 Trade |
| POST | `/api/trades` | 创建新 Trade |
| GET | `/api/trades/:id` | 获取单个 Trade |
| PUT | `/api/trades/:id` | 更新 Trade |
| DELETE | `/api/trades/:id` | 删除 Trade |
| PATCH | `/api/trades/:id/status` | 更新 Trade 状态 |

### Stock API

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/stocks/quote/:symbol` | 获取股票报价 |

---

## 📅 项目路线图

### MVP Core (目标: 2026-04-25)

```
Apr 22 ┌─────────────────────────────────────────┐
       │ #11 Supabase PostgreSQL Setup          │  Spike
       └─────────────────────────────────────────┘

Apr 23 ┌─────────────────────────────────────────┐
       │ #3  Wheel Cycle State Machine           │  P0
       └─────────────────────────────────────────┘

Apr 24 ┌───────────────────┐  ┌───────────────────┐
       │ #6  Web App UI    │  │ #9  Trade UI     │  P0
       └───────────────────┘  └───────────────────┘

Apr 25 ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
       │ #8  Auth API     │  │ #7  Cycle+Trade  │  │ #2  Documentation │  P1/P2
       │                   │  │ API              │  │                   │
       └───────────────────┘  └───────────────────┘  └───────────────────┘

Apr 26 ┌───────────────────┐  ┌───────────────────┐
       │ #10 Frontend     │  │ #13 Ticker Price │  P1
       │ Deploy           │  │ Display          │
       └───────────────────┘  └───────────────────┘

Apr 27 ┌─────────────────────────────────────────┐
       │ #12 Backend Deployment                 │  P1
       └─────────────────────────────────────────┘

       ✅ MVP Core Released!
```

### 未来迭代

- **Phase 2**: 数据导入、通知系统
- **Phase 3**: 回测引擎、税务报告
- **Phase 4**: Circle 可视化、移动端 App

---

## 🧪 测试

### 运行前端测试

```bash
cd frontend
npm test
```

### 运行后端测试

```bash
cd backend
pytest tests/ -v
```

### 运行状态机测试

```bash
cd backend
pytest tests/test_state_machine.py -v
```

---

## 📦 部署

### 前端部署 (GitHub Pages)

推送到 `main` 分支自动部署：
```bash
git push origin main
```

访问: https://xiaohuahou08.github.io/CycleIQ/

### 后端部署 (Render)

[![Deploy to Render](https://render.com/image/deploy-to-render-button.svg)](https://render.com/deploy)

1. 连接 GitHub 仓库
2. 设置环境变量
3. 点击 Deploy

### VPS 部署 (Docker)

```bash
# 克隆项目
git clone https://github.com/xiaohuahou08/CycleIQ.git
cd CycleIQ

# 构建镜像
docker build -t cycleiq-backend ./backend

# 运行容器
docker run -d -p 5000:5000 --env-file .env cycleiq-backend
```

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

## 🙏 致谢

- [Supabase](https://supabase.com/) - PostgreSQL 数据库
- [Yahoo Finance](https://finance.yahoo.com/) - 股票数据
- [Finnhub](https://finnhub.io/) - 专业金融数据 API
- [Flask](https://flask.palletsprojects.com/) - Python Web 框架
- [React](https://react.dev/) - 前端框架

---

<p align="center">
  <strong>CycleIQ - 让 Wheel Strategy 交易更智能</strong>
</p>
