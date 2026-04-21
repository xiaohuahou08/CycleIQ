# Wheel Strategy Bilingual Guide（Wheel 策略双语指南）

## 1) What is the Wheel Strategy?（什么是 Wheel 策略？）

Wheel 策略是一种系统化的期权收入策略：先卖出**现金担保看跌期权 (Cash-Secured Put, CSP)**，若被**行权 (Assignment)**则买入股票，再卖出**备兑看涨期权 (Covered Call, CC)**，在“卖 Put → 持股 → 卖 Call → 卖股”之间循环，追求持续现金流。

适用场景：
- 长期看好的标的（愿意持有）
- 震荡市场
- 高**隐含波动率 (Implied Volatility, IV)**环境（通常权利金更高）

---

## 2) Strategy Flow（策略流程）

### Step 1: Sell Cash-Secured Put（卖出 CSP）
1. 选择标的与行权价：通常选**虚值 (Out of the Money, OTM)** Put，常见参考 **Delta 值 (Delta)** 约 -0.2 ~ -0.3。  
2. 收取**权利金 (Premium)**并等待到期。  
3. 到期结果：
   - 未被行权：保留权利金，重复 Step 1。
   - 被行权：按**行权价 (Strike Price)**买入 100 股，进入 Step 2。

### Step 2: Sell Covered Call（卖出 CC）
1. 持有股票后卖出 OTM Call。  
2. 收取权利金，降低持仓成本。  
3. 到期结果：
   - 未被行权：保留权利金，重复 Step 2。
   - 被行权：按行权价卖出 100 股，完成本轮并回到 Step 1。

### Roll（滚仓）
在到期前平掉旧仓并开新仓，调整行权价和/或到期日。  
常见目的：延长时间、改善权利金、降低短期被动行权压力、平滑仓位管理。

---

## 3) Why It Works（策略逻辑）

1. **时间价值衰减 (Theta Decay)**  
   期权时间价值随时间递减，卖方通常受益。

2. **IV 权利金溢价 (IV Premium)**  
   IV 高通常意味着期权更贵，卖方可收取更高权利金。

3. **30–45 距到期天数区间 (Days to Expiration, DTE)**  
   在很多实盘中，这个区间常被视为平衡点：该区间已具备可观的 Theta 收益潜力，同时避免过于临近到期（如 <21 DTE）时 Gamma 风险陡增；因此 30–45 DTE 往往具备更稳健的风险收益特征。  
   In many live trading setups, this range is treated as a practical balance point: it offers meaningful Theta capture while avoiding the sharp Gamma-risk increase that often appears very close to expiration (for example, <21 DTE); therefore, 30–45 DTE often provides a more stable risk/reward profile.

4. **资金效率 (Capital Efficiency)**  
   通过滚仓与循环卖方策略，让同一笔资本持续产生现金流。

---

## 4) Risk & Management（风险与管控）

1. 标的大跌：CSP 被行权后可能出现较大浮亏。  
2. 标的大涨：CC 会限制持股上行收益（收益被“封顶”）。  
3. 流动性风险：买卖价差过大时，滚仓与平仓成本变高。  
4. 管控建议：
   - 只做愿意长期持有的优质标的
   - 分散行业与到期日，避免单一风险暴露
   - 预设止损/减仓规则，避免被动硬扛

---

## 5) End-to-End Example（完整数字示例）

> 目标：展示 CSP → Assignment → CC → Exit 的完整循环。  
> 标的假设：XYZ，当前股价 $100。

### Phase A: CSP 开仓
- 卖出 1 张 XYZ 95 Put（30 DTE），权利金 $2.00/股。  
- 合约规模 100 股，收到权利金：$200。  
- 冻结现金：$9,500（95 × 100）。

到期时 XYZ 跌到 $93（Put 实值，因 $93 < $95 行权价）：  
- 被行权，以 $95 买入 100 股，花费 $9,500。  
- 实际持仓成本（含权利金）：$95 - $2 = **$93/股**。

### Phase B: CC 开仓
- 持股后卖出 1 张 XYZ 100 Call（30 DTE），权利金 $1.50/股。  
- 收到权利金：$150。  

到期时 XYZ 涨到 $102（Call 实值）：  
- 被行权，以 $100 卖出 100 股，回收 $10,000。

### P&L 汇总（单轮）
- 股票价差收益：($100 - $95) × 100 = **$500**  
- CSP 权利金：**+$200**  
- CC 权利金：**+$150**  
- 总收益：**$850**

若以 CSP 冻结现金 $9,500 估算单轮收益率：  
- 单轮收益率约 **8.95%**（$850 / $9,500）  
- 后续可回到 Step 1 继续下一轮。

---

## 6) Practical Notes（实务备注）

- Delta、IV、DTE 是开仓三要素，需结合流动性与事件风险（财报、宏观数据）综合判断。  
- Wheel 不是“零风险策略”，本质仍受标的方向与波动影响。  
- 请结合个人风险承受能力与资金规模执行。
