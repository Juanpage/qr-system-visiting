import pool from '../db/pool.js';
import {
  evaluateFeedbackAlerts,
  saveFeedbackAlerts
} from '../services/alertService.js';

/* ======================================================
   HELPERS
====================================================== */
function mapLikelihoodToNps(value) {
  switch (value) {
    case 'Very Likely': return 10;
    case 'Likely': return 7;
    case 'Not Likely': return 0;
    default: return null;
  }
}

function parseRating(value) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 5) return null;
  return num;
}

/* ======================================================
   SUBMIT FEEDBACK (ESTABLE – NO TOCAR)
   - vessel_id se guarda como TEXTO (LETTY / CALIPSO / NAREL)
====================================================== */
export async function submitFeedback(req, res) {
  try {
    const {
      vessel_slug,
      qr_token,
      nationality,
      cabin_number,
      likelihood,
      best_part,
      improvement,
      name,
      email,
      guide_score,
      crew_friendliness_score,
      cleanliness_score,
      professionalism_score,
      meals_score,
      cabin_score,
      interior_areas_score,
      sundeck_score,
      value_score
    } = req.body;

    /* ---------- VALIDAR QR ---------- */
    const vesselResult = await pool.query(
      `SELECT name FROM vessels WHERE slug = $1 AND qr_token = $2`,
      [vessel_slug, qr_token]
    );

    if (vesselResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid vessel or QR token' });
    }

    const vessel_id = vesselResult.rows[0].name; // TEXTO (ESTABLE)

    /* ---------- VALIDACIONES ---------- */
    if (!nationality || !cabin_number) {
      return res.status(400).json({
        message: 'Nationality and cabin number required'
      });
    }

    const nps = mapLikelihoodToNps(likelihood);
    if (nps === null) {
      return res.status(400).json({ message: 'Likelihood is required' });
    }

    const scores = [
      guide_score,
      crew_friendliness_score,
      cleanliness_score,
      professionalism_score,
      meals_score,
      cabin_score,
      interior_areas_score,
      sundeck_score,
      value_score
    ].map(parseRating);

    if (scores.some(v => v === null)) {
      return res.status(400).json({
        message: 'All ratings must be between 1 and 5'
      });
    }

    const rating_general = Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length
    );

    /* ---------- DEDUPLICACIÓN: evitar doble envío mismo día ---------- */
    const dedupCheck = await pool.query(
      `SELECT id FROM feedback
       WHERE vessel_id = $1
         AND cabin_number = $2
         AND cruise_date = CURRENT_DATE`,
      [vessel_id, cabin_number]
    );

    if (dedupCheck.rows.length > 0) {
      return res.status(409).json({
        message: 'Feedback already submitted for this cabin today.',
        code: 'DUPLICATE_FEEDBACK'
      });
    }

    /* ---------- INSERT FEEDBACK ---------- */
    const insertResult = await pool.query(
      `
      INSERT INTO feedback (
        vessel_id,
        nationality,
        cabin_number,
        rating_general,
        nps,
        punctuality_score,
        organization_score,
        safety_score,
        guide_score,
        crew_friendliness_score,
        cleanliness_score,
        professionalism_score,
        meals_score,
        cabin_score,
        interior_areas_score,
        sundeck_score,
        value_score,
        best_part,
        improvement,
        name,
        email
      ) VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,
        $9,$10,$11,$12,
        $13,$14,$15,$16,$17,
        $18,$19,$20,$21
      )
      RETURNING id
      `,
      [
        vessel_id,
        nationality,
        cabin_number,
        rating_general,
        nps,
        rating_general,
        rating_general,
        rating_general,
        ...scores,
        best_part || null,
        improvement || null,
        name || null,
        email || null
      ]
    );

    const feedbackId = insertResult.rows[0].id;

    /* ---------- ALERTAS ---------- */
    const alerts = await evaluateFeedbackAlerts({
      feedback_id: feedbackId,
      vessel_id,
      cruise_date: null,
      rating_general,
      nps,
      improvement
    });

    await saveFeedbackAlerts(feedbackId, alerts);

    return res.status(201).json({
      message: 'Feedback submitted',
      feedbackId
    });

  } catch (err) {
    console.error('❌ submitFeedback error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/* ======================================================
   ADMIN – DASHBOARD SUMMARY
   Compatible con vessel_id como TEXTO o FK
====================================================== */
export async function getDashboardStats(req, res) {
  const { password, vessel, cruise_date } = req.query;

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const vesselFilter = (vessel || '').trim();
    const dateFilter = (cruise_date || '').trim();

    /* ---------- STATS ---------- */
    const statsQuery = `
      SELECT
        COUNT(*)::int AS total_responses,
        ROUND(AVG(f.rating_general)::numeric,2) AS average_rating,
        ROUND(AVG(f.nps)::numeric,2) AS average_nps,
        COUNT(*) FILTER (
          WHERE f.created_at >= NOW() - INTERVAL '30 days'
        )::int AS last_30_days
      FROM feedback f
      LEFT JOIN vessels v
        ON (
          v.id::text = f.vessel_id::text
          OR v.name = f.vessel_id::text
        )
      WHERE
        (NULLIF($1,'') IS NULL OR COALESCE(v.name, f.vessel_id::text) = $1)
        AND (NULLIF($2,'') IS NULL OR f.cruise_date = $2::date)
    `;

    const { rows: statsRows } = await pool.query(statsQuery, [
      vesselFilter,
      dateFilter
    ]);

    /* ---------- RECENT FEEDBACK ---------- */
    const recentQuery = `
      SELECT
        f.id,
        COALESCE(v.name, f.vessel_id::text) AS vessel_id,
        f.nationality,
        f.cruise_date,
        f.cabin_number,
        f.rating_general,
        f.nps,
        f.created_at,
        fa.id IS NOT NULL AS has_alert,
        fa.managed_at IS NOT NULL AS alert_managed,
        fa.id AS alert_id,
        fa.action_taken
      FROM feedback f
      LEFT JOIN vessels v
        ON (
          v.id::text = f.vessel_id::text
          OR v.name = f.vessel_id::text
        )
      LEFT JOIN LATERAL (
        SELECT id, managed_at, action_taken
        FROM feedback_alerts
        WHERE feedback_id = f.id
        ORDER BY created_at DESC
        LIMIT 1
      ) fa ON true
      WHERE
        (NULLIF($1,'') IS NULL OR COALESCE(v.name, f.vessel_id::text) = $1)
        AND (NULLIF($2,'') IS NULL OR f.cruise_date = $2::date)
      ORDER BY f.created_at DESC
      LIMIT 10
    `;

    const { rows: recentRows } = await pool.query(recentQuery, [
      vesselFilter,
      dateFilter
    ]);

    return res.json({
      stats: statsRows[0] || {
        total_responses: 0,
        average_rating: 0,
        average_nps: 0,
        last_30_days: 0
      },
      recent: recentRows || []
    });

  } catch (err) {
    console.error('❌ getDashboardStats error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/* ======================================================
   ADMIN – EXPORT CSV
====================================================== */
export async function exportCsv(req, res) {
  const { password, vessel, cruise_date } = req.query;

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const vesselFilter = (vessel || '').trim();
    const dateFilter = (cruise_date || '').trim();

    const query = `
      SELECT
        f.id,
        COALESCE(v.name, f.vessel_id::text) AS vessel,
        f.nationality,
        f.cruise_date,
        f.cabin_number,
        f.rating_general,
        f.nps,
        f.created_at,
        fa.managed_at,
        fa.action_taken
      FROM feedback f
      LEFT JOIN vessels v
        ON (
          v.id::text = f.vessel_id::text
          OR v.name = f.vessel_id::text
        )
      LEFT JOIN LATERAL (
        SELECT managed_at, action_taken
        FROM feedback_alerts
        WHERE feedback_id = f.id
        ORDER BY created_at DESC
        LIMIT 1
      ) fa ON true
      WHERE
        (NULLIF($1,'') IS NULL OR COALESCE(v.name, f.vessel_id::text) = $1)
        AND (NULLIF($2,'') IS NULL OR f.cruise_date = $2::date)
      ORDER BY f.created_at DESC
    `;

    const { rows } = await pool.query(query, [
      vesselFilter,
      dateFilter
    ]);

    const headers = [
      'ID',
      'Vessel',
      'Nationality',
      'Cruise date',
      'Cabin',
      'Rating',
      'NPS',
      'Submitted',
      'Alert managed',
      'Action taken'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      const s = String(val);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const csvLines = [headers.join(',')];

    for (const r of rows) {
      csvLines.push([
        r.id,
        escapeCsv(r.vessel),
        escapeCsv(r.nationality),
        escapeCsv(r.cruise_date),
        escapeCsv(r.cabin_number),
        escapeCsv(r.rating_general),
        escapeCsv(r.nps),
        escapeCsv(r.created_at),
        r.managed_at ? 'YES' : 'NO',
        escapeCsv(r.action_taken || '')
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="feedback_export_${Date.now()}.csv"`
    );

    return res.status(200).send(csvLines.join('\n'));

  } catch (err) {
    console.error('❌ exportCsv error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}
