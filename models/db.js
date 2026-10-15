const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { Database } = require('node-sqlite3-wasm');

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'ogcars.db');
const LOCK_PATHS = [
  DB_PATH + '.lock',
  DB_PATH + '-lock',
  path.join(DB_DIR, 'ogcars.db.lock'),
  path.join(DB_DIR, 'ogcars.db-shm'),
  path.join(DB_DIR, 'ogcars.db-wal')
];

let rawDB = null;
let db = null;

function cleanLocks() {
  for (const p of LOCK_PATHS) {
    try {
      if (fs.existsSync(p)) {
        const stat = fs.statSync(p);
        if (stat.isDirectory()) {
          fs.rmSync(p, { recursive: true, force: true });
        } else {
          fs.unlinkSync(p);
        }
      }
    } catch (e) {}
  }
}

function makeWrapper() {
  return {
    prepare(sql) {
      const stmt = rawDB.prepare(sql);
      const toArr = (params) => {
        if (params.length === 1 && Array.isArray(params[0])) return params[0];
        if (params.length === 1 && params[0] === undefined) return [];
        return params;
      };
      return {
        run(...params) {
          const r = stmt.run(toArr(params));
          return {
            changes: r && typeof r.changes === 'number' ? r.changes : 0,
            lastInsertRowid: r && r.lastInsertRowid != null ? Number(r.lastInsertRowid) : null
          };
        },
        get(...params) {
          const row = stmt.get(toArr(params));
          return row === null ? undefined : row;
        },
        all(...params) {
          const rows = stmt.all(toArr(params));
          return Array.isArray(rows) ? rows : [];
        }
      };
    },
    exec(sql) { return rawDB.exec(sql); }
  };
}

function initDB() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  cleanLocks();

  rawDB = new Database(DB_PATH);
  rawDB.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'client',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS cars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mark TEXT NOT NULL,
      modele TEXT NOT NULL,
      ane INTEGER,
      pri REAL NOT NULL,
      km TEXT,
      koule TEXT,
      transmisyon TEXT,
      gaz TEXT,
      deskripsyon TEXT,
      foto TEXT,
      seller_id INTEGER,
      statut TEXT DEFAULT 'disponib',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS commandes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_id INTEGER NOT NULL,
      buyer_id INTEGER,
      montant REAL NOT NULL,
      methode TEXT NOT NULL,
      transaction_id TEXT UNIQUE,
      phone_peman TEXT,
      statut TEXT DEFAULT 'annatant',
      preuve TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
      FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cars_statut ON cars(statut);
    CREATE INDEX IF NOT EXISTS idx_cmd_statut ON commandes(statut);
    CREATE INDEX IF NOT EXISTS idx_cmd_buyer ON commandes(buyer_id);
  `);

  // ENPÒTAN: inisyalize wrapper a kounye a
  db = makeWrapper();
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const phone = process.env.ADMIN_PHONE;
  if (!email || !password) return;

  const ex = db.prepare('SELECT id, role FROM users WHERE email = ?').get(email);
  if (ex) {
    if (ex.role !== 'admin') {
      db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(ex.id);
    }
    return;
  }
  const hash = await bcrypt.hash(password, 12);
  db.prepare('INSERT INTO users (nom, email, phone, password, role) VALUES (?, ?, ?, ?, ?)')
    .run('Administrateur OGCARS', email, phone || null, hash, 'admin');
  console.log('[DB] Admin kreye:', email);
}

function getDB() {
  if (!rawDB || !db) throw new Error('DB pa inisyalize');
  return db;
}

let cleanedUp = false;
function cleanup() {
  if (cleanedUp) return;
  cleanedUp = true;
  try { if (rawDB) rawDB.close(); } catch (e) {}
  cleanLocks();
}

process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(0); });
process.on('SIGTERM', () => { cleanup(); process.exit(0); });
process.on('uncaughtException', (err) => {
  console.error('Uncaught:', err.message);
  cleanup();
  process.exit(1);
});

module.exports = { initDB, seedAdmin, getDB, cleanLocks };
