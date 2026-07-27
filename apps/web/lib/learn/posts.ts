import type { Locale } from "@/lib/i18n/locales";
import type { LearnPost, LearnPostSource } from "./types";

const POSTS: LearnPostSource[] = [
  {
    slug: "options-101",
    date: "2026-07-26",
    order: 10,
    thumbnail: "long-call",
    en: {
      title: "Options 101: the concepts, explained with pictures",
      description:
        "A visual introduction to options: calls and puts, strike, expiration and premium, buyers versus sellers, moneyness, and how it all leads into the wheel.",
      sections: [
        {
          heading: "What an option is",
          paragraphs: [
            "An option is a contract between two traders about a stock (the underlying). It gives the buyer a right — but not an obligation — to trade 100 shares at a fixed price before a deadline. The seller takes on the matching obligation and is paid for it.",
            "There are only two basic types. A call is about buying shares; a put is about selling shares. Everything else in options builds on these two.",
          ],
        },
        {
          heading: "The parts of an option contract",
          paragraphs: [
            "Every option quote packs a few key terms together. The underlying is the stock the option is written on. The strike is the fixed price you can trade at. The expiration is the date the option stops existing. The premium is the price you pay as a buyer or collect as a seller, quoted per share.",
            "One standard contract controls 100 shares, so a premium of $3.20 means $320 for a single contract.",
          ],
          figure: "contract-anatomy",
          figureCaption: "Anatomy of a single option contract.",
        },
        {
          heading: "Call options",
          paragraphs: [
            "A call buyer pays premium for the right to buy shares at the strike. If the stock rises well above the strike, the call gains value; if it stays below, the most the buyer can lose is the premium paid.",
            "The payoff looks like a hockey stick: a flat loss below the strike, then rising profit above it.",
          ],
          figure: "long-call",
          figureCaption: "Long call payoff at expiration.",
        },
        {
          heading: "Put options",
          paragraphs: [
            "A put buyer pays premium for the right to sell shares at the strike. Puts gain value when the stock falls below the strike, and again the buyer's loss is capped at the premium paid.",
            "It is the mirror image of a call: profit builds as the stock drops, and the downside for the buyer is limited.",
          ],
          figure: "long-put",
          figureCaption: "Long put payoff at expiration.",
        },
        {
          heading: "Buyers and sellers",
          paragraphs: [
            "Every option has two sides. The buyer pays premium and holds the right. The seller collects premium up front and takes on the obligation to trade if the buyer exercises.",
            "Sellers profit when the option expires worthless — they simply keep the premium. The wheel strategy is built on being the seller: you collect premium selling puts and calls.",
          ],
          figure: "short-put",
          figureCaption: "Short put payoff — the option seller's side.",
        },
        {
          heading: "In, at, and out of the money",
          paragraphs: [
            "Moneyness describes where the stock sits relative to the strike. A call is in the money (ITM) when the stock is above the strike; a put is ITM when the stock is below it. At the money (ATM) means the stock is near the strike, and out of the money (OTM) is the opposite of ITM.",
            "Sellers usually write OTM options, because they are more likely to expire worthless and let the seller keep the full premium.",
          ],
        },
        {
          heading: "Where the wheel comes in",
          paragraphs: [
            "The wheel strategy is a repeatable way to be the option seller: sell cash-secured puts, take assignment if the put finishes in the money, then sell covered calls against the shares until they are called away.",
            "If you are new to that flow, read the Wheel strategy basics lesson next — it picks up exactly where this one ends.",
          ],
        },
      ],
    },
    zh: {
      title: "期权 101：用图讲清期权的核心概念",
      description:
        "图文并茂的期权入门：看涨与看跌、行权价、到期日与权利金、买方与卖方、价内价外，以及这一切如何引向滚轮策略。",
      sections: [
        {
          heading: "什么是期权",
          paragraphs: [
            "期权是两位交易者围绕某只股票（标的）签订的合约。它赋予买方一种权利——但不是义务——在到期日之前以固定价格交易 100 股。卖方承担与之对应的义务，并为此收取报酬。",
            "期权只有两种基本类型：看涨（call）关乎买入股票，看跌（put）关乎卖出股票。其余一切都建立在这两者之上。",
          ],
        },
        {
          heading: "期权合约的组成要素",
          paragraphs: [
            "每一条期权报价都打包了几个关键要素。标的是期权所对应的股票；行权价是你可以成交的固定价格；到期日是期权失效的日期；权利金是买方支付、卖方收取的价格，按每股报价。",
            "一张标准合约对应 100 股，所以 $3.20 的权利金意味着一张合约 $320。",
          ],
          figure: "contract-anatomy",
          figureCaption: "一张期权合约的构成。",
        },
        {
          heading: "看涨期权（Call）",
          paragraphs: [
            "看涨买方支付权利金，换取以行权价买入股票的权利。若股价大幅高于行权价，看涨期权升值；若股价低于行权价，买方最多损失已付的权利金。",
            "其收益形似曲棍球杆：行权价以下为固定亏损，行权价以上盈利逐步上升。",
          ],
          figure: "long-call",
          figureCaption: "看涨期权（买入）到期收益。",
        },
        {
          heading: "看跌期权（Put）",
          paragraphs: [
            "看跌买方支付权利金，换取以行权价卖出股票的权利。当股价跌破行权价时看跌期权升值，买方的亏损同样以已付权利金为上限。",
            "它是看涨的镜像：股价越跌盈利越多，而买方的下行风险有限。",
          ],
          figure: "long-put",
          figureCaption: "看跌期权（买入）到期收益。",
        },
        {
          heading: "买方与卖方",
          paragraphs: [
            "每份期权都有两方。买方支付权利金并持有权利；卖方预先收取权利金，并承担在买方行权时成交的义务。",
            "当期权价外到期作废时，卖方获利——直接保留权利金。滚轮策略正是建立在做卖方之上：通过卖出看跌与看涨来收取权利金。",
          ],
          figure: "short-put",
          figureCaption: "看跌期权（卖出）收益——期权卖方的视角。",
        },
        {
          heading: "价内、平价与价外",
          paragraphs: [
            "价值状态（moneyness）描述股价相对行权价的位置。当股价高于行权价时看涨为价内（ITM）；当股价低于行权价时看跌为价内。平价（ATM）指股价接近行权价，价外（OTM）则与价内相反。",
            "卖方通常卖出价外期权，因为它们更可能价外到期作废，从而让卖方保留全部权利金。",
          ],
        },
        {
          heading: "滚轮从哪里接入",
          paragraphs: [
            "滚轮策略是一种可重复地做期权卖方的方法：卖出现金担保看跌，若看跌到期实值则接受指派，再对持股卖出备兑看涨，直到股票被行权卖出。",
            "如果你对这套流程还不熟悉，接下来可以阅读《滚轮策略入门》——它正好从本文结束的地方讲起。",
          ],
        },
      ],
    },
  },
  {
    slug: "what-is-delta",
    date: "2026-07-23",
    order: 20,
    thumbnail: "delta-curve",
    en: {
      title: "What is delta? The greek that tracks price moves",
      description:
        "Delta explains how much an option's price moves when the stock moves $1 — and doubles as a rough probability of finishing in the money and a shares-equivalent hedge ratio.",
      sections: [
        {
          heading: "Delta measures sensitivity to price",
          paragraphs: [
            "Delta is the first and most-used option greek. It tells you approximately how much an option's price changes when the underlying stock moves by $1. A delta of 0.30 means the option gains about $0.30 if the stock rises $1 — and loses about that much if it falls.",
            "Geometrically, delta is the slope of the curve that plots option price against stock price. A steeper slope means the option tracks the stock more closely.",
          ],
          figure: "delta-slope",
          figureCaption: "Delta is the slope of the option-price curve at the current stock price.",
        },
        {
          heading: "The range: calls, puts, and ATM",
          paragraphs: [
            "Call deltas run from 0 to 1; put deltas run from -1 to 0, because puts gain value as the stock falls. Traders often drop the decimal and say a '30-delta' option, meaning 0.30.",
            "An at-the-money option sits near 0.50 delta. Deep in-the-money options approach 1.00 and behave almost like the stock itself; far out-of-the-money options approach 0 and barely move.",
          ],
        },
        {
          heading: "Delta as a rough probability",
          paragraphs: [
            "Delta doubles as a quick estimate of the chance the option finishes in the money at expiration. A 0.30-delta call has roughly a 30% chance of expiring ITM.",
            "It is an approximation, not a guarantee, but it is a handy way to compare strikes at a glance.",
          ],
          figure: "delta-curve",
          figureCaption: "Call delta by moneyness: near 0 far OTM, about 0.5 ATM, near 1 deep ITM.",
        },
        {
          heading: "Delta as shares of exposure",
          paragraphs: [
            "Because one contract controls 100 shares, delta also tells you your share-equivalent exposure. A 0.30-delta call behaves like owning about 30 shares (0.30 × 100).",
            "This 'hedge ratio' view is why delta is central to managing risk across a whole position.",
          ],
        },
        {
          heading: "Why wheel sellers watch delta",
          paragraphs: [
            "When you sell cash-secured puts, the put's delta is a shorthand for assignment odds. Selling a 0.30-delta put means roughly a 30% chance of being assigned — and usually more premium than a lower-delta strike.",
            "Choosing a delta is really choosing a trade-off between premium collected and how often you take assignment. New to that flow? See the Wheel strategy basics and Options 101 lessons.",
          ],
        },
      ],
    },
    zh: {
      title: "什么是 Delta？衡量价格变动的希腊字母",
      description:
        "Delta 表示标的每变动 1 美元、期权价格大约变动多少；它还可当作到期价内的粗略概率，以及等值股数的对冲比率。",
      sections: [
        {
          heading: "Delta 衡量对价格的敏感度",
          paragraphs: [
            "Delta 是最常用的期权希腊字母。它表示当标的股票变动 1 美元时，期权价格大约变动多少。Delta 为 0.30 意味着股价上涨 1 美元时期权约上涨 0.30 美元——下跌时则约反向变动。",
            "从几何上看，Delta 就是「期权价格对股价」这条曲线的斜率。斜率越陡，期权价格越贴近股价的变动。",
          ],
          figure: "delta-slope",
          figureCaption: "Delta 就是当前股价处、期权价格曲线的斜率。",
        },
        {
          heading: "取值范围：看涨、看跌与平价",
          paragraphs: [
            "看涨的 Delta 介于 0 到 1；看跌的 Delta 介于 -1 到 0，因为股价下跌时看跌升值。交易者常省略小数，把 0.30 说成「30 Delta」。",
            "平价期权的 Delta 约为 0.50。深度价内期权趋近 1.00，走势几乎与股票一致；深度价外期权趋近 0，几乎不动。",
          ],
        },
        {
          heading: "Delta 作为粗略概率",
          paragraphs: [
            "Delta 还可当作期权到期价内概率的快速估计。0.30 Delta 的看涨，到期价内的概率大约为 30%。",
            "这只是近似，并非保证，但用来一眼比较不同行权价非常方便。",
          ],
          figure: "delta-curve",
          figureCaption: "看涨 Delta 随价值状态变化：深度价外接近 0，平价约 0.5，深度价内接近 1。",
        },
        {
          heading: "Delta 作为等值股数",
          paragraphs: [
            "由于一张合约对应 100 股，Delta 也表示你的等值股数敞口。0.30 Delta 的看涨，约等于持有 30 股（0.30 × 100）。",
            "这种「对冲比率」的视角，正是 Delta 在整体头寸风险管理中处于核心地位的原因。",
          ],
        },
        {
          heading: "为什么滚轮卖方关注 Delta",
          paragraphs: [
            "卖出现金担保看跌时，看跌的 Delta 可粗略代表被指派的概率。卖出 0.30 Delta 的看跌，约有 30% 概率被指派——通常也比更低 Delta 的行权价收到更多权利金。",
            "选择 Delta，本质上是在「收取的权利金」与「被指派的频率」之间权衡。还不熟悉这套流程？可参阅《滚轮策略入门》与《期权 101》。",
          ],
        },
      ],
    },
  },
  {
    slug: "wheel-basics",
    date: "2026-07-20",
    order: 100,
    thumbnail: "short-put",
    en: {
      title: "Wheel strategy basics: CSP → assignment → CC",
      description:
        "A plain-language walkthrough of the options wheel: selling cash-secured puts, getting assigned shares, and writing covered calls until shares are called away.",
      sections: [
        {
          heading: "What the wheel is",
          paragraphs: [
            "The options wheel is a repeatable cycle: sell cash-secured puts (CSPs), accept assignment if the put finishes in the money, then sell covered calls (CCs) against the shares until they are called away — and start again.",
            "CycleIQ is built around that story. Each cycle groups the CSP legs, assignment, and CC legs so you can see premium and cost basis without rebuilding a spreadsheet.",
          ],
        },
        {
          heading: "Cash-secured puts",
          paragraphs: [
            "A CSP means you sell a put and keep enough cash to buy 100 shares per contract at the strike if assigned. You collect premium up front. If the put expires worthless, you keep the premium and may sell another put.",
            "If the stock trades below the strike at expiry (or you are assigned early), you buy the shares at the strike. Your effective stock cost is usually strike minus the premium you already collected (fees adjust that slightly).",
          ],
          figure: "short-put",
          figureCaption: "Selling a put: you keep the premium if it expires worthless.",
        },
        {
          heading: "Covered calls",
          paragraphs: [
            "Once you own the shares, you can sell a covered call against them. You collect more premium and agree to sell the shares at the call strike if assigned.",
            "If the call expires worthless, you keep the shares and the premium — which lowers your holding cost. If the call is assigned (called away), you sell the shares at the call strike and the wheel cycle typically ends.",
          ],
          figure: "short-call",
          figureCaption: "Selling a call against your shares: premium kept if it expires worthless.",
        },
        {
          heading: "What to track",
          paragraphs: [
            "For each cycle, useful numbers include premium collected on every leg, assignment cost basis, and how CC premiums reduce that basis while you still hold stock.",
            "CycleIQ journals those legs for you so dashboard P&L and the Cycles cost-basis view stay aligned with the same wheel.",
          ],
        },
      ],
    },
    zh: {
      title: "滚轮策略入门：CSP → 指派 → CC",
      description:
        "用通俗语言串起期权滚轮：卖出现金担保看跌、被指派持股，再卖备兑看涨直到股票被行权卖出。",
      sections: [
        {
          heading: "什么是滚轮",
          paragraphs: [
            "期权滚轮是一套可重复的流程：卖出现金担保看跌（CSP），若看跌到期实值则接受指派持股，再对持股卖出备兑看涨（CC），直到股票被行权卖出——然后重新开始。",
            "CycleIQ 正是围绕这条故事线设计：每个周期把 CSP、指派与 CC 各腿归在一起，方便查看权利金与成本基础，而不必重做电子表格。",
          ],
        },
        {
          heading: "现金担保看跌（CSP）",
          paragraphs: [
            "CSP 指卖出看跌期权，并预留足够现金以便在指派时按行权价买入每张合约对应的 100 股。开仓即收取权利金。若看跌价外到期作废，您保留权利金，并可再卖下一张。",
            "若到期时股价低于行权价（或提前被指派），您按行权价买入股票。有效持股成本通常约为「行权价 − 已收权利金」（费用会略作调整）。",
          ],
          figure: "short-put",
          figureCaption: "卖出看跌：价外到期即保留权利金。",
        },
        {
          heading: "备兑看涨（CC）",
          paragraphs: [
            "持有股票后，可对其卖出备兑看涨。您再收取权利金，并约定若被行权则按看涨行权价卖出股票。",
            "若看涨价外到期，您保留股票与权利金——持股成本下降。若看涨被行权（股票被 call away），您以看涨行权价卖出股票，该滚轮周期通常结束。",
          ],
          figure: "short-call",
          figureCaption: "对持股卖出看涨：价外到期即保留权利金。",
        },
        {
          heading: "该追踪什么",
          paragraphs: [
            "对每个周期，有用的数字包括：各腿已收权利金、指派成本基础，以及在仍持股期间 CC 权利金如何降低该成本。",
            "CycleIQ 帮您记录这些腿，使仪表盘盈亏与周期页的成本基础视图与同一滚轮保持一致。",
          ],
        },
      ],
    },
  },
  {
    slug: "cash-secured-put-strike-selection",
    date: "2026-07-25",
    order: 110,
    thumbnail: "short-put",
    en: {
      title: "Choosing a strike for cash-secured puts",
      description:
        "How to pick the strike and delta when selling cash-secured puts — balancing the premium you collect against how often you get assigned, and sizing so assignment is a plan, not a surprise.",
      sections: [
        {
          heading: "The trade-off you are actually making",
          paragraphs: [
            "When you sell a cash-secured put, every strike choice is a trade-off between two things: how much premium you collect today and how likely you are to be assigned the shares. Strikes closer to the current stock price pay more premium but are assigned more often; strikes further below pay less but are assigned rarely.",
            "There is no single correct strike. The right choice depends on whether you would be happy owning the stock at that price. If assignment would upset you, the strike is too high or the position is too big — not the other way around.",
          ],
        },
        {
          heading: "Delta as your assignment dial",
          paragraphs: [
            "The put's delta is a quick shorthand for the probability of finishing in the money. A 0.30-delta put has roughly a 30% chance of being assigned at expiration; a 0.15-delta put, roughly 15%.",
            "Many wheel sellers live in the 0.15–0.30 delta range. Lower delta means fewer assignments and a wider safety cushion; higher delta means fatter premium but shares put to you more often. Pick the end of that range that matches how much you want to own the stock.",
          ],
          figure: "delta-curve",
          figureCaption: "Higher-delta puts sit closer to the money and are assigned more often.",
        },
        {
          heading: "Reading premium as an annualized yield",
          paragraphs: [
            "Raw premium is hard to compare across strikes and expirations. Convert it to a yield: premium divided by the cash you set aside (strike × 100), then annualize by dividing by days to expiration and multiplying by 365.",
            "A $1.20 premium on a $50 strike put with 30 days left is $120 on $5,000 of collateral — about 2.4% for the month, or roughly 29% annualized if you could repeat it. Comparing yields, not dollar amounts, keeps you honest about which strike is really paying you.",
          ],
        },
        {
          heading: "Days to expiration and the 30–45 day zone",
          paragraphs: [
            "Time decay (theta) is not linear — it accelerates in the final weeks of an option's life. Selling puts with roughly 30–45 days to expiration captures much of that accelerating decay while leaving room to react if the stock moves against you.",
            "Very short-dated puts decay fast but pay little and demand constant attention; very long-dated puts tie up your cash for a small monthly yield. The 30–45 day window is a common compromise, not a rule.",
          ],
        },
        {
          heading: "Size so assignment is welcome",
          paragraphs: [
            "The cardinal rule of cash-secured puts: only sell a put if you genuinely want to buy 100 shares per contract at that strike, with cash already set aside. That is what makes it 'cash-secured.'",
            "If a single assignment would blow up your allocation to one name, sell fewer contracts or choose a lower strike. When assignment is sized correctly, a stock drop is just the wheel entering its next phase — you own shares at a price you chose, and you start selling covered calls.",
          ],
          figure: "short-put",
          figureCaption: "Selling a put: keep the premium if it expires worthless, buy shares if assigned.",
        },
        {
          heading: "A simple pre-trade checklist",
          paragraphs: [
            "Before selling a put, ask: Would I happily own this stock at the strike? Is the cash set aside? Is the annualized yield worth the risk? Is the delta in a range I can live with? Is 30–45 days the horizon I want?",
            "If every answer is yes, the strike is a good one for you. CycleIQ then journals the leg so the collected premium and eventual cost basis stay tied to the same cycle.",
          ],
        },
      ],
    },
    zh: {
      title: "如何为现金担保看跌选择行权价",
      description:
        "卖出现金担保看跌时如何挑选行权价与 Delta——在收取的权利金与被指派频率之间权衡，并把仓位控制到「被指派是计划之内，而非意外」。",
      sections: [
        {
          heading: "你真正在做的权衡",
          paragraphs: [
            "卖出现金担保看跌时，每一个行权价的选择都是两件事之间的权衡：今天能收多少权利金，以及你被指派股票的概率有多大。越接近现价的行权价权利金越多，但被指派更频繁；越往下的行权价权利金更少，但很少被指派。",
            "没有唯一正确的行权价。正确与否取决于你是否乐意以那个价格持有这只股票。如果被指派会让你难受，那说明行权价太高、或仓位太大——而不是策略本身有问题。",
          ],
        },
        {
          heading: "把 Delta 当作被指派的旋钮",
          paragraphs: [
            "看跌的 Delta 是到期价内概率的快速近似。0.30 Delta 的看跌，到期被指派的概率约 30%；0.15 Delta 的看跌约 15%。",
            "许多滚轮卖方活动在 0.15–0.30 Delta 区间。Delta 越低，指派越少、安全垫越宽；Delta 越高，权利金越丰厚、股票被指派越频繁。挑选这个区间里与「你有多想持有这只股票」相匹配的一端。",
          ],
          figure: "delta-curve",
          figureCaption: "更高 Delta 的看跌更接近平价，被指派更频繁。",
        },
        {
          heading: "把权利金换算成年化收益率",
          paragraphs: [
            "原始权利金很难在不同行权价与到期日之间比较。把它换算成收益率：权利金 ÷ 你预留的现金（行权价 × 100），再除以剩余天数、乘以 365 完成年化。",
            "$50 行权价、剩 30 天的看跌收 $1.20 权利金，就是 $5,000 担保金上赚 $120——当月约 2.4%，若能持续重复约年化 29%。比较收益率而非美元金额，能让你清楚哪个行权价真正在给你付钱。",
          ],
        },
        {
          heading: "到期天数与 30–45 天区间",
          paragraphs: [
            "时间价值衰减（theta）不是线性的——它在期权生命的最后几周加速。卖出剩约 30–45 天的看跌，能吃到大部分加速衰减，同时留出空间在股价不利时做出反应。",
            "极短到期的看跌衰减快但收得少、且需要频繁盯盘；极长到期的看跌会长期占用现金却只换来微薄的月收益。30–45 天窗口是常见的折中，而非铁律。",
          ],
        },
        {
          heading: "把仓位控制到「乐于被指派」",
          paragraphs: [
            "现金担保看跌的第一原则：只有当你真心愿意以该行权价、用已预留的现金买入每张合约对应的 100 股时，才卖出这张看跌。这正是「现金担保」的含义。",
            "如果一次指派就会让你在单一标的上的配置失衡，就少卖几张合约或选更低的行权价。当仓位规模合适时，股价下跌只是滚轮进入下一阶段——你以自己选定的价格持股，然后开始卖出备兑看涨。",
          ],
          figure: "short-put",
          figureCaption: "卖出看跌：价外到期保留权利金，被指派则买入股票。",
        },
        {
          heading: "开仓前的简单清单",
          paragraphs: [
            "卖出看跌前先问自己：我乐意以该行权价持有这只股票吗？现金预留好了吗？年化收益率值这个风险吗？Delta 在我能接受的区间吗？30–45 天是我想要的周期吗？",
            "如果答案都是「是」，那对你就是一个好的行权价。随后 CycleIQ 会记录这条腿，使已收权利金与最终成本基础绑定在同一个周期上。",
          ],
        },
      ],
    },
  },
  {
    slug: "assignment-explained",
    date: "2026-07-24",
    order: 120,
    thumbnail: "long-put",
    en: {
      title: "Assignment, explained: what happens when your put is exercised",
      description:
        "A plain-language guide to option assignment in the wheel — when it happens, what early assignment and dividends mean, how your cost basis is set, and why assignment is a feature, not a failure.",
      sections: [
        {
          heading: "What assignment actually is",
          paragraphs: [
            "Assignment is the moment the option buyer exercises their right and you, the seller, must fulfill your obligation. For a cash-secured put, that means you buy 100 shares per contract at the strike price using the cash you set aside.",
            "You do not choose when assignment happens — the buyer does. But because you only sold puts on stocks you were willing to own, assignment simply hands you shares at a price you already accepted.",
          ],
        },
        {
          heading: "When puts usually get assigned",
          paragraphs: [
            "Most assignment happens at expiration, when the put is in the money — the stock is trading below the strike. If your $50 put expires with the stock at $47, you will almost certainly be assigned and buy shares at $50.",
            "Puts that expire out of the money (stock above the strike) simply expire worthless, and you keep the full premium with no shares changing hands.",
          ],
          figure: "long-put",
          figureCaption: "A put finishes in the money when the stock is below the strike at expiration.",
        },
        {
          heading: "Early assignment and dividends",
          paragraphs: [
            "Occasionally a put is assigned before expiration ('early assignment'). This is uncommon for puts and usually only matters when a put is deep in the money with little time value left.",
            "For covered calls later in the wheel, the key early-assignment trigger is dividends: a call buyer may exercise early to capture an upcoming dividend if the call is in the money and its remaining time value is less than the dividend. Knowing the ex-dividend date helps you anticipate this.",
          ],
        },
        {
          heading: "Your cost basis after assignment",
          paragraphs: [
            "When assigned, your raw purchase price is the strike. But your effective cost basis is lower, because you already collected premium. If you sold a $50 put for $1.20 and get assigned, your effective basis is about $48.80 per share before fees.",
            "This is why the wheel can be profitable even when a stock dips: the premium you collected cushions the entry, and covered-call premium collected afterward lowers the basis further.",
          ],
        },
        {
          heading: "What to do the day after assignment",
          paragraphs: [
            "Once shares land in your account, the wheel turns to its next phase: selling a covered call against them. You pick a call strike — usually at or above your cost basis — and collect fresh premium.",
            "There is no rush to sell the call at the exact open; you can wait for a stable or rising price to get a better strike. The goal is to keep collecting premium while you hold the shares.",
          ],
          figure: "short-call",
          figureCaption: "After assignment you sell a covered call to keep collecting premium.",
        },
        {
          heading: "Assignment is a feature, not a failure",
          paragraphs: [
            "New sellers often dread assignment, but in the wheel it is a normal, expected step — not a mistake. You sold the put precisely because you were willing to own the stock at that price.",
            "The only real failure mode is being assigned on a name you did not actually want, or in a size you cannot handle. Solve that at strike-selection and sizing time, and assignment becomes just another turn of the wheel.",
          ],
        },
      ],
    },
    zh: {
      title: "读懂指派：看跌被行权时会发生什么",
      description:
        "用通俗语言讲清滚轮中的期权指派——何时发生、提前指派与分红意味着什么、成本基础如何确定，以及为什么指派是特性而非失败。",
      sections: [
        {
          heading: "指派到底是什么",
          paragraphs: [
            "指派是期权买方行使权利、而你作为卖方必须履约的那一刻。对于现金担保看跌，这意味着你用预留的现金，以行权价买入每张合约对应的 100 股。",
            "你无法选择指派何时发生——那是买方决定的。但因为你只在自己愿意持有的股票上卖看跌，指派不过是以你早已接受的价格把股票交到你手上。",
          ],
        },
        {
          heading: "看跌通常何时被指派",
          paragraphs: [
            "大多数指派发生在到期时、且看跌处于价内——即股价低于行权价。若你的 $50 看跌到期时股价在 $47，你几乎必然被指派，以 $50 买入股票。",
            "价外到期（股价高于行权价）的看跌只会作废，你保留全部权利金，不发生任何股票交割。",
          ],
          figure: "long-put",
          figureCaption: "到期时股价低于行权价，看跌即为价内。",
        },
        {
          heading: "提前指派与分红",
          paragraphs: [
            "偶尔看跌会在到期前被指派（「提前指派」）。这对看跌并不常见，通常只在看跌深度价内、剩余时间价值极少时才需要留意。",
            "对于滚轮后段的备兑看涨，提前指派的关键触发因素是分红：当看涨处于价内、且其剩余时间价值小于即将派发的分红时，看涨买方可能提前行权以获取分红。了解除息日有助于你提前预判。",
          ],
        },
        {
          heading: "指派后的成本基础",
          paragraphs: [
            "被指派时，你的原始买入价是行权价。但有效成本基础更低，因为你已经收过权利金。若你以 $1.20 卖出 $50 看跌并被指派，未计费用前每股有效基础约为 $48.80。",
            "这正是即便股价回落、滚轮仍可能盈利的原因：已收权利金缓冲了买入价，之后卖出备兑看涨收的权利金会进一步压低成本基础。",
          ],
        },
        {
          heading: "被指派后的第二天该做什么",
          paragraphs: [
            "一旦股票进入账户，滚轮就进入下一阶段：对持股卖出备兑看涨。你选一个看涨行权价——通常在成本基础之上或与之持平——并收取新的权利金。",
            "不必在开盘瞬间就卖出看涨；你可以等股价企稳或上行，以拿到更好的行权价。目标是在持股期间持续收取权利金。",
          ],
          figure: "short-call",
          figureCaption: "被指派后卖出备兑看涨，继续收取权利金。",
        },
        {
          heading: "指派是特性，不是失败",
          paragraphs: [
            "新手卖方常惧怕指派，但在滚轮里它是正常、可预期的一步——不是错误。你卖出看跌，正是因为愿意以该价格持有这只股票。",
            "唯一真正的失败模式，是被指派了一只你其实并不想要的股票，或指派规模超出你的承受力。在选行权价和控仓位时解决这个问题，指派就只是滚轮的又一次转动。",
          ],
        },
      ],
    },
  },
  {
    slug: "managing-covered-calls",
    date: "2026-07-22",
    order: 130,
    thumbnail: "short-call",
    en: {
      title: "Managing covered calls without capping your gains",
      description:
        "How to sell covered calls on assigned shares — choosing a strike above your cost basis, understanding the upside cap, and deciding what to do when the stock rallies or falls.",
      sections: [
        {
          heading: "The covered call setup",
          paragraphs: [
            "A covered call means you own 100 shares and sell one call against them. You collect premium immediately and agree to sell those shares at the call's strike if the stock rises above it by expiration.",
            "It is 'covered' because you already own the shares you might have to deliver — there is no naked risk. In the wheel, this is the phase that comes after a put assignment.",
          ],
          figure: "short-call",
          figureCaption: "Selling a call against shares you own: premium kept if it expires worthless.",
        },
        {
          heading: "Choose a strike at or above your cost basis",
          paragraphs: [
            "The classic rule is to sell the call at a strike at or above your effective cost basis. That way, if the shares are called away, you lock in a gain on the stock plus all the premium you have collected.",
            "Selling a call below your cost basis can force you to sell at a loss on the shares, even though you keep the premium. Only do that deliberately — for example, to exit a position you no longer want.",
          ],
        },
        {
          heading: "The upside cap trade-off",
          paragraphs: [
            "The cost of the premium you collect is a cap on your upside. If the stock rockets far above the strike, you still only sell at the strike — you miss the extra gain above it.",
            "Choosing a higher strike leaves more room to run but pays less premium; a lower strike pays more but caps you sooner. This mirrors the same premium-versus-outcome trade-off you faced when selling the put.",
          ],
        },
        {
          heading: "If the stock rallies past the strike",
          paragraphs: [
            "If the stock finishes above the strike, your shares are called away at the strike and the cycle ends with a profit: stock gain up to the strike, plus put premium, plus call premium.",
            "If you want to keep the shares, you can roll the call up and out before expiration — buying it back and selling a later, higher-strike call, ideally for a net credit. Just know that chasing a runaway stock with rolls can cost more than letting it go.",
          ],
        },
        {
          heading: "If the stock drops instead",
          paragraphs: [
            "If the stock falls, the call expires worthless and you keep the premium — which lowers your effective cost basis on the shares you still hold. Then you simply sell another covered call.",
            "Repeatedly collecting call premium while holding through a dip is how the wheel grinds your basis down over time, improving your break-even with each cycle.",
          ],
        },
        {
          heading: "Keeping the wheel turning",
          paragraphs: [
            "Covered calls are not a one-off; they are a rhythm. Each expiration you either keep the shares and sell another call, or the shares are called away and you go back to selling cash-secured puts.",
            "CycleIQ groups the put, the assignment, and every covered call into one cycle, so the running cost basis and total premium stay visible instead of scattered across a spreadsheet.",
          ],
        },
      ],
    },
    zh: {
      title: "管理备兑看涨，又不白白封住涨幅",
      description:
        "如何对被指派的持股卖出备兑看涨——选择成本基础之上的行权价、理解涨幅上限，并决定股价上涨或下跌时该怎么做。",
      sections: [
        {
          heading: "备兑看涨的结构",
          paragraphs: [
            "备兑看涨指你持有 100 股，并对其卖出一张看涨。你立即收取权利金，并约定若到期时股价高于行权价，就以该行权价卖出这些股票。",
            "之所以「备兑」，是因为你已经持有可能需要交割的股票——不存在裸卖风险。在滚轮中，这是看跌被指派之后的阶段。",
          ],
          figure: "short-call",
          figureCaption: "对持股卖出看涨：价外到期即保留权利金。",
        },
        {
          heading: "行权价选在成本基础之上或持平",
          paragraphs: [
            "经典规则是把看涨行权价设在有效成本基础之上或与之持平。这样一来，若股票被行权卖出，你就锁定了股票的盈利，外加所有已收权利金。",
            "把看涨卖在成本基础之下，可能迫使你在股票上亏本卖出——即便你保留了权利金。只在刻意为之时才这么做，例如要退出一个你不再想要的仓位。",
          ],
        },
        {
          heading: "涨幅上限这个权衡",
          paragraphs: [
            "你收取权利金的代价，是给上行空间加了一个上限。若股价暴涨远超行权价，你仍只能以行权价卖出——错过行权价之上的额外涨幅。",
            "选更高的行权价留出更多上涨空间，但权利金更少；更低的行权价权利金更多，但更早被封顶。这与你卖看跌时面对的「权利金 vs 结果」权衡如出一辙。",
          ],
        },
        {
          heading: "若股价涨过行权价",
          paragraphs: [
            "若股价在行权价之上到期，你的股票以行权价被行权卖出，周期以盈利收尾：至行权价为止的股票涨幅，加看跌权利金，再加看涨权利金。",
            "若你想保留股票，可在到期前把看涨向上、向后滚动——买回后卖出更晚、更高行权价的看涨，最好做到净收权利金。但要明白，用滚动去追一只失控上涨的股票，代价可能比直接放手更高。",
          ],
        },
        {
          heading: "若股价反而下跌",
          paragraphs: [
            "若股价下跌，看涨价外作废，你保留权利金——这会压低你仍持有股票的有效成本基础。之后你只需再卖一张备兑看涨。",
            "在下跌中持股、反复收取看涨权利金，正是滚轮随时间不断磨低成本基础、逐周期改善盈亏平衡点的方式。",
          ],
        },
        {
          heading: "让滚轮持续转动",
          paragraphs: [
            "备兑看涨不是一次性的，而是一种节奏。每次到期，你要么保留股票再卖一张看涨，要么股票被行权卖出、回到卖现金担保看跌。",
            "CycleIQ 把看跌、指派与每一张备兑看涨归入同一个周期，让滚动的成本基础与累计权利金始终可见，而不是散落在电子表格各处。",
          ],
        },
      ],
    },
  },
  {
    slug: "rolling-options",
    date: "2026-07-21",
    order: 140,
    thumbnail: "short-put",
    en: {
      title: "Rolling options: buying time for a credit",
      description:
        "What it means to roll a short option out, down, or up — how to think about net credit, when rolling helps, and when it just delays an exit you should take.",
      sections: [
        {
          heading: "What rolling means",
          paragraphs: [
            "Rolling is closing your current short option and opening a new one in the same trade — usually at a later expiration, sometimes at a different strike. It is a single decision expressed as two legs: buy to close, sell to open.",
            "You roll to give a trade more time to work out, to adjust your strike as the stock moves, or to collect more premium — ideally without adding new risk you did not intend.",
          ],
        },
        {
          heading: "Rolling out (later expiration)",
          paragraphs: [
            "The most common roll is 'out': buy back the current option and sell one with the same strike but a later expiration. The extra time usually means you collect more premium than it costs to close.",
            "For a cash-secured put that has gone against you, rolling out buys weeks for the stock to recover before assignment — while you keep collecting premium in the meantime.",
          ],
          figure: "short-put",
          figureCaption: "Rolling a short put out gives the trade more time while collecting fresh premium.",
        },
        {
          heading: "Rolling down or up",
          paragraphs: [
            "You can also change the strike. Rolling a put 'down and out' lowers the strike (reducing assignment risk) at a later date; rolling a call 'up and out' raises the strike (freeing more upside) later.",
            "Changing the strike usually costs some of your credit — you are buying a better position with premium. The further you move the strike in your favor, the smaller the net credit, and sometimes it flips to a net debit.",
          ],
        },
        {
          heading: "The golden rule: roll for a net credit",
          paragraphs: [
            "A healthy roll brings in more premium than it costs — a net credit. That means the market is paying you to extend, and your total collected premium keeps growing.",
            "Rolling for a net debit (paying to extend) is a warning sign. You are spending money to avoid taking a result, which often just enlarges the eventual loss. Occasionally a small debit to sharply improve a strike is worth it, but treat net-debit rolls with suspicion.",
          ],
        },
        {
          heading: "When not to roll",
          paragraphs: [
            "If the reason you sold the option no longer holds — the company's story broke, or you no longer want to own the stock — rolling just postpones a decision you should make now. Take the assignment or the loss and move on.",
            "Rolling is a tool for good positions that need time, not a way to avoid admitting a thesis was wrong. Endlessly rolling a losing put down and out can quietly turn a small mistake into a large one.",
          ],
        },
        {
          heading: "Rolling inside the wheel",
          paragraphs: [
            "In the wheel, rolls mostly appear in two places: extending a cash-secured put that is near or in the money, and rolling a covered call up and out when the stock rallies but you want to keep the shares.",
            "Each roll is still part of the same cycle. CycleIQ keeps the closed and reopened legs together so your net premium and cost basis reflect the roll rather than looking like unrelated trades.",
          ],
        },
      ],
    },
    zh: {
      title: "滚动期权：用净收权利金换时间",
      description:
        "把一张卖出的期权向后、向下或向上滚动意味着什么——如何理解净收权利金、何时滚动有用，以及何时它只是拖延你本该执行的离场。",
      sections: [
        {
          heading: "滚动是什么",
          paragraphs: [
            "滚动就是平掉当前卖出的期权、同时开一张新的——通常换到更晚的到期日，有时换一个行权价。它是一个决策、两条腿：买入平仓、卖出开仓。",
            "你滚动，是为了给交易更多时间兑现、随股价移动调整行权价、或收取更多权利金——最好不引入你本不想承担的新风险。",
          ],
        },
        {
          heading: "向后滚动（更晚到期）",
          paragraphs: [
            "最常见的滚动是「向后」：买回当前期权，卖出同一行权价但更晚到期的一张。多出来的时间通常意味着你收到的权利金多于平仓成本。",
            "对一张走势不利的现金担保看跌，向后滚动为股价在被指派前争取了数周的恢复时间——期间你还在持续收取权利金。",
          ],
          figure: "short-put",
          figureCaption: "把卖出的看跌向后滚动，为交易争取时间并收取新的权利金。",
        },
        {
          heading: "向下或向上滚动",
          paragraphs: [
            "你也可以改变行权价。把看跌「向下向后」滚动会在更晚的日期降低行权价（减少指派风险）；把看涨「向上向后」滚动会在更晚的日期抬高行权价（释放更多上行空间）。",
            "改变行权价通常要花掉部分权利金——你是在用权利金买一个更好的位置。行权价越往对你有利的方向移动，净收权利金越小，有时甚至变为净支出。",
          ],
        },
        {
          heading: "黄金法则：滚动要净收权利金",
          paragraphs: [
            "健康的滚动带来的权利金多于成本——即净收权利金。这意味着市场在付钱让你延期，你的累计权利金持续增长。",
            "净支出滚动（花钱延期）是个警号。你在花钱回避一个结果，往往只是把最终亏损放大。偶尔用小额支出大幅改善行权价是值得的，但对净支出滚动要保持警惕。",
          ],
        },
        {
          heading: "什么时候不该滚动",
          paragraphs: [
            "如果你当初卖出期权的理由已不成立——公司基本面变了，或你不再想持有这只股票——滚动只是推迟一个你现在就该做的决定。接受指派或认亏，然后翻篇。",
            "滚动是给「需要时间的好仓位」用的工具，而不是回避承认判断错误的手段。对一张亏损看跌无休止地向下向后滚动，会悄悄把小错误变成大亏损。",
          ],
        },
        {
          heading: "滚动在滚轮中的位置",
          paragraphs: [
            "在滚轮里，滚动主要出现在两处：延展一张接近或已进入价内的现金担保看跌；以及当股价上涨但你想保留股票时，把备兑看涨向上向后滚动。",
            "每次滚动仍属于同一个周期。CycleIQ 把平仓与重新开仓的腿归在一起，使你的净权利金与成本基础体现出这次滚动，而不是看起来像互不相关的交易。",
          ],
        },
      ],
    },
  },
  {
    slug: "theta-time-decay",
    date: "2026-07-19",
    order: 30,
    thumbnail: "delta-slope",
    en: {
      title: "Theta and time decay: the option seller's edge",
      description:
        "Why time is on the seller's side — what theta measures, how decay accelerates near expiration, and why 30–45 days is a common sweet spot for selling premium in the wheel.",
      sections: [
        {
          heading: "Time is the seller's edge",
          paragraphs: [
            "Every option has a built-in expiration, and its extrinsic value slowly bleeds away as that date approaches. As the seller, you collected that value up front — so this daily bleed works in your favor.",
            "This is the quiet engine of the wheel. Even if a stock goes nowhere, an out-of-the-money option you sold loses value each day, moving you toward keeping the full premium.",
          ],
        },
        {
          heading: "What theta measures",
          paragraphs: [
            "Theta is the option greek that estimates how much value an option loses per day from the passage of time alone, holding everything else constant. A theta of -0.04 means the option loses about $0.04 per share ($4 per contract) each day.",
            "For a seller, that negative theta on the option is a positive on your position — you are 'long theta,' collecting the decay you sold.",
          ],
          figure: "delta-slope",
          figureCaption: "Extrinsic value erodes over time; the seller collects that erosion.",
        },
        {
          heading: "Decay accelerates near expiration",
          paragraphs: [
            "Time decay is not a straight line. An option with 90 days left loses value slowly; the same option in its final two weeks decays much faster, and fastest of all in the last few days.",
            "This is why selling shorter-dated options captures decay quickly — but it also means less total premium and more frequent management. There is no free lunch, only a shape to the curve.",
          ],
        },
        {
          heading: "Weekends and how brokers price theta",
          paragraphs: [
            "Time passes over weekends even though markets are closed, so some of the decay for Saturday and Sunday is priced in on Friday. Do not be surprised if a Monday open does not show three days of obvious decay — much of it already happened.",
            "Theta also interacts with volatility: when implied volatility is high, there is more extrinsic value to decay, so premium — and theta — are larger.",
          ],
        },
        {
          heading: "Why 30–45 days balances theta and risk",
          paragraphs: [
            "Selling around 30–45 days to expiration is popular because it sits where the decay curve starts to steepen, capturing meaningful theta without forcing you into the frantic, low-premium world of very short expirations.",
            "It also leaves room to roll or adjust if the stock moves against you, before the option's fate is sealed in the final days.",
          ],
        },
        {
          heading: "Theta is not free money",
          paragraphs: [
            "Collecting theta feels like getting paid to wait, but the premium is compensation for real risk: the stock can move sharply against your short strike faster than decay can help you.",
            "The wheel manages this by only selling options on stocks you are willing to own and sizing so assignment is acceptable. Theta is your edge, but disciplined strike selection and sizing are what keep that edge from being erased by a single bad move.",
          ],
        },
      ],
    },
    zh: {
      title: "Theta 与时间价值衰减：期权卖方的优势",
      description:
        "为什么时间站在卖方一边——Theta 衡量什么、临近到期时衰减如何加速，以及为什么 30–45 天是滚轮中卖出权利金的常见甜蜜点。",
      sections: [
        {
          heading: "时间是卖方的优势",
          paragraphs: [
            "每张期权都自带到期日，随着这一天临近，它的外在价值会慢慢流失。作为卖方，你已经预先收取了这部分价值——所以这种每日流失对你有利。",
            "这是滚轮安静运转的引擎。即便股价原地踏步，你卖出的价外期权每天都在损失价值，推动你走向保留全部权利金。",
          ],
        },
        {
          heading: "Theta 衡量什么",
          paragraphs: [
            "Theta 是估计「仅因时间流逝、其他条件不变时，期权每天损失多少价值」的希腊字母。Theta 为 -0.04 表示期权每天每股约损失 $0.04（每张合约 $4）。",
            "对卖方而言，期权上的负 Theta 对你的头寸是正向的——你是「做多 Theta」，在收取你卖出的那份衰减。",
          ],
          figure: "delta-slope",
          figureCaption: "外在价值随时间侵蚀，卖方收取这份侵蚀。",
        },
        {
          heading: "临近到期衰减加速",
          paragraphs: [
            "时间价值衰减不是一条直线。剩 90 天的期权价值流失缓慢；同一张期权在最后两周衰减快得多，而在最后几天最快。",
            "这正是卖出更短到期期权能快速吃到衰减的原因——但也意味着总权利金更少、管理更频繁。天下没有免费午餐，只有曲线的形状。",
          ],
        },
        {
          heading: "周末与券商如何为 Theta 定价",
          paragraphs: [
            "即便周末休市，时间仍在流逝，因此周六与周日的部分衰减会在周五就被计入价格。若周一开盘没有明显显示三天的衰减，不必意外——其中大部分已经发生。",
            "Theta 还与波动率相互作用：当隐含波动率高时，可供衰减的外在价值更多，因此权利金——以及 Theta——都更大。",
          ],
        },
        {
          heading: "为什么 30–45 天平衡了 Theta 与风险",
          paragraphs: [
            "卖出剩约 30–45 天的期权之所以流行，是因为它正处在衰减曲线开始变陡之处，既能吃到可观的 Theta，又不至于把你逼进「极短到期、权利金微薄、手忙脚乱」的境地。",
            "它也留出了空间：在最后几天期权命运被定死之前，若股价不利，你还能滚动或调整。",
          ],
        },
        {
          heading: "Theta 不是免费的钱",
          paragraphs: [
            "收取 Theta 感觉像是「等着就有钱拿」，但权利金是对真实风险的补偿：股价可能比衰减帮到你的速度更快地、剧烈地朝你的卖出行权价反向移动。",
            "滚轮通过「只在愿意持有的股票上卖期权」并把仓位控制到「可接受被指派」来管理这一点。Theta 是你的优势，但自律的行权价选择与仓位管理，才是让这份优势不被单次不利波动抹掉的保障。",
          ],
        },
      ],
    },
  },
  {
    slug: "implied-volatility-iv-rank",
    date: "2026-07-18",
    order: 60,
    thumbnail: "delta-curve",
    en: {
      title: "Implied volatility and IV rank: timing your premium selling",
      description:
        "What implied volatility means for option sellers, how IV rank and IV percentile put it in context, and why selling premium when IV is elevated tilts the odds in your favor.",
      sections: [
        {
          heading: "What implied volatility is",
          paragraphs: [
            "Implied volatility (IV) is the market's estimate of how much a stock might move in the future, baked into option prices. High IV means the market expects big moves; low IV means it expects calm.",
            "IV is forward-looking and derived from prices, not history. It is the single biggest lever on how much premium an option carries beyond its intrinsic value.",
          ],
        },
        {
          heading: "IV inflates premium",
          paragraphs: [
            "When IV rises, options get more expensive across the board — the same strike and expiration pays a fatter premium. As a seller, you are effectively selling insurance, and IV is the price of that insurance.",
            "That is why the same 0.30-delta put can pay wildly different premiums depending on the environment: it is not the strike that changed, it is how much fear is priced in.",
          ],
          figure: "delta-curve",
          figureCaption: "The same delta can pay very different premium depending on implied volatility.",
        },
        {
          heading: "IV rank versus IV percentile",
          paragraphs: [
            "A raw IV number is meaningless without context — 40% IV is high for one stock and low for another. IV rank puts current IV on a 0–100 scale relative to its own past year: IV rank of 80 means IV is near the top of its yearly range.",
            "IV percentile is similar but measures the share of days over the past year that IV was lower than today. Both answer the same practical question: is option premium expensive or cheap for this stock right now?",
          ],
        },
        {
          heading: "Sell premium when IV is elevated",
          paragraphs: [
            "Because IV tends to revert toward its average, selling options when IV is high means you collect rich premium and often benefit as IV falls back — a tailwind on top of time decay.",
            "Selling when IV is very low does the opposite: you collect thin premium and risk IV expanding against you, inflating the value of the option you are short.",
          ],
        },
        {
          heading: "Earnings and IV crush",
          paragraphs: [
            "IV usually ramps up into earnings and other known events, then collapses immediately after — a move called 'IV crush.' Premium sold before earnings can lose value quickly once the uncertainty resolves.",
            "That cuts both ways: the elevated premium is tempting, but the stock can also gap far through your strike on the news. Many wheel sellers avoid holding short options through earnings unless they truly want the shares at that strike.",
          ],
        },
        {
          heading: "Using IV in the wheel",
          paragraphs: [
            "IV does not replace your other rules — you still only sell puts on stocks you want to own, at strikes and sizes you can handle. IV just tells you when the market is paying you well to do so.",
            "A practical habit: favor selling cash-secured puts when IV rank is moderate-to-high, and be patient when it is low. Getting paid more for the same risk is one of the simplest edges available to a seller.",
          ],
        },
      ],
    },
    zh: {
      title: "隐含波动率与 IV Rank：把握卖权利金的时机",
      description:
        "隐含波动率对期权卖方意味着什么、IV Rank 与 IV 百分位如何提供参照，以及为什么在 IV 偏高时卖出权利金能让胜率倾向你这边。",
      sections: [
        {
          heading: "什么是隐含波动率",
          paragraphs: [
            "隐含波动率（IV）是市场对股票未来可能波动幅度的估计，内嵌在期权价格中。高 IV 意味着市场预期大幅波动；低 IV 意味着预期平静。",
            "IV 是前瞻性的，从价格反推而来，而非历史数据。它是决定期权在内在价值之外承载多少权利金的最大杠杆。",
          ],
        },
        {
          heading: "IV 抬高权利金",
          paragraphs: [
            "当 IV 上升时，期权整体变贵——同样的行权价与到期日会付出更丰厚的权利金。作为卖方，你实际上在卖保险，而 IV 就是这份保险的价格。",
            "这正是同一张 0.30 Delta 看跌，在不同环境下权利金可以天差地别的原因：变的不是行权价，而是被计入价格的恐慌程度。",
          ],
          figure: "delta-curve",
          figureCaption: "同样的 Delta，随隐含波动率不同，权利金可以差别很大。",
        },
        {
          heading: "IV Rank 与 IV 百分位",
          paragraphs: [
            "脱离参照的原始 IV 数值没有意义——40% 的 IV 对某只股票是高，对另一只是低。IV Rank 把当前 IV 放在其过去一年区间的 0–100 刻度上：IV Rank 为 80 表示 IV 接近其年内区间顶部。",
            "IV 百分位与之类似，衡量过去一年里 IV 低于今天的天数占比。二者回答同一个实用问题：这只股票现在的期权权利金是贵还是便宜？",
          ],
        },
        {
          heading: "在 IV 偏高时卖出权利金",
          paragraphs: [
            "由于 IV 倾向于回归其均值，在 IV 高时卖出期权，意味着你收取丰厚权利金，且常能在 IV 回落时受益——在时间衰减之外再添一股顺风。",
            "在 IV 极低时卖出则相反：你只收到微薄权利金，还要冒 IV 反向扩张的风险，抬高你所卖出期权的价值。",
          ],
        },
        {
          heading: "财报与 IV Crush",
          paragraphs: [
            "IV 通常在财报及其他已知事件前攀升，随后立即回落——这一现象称为「IV Crush（波动率坍塌）」。财报前卖出的权利金，一旦不确定性消除，价值可能迅速缩水。",
            "但这是把双刃剑：升高的权利金很诱人，可股价也可能因消息而跳空、大幅穿过你的行权价。许多滚轮卖方会避免持有卖出的期权跨越财报，除非他们真心愿意以该行权价持有股票。",
          ],
        },
        {
          heading: "在滚轮中运用 IV",
          paragraphs: [
            "IV 不取代你的其他规则——你仍只在愿意持有的股票上、以可承受的行权价与仓位卖出看跌。IV 只是告诉你市场何时为此付给你不错的报酬。",
            "一个实用习惯：在 IV Rank 中高时更倾向卖出现金担保看跌，在其偏低时保持耐心。为同样的风险拿到更多报酬，是卖方最简单的优势之一。",
          ],
        },
      ],
    },
  },
  {
    slug: "what-is-gamma",
    date: "2026-07-17",
    order: 40,
    thumbnail: "gamma-curve",
    en: {
      title: "What is gamma? How fast delta changes",
      description:
        "Gamma is the greek behind delta — it measures how quickly delta itself moves as the stock moves. It is largest at the money and near expiration, and it is the main reason short options feel calm and then suddenly wild.",
      sections: [
        {
          heading: "Gamma is the rate of change of delta",
          paragraphs: [
            "Delta tells you how much an option's price moves per $1 in the stock. Gamma tells you how much that delta itself changes per $1 in the stock. If delta is speed, gamma is acceleration.",
            "A gamma of 0.05 means that for every $1 the stock rises, the option's delta increases by about 0.05. So a 0.30-delta call could become a 0.35-delta call after a $1 move — and keep steepening as the stock keeps rising.",
          ],
        },
        {
          heading: "Gamma is largest at the money",
          paragraphs: [
            "Gamma is not constant across strikes. It peaks for at-the-money options and fades toward zero for deep in- or out-of-the-money options, whose deltas are already pinned near 1 or 0 and barely move.",
            "That is why the at-the-money region is the most sensitive: a small move in the stock there causes the biggest swing in delta, and therefore the fastest change in your exposure.",
          ],
          figure: "gamma-curve",
          figureCaption: "Gamma peaks at the money and tapers toward deep ITM/OTM strikes.",
        },
        {
          heading: "Why gamma matters to option sellers",
          paragraphs: [
            "When you sell an option you are 'short gamma.' Your position's delta moves against you as the stock moves: it gets more negative as the stock falls into your short put, and more positive as the stock rises into your short call.",
            "Practically, that means a short option near the strike can flip from comfortable to threatening quickly. Gamma is the math behind that 'it was fine, then it wasn't' feeling.",
          ],
        },
        {
          heading: "Gamma spikes near expiration",
          paragraphs: [
            "The closer an option gets to expiration, the higher its gamma near the strike. An at-the-money option in its final days can see delta swing violently between near-0 and near-1 on small price moves.",
            "This is 'gamma risk,' and it is why many sellers avoid holding short options into the last day near the money — the position can whipsaw between assigned and not assigned on tiny moves.",
          ],
        },
        {
          heading: "Gamma risk in the wheel",
          paragraphs: [
            "In the wheel you are almost always short gamma, collecting premium and theta in exchange for that risk. The defense is not to fear gamma but to manage it: sell out-of-the-money strikes, size positions so assignment is acceptable, and consider rolling before the final high-gamma days.",
            "Because you actually want to own the stock, being on the wrong side of gamma near expiration usually just means assignment — the next expected step in the cycle, not a disaster.",
          ],
        },
        {
          heading: "Delta and gamma together",
          paragraphs: [
            "Think of delta as your current directional exposure and gamma as how unstable that exposure is. High gamma means your delta will not stay put.",
            "For a wheel seller the takeaway is simple: gamma is highest at the money and near expiry, so those are exactly the conditions where a short option demands the most attention.",
          ],
        },
      ],
    },
    zh: {
      title: "什么是 Gamma？Delta 变化有多快",
      description:
        "Gamma 是 Delta 背后的希腊字母——它衡量当股价变动时 Delta 本身变化得有多快。它在平价与临近到期时最大，也是卖出期权「先风平浪静、后骤然剧烈」的主因。",
      sections: [
        {
          heading: "Gamma 是 Delta 的变化率",
          paragraphs: [
            "Delta 告诉你股价每变动 1 美元、期权价格变动多少。Gamma 则告诉你股价每变动 1 美元、Delta 本身变化多少。如果说 Delta 是速度，Gamma 就是加速度。",
            "Gamma 为 0.05 意味着股价每上涨 1 美元，期权的 Delta 约增加 0.05。于是一张 0.30 Delta 的看涨，在股价涨 1 美元后可能变成 0.35 Delta，并随股价继续上涨而不断变陡。",
          ],
        },
        {
          heading: "Gamma 在平价处最大",
          paragraphs: [
            "Gamma 并非在各行权价上恒定。它在平价期权处达到峰值，向深度价内或价外递减到接近零——那些期权的 Delta 已被钉在接近 1 或 0 的位置，几乎不动。",
            "这正是平价区域最敏感的原因：股价在那里的小幅移动会引起 Delta 最大的摆动，从而使你的敞口变化最快。",
          ],
          figure: "gamma-curve",
          figureCaption: "Gamma 在平价处最高，向深度价内/价外递减。",
        },
        {
          heading: "为什么 Gamma 对期权卖方重要",
          paragraphs: [
            "当你卖出期权时，你是「做空 Gamma」。随着股价移动，你头寸的 Delta 会朝不利方向变化：股价跌向你卖出的看跌时它更偏负，股价涨向你卖出的看涨时它更偏正。",
            "实际效果是：接近行权价的卖出期权，可能很快从舒适变为危险。Gamma 正是「刚才还好好的、转眼就不行了」这种感觉背后的数学。",
          ],
        },
        {
          heading: "Gamma 在临近到期时飙升",
          paragraphs: [
            "期权越接近到期，其在行权价附近的 Gamma 越高。一张平价期权在最后几天，Delta 可能因小幅价格变动而在接近 0 与接近 1 之间剧烈摆动。",
            "这就是「Gamma 风险」，也是许多卖方避免在最后一天持有接近平价的卖出期权的原因——头寸可能因极小的波动在「被指派」与「不被指派」之间来回拉锯。",
          ],
        },
        {
          heading: "滚轮中的 Gamma 风险",
          paragraphs: [
            "在滚轮里你几乎总是做空 Gamma，用承担这份风险换取权利金与 Theta。应对之道不是惧怕 Gamma，而是管理它：卖价外行权价、把仓位控制到可接受被指派、并考虑在最后的高 Gamma 日之前滚动。",
            "因为你本就愿意持有这只股票，临近到期时站在 Gamma 不利的一边，通常只是意味着被指派——那是周期中预期的下一步，而非灾难。",
          ],
        },
        {
          heading: "Delta 与 Gamma 合起来看",
          paragraphs: [
            "把 Delta 看作你当前的方向敞口，把 Gamma 看作这个敞口有多不稳定。高 Gamma 意味着你的 Delta 不会待在原地。",
            "对滚轮卖方，结论很简单：Gamma 在平价与临近到期时最高，所以那正是卖出期权最需要你留意的时刻。",
          ],
        },
      ],
    },
  },
  {
    slug: "what-is-vega",
    date: "2026-07-16",
    order: 50,
    thumbnail: "vega-curve",
    en: {
      title: "What is vega? Sensitivity to volatility",
      description:
        "Vega measures how much an option's price moves when implied volatility changes by one point. It is largest at the money and with more time to expiration — and it explains why option sellers quietly root for calm markets.",
      sections: [
        {
          heading: "Vega measures sensitivity to implied volatility",
          paragraphs: [
            "Vega tells you how much an option's price changes when implied volatility (IV) moves by one percentage point, holding everything else constant. A vega of 0.08 means a 1-point rise in IV adds about $0.08 per share ($8 per contract) to the option's price.",
            "Unlike delta and gamma, which react to the stock's price, vega reacts to the market's expectation of future movement. It is the greek of fear and calm.",
          ],
        },
        {
          heading: "Vega is largest at the money and with more time",
          paragraphs: [
            "Like gamma, vega peaks for at-the-money options. But it also grows with time to expiration: a 90-day option has much more vega than a 7-day option, because there is more future for volatility to act on.",
            "So the biggest volatility risk lives in longer-dated, at-the-money options, and the smallest in short-dated, far out-of-the-money ones.",
          ],
          figure: "vega-curve",
          figureCaption: "Vega peaks at the money and rises with more time to expiration.",
        },
        {
          heading: "Option sellers are short vega",
          paragraphs: [
            "When you sell an option, you are 'short vega.' If IV rises after you sell, the option you are short gets more expensive to buy back — a mark-to-market loss, even if the stock has not moved.",
            "Conversely, if IV falls, the option cheapens and you profit. This is why sellers prefer to open positions when IV is already elevated: there is more room for it to fall than to rise.",
          ],
        },
        {
          heading: "Vega, earnings, and IV crush",
          paragraphs: [
            "IV usually inflates going into earnings and collapses right after — the 'IV crush.' A short option held through earnings can gain value quickly from that vega collapse, provided the stock does not gap through your strike.",
            "That is the vega trade-off around events: rich premium and a favorable IV drop on one side, sharp gap risk on the other. Vega explains the reward; delta and gamma explain the danger.",
          ],
        },
        {
          heading: "Managing vega in the wheel",
          paragraphs: [
            "The wheel is naturally short vega, which pairs well with selling when IV rank is high. You collect fat premium and benefit as volatility mean-reverts lower.",
            "Because wheel sellers usually favor 30–45 day, out-of-the-money strikes, their vega is moderate rather than extreme — enough to benefit from falling IV, not so much that a volatility spike alone dominates the position.",
          ],
        },
        {
          heading: "Vega versus the other greeks",
          paragraphs: [
            "Delta and gamma answer 'what if the stock moves?' Theta answers 'what if time passes?' Vega answers 'what if fear changes?' A complete view of a short option needs all four.",
            "For a seller the ideal setup often lines up several greeks at once: sell when IV is high (short vega tailwind), collect accelerating decay (positive theta), at an out-of-the-money strike (manageable delta and gamma).",
          ],
        },
      ],
    },
    zh: {
      title: "什么是 Vega？对波动率的敏感度",
      description:
        "Vega 衡量隐含波动率每变动一个点时期权价格变动多少。它在平价、以及到期更远时最大——也解释了为什么期权卖方暗暗盼着市场平静。",
      sections: [
        {
          heading: "Vega 衡量对隐含波动率的敏感度",
          paragraphs: [
            "Vega 告诉你：在其他条件不变时，隐含波动率（IV）每变动一个百分点，期权价格变动多少。Vega 为 0.08 意味着 IV 上升 1 个点，会使期权价格每股约增加 $0.08（每张合约 $8）。",
            "与对股价作出反应的 Delta 和 Gamma 不同，Vega 对市场关于未来波动的预期作出反应。它是恐慌与平静的希腊字母。",
          ],
        },
        {
          heading: "Vega 在平价、且时间越长时越大",
          paragraphs: [
            "和 Gamma 一样，Vega 在平价期权处达到峰值。但它还随到期时间增长：90 天期权的 Vega 远大于 7 天期权，因为有更长的未来供波动率发挥作用。",
            "因此最大的波动率风险存在于更长期、平价的期权中，最小的则在短期、深度价外的期权里。",
          ],
          figure: "vega-curve",
          figureCaption: "Vega 在平价处最高，并随到期时间变长而上升。",
        },
        {
          heading: "期权卖方是做空 Vega",
          paragraphs: [
            "当你卖出期权时，你是「做空 Vega」。若卖出后 IV 上升，你所卖出的期权买回来会更贵——即便股价没动，也会出现按市值计价的浮亏。",
            "反之，若 IV 下降，期权变便宜，你获利。这正是卖方偏好在 IV 已经偏高时开仓的原因：此时它下降的空间比上升的空间更大。",
          ],
        },
        {
          heading: "Vega、财报与 IV Crush",
          paragraphs: [
            "IV 通常在财报前膨胀、财报后立即坍塌——即「IV Crush」。只要股价不跳空穿过你的行权价，持有到财报的卖出期权可因这次 Vega 坍塌而快速获利。",
            "这就是事件前后的 Vega 权衡：一边是丰厚权利金与有利的 IV 下降，另一边是剧烈的跳空风险。Vega 解释了回报，Delta 与 Gamma 解释了危险。",
          ],
        },
        {
          heading: "在滚轮中管理 Vega",
          paragraphs: [
            "滚轮天然做空 Vega，这与「在 IV Rank 高时卖出」相得益彰。你收取丰厚权利金，并在波动率均值回归下行时获益。",
            "由于滚轮卖方通常偏好 30–45 天、价外的行权价，其 Vega 处于适中而非极端的水平——足以从 IV 下降中获益，又不至于让单一的波动率飙升主导整个头寸。",
          ],
        },
        {
          heading: "Vega 与其他希腊字母",
          paragraphs: [
            "Delta 与 Gamma 回答「股价变动会怎样？」；Theta 回答「时间流逝会怎样？」；Vega 回答「恐慌变化会怎样？」。要完整看懂一张卖出的期权，四者缺一不可。",
            "对卖方而言，理想的组合往往让多个希腊字母同时对齐：在 IV 高时卖出（做空 Vega 的顺风）、收取加速的时间衰减（正 Theta）、且选在价外行权价（Delta 与 Gamma 可控）。",
          ],
        },
      ],
    },
  },
  {
    slug: "what-is-rho",
    date: "2026-07-15",
    order: 70,
    thumbnail: "rho-line",
    en: {
      title: "What is rho? The interest-rate greek",
      description:
        "Rho measures how an option's price responds to changes in interest rates. It is the quietest greek for short-dated trades — but it explains why calls and puts behave differently as rates move, and why it matters most for long-dated options.",
      sections: [
        {
          heading: "Rho measures sensitivity to interest rates",
          paragraphs: [
            "Rho tells you how much an option's price changes when the risk-free interest rate moves by one percentage point. A rho of 0.10 means a 1-point rise in rates adds about $0.10 per share to the option's price.",
            "Interest rates enter option pricing through the cost of carrying a position over time. That is why rho grows with time to expiration and is nearly negligible for options expiring in days.",
          ],
        },
        {
          heading: "Calls and puts react in opposite directions",
          paragraphs: [
            "Higher rates tend to raise call prices and lower put prices. Intuitively, buying a call defers paying for the stock, and that deferral is worth more when rates are high; a put is closer to holding cash short, which is worth less as rates rise.",
            "So calls have positive rho and puts have negative rho. The effect is small day to day, but it is a real, consistent tilt.",
          ],
          figure: "rho-line",
          figureCaption: "As rates rise, call value tends up (positive rho); put value tends down (negative rho).",
        },
        {
          heading: "Why rho is usually the smallest greek",
          paragraphs: [
            "For the 30–45 day options most wheel sellers trade, rho is tiny compared with delta, theta, and vega. A quarter-point rate change barely nudges a short-dated option's price.",
            "That is why rho is often ignored in day-to-day trading — not because it is fake, but because its impact is dwarfed by price moves, time decay, and volatility over short horizons.",
          ],
        },
        {
          heading: "When rho actually matters",
          paragraphs: [
            "Rho becomes meaningful for long-dated options such as LEAPS (a year or more out), where the carry cost has time to compound. It also matters during regime shifts, when central banks move rates sharply and repeatedly.",
            "If you trade long-dated calls or puts, or if rates are changing fast, rho is worth a glance. For weekly and monthly wheel trades, it is usually background noise.",
          ],
        },
        {
          heading: "Rho in the wheel",
          paragraphs: [
            "The wheel lives in the short-dated world, so rho rarely drives a decision. Higher rates do slightly increase the premium on cash-secured puts, and the cash you hold as collateral earns interest — a small tailwind separate from the option greeks.",
            "In practice, focus your energy on delta, theta, and vega; treat rho as a minor factor that only steps forward for long-dated positions or big rate moves.",
          ],
        },
        {
          heading: "Putting the greeks together",
          paragraphs: [
            "You now have the full set: delta (price), gamma (how delta changes), theta (time), vega (volatility), and rho (rates). Each answers a different 'what if,' and a short option is exposed to all of them at once.",
            "For a wheel seller the priority order is roughly theta and vega as the edge, delta and gamma as the risk to manage, and rho as a distant background factor. Keep that hierarchy and the greeks become a checklist rather than a maze.",
          ],
        },
      ],
    },
    zh: {
      title: "什么是 Rho？利率希腊字母",
      description:
        "Rho 衡量期权价格对利率变化的反应。对短期交易而言它是最安静的希腊字母——但它解释了利率变动时看涨与看跌为何表现不同，以及为什么它对长期期权最重要。",
      sections: [
        {
          heading: "Rho 衡量对利率的敏感度",
          paragraphs: [
            "Rho 告诉你：无风险利率每变动一个百分点，期权价格变动多少。Rho 为 0.10 意味着利率上升 1 个点，会使期权价格每股约增加 $0.10。",
            "利率通过「持有头寸的时间成本」进入期权定价。这正是 Rho 随到期时间增长、而对几天内到期的期权几乎可忽略的原因。",
          ],
        },
        {
          heading: "看涨与看跌方向相反",
          paragraphs: [
            "利率上升往往抬高看涨价格、压低看跌价格。直觉上，买看涨相当于推迟支付买股的钱，利率高时这种推迟更值钱；而看跌更接近持有空头现金，利率上升时其价值更低。",
            "所以看涨的 Rho 为正、看跌的 Rho 为负。这个效应在日间很小，但是一种真实、稳定的倾向。",
          ],
          figure: "rho-line",
          figureCaption: "利率上升时，看涨价值倾向上行（Rho 为正）；看跌价值倾向下行（Rho 为负）。",
        },
        {
          heading: "为什么 Rho 通常是最小的希腊字母",
          paragraphs: [
            "对多数滚轮卖方交易的 30–45 天期权来说，Rho 与 Delta、Theta、Vega 相比微不足道。四分之一个点的利率变化，几乎撼动不了短期期权的价格。",
            "这正是日常交易常忽略 Rho 的原因——不是因为它是假的，而是在短周期里，它的影响被价格变动、时间衰减与波动率所掩盖。",
          ],
        },
        {
          heading: "Rho 何时真正重要",
          paragraphs: [
            "对 LEAPS 这类长期期权（一年或更久），Rho 会变得可观，因为持有成本有时间累积。它在货币政策转向、央行大幅且反复调整利率时也很重要。",
            "如果你交易长期看涨或看跌，或利率正在快速变化，Rho 值得一看。对以周、月为周期的滚轮交易，它通常只是背景噪声。",
          ],
        },
        {
          heading: "滚轮中的 Rho",
          paragraphs: [
            "滚轮活在短周期世界，因此 Rho 很少主导决策。利率上升确实会略微抬高现金担保看跌的权利金，而你作为担保金持有的现金也会产生利息——这是独立于期权希腊字母的一股小顺风。",
            "实践中，把精力放在 Delta、Theta 与 Vega 上；把 Rho 当作次要因素，只在长期头寸或利率大幅变动时才需要它登场。",
          ],
        },
        {
          heading: "把希腊字母串起来",
          paragraphs: [
            "现在你拥有了全套：Delta（价格）、Gamma（Delta 如何变化）、Theta（时间）、Vega（波动率）与 Rho（利率）。每一个都回答一个不同的「如果……会怎样」，而一张卖出的期权同时暴露于它们全部。",
            "对滚轮卖方，大致的优先级是：Theta 与 Vega 是优势来源，Delta 与 Gamma 是要管理的风险，Rho 则是遥远的背景因素。守住这个层次，希腊字母就会从迷宫变成一张清单。",
          ],
        },
      ],
    },
  },
];

function localize(source: LearnPostSource, locale: Locale): LearnPost {
  const body = locale === "zh" ? source.zh : source.en;
  return {
    slug: source.slug,
    date: source.date,
    order: source.order,
    thumbnail: source.thumbnail,
    title: body.title,
    description: body.description,
    sections: body.sections,
  };
}

/** Ordered by curriculum depth (most fundamental first), then newest. */
export function getAllPosts(locale: Locale): LearnPost[] {
  return POSTS.map((p) => localize(p, locale)).sort(
    (a, b) => a.order - b.order || b.date.localeCompare(a.date)
  );
}

export function getPostBySlug(slug: string, locale: Locale): LearnPost | null {
  const source = POSTS.find((p) => p.slug === slug);
  return source ? localize(source, locale) : null;
}

export function getAllSlugs(): string[] {
  return POSTS.map((p) => p.slug);
}

/** ISO dates for sitemap lastModified. */
export function getPostSitemapEntries(): Array<{ slug: string; date: string }> {
  return POSTS.map((p) => ({ slug: p.slug, date: p.date }));
}
