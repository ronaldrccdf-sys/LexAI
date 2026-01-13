CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  document TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  type TEXT NOT NULL,
  total_matters INTEGER NOT NULL,
  folder_id TEXT NOT NULL,
  category TEXT,
  financial_status TEXT
);

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  type TEXT NOT NULL,
  monthly_value REAL,
  success_percentage REAL,
  validity TEXT NOT NULL,
  status TEXT NOT NULL,
  adjustments TEXT NOT NULL,
  special_conditions TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matters (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  title TEXT NOT NULL,
  client TEXT NOT NULL,
  opposing_party TEXT,
  status TEXT NOT NULL,
  type TEXT NOT NULL,
  responsible TEXT NOT NULL,
  open_date TEXT NOT NULL,
  billable_hours REAL NOT NULL,
  last_movement_summary TEXT
);

CREATE TABLE IF NOT EXISTS hearings (
  id TEXT PRIMARY KEY,
  matter_id TEXT NOT NULL,
  matter_number TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  court TEXT NOT NULL,
  modality TEXT NOT NULL,
  responsible TEXT NOT NULL,
  settlement_probability REAL NOT NULL,
  value_involved REAL NOT NULL,
  result TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS agenda_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  time_start TEXT NOT NULL,
  time_end TEXT NOT NULL,
  source_id TEXT NOT NULL,
  matter_id TEXT,
  client_name TEXT,
  responsible TEXT NOT NULL,
  title TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  matter TEXT NOT NULL,
  description TEXT NOT NULL,
  duration TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS billing_cycles (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  period TEXT NOT NULL,
  type TEXT NOT NULL,
  base_value REAL NOT NULL,
  success_fee_value REAL NOT NULL,
  total_value REAL NOT NULL,
  status TEXT NOT NULL,
  requirements TEXT NOT NULL,
  due_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS legal_executions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  matter_id TEXT NOT NULL,
  contract_id TEXT NOT NULL,
  defendant TEXT NOT NULL,
  origin TEXT NOT NULL,
  value_executed REAL NOT NULL,
  value_recovered REAL NOT NULL,
  fee_percentage REAL NOT NULL,
  fees_due REAL NOT NULL,
  fees_paid REAL NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS client_files (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER NOT NULL,
  data TEXT NOT NULL,
  date TEXT NOT NULL
);
