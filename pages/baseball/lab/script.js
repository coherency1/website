/* === Diamond Engine — Matchup Lab
   Hypothetical batter-vs-pitcher matchup tool
   Live inference via /matchup-machine endpoint
   ================================================================== */

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : '/api/diamond';

const $batterInput     = document.getElementById('batterInput');
const $pitcherInput    = document.getElementById('pitcherInput');
const $batterSugg      = document.getElementById('batterSuggestions');
const $pitcherSugg     = document.getElementById('pitcherSuggestions');
const $runBtn          = document.getElementById('runBtn');
const $resultsPanel    = document.getElementById('resultsPanel');
const $resultHeader    = document.getElementById('resultHeader');
const $vsScore         = document.getElementById('vsScore');
const $vsGaugeFill     = document.getElementById('vsGaugeFill');
const $vsGaugeNeedle   = document.getElementById('vsGaugeNeedle');
const $outcomesGrid    = document.getElementById('outcomesGrid');
const $componentsRow   = document.getElementById('componentsRow');
const $statLine        = document.getElementById('statLine');
const $status          = document.getElementById('dashStatus');
const $emptyState      = document.getElementById('emptyState');

let selectedBatter  = null; // { id, name }
let selectedPitcher = null;

// ── Player roster (loaded from today's sim data) ────────────────────

let playerRoster = []; // [{ id, name, team, bat_side, pitch_hand }]

async function loadRoster() {
  try {
    const res = await fetch(`${API_BASE}/sim-results/${todayISO()}`);
    if (!res.ok) return;
    const data = await res.json();
    const seen = new Set();
    for (const g of (data.games || [])) {
      for (const [pid, pdata] of Object.entries(g.players || {})) {
        if (!seen.has(pid)) {
          seen.add(pid);
          playerRoster.push({
            id: parseInt(pid, 10),
            name: pdata.name || `#${pid}`,
            team: pdata.team || '',
            bat_side: pdata.bat_side || 'R',
            pitch_hand: pdata.pitch_hand || 'R',
          });
        }
      }
    }
    playerRoster.sort((a, b) => a.name.localeCompare(b.name));
  } catch (_) { /* roster loading is optional */ }
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Autocomplete ────────────────────────────────────────────────────

function setupAutocomplete(input, suggBox, isRoster, onSelect) {
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) { suggBox.classList.remove('open'); return; }

    // Try matching by name or ID
    let matches;
    if (isRoster && playerRoster.length > 0) {
      matches = playerRoster.filter(p =>
        p.name.toLowerCase().includes(q) || String(p.id).includes(q)
      ).slice(0, 8);
    } else {
      // If no roster, allow raw ID input
      suggBox.classList.remove('open');
      return;
    }

    if (!matches.length) { suggBox.classList.remove('open'); return; }

    suggBox.innerHTML = matches.map(p =>
      `<div class="suggestion-item" data-id="${p.id}" data-name="${p.name}" data-team="${p.team}" data-bat="${p.bat_side}" data-pit="${p.pitch_hand}">
        <span>${p.name} <span style="color: var(--text-dim)">${p.team}</span></span>
        <span class="sug-id">${p.id}</span>
      </div>`
    ).join('');
    suggBox.classList.add('open');

    suggBox.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        const sel = {
          id: parseInt(item.dataset.id, 10),
          name: item.dataset.name,
          team: item.dataset.team,
          bat_side: item.dataset.bat,
          pitch_hand: item.dataset.pit,
        };
        input.value = sel.name;
        suggBox.classList.remove('open');
        onSelect(sel);
      });
    });
  });

  // Close on blur (with delay for click registration)
  input.addEventListener('blur', () => setTimeout(() => suggBox.classList.remove('open'), 200));
}

setupAutocomplete($batterInput, $batterSugg, true, (sel) => {
  selectedBatter = sel;
  // Set bat side from roster
  setBatSide(sel.bat_side || 'R');
});

