-- ============================================================
-- CycleIQ Database Schema v1
-- Wheel Strategy Options Trading Tracker
-- Created: 2026-04-27
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. STRATEGIES (CSP / CC definitions)
-- ============================================================
CREATE TABLE strategies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,  -- 'CSP' | 'CC' | etc.
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO strategies (name, description) VALUES
  ('CSP', 'Cash Secured Put — generate income by selling put options on stocks you would buy at discount'),
  ('CC', 'Covered Call — generate income by selling call options on stock you already own');

-- ============================================================
-- 2. SIGNALS (entry events / opportunities)
-- ============================================================
CREATE TABLE signals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  strategy_id UUID REFERENCES strategies NOT NULL,
  
  -- Position details
  symbol TEXT NOT NULL,                         -- e.g. 'SPX', 'AAPL'
  strike_price NUMERIC NOT NULL,
  expiry_date DATE NOT NULL,
  premium_received NUMERIC,                     -- credit received
  contract_count INTEGER DEFAULT 100,
  
  -- Metrics at signal creation
  delta_value NUMERIC,
  theta_value NUMERIC,
  iv_rank NUMERIC,
  
  -- Notes
  notes TEXT,
  source TEXT,                                 -- 'manual', 'screen', etc.
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'assigned', 'expired', 'cancelled')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. POSITIONS (tracked positions with live metrics)
-- ============================================================
CREATE TABLE positions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  signal_id UUID REFERENCES signals,            -- link back to original signal
  
  -- Core data
  symbol TEXT NOT NULL,
  strategy_id UUID REFERENCES strategies NOT NULL,
  position_type TEXT NOT NULL CHECK (position_type IN ('long', 'short', 'stock')),
  
  -- Entry
  entry_price NUMERIC NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Current (updated via cron or manual)
  current_price NUMERIC,
  current_delta NUMERIC,
  current_theta NUMERIC,
  
  -- Exit
  exit_price NUMERIC,
  exit_date DATE,
  
  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'closed', 'expired')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. TRADES (transaction log)
-- ============================================================
CREATE TABLE trades (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  position_id UUID REFERENCES positions,
  
  -- Trade details
  action TEXT NOT NULL CHECK (action IN ('open', 'close', 'assign', 'expire', 'roll', 'adjust')),
  symbol TEXT NOT NULL,
  strategy_id UUID REFERENCES strategies,
  
  -- P&L
  premium NUMERIC,                             -- net credit/debit
  pnl NUMERIC,                                 -- realized P&L
  pnl_percent NUMERIC,
  
  -- Metadata
  notes TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. METRICS SNAPSHOTS (daily P&L tracking)
-- ============================================================
CREATE TABLE metrics_snapshots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Portfolio metrics
  total_premium_collected NUMERIC DEFAULT 0,
  total_pnl NUMERIC DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  
  -- Strategy breakdown (CSP / CC)
  csp_premium NUMERIC DEFAULT 0,
  cc_premium NUMERIC DEFAULT 0,
  
  -- Win rate
  win_rate NUMERIC,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, snapshot_date)
);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users manage their signals" ON signals
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage their positions" ON positions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage their trades" ON trades
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage their metrics" ON metrics_snapshots
  FOR ALL USING (auth.uid() = user_id);

-- Strategies are public (seeded data)
CREATE POLICY "Strategies are viewable by all" ON strategies
  FOR SELECT USING (true);

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX idx_signals_user ON signals(user_id);
CREATE INDEX idx_signals_symbol ON signals(symbol);
CREATE INDEX idx_signals_status ON signals(status);
CREATE INDEX idx_positions_user ON positions(user_id);
CREATE INDEX idx_positions_symbol ON positions(symbol);
CREATE INDEX idx_positions_status ON positions(status);
CREATE INDEX idx_trades_user ON trades(user_id);
CREATE INDEX idx_metrics_user_date ON metrics_snapshots(user_id, snapshot_date DESC);
