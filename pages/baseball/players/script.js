/* === Diamond Engine — Player Lookup
   Fetches sim-results, builds roster, renders per-player projection
   card with stat grid and prop lines on player selection.
   ================================================================== */

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : '/api/diamond';

const $searchInput  = document.getElementById('searchInput');
const $suggList     = document.getElementById('suggestionList');
const $playerCard   = document.getElementById('playerCard');
const $emptyState   = document.getElementById('emptyState');
const $noDataState  = document.getElementById('noDataState');
const $status       = document.getElementById('dashStatus');
const $dashDate     = document.getElementById('dashDate');

const $playerName   = document.getElementById('playerName');
const $teamBadge    = document.getElementById('teamBadge');
const $matchupLabel = document.getElementById('matchupLabel');
const $batSide      = document.getElementById('batSide');
const $projGrid     = document.getElementById('projGrid');
const $propsSection = document.getElementById('propsSection');
const $propsList    = document.getElementById('propsList');

// ── State ───────────────────────────────────────────────────────────

let simData  = null;
let roster   = []; // [{ id, name, team, bat_side, game_id, away_team, home_team }]
let statMaxes = {}; // { pa_mean: number, h_mean: number, ... } — across all players for proportional bars

// ── Helpers ─────────────────────────────────────────────────────────

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmt1(n) {
  return (n == null || isNaN(n)) ? '—' : Number(n).toFixed(1);
}

// ── Load sim data ────────────────────────────────────────────────────

async function loadData() {
  $status.textContent = 'LOADING';
  $status.className = 'dash-status loading';

  try {
    const res = await fetch(`${API_BASE}/sim-results/${todayISO()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    simData = await res.json();

    $dashDate.textContent = simData.sim_date || todayISO();
    buildRoster(simData);

    if (roster.length === 0) {
      $status.textContent = 'NO DATA';
      $status.className = 'dash-status error';
      $emptyState.hidden = true;
      $noDataState.hidden = false;
      return;
    }

    $status.textContent = 'LIVE';
    $status.className = 'dash-status live';
  } catch (err) {
    $status.textContent = 'OFFLINE';
    $status.className = 'dash-status error';
    $emptyState.hidden = true;
    $noDataState.hidden = false;
    console.warn('Diamond Engine API unavailable:', err.message);
  }
}

// ── Build roster & stat maxes ────────────────────────────────────────

const MEAN_KEYS = ['pa_mean', 'h_mean', 'hr_mean', 'k_mean', 'bb_mean', 'r_mean', 'rbi_mean', 'tb_mean'];

function buildRoster(data) {
  const seen = new Set();
  statMaxes = {};

  for (const g of (data.games || [])) {
    for (const [pid, pdata] of Object.entries(g.players || {})) {
      if (!seen.has(pid)) {
        seen.add(pid);
        roster.push({
          id: parseInt(pid, 10),
          name: pdata.name || `#${pid}`,
          team: pdata.team || '',
          bat_side: pdata.bat_side || 'R',
          game_id: g.game_id,
          away_team: g.away_team,
          home_team: g.home_team,
        });
      }

      // Track maxes across all player instances
      for (const key of MEAN_KEYS) {
        const v = pdata[key];
        if (v != null && !isNaN(v)) {
          statMaxes[key] = Math.max(statMaxes[key] || 0, v);
        }
      }
    }
  }

  roster.sort((a, b) => a.name.localeCompare(b.name));
}

// ── Autocomplete ─────────────────────────────────────────────────────

$searchInput.addEventListener('input', () => {
  const q = $searchInput.value.trim().toLowerCase();
  if (q.length < 2 || roster.length === 0) {
    $suggList.classList.remove('open');
    return;
  }

  const matches = roster
    .filter(p => p.name.toLowerCase().includes(q))
    .slice(0, 10);

  if (!matches.length) {
    $suggList.classList.remove('open');
    return;
  }

  $suggList.innerHTML = matches.map(p => {
    const matchup = `${p.away_team} @ ${p.home_team}`;
    return `
      <div class="suggestion-item"
           data-id="${p.id}"
           data-game="${p.game_id}">
        <span class="sug-name">${p.name}</span>
        <span class="sug-team">${p.team}</span>
        <span class="sug-game">${matchup}</span>
      </div>
    `;
  }).join('');
  $suggList.classList.add('open');

  $suggList.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', () => {
      const pid  = parseInt(item.dataset.id, 10);
      const gid  = parseInt(item.dataset.game, 10);
      $searchInput.value = item.querySelector('.sug-name').textContent;
      $suggList.classList.remove('open');
      selectPlayer(pid, gid);
    });
  });
});

