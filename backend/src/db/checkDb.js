import 'dotenv/config';
import pool from './pool.js';

async function check() {
  try {
    const res = await pool.query('SELECT id, name, slug FROM vessels');
    console.log('Vessels found:', res.rows);
  } catch (err) {
    console.error('DB ERROR:', err.message);
  } finally {
    process.exit();
  }
}

check();
