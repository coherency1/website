'use strict';

// ══════════════════════════════════════════════════════════
// ── SECTION 1 — CONSTANTS & CONFIG ───────────────────────
// ══════════════════════════════════════════════════════════

const API = 'https://statsapi.mlb.com/api/v1';

// ── Team colors (primary) & MLB team IDs for logo URLs ────
const TEAM_COLORS = {
  ARI:'#A71930', ATL:'#CE1141', BAL:'#DF4601', BOS:'#BD3039',
  CHC:'#0E3386', CWS:'#C4CED4', CIN:'#C6011F', CLE:'#00385D',
  COL:'#33006F', DET:'#0C2340', HOU:'#EB6E1F', KC: '#004687',
  LAA:'#BA0021', LAD:'#005A9C', MIA:'#00A3E0', MIL:'#FFC52F',
  MIN:'#D31145', NYM:'#FF5910', NYY:'#003087', OAK:'#EFB21E',
  PHI:'#E81828', PIT:'#FDB827', SD: '#FFC425', SEA:'#005C5C',
  SF: '#FD5A1E', STL:'#C41E3A', TB: '#8FBCE6', TEX:'#C0111F',
  TOR:'#134A8E', WSH:'#AB0003',
};

const TEAM_IDS = {
  ARI:109, ATL:144, BAL:110, BOS:111, CHC:112,
  CWS:145, CIN:113, CLE:114, COL:115, DET:116,
  HOU:117, KC: 118, LAA:108, LAD:119, MIA:146,
  MIL:158, MIN:142, NYM:121, NYY:147, OAK:133,
  PHI:143, PIT:134, SD: 135, SEA:136, SF: 137,
  STL:138, TB: 139, TEX:140, TOR:141, WSH:120,
};

// Normalize FanGraphs/variant abbreviations → standard
const TEAM_ABBR_NORM = {
  WSN:'WSH', WAS:'WSH', CHW:'CWS', ANA:'LAA',
  SFG:'SF',  SDP:'SD',  KCR:'KC',  TBR:'TB',
};

const SCORING_SYSTEMS = {
  espn: {
    bat: { TB: 1, R: 1, RBI: 1, BB: 1, SB: 1, K: -1 },
    pit: { IP: 3, K: 1, W: 2, L: -2, SV: 5, HLD: 2, ER: -2, H: -1, BB: -1 }
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

// Position filter functions for the filter rail
const POS_FILTER_FN = {
  ALL:  () => true,
  HIT:  (p) => !p.isPitcher,
  SP:   (p) => p.isPitcher && p.isStarter,
  RP:   (p) => p.isPitcher && !p.isStarter,
  C:    (p) => !p.isPitcher && p.posCode === '2',
  '1B': (p) => !p.isPitcher && p.posCode === '3',
  '2B': (p) => !p.isPitcher && p.posCode === '4',
  '3B': (p) => !p.isPitcher && p.posCode === '5',
  SS:   (p) => !p.isPitcher && p.posCode === '6',
  IF:   (p) => !p.isPitcher && ['3','4','5','6'].includes(p.posCode),
  OF:   (p) => !p.isPitcher && ['7','8','9'].includes(p.posCode),
  DH:   (p) => !p.isPitcher && p.posCode === '10',
};

// Filters that show batters and use BAT_COLS
const BATTER_FILTERS = ['HIT', 'C', '1B', '2B', '3B', 'SS', 'IF', 'OF', 'DH'];

// Stat column definitions for heat-mapped table
const BAT_COLS = [
  { key: 'H',   label: 'H',   fn: (p) => p.rawStats.bat.hits || 0,                                                                            inv: false },
  { key: 'HR',  label: 'HR',  fn: (p) => p.rawStats.bat.homeRuns || 0,                                                                         inv: false },
  { key: 'XBH', label: 'XBH', fn: (p) => (p.rawStats.bat.doubles || 0) + (p.rawStats.bat.triples || 0) + (p.rawStats.bat.homeRuns || 0),       inv: false },
  { key: 'R',   label: 'R',   fn: (p) => p.rawStats.bat.runs || 0,                                                                             inv: false },
  { key: 'RBI', label: 'RBI', fn: (p) => p.rawStats.bat.rbi || 0,                                                                              inv: false },
  { key: 'SO',  label: 'SO',  fn: (p) => p.rawStats.bat.strikeOuts || 0,                                                                       inv: true  },
  { key: 'SB',  label: 'SB',  fn: (p) => p.rawStats.bat.stolenBases || 0,                                                                      inv: false },
  { key: 'BB',  label: 'BB',  fn: (p) => p.rawStats.bat.baseOnBalls || 0,                                                                      inv: false },
];

const PIT_COLS = [
  { key: 'IP',  label: 'IP',  fn: (p) => parseInningsPitched(p.rawStats.pit.inningsPitched), inv: false },
  { key: 'K',   label: 'K',   fn: (p) => p.rawStats.pit.strikeOuts || 0,    inv: false },
  { key: 'ER',  label: 'ER',  fn: (p) => p.rawStats.pit.earnedRuns || 0,    inv: true  },
  { key: 'W',   label: 'W',   fn: (p) => p.rawStats.pit.wins || 0,          inv: false },
  { key: 'SV',  label: 'SV',  fn: (p) => p.rawStats.pit.saves || 0,         inv: false },
  { key: 'HLD', label: 'HLD', fn: (p) => p.rawStats.pit.holds || 0,         inv: false },
];

const HEADSHOT = (id) =>
  `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${id}/headshot/67/current`;

const HEADSHOT_FALLBACK =
  'https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/0/headshot/67/current';

// ══════════════════════════════════════════════════════════
// ── SECTION 2 — STATE & URL MANAGEMENT ───────────────────
// ══════════════════════════════════════════════════════════

let _leaderboard      = null;  // { all, batters, pitchers, _rawStats }
let _posFilter        = 'ALL';
let _sortKey          = 'pts';
let _sortDir          = 'desc';
let _modalPlayer      = null;
let _gameLog          = null;
let _refreshInterval  = null;
let _liveGamePks      = null;
let _liveDate         = null;

function getScoringSystem() {
  const p = new URLSearchParams(window.location.search).get('scoring');
  return ['espn','yahoo','fangraphs'].includes(p) ? p : 'espn';
}

function setScoringSystem(key) {
  const url = new URL(window.location.href);
  url.searchParams.set('scoring', key);
  history.replaceState({}, '', url);
  document.querySelectorAll('.scoring-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.scoring === key);
  });
  if (_leaderboard) reRender(key);
}

function reRender(scoringKey) {
  _leaderboard = rebuildLeaderboard(_leaderboard._rawStats, scoringKey);
  renderHeroPair(_leaderboard, _posFilter, scoringKey);
  renderStatMatrix(_leaderboard, _posFilter, scoringKey);
}

// ══════════════════════════════════════════════════════════
// ── SECTION 3 — UTILITIES ────────────────────────────────
// ══════════════════════════════════════════════════════════

function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

function pstHour() {
  return parseInt(new Date().toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false
  }));
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function teamMeta(abbr) {
  const norm  = TEAM_ABBR_NORM[abbr] || abbr;
  const color = TEAM_COLORS[norm] || '#4a5568';
  const id    = TEAM_IDS[norm]    || null;
  return {
    color,
    logoUrl: id ? `https://www.mlbstatic.com/team-logos/${id}.svg` : null,
  };
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
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
  const labels = { loading: '● LOADING', ready: '● FINAL', prev: '● PREV', live: '● LIVE', proj: '● PROJ', error: '● ERROR', 'no-games': '● OFF DAY' };
  el.textContent = msg || labels[state] || state.toUpperCase();
  el.className = 'dash-status status-' + state;
}

