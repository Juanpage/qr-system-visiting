/* ======================================================
   ALERT ACTIONS
====================================================== */
const ALERT_ACTIONS = [
  'Contacted guest',
  'Offered compensation',
  'Escalated to operations',
  'Logged for review'
];

/* ======================================================
   HELPERS
====================================================== */
function getRatingColor(value) {
  if (value >= 4) return '#16a34a';
  if (value >= 3) return '#f59e0b';
  return '#dc2626';
}

function getNpsColor(value) {
  if (value >= 8) return '#16a34a';
  if (value >= 6) return '#f59e0b';
  return '#dc2626';
}

/* ======================================================
   CONFIG & STATE
====================================================== */
const API_BASE = 'http://localhost:3000';

let password = '';
let lastAlertId = null;
let alertsInterval = null;
let isResolvingAlert = false;

let ratingChart = null;
let npsChart = null;

/* ======================================================
   UI ELEMENTS
====================================================== */
const lockOverlay   = document.getElementById('admin-lock');
const unlockBtn     = document.getElementById('unlock-btn');
const passwordInput = document.getElementById('admin-password');

const alertCard      = document.querySelector('.alert-card');
const alertIndicator = document.querySelector('.alert-indicator');
const alertTitle     = document.querySelector('.alert-title');
const alertMeta      = document.querySelector('.alert-meta');
const alertMessage   = document.querySelector('.alert-message');

/* ======================================================
   ALERT BANNER STATE
====================================================== */
function setNoActiveAlerts() {
  lastAlertId = null;

  alertCard && (alertCard.style.display = 'none');
  alertIndicator && (alertIndicator.style.display = 'none');

  alertTitle && (alertTitle.textContent = 'No active alerts');
  alertMeta && (alertMeta.textContent = '');
  alertMessage && (alertMessage.textContent = '');
}

function setActiveAlert(alert) {
  lastAlertId = alert.id;

  alertCard && (alertCard.style.display = 'flex');
  alertIndicator && (alertIndicator.style.display = 'block');

  alertTitle && (alertTitle.innerHTML = `
    ${alert.alert_type}
    <span class="alert-severity">${alert.severity}</span>
  `);

  alertMeta &&
    (alertMeta.textContent =
      `Vessel ${alert.vessel_id} · Cabin ${alert.cabin_number}`);

  alertMessage && (alertMessage.textContent = alert.message || '');
}

/* ======================================================
   FILTERS
====================================================== */
function getFilters() {
  return {
    vessel: document.getElementById('filter-vessel')?.value || '',
    cruise_date: document.getElementById('filter-date')?.value || ''
  };
}

/* ======================================================
   FETCH SUMMARY
====================================================== */
async function fetchSummary() {
  const { vessel, cruise_date } = getFilters();

  const params = new URLSearchParams({ password });
  vessel && params.append('vessel', vessel);
  cruise_date && params.append('cruise_date', cruise_date);

  const response = await fetch(
    `${API_BASE}/api/admin/summary?${params}`,
    { cache: 'no-store' }
  );

  if (response.status === 401) {
    lockOverlay.style.display = 'flex';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    throw new Error('Dashboard error');
  }

  return response.json();
}

/* ======================================================
   METRICS
====================================================== */
function renderMetrics(data) {
  const stats = data.stats || {};
  const rating = Number(stats.average_rating || 0);
  const nps    = Number(stats.average_nps || 0);

  document.getElementById('metric-total').textContent  = stats.total_responses || 0;
  document.getElementById('metric-rating').textContent = rating.toFixed(2);
  document.getElementById('metric-nps').textContent    = nps.toFixed(2);
  document.getElementById('metric-last').textContent   = stats.last_30_days || 0;

  setKpiState('kpi-rating', rating >= 4 ? 'good' : rating >= 3 ? 'warn' : 'bad');
  setKpiState('kpi-nps',    nps >= 8 ? 'good' : nps >= 6 ? 'warn' : 'bad');
}

function setKpiState(id, state) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('good', 'warn', 'bad');
  el.classList.add(state);
}

