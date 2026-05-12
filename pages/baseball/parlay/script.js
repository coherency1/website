/* === Diamond Engine — Parlay Calculator
   Build parlays from sim prop data, compute fair joint probability
   ================================================================== */

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : '/api/diamond';

const $gamePicker    = document.getElementById('gamePicker');
const $availProps    = document.getElementById('availableProps');
const $selectedLegs  = document.getElementById('selectedLegs');
const $legCount      = document.getElementById('legCount');
const $summary       = document.getElementById('parlaySummary');
const $fairProb      = document.getElementById('fairProb');
const $fairOdds      = document.getElementById('fairOdds');
const $fairPayout    = document.getElementById('fairPayout');
const $bookOdds      = document.getElementById('bookOdds');
const $compareBtn    = document.getElementById('compareBtn');
const $edgeResult    = document.getElementById('edgeResult');
const $bookImplied   = document.getElementById('bookImplied');
const $fairProbComp  = document.getElementById('fairProbCompare');
const $edgeValue     = document.getElementById('edgeValue');
const $clearBtn      = document.getElementById('clearBtn');
const $date          = document.getElementById('dashDate');
const $status        = document.getElementById('dashStatus');
const $empty         = document.getElementById('emptyState');

let simData = null;
let parlayLegs = []; // [{ playerName, team, stat, line, overPct, desc }]

// ── Stat labels ─────────────────────────────────────────────────────

const STAT_LABELS = {
  h: 'Hits', tb: 'Total Bases', hr: 'Home Runs', r: 'Runs',
  rbi: 'RBI', k: 'Strikeouts', bb: 'Walks',
};

// ── Load Data ───────────────────────────────────────────────────────

async function loadData() {
  try {
    const res = await fetch(`${API_BASE}/sim-results/${todayISO()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    simData = await res.json();
    renderGamePicker();
    $status.textContent = 'LIVE';
    $status.className = 'dash-status live';
    $date.textContent = simData.sim_date || todayISO();
  } catch (err) {
    $status.textContent = 'OFFLINE';
    $status.className = 'dash-status error';
    $empty.hidden = false;
    console.warn('Diamond Engine API unavailable:', err.message);
  }
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Game Picker ─────────────────────────────────────────────────────

function renderGamePicker() {
  const games = simData?.games || [];
  if (!games.length) {
    $empty.hidden = false;
    return;
  }

  $gamePicker.innerHTML = games.map((g, i) =>
    `<option value="${i}">${g.away_team} @ ${g.home_team}</option>`
  ).join('');

  $gamePicker.addEventListener('change', () => renderPropsForGame(parseInt($gamePicker.value, 10)));
  renderPropsForGame(0);
}

// ── Render Available Props ──────────────────────────────────────────

function renderPropsForGame(idx) {
  const game = simData.games[idx];
  if (!game) return;

  const props = game.props || {};
  const players = game.players || {};
  if (!Object.keys(props).length) {
    $availProps.innerHTML = '<div style="color: var(--text-dim); font-size: 11px; padding: 8px 0;">No prop data for this game.</div>';
    return;
  }

  // Group props by player
  let html = '';
  for (const [pid, pdata] of Object.entries(props)) {
    const playerInfo = players[pid] || {};
    const name = playerInfo.name || pdata.name || `#${pid}`;
    const team = playerInfo.team || pdata.team || '';
    const propList = pdata.props || [];

    if (!propList.length) continue;

    html += `<div class="prop-player-group">`;
    html += `<div class="prop-player-name">${name} <span class="prop-player-team">${team}</span></div>`;
    html += `<div class="prop-chips">`;

    for (const prop of propList) {
      const stat = prop.stat;
      const line = prop.line;
      const overPct = prop.over_pct;
      const label = stat.toUpperCase();
      const pctStr = (overPct * 100).toFixed(0);
      const legId = `${pid}_${stat}_${line}`;
      const isSelected = parlayLegs.some(l => l.id === legId);

      html += `<div class="prop-chip ${isSelected ? 'selected' : ''}" data-leg-id="${legId}" data-pid="${pid}" data-name="${name}" data-team="${team}" data-stat="${stat}" data-line="${line}" data-over-pct="${overPct}">
        <span class="chip-stat">${label}</span>
        <span class="chip-line">o${line}</span>
        <span class="chip-pct">${pctStr}%</span>
      </div>`;
    }

    html += `</div></div>`;
  }

  $availProps.innerHTML = html;

  // Bind chip clicks
  $availProps.querySelectorAll('.prop-chip').forEach(chip => {
    chip.addEventListener('click', () => toggleLeg(chip));
  });
}

// ── Leg Management ──────────────────────────────────────────────────

function toggleLeg(chip) {
  const legId = chip.dataset.legId;
  const existing = parlayLegs.findIndex(l => l.id === legId);

  if (existing !== -1) {
    parlayLegs.splice(existing, 1);
    chip.classList.remove('selected');
  } else {
    parlayLegs.push({
      id: legId,
      pid: chip.dataset.pid,
      playerName: chip.dataset.name,
      team: chip.dataset.team,
      stat: chip.dataset.stat,
      line: parseFloat(chip.dataset.line),
      overPct: parseFloat(chip.dataset.overPct),
    });
    chip.classList.add('selected');
  }

  renderSelectedLegs();
  updateSummary();
}

function removeLeg(legId) {
  parlayLegs = parlayLegs.filter(l => l.id !== legId);
  // Unselect the chip
  const chip = $availProps.querySelector(`[data-leg-id="${legId}"]`);
  if (chip) chip.classList.remove('selected');
  renderSelectedLegs();
  updateSummary();
}

function renderSelectedLegs() {
  $legCount.textContent = `${parlayLegs.length} LEG${parlayLegs.length !== 1 ? 'S' : ''}`;

  if (!parlayLegs.length) {
    $selectedLegs.innerHTML = '';
    return;
  }

  $selectedLegs.innerHTML = parlayLegs.map(leg => {
    const statLabel = STAT_LABELS[leg.stat] || leg.stat.toUpperCase();
    return `
      <div class="leg-card">
        <span class="leg-info">${leg.playerName} — Over ${leg.line} ${statLabel}</span>
        <div style="display: flex; align-items: center;">
          <span class="leg-prob">${(leg.overPct * 100).toFixed(1)}%</span>
          <button class="leg-remove" data-leg-id="${leg.id}">&times;</button>
        </div>
      </div>
    `;
  }).join('');

  $selectedLegs.querySelectorAll('.leg-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeLeg(btn.dataset.legId);
    });
  });
}

