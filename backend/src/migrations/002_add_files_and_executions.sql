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
