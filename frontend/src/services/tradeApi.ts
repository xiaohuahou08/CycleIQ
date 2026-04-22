export type TradeStatus =
  | 'OPEN'
  | 'CLOSED'
  | 'EXPIRED'
  | 'ASSIGNED'
  | 'CALLED_AWAY'
  | 'ROLLED'

export interface TradeRecord {
  id: string
  ticker: string
  option_type: 'PUT' | 'CALL'
  strike: number
  expiry: string
  trade_date: string
  premium: number
  contracts: number
  delta: number
  status: TradeStatus
  notes?: string
  current_price?: number
  strategy?: 'CSP' | 'CC'
}

const API_BASE = '/api/trades'

function getAuthHeaders() {
  const token = localStorage.getItem('token')

  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export interface ListTradesParams {
  ticker?: string
  status?: string
  strategy?: string
}

export async function listTrades(params: ListTradesParams): Promise<TradeRecord[]> {
  const searchParams = new URLSearchParams()

  if (params.ticker) {
    searchParams.set('ticker', params.ticker)
  }

  if (params.status) {
    searchParams.set('status', params.status)
  }

  if (params.strategy) {
    searchParams.set('strategy', params.strategy)
  }

  const query = searchParams.toString()
  const response = await fetch(query ? `${API_BASE}?${query}` : API_BASE, {
    headers: getAuthHeaders(),
  })

  const contentType = response.headers.get('content-type') ?? ''
  if (response.ok && !contentType.includes('application/json')) {
    return []
  }

  return handleResponse<TradeRecord[]>(response)
}

export async function createTrade(trade: Omit<TradeRecord, 'id'>): Promise<TradeRecord> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(trade),
  })

  return handleResponse<TradeRecord>(response)
}

export async function updateTrade(id: string, trade: Omit<TradeRecord, 'id'>): Promise<TradeRecord> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(trade),
  })

  return handleResponse<TradeRecord>(response)
}

export async function deleteTrade(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  return handleResponse<void>(response)
}
