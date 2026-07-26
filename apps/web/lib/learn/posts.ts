import type { Locale } from "@/lib/i18n/locales";
import type { LearnPost, LearnPostSource } from "./types";

const POSTS: LearnPostSource[] = [
  {
    slug: "options-101",
    date: "2026-07-26",
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
    slug: "wheel-basics",
    date: "2026-07-20",
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
        },
        {
          heading: "Covered calls",
          paragraphs: [
            "Once you own the shares, you can sell a covered call against them. You collect more premium and agree to sell the shares at the call strike if assigned.",
            "If the call expires worthless, you keep the shares and the premium — which lowers your holding cost. If the call is assigned (called away), you sell the shares at the call strike and the wheel cycle typically ends.",
          ],
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
        },
        {
          heading: "备兑看涨（CC）",
          paragraphs: [
            "持有股票后，可对其卖出备兑看涨。您再收取权利金，并约定若被行权则按看涨行权价卖出股票。",
            "若看涨价外到期，您保留股票与权利金——持股成本下降。若看涨被行权（股票被 call away），您以看涨行权价卖出股票，该滚轮周期通常结束。",
          ],
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
