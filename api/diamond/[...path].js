import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Diamond Engine API proxy for Vercel.
 *
 * Serves pre-computed sim data from data/diamond/latest.json.
 * Mirrors the FastAPI endpoint structure so frontend code uses
 * the same paths in dev (localhost:8000) and prod (/api/diamond).
 */

function loadSimData() {
  try {
    const filepath = join(process.cwd(), 'data', 'diamond', 'latest.json');
    return JSON.parse(readFileSync(filepath, 'utf-8'));
  } catch {
    return null;
  }
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
}

export default function handler(req, res) {
  cors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse route from URL — more reliable than req.query.path which
  // can be empty after ESM→CJS compilation on some Vercel runtimes.
  const urlPath = (req.url || '').split('?')[0];
  const route = urlPath.replace(/^\/api\/diamond\/?/, '');

  const data = loadSimData();
  if (!data) {
    return res.status(503).json({
      error: 'No simulation data available',
      hint: 'Run deploy-diamond.sh to publish latest sim data.',
    });
  }

  // GET / — service info
  if (route === '' || route === '/') {
    return res.json({
      service: 'Diamond Engine',
      version: '0.1.0',
      status: 'static',
      sim_date: data.sim_date || null,
      num_games: (data.games || []).length,
    });
  }

  // GET /sim-results/{date} — full sim JSON
  if (route.startsWith('sim-results')) {
    return res.json(data);
  }

  // GET /schedule — game list
  if (route === 'schedule') {
    return res.json({
      date: data.sim_date,
      games: (data.games || []).map(g => ({
        game_id: g.game_id,
        away_team: g.away_team,
        home_team: g.home_team,
        park: g.park || '',
        game_time: g.game_time || '',
      })),
    });
  }

  // GET /matchups — matchup ratings
  if (route === 'matchups') {
    const matchups = (data.games || []).map(g => {
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
      };
    });
    return res.json({ date: data.sim_date, matchups });
  }

  // GET /leaderboard — sorted player projections
  if (route === 'leaderboard') {
    const stat = req.query.stat || 'hr_mean';
    const limit = parseInt(req.query.limit || '20', 10);
    const minPa = parseFloat(req.query.min_pa || '3.0');

    const allPlayers = [];
    for (const g of (data.games || [])) {
      for (const [, playerData] of Object.entries(g.players || {})) {
        if ((playerData.pa_mean || 0) >= minPa) {
          allPlayers.push({
            ...playerData,
            game_id: g.game_id,
            matchup: `${g.away_team} @ ${g.home_team}`,
          });
        }
      }
    }
    allPlayers.sort((a, b) => (b[stat] || 0) - (a[stat] || 0));

    return res.json({
      date: data.sim_date,
      stat,
      leaderboard: allPlayers.slice(0, limit),
    });
  }

  // GET /props/{game_id}
  const propsMatch = route.match(/^props\/(\d+)$/);
  if (propsMatch) {
    const gameId = parseInt(propsMatch[1], 10);
    const game = (data.games || []).find(g => g.game_id === gameId);
    if (!game) return res.status(404).json({ error: `Game ${gameId} not found` });
    return res.json({ game_id: gameId, date: data.sim_date, props: game.props || {} });
  }

  // GET /f5/{game_id}
  const f5Match = route.match(/^f5\/(\d+)$/);
  if (f5Match) {
    const gameId = parseInt(f5Match[1], 10);
    const game = (data.games || []).find(g => g.game_id === gameId);
    if (!game) return res.status(404).json({ error: `Game ${gameId} not found` });
    return res.json({ game_id: gameId, date: data.sim_date, f5: game.f5 || {} });
  }

  // GET /first-inning/{game_id}
  const yrfiMatch = route.match(/^first-inning\/(\d+)$/);
  if (yrfiMatch) {
    const gameId = parseInt(yrfiMatch[1], 10);
    const game = (data.games || []).find(g => g.game_id === gameId);
    if (!game) return res.status(404).json({ error: `Game ${gameId} not found` });
    return res.json({ game_id: gameId, date: data.sim_date, yrfi: game.yrfi || {} });
  }

  // GET /player/{id}/projections
  const playerMatch = route.match(/^player\/(\d+)\/projections$/);
  if (playerMatch) {
    const playerId = playerMatch[1];
    for (const g of (data.games || [])) {
      const players = g.players || {};
      const props = g.props || {};
      if (playerId in players) {
        return res.json({
          player_id: parseInt(playerId, 10),
          date: data.sim_date,
          game_id: g.game_id,
          away_team: g.away_team,
          home_team: g.home_team,
          projections: players[playerId],
          props: props[playerId] || null,
        });
      }
    }
    return res.status(404).json({ error: `Player ${playerId} not found` });
  }

  // GET /park-factors
  if (route === 'park-factors') {
    return res.json({ status: 'no_data', message: 'Park factors not available in static mode.' });
  }

  // POST /matchup-machine — serve from pre-computed matchup matrix
  if (route === 'matchup-machine') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'POST required' });
    }

    const { batter_id, pitcher_id } = req.body || {};
    if (!batter_id || !pitcher_id) {
      return res.status(400).json({ error: 'batter_id and pitcher_id required' });
    }

    const key = `${batter_id}_${pitcher_id}`;
    for (const g of (data.games || [])) {
      const matrix = g.matchup_matrix || {};
      if (key in matrix) {
        const m = matrix[key];
        return res.json({
          batter_id: m.batter_id,
          pitcher_id: m.pitcher_id,
          bat_side: m.bat_side,
          pitch_hand: m.pitch_hand,
          outcome_probs: m.outcome_probs,
          rating: m.rating,
          status: 'ok',
          source: 'pre-computed',
        });
      }
    }

    return res.json({
      batter_id,
      pitcher_id,
      status: 'not_found',
      message: 'Matchup not in today\'s lineup matrix. Use localhost:8000 for arbitrary queries.',
    });
  }

  return res.status(404).json({ error: `Unknown endpoint: ${route}` });
}
