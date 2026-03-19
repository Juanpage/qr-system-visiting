import pool from '../db/pool.js';

/**
 * Evalúa alertas a partir del feedback recibido
 * ⚠️ AQUÍ NO SE INSERTA NADA EN BD
 */
export async function evaluateFeedbackAlerts({
  feedback_id,
  vessel_id,
  cruise_date,
  rating_general,
  nps,
  improvement
}) {
  const alerts = [];

  // 🔴 Regla 1: Rating bajo
  if (typeof rating_general === 'number' && rating_general <= 2) {
    alerts.push({
      alert_type: 'LOW_RATING',
      severity: 'high',
      message: `Low rating detected (${rating_general}/5)`
    });
  }

  // 🟠 Regla 2: NPS bajo
  if (typeof nps === 'number' && nps <= 3) {
    alerts.push({
      alert_type: 'LOW_NPS',
      severity: 'medium',
      message: `Low NPS detected (${nps}/10)`
    });
  }

  // 🟡 Regla 3: Comentario negativo
  if (typeof improvement === 'string' && improvement.trim().length > 10) {
    alerts.push({
      alert_type: 'NEGATIVE_COMMENT',
      severity: 'medium',
      message: improvement.trim().substring(0, 200)
    });
  }

  // ❗ Sin alertas → array vacío
  return alerts;
}

/**
 * Guarda alertas generadas para un feedback
 * ✅ ÚNICA TABLA USADA: feedback_alerts
 */
export async function saveFeedbackAlerts(feedback_id, alerts) {
  if (!Array.isArray(alerts) || alerts.length === 0) return;

  const insertQuery = `
    INSERT INTO feedback_alerts (
      feedback_id,
      alert_type,
      severity,
      message
    ) VALUES ($1, $2, $3, $4);
  `;

  for (const alert of alerts) {
    await pool.query(insertQuery, [
      feedback_id,
      alert.alert_type,
      alert.severity,
      alert.message
    ]);
  }
}
