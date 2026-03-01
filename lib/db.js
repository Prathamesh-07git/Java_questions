import { Pool } from "pg";

let pool;

if (!global._pgPool) {
  global._pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    keepAlive: true
  });
}
pool = global._pgPool;

// Auto-migrate: add is_hard column if it doesn't exist yet
if (!global._pgMigrated) {
  global._pgMigrated = true;
  pool.query("ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_hard BOOLEAN NOT NULL DEFAULT FALSE")
    .catch((err) => console.error("Migration warning:", err.message));
}

export async function query(text, params) {
  const res = await pool.query(text, params);
  return res;
}

export async function getClient() {
  const client = await pool.connect();
  return client;
}