setupAutocomplete($pitcherInput, $pitcherSugg, true, (sel) => {
  selectedPitcher = sel;
  setPitHand(sel.pitch_hand || 'R');
});

// ── Side pickers ────────────────────────────────────────────────────

function setBatSide(side) {
  document.querySelectorAll('.input-group:first-child .side-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.side === side);
  });
}

function setPitHand(hand) {
  document.querySelectorAll('.input-group:last-child .side-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.side === hand);
  });
}

document.getElementById('batR').addEventListener('click', () => setBatSide('R'));
document.getElementById('batL').addEventListener('click', () => setBatSide('L'));
document.getElementById('batS').addEventListener('click', () => setBatSide('S'));
document.getElementById('pitR').addEventListener('click', () => setPitHand('R'));
document.getElementById('pitL').addEventListener('click', () => setPitHand('L'));

function getSelectedBatSide() {
  const active = document.querySelector('.input-group:first-child .side-btn.active');
  return active ? active.dataset.side : 'R';
}

function getSelectedPitHand() {
  const active = document.querySelector('.input-group:last-child .side-btn.active');
  return active ? active.dataset.side : 'R';
}

// ── Run Matchup ─────────────────────────────────────────────────────

$runBtn.addEventListener('click', runMatchup);

async function runMatchup() {
  // Resolve batter/pitcher IDs
  const batterId = selectedBatter?.id || parseInt($batterInput.value, 10);
  const pitcherId = selectedPitcher?.id || parseInt($pitcherInput.value, 10);

  if (!batterId || !pitcherId || isNaN(batterId) || isNaN(pitcherId)) {
    $status.textContent = 'MISSING INPUT';
    $status.className = 'dash-status error';
    return;
  }

  const batSide = getSelectedBatSide();
  const pitHand = getSelectedPitHand();

  $runBtn.disabled = true;
  $status.textContent = 'RUNNING';
  $status.className = 'dash-status running';
  $resultsPanel.hidden = true;
  $emptyState.hidden = true;

  try {
    const res = await fetch(`${API_BASE}/matchup-machine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batter_id: batterId,
        pitcher_id: pitcherId,
        bat_side: batSide,
        pitch_hand: pitHand,
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.status === 'model_not_loaded') {
      $status.textContent = 'MODEL OFFLINE';
      $status.className = 'dash-status error';
      $emptyState.hidden = false;
      return;
    }

    if (data.status === 'not_found') {
      $status.textContent = 'NOT IN LINEUP';
      $status.className = 'dash-status error';
      $resultsPanel.hidden = true;
      $resultHeader.innerHTML = `<div class="result-sub">This matchup is not in today's lineup data. Only today's scheduled batters vs opposing starters are available on prod.</div>`;
      $resultsPanel.hidden = false;
      return;
    }

    if (data.status !== 'ok') {
      throw new Error(data.message || 'Unknown error');
    }

    renderResults(data, batterId, pitcherId, batSide, pitHand);
    $status.textContent = 'COMPLETE';
    $status.className = 'dash-status live';
  } catch (err) {
    $status.textContent = 'ERROR';
    $status.className = 'dash-status error';
    console.error('Matchup inference failed:', err);
  } finally {
    $runBtn.disabled = false;
  }
}

// ── Render Results ──────────────────────────────────────────────────

function renderResults(data, batterId, pitcherId, batSide, pitHand) {
  $resultsPanel.hidden = false;

  const batterName = selectedBatter?.name || `#${batterId}`;
  const pitcherName = selectedPitcher?.name || `#${pitcherId}`;
  const rating = data.rating;
  const probs = data.outcome_probs;

  // Header
  $resultHeader.innerHTML = `
    <div class="result-matchup">${batterName} <span style="color: var(--text-dim)">vs</span> ${pitcherName}</div>
    <div class="result-sub">BAT ${batSide} / THROW ${pitHand}</div>
  `;

  // VS Score gauge
  const vs = rating.vs_score;
  const scoreClass = vs > 5 ? 'positive' : vs < -5 ? 'negative' : 'neutral';
  $vsScore.textContent = (vs > 0 ? '+' : '') + vs.toFixed(1);
  $vsScore.className = `vs-score ${scoreClass}`;

  // Gauge: 50% = center (neutral), range -100 to +100 → 0% to 100%
  const needlePos = 50 + (vs / 100) * 50;
  $vsGaugeNeedle.style.left = `${needlePos}%`;

  // Fill from center
  if (vs >= 0) {
    $vsGaugeFill.className = 'vs-gauge-fill batter';
    $vsGaugeFill.style.left = '50%';
    $vsGaugeFill.style.width = `${(vs / 100) * 50}%`;
  } else {
    $vsGaugeFill.className = 'vs-gauge-fill pitcher';
    $vsGaugeFill.style.left = `${50 + (vs / 100) * 50}%`;
    $vsGaugeFill.style.width = `${(-vs / 100) * 50}%`;
  }

  // Outcome probabilities
  const outcomeOrder = [
    { key: 'strikeout', label: 'K',    neg: true },
    { key: 'walk',      label: 'BB',   neg: false },
    { key: 'single',    label: '1B',   neg: false },
    { key: 'double',    label: '2B',   neg: false },
    { key: 'triple',    label: '3B',   neg: false },
    { key: 'home_run',  label: 'HR',   neg: false },
    { key: 'out_fly',   label: 'FLY',  neg: true },
    { key: 'out_ground', label: 'GB',  neg: true },
    { key: 'out_popup', label: 'POP',  neg: true },
    { key: 'hbp',       label: 'HBP',  neg: false },
  ];

  const maxProb = Math.max(...Object.values(probs));

  $outcomesGrid.innerHTML = outcomeOrder.map(o => {
    const p = probs[o.key] || 0;
    const pct = (p * 100).toFixed(1);
    const barW = (p / maxProb * 100).toFixed(1);
    const isHighlight = !o.neg && p > 0.05;
    const cls = o.neg ? 'negative' : (isHighlight ? 'highlight' : '');
    return `
      <div class="outcome-card ${cls}">
        <span class="outcome-label">${o.label}</span>
        <span class="outcome-pct">${pct}%</span>
        <div class="outcome-bar"><div class="outcome-bar-fill" style="width: ${barW}%"></div></div>
      </div>
    `;
  }).join('');

  // Component ratings (100 = league avg)
  const comps = rating.component_ratings;
  $componentsRow.innerHTML = ['power', 'contact', 'discipline'].map(key => {
    const val = comps[key];
    const cls = val > 105 ? 'above' : val < 95 ? 'below' : 'avg';
    const label = val > 100 ? 'above avg' : val < 100 ? 'below avg' : 'average';
    return `
      <div class="component-card">
        <span class="component-label">${key.toUpperCase()}</span>
        <span class="component-value ${cls}">${val.toFixed(0)}</span>
        <span class="component-sub">${label}</span>
      </div>
    `;
  }).join('');

  // Stat line
  $statLine.innerHTML = [
    { key: 'K%', val: (rating.k_rate * 100).toFixed(1) + '%' },
    { key: 'BB%', val: (rating.bb_rate * 100).toFixed(1) + '%' },
    { key: 'HR%', val: (rating.hr_rate * 100).toFixed(1) + '%' },
    { key: 'OBP', val: rating.obp.toFixed(3) },
    { key: 'SLG', val: rating.slg_approx.toFixed(3) },
    { key: 'xRV', val: (rating.expected_rv > 0 ? '+' : '') + rating.expected_rv.toFixed(3) },
  ].map(s => `
    <div class="stat-item">
      <span class="stat-key">${s.key}</span>
      <span class="stat-val">${s.val}</span>
    </div>
  `).join('');
}

// ── Keyboard shortcut ───────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !$runBtn.disabled) {
    const active = document.activeElement;
    if (active === $batterInput || active === $pitcherInput || active === $runBtn) {
      runMatchup();
    }
  }
});

// ── Init ────────────────────────────────────────────────────────────

loadRoster();