function buildProjStatLine(p) {
  if (!p.projSeasonStats) return buildStatLine(p);
  if (p.isPitcher) {
    const s = p.projSeasonStats.pit || {};
    const parts = [];
    if (s.IP > 0) parts.push(`${s.IP} IP`);
    if (s.K  > 0) parts.push(`${s.K} K`);
    if (s.W  > 0) parts.push(`${s.W} W`);
    if (s.SV > 0) parts.push(`${s.SV} SV`);
    if (s.HLD > 0) parts.push(`${s.HLD} HLD`);
    const games = s.GS || s.G || '';
    return (parts.join(' · ') || '—') + (games ? ` / ${games}${s.GS ? 'GS' : 'G'}` : '');
  } else {
    const s = p.projSeasonStats.bat || {};
    const parts = [];
    if (s.HR  > 0) parts.push(`${s.HR} HR`);
    if (s.RBI > 0) parts.push(`${s.RBI} RBI`);
    if (s.R   > 0) parts.push(`${s.R} R`);
    if (s.SB  > 0) parts.push(`${s.SB} SB`);
    if (s.H   > 0 && !parts.length) parts.push(`${s.H} H`);
    return (parts.join(' · ') || '—') + (s.G ? ` / ${s.G}G` : '');
  }
}

function buildStatLine(p) {
  if (p.isProjected) return buildProjStatLine(p);
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

// Heat map background for stat columns: teal (high) → purple (low)
function heatBg(pct) {
  const hue  = 270 - (pct / 100) * 90;
  const sat  = 20  + (pct / 100) * 40;
  const lgt  = 12  + (pct / 100) * 9;
  return `hsl(${hue.toFixed(0)},${sat.toFixed(0)}%,${lgt.toFixed(0)}%)`;
}

// Heat map for PTS column: amber (high) → near-black (low)
function heatPts(pct) {
  const sat = 10  + (pct / 100) * 85;
  const lgt = 7   + (pct / 100) * 20;
  return `hsl(38,${sat.toFixed(0)}%,${lgt.toFixed(0)}%)`;
}

// Display innings pitched in MLB .1/.2 notation (6.1 = 6⅓, 6.2 = 6⅔)
function displayIP(raw) {
  if (raw === null || raw === undefined || raw === '') return '0';
  const str = String(raw);
  if (!str.includes('.')) return str || '0';
  const [whole, frac] = str.split('.');
  if (!frac || frac === '0') return whole || '0';
  return `${whole}.${frac}`;
}

// Percentile rank of val within sorted ascending array
function pctRank(val, sortedVals, inv) {
  if (!sortedVals.length) return 50;
  const rank = sortedVals.filter(v => v <= val).length;
  const raw = Math.round((rank / sortedVals.length) * 100);
  return inv ? 100 - raw : raw;
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

  if (s.TB) {
    // TB-based scoring: 1B=1TB, 2B=2TB, 3B=3TB, HR=4TB
    const tb = singles + 2 * doubles + 3 * triples + 4 * hr;
    if (tb > 0) add('Total Bases', tb, s.TB);
  } else {
    // Per-hit-type scoring (Yahoo / FanGraphs)
    if (singles > 0) add('Singles', singles, s.H);
    if (doubles > 0) add('Doubles', doubles, s.H + s['2B']);
    if (triples > 0) add('Triples', triples, s.H + s['3B']);
    if (hr > 0) add('Home Runs', hr, s.HR);
  }
  add('Runs', bat.runs || 0, s.R);
  add('RBI', bat.rbi || 0, s.RBI);
  add('Walks', bat.baseOnBalls || 0, s.BB);
  add('Stolen Bases', bat.stolenBases || 0, s.SB);
  if ((bat.caughtStealing || 0) > 0 && s.CS) add('Caught Stealing', bat.caughtStealing, s.CS);
  if ((bat.strikeOuts || 0) > 0 && s.K) add('Strikeouts', bat.strikeOuts, s.K);
  if ((bat.hitByPitch || 0) > 0 && s.HBP) add('HBP', bat.hitByPitch, s.HBP);

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
  add('Walks Issued', pit.baseOnBalls || 0, s.BB);
  if ((pit.earnedRuns || 0) > 0 && s.ER) add('Earned Runs', pit.earnedRuns, s.ER);
  if ((pit.hits || 0) > 0 && s.H) add('Hits Allowed', pit.hits, s.H);
  add('Wins', pit.wins || 0, s.W);
  if ((pit.losses || 0) > 0 && s.L) add('Losses', pit.losses, s.L);
  add('Saves', pit.saves || 0, s.SV);
  add('Holds', pit.holds || 0, s.HLD);
  if ((pit.blownSaves || 0) > 0 && s.BS) add('Blown Saves', pit.blownSaves, s.BS);

  return { total: Math.round(total * 10) / 10, breakdown };
}

// ══════════════════════════════════════════════════════════
// ── SECTION 5 — DATA FETCHING ─────────────────────────────
// ══════════════════════════════════════════════════════════

// Returns { pks: [], hasLive: bool } for Final/Live games on a date
async function fetchScheduleForDate(dateStr) {
  const data = await apiFetch(`${API}/schedule?sportId=1&date=${dateStr}&gameType=R`);
  const dates = data.dates || [];
  if (!dates.length) return { pks: [], hasLive: false };
  const games = dates[0].games || [];
  const active = games.filter(g =>
    g.status.abstractGameState === 'Final' || g.status.abstractGameState === 'Live'
  );
  const hasLive = active.some(g => g.status.abstractGameState === 'Live');
  return { pks: active.map(g => g.gamePk), hasLive };
}

// Resolve what data to show based on time of day (PST):
//   Before 7am → previous day's completed games
//   After  7am → today's games if any; otherwise today's projections
// Returns { gamePks, date, mode: 'prev'|'live'|'final'|'proj' }
async function resolveDisplayMode() {
  const today     = todayStr();
  const yesterday = yesterdayStr();

  if (pstHour() < 7) {
    const { pks } = await fetchScheduleForDate(yesterday);
    if (pks.length) return { gamePks: pks, date: yesterday, mode: 'prev' };
    return { gamePks: [], date: today, mode: 'proj' };
  }

  const { pks, hasLive } = await fetchScheduleForDate(today);
  if (pks.length) return { gamePks: pks, date: today, mode: hasLive ? 'live' : 'final' };
  return { gamePks: [], date: today, mode: 'proj' };
}

function startLiveRefresh(gamePks, date) {
  stopLiveRefresh();
  _liveGamePks = gamePks;
  _liveDate    = date;
  _refreshInterval = setInterval(async () => {
    try {
      const { pks, hasLive } = await fetchScheduleForDate(date);
      if (!pks.length) { stopLiveRefresh(); return; }
      const scoringKey  = getScoringSystem();
      const allStats    = await fetchAllBoxscores(pks, date);
      const leaderboard = buildLeaderboard(allStats, scoringKey);
      leaderboard._rawStats = allStats;
      _leaderboard = leaderboard;
      renderHeroPair(leaderboard, _posFilter, scoringKey);
      renderStatMatrix(leaderboard, _posFilter, scoringKey);
      if (!hasLive) { setDashStatus('ready'); stopLiveRefresh(); }
    } catch (_) {}
  }, 90 * 1000);
}

function stopLiveRefresh() {
  if (_refreshInterval) { clearInterval(_refreshInterval); _refreshInterval = null; }
}

async function fetchBoxscore(gamePk) {
  return apiFetch(`${API}/game/${gamePk}/boxscore`);
}

function extractPlayersFromBoxscore(boxscore, gamePk, date) {
  const players = [];
  ['home', 'away'].forEach(side => {
    const team = boxscore.teams[side];
    const teamAbbr = team.team.abbreviation;

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

    (team.pitchers || []).forEach((pid) => {
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
        isStarter: (typeof pit.gamesStarted === 'number' ? pit.gamesStarted > 0 : idx === 0),
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

// ── FG position helpers ────────────────────────────────────
const FG_POS_TO_CODE = {
  'C':'2','1B':'3','2B':'4','3B':'5','SS':'6',
  'LF':'7','CF':'8','RF':'9','OF':'7','DH':'10',
  'SP':'1','RP':'1','P':'1',
};

// Parse FanGraphs pos string (handles "SS/2B", "LF/CF/RF", etc.)
function parseFgPos(raw) {
  if (!raw) return { code: '0', abbr: '?' };
  const primary = String(raw).toUpperCase().split('/')[0].trim();
  return { code: FG_POS_TO_CODE[primary] || '0', abbr: primary };
}

// Resolve MLBAM id from FanGraphs player object (field name varies by endpoint)
function fgMlbamId(p) {
  return p.mlbamid || p.MLBAMID || p.xMLBAMID || p.minMajorLeagueId || null;
}

// ── Next scheduled game date ───────────────────────────────
async function fetchNextGameDate(fromDate) {
  const end = new Date(fromDate + 'T12:00:00');
  end.setDate(end.getDate() + 14);
  const endStr = end.toLocaleDateString('en-CA');
  const data = await apiFetch(
    `${API}/schedule?sportId=1&startDate=${fromDate}&endDate=${endStr}&gameType=R`
  );
  const upcoming = (data.dates || []).filter(d => d.games && d.games.length > 0);
  return upcoming.length ? upcoming[0].date : null;
}

// ── FanGraphs Steamer projections ─────────────────────────
async function fetchFanGraphsProjections() {
  const FG = 'https://www.fangraphs.com/api/projections';
  const [batData, pitData] = await Promise.all([
    apiFetch(`${FG}?pos=all&stats=bat&type=steamer&team=0&lg=all&players=0`),
    apiFetch(`${FG}?pos=all&stats=pit&type=steamer&team=0&lg=all&players=0`),
  ]);

  const players = [];

  for (const p of (batData || [])) {
    const g = p.G || p.g || 1;
    if (g < 20 || !p.Name) continue;
    const { code, abbr } = parseFgPos(p.pos || p.Pos || '');
    const season = {
      H: Math.round(p.H || 0), '2B': Math.round(p['2B'] || 0),
      '3B': Math.round(p['3B'] || 0), HR: Math.round(p.HR || 0),
      R: Math.round(p.R || 0), RBI: Math.round(p.RBI || 0),
      BB: Math.round(p.BB || 0), SB: Math.round(p.SB || 0),
      G: Math.round(g),
    };
    players.push({
      id: fgMlbamId(p),
      name: p.Name,
      teamAbbr: (p.Team || '—').toUpperCase(),
      teamName: p.Team || '—',
      posCode: code,
      posAbbr: abbr,
      isPitcher: false,
      isStarter: false,
      isProjected: true,
      projSeasonStats: { bat: season },
      rawStats: {
        bat: {
          hits:           (p.H     || 0) / g,
          doubles:        (p['2B'] || 0) / g,
          triples:        (p['3B'] || 0) / g,
          homeRuns:       (p.HR    || 0) / g,
          runs:           (p.R     || 0) / g,
          rbi:            (p.RBI   || 0) / g,
          baseOnBalls:    (p.BB    || 0) / g,
          stolenBases:    (p.SB    || 0) / g,
          caughtStealing: (p.CS    || 0) / g,
          strikeOuts:     (p.SO    || 0) / g,
          hitByPitch:     (p.HBP   || 0) / g,
          atBats:         (p.AB    || p.PA || 1) / g,
        }
      },
    });
  }

  for (const p of (pitData || [])) {
    const gs = p.GS || p.gs || 0;
    const g  = p.G  || p.g  || 1;
    const isStarter = gs >= 5;
    const div = isStarter ? Math.max(gs, 1) : Math.max(g, 1);
    if (div < 5 || !p.Name) continue;
    const season = {
      IP: +(p.IP || 0).toFixed(1), K: Math.round(p.K || p.SO || 0),
      W: Math.round(p.W || 0), SV: Math.round(p.SV || 0),
      HLD: Math.round(p.HLD || 0), ER: Math.round(p.ER || 0),
      GS: Math.round(gs), G: Math.round(g),
    };
    players.push({
      id: fgMlbamId(p),
      name: p.Name,
      teamAbbr: (p.Team || '—').toUpperCase(),
      teamName: p.Team || '—',
      posCode: '1',
      posAbbr: isStarter ? 'SP' : 'RP',
      isPitcher: true,
      isStarter,
      isProjected: true,
      projSeasonStats: { pit: season },
      rawStats: {
        pit: {
          inningsPitched: (p.IP  || 0) / div,
          strikeOuts:     (p.K   || p.SO || 0) / div,
          earnedRuns:     (p.ER  || 0) / div,
          wins:           (p.W   || 0) / div,
          losses:         (p.L   || 0) / div,
          saves:          (p.SV  || 0) / div,
          holds:          (p.HLD || 0) / div,
          baseOnBalls:    (p.BB  || 0) / div,
          hits:           (p.H   || 0) / div,
          blownSaves:     (p.BS  || 0) / div,
        }
      },
    });
  }

  return players;
}

// ── MLB projected ROS fallback (CORS-safe, uses MLB IDs) ──
async function fetchMLBProjectedRos() {
  const yr = new Date().getFullYear();
  const [hitData, pitData] = await Promise.all([
    apiFetch(`${API}/stats?stats=projectedRos&sportId=1&group=hitting&season=${yr}&limit=600`),
    apiFetch(`${API}/stats?stats=projectedRos&sportId=1&group=pitching&season=${yr}&limit=600`),
  ]);

  const players = [];

  for (const split of ((hitData.stats || [])[0] || {}).splits || []) {
    const s = split.stat || {};
    const g = s.gamesPlayed || 1;
    if (g < 20 || !split.player) continue;
    const pos = split.position || {};
    players.push({
      id: split.player.id,
      name: split.player.fullName,
      teamAbbr: (split.team && split.team.abbreviation) || '—',
      teamName: (split.team && split.team.name) || '—',
      posCode: pos.code || '0',
      posAbbr: pos.abbreviation || '?',
      isPitcher: false,
      isStarter: false,
      isProjected: true,
      projSeasonStats: {
        bat: {
          H: s.hits || 0, '2B': s.doubles || 0, '3B': s.triples || 0,
          HR: s.homeRuns || 0, R: s.runs || 0, RBI: s.rbi || 0,
          BB: s.baseOnBalls || 0, SB: s.stolenBases || 0, G: g,
        }
      },
      rawStats: {
        bat: {
          hits:           (s.hits         || 0) / g,
          doubles:        (s.doubles      || 0) / g,
          triples:        (s.triples      || 0) / g,
          homeRuns:       (s.homeRuns     || 0) / g,
          runs:           (s.runs         || 0) / g,
          rbi:            (s.rbi          || 0) / g,
          baseOnBalls:    (s.baseOnBalls  || 0) / g,
          stolenBases:    (s.stolenBases  || 0) / g,
          caughtStealing: (s.caughtStealing || 0) / g,
          strikeOuts:     (s.strikeOuts   || 0) / g,
          atBats:         (s.atBats       || 1) / g,
        }
      },
    });
  }

  for (const split of ((pitData.stats || [])[0] || {}).splits || []) {
    const s = split.stat || {};
    const gs = s.gamesStarted || 0;
    const g  = s.gamesPitched || s.gamesPlayed || 1;
    const isStarter = gs >= 5;
    const div = isStarter ? Math.max(gs, 1) : Math.max(g, 1);
    if (div < 5 || !split.player) continue;
    const ip = parseInningsPitched(s.inningsPitched);
    players.push({
      id: split.player.id,
      name: split.player.fullName,
      teamAbbr: (split.team && split.team.abbreviation) || '—',
      teamName: (split.team && split.team.name) || '—',
      posCode: '1',
      posAbbr: isStarter ? 'SP' : 'RP',
      isPitcher: true,
      isStarter,
      isProjected: true,
      projSeasonStats: {
        pit: {
          IP: +(ip).toFixed(1), K: s.strikeOuts || 0,
          W: s.wins || 0, SV: s.saves || 0,
          HLD: s.holds || 0, ER: s.earnedRuns || 0,
          GS: gs, G: g,
        }
      },
      rawStats: {
        pit: {
          inningsPitched: ip / div,
          strikeOuts:     (s.strikeOuts   || 0) / div,
          earnedRuns:     (s.earnedRuns   || 0) / div,
          wins:           (s.wins         || 0) / div,
          losses:         (s.losses       || 0) / div,
          saves:          (s.saves        || 0) / div,
          holds:          (s.holds        || 0) / div,
          baseOnBalls:    (s.baseOnBalls  || 0) / div,
          hits:           (s.hits         || 0) / div,
          blownSaves:     (s.blownSaves   || 0) / div,
        }
      },
    });
  }

  return players;
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
      return p.rawStats.pit && p.rawStats.pit.inningsPitched !== undefined;
    } else {
      return p.fantasyScore !== 0 || ((p.rawStats.bat && p.rawStats.bat.atBats) || 0) > 0;
    }
  });

  const all = scored.slice().sort((a, b) => b.fantasyScore - a.fantasyScore);
  all.forEach((p, i) => { p.globalRank = i + 1; });
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
// ── SECTION 7 — RENDER: HERO PAIR ────────────────────────
// ══════════════════════════════════════════════════════════

function buildHeroHTML(player, label, scoringKey, leaderboard) {
  if (!player) {
    return `<div class="hero-label">${label}</div>
            <div class="hero-empty"><span>—</span></div>`;
  }
  const statLine    = buildStatLine(player);
  const overallRank = leaderboard.all.indexOf(player) + 1;
  const rankStr     = '#' + String(overallRank).padStart(2, '0');
  const { color, logoUrl } = teamMeta(player.teamAbbr);
  const borderStyle = `border-left:3px solid ${hexToRgba(color, 0.7)};`;
  const bgStyle     = `background:linear-gradient(135deg,${hexToRgba(color,0.06)} 0%,transparent 55%);`;
  const logoEl      = logoUrl
    ? `<div class="hero-team-logo" style="background-image:url('${logoUrl}')"></div>`
    : '';
  return `
    <div class="hero-label">${label}</div>
    <div class="hero-inner" style="${borderStyle}${bgStyle}">
      ${logoEl}
      <img class="hero-photo" src="${player.id ? HEADSHOT(player.id) : HEADSHOT_FALLBACK}" alt="${player.name}"
           onerror="this.src='${HEADSHOT_FALLBACK}'">
      <div class="hero-content">
        <div class="hero-rank">${rankStr}</div>
        <div class="hero-name">${player.name.toUpperCase()}</div>
        <div class="hero-meta">${player.teamAbbr} · ${player.posAbbr}</div>
        <div class="hero-pts">${player.fantasyScore.toFixed(1)}<span class="hero-pts-unit"> PTS</span></div>
        <div class="hero-statline">${statLine}</div>
      </div>
    </div>
  `;
}

const POS_LABELS = {
  SP:   '// TOP_STARTER',
  RP:   '// TOP_RELIEVER',
  C:    '// TOP_CATCHER',
  '1B': '// TOP_FIRST_BASEMAN',
  '2B': '// TOP_SECOND_BASEMAN',
  '3B': '// TOP_THIRD_BASEMAN',
  SS:   '// TOP_SHORTSTOP',
  IF:   '// TOP_INFIELDER',
  OF:   '// TOP_OUTFIELDER',
  DH:   '// TOP_DESIGNATED_HITTER',
};

const GENERAL_FILTERS = ['ALL', 'HIT'];

function renderHeroPair(leaderboard, posFilter, scoringKey) {
  const topPitcher = leaderboard.pitchers[0] || null;
  const topHitter  = leaderboard.batters[0]  || null;

  const heroCard       = document.getElementById('heroCard');
  const heroHitterCard = document.getElementById('heroHitterCard');
  const heroPosCard    = document.getElementById('heroPosCard');
  const heroPair       = document.getElementById('heroPair');

  heroCard.innerHTML       = buildHeroHTML(topPitcher, '// PITCHER_OF_THE_DAY', scoringKey, leaderboard);
  heroHitterCard.innerHTML = buildHeroHTML(topHitter,  '// HITTER_OF_THE_DAY',  scoringKey, leaderboard);

  if (topPitcher) {
    heroCard.style.cursor = 'pointer';
    heroCard.onclick = () => openModal(topPitcher, scoringKey, leaderboard);
  }
  if (topHitter) {
    heroHitterCard.style.cursor = 'pointer';
    heroHitterCard.onclick = () => openModal(topHitter, scoringKey, leaderboard);
  }

  // Third card: show when a specific position filter is active
  const showPosCard = !GENERAL_FILTERS.includes(posFilter);
  if (showPosCard) {
    const filterFn = POS_FILTER_FN[posFilter] || POS_FILTER_FN.ALL;
    const topPos   = leaderboard.all.filter(filterFn)[0] || null;
    const label    = POS_LABELS[posFilter] || `// TOP_${posFilter}`;
    heroPosCard.innerHTML = buildHeroHTML(topPos, label, scoringKey, leaderboard);
    heroPosCard.style.display = '';
    heroPair.classList.add('has-pos-card');
    if (topPos) {
      heroPosCard.style.cursor = 'pointer';
      heroPosCard.onclick = () => openModal(topPos, scoringKey, leaderboard);
    }
  } else {
    heroPosCard.style.display = 'none';
    heroPair.classList.remove('has-pos-card');
  }
}

// ══════════════════════════════════════════════════════════
// ── SECTION 8 — RENDER: STAT MATRIX ──────────────────────
// ══════════════════════════════════════════════════════════

function applySort(arr, cols) {
  const sorted = arr.slice();
  const mult = _sortDir === 'desc' ? -1 : 1;
  if (_sortKey === 'rnk' || _sortKey === 'pts') {
    sorted.sort((a, b) => mult * (a.fantasyScore - b.fantasyScore));
  } else if (_sortKey === 'player') {
    sorted.sort((a, b) => mult * a.name.localeCompare(b.name));
  } else if (cols) {
    const col = cols.find(c => c.key === _sortKey);
    if (col) sorted.sort((a, b) => mult * (col.fn(a) - col.fn(b)));
    else sorted.sort((a, b) => -1 * (a.fantasyScore - b.fantasyScore));
  }
  return sorted;
}

function renderStatMatrix(leaderboard, posFilter, scoringKey) {
  const filterFn = POS_FILTER_FN[posFilter] || POS_FILTER_FN.ALL;
  const filtered = leaderboard.all.filter(filterFn);

  document.getElementById('matrixCount').textContent =
    filtered.length ? `${filtered.length} RECORDS` : '';

  const isPitcherView = posFilter === 'SP' || posFilter === 'RP';
  const isBatterView  = BATTER_FILTERS.includes(posFilter);
  const isAllView     = !isPitcherView && !isBatterView;
  const cols          = isPitcherView ? PIT_COLS : isBatterView ? BAT_COLS : null;

  const sorted = applySort(filtered, cols);

  // Pre-sort stat values for percentile calc (always use filtered, not sorted)
  const pctFns = {};
  if (cols) {
    cols.forEach(col => {
      const vals = filtered.map(p => col.fn(p)).sort((a, b) => a - b);
      pctFns[col.key] = (val) => pctRank(val, vals, col.inv);
    });
  }

  // PTS percentile (heat map only, no digit shown)
  const ptsSorted = filtered.map(p => p.fantasyScore).sort((a, b) => a - b);
  const ptsPct = (val) => pctRank(val, ptsSorted, false);

  // Sort indicator helper
  const ind = (key) => _sortKey === key ? (_sortDir === 'desc' ? ' ▼' : ' ▲') : '';
  const thCls = (key) => `class="${_sortKey === key ? 'th-sort-active' : ''}"`;

  // Build thead
  const head = document.getElementById('matrixHead');
  if (isAllView) {
    head.innerHTML = `<tr>
      <th class="th-rank th-sort" data-sort="rnk" ${thCls('rnk')}>RNK${ind('rnk')}</th>
      <th class="th-player th-sort" data-sort="player" ${thCls('player')}>PLAYER${ind('player')}</th>
      <th class="th-pos">POS</th>
      <th class="th-pts th-sort" data-sort="pts" ${thCls('pts')}>PTS${ind('pts')}</th>
    </tr>`;
  } else {
    const statThs = cols.map(c =>
      `<th class="th-stat th-sort" data-sort="${c.key}" ${thCls(c.key)}>${c.label}${ind(c.key)}</th>`
    ).join('');
    head.innerHTML = `<tr>
      <th class="th-rank th-sort" data-sort="rnk" ${thCls('rnk')}>RNK${ind('rnk')}</th>
      <th class="th-player th-sort" data-sort="player" ${thCls('player')}>PLAYER${ind('player')}</th>
      <th class="th-pts th-sort" data-sort="pts" ${thCls('pts')}>PTS${ind('pts')}</th>
      ${statThs}
    </tr>`;
  }

  // Wire sort clicks
  head.querySelectorAll('.th-sort').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (_sortKey === key) {
        _sortDir = _sortDir === 'desc' ? 'asc' : 'desc';
      } else {
        _sortKey = key;
        _sortDir = key === 'player' ? 'asc' : 'desc';
      }
      renderStatMatrix(leaderboard, posFilter, scoringKey);
    });
  });

  // Build tbody
  const body = document.getElementById('matrixBody');
  if (!sorted.length) {
    const colCount = isAllView ? 4 : 3 + (cols ? cols.length : 0);
    body.innerHTML = `<tr><td colspan="${colCount}" class="td-empty">NO DATA FOR THIS FILTER</td></tr>`;
    return;
  }

  if (isAllView) {
    body.innerHTML = sorted.map((p, i) => {
      const rankStr  = '#' + String(p.globalRank).padStart(2, '0');
      const ptsBg    = heatPts(ptsPct(p.fantasyScore));
      const { color } = teamMeta(p.teamAbbr);
      const rowStyle = `border-left:3px solid ${hexToRgba(color,0.55)};background:${hexToRgba(color,0.02)};`;
      return `<tr class="matrix-row" data-idx="${i}" style="${rowStyle}">
        <td class="td-rank">${rankStr}</td>
        <td class="td-player"><span class="player-name">${p.name}</span><span class="player-team">${p.teamAbbr}</span></td>
        <td class="td-pos">${p.posAbbr}</td>
        <td class="td-pts"><div class="stat-cell" style="background:${ptsBg}"><span class="stat-val">${p.fantasyScore.toFixed(1)}</span></div></td>
      </tr>`;
    }).join('');

  } else {
    body.innerHTML = sorted.map((p, i) => {
      const rankStr = '#' + String(p.globalRank).padStart(2, '0');
      const ptsBg   = heatPts(ptsPct(p.fantasyScore));
      const { color } = teamMeta(p.teamAbbr);
      const rowStyle = `border-left:3px solid ${hexToRgba(color,0.55)};background:${hexToRgba(color,0.02)};`;

      const statCells = cols.map(col => {
        const val  = col.fn(p);
        const cPct = pctFns[col.key](val);
        const bg   = heatBg(cPct);
        const disp = col.key === 'IP'
          ? displayIP(p.rawStats.pit.inningsPitched)
          : val;
        return `<td class="td-stat">
          <div class="stat-cell" style="background:${bg}">
            <span class="stat-val">${disp}</span>
          </div>
        </td>`;
      }).join('');

      return `<tr class="matrix-row" data-idx="${i}" style="${rowStyle}">
        <td class="td-rank">${rankStr}</td>
        <td class="td-player"><span class="player-name">${p.name}</span><span class="player-team">${p.teamAbbr}</span></td>
        <td class="td-pts"><div class="stat-cell" style="background:${ptsBg}"><span class="stat-val">${p.fantasyScore.toFixed(1)}</span></div></td>
        ${statCells}
      </tr>`;
    }).join('');
  }

  // Wire row click → modal (use sorted index)
  body.querySelectorAll('.matrix-row').forEach(row => {
    const idx = parseInt(row.dataset.idx);
    const player = sorted[idx];
    if (player) {
      row.addEventListener('click', () => openModal(player, scoringKey, leaderboard));
    }
  });
}