$searchInput.addEventListener('blur', () => {
  setTimeout(() => $suggList.classList.remove('open'), 200);
});

$searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    $suggList.classList.remove('open');
    $searchInput.blur();
  }
});

// ── Select player ────────────────────────────────────────────────────

function selectPlayer(playerId, gameId) {
  const game = simData?.games?.find(g => g.game_id === gameId);
  if (!game) return;

  const pid    = String(playerId);
  const pdata  = (game.players || {})[pid];
  const pProps = (game.props   || {})[pid];

  if (!pdata) return;

  // Header
  $playerName.textContent   = pdata.name || `#${pid}`;
  $teamBadge.textContent    = pdata.team || '???';
  $matchupLabel.textContent = `${game.away_team} @ ${game.home_team}`;
  $batSide.textContent      = `BATS ${pdata.bat_side || 'R'}`;

  // Projection grid
  renderProjGrid(pdata);

  // Props
  if (pProps && pProps.props && pProps.props.length > 0) {
    renderProps(pProps.props);
    $propsSection.hidden = false;
  } else {
    $propsSection.hidden = true;
  }

  // Show card
  $emptyState.hidden = true;
  $noDataState.hidden = true;
  $playerCard.hidden = false;
}

// ── Projection grid ──────────────────────────────────────────────────

const PROJ_STATS = [
  { key: 'pa_mean',  label: 'PA'  },
  { key: 'h_mean',   label: 'H'   },
  { key: 'hr_mean',  label: 'HR'  },
  { key: 'k_mean',   label: 'K'   },
  { key: 'bb_mean',  label: 'BB'  },
  { key: 'r_mean',   label: 'R'   },
  { key: 'rbi_mean', label: 'RBI' },
  { key: 'tb_mean',  label: 'TB'  },
];

function renderProjGrid(pdata) {
  $projGrid.innerHTML = PROJ_STATS.map(s => {
    const val = pdata[s.key];
    const max = statMaxes[s.key] || 1;
    const pct = val != null ? Math.min(100, (val / max) * 100).toFixed(1) : 0;
    return `
      <div class="proj-card">
        <span class="proj-label">${s.label}</span>
        <span class="proj-value">${fmt1(val)}</span>
        <div class="proj-bar-track">
          <div class="proj-bar-fill" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ── Props ────────────────────────────────────────────────────────────

const PROP_LABELS = {
  hits:          'HITS',
  total_bases:   'TOTAL BASES',
  home_runs:     'HOME RUNS',
  strikeouts:    'STRIKEOUTS',
  walks:         'WALKS',
  runs:          'RUNS',
  rbi:           'RBI',
  stolen_bases:  'STOLEN BASES',
};

function propColorClass(overPct) {
  if (overPct >= 0.55) return 'hot';
  if (overPct <= 0.45) return 'cold';
  return 'mid';
}

function renderProps(props) {
  $propsList.innerHTML = props.map(p => {
    const overPct   = p.over_pct ?? 0;
    const underPct  = p.under_pct ?? 0;
    const cls       = propColorClass(overPct);
    const barWidth  = (overPct * 100).toFixed(1);
    const label     = PROP_LABELS[p.stat] || p.stat.toUpperCase();

    return `
      <div class="prop-row">
        <span class="prop-stat">${label}</span>
        <span class="prop-line">o${p.line}</span>
        <div class="prop-bar-wrap">
          <div class="prop-split-bar">
            <div class="prop-over-fill ${cls}" style="width: ${barWidth}%"></div>
          </div>
          <div class="prop-pcts">
            <span class="prop-over-pct ${cls}">${(overPct * 100).toFixed(0)}% OVER</span>
            <span class="prop-under-pct">${(underPct * 100).toFixed(0)}% UNDER</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ── Init ─────────────────────────────────────────────────────────────

loadData();
