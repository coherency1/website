/* === Diamond Engine — Player Props Dashboard
   Fetches sim results → renders per-player prop projections by game
   ================================================================== */

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : '/api/diamond';

const $picker  = document.getElementById('gamePicker');
const $body    = document.getElementById('propsBody');
const $date    = document.getElementById('dashDate');
const $status  = document.getElementById('dashStatus');
const $empty   = document.getElementById('emptyState');
const $wrap    = document.getElementById('propsWrap');

let simData = null;

// ── Stat columns we display ─────────────────────────────────────────

const STAT_COLS = [
  { key: 'h',   mean: 'h_mean',   p85: 'h_p85',   label: 'H' },
  { key: 'tb',  mean: 'tb_mean',  p85: 'tb_p85',  label: 'TB' },
  { key: 'hr',  mean: 'hr_mean',  p85: 'hr_p85',  label: 'HR' },
  { key: 'r',   mean: 'r_mean',   p85: 'r_p85',   label: 'R' },
  { key: 'rbi', mean: 'rbi_mean', p85: 'rbi_p85', label: 'RBI' },
  { key: 'k',   mean: 'k_mean',   p85: 'k_p85',   label: 'K' },
];

// ── Load ────────────────────────────────────────────────────────────

async function loadData() {
  try {
    const res = await fetch(`${API_BASE}/sim-results/${todayISO()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    simData = await res.json();
    renderPicker(simData);
    if (simData.games && simData.games.length > 0) {
      selectGame(0);
    }
    $status.textContent = 'LIVE';
    $status.className = 'dash-status live';
  } catch (err) {
    $status.textContent = 'OFFLINE';
    $status.className = 'dash-status error';
    $empty.hidden = false;
    $wrap.hidden = true;
    console.warn('Diamond Engine API unavailable:', err.message);
  }
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Game Picker ─────────────────────────────────────────────────────

function renderPicker(data) {
  $date.textContent = data.sim_date || todayISO();
  const games = data.games || [];
  if (!games.length) {
    $empty.hidden = false;
    $wrap.hidden = true;
    return;
  }

  $picker.innerHTML = games.map((g, i) =>
    `<button class="game-tab${i === 0 ? ' active' : ''}" data-idx="${i}">${g.away_team} @ ${g.home_team}</button>`
  ).join('');

  $picker.querySelectorAll('.game-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $picker.querySelector('.active')?.classList.remove('active');
      tab.classList.add('active');
      selectGame(parseInt(tab.dataset.idx, 10));
    });
  });
}

// ── Props Table ─────────────────────────────────────────────────────

function selectGame(idx) {
  const game = simData.games[idx];
  if (!game) return;

  $empty.hidden = true;
  $wrap.hidden = false;

  const players = game.players || {};
  const props = game.props || {};

  // Merge player stats and props into a flat list
  const rows = [];
  for (const [pid, pdata] of Object.entries(players)) {
    const pProps = props[pid] || {};
    rows.push({ pid, ...pdata, ...pProps });
  }

  // Sort by projected total bases descending (most impactful first)
  rows.sort((a, b) => (b.tb_mean || 0) - (a.tb_mean || 0));

  // Split by team
  const awayRows = rows.filter(r => r.team === game.away_team);
  const homeRows = rows.filter(r => r.team === game.home_team);
  // If no team field, just show all
  const hasTeams = awayRows.length > 0 || homeRows.length > 0;

  let html = '';
  if (hasTeams) {
    html += teamDivider(game.away_team);
    html += awayRows.map(renderRow).join('');
    html += teamDivider(game.home_team);
    html += homeRows.map(renderRow).join('');
  } else {
    html = rows.map(renderRow).join('');
  }

  $body.innerHTML = html;
}

function teamDivider(team) {
  return `<tr class="team-divider"><td colspan="7">${team}</td></tr>`;
}

function renderRow(p) {
  const name = p.name || `#${p.pid}`;
  const team = p.team || '';

  return `
    <tr>
      <td>
        <span class="player-name">${name}</span>
        <span class="player-team">${team}</span>
      </td>
      ${STAT_COLS.map(col => renderStatCell(p, col)).join('')}
    </tr>
  `;
}

function renderStatCell(p, col) {
  const mean = p[col.mean];
  const p85 = p[col.p85];

  if (mean === undefined || mean === null) {
    return `<td class="col-stat"><span class="prop-cell"><span class="prop-mean prop-cold">--</span></span></td>`;
  }

  const hot = col.key === 'hr' ? mean >= 0.3 :
              col.key === 'k'  ? mean >= 6.0 :
              col.key === 'h'  ? mean >= 1.5 :
              col.key === 'tb' ? mean >= 2.5 :
              false;

  return `
    <td class="col-stat">
      <div class="prop-cell">
        <span class="prop-mean ${hot ? 'prop-hot' : ''}">${mean.toFixed(2)}</span>
        ${p85 !== undefined ? `<span class="prop-line">p85: ${p85.toFixed(1)}</span>` : ''}
      </div>
    </td>
  `;
}

// ── Init ────────────────────────────────────────────────────────────

$date.textContent = todayISO();
loadData();