// ══════════════════════════════════════════════════════════
// ── SECTION 9 — RENDER: SKELETON + EMPTY STATES ──────────
// ══════════════════════════════════════════════════════════

function renderSkeleton() {
  const skHero = `
    <div class="hero-label">// ——</div>
    <div class="skeleton-block" style="height:140px;border-radius:2px;margin-top:8px;"></div>
  `;
  document.getElementById('heroCard').innerHTML       = skHero;
  document.getElementById('heroHitterCard').innerHTML = skHero;

  const skRow = `<tr>${Array(5).fill(0).map(() =>
    `<td><div class="skeleton-block" style="height:36px;border-radius:2px;margin:3px 6px;"></div></td>`
  ).join('')}</tr>`;
  document.getElementById('matrixBody').innerHTML = Array(10).fill(skRow).join('');
  document.getElementById('matrixCount').textContent = '';
}

function renderNoGames() {
  const noHTML = (label) => `
    <div class="hero-label">${label}</div>
    <div class="no-games-state">
      <div class="no-games-label">NO GAMES TODAY</div>
    </div>
  `;
  document.getElementById('heroCard').innerHTML       = noHTML('// PLAYER_OF_THE_DAY');
  document.getElementById('heroHitterCard').innerHTML = noHTML('// TOP_HITTER');
  document.getElementById('matrixBody').innerHTML =
    `<tr><td colspan="5" class="td-empty">NO GAMES TODAY</td></tr>`;
  document.getElementById('matrixCount').textContent = '';
}

