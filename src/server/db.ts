import Database from 'better-sqlite3';
import path from 'path';

// Initialize DB
const isProduction = process.env.NODE_ENV === 'production';
const dbPath = isProduction 
  ? path.resolve('/tmp', 'chatbot.db')
  : path.resolve(process.cwd(), 'chatbot.db');

console.log(`Initializing DB at ${dbPath}`);
const db = new Database(dbPath);

try {
  // Create tables if not exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin'
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE NOT NULL,
      whatsapp TEXT,
      full_name TEXT,
      first_name TEXT,
<<<<<<< HEAD
      current_mode TEXT DEFAULT NULL,
      current_dept TEXT DEFAULT NULL,
      controlled_by TEXT DEFAULT NULL,
      platform TEXT DEFAULT 'web',
      last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_read INTEGER DEFAULT 0,
=======
>>>>>>> 253d226ac800177e6aced0dbf34ab37d53336894
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      sender TEXT CHECK(sender IN ('user', 'bot', 'system')) NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(session_id) REFERENCES sessions(session_id)
    );

    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      type TEXT CHECK(type IN ('ai', 'human', 'hybrid')) DEFAULT 'ai',
      phone TEXT,
      prompt TEXT,
      display_order INTEGER DEFAULT 0
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_name ON departments(name);

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding BLOB, -- Store as JSON string or binary blob
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    
    -- Seed initial user (admin/admin) - In production use hashed passwords!
    INSERT OR IGNORE INTO users (username, password_hash) VALUES ('admin', 'admin');

    -- Seed default departments
    INSERT OR IGNORE INTO departments (name, icon, type, display_order) VALUES 
    ('Vendas', '🛒', 'ai', 1),
    ('Suporte Técnico', '🔧', 'ai', 2),
    ('Financeiro', '💰', 'ai', 3),
    ('Projetos Customizados', '⚙️', 'human', 4);
  `);
  console.log("DB tables initialized successfully");
} catch (err) {
  console.error("Failed to initialize DB tables:", err);
}

<<<<<<< HEAD
// Safe migrations for existing DBs
const migrations = [
  'ALTER TABLE sessions ADD COLUMN full_name TEXT',
  'ALTER TABLE sessions ADD COLUMN first_name TEXT',
  'ALTER TABLE sessions ADD COLUMN current_mode TEXT DEFAULT NULL',
  'ALTER TABLE sessions ADD COLUMN current_dept TEXT DEFAULT NULL',
  'ALTER TABLE sessions ADD COLUMN controlled_by TEXT DEFAULT NULL',
  'ALTER TABLE sessions ADD COLUMN platform TEXT DEFAULT "web"',
  'ALTER TABLE departments ADD COLUMN prompt TEXT',
  'ALTER TABLE sessions ADD COLUMN last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP',
  'ALTER TABLE sessions ADD COLUMN is_read INTEGER DEFAULT 0',
];
for (const migration of migrations) {
  try {
    db.exec(migration);
    console.log(`Executed migration: ${migration}`);
  } catch (e) {
    // Column already exists or other non-critical error
  }
}

=======
>>>>>>> 253d226ac800177e6aced0dbf34ab37d53336894
export default db;
