const en = {
  common: {
    brand: {
      name: "CycleIQ",
      tagline: "Wheel Strategy Tracker",
    },
    a11y: {
      skipToMain: "Skip to main content",
      close: "Close",
      closeMenu: "Close menu",
      openMenu: "Open menu",
      expandSidebar: "Expand sidebar",
      collapseSidebar: "Collapse sidebar",
      metricDetails: "Metric details",
      actions: "Actions",
      tradeActions: "Trade actions",
      editEntry: "Edit entry",
      deleteEntry: "Delete entry",
      dismiss: "Dismiss",
      chooseDate: "Choose date",
      previousMonth: "Previous month",
      nextMonth: "Next month",
      primaryNav: "Primary",
      legalNav: "Legal",
      home: "CycleIQ home",
    },
    language: {
      label: "Language",
      en: "EN",
      zh: "中文",
    },
    actions: {
      cancel: "Cancel",
      save: "Save",
      retry: "Retry",
      clear: "Clear",
      today: "Today",
      back: "Back",
      signOut: "Sign out",
      loading: "Loading…",
      saving: "Saving…",
      savingEllipsis: "Saving...",
      redirecting: "Redirecting…",
      opening: "Opening…",
      sending: "Sending…",
      deleting: "Deleting…",
      rolling: "Rolling...",
      optional: "optional",
      required: "*",
    },
    loadingPhases: {
      default: {
        p0: "Refreshing data…",
        p3000: "Still connecting to server…",
        p8000: "Taking longer than usual. Please wait…",
      },
      app: {
        p0: "Loading your workspace…",
        p3000: "Connecting to CycleIQ…",
        p8000: "Almost there…",
      },
      auth: {
        p0: "Loading…",
        p3000: "Connecting to CycleIQ…",
        p8000: "Almost there…",
      },
    },
    sync: {
      subtitle: "Syncing with your account and trade data",
      fetchSubtitle: "Fetching the latest from your database",
    },
    date: {
      select: "Select date",
      from: "From",
      to: "To",
      weekdays: "Su,Mo,Tu,We,Th,Fr,Sa",
    },
    strategy: {
      csp: "CSP",
      cc: "CC",
      cspFull: "Cash Secured Put",
      ccFull: "Covered Call",
      cspOption: "Cash Secured Put (CSP)",
      ccOption: "Covered Call (CC)",
      sellPut: "Sell Put",
      sellCall: "Sell Call",
    },
    moneyness: {
      itm: "ITM",
      otm: "OTM",
    },
    empty: {
      noData: "No data",
    },
    status: {
      OPEN: "Open",
      CLOSED: "Closed",
      EXPIRED: "Expired",
      ASSIGNED: "Assigned",
      CALLED_AWAY: "Called Away",
      ROLLED: "Rolled",
      EXPIRED_ITM: "Expired ITM",
      EXPIRED_OTM: "Expired OTM",
    },
    cycleState: {
      active: "Active",
      completed: "Completed",
      done: "Done",
      netPnl: "Net P&L",
      CSP_OPEN: "CSP Open",
      STOCK_HELD: "Stock Held",
      CC_OPEN: "CC Open",
      EXIT: "Exit",
      CSP_CLOSED: "CSP Closed",
    },
    columns: {
      ticker: "Ticker",
      strategy: "Strategy",
      strike: "Strike",
      expiry: "Expiry",
      dte: "DTE",
      premium: "Premium",
      status: "Status",
      qty: "Qty",
      price: "Price",
      moneyness: "Moneyness",
      expiration: "Expiration",
      stockCost: "Stock Cost",
      roiAnn: "ROI (Ann.)",
      date: "Date",
      type: "Type",
      amount: "Amount",
      actions: "Actions",
    },
    meta: {
      defaultDescription:
        "Track cash-secured puts and covered calls as full wheel cycles. Log trades, visualize CSP → assignment → CC lifecycles, and monitor premium, realized P&L, and cost basis — no spreadsheets.",
      keywords:
        "wheel strategy, options wheel, cash secured put, covered call, CSP tracker, options trading journal, wheel cycle, premium tracking, options P&L",
      template: "{{title}} · CycleIQ",
    },
    capital: {
      overBudget:
        "Total capital invested {{after}} ({{pct}}% of total capital) exceeds your available capital of {{pool}} (over by {{over}})",
    },
    version: "CycleIQ · v0.1",
  },

  nav: {
    dashboard: "Dashboard",
    trades: "Trades",
    cycles: "Cycles",
    account: "Account",
    settings: "Settings",
    reports: "Reports",
    home: "Home",
    pricing: "Pricing",
    about: "About",
    faq: "FAQ",
    contact: "Contact Us",
    signInRegister: "Sign in / Register",
    signIn: "Sign in",
    tagline: "Wheel strategy tracking for retail traders",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
  },

  marketing: {
    home: {
      badge: "Wheel strategy tracker",
      heroTitle: "Your full options wheel,",
      heroTitleAccent: "one clear view.",
      heroBody:
        "CycleIQ connects cash-secured puts, assignments, and covered calls into wheel cycles — so you can track premium, realized P&L, cost basis, and open positions without spreadsheets or broker tab-hopping.",
      ctaSignIn: "Sign in / Register",
      ctaHowItWorks: "How it works",
      bullet1: "Manual trade log — no broker API required",
      bullet2: "Wheel cycles with roll chains and per-leg net P&L",
      bullet3: "Dashboard KPIs aligned to how you actually run the wheel",
      preview: {
        dashboard: "Dashboard",
        kpi: {
          realizedPnl: "Net P&L",
          realizedPnlSub: "Realized + stock MTM",
          totalPremium: "Total Premium",
          totalPremiumSub: "Gross, all legs",
          winRate: "Win Rate",
          winRateSub: "Terminal outcomes",
          activeTrades: "Active Trades",
          activeTradesSub: "Open legs",
        },
        activePositions: "Active positions",
        tradesLink: "Trades →",
        cspOpen: "CSP open",
        stockHeld: "Stock held",
        ccOpen: "CC open",
      },
      howItWorks: {
        title: "How it works",
        subtitle: "Log trades manually. CycleIQ links legs into cycles and keeps analytics in sync.",
        step1: {
          title: "Log your trades",
          body: "Enter CSPs and CCs with strike, expiry, premium, contracts, and fees. Set trading defaults for faster entry.",
        },
        step2: {
          title: "Cycles link up",
          body: "Trades auto-attach to wheel cycles. Rolls stay on the same chain; assignments and call-aways update cycle state.",
        },
        step3: {
          title: "Review and act",
          body: "Use the dashboard for P&L and capital, the trade log to expire or roll, and Cycles for wheel visuals and CC cost basis.",
        },
      },
      problem: {
        title: "Built for the wheel — not generic options",
        label: "The problem",
        b1: "Brokers list legs separately — hard to see the full CSP → CC story",
        b2: "Spreadsheets break when you roll, get assigned, or run multiple wheels",
        b3: "Realized P&L and cost basis get messy across rolls and call-aways",
      },
      solution: {
        label: "With CycleIQ",
        b1: "One cycle per wheel with CSP, assignment, CC legs and roll history",
        b2: "Realized P&L includes option cashflow and stock gain on call-away",
        b3: "CC cost basis tracked per open wheel — aligned with dashboard logic",
      },
      features: {
        title: "What you get",
        subtitle: "Everything in the app today — no vaporware feature list.",
        wheel: {
          title: "Wheel & cycle view",
          body: "Visual fan diagram per wheel, completed vs active states, and net P&L between legs including roll buybacks.",
        },
        dashboard: {
          title: "Dashboard analytics",
          body: "Capital invested, realized P&L, win rate, open premium yield, and daily/weekly/monthly premium charts.",
        },
        trades: {
          title: "Trade workflow",
          body: "Filter by CSP/CC and status, expire, roll, assign, or buy to close — with live quotes on open legs.",
        },
        costBasis: {
          title: "CC cost basis",
          body: "Per-wheel initial vs current stock cost after realized CC premium — only for open assigned positions.",
        },
      },
      cta: {
        title: "Start tracking your wheel today",
        body: "Free to use. No broker connection. Log your first CSP in minutes.",
      },
      disclaimer:
        "CycleIQ is a trade journaling and analytics tool. It is not a broker, investment adviser, or signal service. Nothing on this site is financial, investment, or trading advice. Options trading involves substantial risk of loss.",
    },
    about: {
      metaTitle: "About CycleIQ",
      metaDescription:
        "Learn what CycleIQ is: a wheel-strategy tracker for cash-secured puts and covered calls. We help you journal trades, link cycles, and review premium and P&L — not trade for you.",
      badge: "About CycleIQ",
      title: "Built for traders who run the wheel.",
      titleAccent: "Clear books, clearer decisions.",
      subtitle:
        "CycleIQ is a focused web app for retail options traders who sell cash-secured puts and covered calls. We turn scattered fills into readable wheel cycles so you can see premium, cost basis, and outcomes in one place.",
      mission: {
        title: "Our mission",
        p1: "Most brokers show option legs in isolation. Spreadsheets break the moment you roll, get assigned, or run several tickers at once. CycleIQ exists to close that gap: a durable journal purpose-built for the options wheel lifecycle.",
        p2: "We are not trying to be an all-in-one trading platform. We focus on accurate records, cycle state, and the metrics wheel traders actually use day to day.",
      },
      what: {
        title: "What CycleIQ does",
        p1: "When you use CycleIQ, you can:",
        i1: "Log CSP and covered-call trades manually — strike, expiry, premium, contracts, and fees",
        i2: "Link legs into wheel cycles, including rolls, assignments, and call-aways",
        i3: "Review dashboard KPIs such as realized P&L, premium, win rate, and capital deployed",
        i4: "Track covered-call cost basis on open assigned positions",
      },
      not: {
        title: "What CycleIQ is not",
        p1: "Transparency matters for anyone evaluating the product — and for advertising destination standards:",
        i1: "Not a brokerage: we do not place, route, or execute orders",
        i2: "Not investment advice: we do not recommend tickers, strikes, or trades",
        i3: "Not a copy-trading or signal product: you enter and own your own data",
      },
      pillars: {
        p1: {
          title: "For retail wheel traders",
          body: "If you already sell CSPs and CCs and need cleaner books, CycleIQ is designed around that workflow.",
        },
        p2: {
          title: "Manual-first by design",
          body: "No broker API required. You control what gets logged, which keeps setup simple and data ownership clear.",
        },
        p3: {
          title: "Straightforward pricing",
          body: "Basic is free with a monthly trade cap. Premium is $1/month for unlimited logging via Stripe.",
        },
      },
      support: {
        title: "How to reach us",
        p1: "Questions about your account, billing, or how cycles work? Use the contact form — we typically reply within 1–2 business days.",
        faqLink: "Read the FAQ",
        contactLink: "Contact form",
      },
      disclaimer:
        "CycleIQ provides software for record-keeping and analysis only. Past performance shown in your dashboard reflects your own logged activity and is not a guarantee of future results. Options trading can result in the loss of capital.",
      cta: {
        title: "See CycleIQ in practice",
        body: "Create a free Basic account and log your first CSP in minutes.",
      },
    },
    faq: {
      metaTitle: "FAQ",
      metaDescription:
        "Answers about CycleIQ: what the wheel tracker does, pricing, privacy, and support. Learn how cash-secured put and covered-call journaling works.",
      badge: "Help center",
      title: "Questions about CycleIQ.",
      titleAccent: "Plain answers.",
      subtitle:
        "What CycleIQ is for, how pricing works, and how to get help — without the jargon.",
      listTitle: "Frequently asked questions",
      contactLink: "Contact Us",
      cta: {
        title: "Ready to start?",
        body: "Basic is free. No broker connection required.",
      },
      items: {
        what: {
          q: "What is CycleIQ?",
          a: "CycleIQ is a journal for the options wheel. You log cash-secured puts and covered calls; we group them into cycles and show premium, P&L, cost basis, and what’s still open.",
        },
        broker: {
          q: "Is CycleIQ a broker? Do you connect to my brokerage?",
          a: "No. CycleIQ does not place orders or sync with your broker. You enter trades yourself. Your broker remains the source of truth for fills and positions.",
        },
        advice: {
          q: "Does CycleIQ give trading advice?",
          a: "No. CycleIQ does not recommend trades, strikes, or tickers, and it does not send signals. Charts and metrics only reflect what you logged.",
        },
        wheel: {
          q: "What is the options wheel?",
          a: "A common wheel flow is: sell a cash-secured put → get assigned shares if it expires in the money → sell covered calls against those shares until they are called away → repeat. CycleIQ tracks that story as one cycle.",
        },
        pricing: {
          q: "How does pricing work?",
          a: "Basic is free and lets you add up to 20 new trades each month (the counter resets at the start of every month). Editing an existing trade does not use an extra slot. Premium is $1/month for unlimited new trades, billed via Stripe. Cancel anytime in Settings → Billing.",
        },
        data: {
          q: "Is my data private?",
          a: "Yes. Your account and the trades you enter are used to run your CycleIQ dashboard. We do not sell your personal information. More detail is in the Privacy Policy.",
        },
        cancel: {
          q: "Can I cancel Premium or delete my account?",
          a: "Yes. Cancel Premium anytime in Settings → Billing; you’ll keep Basic with the monthly trade limit. To delete your account or ask about your data, use the Contact page.",
        },
        support: {
          q: "How do I get help?",
          a: "Use the Contact page form. Include the email on your CycleIQ account if the question is about billing or access.",
        },
        privacy: {
          q: "Where are the legal policies?",
          a: "You can read our Privacy Policy and Terms of Service anytime.",
        },
      },
    },
    pricing: {
      metaDescription:
        "CycleIQ Basic and Premium plans. Basic is free with 20 trades per month. Premium is $1/month with unlimited trade logging.",
      badge: "Simple pricing",
      title: "Basic or Premium.",
      titleAccent: "Your wheel, your pace.",
      subtitle:
        "Start on Basic for free with 20 new trades each month. Move to Premium when you need unlimited trade logging for $1 per month.",
      shared: {
        f1: "Full wheel cycle tracking (CSP → CC → call-away)",
        f2: "Dashboard KPIs and lifecycle visualization",
        f3: "Trade filters, rolls, assignments, and expirations",
        f4: "Settings sync across devices",
      },
      plan: {
        badge: "Unlimited trades",
        tradeLimitLabel: "Trade limit:",
      },
      basic: {
        name: "Basic",
        tagline: "For getting started",
        price: "$0",
        priceNote: "forever",
        tradeLimit: "20 new trades each month. Editing existing trades does not count.",
        cta: "Get started free",
      },
      premium: {
        name: "Premium",
        tagline: "For active wheel traders",
        price: "$1",
        priceNote: "per month",
        tradeLimit: "Unlimited new trades each month.",
      },
      footer: "Premium is billed monthly via Stripe. Cancel anytime from Settings → Billing.",
      faq: {
        title: "Pricing questions",
        subtitle: "How plans, limits, and billing work.",
        items: {
          limit: {
            q: "What counts toward the Basic 20-trade limit?",
            a: "Only new trades you create in the current month. The counter resets at the start of each month. Editing, expiring, rolling, or assigning an existing trade does not use an extra slot.",
          },
          payment: {
            q: "How is Premium billed?",
            a: "Premium is $1 USD per month through Stripe. You can cancel anytime; access returns to Basic after the paid period ends.",
          },
          features: {
            q: "Do Basic and Premium include the same features?",
            a: "Yes. Both plans include wheel cycles, dashboard analytics, and the full trade workflow. Premium only removes the monthly new-trade cap.",
          },
        },
      },
      cta: {
        title: "Start tracking your wheel today",
        body: "Basic is free — log your first CSP in minutes. No broker connection required.",
        button: "Sign in / Register",
      },
      upgrade: {
        signIn: "Sign in to upgrade",
        button: "Upgrade to Premium — $1/mo",
        canceled: "Checkout canceled — you can upgrade anytime.",
        error: "Could not start checkout.",
      },
    },
    contact: {
      cta: {
        title: "Ready to track your wheel?",
        body: "Sign in free — Basic includes 20 trades per month.",
      },
    },
  },

  auth: {
    shell: {
      badge: "Wheel strategy tracker",
      headline: "Run your options wheel with clarity",
      subhead: "Purpose-built for cash-secured puts and covered calls — not a generic spreadsheet.",
      feature1: {
        title: "Trade journal",
        body: "Log CSPs and covered calls with fees, rolls, and lifecycle actions.",
      },
      feature2: {
        title: "Wheel cycles",
        body: "Follow each ticker from put assignment through CC premium and exit.",
      },
      feature3: {
        title: "Portfolio insights",
        body: "Realized P&L, cost basis, and open positions in one dashboard.",
      },
      copyright: "© {{year}} CycleIQ",
    },
    login: {
      metaTitle: "Sign in",
      metaDescription:
        "Sign in to CycleIQ to track your options wheel cycles, CSPs, covered calls, and premium P&L.",
      title: "Welcome back",
      subtitle: "Sign in to your CycleIQ account to continue tracking your wheel.",
      footer: "New to CycleIQ?",
      createAccount: "Create an account",
      registered:
        "Registration successful. Please check your email to confirm your account if required.",
      oauth: {
        supabaseUrl:
          "Supabase URL is misconfigured. Set NEXT_PUBLIC_SUPABASE_URL to https://<project>.supabase.co only (no /auth/v1/... path) in Vercel, then redeploy.",
        vercel:
          "Google sign-in failed (bad_oauth_callback). In your dev Supabase project → Authentication → URL Configuration, add Redirect URL https://*-xiaohuahou-4977s-projects.vercel.app/** (or https://*-.vercel.app/**). Also set NEXT_PUBLIC_SUPABASE_URL to the project origin only, redeploy, then retry.",
        generic: "Google sign-in failed. Please try again or use email and password.",
      },
      divider: "Or with email",
      email: "Email",
      emailPlaceholder: "you@example.com",
      password: "Password",
      passwordPlaceholder: "••••••••",
      rememberMe: "Remember me",
      forgotPassword: "Forgot password? Coming soon",
      submit: "Sign in",
      submitting: "Signing in…",
      error: {
        invalidCredentials: "Invalid email or password.",
        invalidEmail: "Please enter a valid email address.",
        passwordRequired: "Please enter your password.",
        unexpected: "Unexpected error while signing in.",
      },
    },
    register: {
      metaTitle: "Create account",
      metaDescription:
        "Create a free CycleIQ account to log wheel strategy trades, track CSP and covered call cycles, and monitor premium income.",
      title: "Create your account",
      subtitle:
        "If your project requires email confirmation, you will receive a link before you can sign in.",
      footer: "Already have an account?",
      signIn: "Sign in",
      confirmPassword: "Confirm password",
      confirmPlaceholder: "Repeat password",
      passwordPlaceholder: "At least 8 characters",
      terms: "By creating an account, you agree to our",
      termsLink: "Terms of Service",
      and: "and",
      privacyLink: "Privacy Policy",
      submit: "Create account",
      submitting: "Creating account…",
      error: {
        passwordLength: "Password must be at least 8 characters.",
        passwordMismatch: "Passwords do not match.",
        unexpected: "Unexpected error while registering.",
      },
    },
    google: {
      continue: "Continue with Google",
      signUp: "Sign up with Google",
      redirecting: "Redirecting…",
      error: "Failed to start Google sign-in.",
    },
    userMenu: {
      account: "Account",
      signedInAs: "Signed in as",
      profile: "Profile",
      profileSoon: "soon",
      settings: "Settings",
      signOut: "Log out",
    },
  },

  dashboard: {
    title: "Dashboard",
    description: "Your wheel strategy at a glance",
    error: {
      load: "Failed to load dashboard data.",
    },
    kpi: {
      totalCapital: {
        label: "Total Capital",
        sub: "{{deployed}} deployed ({{pct}}%) · {{budget}} {{netPnl}} net P&L",
        tip: "Total capital = starting budget + net P&L (same as the Net P&L card). Net P&L = realized option/stock cashflows plus unrealized stock MTM on shares still held after CSP assignment: (live price − CSP assignment strike) × open shares. Live quotes refresh when the dashboard loads; without a quote, stock MTM is omitted. Deployed = open CSP notional + stock held at cost basis. Utilization = deployed ÷ total capital.",
      },
      totalPremium: {
        label: "Total Premium",
        sub: "Gross premium, all legs",
        tip: "Sum of premium × contracts × 100 for every trade (includes open, rolled, and bought-back legs). Not net cash after fees or buybacks.",
      },
      realizedPnl: {
        label: "Net P&L",
        sub: "Realized {{realized}} · stock MTM {{mtm}}",
        tip: "Net P&L = realized option/stock cashflows (CLOSED, EXPIRED, ROLLED, CALLED_AWAY, ASSIGNED legs + call-away stock P&L) plus unrealized MTM on open assigned shares: (live price − CSP assignment strike) × shares still held. Matches the Cycles wheel center when a quote is available; if no quote loads, stock MTM shows $0.",
      },
      yearlyIncome: {
        label: "Yearly Income",
        sub: "{{daily}} / day",
        tip: "Projection only: (total gross premium ÷ days since first trade) × 365. Not realized income; ignores fees, buybacks, and assignment timing.",
      },
      openPremiumYield: {
        label: "Open Premium Ann. Yield",
        sub: "Based on open premium and capital",
        tip: "(sum of open-leg gross premium ÷ total capital invested) × (365 ÷ simple average DTE of open legs). Uses unweighted DTE, not the premium-weighted DTE on the card below.",
      },
      realizedRoi: {
        label: "Realized Annual ROI",
        sub: "Annualized · simple avg hold",
        tip: "(realized P&L ÷ capital at risk on realized legs) × (365 ÷ simple average holding days). Annualized projection using unweighted average hold time.",
      },
      periodReturn: {
        label: "Period Return",
        sub: "Net P&L {{amount}} · TWR {{twr}}",
        subUnreliable: "Net P&L {{amount}} · TWR {{twr}} · large flows — trust net $",
        tip: "Main value = return on starting capital for the period: (end NAV − start NAV − net deposits) ÷ start NAV. The period starts at your first trade or capital flow (not the chart range). End NAV uses budget + net P&L as of today (includes open-share MTM when a quote is available). Subtitle shows net P&L dollars and time-weighted return (TWR). Historical TWR days use realized P&L only; today's end point adds stock MTM.",
      },
      winRate: {
        label: "Win Rate",
        sub: "Based on strategy outcomes",
        tip: "Wins ÷ terminal legs (CLOSED, EXPIRED, ASSIGNED, CALLED_AWAY). Win = OTM expire, called away, or CLOSED with positive net cashflow. ASSIGNED CSP counts in the denominator but not as a win.",
      },
      activeTrades: {
        label: "Active Trades",
        sub: "OPEN, expiry not passed",
        tip: "Count of OPEN legs with expiry on or after today (same as Trades → Today filter).",
      },
      avgPremiumDte: {
        label: "Avg Premium / Weighted DTE",
        sub: "Avg DTE: {{days}} days",
        subEmpty: "No open positions",
        tip: "Weighted open DTE = Σ(premium × DTE) ÷ Σ(premium). Avg premium/day = open premium ÷ weighted open DTE.",
      },
    },
    chart: {
      dailyPremium: "Daily Premium (by open date)",
      weeklyPremium: "Weekly Premium (by open date)",
      monthlyPremium: "Monthly Premium (by open date)",
      capitalTrend: "Total Capital Trend",
      capitalTrendTip:
        "Each point = budget + cumulative realized P&L at that date. The latest point also adds open-share MTM from today's quote (same as Total Capital). Earlier points do not include historical stock marks. {{budgetLine}} {{rangeHint}}",
      capitalTrendBudgetLine: "Dashed line = current budget ({{amount}}).",
      capitalTrendNoBudget: "No budget reference line when your starting budget changed during the period.",
      capitalTrendRangeYtd: "Year to date, snapshot at each week/month end.",
      capitalTrendRange1y: "Trailing 12 months, snapshot at each week/month end.",
      granularity: {
        week: "Week",
        month: "Month",
      },
      range: {
        ytd: "YTD",
        oneYear: "1Y",
      },
      vsBudget: "{{sign}}{{amount}} vs budget",
      ariaCapitalTrend: "Total capital trend",
    },
    positions: {
      total: "{{count}} total",
      viewAll: "View all trades →",
      empty: {
        title: "No trades yet",
        body: "No active positions at the moment.",
      },
      logoAlt: "{{ticker}} logo",
    },
    summary: {
      totalPremium: "Total Premium",
      totalPremiumSub: "All time",
      annualizedReturn: "Annualized Return",
      annualizedReturnSub: "Capital deployed",
      activePositions: "Active Positions",
      activePositionsSub: "CSP + CC",
      winRate: "Win Rate",
      winRateSub: "Expired OTM",
    },
  },

  trades: {
    title: "Trades",
    description: "Manage CSP and covered call positions",
    limitBanner:
      "You've used all {{limit}} trades for this month on the Basic plan.",
    limitBannerLink: "View pricing",
    limitBannerSuffix: "or wait until the next calendar month.",
    limitReason:
      "Monthly trade limit reached (Basic plan: 20/month). Upgrade to Premium or wait until next month.",
    usage: {
      basic: "{{used}}/{{limit}} trades this month · Basic",
      premium: "{{used}} trades this month · Premium",
    },
    prices: {
      footer: "Prices update once per hour. Last updated at {{time}}.",
    },
    modal: {
      addTitle: "Add Trade",
      editTitle: "Edit Trade",
      save: "Save Trade",
      update: "Update Trade",
    },
    filters: {
      searchPlaceholder: "Search ticker…",
      addTrade: "+ Add trade",
      sinceLastMonth: "Since last month",
      custom: "Custom",
      status: {
        open: "Open",
        closed: "Closed",
        expired: "Expired",
        assigned: "Assigned",
        away: "Away",
        rolled: "Rolled",
      },
    },
    list: {
      empty: {
        title: "No trades match your filters",
        body: "Try a wider date range, a different status tab, or add a new trade.",
        cta: "Add your first trade",
      },
      weekOf: "Week of {{mon}} – {{fri}}",
      menu: {
        edit: "Edit",
        buyToClose: "Buy to Close",
        expire: "Expire",
        callAway: "Call Away",
        assign: "Assign",
        roll: "Roll",
        delete: "Delete",
        deleteConfirm: "Delete?",
        rolledWarning: "This is a rolled trade. Deleting it will break the trade chain.",
        deleteAnyway: "Yes, delete anyway",
      },
    },
    form: {
      strategy: "Strategy",
      ticker: "Ticker",
      tickerPlaceholder: "e.g. AAPL",
      strike: "Strike Price",
      strikePlaceholder: "e.g. 350.00",
      premium: "Premium per Share",
      premiumPlaceholder: "e.g. 2.11",
      totalReceived: "Total received: {{amount}}",
      contracts: "Contracts",
      openDate: "Open Date",
      expiration: "Expiration Date",
      ccLinkFound:
        "Will link to the existing wheel cycle for {{ticker}} (assigned position found).",
      ccPickAssignedTicker:
        "Assigned stock on hand: {{tickers}}. Enter one of these tickers to sell a covered call.",
      ccNoAssignment:
        "No assigned position found for {{ticker}}. A covered call requires owning the underlying shares (from a prior CSP assignment).",
      capitalSummary:
        "Total capital: {{base}} + {{csp}} (this CSP) = {{total}} / {{budget}} budget ({{pct}}%)",
    },
    validation: {
      tickerRequired: "Ticker is required",
      tickerTooLong: "Ticker is too long",
      strikeRequired: "Strike is required",
      mustBePositive: "Must be positive",
      expiryRequired: "Expiry date is required",
      tradeDateRequired: "Trade date is required",
      premiumRequired: "Premium is required",
      contractsRequired: "Contracts is required",
      wholeNumber: "Must be a whole number",
      minContracts: "Minimum 1 contract",
      notesMax: "Max 500 characters",
      ccNoPosition:
        "No assigned stock for {{ticker}}. Sell a CSP and mark it assigned before opening a covered call.",
      ccInsufficientShares:
        "Not enough shares for {{ticker}}: {{needed}} shares needed but only {{available}} available ({{availableContracts}} contracts).",
    },
    optional: {
      title: "Optional Details",
      commission: "Commission Fees (total)",
      commissionPlaceholder: "e.g. 1.30",
      notes: "Notes",
      notesPlaceholder: "Any notes about this position...",
      show: "Show Optional Fields",
      hide: "Hide Optional Fields",
    },
    assign: {
      titleAssign: "Mark as Assigned",
      titleCallAway: "Call Away",
      subtitlePut: "Record that this short put was assigned into shares.",
      subtitleCall: "Record that this covered call was assigned (shares called away).",
      position: "Position",
      shares: "Shares",
      actionDate: "Action Date",
      callAwayPrice: "Call Away Price",
      assignmentPrice: "Assignment Price",
      totalValue: "Total value:",
      estCostLabel: "Est. stock cost per share (CSP)",
      estCostFormula:
        "Strike − premium/share{{rollPart}} + (opening commission + assignment fees) ÷ shares.",
      assignmentFees: "Assignment fees",
      assignmentFeesHint: "Total USD for this assignment (not spread per share).",
      rollDetected: "Roll chain detected.",
      rollDetectedBody:
        "Prior roll premiums will be automatically added to cost basis from the linked chain. Use the override below only if you need to adjust.",
      priorRollOverride: "Prior roll premium / share override",
      priorRollHint:
        "Leave blank to auto-sum from the roll chain. Fill in only to override (e.g. for manually linked trades).",
      priorRollPlaceholder: "auto from chain",
      notesPlaceholder: "Add optional notes about this lifecycle event...",
      submitAssign: "Mark Assigned",
      submitCallAway: "Mark Called Away",
    },
    roll: {
      title: "Roll Position",
      subtitle: "Roll your {{ticker}} {{strategy}} to a new strike or expiration.",
      currentPosition: "Current Position",
      expires: "Expires",
      rollDate: "Roll Date",
      newExpiration: "New Expiration",
      newStrike: "New Strike Price",
      newPremium: "New Premium / Share",
      newPremiumHint: "Per share - auto-multiplied by contracts × 100",
      buybackCost: "Buyback Cost / Share",
      buybackHint: "Per share - cost to close original",
      rollType: "Roll Type",
      rollTypeDetect: "Fill in the strike & expiration above to auto-detect",
      rollTypeNoChange: "No change detected",
      rollTypeNewExpiry: "to new expiry",
      rollTypeNewStrike: "to new strike",
      rollTypeTemplate: "Roll {{parts}}",
      netPremiumPerShare: "Net premium / share:",
      netPremiumTotal: "Net premium total:",
      fees: "Fees",
      notesPlaceholder: "Reason for rolling...",
      submit: "Roll Position",
    },
    expire: {
      title: "Mark as Expired",
      intro: "Record that this option expired worthless and premium was kept.",
      submit: "Mark Expired",
    },
  },

  cycles: {
    title: "Cycles",
    description: "Track wheel cycles and covered call cost basis",
    tab: {
      wheels: "Wheels",
      ccCostBasis: "CC Cost Basis",
      all: "All ({{count}})",
      active: "Active ({{count}})",
      completed: "Completed ({{count}})",
    },
    empty: {
      title: "No cycles yet",
      body: "Add trades to automatically link wheel cycles.",
      cta: "Go to Trades",
    },
    emptyTab: {
      title: "No cycles in this tab",
      body: "Try another tab or search term.",
    },
    searchPlaceholder: "Search ticker…",
    legs: "{{count}} legs",
    legsOpen: "{{count}} legs · {{open}} open",
    legsCsp: "{{count}} legs · {{cspCount}} CSP",
    viewWheel: "View Wheel",
    wheelTitle: "{{ticker}} Wheel",
    purchase: "Purchase",
    reduced: "{{pct}}% reduced",
    perShare: "per share",
    total: "total",
    shares: "{{count}} shares",
    cc: {
      openPositions: "Open Positions",
      totalPremium: "Total CC Premium",
      avgReduction: "Avg Reduction",
      empty: {
        title: "No open stock positions",
        body: "Assigned CSP holdings appear here. Wheels that exited (called away or closed) are not shown.",
      },
      initialCost: "Initial Cost",
      currentCost: "Current Cost",
      premiumRealized: "CC Premium (Collected)",
      premiumRealizedHint: "{{realized}} realized · includes open legs",
      positions: "CC Positions",
      costOverTime: "Cost Basis Over Time",
      filteredToWheel: "Showing CC cost basis for this wheel only",
      subtitle: "{{strike}} CSP · {{date}}",
    },
    leg: {
      csp: "Cash Secured Put",
      cc: "Covered Call",
    },
  },

  settings: {
    billing: {
      title: "Billing",
      description: "Manage your CycleIQ plan. Premium is $1/month via Stripe.",
      currentPlan: "Current plan",
      planBasic: "Basic",
      subscription: "Subscription",
      subscriptionHint: "Synced from Stripe webhooks.",
      renews: "· renews {{date}}",
      tradeUsage: "Trade usage",
      tradeUsageHint: "{{used}} of {{limit}} new trades this month (UTC).",
      remaining: "{{count}} remaining",
      manage: "Manage subscription",
      upgrade: "Upgrade to Premium — $1/mo",
      error: {
        load: "Failed to load billing.",
        signIn: "You need to be signed in to view billing.",
        checkout: "Checkout failed.",
        portal: "Could not open billing portal.",
      },
    },
    account: {
      title: "Account",
      description: "Your account information and authentication settings.",
      displayName: "Display name",
      displayNameHint: "Name from your sign-in provider.",
      email: "Email address",
      emailHint: "Your Supabase Auth email.",
      password: "Password",
      passwordHint: "Send a reset link to your email to change your password.",
      sendReset: "Send reset email",
      sending: "Sending…",
    },
    defaults: {
      title: "Trading Defaults",
      description: "Pre-fill values when adding new trades. Saved to your account.",
      commission: "Commission per contract",
      commissionHint:
        "Auto-fills total opening commission when adding a trade (per-contract rate × contracts). Leave blank to skip.",
      perContract: "/ contract",
      contracts: "Default contracts",
      contractsHint: "Number of contracts pre-filled when opening a new trade.",
      budget: "Total capital budget",
      budgetHint: "Starting capital budget. Dashboard total capital = this budget + net P&L (realized + open-share MTM).",
      dte: "Default DTE (days to expiry)",
      dteHint: "The expiry date pre-filled when opening a new trade.",
      days: "days",
      save: "Save defaults",
      saved: "Saved.",
      error: "Failed to save. Please try again.",
    },
    danger: {
      title: "Danger zone",
      description: "Irreversible actions for your trading data.",
      reset: {
        label: "Reset all trading data",
        hint: "Permanently delete every trade and wheel cycle. Capital budget and trading defaults are kept.",
        button: "Reset data",
      },
      confirm: {
        title: "Reset all trading data?",
        body: "This will permanently delete all your trades and wheel cycles. Your account, login, and trading defaults will not be affected.",
        delete: "Delete all data",
      },
      error: "Reset failed. Please try again.",
    },
  },

  reports: {
    title: "Reports",
    description: "Analytics and exports for your wheel strategy",
    placeholder: "Analytics and exports will be available in a future iteration.",
  },

  contact: {
    metaTitle: "Contact Us",
    metaDescription:
      "Get in touch with the CycleIQ team. Questions about wheel strategy tracking, billing, or your account — we're here to help.",
    badge: "Get in touch",
    title: "We'd love to hear from you.",
    titleAccent: "Send us a message.",
    subtitle:
      "Questions about CycleIQ, your account, or the wheel strategy tracker? Fill out the form below and we'll reply to your email as soon as we can.",
    faqHint: "Looking for quick answers?",
    faqLink: "Browse the FAQ",
    aboutLink: "About CycleIQ",
    form: {
      name: "Name",
      email: "Email",
      subject: "Subject",
      message: "Message",
      optional: "optional",
      submit: "Send message",
      submitting: "Sending…",
      success: {
        title: "Message sent",
        body: "Thanks for reaching out. We'll get back to you as soon as we can.",
        again: "Send another message",
      },
      error: {
        generic: "Unable to send your message. Please try again later.",
      },
    },
    validation: {
      nameRequired: "Please enter your name.",
      nameTooLong: "Name is too long.",
      emailInvalid: "Please enter a valid email address.",
      subjectTooLong: "Subject is too long.",
      messageMin: "Message must be at least 10 characters.",
      messageTooLong: "Message is too long.",
      invalid: "Invalid form data.",
      spam: "Invalid submission.",
    },
    api: {
      invalidBody: "Invalid request body.",
      unavailable: "Contact form is temporarily unavailable. Please try again later.",
    },
    gotcha: "Leave blank",
  },

  legal: {
    shell: {
      label: "Legal",
      lastUpdated: "Last updated: {{date}}",
      seeAlso: "See also",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
    },
    privacy: {
      metaTitle: "Privacy Policy",
      metaDescription: "How CycleIQ collects, uses, and protects your information.",
      title: "Privacy Policy",
      lastUpdated: "June 3, 2026",
      sections: {
        introduction: {
          title: "Introduction",
          p1: 'CycleIQ ("we," "us," or "our") provides a web application for tracking options wheel strategies (cash-secured puts, covered calls, assignments, and related lifecycle events). This Privacy Policy explains what information we collect, how we use it, and the choices you have.',
          p2: "By creating an account or using CycleIQ, you agree to this Privacy Policy. If you do not agree, please do not use the service.",
        },
        informationWeCollect: {
          title: "Information we collect",
          p1: "Account information. When you register, we collect your email address and authentication credentials (or OAuth profile data if you sign in with Google). Authentication is handled by Supabase Auth.",
          p2: "Trading and portfolio data. Information you enter into the app, including tickers, strikes, premiums, trade dates, statuses, wheel cycles, capital budget, deposits/withdrawals, and related settings. This data is stored to provide dashboards, reports, and analytics you request.",
          p3: "Usage and technical data. We may collect standard log data (such as IP address, browser type, pages visited, and timestamps) through our hosting and infrastructure providers to operate, secure, and improve the service.",
        },
        howWeUse: {
          title: "How we use your information",
          p1: "We use your information to:",
          items: [
            "Provide, maintain, and personalize the CycleIQ service",
            "Authenticate you and keep your account secure",
            "Sync your preferences and trading data across devices",
            "Enforce plan limits (for example, monthly trade caps on the Basic plan)",
            "Respond to support requests and communicate about the service",
            "Detect abuse, fraud, and technical issues",
          ],
          p2: "We do not sell your personal information.",
        },
        howWeShare: {
          title: "How we share information",
          p1: "We may share information only in these circumstances:",
          items: [
            "Service providers that help us run the product (for example, Supabase for authentication and database hosting, and cloud hosting providers). They process data on our behalf under contractual obligations.",
            "Legal requirements when we believe disclosure is required by law, regulation, legal process, or to protect rights, safety, and security.",
            "Business transfers in connection with a merger, acquisition, or sale of assets, subject to this policy.",
          ],
        },
        dataRetention: {
          title: "Data retention",
          p1: "We retain your account and trading data while your account is active. You may delete trading data using in-app reset tools. If you wish to delete your account entirely, contact us at {{email}}.",
          p2: "We may retain limited information as required for legal, security, or backup purposes after deletion.",
        },
        security: {
          title: "Security",
          p1: "We use industry-standard measures such as encrypted connections (HTTPS), authenticated API access, and access controls. No method of transmission or storage is 100% secure; we cannot guarantee absolute security.",
        },
        yourRights: {
          title: "Your rights and choices",
          p1: "Depending on where you live, you may have rights to access, correct, delete, or export your personal data, or to object to certain processing. To exercise these rights, email {{email}}.",
          p2: "You can update trading defaults and capital settings in the app. You can sign out at any time from Settings.",
        },
        children: {
          title: "Children",
          p1: "CycleIQ is not intended for users under 18. We do not knowingly collect personal information from children. If you believe a child has provided us data, contact us and we will delete it.",
        },
        international: {
          title: "International users",
          p1: "Your information may be processed in countries other than your own, including where our service providers operate. By using CycleIQ, you consent to this transfer subject to applicable safeguards.",
        },
        changes: {
          title: "Changes to this policy",
          p1: 'We may update this Privacy Policy from time to time. We will post the revised version on this page and update the "Last updated" date. Material changes may be communicated by email or in-app notice where appropriate.',
        },
        contact: {
          title: "Contact",
          p1: "Questions about this Privacy Policy? Email {{email}}.",
        },
      },
    },
    terms: {
      metaTitle: "Terms of Service",
      metaDescription: "Terms and conditions for using the CycleIQ wheel strategy tracker.",
      title: "Terms of Service",
      lastUpdated: "June 3, 2026",
      sections: {
        agreement: {
          title: "Agreement",
          p1: 'These Terms of Service ("Terms") govern your access to and use of CycleIQ, a wheel strategy tracking application (the "Service"). By creating an account or using the Service, you agree to these Terms and our Privacy Policy.',
          p2: "If you do not agree, do not use the Service.",
        },
        notFinancialAdvice: {
          title: "Not financial advice",
          p1: "CycleIQ is a record-keeping and analytics tool only. We are not a broker-dealer, investment adviser, or tax professional. The Service does not execute trades, hold funds, or provide personalized investment, legal, or tax advice.",
          p2: "You are solely responsible for your trading decisions and for verifying that any data you enter is accurate. Past performance shown in the app does not guarantee future results.",
        },
        eligibility: {
          title: "Eligibility and account",
          p1: "You must be at least 18 years old and able to form a binding contract to use the Service. You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account.",
          p2: "Notify us promptly at {{email}} if you suspect unauthorized access.",
        },
        plansAndBilling: {
          title: "Plans and billing",
          p1: "CycleIQ may offer free and paid plans (for example, Basic with usage limits and Premium with expanded limits). Plan features, limits, and pricing are described on our pricing page and may change with notice.",
          p2: "Paid subscriptions, when available, will be subject to additional payment terms presented at checkout. Fees are non-refundable except where required by law or explicitly stated.",
        },
        acceptableUse: {
          title: "Acceptable use",
          p1: "You agree not to:",
          items: [
            "Use the Service for any unlawful purpose",
            "Attempt to gain unauthorized access to systems, accounts, or data",
            "Interfere with or disrupt the Service or its infrastructure",
            "Scrape, reverse engineer, or resell the Service except as permitted by law",
            "Upload malicious code or content that infringes others' rights",
          ],
        },
        yourContent: {
          title: "Your content",
          p1: "You retain ownership of trade and portfolio data you submit. You grant us a limited license to host, process, and display that data solely to operate and improve the Service for you.",
          p2: "You represent that you have the right to provide the data you enter and that it does not violate applicable law or third-party rights.",
        },
        serviceAvailability: {
          title: "Service availability",
          p1: "We strive to keep the Service available but do not guarantee uninterrupted or error-free operation. We may modify, suspend, or discontinue features with reasonable notice when practicable.",
          p2: 'The Service is provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied, including merchantability, fitness for a particular purpose, and non-infringement.',
        },
        limitationOfLiability: {
          title: "Limitation of liability",
          p1: "To the maximum extent permitted by law, CycleIQ and its operators will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for lost profits, data, or trading losses, arising from your use of the Service.",
          p2: "Our total liability for any claim relating to the Service is limited to the greater of (a) amounts you paid us in the twelve months before the claim or (b) one hundred U.S. dollars (USD $100).",
        },
        indemnification: {
          title: "Indemnification",
          p1: "You agree to indemnify and hold harmless CycleIQ and its operators from claims, damages, and expenses (including reasonable legal fees) arising from your use of the Service, your content, or your violation of these Terms.",
        },
        termination: {
          title: "Termination",
          p1: "You may stop using the Service at any time. We may suspend or terminate your access if you violate these Terms, pose a security risk, or if required by law. Upon termination, your right to use the Service ends; provisions that by nature should survive will remain in effect.",
        },
        changes: {
          title: "Changes to these Terms",
          p1: "We may update these Terms from time to time. Continued use after the effective date of revised Terms constitutes acceptance. If you do not agree to the new Terms, you must stop using the Service.",
        },
        governingLaw: {
          title: "Governing law",
          p1: "These Terms are governed by applicable law in the jurisdiction where CycleIQ is operated, without regard to conflict-of-law principles. Disputes will be resolved in the courts of that jurisdiction, unless otherwise required by mandatory consumer protection laws in your country of residence.",
        },
        contact: {
          title: "Contact",
          p1: "Questions about these Terms? Email {{email}}.",
        },
      },
    },
  },

  toast: {
    trade: {
      saved: "Trade saved successfully.",
      saveFailed: "Failed to save trade.",
      updated: "Trade updated successfully.",
      updateFailed: "Failed to update trade.",
      deleteFailed: "Failed to delete trade.",
      closed: "Trade closed successfully.",
      actionFailed: "Failed to apply trade action.",
      assigned: "Trade assigned successfully.",
      calledAway: "Position marked called away successfully.",
      assignFailed: "Failed to assign trade.",
      rolled: "Trade rolled successfully. New leg added as OPEN position.",
      rollFailed: "Failed to roll trade.",
      expired: "Trade expired successfully.",
      expireFailed: "Failed to expire trade.",
    },
    billing: {
      premiumActivated: "Premium activated — thank you!",
      syncing: "Payment received — syncing plan…",
    },
    account: {
      resetSent: "Password reset email sent. Check your inbox.",
      resetFailed: "Failed to send reset email. Please try again.",
    },
    danger: {
      resetSuccess: "Deleted {{trades}} trade(s) and {{cycles}} cycle(s).",
    },
  },
} as const;

type DeepString<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly DeepString<U>[]
    : { readonly [K in keyof T]: DeepString<T[K]> };

export type Messages = DeepString<typeof en>;

export default en;
