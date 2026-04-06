'use strict';

// ══════════════════════════════════════════════════════════
// ── SECTION 1 — CONSTANTS & CONFIG ───────────────────────
// ══════════════════════════════════════════════════════════

const API = 'https://statsapi.mlb.com/api/v1';

const SCORING_SYSTEMS = {
  espn: {
    bat: { H: 1, '2B': 1, '3B': 3, HR: 4, R: 1, RBI: 1, BB: 1, SB: 2, CS: -1, K: -1, HBP: 0 },
    pit: { IP: 3, K: 1, W: 3, SV: 5, HLD: 2, BS: 0, ER: -2, BB: -1 }
  },
  yahoo: {
    bat: { H: 1, '2B': 1, '3B': 2, HR: 5, R: 1, RBI: 1, BB: 1, SB: 2, CS: -1, K: -1, HBP: 0 },
    pit: { IP: 3, K: 1, W: 5, SV: 5, HLD: 1, BS: 0, ER: -2, BB: -1 }
  },
  fangraphs: {
    bat: { H: 3, '2B': 1, '3B': 2, HR: 7, R: 2, RBI: 2, BB: 3, SB: 6, CS: -3, K: -2, HBP: 3 },
    pit: { IP: 3, K: 3, W: 12, SV: 5, HLD: 4, BS: -3, ER: -3, BB: -3 }
  }
};

const HITTER_SLOTS = ['C', '1B', '2B', '3B', 'SS', 'MI', 'CI', 'OF', 'UTIL'];
const PITCHER_SLOTS = ['SP', 'SP2', 'RP', 'RP2'];

// MLB API position code → slot eligibility
// pos.code: '1'=P, '2'=C, '3'=1B, '4'=2B, '5'=3B, '6'=SS, '7'=LF, '8'=CF, '9'=RF, '10'=DH
const POS_ELIGIBLE = {
  'C':    (p) => p.posCode === '2',
  '1B':   (p) => p.posCode === '3',
  '2B':   (p) => p.posCode === '4',
  '3B':   (p) => p.posCode === '5',
  'SS':   (p) => p.posCode === '6',
  'MI':   (p) => p.posCode === '4' || p.posCode === '6',
  'CI':   (p) => p.posCode === '3' || p.posCode === '5',
  'OF':   (p) => ['7','8','9'].includes(p.posCode),
  'UTIL': (p) => p.posCode !== '1',
  'SP':   (p) => p.isStarter,
  'SP2':  (p) => p.isStarter,
  'RP':   (p) => !p.isStarter,
  'RP2':  (p) => !p.isStarter,
};

const HEADSHOT = (id) =>
  `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${id}/headshot/67/current`;

const HEADSHOT_FALLBACK =
  'https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/0/headshot/67/current';

// ══════════════════════════════════════════════════════════
// ── SECTION 2 — STATE & URL MANAGEMENT ───────────────────
// ══════════════════════════════════════════════════════════

let _leaderboard = null;  // { all, batters, pitchers, _rawStats }
let _slots = null;
let _modalPlayer = null;
let _gameLog = null;      // cached for open modal

function getScoringSystem() {
  const p = new URLSearchParams(window.location.search).get('scoring');
  return ['espn','yahoo','fangraphs'].includes(p) ? p : 'espn';
}

function setScoringSystem(key) {
  const url = new URL(window.location.href);
  url.searchParams.set('scoring', key);
  history.replaceState({}, '', url);
  document.querySelectorAll('.toggle-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.scoring === key);
  });
  if (_leaderboard) reRender(key);
}

function reRender(scoringKey) {
  _leaderboard = rebuildLeaderboard(_leaderboard._rawStats, scoringKey);
  _slots = assignPositionSlots(_leaderboard.batters, _leaderboard.pitchers);
  renderHeroCard(_leaderboard.all[0], scoringKey, _leaderboard);
  renderPositionGrid(_slots, scoringKey, _leaderboard);
}

