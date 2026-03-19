CONTEXTO BASE – NO PREGUNTAR, NO ASUMIR, NO PARCHEAR

Proyecto: QR-system-visiting
Stack:
- Backend Node.js (ESM)
- PostgreSQL
- Frontend HTML/CSS/JS vanilla
- SMTP corporativo Globat

ESTRUCTURA BACKEND (FIJA):
backend/
 ├─ src/
 │  ├─ controllers/
 │  │   └─ feedbackController.js
 │  ├─ services/
 │  │   ├─ alertService.js
 │  │   ├─ notificationService.js
 │  │   └─ testMail.js
 │  ├─ db/
 │  │   └─ pool.js
 │  ├─ routes/
 │  │   └─ feedbackRoutes.js
 │  └─ server.js
 ├─ .env
 └─ package.json

ESTADO ACTUAL (IMPORTANTE):
- Alert banner funciona correctamente:
  - Aparece SOLO si hay alertas NO gestionadas
  - Desaparece inmediatamente al resolverlas
- Tabla de feedback y gestión OK
- Backend estable, sin parches pendientes
- evaluateFeedbackAlerts y saveFeedbackAlerts funcionan
- NOTIFICATIONS AÚN NO INTEGRADAS AL FLUJO AUTOMÁTICO

SMTP REAL (FUNCIONANDO):
SMTP_HOST=smtp.globat.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=gestionfeedback@visitingalapagos.com
SMTP_PASS=Gestioncalidad1.
NOTIFY_FROM_NAME=Visiting Galápagos Feedback Alerts

ERRORES YA RESUELTOS (NO REPETIR):
- ERR_MODULE_NOT_FOUND → nodemailer no instalado
- self-signed certificate in certificate chain → solucionado con:
  tls: { rejectUnauthorized: false }
- notifyNewAlert undefined → export/import mal hechos
- ejecutar testMail.js requiere node src/services/testMail.js
- NO mezclar nodemon con scripts de test

REGLAS:
- Paso a paso
- Sin texto innecesario
- No asumir archivos
- No “parchar”
- No reescribir archivos que ya funcionan

OBJETIVO INMEDIATO:
Integrar notificaciones (email ahora, WhatsApp luego) en backend
cuando se genere una alerta nueva.
