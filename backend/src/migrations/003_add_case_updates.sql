CREATE TABLE IF NOT EXISTS case_updates (
  id TEXT PRIMARY KEY,
  matter_id TEXT NOT NULL,
  date TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  type TEXT NOT NULL
);
