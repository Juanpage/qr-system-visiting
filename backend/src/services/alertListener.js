import pool from '../db/pool.js';
import { notifyNewAlert } from './notificationService.js';

export async function startAlertListener() {
  // Cliente dedicado para LISTEN
  const client = await pool.connect();

  await client.query('LISTEN feedback_alerts_channel');
  console.log('👂 LISTEN activo: feedback_alerts_channel');

  client.on('notification', async (msg) => {
    try {
      if (!msg.payload) return;

      // Payload enviado por pg_notify
      const alert = JSON.parse(msg.payload);

      // Obtener TODA la info real del feedback
      const { rows } = await pool.query(
        `
        SELECT 
          f.id,
          f.vessel_id,
          f.cabin_number,
          f.improvement,
          f.rating_general,
          f.nps,
          v.name AS vessel_name
        FROM feedback f
        LEFT JOIN vessels v ON v.name = f.vessel_id
        WHERE f.id = $1
        LIMIT 1
        `,
        [alert.feedback_id]
      );

      if (!rows.length) {
        console.warn('⚠️ Feedback no encontrado para alerta:', alert.feedback_id);
        return;
      }

      const feedback = rows[0];

      // Enviar correo con datos REALES y consolidados
      await notifyNewAlert({
        alertId: alert.id,
        feedbackId: feedback.id,
        vessel: feedback.vessel_name || feedback.vessel_id,
        cabinNumber: feedback.cabin_number,
        severity: alert.severity,
        reasons: alert.reasons || [alert.message],
        improvement: feedback.improvement,
        rating: feedback.rating_general,
        nps: feedback.nps,
        createdAt: alert.created_at
      });

      console.log('📧 Correo enviado para alerta:', alert.id);
    } catch (err) {
      console.error('❌ Error en listener de alertas:', err.message);
    }
  });

  client.on('error', (err) => {
    console.error('❌ LISTENER DB error:', err.message);
  });
}
