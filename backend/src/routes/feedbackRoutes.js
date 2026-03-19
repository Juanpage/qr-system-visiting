import express from 'express';
import pool from '../db/pool.js';

import {
  submitFeedback,
  getDashboardStats,
  exportCsv
} from '../controllers/feedbackController.js';

const router = express.Router();

/* ---------- PUBLIC ---------- */
router.post('/feedback', submitFeedback);

/* ---------- ADMIN – DASHBOARD ---------- */
router.get('/admin/summary', getDashboardStats);
router.get('/admin/export', exportCsv);

/* ---------- ADMIN – LIST ALERTS (PENDING) ---------- */
router.get('/admin/alerts', async (req, res) => {
  const { password } = req.query;

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { rows } = await pool.query(`
      SELECT
        fa.id,
        fa.feedback_id,
        fa.alert_type,
        fa.severity,
        fa.message,
        fa.created_at,
        fa.managed_at,
        f.vessel_id,
        f.cabin_number,
        f.rating_general,
        f.nps
      FROM feedback_alerts fa
      JOIN feedback f ON f.id = fa.feedback_id
      WHERE fa.managed_at IS NULL
      ORDER BY fa.created_at DESC
      LIMIT 1;
    `);

    return res.json({ data: rows });
  } catch (error) {
    console.error('❌ Error fetching alerts', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

/* ---------- ADMIN – RESOLVE ALERT ---------- */
router.post('/admin/alerts/:id/resolve', async (req, res) => {
  const { password } = req.query;
  const { id } = req.params;
  const { managed_by = 'admin', action_taken } = req.body;

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!action_taken || !action_taken.trim()) {
    return res.status(400).json({ message: 'Action taken is required' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT feedback_id FROM feedback_alerts WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false });
    }

    const feedbackId = rows[0].feedback_id;

    await pool.query(
      `
      UPDATE feedback_alerts
      SET
        managed_by = $1,
        action_taken = $2,
        managed_at = NOW()
      WHERE feedback_id = $3
        AND managed_at IS NULL;
      `,
      [managed_by, action_taken.trim(), feedbackId]
    );

    return res.json({ success: true });

  } catch (error) {
    console.error('❌ Error resolving alert cascade', error);
    return res.status(500).json({ success: false });
  }
});

export default router;
