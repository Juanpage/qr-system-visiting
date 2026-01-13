import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import feedbackRoutes from './routes/feedbackRoutes.js';
import { initDb } from './db/pool.js';
import { startAlertListener } from './services/alertListener.js';

const app = express();
const port = process.env.PORT || 3000;

/* ---------- PATHS ---------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendPath = path.resolve(__dirname, '../../frontend/src');
const pagesPath = path.join(frontendPath, 'pages');
const assetsPath = path.join(frontendPath, 'assets');

/* ---------- CORS (DEV) ---------- */
app.use(
  cors({
    origin: [
      'http://127.0.0.1:5500',
      'http://localhost:5500'
    ]
  })
);

/* ---------- BODY PARSERS ---------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------- STATIC ---------- */
app.use('/assets', express.static(assetsPath));

/* ---------- API ---------- */
app.use('/api', feedbackRoutes);

/* ---------- PAGES ---------- */
app.get('/feedback', (_req, res) => {
  res.sendFile(path.join(pagesPath, 'feedback.html'));
});

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(pagesPath, 'admin.html'));
});

app.get('/thanks', (_req, res) => {
  res.sendFile(path.join(pagesPath, 'thanks.html'));
});

// Legacy compatibility
app.get('/thanks.html', (_req, res) => {
  res.redirect('/thanks');
});

/* ---------- HEALTH ---------- */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

/* ---------- 404 ---------- */
app.use((_req, res) => {
  res.status(404).send('Not Found');
});

/* ---------- ERROR ---------- */
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

/* ---------- BOOTSTRAP ---------- */
initDb()
  .then(async () => {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log(
        `Feedback → http://localhost:${port}/feedback?vessel=letty&token=TOKEN`
      );
    });

    await startAlertListener();
  })
  .catch((error) => {
    console.error('Failed to initialize database', error);
    process.exit(1);
  });
