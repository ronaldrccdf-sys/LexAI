import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const databasePath = process.env.DATABASE_PATH || './data/lexai.db';
const resolvedPath = path.resolve(databasePath);
const dataDir = path.dirname(resolvedPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(resolvedPath);

db.pragma('journal_mode = WAL');

const ensureMigrationsTable = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    );
  `);
};

const applyMigration = (name: string, sql: string) => {
  const existing = db.prepare('SELECT 1 FROM migrations WHERE name = ?').get(name);
  if (existing) return;
  db.exec(sql);
  db.prepare('INSERT INTO migrations (name, applied_at) VALUES (?, ?)').run(name, new Date().toISOString());
};

export const runMigrations = () => {
  ensureMigrationsTable();
  const migrationsDir = path.resolve('backend/src/migrations');
  const files = fs.readdirSync(migrationsDir).filter(file => file.endsWith('.sql')).sort();
  files.forEach(file => {
    const migration = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    applyMigration(file, migration);
  });
};

export const seedIfEmpty = () => {
  const contactCount = db.prepare('SELECT COUNT(*) as count FROM contacts').get() as { count: number };
  if (contactCount.count === 0) {
    db.prepare(`
      INSERT INTO contacts (id, name, document, email, phone, type, total_matters, folder_id, category, financial_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('1', 'Maria Souza', '123.456.789-00', 'maria@email.com', '(11) 99999-9999', 'Individual', 2, 'folder_1', 'Recorrente', 'Em dia');
  }

  const contractCount = db.prepare('SELECT COUNT(*) as count FROM contracts').get() as { count: number };
  if (contractCount.count === 0) {
    db.prepare(`
      INSERT INTO contracts (id, client_id, type, monthly_value, success_percentage, validity, status, adjustments, special_conditions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('ct1', '1', 'Híbrido', 2500, 20, '2025-12-31', 'Ativo', 'IGP-M', 'Exige Certidões Federais');
  }

  const matterCount = db.prepare('SELECT COUNT(*) as count FROM matters').get() as { count: number };
  if (matterCount.count === 0) {
    db.prepare(`
      INSERT INTO matters (id, number, title, client, opposing_party, status, type, responsible, open_date, billable_hours, last_movement_summary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      '1',
      '1000234-12.2023.8.26.0100',
      'Inventário Família Souza',
      'Maria Souza',
      'Fazenda Pública Estadual',
      'Aberto',
      'Cível',
      'Dr. Ronald Serra',
      '12/01/2023',
      42.5,
      'O juiz determinou a juntada de novas certidões negativas de débito para prosseguimento da partilha.'
    );
  }

  const billingCount = db.prepare('SELECT COUNT(*) as count FROM billing_cycles').get() as { count: number };
  if (billingCount.count === 0) {
    db.prepare(`
      INSERT INTO billing_cycles (id, client_id, client_name, period, type, base_value, success_fee_value, total_value, status, requirements, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'cy1',
      '1',
      'Maria Souza',
      'Novembro 2023',
      'Híbrido',
      2500,
      1200,
      3700,
      'Pago',
      JSON.stringify({ nf: true, certidaoFederal: true, certidaoEstadual: true, certidaoMunicipal: true, certidaoFGTS: true, certidaoTrabalhista: true, activityReport: true }),
      '2023-11-10'
    );
  }
};
