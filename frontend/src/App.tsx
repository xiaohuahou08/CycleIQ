import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
import {
  createTrade,
  deleteTrade,
  listTrades,
  type TradeRecord,
  type TradeStatus,
  updateTrade,
} from './services/tradeApi'

type StrategyFilter = 'BOTH' | 'CSP' | 'CC'
type TimeRange = 'ALL' | 'WEEK' | 'MONTH'
type SortDirection = 'asc' | 'desc'
type SortKey =
  | 'ticker'
  | 'strategy'
  | 'contracts'
  | 'strike'
  | 'current_price'
  | 'expiry'
  | 'dte'
  | 'premium'
  | 'annualized_return'
  | 'status'

const statusStyles: Record<TradeStatus, string> = {
  OPEN: 'status-amber',
  CLOSED: 'status-green',
  EXPIRED: 'status-gray',
  ASSIGNED: 'status-orange',
  CALLED_AWAY: 'status-red',
  ROLLED: 'status-blue',
}

const sidebarSections = [
  {
    title: 'Main Navigation',
    items: [
      { label: 'Dashboard', icon: '🏠', to: '/' },
      { label: 'Trades', icon: '💹', to: '/trades' },
      { label: 'Calendars', icon: '📅', disabled: true },
      { label: 'Performance', icon: '📊', disabled: true },
      { label: 'Benchmark', icon: '📈', disabled: true },
      { label: 'Visualization', icon: '🎨', disabled: true },
      { label: 'AI Analytics', icon: '🤖', disabled: true },
    ],
  },
  {
    title: 'Data Management',
    items: [
      { label: 'Tickers', icon: '📌', disabled: true },
      { label: 'Alerts', icon: '🔔', disabled: true },
      { label: 'Watchlists', icon: '👀', disabled: true },
    ],
  },
  {
    title: 'Admin',
    items: [
      { label: 'Taxes', icon: '🧾', disabled: true },
      { label: 'Tools', icon: '🔧', disabled: true },
      { label: 'Billing', icon: '💰', disabled: true },
      { label: 'Exports', icon: '📤', disabled: true },
      { label: 'Support', icon: '❓', disabled: true },
      { label: 'Settings', icon: '⚙️', disabled: true },
    ],
  },
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

function formatDateLabel(input: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(new Date(input))
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getStrategy(trade: TradeRecord): 'CSP' | 'CC' {
  if (trade.strategy) {
    return trade.strategy
  }
  return trade.option_type === 'PUT' ? 'CSP' : 'CC'
}

function getDte(expiry: string) {
  const diffMs = new Date(expiry).getTime() - Date.now()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

function getTotalPremium(trade: TradeRecord) {
  return trade.premium * trade.contracts * 100
}

function getAnnualizedReturn(trade: TradeRecord) {
  const dte = Math.max(1, getDte(trade.expiry))
  const notional = trade.strike * trade.contracts * 100
  return notional > 0 ? (getTotalPremium(trade) / notional) * (365 / dte) * 100 : 0
}

function getMoneyness(trade: TradeRecord) {
  const current = trade.current_price ?? trade.strike
  const diff = current - trade.strike
  if (getStrategy(trade) === 'CSP') {
    return `${diff >= 0 ? 'OTM' : 'ITM'} ${formatCurrency(Math.abs(diff))}`
  }
  return `${diff <= 0 ? 'OTM' : 'ITM'} ${formatCurrency(Math.abs(diff))}`
}

function startOfWeekMonday(date: Date) {
  const current = new Date(date)
  const day = current.getDay()
  const offset = day === 0 ? -6 : 1 - day
  current.setDate(current.getDate() + offset)
  current.setHours(0, 0, 0, 0)
  return current
}

function weekRangeLabel(expiry: string) {
  const monday = startOfWeekMonday(new Date(expiry))
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  const start = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(monday)
  const end = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(friday)
  return `WEEK OF ${start.toUpperCase()} - ${end.toUpperCase()}`
}

function defaultTradeValues() {
  const today = new Date()
  const expiry = new Date()
  expiry.setDate(today.getDate() + 45)
  return {
    ticker: '',
    option_type: 'PUT' as const,
    strike: '',
    expiry: toDateInputValue(expiry),
    trade_date: toDateInputValue(today),
    premium: '',
    contracts: '1',
    delta: '',
    status: 'OPEN' as TradeStatus,
    notes: '',
    current_price: '',
  }
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation()
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-header">
        <strong>CycleIQ</strong>
        <button className="close-mobile" onClick={onClose} type="button">
          ✕
        </button>
      </div>
      {sidebarSections.map((section) => (
        <div key={section.title} className="sidebar-section">
          <p className="sidebar-section-title">{section.title}</p>
          <ul>
            {section.items.map((item) => {
              const active = item.to && location.pathname === item.to
              if (item.to && !item.disabled) {
                return (
                  <li key={item.label}>
                    <Link to={item.to} className={`nav-link ${active ? 'active' : ''}`}>
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              }
              return (
                <li key={item.label}>
                  <button className="nav-link disabled" disabled type="button">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                    <span className="soon">Coming Soon</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      <div className="user-card">
        <div className="avatar">x H</div>
        <div>
          <strong>x H</strong>
          <p>xiaohua.hou@gmail.com</p>
        </div>
      </div>
    </aside>
  )
}

function DashboardPage() {
  return (
    <div className="page-shell">
      <h1>Dashboard</h1>
      <p className="subtitle">Coming Soon</p>
    </div>
  )
}

function FragmentGroup({ children }: { children: ReactNode }) {
  return <>{children}</>
}

function TradeFormModal({
  initialTrade,
  onCancel,
  onSave,
}: {
  initialTrade: TradeRecord | null
  onCancel: () => void
  onSave: (payload: Omit<TradeRecord, 'id'>, id?: string) => Promise<void>
}) {
  const [form, setForm] = useState(() => {
    if (!initialTrade) {
      return defaultTradeValues()
    }
    return {
      ticker: initialTrade.ticker,
      option_type: initialTrade.option_type,
      strike: String(initialTrade.strike),
      expiry: initialTrade.expiry,
      trade_date: initialTrade.trade_date,
      premium: String(initialTrade.premium),
      contracts: String(initialTrade.contracts),
      delta: String(initialTrade.delta),
      status: initialTrade.status,
      notes: initialTrade.notes ?? '',
      current_price: String(initialTrade.current_price ?? initialTrade.strike),
    }
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submit = async () => {
    if (!form.ticker || !form.strike || !form.premium || !form.contracts || !form.delta) {
      setError('Please fill all required fields.')
      return
    }
    const contracts = Number(form.contracts)
    if (contracts < 1) {
      setError('Contracts must be at least 1.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await onSave(
        {
          ticker: form.ticker.trim().toUpperCase(),
          option_type: form.option_type,
          strike: Number(form.strike),
          expiry: form.expiry,
          trade_date: form.trade_date,
          premium: Number(form.premium),
          contracts,
          delta: Number(form.delta),
          status: form.status,
          notes: form.notes.slice(0, 500),
          current_price: Number(form.current_price || form.strike),
          strategy: form.option_type === 'PUT' ? 'CSP' : 'CC',
        },
        initialTrade?.id,
      )
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save trade')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>{initialTrade ? 'Edit Trade' : 'Add Trade'}</h2>
        {error ? <p className="error">{error}</p> : null}
        <div className="modal-grid">
          <label>
            Ticker *
            <input value={form.ticker} onChange={(event) => handleChange('ticker', event.target.value.toUpperCase())} />
          </label>
          <label>
            Option Type *
            <select value={form.option_type} onChange={(event) => handleChange('option_type', event.target.value)}>
              <option value="PUT">PUT</option>
              <option value="CALL">CALL</option>
            </select>
          </label>
          <label>
            Strike *
            <input type="number" step="0.01" value={form.strike} onChange={(event) => handleChange('strike', event.target.value)} />
          </label>
          <label>
            Expiry *
            <input type="date" value={form.expiry} onChange={(event) => handleChange('expiry', event.target.value)} />
          </label>
          <label>
            Trade Date *
            <input type="date" value={form.trade_date} onChange={(event) => handleChange('trade_date', event.target.value)} />
          </label>
          <label>
            Premium *
            <input type="number" step="0.01" value={form.premium} onChange={(event) => handleChange('premium', event.target.value)} />
          </label>
          <label>
            Contracts *
            <input type="number" min="1" value={form.contracts} onChange={(event) => handleChange('contracts', event.target.value)} />
          </label>
          <label>
            Delta *
            <input type="number" step="0.01" value={form.delta} onChange={(event) => handleChange('delta', event.target.value)} />
          </label>
          <label>
            Current Price
            <input type="number" step="0.01" value={form.current_price} onChange={(event) => handleChange('current_price', event.target.value)} />
          </label>
          <label>
            Status *
            <select value={form.status} onChange={(event) => handleChange('status', event.target.value)}>
              {(['OPEN', 'CLOSED', 'EXPIRED', 'ASSIGNED', 'CALLED_AWAY', 'ROLLED'] as const).map((value) => (
                <option value={value} key={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Notes
          <textarea maxLength={500} value={form.notes} onChange={(event) => handleChange('notes', event.target.value)} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void submit()} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Trade'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmDialog({
  title,
  onCancel,
  onConfirm,
}: {
  title: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal small">
        <h2>Delete Trade</h2>
        <p>{title}</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function TradesPage() {
  const [trades, setTrades] = useState<TradeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tickerSearch, setTickerSearch] = useState('')
  const [strategy, setStrategy] = useState<StrategyFilter>('BOTH')
  const [status, setStatus] = useState<'ALL' | TradeStatus>('ALL')
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('expiry')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [showForm, setShowForm] = useState(false)
  const [editingTrade, setEditingTrade] = useState<TradeRecord | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<TradeRecord | null>(null)

  const fetchTrades = async () => {
    setLoading(true)
    setError(null)
    try {
      setTrades(
        await listTrades({
          ticker: tickerSearch || undefined,
          strategy: strategy === 'BOTH' ? undefined : strategy,
          status: status === 'ALL' ? undefined : status,
        }),
      )
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load trades')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isCancelled = false

    const loadInitialTrades = async () => {
      try {
        const data = await listTrades({
          strategy: strategy === 'BOTH' ? undefined : strategy,
          status: status === 'ALL' ? undefined : status,
        })
        if (!isCancelled) {
          setTrades(data)
          setError(null)
        }
      } catch (fetchError) {
        if (!isCancelled) {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to load trades')
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    void loadInitialTrades()

    return () => {
      isCancelled = true
    }
  }, [strategy, status])

  const filteredTrades = useMemo(() => {
    const searchLower = tickerSearch.trim().toLowerCase()
    return trades.filter((trade) => {
      if (searchLower && !trade.ticker.toLowerCase().includes(searchLower)) {
        return false
      }
      if (strategy !== 'BOTH' && getStrategy(trade) !== strategy) {
        return false
      }
      if (status !== 'ALL' && trade.status !== status) {
        return false
      }
      if (timeRange !== 'ALL') {
        const dte = getDte(trade.expiry)
        if (timeRange === 'WEEK' && dte > 7) {
          return false
        }
        if (timeRange === 'MONTH' && dte > 30) {
          return false
        }
      }
      return true
    })
  }, [status, strategy, tickerSearch, timeRange, trades])

  const sortedTrades = useMemo(() => {
    const sortValue = (trade: TradeRecord) => {
      switch (sortKey) {
        case 'strategy':
          return getStrategy(trade)
        case 'dte':
          return getDte(trade.expiry)
        case 'premium':
          return getTotalPremium(trade)
        case 'annualized_return':
          return getAnnualizedReturn(trade)
        case 'current_price':
          return trade.current_price ?? trade.strike
        default:
          return trade[sortKey]
      }
    }
    return [...filteredTrades].sort((a, b) => {
      const left = sortValue(a)
      const right = sortValue(b)
      const compare =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left ?? '').localeCompare(String(right ?? ''))
      return sortDirection === 'asc' ? compare : compare * -1
    })
  }, [filteredTrades, sortDirection, sortKey])

  const groupedTrades = useMemo(() => {
    const groups = new Map<string, TradeRecord[]>()
    sortedTrades.forEach((trade) => {
      const key = weekRangeLabel(trade.expiry)
      const existing = groups.get(key)
      if (existing) {
        existing.push(trade)
      } else {
        groups.set(key, [trade])
      }
    })
    return Array.from(groups.entries())
  }, [sortedTrades])

  const availableTickers = useMemo(() => {
    const unique = new Set(trades.map((trade) => trade.ticker))
    return Array.from(unique).sort((a, b) => a.localeCompare(b))
  }, [trades])

  const requestSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDirection('asc')
  }

  const toggleGroup = (key: string) => {
    setCollapsedGroups((current) => ({ ...current, [key]: !current[key] }))
  }

  const handleSave = async (payload: Omit<TradeRecord, 'id'>, id?: string) => {
    if (id) {
      await updateTrade(id, payload)
    } else {
      await createTrade(payload)
    }
    setShowForm(false)
    setEditingTrade(null)
    await fetchTrades()
  }

  const handleDelete = async (id: string) => {
    await deleteTrade(id)
    setDeleteCandidate(null)
    await fetchTrades()
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <h1>📊 Trades</h1>
          <p className="subtitle">Manage your options positions</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-secondary">
            ⚙️ Display Settings
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Add Trade
          </button>
        </div>
      </header>

      <section className="filter-bar">
        <div className="positions-badge">📌 {filteredTrades.length}</div>
        <label>
          <span className="label">Ticker</span>
          <input
            list="ticker-options"
            placeholder="Search ticker"
            value={tickerSearch}
            onChange={(event) => setTickerSearch(event.target.value.toUpperCase())}
          />
          <datalist id="ticker-options">
            {availableTickers.map((ticker) => (
              <option key={ticker} value={ticker} />
            ))}
          </datalist>
        </label>
        <div>
          <span className="label">Strategy</span>
          <div className="chip-group">
            {(['BOTH', 'CSP', 'CC'] as const).map((value) => (
              <button key={value} className={`chip ${strategy === value ? 'active' : ''}`} onClick={() => setStrategy(value)} type="button">
                {value}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Status</span>
          <div className="chip-group wrap">
            {(['OPEN', 'CLOSED', 'EXPIRED', 'ASSIGNED', 'ROLLED', 'ALL'] as const).map((value) => (
              <button key={value} className={`chip ${status === value ? 'active' : ''}`} onClick={() => setStatus(value)} type="button">
                {value}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Time</span>
          <div className="chip-group">
            {(['ALL', 'WEEK', 'MONTH'] as const).map((value) => (
              <button key={value} className={`chip ${timeRange === value ? 'active' : ''}`} onClick={() => setTimeRange(value)} type="button">
                {value}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="btn btn-icon" onClick={() => void fetchTrades()}>
          ↻
        </button>
      </section>

      {error ? <p className="error">{error}</p> : null}
      {loading ? <p>Loading trades...</p> : null}

      {!loading && groupedTrades.length === 0 ? (
        <div className="empty-state">
          <div className="empty-illustration">📉</div>
          <h2>No trades yet</h2>
          <p>Add your first trade to start managing your options positions.</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)} type="button">
            + Add Trade
          </button>
        </div>
      ) : null}

      {groupedTrades.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  ['ticker', 'Ticker'],
                  ['strategy', 'Strategy'],
                  ['contracts', 'QTY'],
                  ['strike', 'Strike'],
                  ['current_price', 'Price'],
                  ['moneyness', 'Moneyness'],
                  ['expiry', 'Expiration'],
                  ['dte', 'DTE'],
                  ['premium', 'Premium'],
                  ['annualized_return', 'ROI(Ann.)'],
                  ['status', 'Status'],
                  ['actions', ''],
                ].map(([key, label]) => (
                  <th key={key}>
                    {key === 'moneyness' || key === 'actions' ? (
                      label
                    ) : (
                      <button className="sort-button" onClick={() => requestSort(key as SortKey)} type="button">
                        {label}
                        {sortKey === key ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : null}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupedTrades.map(([groupLabel, groupRows]) => {
                const collapsed = collapsedGroups[groupLabel]
                return (
                  <FragmentGroup key={groupLabel}>
                    <tr className="week-row">
                      <td colSpan={12}>
                        <button className="week-toggle" onClick={() => toggleGroup(groupLabel)} type="button">
                          {collapsed ? '▸' : '▾'} {groupLabel} • {groupRows.length} positions
                        </button>
                      </td>
                    </tr>
                    {!collapsed
                      ? groupRows.map((trade) => {
                          const currentPrice = trade.current_price ?? trade.strike
                          return (
                            <tr key={trade.id}>
                              <td>{trade.ticker}</td>
                              <td>{getStrategy(trade)}</td>
                              <td>{trade.contracts}</td>
                              <td>{formatCurrency(trade.strike)}</td>
                              <td>{formatCurrency(currentPrice)}</td>
                              <td>{getMoneyness(trade)}</td>
                              <td>{formatDateLabel(trade.expiry)}</td>
                              <td>{getDte(trade.expiry)}</td>
                              <td className="premium">+{formatCurrency(getTotalPremium(trade))}</td>
                              <td>{getAnnualizedReturn(trade).toFixed(1)}%</td>
                              <td>
                                <span className={`status-badge ${statusStyles[trade.status]}`}>{trade.status}</span>
                              </td>
                              <td>
                                <details className="row-menu">
                                  <summary>⋯</summary>
                                  <div>
                                    <button type="button" onClick={() => { setEditingTrade(trade); setShowForm(true) }}>
                                      Edit
                                    </button>
                                    <button type="button" onClick={() => setDeleteCandidate(trade)}>
                                      Delete
                                    </button>
                                    <button type="button" onClick={() => window.alert(`${trade.ticker} ${getStrategy(trade)} details coming soon.`)}>
                                      View details
                                    </button>
                                  </div>
                                </details>
                              </td>
                            </tr>
                          )
                        })
                      : null}
                  </FragmentGroup>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {showForm ? (
        <TradeFormModal
          initialTrade={editingTrade}
          onCancel={() => {
            setShowForm(false)
            setEditingTrade(null)
          }}
          onSave={handleSave}
        />
      ) : null}
      {deleteCandidate ? (
        <ConfirmDialog
          title="Are you sure you want to delete this trade?"
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={() => void handleDelete(deleteCandidate.id)}
        />
      ) : null}
    </div>
  )
}

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  return (
    <div className="app-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main>
        <button className="hamburger" type="button" onClick={() => setSidebarOpen((open) => !open)}>
          ☰
        </button>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/trades" element={<TradesPage />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

export default App