// ══════════════════════════════════════════════════════════
// ── SECTION 10 — MODAL ───────────────────────────────────
// ══════════════════════════════════════════════════════════

function openModal(player, scoringKey, leaderboard) {
  _modalPlayer = player;
  _gameLog = null;

  const overlay    = document.getElementById('modalOverlay');
  const photo      = document.getElementById('modalPhoto');
  const name       = document.getElementById('modalName');
  const teamPos    = document.getElementById('modalTeamPos');
  const pts        = document.getElementById('modalPts');
  const breakdown  = document.getElementById('modalBreakdown');
  const ranks      = document.getElementById('modalRanks');
  const histBody   = document.getElementById('modalHistBody');

  // Team color + logo on photo row
  const { color: tColor, logoUrl: tLogo } = teamMeta(player.teamAbbr);
  const photoRow = document.getElementById('modalPhotoRow');
  if (photoRow) {
    photoRow.style.borderLeft  = `3px solid ${hexToRgba(tColor, 0.7)}`;
    photoRow.style.background  = `linear-gradient(135deg,${hexToRgba(tColor,0.07)} 0%,transparent 60%)`;
    // Remove old logo if any, inject new one
    const old = photoRow.querySelector('.modal-team-logo');
    if (old) old.remove();
    if (tLogo) {
      const logoDiv = document.createElement('div');
      logoDiv.className = 'modal-team-logo';
      logoDiv.style.backgroundImage = `url('${tLogo}')`;
      photoRow.appendChild(logoDiv);
    }
  }

  photo.src = player.id ? HEADSHOT(player.id) : HEADSHOT_FALLBACK;
  photo.onerror = () => { photo.src = HEADSHOT_FALLBACK; };
  name.textContent = player.name;
  teamPos.textContent = `${player.teamAbbr} · ${player.posAbbr}`;
  pts.textContent = player.fantasyScore.toFixed(1);
  const ptsLabel = document.getElementById('modalPtsLabel');
  if (ptsLabel) ptsLabel.textContent = player.isProjected ? 'PROJ/G' : 'TODAY';

  breakdown.innerHTML = '<div class="breakdown-title">// SCORING_BREAKDOWN</div>' +
    player.breakdown.map(b => `
      <div class="breakdown-row">
        <span class="breakdown-label">${b.label}</span>
        <span class="breakdown-count">${b.count}</span>
        <span class="breakdown-pts ${b.pts >= 0 ? 'pos' : 'neg'}">${b.pts > 0 ? '+' : ''}${b.pts.toFixed(1)}</span>
      </div>
    `).join('');

  const overallRank = leaderboard.all.indexOf(player) + 1;
  const posList     = player.isPitcher ? leaderboard.pitchers : leaderboard.batters;
  const posRank     = posList.indexOf(player) + 1;
  ranks.innerHTML = `
    <div class="rank-badge">#${overallRank} OVERALL</div>
    <div class="rank-badge">#${posRank} ${player.isPitcher ? 'PITCHERS' : player.posAbbr}</div>
  `;

  histBody.innerHTML = '<div class="hist-loading">Loading history...</div>';
  document.querySelectorAll('.hist-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.window === '7');
  });

  overlay.setAttribute('aria-hidden', 'false');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

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
  }, 280);
}

