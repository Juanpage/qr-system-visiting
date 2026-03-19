import 'dotenv/config'; // CLAVE en ESM (antes de todo)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

/* ---------- PATHS ---------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ---------- ENV ---------- */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL from env:', process.env.DATABASE_URL);
  throw new Error('DATABASE_URL is required');
}

/* ---------- POOL ---------- */
const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: false }
    : undefined
});

/* ---------- INIT DB (SCHEMA) ---------- */
export async function initDb() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  await pool.query(schemaSql);
  console.log('Database connected & schema ensured');
}

export default pool;
