/* ======================================================
   COUNTRIES
====================================================== */
const countryList = [
  'Argentina','Australia','Austria','Belgium','Bolivia','Brazil','Canada','Chile','China','Colombia',
  'Costa Rica','Croatia','Czech Republic','Denmark','Dominican Republic','Ecuador','Egypt','Estonia',
  'Finland','France','Germany','Greece','Guatemala','Honduras','Hong Kong','Hungary','Iceland','India',
  'Indonesia','Ireland','Israel','Italy','Japan','Kenya','Latvia','Lithuania','Luxembourg','Malaysia',
  'Mexico','Morocco','Netherlands','New Zealand','Norway','Panama','Paraguay','Peru','Philippines',
  'Poland','Portugal','Puerto Rico','Qatar','Romania','Saudi Arabia','Singapore','Slovakia','Slovenia',
  'South Africa','South Korea','Spain','Sweden','Switzerland','Taiwan','Thailand','Turkey',
  'United Arab Emirates','United Kingdom','United States','Uruguay','Venezuela','Vietnam'
];

/* ======================================================
   ELEMENTS
====================================================== */
const vesselName = document.getElementById('vessel-name');
const vesselInput = document.getElementById('vessel_id');
const form = document.getElementById('feedback-form');
const nationalitySelect = document.getElementById('nationality');
const errorBox = document.getElementById('error-box');

/* ======================================================
   URL PARAMS (?vessel & token)
====================================================== */
const params = new URLSearchParams(window.location.search);
const vesselSlug = params.get('vessel');
const qrToken = params.get('token');

/* ======================================================
   NATIONALITIES
====================================================== */
function populateNationalities() {
  if (!nationalitySelect) return;

  nationalitySelect.innerHTML =
    '<option value="">Select your country</option>';

  countryList
    .sort((a, b) => a.localeCompare(b))
    .forEach(country => {
      const opt = document.createElement('option');
      opt.value = country;
      opt.textContent = country;
      nationalitySelect.appendChild(opt);
    });
}

/* ======================================================
   HELPERS
====================================================== */
function getRatingValue(name) {
  const checked =
    document.querySelector(`input[name="${name}"]:checked`);
  return checked ? Number(checked.value) : null;
}

function buildPayload() {
  return {
    vessel_slug: vesselSlug,
    qr_token: qrToken,

    nationality: nationalitySelect.value,
    cabin_number:
      document.getElementById('cabin_number').value.trim(),
    likelihood:
      document.querySelector('input[name="likelihood"]:checked')?.value,

    guide_score: getRatingValue('guide_score'),
    crew_friendliness_score: getRatingValue('crew_friendliness_score'),
    cleanliness_score: getRatingValue('cleanliness_score'),
    professionalism_score: getRatingValue('professionalism_score'),
    meals_score: getRatingValue('meals_score'),
    cabin_score: getRatingValue('cabin_score'),
    interior_areas_score: getRatingValue('interior_areas_score'),
    sundeck_score: getRatingValue('sundeck_score'),
    value_score: getRatingValue('value_score'),

    best_part:
      document.getElementById('best_part').value.trim(),
    improvement:
      document.getElementById('improvement').value.trim(),
    name:
      document.getElementById('name').value.trim(),
    email:
      document.getElementById('email').value.trim()
  };
}

function validatePayload(p) {
  if (!p.vessel_slug || !p.qr_token)
    return 'Invalid QR code. Please scan again.';

  if (!p.nationality)
    return 'Please select your nationality.';

  if (!p.cabin_number)
    return 'Please enter your cabin number.';

  if (!p.likelihood)
    return 'Please answer how likely you are to recommend us.';

  const ratings = [
    p.guide_score,
    p.crew_friendliness_score,
    p.cleanliness_score,
    p.professionalism_score,
    p.meals_score,
    p.cabin_score,
    p.interior_areas_score,
    p.sundeck_score,
    p.value_score
  ];

  if (ratings.some(r => r === null))
    return 'Please rate all service items.';

  return null;
}

/* ======================================================
   SUBMIT
====================================================== */
async function handleSubmit(e) {
  e.preventDefault();

  const payload = buildPayload();
  const err = validatePayload(payload);

  if (err) {
    errorBox.textContent = err;
    errorBox.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  errorBox.hidden = true;

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(
        data.message || 'Unable to submit feedback.'
      );
    }

    window.location.href = '/thanks.html';

  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Submit feedback';
    errorBox.textContent = e.message;
    errorBox.hidden = false;
  }
}

/* ======================================================
   INIT
====================================================== */
document.addEventListener('DOMContentLoaded', () => {
  populateNationalities();

  if (!vesselSlug || !qrToken) {
    errorBox.textContent = 'Invalid or missing QR code.';
    errorBox.hidden = false;
    form.classList.add('hidden');
    return;
  }

  vesselName.textContent = vesselSlug.toUpperCase();
  vesselInput.value = vesselSlug;

  form.addEventListener('submit', handleSubmit);
});