// ══════════════════════════════════════════════════════════
// ── SECTION 3 — UTILITIES ────────────────────────────────
// ══════════════════════════════════════════════════════════

function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

function dateStr(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}: ${url}`);
  return res.json();
}

function parseInningsPitched(s) {
  if (!s) return 0;
  const str = String(s);
  const parts = str.split('.');
  const whole = parseInt(parts[0]) || 0;
  const outs = parseInt(parts[1]) || 0;
  return whole + outs / 3;
}

function setDashStatus(state, msg) {
  const el = document.getElementById('dashStatus');
  if (!el) return;
  const labels = { loading: 'LOADING', ready: 'LIVE', error: 'ERROR', 'no-games': 'OFF DAY' };
  el.textContent = msg || labels[state] || state.toUpperCase();
  el.className = 'dash-status status-' + state;
}

function buildStatLine(p) {
  if (p.isPitcher) {
    const parts = [];
    const ip = parseInningsPitched(p.rawStats.pit.inningsPitched);
    if (ip > 0) parts.push(`${ip % 1 === 0 ? ip : ip.toFixed(1)} IP`);
    if (p.rawStats.pit.earnedRuns > 0) parts.push(`${p.rawStats.pit.earnedRuns} ER`);
    else if (p.rawStats.pit.earnedRuns === 0 && ip > 0) parts.push('0 ER');
    if (p.rawStats.pit.strikeOuts > 0) parts.push(`${p.rawStats.pit.strikeOuts} K`);
    if (p.rawStats.pit.wins > 0) parts.push('W');
    if (p.rawStats.pit.saves > 0) parts.push('SV');
    if (p.rawStats.pit.holds > 0) parts.push('HLD');
    return parts.join(' · ') || '—';
  } else {
    const s = p.rawStats.bat;
    const parts = [];
    if (s.homeRuns > 0) parts.push(`${s.homeRuns} HR`);
    if (s.rbi > 0) parts.push(`${s.rbi} RBI`);
    if (s.runs > 0) parts.push(`${s.runs} R`);
    if (s.stolenBases > 0) parts.push(`${s.stolenBases} SB`);
    if (s.hits > 0 && !parts.length) parts.push(`${s.hits} H`);
    return parts.join(' · ') || '—';
  }
}

// ══════════════════════════════════════════════════════════
// ── SECTION 4 — SCORING ENGINE ───────────────────────────
// ══════════════════════════════════════════════════════════

function scoreBatter(bat, sys) {
  const s = sys.bat;
  const hr = bat.homeRuns || 0;
  const triples = bat.triples || 0;
  const doubles = bat.doubles || 0;
  const hits = bat.hits || 0;
  const singles = Math.max(0, hits - doubles - triples - hr);

  const breakdown = [];
  let total = 0;

  const add = (label, count, rate) => {
    if (count === 0 || rate === 0) return;
    const pts = count * rate;
    total += pts;
    breakdown.push({ label, count, rate, pts });
  };

  if (singles > 0) add('Singles', singles, s.H);
  if (doubles > 0) add('Doubles', doubles, s.H + s['2B']);
  if (triples > 0) add('Triples', triples, s.H + s['3B']);
  if (hr > 0) add('Home Runs', hr, s.HR);
  add('Runs', bat.runs || 0, s.R);
  add('RBI', bat.rbi || 0, s.RBI);
  add('Walks', bat.baseOnBalls || 0, s.BB);
  add('Stolen Bases', bat.stolenBases || 0, s.SB);
  if ((bat.caughtStealing || 0) > 0) add('Caught Stealing', bat.caughtStealing, s.CS);
  if ((bat.strikeOuts || 0) > 0 && s.K !== 0) add('Strikeouts', bat.strikeOuts, s.K);
  if ((bat.hitByPitch || 0) > 0 && s.HBP !== 0) add('HBP', bat.hitByPitch, s.HBP);

  return { total: Math.round(total * 10) / 10, breakdown };
}

function scorePitcher(pit, sys) {
  const s = sys.pit;
  const ip = parseInningsPitched(pit.inningsPitched);
  const breakdown = [];
  let total = 0;

  const add = (label, count, rate) => {
    if (count === 0 || rate === 0) return;
    const pts = count * rate;
    total += pts;
    breakdown.push({ label, count, rate, pts });
  };

  if (ip > 0) {
    const pts = ip * s.IP;
    total += pts;
    breakdown.push({ label: 'Innings Pitched', count: ip.toFixed(2), rate: s.IP, pts: Math.round(pts * 10) / 10 });
  }
  add('Strikeouts', pit.strikeOuts || 0, s.K);
  add('Walks', pit.baseOnBalls || 0, s.BB);
  if ((pit.earnedRuns || 0) > 0) add('Earned Runs', pit.earnedRuns, s.ER);
  add('Wins', pit.wins || 0, s.W);
  add('Saves', pit.saves || 0, s.SV);
  add('Holds', pit.holds || 0, s.HLD);
  if ((pit.blownSaves || 0) > 0 && s.BS !== 0) add('Blown Saves', pit.blownSaves, s.BS);

  return { total: Math.round(total * 10) / 10, breakdown };
}

// ══════════════════════════════════════════════════════════
// ── SECTION 5 — DATA FETCHING ─────────────────────────────
// ══════════════════════════════════════════════════════════

async function fetchTodaySchedule() {
  const data = await apiFetch(`${API}/schedule?sportId=1&date=${todayStr()}&gameType=R`);
  const dates = data.dates || [];
  if (!dates.length) return [];
  const games = dates[0].games || [];
  return games
    .filter(g => g.status.abstractGameState === 'Final' || g.status.abstractGameState === 'Live')
    .map(g => g.gamePk);
}

async function fetchScheduleForDate(ds) {
  const data = await apiFetch(`${API}/schedule?sportId=1&date=${ds}&gameType=R`);
  const dates = data.dates || [];
  if (!dates.length) return [];
  const games = dates[0].games || [];
  return games
    .filter(g => g.status.abstractGameState === 'Final')
    .map(g => ({ gamePk: g.gamePk, date: ds }));
}

async function fetchBoxscore(gamePk) {
  return apiFetch(`${API}/game/${gamePk}/boxscore`);
}

function extractPlayersFromBoxscore(boxscore, gamePk, date) {
  const players = [];
  ['home', 'away'].forEach(side => {
    const team = boxscore.teams[side];
    const teamAbbr = team.team.abbreviation;

    // Process batters
    (team.battingOrder || []).forEach(pid => {
      const p = team.players[`ID${pid}`];
      if (!p) return;
      const bat = p.stats && p.stats.batting;
      if (!bat || bat.atBats === undefined) return;
      players.push({
        id: pid,
        name: p.person.fullName,
        teamAbbr,
        teamName: team.team.name,
        posCode: (p.position && p.position.code) || '0',
        posAbbr: (p.position && p.position.abbreviation) || '?',
        isPitcher: false,
        isStarter: false,
        gamePk,
        date: date || todayStr(),
        rawStats: { bat },
      });
    });

    // Process pitchers
    (team.pitchers || []).forEach((pid, idx) => {
      const p = team.players[`ID${pid}`];
      if (!p) return;
      const pit = p.stats && p.stats.pitching;
      if (!pit || pit.inningsPitched === undefined) return;
      players.push({
        id: pid,
        name: p.person.fullName,
        teamAbbr,
        teamName: team.team.name,
        posCode: '1',
        posAbbr: (p.position && p.position.abbreviation) || 'P',
        isPitcher: true,
        isStarter: (p.position && p.position.abbreviation) === 'SP',
        gamePk,
        date: date || todayStr(),
        rawStats: { pit },
      });
    });
  });
  return players;
}

async function fetchAllBoxscores(gamePks, date) {
  const results = await Promise.all(
    gamePks.map(pk => fetchBoxscore(pk).then(bs => extractPlayersFromBoxscore(bs, pk, date)))
  );
  // Deduplicate by player id (take first occurrence)
  const seen = new Set();
  const flat = [];
  for (const arr of results) {
    for (const p of arr) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        flat.push(p);
      }
    }
  }
  return flat;
}

async function fetchWeekBests(scoringKey) {
  const allPerformances = [];
  const days1 = [1,2,3,4].map(i => dateStr(i));
  const days2 = [5,6,7].map(i => dateStr(i));

  async function processDays(days) {
    const schedules = await Promise.all(days.map(d => fetchScheduleForDate(d)));
    for (let i = 0; i < days.length; i++) {
      const games = schedules[i];
      if (!games.length) continue;
      const pks = games.map(g => g.gamePk);
      const players = await fetchAllBoxscores(pks, days[i]);
      const scored = scoreAllPlayers(players, scoringKey);
      allPerformances.push(...scored.all);
    }
  }

  await processDays(days1);
  await processDays(days2);

  return allPerformances
    .sort((a, b) => b.fantasyScore - a.fantasyScore)
    .slice(0, 8);
}

async function fetchPlayerGameLog(playerId, group, season) {
  const yr = season || new Date().getFullYear();
  const data = await apiFetch(`${API}/people/${playerId}/stats?stats=gameLog&season=${yr}&group=${group}`);
  return ((data.stats && data.stats[0] && data.stats[0].splits) || []).map(s => ({
    date: s.date,
    stats: s.stat,
    opponent: (s.opponent && s.opponent.abbreviation) || '',
    isHome: s.isHome,
  }));
}

// ══════════════════════════════════════════════════════════
// ── SECTION 6 — LEADERBOARD ──────────────────────────────
// ══════════════════════════════════════════════════════════

function scoreAllPlayers(players, scoringKey) {
  const sys = SCORING_SYSTEMS[scoringKey];
  const scored = players.map(p => {
    let result;
    if (p.isPitcher) {
      result = scorePitcher(p.rawStats.pit, sys);
    } else {
      result = scoreBatter(p.rawStats.bat, sys);
    }
    return Object.assign({}, p, { fantasyScore: result.total, breakdown: result.breakdown });
  }).filter(p => {
    if (p.isPitcher) {
      return p.fantasyScore !== 0 || parseInningsPitched((p.rawStats.pit && p.rawStats.pit.inningsPitched) || 0) > 0;
    } else {
      return p.fantasyScore !== 0 || ((p.rawStats.bat && p.rawStats.bat.atBats) || 0) > 0;
    }
  });

  const all = scored.slice().sort((a, b) => b.fantasyScore - a.fantasyScore);
  const batters = all.filter(p => !p.isPitcher);
  const pitchers = all.filter(p => p.isPitcher);
  return { all, batters, pitchers, _rawStats: players };
}

function rebuildLeaderboard(rawStats, scoringKey) {
  return scoreAllPlayers(rawStats, scoringKey);
}

function buildLeaderboard(players, scoringKey) {
  return scoreAllPlayers(players, scoringKey);
}

// ══════════════════════════════════════════════════════════
// ── SECTION 7 — POSITION SLOT ASSIGNMENT ─────────────────
// ══════════════════════════════════════════════════════════

function assignPositionSlots(batters, pitchers) {
  const slots = new Map();
  const usedBatterIds = new Set();
  const usedPitcherIds = new Set();

  HITTER_SLOTS.forEach(slot => {
    const eligible = batters.filter(p => POS_ELIGIBLE[slot](p) && !usedBatterIds.has(p.id));
    if (eligible.length) {
      slots.set(slot, eligible[0]);
      usedBatterIds.add(eligible[0].id);
    }
  });

  PITCHER_SLOTS.forEach(slot => {
    const eligible = pitchers.filter(p => POS_ELIGIBLE[slot](p) && !usedPitcherIds.has(p.id));
    if (eligible.length) {
      slots.set(slot, eligible[0]);
      usedPitcherIds.add(eligible[0].id);
    }
  });

  return slots;
}

// ══════════════════════════════════════════════════════════
// ── SECTION 8 — RENDER FUNCTIONS ─────────────────────────
// ══════════════════════════════════════════════════════════

function renderHeroCard(player, scoringKey, leaderboard) {
  const card = document.getElementById('heroCard');
  if (!player) {
    card.innerHTML = '<div class="no-player">No data available</div>';
    return;
  }
  const statLine = buildStatLine(player);
  const overallRank = leaderboard.all.indexOf(player) + 1;

  card.innerHTML = `
    <div class="hero-photo-wrap">
      <img class="hero-photo" src="${HEADSHOT(player.id)}" alt="${player.name}"
           onerror="this.src='${HEADSHOT_FALLBACK}'">
    </div>
    <div class="hero-content">
      <div class="hero-meta">
        <span class="hero-team">${player.teamAbbr}</span>
        <span class="hero-pos">${player.posAbbr}</span>
        <span class="hero-rank">#${overallRank} OVERALL</span>
      </div>
      <div class="hero-name">${player.name}</div>
      <div class="hero-pts">${player.fantasyScore.toFixed(1)}</div>
      <div class="hero-pts-label">FANTASY PTS &middot; ${scoringKey.toUpperCase()}</div>
      <div class="hero-stat-line">${statLine}</div>
      <div class="hero-breakdown">
        ${player.breakdown.slice(0, 4).map(b =>
          `<span class="breakdown-chip">${b.label}: <strong>${b.pts > 0 ? '+' : ''}${b.pts.toFixed(1)}</strong></span>`
        ).join('')}
      </div>
    </div>
  `;
  card.onclick = () => openModal(player, scoringKey, leaderboard);
  card.style.cursor = 'pointer';
}

function renderWeekStrip(bests, scoringKey) {
  const strip = document.getElementById('weekStrip');
  if (!bests.length) {
    strip.innerHTML = '<div class="no-player">No recent data</div>';
    return;
  }
  strip.innerHTML = bests.map(p => `
    <div class="week-card" data-id="${p.id}">
      <div class="week-card-date">${p.date || ''}</div>
      <div class="week-card-name">${p.name}</div>
      <div class="week-card-team">${p.teamAbbr}</div>
      <div class="week-card-pts">${p.fantasyScore.toFixed(1)}</div>
      <div class="week-card-stat">${buildStatLine(p)}</div>
    </div>
  `).join('');
}

function renderPositionGrid(slots, scoringKey, leaderboard) {
  const hittersCol = document.getElementById('hittersCol');
  const pitchersCol = document.getElementById('pitchersCol');

  const HITTER_DISPLAY = [
    ['C','1B'],
    ['2B','3B'],
    ['SS','MI'],
    ['CI','OF'],
    ['UTIL']
  ];
  const PITCHER_DISPLAY = [
    ['SP','SP2'],
    ['RP','RP2']
  ];

  function renderCard(slot, player) {
    const slotLabel = slot.replace('2','').replace('SP','SP').replace('RP','RP');
    const showPhoto = ['C','1B','SS','OF','SP'].includes(slot);
    if (!player) {
      return `<div class="pos-card empty">
        <div class="pos-badge">${slotLabel}</div>
        <div class="pos-empty-label">&mdash;</div>
      </div>`;
    }
    const rank = leaderboard ? leaderboard.all.indexOf(player) + 1 : '?';
    const photoHtml = showPhoto
      ? `<img class="pos-photo" src="${HEADSHOT(player.id)}" alt="" onerror="this.src='${HEADSHOT_FALLBACK}'">`
      : '';
    return `<div class="pos-card${showPhoto ? ' has-photo' : ''}" data-id="${player.id}">
      <div class="pos-badge">${slotLabel}</div>
      ${photoHtml}
      <div class="pos-info">
        <div class="pos-name">${player.name}</div>
        <div class="pos-team">${player.teamAbbr} &middot; ${player.posAbbr}</div>
        <div class="pos-stat">${buildStatLine(player)}</div>
      </div>
      <div class="pos-pts">${player.fantasyScore.toFixed(1)}</div>
    </div>`;
  }

  hittersCol.innerHTML = '<div class="col-label">HITTERS</div>';
  HITTER_DISPLAY.forEach(row => {
    const rowEl = document.createElement('div');
    rowEl.className = 'pos-row';
    row.forEach(slot => {
      const player = slots.get(slot);
      const cardEl = document.createElement('div');
      cardEl.className = 'pos-card-wrap';
      cardEl.innerHTML = renderCard(slot, player);
      if (player) {
        cardEl.querySelector('.pos-card').addEventListener('click', () => openModal(player, scoringKey, leaderboard));
        cardEl.querySelector('.pos-card').style.cursor = 'pointer';
      }
      rowEl.appendChild(cardEl);
    });
    hittersCol.appendChild(rowEl);
  });

  pitchersCol.innerHTML = '<div class="col-label">PITCHERS</div>';
  PITCHER_DISPLAY.forEach(row => {
    const rowEl = document.createElement('div');
    rowEl.className = 'pos-row';
    row.forEach(slot => {
      const player = slots.get(slot);
      const cardEl = document.createElement('div');
      cardEl.className = 'pos-card-wrap';
      cardEl.innerHTML = renderCard(slot, player);
      if (player) {
        cardEl.querySelector('.pos-card').addEventListener('click', () => openModal(player, scoringKey, leaderboard));
        cardEl.querySelector('.pos-card').style.cursor = 'pointer';
      }
      rowEl.appendChild(cardEl);
    });
    pitchersCol.appendChild(rowEl);
  });
}

function renderSkeleton() {
  const hero = document.getElementById('heroCard');
  hero.innerHTML = `
    <div class="skeleton-block" style="width:200px;height:240px;flex-shrink:0;border-radius:8px 0 0 8px;"></div>
    <div style="flex:1;padding:24px;display:flex;flex-direction:column;gap:16px;">
      <div class="skeleton-block" style="height:16px;width:40%;"></div>
      <div class="skeleton-block" style="height:32px;width:70%;"></div>
      <div class="skeleton-block" style="height:52px;width:30%;"></div>
      <div class="skeleton-block" style="height:14px;width:55%;"></div>
    </div>
  `;

  const strip = document.getElementById('weekStrip');
  strip.innerHTML = Array(6).fill(0).map(() =>
    `<div class="week-card skeleton-block" style="flex-shrink:0;width:160px;height:170px;"></div>`
  ).join('');

  const hitters = document.getElementById('hittersCol');
  const pitchers = document.getElementById('pitchersCol');
  const skCard = () => `<div class="pos-card-wrap"><div class="skeleton-block" style="height:68px;border-radius:8px;"></div></div>`;
  [hitters, pitchers].forEach(col => {
    col.innerHTML = '<div class="col-label">&mdash;</div>' +
      Array(4).fill(0).map(() => `<div class="pos-row">${skCard()}${skCard()}</div>`).join('');
  });
}

function renderNoGames() {
  document.getElementById('heroCard').innerHTML = `
    <div class="no-games-state">
      <div class="no-games-label">NO GAMES TODAY</div>
      <div class="no-games-sub">Check back when the next game is scheduled.</div>
    </div>
  `;
  ['hittersCol','pitchersCol'].forEach(id => {
    document.getElementById(id).innerHTML = '<div class="col-label">&mdash;</div>';
  });
}

// ══════════════════════════════════════════════════════════
// ── SECTION 9 — MODAL ────────────────────────────────────
// ══════════════════════════════════════════════════════════

function openModal(player, scoringKey, leaderboard) {
  _modalPlayer = player;
  _gameLog = null;

  const overlay = document.getElementById('modalOverlay');
  const photo = document.getElementById('modalPhoto');
  const name = document.getElementById('modalName');
  const teamPos = document.getElementById('modalTeamPos');
  const pts = document.getElementById('modalPts');
  const breakdown = document.getElementById('modalBreakdown');
  const ranks = document.getElementById('modalRanks');
  const histBody = document.getElementById('modalHistBody');

  photo.src = HEADSHOT(player.id);
  photo.onerror = () => { photo.src = HEADSHOT_FALLBACK; };
  name.textContent = player.name;
  teamPos.textContent = `${player.teamAbbr} \u00b7 ${player.posAbbr}`;
  pts.textContent = player.fantasyScore.toFixed(1);

  // Breakdown
  breakdown.innerHTML = '<div class="breakdown-title">SCORING BREAKDOWN</div>' +
    player.breakdown.map(b => `
      <div class="breakdown-row">
        <span class="breakdown-label">${b.label}</span>
        <span class="breakdown-count">${b.count}</span>
        <span class="breakdown-pts ${b.pts >= 0 ? 'pos' : 'neg'}">${b.pts > 0 ? '+' : ''}${b.pts.toFixed(1)}</span>
      </div>
    `).join('');

  // Ranks
  const overallRank = leaderboard.all.indexOf(player) + 1;
  const posList = player.isPitcher ? leaderboard.pitchers : leaderboard.batters;
  const posRank = posList.indexOf(player) + 1;
  ranks.innerHTML = `
    <div class="rank-badge">#${overallRank} OVERALL</div>
    <div class="rank-badge">#${posRank} ${player.isPitcher ? 'PITCHERS' : player.posAbbr}</div>
  `;

  // History loading
  histBody.innerHTML = '<div class="hist-loading">Loading history...</div>';
  document.querySelectorAll('.hist-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.window === '7');
  });

  // Open modal
  overlay.setAttribute('aria-hidden', 'false');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Fetch game log
  const group = player.isPitcher ? 'pitching' : 'hitting';
  fetchPlayerGameLog(player.id, group).then(log => {
    _gameLog = log;
    renderHistoryTab(log, 7, scoringKey);
  }).catch(() => {
    histBody.innerHTML = '<div class="hist-loading">History unavailable.</div>';
  });
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.remove('open');
  setTimeout(() => {
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    _modalPlayer = null;
    _gameLog = null;
  }, 300);
}

function renderHistoryTab(gameLog, windowDays, scoringKey) {
  const histBody = document.getElementById('modalHistBody');
  if (!gameLog || !gameLog.length) {
    histBody.innerHTML = '<div class="hist-loading">No game history found.</div>';
    return;
  }
  const player = _modalPlayer;
  if (!player) return;

  // Use last N games (log is chronological, take from end)
  const window = gameLog.slice(-windowDays);
  const sys = SCORING_SYSTEMS[scoringKey];

  const scored = window.map(g => {
    let result;
    if (player.isPitcher) {
      result = scorePitcher(g.stats, sys);
    } else {
      result = scoreBatter(g.stats, sys);
    }
    const rawP = player.isPitcher
      ? { isPitcher: true, rawStats: { pit: g.stats } }
      : { isPitcher: false, rawStats: { bat: g.stats } };
    return {
      date: g.date,
      opponent: g.opponent,
      fantasyScore: result.total,
      statLine: buildStatLine(Object.assign({}, player, rawP)),
    };
  });

  if (!scored.length) {
    histBody.innerHTML = '<div class="hist-loading">No games in this window.</div>';
    return;
  }

  const avg = scored.reduce((s, g) => s + g.fantasyScore, 0) / scored.length;
  const peak = scored.reduce((best, g) => g.fantasyScore > best.fantasyScore ? g : best, scored[0]);

  histBody.innerHTML = `
    <div class="hist-stats-row">
      <div class="hist-stat">
        <div class="hist-stat-label">AVG / GAME</div>
        <div class="hist-stat-value">${avg.toFixed(1)}</div>
      </div>
      <div class="hist-stat">
        <div class="hist-stat-label">GAMES</div>
        <div class="hist-stat-value">${scored.length}</div>
      </div>
      <div class="hist-stat">
        <div class="hist-stat-label">PEAK</div>
        <div class="hist-stat-value">${peak.fantasyScore.toFixed(1)}</div>
      </div>
    </div>
    <div class="hist-peak-game">
      <div class="hist-peak-label">BEST GAME</div>
      <div class="hist-peak-date">${peak.date} &middot; vs ${peak.opponent}</div>
      <div class="hist-peak-stat">${peak.statLine}</div>
    </div>
    <div class="hist-game-log">
      ${scored.slice().reverse().slice(0, 10).map(g => `
        <div class="hist-log-row">
          <span class="hist-log-date">${g.date}</span>
          <span class="hist-log-opp">vs ${g.opponent}</span>
          <span class="hist-log-stat">${g.statLine}</span>
          <span class="hist-log-pts ${g.fantasyScore >= 0 ? 'pos' : 'neg'}">${g.fantasyScore.toFixed(1)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function initModalListeners() {
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });
  document.querySelectorAll('.hist-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.hist-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (_gameLog) renderHistoryTab(_gameLog, parseInt(tab.dataset.window), getScoringSystem());
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// ══════════════════════════════════════════════════════════
// ── SECTION 10 — INIT ────────────────────────────────────
// ══════════════════════════════════════════════════════════

function initScoringToggle() {
  const key = getScoringSystem();
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.scoring === key);
    btn.addEventListener('click', () => setScoringSystem(btn.dataset.scoring));
  });
}

function initDateLabel() {
  const el = document.getElementById('dashDate');
  if (el) {
    const d = new Date();
    el.textContent = d.toLocaleDateString('en-US', {
      timeZone: 'America/Los_Angeles',
      month: 'short', day: 'numeric', year: 'numeric'
    }).toUpperCase();
  }
}

async function init() {
  initDateLabel();
  initScoringToggle();
  initModalListeners();
  renderSkeleton();
  setDashStatus('loading');

  const scoringKey = getScoringSystem();

  try {
    const gamePks = await fetchTodaySchedule();

    if (!gamePks.length) {
      renderNoGames();
      setDashStatus('no-games');
      // Still try week strip
      fetchWeekBests(scoringKey)
        .then(bests => renderWeekStrip(bests, scoringKey))
        .catch(() => {});
      return;
    }

    const allStats = await fetchAllBoxscores(gamePks, todayStr());
    const leaderboard = buildLeaderboard(allStats, scoringKey);
    leaderboard._rawStats = allStats;
    _leaderboard = leaderboard;

    const slots = assignPositionSlots(leaderboard.batters, leaderboard.pitchers);
    _slots = slots;

    if (leaderboard.all.length === 0) {
      renderNoGames();
      setDashStatus('no-games');
    } else {
      renderHeroCard(leaderboard.all[0], scoringKey, leaderboard);
      renderPositionGrid(slots, scoringKey, leaderboard);
      setDashStatus('ready');
    }

    // Week strip — non-blocking
    fetchWeekBests(scoringKey)
      .then(bests => renderWeekStrip(bests, scoringKey))
      .catch(() => {
        document.getElementById('weekStrip').innerHTML = '<div class="no-player">Week data unavailable.</div>';
      });

  } catch (err) {
    console.error('Fantasy dashboard error:', err);
    setDashStatus('error', 'ERROR');
    document.getElementById('heroCard').innerHTML = `<div class="no-games-state"><div class="no-games-label">FAILED TO LOAD</div><div class="no-games-sub">${err.message}</div></div>`;
  }
}

document.addEventListener('DOMContentLoaded', init);