/* ======================================================
   CHARTS
====================================================== */
function renderCharts(data) {
  const stats = data.stats || {};
  const avgRating = Number(stats.average_rating || 0);
  const avgNps    = Number(stats.average_nps || 0);

  const ratingCanvas = document.getElementById('ratingChart');
  const npsCanvas    = document.getElementById('npsChart');

  if (ratingCanvas) {
    ratingChart?.destroy();
    ratingChart = new Chart(ratingCanvas, {
      type: 'bar',
      data: {
        labels: ['Average Rating'],
        datasets: [{
          data: [avgRating],
          backgroundColor: getRatingColor(avgRating),
          borderRadius: 8
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { min: 0, max: 5 } }
      }
    });
  }

  if (npsCanvas) {
    npsChart?.destroy();
    npsChart = new Chart(npsCanvas, {
      type: 'bar',
      data: {
        labels: ['Average NPS'],
        datasets: [{
          data: [avgNps],
          backgroundColor: getNpsColor(avgNps),
          borderRadius: 8
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { min: 0, max: 10 } }
      }
    });
  }
}

/* ======================================================
   TABLE
====================================================== */
function renderTable(data) {
  const tbody = document.querySelector('table tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  (data.recent || []).forEach(row => {
    let status = '<span style="color:#94a3b8;">● No alert</span>';
    let actionCell = '—';

    if (row.has_alert) {
      if (row.alert_managed) {
        status = '<span style="color:#16a34a;font-weight:600;">● Managed</span>';
        actionCell = row.action_taken || '—';
      } else {
        status = '<span style="color:#dc2626;font-weight:600;">● Pending</span>';

        const options = ALERT_ACTIONS.map(a =>
          `<option value="${a}">${a}</option>`
        ).join('');

        actionCell = `
          <select class="alert-action-select" data-alert-id="${row.alert_id}">
            <option value="">Select action</option>
            ${options}
          </select>
          <button class="btn-manage" data-alert-id="${row.alert_id}" disabled>
            Resolve
          </button>
        `;
      }
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.id}</td>
      <td>${row.vessel_id}</td>
      <td>${row.nationality}</td>
      <td>${row.cruise_date}</td>
      <td>${row.cabin_number}</td>
      <td>${row.rating_general}</td>
      <td>${row.nps}</td>
      <td>${new Date(row.created_at).toLocaleString()}</td>
      <td>${status}</td>
      <td>${actionCell}</td>
    `;
    tbody.appendChild(tr);
  });

  bindManageButtons();
}

function bindManageButtons() {
  document.querySelectorAll('.alert-action-select').forEach(select => {
    const alertId = select.dataset.alertId;
    const button = select.parentElement.querySelector('.btn-manage');

    select.addEventListener('change', () => {
      button.disabled = !select.value;
    });

    button.addEventListener('click', async () => {
      if (!select.value || isResolvingAlert) return;

      isResolvingAlert = true;
      button.disabled = true;

      try {
        const res = await fetch(
          `${API_BASE}/api/admin/alerts/${alertId}/resolve?password=${password}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              managed_by: 'admin',
              action_taken: select.value
            })
          }
        );

        if (!res.ok) throw new Error();

        setNoActiveAlerts();
        await loadDashboard();

      } catch {
        alert('Error resolving alert');
      } finally {
        isResolvingAlert = false;
      }
    });
  });
}

/* ======================================================
   ALERT BANNER
====================================================== */
async function loadAlerts() {
  if (!password) return;

  try {
    const res = await fetch(
      `${API_BASE}/api/admin/alerts?password=${password}&_=${Date.now()}`,
      { cache: 'no-store' }
    );

    if (!res.ok) return setNoActiveAlerts();

    const { data } = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return setNoActiveAlerts();
    }

    const alert = data[0];

    if (alert.id !== lastAlertId) {
      lastAlertId = alert.id;
      loadDashboard();
    }

    setActiveAlert(alert);

  } catch (e) {
    console.error(e);
    setNoActiveAlerts();
  }
}

/* ======================================================
   DASHBOARD
====================================================== */
async function loadDashboard() {
  const data = await fetchSummary();
  renderMetrics(data);
  renderCharts(data);
  renderTable(data);
}

/* ======================================================
   UNLOCK
====================================================== */
function handleUnlock() {
  password = passwordInput.value.trim();
  if (!password) return;

  lockOverlay.style.display = 'none';
  setNoActiveAlerts();

  loadDashboard();
  loadAlerts();

  clearInterval(alertsInterval);
  alertsInterval = setInterval(loadAlerts, 5000);
}

/* ======================================================
   INIT
====================================================== */
function init() {
  unlockBtn?.addEventListener('click', handleUnlock);

  passwordInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleUnlock();
  });

  document
    .getElementById('apply-filters')
    ?.addEventListener('click', loadDashboard);

  document
    .getElementById('export-csv')
    ?.addEventListener('click', () => {
      const params = new URLSearchParams({ password });
      window.location.href =
        `${API_BASE}/api/admin/export?${params}`;
    });
}

document.addEventListener('DOMContentLoaded', init);
