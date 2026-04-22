# Wheel Strategy FSM（MVP）

本文档描述 `cycleiq/wheel_fsm.py` 中的 Wheel Strategy 有限状态机（FSM）MVP：它如何表示一个策略周期、记录状态迁移、以及如何计算核心指标。

## 文件位置

- 实现：`cycleiq/wheel_fsm.py`
- 测试：`tests/test_wheel_fsm.py`

## 概念模型

### 状态（`CycleState`）

FSM 定义了 6 个状态：

- `IDLE`：空闲/等待开仓
- `CSP_OPEN`：已卖出 Cash‑Secured Put（CSP）且尚未到期/处理
- `CSP_CLOSED`：CSP 已到期 OTM（实现中会立即回到 `IDLE`）
- `STOCK_HELD`：CSP 被行权后已持有股票
- `CC_OPEN`：已卖出 Covered Call（CC）
- `EXIT`：CC 被行权后退出本轮（股票已卖出）

### 事件（`CycleEvent`）

- CSP 流程：`SELL_CSP` → `CSP_EXPIRE_OTM` 或 `CSP_ASSIGNED`（可 `CSP_ROLL` 自循环）
- CC 流程：`SELL_CC` → `CC_EXPIRE_OTM` 或 `CC_ASSIGNED`（可 `CC_ROLL` 自循环）

### 迁移记录（`Transition`）

每次 `apply_event(...)` 会生成并追加一条 `Transition`，包含：

- `from_state` / `to_state`
- `event`
- `timestamp`
- `option_legs`（期权 legs）
- `stock_leg`（股票 leg，可选）

## 关键数据结构

### 期权/股票 legs

- `OptionLeg`：包含 `type`（PUT/CALL）、`action`（SELL/BUY）、`strike`、`expiry`、`premium`、`quantity`
- `StockLeg`：包含 `action`（BUY/SELL）、`price`、`quantity`

### 当前仓位（`Position`）

用于表达当前周期持有状态的快照（shares/strike/expiry）。

## 使用方式（示例）

下面展示一条典型的 Wheel 周期路径：

1. 卖 CSP（进入 `CSP_OPEN`）
2. CSP 被行权（进入 `STOCK_HELD`）
3. 卖 CC（进入 `CC_OPEN`）
4. CC 被行权（进入 `EXIT`）

对应调用方式是按顺序对 `Cycle.apply_event(...)` 提交事件；具体可参考 `tests/test_wheel_fsm.py` 中的 `test_full_cycle_assignment_to_exit_and_metrics`。

## 事件载荷校验（MVP 约束）

实现会对每个事件要求的载荷做校验：

- `SELL_CSP` / `SELL_CC`：必须提供**单个**卖出 leg，且类型匹配（PUT/CALL）
- `CSP_ASSIGNED`：必须提供 `stock_leg`，且为 BUY
- `CC_ASSIGNED`：必须提供 `stock_leg`，且为 SELL
- `CSP_ROLL` / `CC_ROLL`：必须提供**两条** legs，且恰好包含一个 BUY（平仓）+ 一个 SELL（开仓），并且类型一致

## 指标（`Cycle.metrics()`）

`Cycle.metrics()` 会基于 `transitions` 计算：

- `total_premium_collected`：所有 option legs 的 premium 汇总（SELL 为正，BUY 为负）
- `stock_pnl`：股票买卖现金流合计（BUY 为负，SELL 为正）
- `total_cycle_pnl`：`total_premium_collected + stock_pnl`
- `days_in_cycle`：周期持续天数（最少 1）
- `annualized_return`：按 `capital_at_risk` 近似年化
- `win_rate`：以“期权卖出次数”为分母，以“未被行权到期次数”为分子得到的 MVP 指标
- `roll_count`：roll 次数

## 运行测试

该模块使用标准库 `unittest`，你可以直接运行：

```bash
python -m unittest -q
```

