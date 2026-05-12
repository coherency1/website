/* === Diamond Engine — F5 / YRFI Dashboard
   First Five Innings projections + Yes/No Run First Inning
   ================================================================== */

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : '/api/diamond';

const $grid   = document.getElementById('cardsGrid');
const $date   = document.getElementById('dashDate');
const $status = document.getElementById('dashStatus');
const $empty  = document.getElementById('emptyState');

let simData = null;
let currentView = 'yrfi';

// ── Load ────────────────────────────────────────────────────────────

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

// ── Render ──────────────────────────────────────────────────────────

function render() {
  if (!simData || !simData.games || !simData.games.length) {
    $empty.hidden = false;
    $grid.innerHTML = '';
    return;
  }
  $empty.hidden = true;

  if (currentView === 'yrfi') {
    renderYRFI();
  } else {
    renderF5();
  }
}

function renderYRFI() {
  const games = simData.games
    .map(g => ({
      away: g.away_team,
      home: g.home_team,
      yrfi_pct: g.yrfi?.yrfi_pct || g.yrfi?.yrfi || 0,
      nrfi_pct: g.yrfi?.nrfi_pct || g.yrfi?.nrfi || 0,
    }))
    .sort((a, b) => b.yrfi_pct - a.yrfi_pct);

  $grid.innerHTML = games.map(g => {
    const yPct = (g.yrfi_pct * 100).toFixed(1);
    const nPct = (g.nrfi_pct * 100).toFixed(1);
    const isYes = g.yrfi_pct > 0.5;

    return `
      <div class="yrfi-card">
        <div class="yrfi-matchup">
          <span class="yrfi-teams">${g.away} @ ${g.home}</span>
          <span class="yrfi-badge ${isYes ? 'yes' : 'no'}">${isYes ? 'YRFI' : 'NRFI'}</span>
        </div>
        <div class="yrfi-bar-wrap">
          <div class="yrfi-bar-yes" style="width: ${yPct}%"></div>
          <div class="yrfi-bar-no" style="width: ${nPct}%"></div>
        </div>
        <div class="yrfi-labels">
          <span class="yrfi-label-yes">YRFI ${yPct}%</span>
          <span class="yrfi-label-no">NRFI ${nPct}%</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderF5() {
  const games = simData.games.map(g => {
    const f5 = g.f5 || {};
    return {
      away: g.away_team,
      home: g.home_team,
      away_win: f5.away_win_pct || 0,
      home_win: f5.home_win_pct || 0,
      away_ml: f5.away_moneyline || 0,
      home_ml: f5.home_moneyline || 0,
      total: f5.total_mean || 0,
    };
  });

  $grid.innerHTML = games.map(g => {
    const awayFav = g.away_win > g.home_win;
    return `
      <div class="f5-card">
        <div class="f5-matchup">${g.away} @ ${g.home}</div>
        <div class="f5-row">
          <span class="f5-label">${g.away} Win</span>
          <span class="f5-value ${awayFav ? 'fav' : ''}">${(g.away_win * 100).toFixed(1)}%</span>
        </div>
        <div class="f5-row">
          <span class="f5-label">${g.home} Win</span>
          <span class="f5-value ${!awayFav ? 'fav' : ''}">${(g.home_win * 100).toFixed(1)}%</span>
        </div>
        <div class="f5-row">
          <span class="f5-label">F5 Total</span>
          <span class="f5-value">${g.total ? g.total.toFixed(1) : '--'}</span>
        </div>
        <div class="f5-row">
          <span class="f5-label">F5 ML</span>
          <span class="f5-value">${g.away} ${fmtML(g.away_ml)} / ${g.home} ${fmtML(g.home_ml)}</span>
        </div>
      </div>
    `;
  }).join('');
}

function fmtML(ml) {
  if (!ml) return '--';
  return ml > 0 ? `+${ml}` : `${ml}`;
}

// ── Toggle ──────────────────────────────────────────────────────────

document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelector('.toggle-btn.active')?.classList.remove('active');
    btn.classList.add('active');
    currentView = btn.dataset.view;
    render();
  });
});

// ── Init ────────────────────────────────────────────────────────────

$date.textContent = todayISO();
loadData();