function renderHistoryTab(gameLog, windowDays, scoringKey) {
  const histBody = document.getElementById('modalHistBody');
  if (!gameLog || !gameLog.length) {
    histBody.innerHTML = '<div class="hist-loading">No game history found.</div>';
    return;
  }
  const player = _modalPlayer;
  if (!player) return;

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

  const avg  = scored.reduce((s, g) => s + g.fantasyScore, 0) / scored.length;
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
      <div class="hist-peak-label">// BEST_GAME</div>
      <div class="hist-peak-date">${peak.date} · vs ${peak.opponent}</div>
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

// ══════════════════════════════════════════════════════════
// ── SECTION 11 — INIT ────────────────────────────────────
// ══════════════════════════════════════════════════════════

function initScoringToggle() {
  const key = getScoringSystem();
  document.querySelectorAll('.scoring-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.scoring === key);
    btn.addEventListener('click', () => setScoringSystem(btn.dataset.scoring));
  });
}

function initPosFilter() {
  document.querySelectorAll('.pos-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _posFilter = btn.dataset.pos;
      document.querySelectorAll('.pos-btn').forEach(b =>
        b.classList.toggle('active', b === btn)
      );
      if (_leaderboard) {
        const key = getScoringSystem();
        renderHeroPair(_leaderboard, _posFilter, key);
        renderStatMatrix(_leaderboard, _posFilter, key);
      }
    });
  });
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

