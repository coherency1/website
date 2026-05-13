/* === Diamond Engine — Export Center
   Fetches sim results → generates client-side CSV/JSON downloads
   ============================================================== */

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : '/api/diamond';

const $date        = document.getElementById('dashDate');
const $status      = document.getElementById('dashStatus');
const $exportGrid  = document.getElementById('exportGrid');
const $emptyState  = document.getElementById('emptyState');

const $countPlayers  = document.getElementById('countPlayers');
const $countGames    = document.getElementById('countGames');
const $countFull     = document.getElementById('countFull');
const $countMatchups = document.getElementById('countMatchups');

const $btnPlayers  = document.getElementById('btnPlayers');
const $btnGames    = document.getElementById('btnGames');
const $btnFull     = document.getElementById('btnFull');
const $btnMatchups = document.getElementById('btnMatchups');

let simData = null;

// ── Helpers ─────────────────────────────────────────────────────────

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCSV(fields) {
  return fields.map(escapeCSV).join(',');
}

function fmt(val, decimals = 2) {
  if (val === null || val === undefined) return '';
  return Number(val).toFixed(decimals);
}

// ── Data extraction helpers ──────────────────────────────────────────

function extractPlayers(data) {
  const rows = [];
  for (const game of (data.games || [])) {
    const gameLabel = `${game.away_team}@${game.home_team}`;
    for (const [, player] of Object.entries(game.players || {})) {
      rows.push({
        name:  player.name  || '',
        team:  player.team  || '',
        game:  gameLabel,
        pa:    player.pa_mean,
        h:     player.h_mean,
        hr:    player.hr_mean,
        k:     player.k_mean,
        bb:    player.bb_mean,
        r:     player.r_mean,
        rbi:   player.rbi_mean,
        sb:    player.sb_mean,
        tb:    player.tb_mean,
      });
    }
  }
  return rows;
}

function extractGames(data) {
  return (data.games || []).map(g => {
    const game = g.game || {};
    return {
      away_team:    g.away_team  || '',
      home_team:    g.home_team  || '',
      away_win_pct: game.away_win_pct,
      home_win_pct: game.home_win_pct,
      away_ml:      game.away_moneyline,
      home_ml:      game.home_moneyline,
      total:        game.total_mean,
    };
  });
}

function extractMatchups(data) {
  const rows = [];
  for (const game of (data.games || [])) {
    for (const entry of (game.matchup_matrix || [])) {
      rows.push({
        batter_name:  entry.batter_name  || '',
        pitcher_name: entry.pitcher_name || '',
        k_prob:       entry.k_prob,
        bb_prob:      entry.bb_prob,
        hr_prob:      entry.hr_prob,
        vs_score:     entry.vs_score,
      });
    }
  }
  return rows;
}

// ── CSV generators ───────────────────────────────────────────────────

function buildPlayerCSV(data) {
  const players = extractPlayers(data);
  const header  = rowToCSV(['name', 'team', 'game', 'pa', 'h', 'hr', 'k', 'bb', 'r', 'rbi', 'sb', 'tb']);
  const body    = players.map(p =>
    rowToCSV([p.name, p.team, p.game,
      fmt(p.pa), fmt(p.h), fmt(p.hr), fmt(p.k),
      fmt(p.bb), fmt(p.r), fmt(p.rbi), fmt(p.sb), fmt(p.tb)])
  );
  return [header, ...body].join('\n');
}

function buildGamesCSV(data) {
  const games  = extractGames(data);
  const header = rowToCSV(['away_team', 'home_team', 'away_win%', 'home_win%', 'away_ml', 'home_ml', 'total']);
  const body   = games.map(g =>
    rowToCSV([g.away_team, g.home_team,
      fmt(g.away_win_pct), fmt(g.home_win_pct),
      g.away_ml !== undefined ? String(g.away_ml) : '',
      g.home_ml !== undefined ? String(g.home_ml) : '',
      fmt(g.total)])
  );
  return [header, ...body].join('\n');
}

function buildMatchupCSV(data) {
  const matchups = extractMatchups(data);
  const header   = rowToCSV(['batter_name', 'pitcher_name', 'k_prob', 'bb_prob', 'hr_prob', 'vs_score']);
  const body     = matchups.map(m =>
    rowToCSV([m.batter_name, m.pitcher_name,
      fmt(m.k_prob, 4), fmt(m.bb_prob, 4), fmt(m.hr_prob, 4), fmt(m.vs_score, 4)])
  );
  return [header, ...body].join('\n');
}

// ── UI updates ───────────────────────────────────────────────────────

function updateCounts(data) {
  const playerCount  = extractPlayers(data).length;
  const gameCount    = (data.games || []).length;
  const matchupCount = extractMatchups(data).length;

  $countPlayers.textContent  = `${playerCount} player${playerCount !== 1 ? 's' : ''}`;
  $countGames.textContent    = `${gameCount} game${gameCount !== 1 ? 's' : ''}`;
  $countFull.textContent     = `${gameCount} game${gameCount !== 1 ? 's' : ''}`;
  $countMatchups.textContent = matchupCount > 0
    ? `${matchupCount} matchup${matchupCount !== 1 ? 's' : ''}`
    : 'no matchup matrix';

  [$countPlayers, $countGames, $countFull, $countMatchups].forEach(el => {
    el.classList.add('ready');
  });
}

function enableButtons(data) {
  const date = data.sim_date || todayISO();

  $btnPlayers.disabled = false;
  $btnPlayers.addEventListener('click', () => {
    downloadBlob(buildPlayerCSV(data), `diamond-players-${date}.csv`, 'text/csv;charset=utf-8;');
  });

  $btnGames.disabled = false;
  $btnGames.addEventListener('click', () => {
    downloadBlob(buildGamesCSV(data), `diamond-games-${date}.csv`, 'text/csv;charset=utf-8;');
  });

  $btnFull.disabled = false;
  $btnFull.addEventListener('click', () => {
    downloadBlob(JSON.stringify(data, null, 2), `diamond-full-${date}.json`, 'application/json');
  });

  const matchups = extractMatchups(data);
  if (matchups.length > 0) {
    $btnMatchups.disabled = false;
    $btnMatchups.addEventListener('click', () => {
      downloadBlob(buildMatchupCSV(data), `diamond-matchups-${date}.csv`, 'text/csv;charset=utf-8;');
    });
  }
}

// ── Load ────────────────────────────────────────────────────────────

async function loadData() {
  try {
    const res = await fetch(`${API_BASE}/sim-results/${todayISO()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    simData = await res.json();

    $date.textContent = simData.sim_date || todayISO();
    $status.textContent = 'LIVE';
    $status.className   = 'dash-status live';

    if (!simData.games || simData.games.length === 0) {
      $exportGrid.hidden = true;
      $emptyState.hidden = false;
      return;
    }

    updateCounts(simData);
    enableButtons(simData);

  } catch (err) {
    $status.textContent = 'OFFLINE';
    $status.className   = 'dash-status error';
    $exportGrid.hidden  = true;
    $emptyState.hidden  = false;
    console.warn('Diamond Engine API unavailable:', err.message);
  }
}

// ── Init ────────────────────────────────────────────────────────────

$date.textContent = todayISO();
loadData();
