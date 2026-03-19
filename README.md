# Visiting Galapagos Feedback System

QR-powered feedback collection for the Visiting Galapagos fleet (LETTY, CALIPSO, NAREL). Guests scan a vessel-specific QR code to complete a short survey, and the operations team can review metrics and export responses via the admin dashboard.

## Project structure
```
backend/
  package.json
  src/
    server.js
    routes/
      feedbackRoutes.js
    controllers/
      feedbackController.js
    db/
      pool.js
      schema.sql
frontend/
  src/
    pages/
      feedback.html
      thanks.html
      admin.html
    assets/
      css/styles.css
      js/feedback.js
      js/admin.js
.env.example
```

## Prerequisites
- Node.js 18+
- PostgreSQL 13+

## Environment variables
Copy `.env.example` to `.env` and update values as needed.

- `PORT`: Express server port (default: 3000)
- `DATABASE_URL`: PostgreSQL connection string
- `ADMIN_PASSWORD`: Password for the admin dashboard
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS

## Database setup
Run the schema file to create the `feedback` table and indexes:
```bash
psql "$DATABASE_URL" -f backend/src/db/schema.sql
```

## Install dependencies
```bash
cd backend
npm install
```

## Run the server
```bash
npm start
```
The server serves API routes under `/api` and the static frontend from `frontend/src`.

## Usage
- Guest survey: `/feedback?v=LETTY` (or CALIPSO, NAREL)
- Thank you page: `/thanks.html`
- Admin dashboard: `/admin`

### Submitting feedback
- cruise_date is automatically set by the backend (no date input on the form)
- Required inputs: vessel (from query string), nationality, cabin number, recommendation likelihood, and all service ratings
- Optional inputs: name and email

### Admin dashboard
- Prompted for the password defined in `ADMIN_PASSWORD`
- Filters: vessel and cruise date
- Metrics: total responses, average rating, average NPS, responses in the last 30 days
- CSV export respects filters

## Security note
This demo uses a simple frontend password gate. Do not deploy without adding proper authentication and HTTPS.

⚠️ IMPORTANT
Do NOT open frontend HTML files directly or using Live Server.
Always run the backend and access pages via:
http://localhost:3000/feedback?v=LETTY
