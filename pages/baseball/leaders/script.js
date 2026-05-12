/* === Diamond Engine — Leaderboard Builder
   Customizable projection leaderboard from sim data
   ================================================================== */

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : '/api/diamond';

const $body      = document.getElementById('leaderBody');
const $date      = document.getElementById('dashDate');
const $status    = document.getElementById('dashStatus');
const $empty     = document.getElementById('emptyState');
const $wrap      = document.getElementById('tableWrap');
const $statSel   = document.getElementById('statSelect');
const $limitSel  = document.getElementById('limitSelect');
const $statHead  = document.getElementById('statHeader');

const STAT_LABELS = {
  hr_mean:  'HR',
  h_mean:   'H',
  tb_mean:  'TB',
  r_mean:   'R',
  rbi_mean: 'RBI',
  k_mean:   'K',
  pa_mean:  'PA',
};

// ── Load ────────────────────────────────────────────────────────────

async function loadLeaderboard() {
  const stat = $statSel.value;
  const limit = parseInt($limitSel.value, 10);

  try {
    const res = await fetch(`${API_BASE}/leaderboard?stat=${stat}&limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderLeaderboard(data, stat);
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

// ── Render ──────────────────────────────────────────────────────────

function renderLeaderboard(data, stat) {
  $date.textContent = data.date || todayISO();
  $statHead.textContent = STAT_LABELS[stat] || stat;
  $status.textContent = 'LIVE';
  $status.className = 'dash-status live';

  const leaders = data.leaderboard || [];
  if (!leaders.length) {
    $empty.hidden = false;
    $wrap.hidden = true;
    return;
  }

  $empty.hidden = true;
  $wrap.hidden = false;

  const maxVal = Math.max(...leaders.map(p => p[stat] || 0), 0.01);

  $body.innerHTML = leaders.map((p, i) => {
    const val = p[stat] || 0;
    const pct = (val / maxVal * 100).toFixed(1);
    const isTop3 = i < 3;
    const isHot = stat === 'hr_mean' ? val >= 0.3 :
                  stat === 'k_mean'  ? val >= 6.0 :
                  stat === 'h_mean'  ? val >= 1.5 :
                  stat === 'tb_mean' ? val >= 2.5 :
                  false;

    return `
      <tr>
        <td><span class="rank-num ${isTop3 ? 'top3' : ''}">${i + 1}</span></td>
        <td><span class="player-name">${p.name || `#${p.player_id || '?'}`}</span></td>
        <td><span class="matchup-text">${p.matchup || ''}</span></td>
        <td><span class="stat-val ${isHot ? 'hot' : ''}">${val.toFixed(2)}</span></td>
        <td>
          <div class="bar-wrap">
            <div class="bar-fill" style="width: ${pct}%"></div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ── Events ──────────────────────────────────────────────────────────

$statSel.addEventListener('change', loadLeaderboard);
$limitSel.addEventListener('change', loadLeaderboard);

// ── Init ────────────────────────────────────────────────────────────

$date.textContent = todayISO();
loadLeaderboard();