function initDateLabel(dateStr, isYesterday, isProjected, nextGameDate) {
  const el = document.getElementById('dashDate');
  if (!el) return;
  if (isProjected) {
    let label = 'STEAMER PROJ · PER GAME';
    if (nextGameDate) {
      const nd = new Date(nextGameDate + 'T12:00:00');
      const ndLabel = nd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
      label += ` · NEXT: ${ndLabel}`;
    }
    el.textContent = label;
    return;
  }
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
  const label = d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  }).toUpperCase();
  el.textContent = isYesterday ? `${label} · PREV` : label;
}

async function init() {
  stopLiveRefresh();
  initScoringToggle();
  initPosFilter();
  initModalListeners();
  renderSkeleton();
  setDashStatus('loading');

  const scoringKey = getScoringSystem();

  try {
    const { gamePks, date, mode } = await resolveDisplayMode();
    const isYesterday = mode === 'prev';
    const isProjected = mode === 'proj';

    if (isProjected) {
      let projPlayers = [];
      try { projPlayers = await fetchFanGraphsProjections(); } catch (_) {}
      if (!projPlayers.length) {
        try { projPlayers = await fetchMLBProjectedRos(); } catch (_) {}
      }
      if (projPlayers.length) {
        const leaderboard = buildLeaderboard(projPlayers, scoringKey);
        leaderboard._rawStats = projPlayers;
        _leaderboard = leaderboard;
        let nextGameDate = null;
        try { nextGameDate = await fetchNextGameDate(date); } catch (_) {}
        initDateLabel(date, false, true, nextGameDate);
        renderHeroPair(leaderboard, scoringKey);
        renderStatMatrix(leaderboard, _posFilter, scoringKey);
        setDashStatus('proj');
      } else {
        renderNoGames();
        setDashStatus('no-games');
      }
      return;
    }

    initDateLabel(date, isYesterday, false, null);
    const allStats    = await fetchAllBoxscores(gamePks, date);
    const leaderboard = buildLeaderboard(allStats, scoringKey);
    leaderboard._rawStats = allStats;
    _leaderboard = leaderboard;

    if (leaderboard.all.length === 0) {
      renderNoGames();
      setDashStatus('no-games');
    } else {
      renderHeroPair(leaderboard, scoringKey);
      renderStatMatrix(leaderboard, _posFilter, scoringKey);
      const statusKey = mode === 'live' ? 'live' : isYesterday ? 'prev' : 'ready';
      setDashStatus(statusKey);
      if (mode === 'live') startLiveRefresh(gamePks, date);
    }

  } catch (err) {
    console.error('Fantasy dashboard error:', err);
    setDashStatus('error', '● ERROR');
    document.getElementById('heroCard').innerHTML =
      `<div class="hero-label">// PLAYER_OF_THE_DAY</div>
       <div class="no-games-state">
         <div class="no-games-label">FAILED TO LOAD</div>
       </div>`;
  }
}

document.addEventListener('DOMContentLoaded', init);
