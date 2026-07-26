import type { Locale } from "@/lib/i18n/locales";
import type { LearnPost, LearnPostSource } from "./types";

const POSTS: LearnPostSource[] = [
  {
    slug: "options-101",
    date: "2026-07-26",
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
];

function localize(source: LearnPostSource, locale: Locale): LearnPost {
  const body = locale === "zh" ? source.zh : source.en;
  return {
    slug: source.slug,
    date: source.date,
    thumbnail: source.thumbnail,
    title: body.title,
    description: body.description,
    sections: body.sections,
  };
}

/** Newest first. */
export function getAllPosts(locale: Locale): LearnPost[] {
  return POSTS.map((p) => localize(p, locale)).sort((a, b) =>
    b.date.localeCompare(a.date)
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