// ── Parlay Math ─────────────────────────────────────────────────────

function updateSummary() {
  if (parlayLegs.length < 2) {
    $summary.hidden = true;
    return;
  }

  $summary.hidden = false;

  // Naive independence: multiply individual probabilities
  const fairP = parlayLegs.reduce((acc, leg) => acc * leg.overPct, 1.0);
  const payout = 1.0 / fairP;
  const americanOdds = probToAmerican(fairP);

  $fairProb.textContent = (fairP * 100).toFixed(2) + '%';
  $fairOdds.textContent = americanOdds;
  $fairPayout.textContent = '$' + payout.toFixed(2);

  // Reset edge comparison
  $edgeResult.hidden = true;
}

function probToAmerican(p) {
  if (p <= 0 || p >= 1) return '--';
  if (p >= 0.5) {
    return Math.round(-100 * p / (1 - p)).toString();
  } else {
    return '+' + Math.round(100 * (1 - p) / p).toString();
  }
}

function americanToProb(odds) {
  const n = parseInt(odds.replace('+', ''), 10);
  if (isNaN(n)) return null;
  if (odds.startsWith('+') || n > 0) {
    return 100 / (n + 100);
  } else {
    const absN = Math.abs(n);
    return absN / (absN + 100);
  }
}

// ── Book Comparison ─────────────────────────────────────────────────

$compareBtn.addEventListener('click', compareEdge);

function compareEdge() {
  const oddsStr = $bookOdds.value.trim();
  if (!oddsStr) return;

  const bookProb = americanToProb(oddsStr);
  if (bookProb === null) return;

  const fairP = parlayLegs.reduce((acc, leg) => acc * leg.overPct, 1.0);
  const edge = fairP - bookProb;

  $bookImplied.textContent = (bookProb * 100).toFixed(2) + '%';
  $fairProbComp.textContent = (fairP * 100).toFixed(2) + '%';

  const edgePct = (edge * 100).toFixed(2);
  const $ev = document.getElementById('edgeValue');
  $ev.textContent = (edge > 0 ? '+' : '') + edgePct + '%';
  $ev.className = `edge-value ${edge > 0 ? 'positive' : 'negative'}`;

  $edgeResult.hidden = false;
}

// ── Clear ───────────────────────────────────────────────────────────

$clearBtn.addEventListener('click', () => {
  parlayLegs = [];
  $availProps.querySelectorAll('.prop-chip.selected').forEach(c => c.classList.remove('selected'));
  renderSelectedLegs();
  updateSummary();
  $edgeResult.hidden = true;
});

// ── Init ────────────────────────────────────────────────────────────

$date.textContent = todayISO();
loadData();
