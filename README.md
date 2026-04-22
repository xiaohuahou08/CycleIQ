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
│                           Frontend (React)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  Dashboard  │  │ Trade List  │  │ Cycle View  │  │   Auth UI   │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                              │                                          │
│                    ┌─────────┴─────────┐                                │
│                    │   State Store   │                                │
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
│    PostgreSQL           │       │  Yahoo Finance /        │
│    (Supabase)           │       │  Finnhub API            │
│    (用户数据)            │       │  (股票实时价格)          │
└─────────────────────────┘       └─────────────────────────┘
```

### 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | React + Vite + TypeScript | 用户界面 |
| | Zustand | 状态管理 |
| | Tailwind CSS | 样式框架 |
| | Axios | HTTP 客户端 |
| **后端** | Flask 3.x | Python Web 框架 |
| | SQLAlchemy | ORM |
| | Flask-JWT-Extended | JWT 认证 |
| | Pydantic | 数据验证 |
| **数据库** | PostgreSQL (Supabase) | 主数据库 |
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

### Wheel Cycle

完整的期权交易周期，包含从开仓到平仓的所有状态和转换。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户 ID |
| ticker | String | 股票代码（如 AAPL）|
| status | Enum | 当前状态 |
| entry_date | Date | 入场日期 |
| exit_date | Date | 出场日期 |
| target_premium | Decimal | 目标权利金 |
| actual_premium | Decimal | 实际权利金 |

### Trade

单笔期权交易记录。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| cycle_id | UUID | 关联的 Cycle |
| ticker | String | 股票代码 |
| option_type | Enum | CALL / PUT |
| strike | Decimal | 行权价 |
| expiry | Date | 到期日 |
| trade_date | Date | 交易日期 |
| premium | Decimal | 权利金 |
| delta | Decimal | Delta 值 |
| contracts | Integer | 合约数量 |
| status | Enum | OPEN / CLOSED / ASSIGNED / CALLED_AWAY |

### User

用户账户信息。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| email | String | 邮箱（唯一）|
| password_hash | String | 密码哈希 |
| name | String | 姓名 |

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

**后端 (.env)**
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

### 前端 (GitHub Pages)

推送到 `main` 分支自动部署到 GitHub Pages。

### 后端 (Render)

1. 连接 GitHub 仓库
2. 设置环境变量
3. 部署

### 后端 (VPS + Docker)

```bash
docker build -t cycleiq-backend ./backend
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

<p align="center">
  <strong>CycleIQ - 让 Wheel Strategy 交易更智能</strong>
</p>
