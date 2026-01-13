import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true, // Globat + 465 = SSL
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

export async function notifyNewAlert(alert) {
  /* ---------- VALIDACIONES MÍNIMAS ---------- */
  if (!process.env.NOTIFY_TO_EMAIL) {
    console.error('❌ NOTIFY_TO_EMAIL missing in .env');
    return;
  }

  if (!alert) {
    console.error('❌ Alert payload missing');
    return;
  }

  /* ---------- NORMALIZACIÓN SEGURA ---------- */
  const vessel = alert.vessel || alert.vessel_id || 'Unknown';
  const cabin = alert.cabinNumber || alert.cabin_number || 'N/A';
  const severity = alert.severity || 'N/A';

  let message = 'No details provided';
  if (Array.isArray(alert.reasons) && alert.reasons.length > 0) {
    message = alert.reasons.join('\n');
  } else if (typeof alert.message === 'string') {
    message = alert.message;
  }

  /* ---------- SUBJECT (ANTI-SPAM) ---------- */
  const subject = `Guest feedback alert – ${vessel} | Cabin ${cabin}`;

  /* ---------- TEXT ---------- */
  const text = `
New guest feedback requires attention.

Vessel: ${vessel}
Cabin: ${cabin}
Severity: ${severity}

Details:
${message}
`;

  /* ---------- HTML ---------- */
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <h3>New guest feedback notification</h3>

      <p><strong>Vessel:</strong> ${vessel}</p>
      <p><strong>Cabin:</strong> ${cabin}</p>
      <p><strong>Severity:</strong> ${severity}</p>

      <hr/>

      <pre style="white-space:pre-wrap">${message}</pre>

      <hr/>

      <p style="font-size:12px;color:#666">
        Visiting Galápagos – Feedback System
      </p>
    </div>
  `;

  /* ---------- SEND MAIL ---------- */
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.NOTIFY_FROM_NAME}" <${process.env.SMTP_USER}>`,
      to: process.env.NOTIFY_TO_EMAIL,
      replyTo: process.env.SMTP_USER,
      subject,
      text,
      html
    });

    console.log('📧 SMTP delivery queued:', info.messageId);
  } catch (err) {
    console.error('❌ SMTP send failed:', err.message);
  }
}
