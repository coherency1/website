/* === Diamond Engine — Matchup Ratings Dashboard
   Fetches sim results from API → renders game cards with win prob bars
   ================================================================== */

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : '/api/diamond';

const $grid     = document.getElementById('gamesGrid');
const $date     = document.getElementById('dashDate');
const $simCount = document.getElementById('simCount');
const $status   = document.getElementById('dashStatus');
const $empty    = document.getElementById('emptyState');

// ── Team display names ──────────────────────────────────────────────

const TEAM_COLORS = {
  ARI: '#a71930', ATL: '#ce1141', BAL: '#df4601', BOS: '#bd3039',
  CHC: '#0e3386', CWS: '#27251f', CIN: '#c6011f', CLE: '#00385d',
  COL: '#333366', DET: '#0c2340', HOU: '#002d62', KC:  '#004687',
  LAA: '#ba0021', LAD: '#005a9c', MIA: '#00a3e0', MIL: '#ffc52f',
  MIN: '#002b5c', NYM: '#002d72', NYY: '#003087', OAK: '#003831',
  PHI: '#e81828', PIT: '#27251f', SD:  '#2f241d', SF:  '#fd5a1e',
  SEA: '#005c5c', STL: '#c41e3a', TB:  '#092c5c', TEX: '#003278',
  TOR: '#134a8e', WSH: '#ab0003',
};

// ── Fetch & Render ──────────────────────────────────────────────────

async function loadMatchups() {
  try {
    const res = await fetch(`${API_BASE}/matchups`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderDashboard(data);
  } catch (err) {
    // Try loading from a local sim JSON as fallback
    try {
      const fallbackRes = await fetch(`${API_BASE}/sim-results/${todayISO()}`);
      if (fallbackRes.ok) {
        const simData = await fallbackRes.json();
        renderFromSim(simData);
        return;
      }
    } catch (_) { /* ignore fallback failure */ }

    $status.textContent = 'OFFLINE';
    $status.className = 'dash-status error';
    $empty.hidden = false;
    $grid.innerHTML = '';
    console.warn('Diamond Engine API unavailable:', err.message);
  }
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function renderDashboard(data) {
  const { date: simDate, matchups } = data;

  $date.textContent = simDate;
  $simCount.textContent = `${matchups.length} GAME${matchups.length !== 1 ? 'S' : ''}`;
  $status.textContent = 'LIVE';
  $status.className = 'dash-status live';

  if (!matchups.length) {
    $empty.hidden = false;
    $grid.innerHTML = '';
    return;
  }

  $empty.hidden = true;
  $grid.innerHTML = matchups.map(renderGameCard).join('');
  bindCardClicks();
}

function renderFromSim(simData) {
  const matchups = (simData.games || []).map(g => {
    const game = g.game || {};
    return {
      game_id: g.game_id,
      away_team: g.away_team,
      home_team: g.home_team,
      away_win_pct: game.away_win_pct || 0,
      home_win_pct: game.home_win_pct || 0,
      away_moneyline: game.away_moneyline || 0,
      home_moneyline: game.home_moneyline || 0,
      total_mean: game.total_mean || 0,
      over_under: game.over_under || 0,
      game_time: g.game_time || '',
      park: g.park || '',
      f5: g.f5 || {},
      yrfi: g.yrfi || {},
      extras_pct: game.extras_pct || 0,
      run_line: game.run_line || {},
    };
  });

  $date.textContent = simData.sim_date || todayISO();
  $simCount.textContent = `${matchups.length} GAME${matchups.length !== 1 ? 'S' : ''}`;
  $status.textContent = 'LIVE';
  $status.className = 'dash-status live';

  if (!matchups.length) {
    $empty.hidden = false;
    $grid.innerHTML = '';
    return;
  }

  $empty.hidden = true;
  $grid.innerHTML = matchups.map(renderGameCard).join('');
  bindCardClicks();
}

// ── Card Rendering ──────────────────────────────────────────────────

function renderGameCard(m) {
  const awayPct = (m.away_win_pct * 100).toFixed(1);
  const homePct = (m.home_win_pct * 100).toFixed(1);
  const awayFav = m.away_win_pct > m.home_win_pct;
  const awayML = formatML(m.away_moneyline);
  const homeML = formatML(m.home_moneyline);
  const total = m.total_mean ? m.total_mean.toFixed(1) : '--';
  const ou = m.over_under ? m.over_under.toFixed(1) : total;

  return `
    <article class="game-card" data-game-id="${m.game_id}">
      <div class="game-header">

        <div class="team-block away ${awayFav ? 'fav' : ''}">
          <span class="team-abbr">${m.away_team}</span>
          <span class="team-ml ${awayFav ? 'fav' : 'dog'}">${awayML}</span>
        </div>

        <div class="game-center">
          <div class="prob-labels">
            <span class="prob-pct away">${awayPct}%</span>
            <span class="prob-pct home">${homePct}%</span>
          </div>
          <div class="prob-bar-wrap">
            <div class="prob-bar-away" style="width: ${awayPct}%"></div>
            <div class="prob-bar-home" style="width: ${homePct}%"></div>
          </div>
          <span class="game-total">O/U ${ou}  |  TOTAL ${total}</span>
          ${m.game_time ? `<span class="game-time">${m.game_time}${m.park ? ' / ' + m.park : ''}</span>` : ''}
        </div>

        <div class="team-block home ${!awayFav ? 'fav' : ''}">
          <span class="team-abbr">${m.home_team}</span>
          <span class="team-ml ${!awayFav ? 'fav' : 'dog'}">${homeML}</span>
        </div>

      </div>

      <div class="game-detail">
        <div class="detail-grid">
          <div class="detail-section">
            <h4>Game Lines</h4>
            ${detailRow('Moneyline', `${m.away_team} ${awayML} / ${m.home_team} ${homeML}`)}
            ${detailRow('Total', `${total} runs`)}
            ${m.run_line ? detailRow('Run Line', formatRunLine(m)) : ''}
            ${m.extras_pct ? detailRow('Extras %', (m.extras_pct * 100).toFixed(1) + '%') : ''}
          </div>
          <div class="detail-section">
            <h4>First Five / First Inning</h4>
            ${m.f5 && m.f5.away_win_pct ? detailRow('F5 Win', `${m.away_team} ${(m.f5.away_win_pct * 100).toFixed(1)}% / ${m.home_team} ${(m.f5.home_win_pct * 100).toFixed(1)}%`) : detailRow('F5', '--')}
            ${m.yrfi && m.yrfi.yrfi_pct ? detailRow('YRFI', (m.yrfi.yrfi_pct * 100).toFixed(1) + '%') : detailRow('YRFI', '--')}
          </div>
        </div>
      </div>
    </article>
  `;
}

function detailRow(label, value) {
  return `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-value">${value}</span></div>`;
}

function formatML(ml) {
  if (!ml) return '--';
  return ml > 0 ? `+${ml}` : `${ml}`;
}

function formatRunLine(m) {
  if (!m.run_line) return '--';
  const rl = m.run_line;
  if (rl.away_line !== undefined) {
    return `${m.away_team} ${rl.away_line > 0 ? '+' : ''}${rl.away_line} (${(rl.away_cover_pct * 100).toFixed(0)}%)`;
  }
  return '--';
}

// ── Interactions ────────────────────────────────────────────────────

function bindCardClicks() {
  document.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('click', () => {
      card.classList.toggle('expanded');
    });
  });
}

// ── Init ────────────────────────────────────────────────────────────

$date.textContent = todayISO();
loadMatchups();
