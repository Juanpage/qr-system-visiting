
/* ---- Vessel config: slug → display name + emblem emoji ---- */
const VESSEL_CONFIG = {
  letty: {
    name: 'Letty',
    emblem: '⛵',
    accent: '#0a7ea4'
  },
  calipso: {
    name: 'Calipso',
    emblem: '🚢',
    accent: '#0d7377'
  },
  narel: {
    name: 'Narel',
    emblem: '⚓',
    accent: '#1d4ed8'
  }
};

/* ---- Country list ---- */
const COUNTRIES = [
  'Argentina','Australia','Austria','Belgium','Bolivia','Brazil','Canada','Chile','China',
  'Colombia','Costa Rica','Croatia','Czech Republic','Denmark','Dominican Republic',
  'Ecuador','Egypt','Estonia','Finland','France','Germany','Greece','Guatemala',
  'Honduras','Hong Kong','Hungary','Iceland','India','Indonesia','Ireland','Israel',
  'Italy','Japan','Kenya','Latvia','Lithuania','Luxembourg','Malaysia','Mexico',
  'Morocco','Netherlands','New Zealand','Norway','Panama','Paraguay','Peru',
  'Philippines','Poland','Portugal','Puerto Rico','Qatar','Romania','Saudi Arabia',
  'Singapore','Slovakia','Slovenia','South Africa','South Korea','Spain','Sweden',
  'Switzerland','Taiwan','Thailand','Turkey','United Arab Emirates',
  'United Kingdom','United States','Uruguay','Venezuela','Vietnam'
];

/* ---- DOM elements ---- */
const vesselNameEl  = document.getElementById('vessel-name');
const vesselEmblem  = document.getElementById('vessel-emblem');
const vesselSlugEl  = document.getElementById('vessel_slug');
const qrTokenEl     = document.getElementById('qr_token');
const form          = document.getElementById('feedback-form');
const nationalityEl = document.getElementById('nationality');
const errorBox      = document.getElementById('error-box');
const alreadyEl     = document.getElementById('already-submitted');
const introCard     = document.getElementById('intro-card');

/* ---- URL params ---- */
const params    = new URLSearchParams(window.location.search);
const vesselSlug = (params.get('vessel') || '').toLowerCase();
const qrToken   = params.get('token') || '';

/* ---- Helpers ---- */
function showError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideError() {
  errorBox.hidden = true;
}

function getRating(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? Number(el.value) : null;
}

function buildPayload() {
  return {
    vessel_slug: vesselSlug,
    qr_token: qrToken,
    nationality: nationalityEl.value,
    cabin_number: document.getElementById('cabin_number').value.trim(),
    likelihood: document.querySelector('input[name="likelihood"]:checked')?.value,
    guide_score: getRating('guide_score'),
    crew_friendliness_score: getRating('crew_friendliness_score'),
    cleanliness_score: getRating('cleanliness_score'),
    professionalism_score: getRating('professionalism_score'),
    meals_score: getRating('meals_score'),
    cabin_score: getRating('cabin_score'),
    interior_areas_score: getRating('interior_areas_score'),
    sundeck_score: getRating('sundeck_score'),
    value_score: getRating('value_score'),
    best_part: document.getElementById('best_part').value.trim(),
    improvement: document.getElementById('improvement').value.trim(),
    name: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim()
  };
}

function validate(p) {
  if (!p.vessel_slug || !p.qr_token) return 'Invalid QR code. Please scan again.';
  if (!p.nationality)  return 'Please select your nationality.';
  if (!p.cabin_number) return 'Please enter your cabin number.';
  if (!p.likelihood)   return 'Please answer how likely you are to recommend us.';
  const scores = [
    p.guide_score, p.crew_friendliness_score, p.cleanliness_score,
    p.professionalism_score, p.meals_score, p.cabin_score,
    p.interior_areas_score, p.sundeck_score, p.value_score
  ];
  if (scores.some(r => r === null)) return 'Please rate all service areas.';
  return null;
}

/* ---- Session-based dedup key ---- */
function dedupKey(slug, cabin) {
  const today = new Date().toISOString().slice(0, 10);
  return `vg_submitted_${slug}_${cabin}_${today}`;
}

function checkAlreadySubmitted(slug, cabin) {
  return !!sessionStorage.getItem(dedupKey(slug, cabin));
}

function markSubmitted(slug, cabin) {
  sessionStorage.setItem(dedupKey(slug, cabin), '1');
}

/* ---- Populate countries ---- */
function populateNationalities() {
  COUNTRIES.sort((a, b) => a.localeCompare(b)).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    nationalityEl.appendChild(opt);
  });
}

/* ---- Apply vessel branding ---- */
function applyVesselBranding(slug) {
  const cfg = VESSEL_CONFIG[slug] || { name: slug.toUpperCase(), emblem: "⛵", accent: "#0a7ea4" };

  vesselNameEl.textContent = cfg.name;

  if (cfg.image) {
    const img = document.createElement("img");
    img.src = cfg.image;
    img.alt = cfg.name;
    img.onerror = () => { vesselEmblem.innerHTML = ""; vesselEmblem.textContent = cfg.emblem; };
    vesselEmblem.innerHTML = "";
    vesselEmblem.appendChild(img);
  } else {
    vesselEmblem.textContent = cfg.emblem;
  }

  document.documentElement.style.setProperty("--ocean-teal", cfg.accent);
}

/* ---- Submit ---- */
async function handleSubmit(e) {
  e.preventDefault();
  const p = buildPayload();
  const err = validate(p);
  if (err) { showError(err); return; }
  hideError();

  /* Client-side dedup check (secondary to backend) */
  if (checkAlreadySubmitted(vesselSlug, p.cabin_number)) {
    form.hidden = true;
    alreadyEl.hidden = false;
    introCard.hidden = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting…';

  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    });

    if (res.status === 409) {
      /* Backend dedup — already submitted */
      markSubmitted(vesselSlug, p.cabin_number);
      form.hidden = true;
      alreadyEl.hidden = false;
      introCard.hidden = true;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Unable to submit feedback.');
    }

    /* Success — mark session + redirect */
    markSubmitted(vesselSlug, p.cabin_number);
    window.location.href = `/thanks.html?vessel=${encodeURIComponent(vesselSlug)}`;

  } catch (ex) {
    btn.disabled = false;
    btn.textContent = 'Submit Feedback →';
    showError(ex.message);
  }
}

/* ---- INIT ---- */
document.addEventListener('DOMContentLoaded', () => {
  populateNationalities();

  if (!vesselSlug || !qrToken) {
    showError('Invalid or missing QR code. Please scan the QR code again.');
    form.hidden = true;
    introCard.hidden = true;
    return;
  }

  vesselSlugEl.value = vesselSlug;
  qrTokenEl.value = qrToken;
  applyVesselBranding(vesselSlug);

  form.addEventListener('submit', handleSubmit);
});