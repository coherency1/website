/* === Diamond Engine — Strikeout Center
   K Leaders: top 30 batters by K% across all games
   K Matchups: top 30 batter/pitcher pairs by strikeout probability
   ================================================================== */

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : '/api/diamond';

const $list   = document.getElementById('kList');
const $date   = document.getElementById('dashDate');
const $count  = document.getElementById('dashCount');
const $status = document.getElementById('dashStatus');
const $empty  = document.getElementById('emptyState');

let simData    = null;
let currentView = 'leaders';

// ── Load ─────────────────────────────────────────────────────────────

async function loadData() {
  try {
    const res = await fetch(`${API_BASE}/sim-results/${todayISO()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    simData = await res.json();
    $date.textContent = simData.sim_date || todayISO();
    $status.textContent = 'LIVE';
    $status.className = 'dash-status live';
    render();
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

// ── View Toggle ──────────────────────────────────────────────────────

document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentView = btn.dataset.view;
    render();
  });
});

// ── Render dispatcher ────────────────────────────────────────────────

function render() {
  if (!simData || !simData.games || !simData.games.length) {
    $empty.hidden = false;
    $list.innerHTML = '';
    $count.textContent = '';
    return;
  }
  $empty.hidden = true;

  if (currentView === 'leaders') {
    renderLeaders();
  } else {
    renderMatchups();
  }
}

// ── K LEADERS ────────────────────────────────────────────────────────

function renderLeaders() {
  // Collect all qualifying players across games
  const players = [];

  simData.games.forEach(game => {
    const gameLabel = `${game.away_team} @ ${game.home_team}`;
    const playerMap = game.players || {};

    Object.entries(playerMap).forEach(([id, p]) => {
      if ((p.pa_mean || 0) < 2.0) return;
      players.push({
        id,
        name:    p.name     || `Player ${id}`,
        team:    p.team     || '—',
        game:    gameLabel,
        k_pct:   p.k_pct   || 0,
        k_mean:  p.k_mean   || 0,
        pa_mean: p.pa_mean  || 0,
      });
    });
  });

  // Sort by K% descending, take top 30
  players.sort((a, b) => b.k_pct - a.k_pct);
  const top30 = players.slice(0, 30);

  const maxKPct = top30.length ? top30[0].k_pct : 1;

  $count.textContent = `${top30.length} PLAYERS`;

  if (!top30.length) {
    $empty.hidden = false;
    $list.innerHTML = '';
    return;
  }

  const headerHtml = `
    <div class="k-header-row leaders">
      <span>PLAYER</span>
      <span style="text-align:right">K%</span>
      <span style="text-align:right">PROJ K</span>
      <span class="col-pa" style="text-align:right">PA</span>
      <span class="col-bar"></span>
    </div>`;

  const rowsHtml = top30.map((p, i) => {
    const kPctPct   = (p.k_pct * 100).toFixed(1);
    const kHighClass = p.k_pct > 0.25 ? 'k-pct-high' : 'k-pct-normal';
    const barWidth  = maxKPct > 0 ? Math.round((p.k_pct / maxKPct) * 100) : 0;
    const rankLabel = String(i + 1).padStart(2, '0');

    return `
      <div class="leader-row">
        <div>
          <div>
            <span class="leader-rank">${rankLabel}</span>
            <span class="leader-name">${escHtml(p.name)}</span>
            <span class="leader-team-badge"> ${escHtml(p.team)}</span>
          </div>
          <div class="leader-game">${escHtml(p.game)}</div>
        </div>
        <span class="stat-cell ${kHighClass}">${kPctPct}%</span>
        <span class="stat-cell proj-k">${p.k_mean.toFixed(2)}</span>
        <span class="stat-cell pa-val">${p.pa_mean.toFixed(1)}</span>
        <div class="k-bar-wrap">
          <div class="k-bar-fill" style="width:${barWidth}%"></div>
        </div>
      </div>`;
  }).join('');

  $list.innerHTML = headerHtml + rowsHtml;
}

// ── K MATCHUPS ────────────────────────────────────────────────────────

function renderMatchups() {
  // Collect all matchup_matrix entries across games
  const matchups = [];

  simData.games.forEach(game => {
    const matrix = game.matchup_matrix || {};
    Object.values(matrix).forEach(m => {
      const probs  = m.outcome_probs || {};
      const rating = m.rating        || {};
      matchups.push({
        batter_name:  m.batter_name  || `Batter ${m.batter_id}`,
        pitcher_name: m.pitcher_name || `Pitcher ${m.pitcher_id}`,
        k_prob:   probs.strikeout || 0,
        bb_prob:  probs.walk      || 0,
        hr_prob:  probs.home_run  || 0,
        vs_score: rating.vs_score || rating.k_rate || 0,
      });
    });
  });

  // Sort by K probability descending, top 30
  matchups.sort((a, b) => b.k_prob - a.k_prob);
  const top30 = matchups.slice(0, 30);

  $count.textContent = `${top30.length} MATCHUPS`;

  if (!top30.length) {
    $empty.hidden = false;
    $list.innerHTML = '';
    return;
  }

  const maxK = top30.length ? top30[0].k_prob : 1;

  const headerHtml = `
    <div class="k-header-row matchups">
      <span>MATCHUP</span>
      <span style="text-align:right">K%</span>
      <span style="text-align:right">BB%</span>
      <span class="col-hr" style="text-align:right">HR%</span>
      <span class="col-vs" style="text-align:right">VS</span>
      <span class="col-bar"></span>
    </div>`;

  const rowsHtml = top30.map((m, i) => {
    const kPct     = (m.k_prob * 100).toFixed(1);
    const bbPct    = (m.bb_prob * 100).toFixed(1);
    const hrPct    = (m.hr_prob * 100).toFixed(1);
    const kHigh    = m.k_prob > 0.25 ? 'k-pct-high' : 'k-pct-normal';
    const barWidth = maxK > 0 ? Math.round((m.k_prob / maxK) * 100) : 0;
    const vsDisp   = typeof m.vs_score === 'number' ? m.vs_score.toFixed(1) : '—';
    const rankLabel = String(i + 1).padStart(2, '0');

    return `
      <div class="matchup-row">
        <div class="matchup-players">
          <span class="matchup-batter">${rankLabel}. ${escHtml(m.batter_name)}</span>
          <span class="matchup-vs">vs</span>
          <span class="matchup-pitcher">${escHtml(m.pitcher_name)}</span>
        </div>
        <span class="stat-cell ${kHigh}">${kPct}%</span>
        <span class="stat-cell" style="color:var(--blue);text-align:right">${bbPct}%</span>
        <span class="stat-cell hr-pct" style="color:var(--amber);text-align:right">${hrPct}%</span>
        <span class="vs-score">${vsDisp}</span>
        <div class="k-bar-wrap">
          <div class="k-bar-fill" style="width:${barWidth}%"></div>
        </div>
      </div>`;
  }).join('');

  $list.innerHTML = headerHtml + rowsHtml;
}

// ── Utilities ─────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Init ──────────────────────────────────────────────────────────────

loadData();
