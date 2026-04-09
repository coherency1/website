// === COHERENCY — Baseball Hub ===

// ══════════════════════════════════════════════════════════
// ── SHARED STATE ─────────────────────────────────────────
// ══════════════════════════════════════════════════════════

const GAME = { feed: null, state: null, onUpdate: null };

const TEAM_COLORS = {
    'ARI': '#A71930', 'ATL': '#CE1141', 'BAL': '#DF4601',
    'BOS': '#BD3039', 'CHC': '#0E3386', 'CWS': '#C4CED4',
    'CIN': '#C6011F', 'CLE': '#E31937', 'COL': '#8B81C3',
    'DET': '#FA4616', 'HOU': '#EB6E1F', 'KC':  '#7BB2DD',
    'LAA': '#BA0021', 'LAD': '#4a8fe7', 'MIA': '#00A3E0',
    'MIL': '#FFC52F', 'MIN': '#D31145', 'NYM': '#FF5910',
    'NYY': '#C4CED4', 'OAK': '#006747', 'PHI': '#E81828',
    'PIT': '#FDB827', 'SD':  '#A0785A', 'SF':  '#FD5A1E',
    'SEA': '#4DC8C8', 'STL': '#C41E3A', 'TB':  '#F5D130',
    'TEX': '#C0111F', 'TOR': '#1D6FA4', 'WSH': '#AB0003',
};

// ══════════════════════════════════════════════════════════
// ── HUB DATA ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════

const HUB_ITEMS = {
    games: [
        { num: '27', name: 'STATPAD',  pos: 'TRV', url: '/baseball/statpad/', status: 'ACTIVE', stack: 'REACT', type: 'GAME', desc: 'Baseball trivia puzzle. Pick player-seasons that match category filters to maximize your score across 5 rows.' },
        { num: '2',  name: 'DEADEYE',  pos: 'DRT', url: '/baseball/deadeye/', status: 'ACTIVE', stack: 'REACT', type: 'GAME', desc: 'Daily baseball darts. Given a target score and stat category, guess MLB player seasons to count down to exactly zero.' },
        { num: '5',  name: 'TBD',      pos: '---', url: null, status: 'PLANNED', stack: '---',      type: '---',  desc: 'Coming soon.' },
        { num: '10', name: 'TBD',      pos: '---', url: null, status: 'PLANNED', stack: '---',      type: '---',  desc: 'Coming soon.' },
        { num: '33', name: 'TBD',      pos: '---', url: null, status: 'PLANNED', stack: '---',      type: '---',  desc: 'Coming soon.' },
        { num: '44', name: 'TBD',      pos: '---', url: null, status: 'PLANNED', stack: '---',      type: '---',  desc: 'Coming soon.' },
        { num: '55', name: 'TBD',      pos: '---', url: null, status: 'PLANNED', stack: '---',      type: '---',  desc: 'Coming soon.' },
        { num: '66', name: 'TBD',      pos: '---', url: null, status: 'PLANNED', stack: '---',      type: '---',  desc: 'Coming soon.' },
        { num: '99', name: 'TBD',      pos: '---', url: null, status: 'PLANNED', stack: '---',      type: '---',  desc: 'Coming soon.' },
    ],
    apps: [
        { num: '7',  name: 'FANTASY',     pos: 'DSH', url: '/baseball/fantasy/', status: 'LIVE',   stack: 'MLB API',  type: 'DASH', desc: 'Daily fantasy leaderboard. Player of the Day, top weekly performances, and position slot leaders. ESPN, Yahoo, and FanGraphs scoring.' },
        { num: '14', name: 'RIGHT RESERVE', pos: 'WRI', url: 'https://thecoherency.substack.com', status: 'ACTIVE', stack: 'SUBSTACK', type: 'BLOG', desc: 'Right Reserve — baseball takes, random findings, and Coherency project writeups. A personal publication by Corey Chen.' },
        { num: '17', name: 'TBD',         pos: '---', url: null,          status: 'PLANNED', stack: '---',      type: '---',  desc: 'Coming soon.' },
        { num: '50', name: 'DRAFT ORDER', pos: 'RND', url: null,          status: 'PLANNED', stack: 'JS/CANVAS', type: 'TOOL', desc: 'Randomized draft order picker with fun visualizations — horse race, rain glass fill. For settling fantasy draft order disputes.' },
        { num: '23', name: 'TBD',         pos: '---', url: null,          status: 'PLANNED', stack: '---',       type: '---',  desc: 'Coming soon.' },
        { num: '35', name: 'TBD',         pos: '---', url: null,          status: 'PLANNED', stack: '---',       type: '---',  desc: 'Coming soon.' },
        { num: '42', name: 'TBD',         pos: '---', url: null,          status: 'PLANNED', stack: '---',       type: '---',  desc: 'Coming soon.' },
        { num: '56', name: 'TBD',         pos: '---', url: null,          status: 'PLANNED', stack: '---',       type: '---',  desc: 'Coming soon.' },
        { num: '74', name: 'TBD',         pos: '---', url: null,          status: 'PLANNED', stack: '---',       type: '---',  desc: 'Coming soon.' },
    ]
};

const VISIBLE_ROWS = 9;

// ══════════════════════════════════════════════════════════
// ── CLOCK ────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════

(function initClock() {
    const $clock = document.getElementById('boardClock');
    if (!$clock) return;
    function update() {
        const now = new Date();
        const h = now.getHours();
        $clock.textContent = (h > 12 ? h - 12 : h || 12) + ':' + String(now.getMinutes()).padStart(2, '0');
    }
    update();
    setInterval(update, 30000);
})();

// ══════════════════════════════════════════════════════════
// ── HUB LINEUP — scrollable, keyboard-navigable ─────────
// ══════════════════════════════════════════════════════════

(function initHub() {
    const $centerInfoCard = document.getElementById('centerInfoCard');
    const $infoNum = document.getElementById('infoNum');
    const $infoName = document.getElementById('infoName');
    const $infoSub = document.getElementById('infoSub');
    const $infoStats = document.getElementById('infoStats');
    const $infoDesc = document.getElementById('infoDesc');
    const $infoLink = document.getElementById('infoLink');

    let selectedRow = null;
    let selectedItem = null;

    // ── Panel builder ──
    function buildPanel(items, containerId, arrowUpId, arrowDownId, panelId) {
        const $container = document.getElementById(containerId);
        const $arrowUp = document.getElementById(arrowUpId);
        const $arrowDown = document.getElementById(arrowDownId);
        const $panel = document.getElementById(panelId);
        const $viewport = $container.parentElement; // .panel-viewport

        let scrollIndex = 0;
        const rows = [];

        items.forEach((item, idx) => {
            const row = document.createElement('div');
            row.className = 'lineup-row' + (item.name === 'TBD' ? ' placeholder' : '');
            row.dataset.index = idx;
            row.innerHTML = `
                <span class="lineup-num">${item.num}</span>
                <span class="lineup-name">${item.name}</span>
                <span class="lineup-pos">${item.pos}</span>
            `;
            if (item.name !== 'TBD') {
                row.addEventListener('click', () => selectItem(item, row));
            }
            rows.push(row);
            $container.appendChild(row);
        });

        // Size rows to fill viewport evenly
        function sizeRows() {
            const vpHeight = $viewport.clientHeight;
            const rowH = Math.floor(vpHeight / VISIBLE_ROWS);
            rows.forEach(r => { r.style.height = rowH + 'px'; });
            applyScroll();
        }

        function applyScroll() {
            const vpHeight = $viewport.clientHeight;
            const rowH = Math.floor(vpHeight / VISIBLE_ROWS);
            const offset = scrollIndex * rowH;
            $container.style.transform = `translateY(-${offset}px)`;

            $arrowUp.classList.toggle('hidden', scrollIndex <= 0);
            $arrowDown.classList.toggle('hidden', scrollIndex + VISIBLE_ROWS >= items.length);
        }

        function scrollUp() {
            if (scrollIndex > 0) { scrollIndex--; applyScroll(); }
        }
        function scrollDown() {
            if (scrollIndex + VISIBLE_ROWS < items.length) { scrollIndex++; applyScroll(); }
        }

        $arrowUp.addEventListener('click', scrollUp);
        $arrowDown.addEventListener('click', scrollDown);

        // Keyboard nav when panel is focused
        $panel.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); scrollDown(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); scrollUp(); }
        });

        // Focus panel on click
        $panel.addEventListener('click', () => $panel.focus());

        // Initial size
        sizeRows();
        window.addEventListener('resize', sizeRows);

        return { rows, items };
    }

    const gamesPanel = buildPanel(HUB_ITEMS.games, 'gamesLineup', 'gamesArrowUp', 'gamesArrowDown', 'gamesPanel');
    const appsPanel = buildPanel(HUB_ITEMS.apps, 'appsLineup', 'appsArrowUp', 'appsArrowDown', 'appsPanel');

    // ── Selection handler ──
    function selectItem(item, row) {
        // Close game state panel silently if open — it will handle its own display restoration
        if (typeof GAME.hideGS === 'function') GAME.hideGS();

        // Toggle off
        if (selectedRow === row) {
            selectedRow.classList.remove('selected');
            selectedRow = null;
            selectedItem = null;
            $centerInfoCard.style.display = 'none';
            if (typeof GAME.showGS === 'function') GAME.showGS();
            return;
        }

        if (selectedRow) selectedRow.classList.remove('selected');
        row.classList.add('selected');
        selectedRow = row;
        selectedItem = item;

        $centerInfoCard.style.display = '';

        $infoNum.textContent = '#' + item.num;
        $infoName.textContent = item.name;
        $infoSub.textContent = item.type;

        $infoStats.innerHTML = `
            <div class="info-stat"><span class="info-stat-label">STATUS</span><span class="info-stat-value">${item.status}</span></div>
            <div class="info-stat"><span class="info-stat-label">STACK</span><span class="info-stat-value">${item.stack}</span></div>
            <div class="info-stat"><span class="info-stat-label">TYPE</span><span class="info-stat-value">${item.type}</span></div>
        `;

        $infoDesc.textContent = item.desc;

        if (item.url) {
            $infoLink.className = 'info-card-link';
            if (item.url === '#scoreboard') {
                $infoLink.textContent = 'VIEW BELOW ▾';
                $infoLink.href = '#';
                $infoLink.onclick = (e) => { e.preventDefault(); document.getElementById('liveScoreboard').scrollIntoView({ behavior: 'smooth' }); };
            } else if (item.url.startsWith('https://')) {
                $infoLink.textContent = 'READ ▸';
                $infoLink.href = item.url;
                $infoLink.target = '_blank';
                $infoLink.rel = 'noopener';
                $infoLink.onclick = null;
            } else {
                $infoLink.textContent = 'PLAY ▸';
                $infoLink.href = item.url;
                $infoLink.target = '';
                $infoLink.onclick = null;
            }
        } else if (item.status === 'BUILT') {
            $infoLink.href = '#';
            $infoLink.textContent = 'DEPLOY PENDING';
            $infoLink.className = 'info-card-link disabled';
            $infoLink.onclick = null;
        } else {
            $infoLink.href = '#';
            $infoLink.textContent = 'COMING SOON';
            $infoLink.className = 'info-card-link disabled';
            $infoLink.onclick = null;
        }

        // Re-trigger animation
        $centerInfoCard.style.animation = 'none';
        $centerInfoCard.offsetHeight;
        $centerInfoCard.style.animation = '';
    }

    GAME.clearSelection = function() {
        if (selectedRow) {
            selectedRow.classList.remove('selected');
            selectedRow = null;
            selectedItem = null;
        }
    };
})();

// ══════════════════════════════════════════════════════════
// ── DODGERS LIVE SCOREBOARD ──────────────────────────────
// ══════════════════════════════════════════════════════════

(function initScoreboard() {
    const DODGERS_ID = 119;
    const API_BASE = 'https://statsapi.mlb.com/api/v1';
    const LIVE_BASE = 'https://statsapi.mlb.com/api/v1.1';
    const POLL_LIVE = 20000;
    const POLL_IDLE = 300000;

    let gameState = 'LOADING';
    let currentGamePk = null;
    let pollTimer = null;
    let prevScores = {}; // track score changes for flash animation

    const $ = id => document.getElementById(id);
    const $status = $('gameStatus');
    const $gameInfo = $('gameInfo');
    const $scoreTable = $('scoreTable');
    const $awayName = $('awayName');
    const $homeName = $('homeName');
    const $ballCount = $('ballCount');
    const $strikeCount = $('strikeCount');
    const $outCount = $('outCount');
    const $pitcherInfo = $('pitcherInfo');
    const $batterInfo = $('batterInfo');
    const $inningHalf = $('inningHalf');
    const $inningNum = $('inningNum');

    async function apiFetch(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`API ${res.status}`);
        return res.json();
    }

    function todayStr() {
        return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
    }

    function formatTime(isoStr) {
        return new Date(isoStr).toLocaleTimeString('en-US', {
            timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit',
        }) + ' PT';
    }

    function formatDate(isoStr) {
        return new Date(isoStr).toLocaleDateString('en-US', {
            timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric',
        }).toUpperCase();
    }

    function abbreviateName(fullName) {
        const parts = fullName.split(' ');
        return parts.length < 2 ? fullName : parts[0][0] + '. ' + parts.slice(1).join(' ');
    }

    // ── Schedule ──
    async function fetchSchedule(dateStr) {
        const data = await apiFetch(`${API_BASE}/schedule?sportId=1&teamId=${DODGERS_ID}&date=${dateStr}&hydrate=probablePitcher`);
        if (!data.dates?.length) return null;
        const games = data.dates[0].games;
        if (!games?.length) return null;
        return games.find(g => g.status.abstractGameState === 'Live')
            || games.find(g => g.status.abstractGameState === 'Preview')
            || games[games.length - 1];
    }

    async function fetchLastGame() {
        const today = new Date();
        for (let d = 1; d <= 7; d++) {
            const date = new Date(today);
            date.setDate(date.getDate() - d);
            const data = await apiFetch(`${API_BASE}/schedule?sportId=1&teamId=${DODGERS_ID}&date=${date.toISOString().split('T')[0]}`);
            if (data.dates?.length) {
                const final = data.dates[0].games.find(g => g.status.abstractGameState === 'Final');
                if (final) return final;
            }
        }
        return null;
    }

    async function fetchLiveFeed(gamePk) {
        return apiFetch(`${LIVE_BASE}/game/${gamePk}/feed/live`);
    }

    function applyTeamColors(awayAbbr, homeAbbr) {
        const awayColor = TEAM_COLORS[awayAbbr] || '#7a96b8';
        const homeColor = TEAM_COLORS[homeAbbr] || '#4a8fe7';
        document.documentElement.style.setProperty('--away-color', awayColor);
        document.documentElement.style.setProperty('--home-color', homeColor);
    }

    // ── Render helpers ──
    function renderStatus(state, info) {
        $status.className = 'game-status';
        const labels = { LOADING: 'LOADING', PRE_GAME: 'PRE-GAME', LIVE: 'LIVE', FINAL: 'FINAL', OFF_DAY: 'OFF DAY', ERROR: 'SIGNAL LOST' };
        $status.textContent = labels[state] || state;
        $status.classList.add(state.toLowerCase().replace('_', '-'));
        $gameInfo.textContent = info || '';
    }

    function renderInning(inning, isTop) {
        $inningHalf.textContent = inning ? (isTop ? '▲' : '▼') : '';
        $inningNum.textContent = inning || '';
    }

    function flashCell(el) {
        el.classList.remove('score-flash');
        el.offsetHeight; // reflow
        el.classList.add('score-flash');
    }

    function renderLinescore(linescore, gameData) {
        $awayName.textContent = gameData.teams.away.abbreviation || gameData.teams.away.teamName;
        $homeName.textContent = gameData.teams.home.abbreviation || gameData.teams.home.teamName;
        applyTeamColors(
            gameData.teams.away.abbreviation || gameData.teams.away.teamName,
            gameData.teams.home.abbreviation || gameData.teams.home.teamName
        );

        const innings = linescore.innings || [];
        const currentInning = linescore.currentInning || 0;
        const isTop = (linescore.inningHalf || '').toLowerCase() === 'top';

        renderInning(currentInning, isTop);

        const thead = $scoreTable.querySelector('thead tr');
        const awayRow = $('awayRow');
        const homeRow = $('homeRow');

        // Reset to 9
        while (thead.children.length > 9) thead.removeChild(thead.lastChild);
        while (awayRow.children.length > 9) awayRow.removeChild(awayRow.lastChild);
        while (homeRow.children.length > 9) homeRow.removeChild(homeRow.lastChild);

        if (innings.length > 9) {
            for (let i = 10; i <= innings.length; i++) {
                const th = document.createElement('th'); th.textContent = i; th.className = 'extra-inning'; thead.appendChild(th);
                const at = document.createElement('td'); at.className = 'extra-inning'; at.id = `inn-away-${i}`; awayRow.appendChild(at);
                const ht = document.createElement('td'); ht.className = 'extra-inning'; ht.id = `inn-home-${i}`; homeRow.appendChild(ht);
            }
        }

        const max = Math.max(9, innings.length);
        for (let i = 1; i <= max; i++) {
            const ac = $(`inn-away-${i}`), hc = $(`inn-home-${i}`);
            if (!ac || !hc) continue;
            const inn = innings[i - 1];
            const aVal = inn ? (inn.away?.runs ?? '') : '';
            const hVal = inn ? (inn.home?.runs ?? '') : '';

            // Flash on score change
            const key = `${i}`;
            if (prevScores[`a${key}`] !== undefined && prevScores[`a${key}`] !== aVal && aVal !== '') flashCell(ac);
            if (prevScores[`h${key}`] !== undefined && prevScores[`h${key}`] !== hVal && hVal !== '') flashCell(hc);
            prevScores[`a${key}`] = aVal;
            prevScores[`h${key}`] = hVal;

            ac.textContent = aVal;
            hc.textContent = hVal;
            ac.classList.toggle('active-inning', i === currentInning && isTop);
            hc.classList.toggle('active-inning', i === currentInning && !isTop);
            thead.querySelectorAll('th').forEach(th => {
                if (th.textContent == i) th.classList.toggle('active-inning', i === currentInning);
            });
        }

        const at = linescore.teams?.away || {}, ht = linescore.teams?.home || {};
        $('away-r').textContent = at.runs ?? 0;
        $('away-h').textContent = at.hits ?? 0;
        $('away-e').textContent = at.errors ?? 0;
        $('home-r').textContent = ht.runs ?? 0;
        $('home-h').textContent = ht.hits ?? 0;
        $('home-e').textContent = ht.errors ?? 0;
    }

    function renderCount(balls, strikes, outs) {
        $ballCount.textContent = balls;
        $ballCount.className = 'count-big' + (balls > 0 ? ' balls' : '');
        $strikeCount.textContent = strikes;
        $strikeCount.className = 'count-big' + (strikes > 0 ? ' strikes' : '');
        $outCount.textContent = outs;
        $outCount.className = 'count-big' + (outs > 0 ? ' outs' : '');
    }

    function renderPitcher(liveData) {
        const cp = liveData.plays?.currentPlay;
        if (!cp?.matchup?.pitcher?.id) { $pitcherInfo.textContent = '---'; return; }
        const isTop = (liveData.linescore?.inningHalf || '').toLowerCase() === 'top';
        const side = isTop ? 'home' : 'away';
        const p = liveData.boxscore?.teams?.[side]?.players?.[`ID${cp.matchup.pitcher.id}`];
        if (!p) { $pitcherInfo.textContent = abbreviateName(cp.matchup.pitcher.fullName); return; }
        const s = p.stats?.pitching || {};
        const pitches = s.numberOfPitches || s.pitchesThrown || 0;
        $pitcherInfo.textContent = `${abbreviateName(p.person?.fullName || '')} · IP ${s.inningsPitched || 0} · ER ${s.earnedRuns || 0} · K ${s.strikeOuts || 0} · BB ${s.baseOnBalls || 0} · ${pitches}P`;
    }

    function renderBatter(liveData) {
        const cp = liveData.plays?.currentPlay;
        if (!cp?.matchup?.batter?.fullName) { $batterInfo.textContent = '---'; return; }
        const batter = cp.matchup.batter;
        const isTop = (liveData.linescore?.inningHalf || '').toLowerCase() === 'top';
        const side = isTop ? 'away' : 'home';
        const p = liveData.boxscore?.teams?.[side]?.players?.[`ID${batter.id}`];
        const avg = p?.seasonStats?.batting?.avg || p?.stats?.batting?.avg || '';
        $batterInfo.textContent = `${abbreviateName(batter.fullName)}${avg ? ' · ' + avg : ''}`;
    }

    // ── State renderers ──
    function renderPreGame(game) {
        renderStatus('PRE_GAME', formatTime(game.gameDate));
        const awayAbbr = game.teams?.away?.abbreviation || game.teams?.away?.team?.abbreviation || 'AWAY';
        const homeAbbr = game.teams?.home?.abbreviation || game.teams?.home?.team?.abbreviation || 'HOME';
        $awayName.textContent = awayAbbr;
        $homeName.textContent = homeAbbr;
        applyTeamColors(awayAbbr, homeAbbr);
        renderCount(0, 0, 0);
        renderInning(0, true);

        const aP = game.teams?.away?.probablePitcher;
        const hP = game.teams?.home?.probablePitcher;
        $pitcherInfo.textContent = (aP || hP) ? `${aP ? abbreviateName(aP.fullName) : 'TBD'} vs ${hP ? abbreviateName(hP.fullName) : 'TBD'}` : 'PITCHERS TBD';
        $batterInfo.textContent = 'FIRST PITCH ' + formatTime(game.gameDate);
    }

    async function renderOffDay() {
        try {
            const last = await fetchLastGame();
            if (last) {
                currentGamePk = last.gamePk;
                const feed = await fetchLiveFeed(currentGamePk);
                gameState = 'FINAL';
                renderFinal(feed);
                GAME.feed = feed; GAME.state = 'FINAL';
                $gameInfo.textContent = formatDate(last.gameDate);
                return;
            }
        } catch {}
        renderStatus('OFF_DAY', 'NO RECENT GAMES');
        renderCount(0, 0, 0);
        renderInning(0, true);
        $pitcherInfo.textContent = 'SEASON NOT ACTIVE';
        $batterInfo.textContent = '---';
    }

    function renderLive(feed) {
        const ld = feed.liveData, gd = feed.gameData, ls = ld.linescore;
        const inn = ls.currentInning || 0;
        const isTop = (ls.inningHalf || '').toLowerCase() === 'top';
        renderStatus('LIVE', `${isTop ? 'TOP' : 'BOT'} ${inn}`);
        renderLinescore(ls, gd);
        const cp = ld.plays?.currentPlay;
        const ct = cp?.count || {};
        renderCount(ct.balls || 0, ct.strikes || 0, ct.outs ?? ls.outs ?? 0);
        renderPitcher(ld);
        renderBatter(ld);
    }

    function renderFinal(feed) {
        const ld = feed.liveData, gd = feed.gameData;
        renderStatus('FINAL', '');
        renderLinescore(ld.linescore, gd);
        renderCount(0, 0, 0);
        renderInning(0, true);
        $inningHalf.textContent = '';
        $inningNum.textContent = 'F';
        const d = ld.decisions;
        if (d) {
            const w = d.winner ? abbreviateName(d.winner.fullName) : '';
            const l = d.loser ? abbreviateName(d.loser.fullName) : '';
            $pitcherInfo.textContent = `W: ${w}  L: ${l}`;
        }
        $batterInfo.textContent = 'FINAL';
    }

    function renderError() { renderStatus('ERROR', 'RETRYING...'); }

    // ── Tick ──
    async function tick() {
        try {
            if (currentGamePk && (gameState === 'LIVE' || gameState === 'PRE_GAME')) {
                const feed = await fetchLiveFeed(currentGamePk);
                const s = feed.gameData?.status?.abstractGameState;
                if (s === 'Live') { gameState = 'LIVE'; renderLive(feed); GAME.feed = feed; GAME.state = 'LIVE'; }
                else if (s === 'Final') { gameState = 'FINAL'; renderFinal(feed); GAME.feed = feed; GAME.state = 'FINAL'; }
                else { gameState = 'PRE_GAME'; renderPreGame(feed.gameData); GAME.feed = feed; GAME.state = 'PRE_GAME'; }
            } else {
                await init();
            }
            if (GAME.onUpdate) GAME.onUpdate();
        } catch (e) { console.error('Scoreboard:', e); gameState = 'ERROR'; renderError(); }
        scheduleNext();
    }

    function scheduleNext() {
        clearTimeout(pollTimer);
        if (gameState === 'FINAL') return;
        pollTimer = setTimeout(tick, gameState === 'LIVE' ? POLL_LIVE : POLL_IDLE);
    }

    async function init() {
        renderStatus('LOADING', '');
        try {
            const game = await fetchSchedule(todayStr());
            if (!game) { gameState = 'OFF_DAY'; await renderOffDay(); return; }
            currentGamePk = game.gamePk;
            const s = game.status?.abstractGameState;
            if (s === 'Live') { const f = await fetchLiveFeed(currentGamePk); gameState = 'LIVE'; renderLive(f); GAME.feed = f; GAME.state = 'LIVE'; }
            else if (s === 'Final') { const f = await fetchLiveFeed(currentGamePk); gameState = 'FINAL'; renderFinal(f); GAME.feed = f; GAME.state = 'FINAL'; }
            else { const f = await fetchLiveFeed(currentGamePk); gameState = 'PRE_GAME'; renderPreGame(game); GAME.feed = f; GAME.state = 'PRE_GAME'; }
            if (GAME.onUpdate) GAME.onUpdate();
        } catch (e) { console.error('Init:', e); gameState = 'ERROR'; renderError(); }
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && gameState === 'LIVE') { clearTimeout(pollTimer); tick(); }
    });

    init().then(scheduleNext);
})();

// ══════════════════════════════════════════════════════════
// ── GAME STATE PANEL ─────────────────────────────────────
// ══════════════════════════════════════════════════════════

(function initGameState() {
    const $scoreboard = document.getElementById('liveScoreboard');
    const $centerInfoCard = document.getElementById('centerInfoCard');
    const $gs = document.getElementById('centerGameState');
    const $gsBody = document.getElementById('gsBody');
    let isOpen = true;
    let prevPanel = 'gamestate'; // 'gamestate' | 'infocard'

    function abbr(name) {
        if (!name) return '---';
        const p = name.split(' ');
        return p.length < 2 ? name : p[0][0] + '. ' + p.slice(1).join(' ');
    }

    function pitchCls(callCode) {
        if (!callCode) return 'pitch-unknown';
        const c = callCode.replace('*', '');
        if (c === 'B') return 'pitch-ball';
        if ('CSTMWQV'.includes(c)) return 'pitch-strike';
        if ('FLR'.includes(c)) return 'pitch-foul';
        if ('XDE'.includes(c)) return 'pitch-inplay';
        if (c === 'H') return 'pitch-hbp';
        return 'pitch-unknown';
    }

    function show() {
        isOpen = true;
        prevPanel = $centerInfoCard.style.display !== 'none' ? 'infocard' : 'gamestate';
        $centerInfoCard.style.display = 'none';
        $gs.style.display = '';
        if (typeof GAME.clearSelection === 'function') GAME.clearSelection();
        render();
    }

    function hide() {
        if (prevPanel === 'infocard') {
            isOpen = false;
            $gs.style.display = 'none';
            $centerInfoCard.style.display = '';
        }
        // if prevPanel was gamestate, GS is the default — don't hide
    }

    // Silently close GS and hand off to infocard — used when selectItem fires while GS is open
    GAME.hideGS = function() {
        if (!isOpen) return;
        isOpen = false;
        $gs.style.display = 'none';
    };

    // Restore GS as default view — used when selectItem deselects
    GAME.showGS = function() {
        isOpen = true;
        $centerInfoCard.style.display = 'none';
        $gs.style.display = '';
        render();
    };

    $scoreboard.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        isOpen ? hide() : show();
    });
    $scoreboard.style.cursor = 'pointer';

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) hide();
    });

    GAME.onUpdate = () => { if (isOpen) render(); };

    // Initial render once feed arrives
    if (GAME.feed) render();

    function render() {
        const feed = GAME.feed;
        if (!feed) { $gsBody.innerHTML = '<div class="gs-empty">NO GAME DATA</div>'; return; }

        const ld = feed.liveData;
        const gd = feed.gameData;
        const ls = ld.linescore;
        const plays = ld.plays;
        const cp = plays?.currentPlay;
        const isLive = GAME.state === 'LIVE';
        const isFinal = GAME.state === 'FINAL';
        const isTop = (ls?.inningHalf || '').toLowerCase() === 'top';
        const awayAbbr = gd.teams.away.abbreviation || gd.teams.away.teamName;
        const homeAbbr = gd.teams.home.abbreviation || gd.teams.home.teamName;

        let h = '';

        // ── Header ──
        const badge = isLive ? 'live' : isFinal ? 'final' : 'pre-game';
        const label = isLive ? 'LIVE' : isFinal ? 'FINAL' : 'PRE-GAME';
        h += `<div class="gs-header">
            <span class="gs-badge ${badge}">${label}</span>
            <span class="gs-teams"><span class="gs-team-away">${awayAbbr}</span> @ <span class="gs-team-home">${homeAbbr}</span></span>
            <button class="gs-close" id="gsCloseBtn">✕</button>
        </div>`;

        // ── PRE-GAME PREVIEW ──
        if (GAME.state === 'PRE_GAME') {
            const gameTime = gd.datetime?.dateTime;
            const venue = gd.venue?.name || '';
            const weather = gd.weather;
            const timeStr = gameTime ? new Date(gameTime).toLocaleTimeString('en-US', {
                timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit'
            }) + ' PT' : 'TBD';

            // First pitch + venue
            h += `<div class="gs-section gs-pre-hero">
                <div class="gs-pre-first-pitch">FIRST PITCH</div>
                <div class="gs-pre-time">${timeStr}</div>
                ${venue ? `<div class="gs-pre-venue">${venue}</div>` : ''}
                ${weather ? `<div class="gs-pre-weather">${weather.temp ? weather.temp + '\u00B0' : ''} ${weather.condition || ''} ${weather.wind ? '\u00B7 ' + weather.wind : ''}</div>` : ''}
            </div>`;

            // Records
            const awayRec = gd.teams.away.record;
            const homeRec = gd.teams.home.record;
            if (awayRec || homeRec) {
                h += `<div class="gs-section gs-pre-matchup">
                    <div class="gs-pre-team-col">
                        <span class="gs-pre-team-name">${awayAbbr}</span>
                        ${awayRec ? `<span class="gs-pre-record">${awayRec.wins}-${awayRec.losses}</span>` : ''}
                    </div>
                    <div class="gs-pre-at">@</div>
                    <div class="gs-pre-team-col">
                        <span class="gs-pre-team-name">${homeAbbr}</span>
                        ${homeRec ? `<span class="gs-pre-record">${homeRec.wins}-${homeRec.losses}</span>` : ''}
                    </div>
                </div>`;
            }

            // Probable pitchers — side by side
            const pp = gd.probablePitchers;
            if (pp) {
                h += `<div class="gs-section">
                    <div class="gs-label">PROBABLE PITCHERS</div>
                    <div class="gs-pre-pitchers">`;
                ['away', 'home'].forEach(side => {
                    const pitcher = pp[side];
                    if (!pitcher) { h += `<div class="gs-pre-pitcher-card"><div class="gs-pre-p-name">TBD</div></div>`; return; }
                    const pl = ld.boxscore?.teams?.[side]?.players?.[`ID${pitcher.id}`];
                    const ss = pl?.seasonStats?.pitching || {};
                    h += `<div class="gs-pre-pitcher-card">
                        <div class="gs-pre-p-name">${pitcher.fullName}</div>
                        <div class="gs-pre-p-stats">
                            ${ss.wins !== undefined ? `<span>${ss.wins}-${ss.losses}</span>` : ''}
                            ${ss.era ? `<span>${ss.era} ERA</span>` : ''}
                            ${ss.strikeOuts ? `<span>${ss.strikeOuts}K</span>` : ''}
                            ${ss.inningsPitched ? `<span>${ss.inningsPitched} IP</span>` : ''}
                            ${ss.whip ? `<span>${ss.whip} WHIP</span>` : ''}
                        </div>
                    </div>`;
                });
                h += `</div></div>`;
            }

            // Lineups — side by side with pos + season avg
            const awayOrder = ld.boxscore?.teams?.away?.battingOrder || [];
            const homeOrder = ld.boxscore?.teams?.home?.battingOrder || [];
            if (awayOrder.length || homeOrder.length) {
                h += `<div class="gs-section">
                    <div class="gs-label">LINEUPS</div>
                    <div class="gs-pre-lineups">`;
                ['away', 'home'].forEach(side => {
                    const team = ld.boxscore?.teams?.[side];
                    const ta = gd.teams[side]?.abbreviation || side.toUpperCase();
                    const order = team?.battingOrder || [];
                    h += `<div class="gs-pre-lineup-col">
                        <div class="gs-pre-lineup-hdr">${ta}</div>`;
                    if (order.length) {
                        order.forEach((id, i) => {
                            const pl = team.players[`ID${id}`];
                            if (!pl) return;
                            const pos = pl.position?.abbreviation || '';
                            const ss = pl.seasonStats?.batting || {};
                            h += `<div class="gs-pre-lineup-row">
                                <span class="gs-pre-l-num">${i + 1}</span>
                                <span class="gs-pre-l-pos">${pos}</span>
                                <span class="gs-pre-l-name">${abbr(pl.person?.fullName)}</span>
                                <span class="gs-pre-l-avg">${ss.avg || ''}</span>
                            </div>`;
                        });
                    } else {
                        h += `<div class="gs-pre-lineup-tbd">TBD</div>`;
                    }
                    h += `</div>`;
                });
                h += `</div></div>`;
            }
        }

        if (isLive && cp) {
            // ── Pitcher ──
            if (cp.matchup?.pitcher) {
                const pid = cp.matchup.pitcher.id;
                const side = isTop ? 'home' : 'away';
                const p = ld.boxscore?.teams?.[side]?.players?.[`ID${pid}`];
                const s = p?.stats?.pitching || {};
                const pc = s.numberOfPitches || s.pitchesThrown || 0;
                h += `<div class="gs-section">
                    <div class="gs-label">PITCHING</div>
                    <div class="gs-player-line">
                        <span class="gs-name">${cp.matchup.pitcher.fullName}</span>
                        <span class="gs-hand">${cp.matchup.pitchHand?.code || ''}</span>
                    </div>
                    <div class="gs-stat-line">
                        <span>${s.inningsPitched || 0} IP</span><span>${pc}P</span><span>${s.strikeOuts || 0}K</span>
                        <span>${s.baseOnBalls || 0}BB</span><span>${s.earnedRuns || 0}ER</span><span>${s.hits || 0}H</span>
                    </div>
                </div>`;
            }

            // ── Batter + Pitch Track ──
            if (cp.matchup?.batter) {
                const bid = cp.matchup.batter.id;
                const side = isTop ? 'away' : 'home';
                const b = ld.boxscore?.teams?.[side]?.players?.[`ID${bid}`];
                const bs = b?.stats?.batting || {};
                const avg = b?.seasonStats?.batting?.avg || '';
                h += `<div class="gs-section">
                    <div class="gs-label">AT BAT</div>
                    <div class="gs-player-line">
                        <span class="gs-name">${cp.matchup.batter.fullName}</span>
                        <span class="gs-hand">${cp.matchup.batSide?.code || ''}</span>
                    </div>
                    <div class="gs-stat-line">
                        <span>${bs.hits || 0}-${bs.atBats || 0}</span>
                        ${avg ? `<span>AVG ${avg}</span>` : ''}
                        ${bs.homeRuns ? `<span>${bs.homeRuns}HR</span>` : ''}
                        ${bs.rbi ? `<span>${bs.rbi}RBI</span>` : ''}
                    </div>`;

                const pitches = (cp.playEvents || []).filter(e => e.isPitch);
                if (pitches.length) {
                    h += `<div class="gs-pitches">`;
                    pitches.forEach((p, i) => {
                        const type = p.details?.type?.code || '??';
                        const spd = p.pitchData?.startSpeed ? Math.round(p.pitchData.startSpeed) : '';
                        const cls = pitchCls(p.details?.call?.code);
                        h += `<div class="gs-pitch ${cls}">
                            <div class="gs-pitch-dot"></div>
                            <span class="gs-pitch-type">${type}</span>
                            ${spd ? `<span class="gs-pitch-spd">${spd}</span>` : ''}
                        </div>`;
                    });
                    h += `</div>`;
                }
                h += `</div>`;
            }

            // ── Diamond + Runners + Due Up ──
            const off = ls.offense || {};
            const ct = cp?.count || {};
            const outs = ct.outs ?? ls.outs ?? 0;
            h += `<div class="gs-section gs-diamond-wrap">
                <div class="gs-diamond-area">
                    <div class="gs-diamond">
                        <div class="gs-base b2 ${off.second ? 'on' : ''}"></div>
                        <div class="gs-base b3 ${off.third ? 'on' : ''}"></div>
                        <div class="gs-base b1 ${off.first ? 'on' : ''}"></div>
                    </div>
                    <div class="gs-outs">${'\u25CF'.repeat(outs)}${'\u25CB'.repeat(3 - outs)}</div>
                </div>
                <div class="gs-situation">`;
            if (off.first) h += `<div class="gs-runner">1B ${abbr(off.first.fullName)}</div>`;
            if (off.second) h += `<div class="gs-runner">2B ${abbr(off.second.fullName)}</div>`;
            if (off.third) h += `<div class="gs-runner">3B ${abbr(off.third.fullName)}</div>`;
            if (!off.first && !off.second && !off.third) h += `<div class="gs-runner dim">Bases empty</div>`;
            if (off.onDeck) h += `<div class="gs-due">On deck: ${abbr(off.onDeck.fullName)}</div>`;
            if (off.inHole) h += `<div class="gs-due">In hole: ${abbr(off.inHole.fullName)}</div>`;
            h += `</div></div>`;

            // ── Defense ──
            const def = ls.defense || {};
            const positions = [
                ['C', def.catcher], ['1B', def.first], ['2B', def.second],
                ['SS', def.shortstop], ['3B', def.third],
                ['LF', def.left], ['CF', def.center], ['RF', def.right]
            ].filter(([, p]) => p);
            if (positions.length) {
                h += `<div class="gs-section">
                    <div class="gs-label">DEFENSE</div>
                    <div class="gs-defense">`;
                positions.forEach(([pos, p]) => {
                    h += `<div class="gs-def"><span class="gs-def-pos">${pos}</span>${abbr(p.fullName)}</div>`;
                });
                h += `</div></div>`;
            }
        }

        // ── This Inning ──
        if (plays?.allPlays && (isLive || isFinal)) {
            const inn = ls?.currentInning || (isFinal ? (ls?.innings?.length || 9) : 0);
            const half = isLive ? (isTop ? 'top' : 'bottom') : 'bottom';
            const inningPlays = plays.allPlays.filter(p =>
                p.about?.inning === inn && p.about?.halfInning === half && p.result?.event
            );
            if (inningPlays.length) {
                const lbl = isLive ? 'THIS INNING' : `${half === 'top' ? '\u25B2' : '\u25BC'}${inn}`;
                h += `<div class="gs-section">
                    <div class="gs-label">${lbl}</div>
                    <div class="gs-plays">`;
                inningPlays.forEach(p => {
                    h += `<div class="gs-play-row">
                        <span class="gs-play-name">${abbr(p.matchup?.batter?.fullName)}</span>
                        <span class="gs-play-event">${p.result.event}</span>
                    </div>`;
                });
                h += `</div></div>`;
            }
        }

        // ── Scoring Plays ──
        if (plays?.scoringPlays?.length) {
            h += `<div class="gs-section">
                <div class="gs-label">SCORING PLAYS</div>
                <div class="gs-scoring">`;
            plays.scoringPlays.forEach(idx => {
                const p = plays.allPlays[idx];
                if (!p) return;
                const arrow = p.about?.halfInning === 'top' ? '\u25B2' : '\u25BC';
                const rawDesc = p.result?.description || p.result?.event || '';
                const desc = rawDesc.split(/(?<=\.)\s+/).map(s =>
                    /scores|homers|home run/i.test(s) ? `<strong>${s}</strong>` : s
                ).join(' ');
                h += `<div class="gs-score-play">
                    <span class="gs-sp-inn">${arrow}${p.about?.inning}</span>
                    <span class="gs-sp-text">${desc}</span>
                    <span class="gs-sp-score">${p.result?.awayScore ?? ''}-${p.result?.homeScore ?? ''}</span>
                </div>`;
            });
            h += `</div></div>`;
        }

        // ── Decisions (final) ──
        if (isFinal) {
            const d = ld.decisions;
            if (d) {
                h += `<div class="gs-section">
                    <div class="gs-label">DECISIONS</div>
                    <div class="gs-decisions">`;
                if (d.winner) h += `<span>W: ${abbr(d.winner.fullName)}</span>`;
                if (d.loser) h += `<span>L: ${abbr(d.loser.fullName)}</span>`;
                if (d.save) h += `<span>SV: ${abbr(d.save.fullName)}</span>`;
                h += `</div></div>`;
            }
        }

        // ── Box Score (toggle) — live/final only ──
        if (isLive || isFinal) {
        h += `<div class="gs-section gs-box-section">
            <div class="gs-label gs-toggle-btn" id="gsBoxToggle">BOX SCORE \u25BE</div>
            <div class="gs-box" id="gsBox" style="display:none;">`;

        ['away', 'home'].forEach(side => {
            const team = ld.boxscore?.teams?.[side];
            if (!team) return;
            const ta = gd.teams[side]?.abbreviation || side.toUpperCase();
            const allBatters = team.batters || [];
            const starters = new Set(team.battingOrder || []);
            const pitcherIds = team.pitchers || [];

            h += `<div class="gs-box-team">
                <div class="gs-box-team-hdr">${ta}</div>
                <div class="gs-box-split">`;

            // Left col — batting (all who appeared)
            h += `<div class="gs-box-col">
                <div class="gs-box-bat-hdr">
                    <span class="gs-box-name-col"></span>
                    <span>AB</span><span>R</span><span>H</span><span>RBI</span>
                </div>`;
            allBatters.forEach(id => {
                const pl = team.players[`ID${id}`];
                if (!pl) return;
                const s = pl.stats?.batting || {};
                if (!s.atBats && !s.runs && !s.hits && !s.baseOnBalls && !s.hitByPitch && !s.sacFlies && !s.sacBunts) return;
                const isSub = !starters.has(id);
                const pos = pl.position?.abbreviation || (pl.allPositions?.[0]?.abbreviation) || '';
                h += `<div class="gs-box-bat-row${isSub ? ' gs-box-sub' : ''}">
                    <span class="gs-box-name-col"><span class="gs-box-pos">${pos}</span>${abbr(pl.person?.fullName)}</span>
                    <span>${s.atBats ?? '-'}</span><span>${s.runs ?? '-'}</span><span>${s.hits ?? '-'}</span>
                    <span>${s.rbi ?? '-'}</span>
                </div>`;
            });
            const ts = team.teamStats?.batting || {};
            h += `<div class="gs-box-bat-row gs-box-totals">
                <span class="gs-box-name-col">TOTAL</span>
                <span>${ts.atBats ?? '-'}</span><span>${ts.runs ?? '-'}</span><span>${ts.hits ?? '-'}</span>
                <span>${ts.rbi ?? '-'}</span>
            </div></div>`;

            // Right col — pitching
            h += `<div class="gs-box-col">
                <div class="gs-box-pit-hdr">
                    <span class="gs-box-name-col"></span>
                    <span>IP</span><span>H</span><span>ER</span><span>K</span><span>BB</span>
                </div>`;
            pitcherIds.forEach(id => {
                const pl = team.players[`ID${id}`];
                if (!pl) return;
                const s = pl.stats?.pitching || {};
                if (!s.inningsPitched && s.inningsPitched !== '0.0' && s.inningsPitched !== '0') return;
                h += `<div class="gs-box-pit-row">
                    <span class="gs-box-name-col">${abbr(pl.person?.fullName)}</span>
                    <span>${s.inningsPitched ?? '-'}</span><span>${s.hits ?? '-'}</span><span>${s.earnedRuns ?? '-'}</span>
                    <span>${s.strikeOuts ?? '-'}</span><span>${s.baseOnBalls ?? '-'}</span>
                </div>`;
            });
            h += `</div>`;

            h += `</div></div>`; // close gs-box-split + gs-box-team
        });

        h += `</div></div>`;
        } // end box score if

        $gsBody.innerHTML = h;

        // Wire close + toggle
        document.getElementById('gsCloseBtn')?.addEventListener('click', (e) => { e.stopPropagation(); hide(); });
        document.getElementById('gsBoxToggle')?.addEventListener('click', () => {
            const box = document.getElementById('gsBox');
            if (!box) return;
            const open = box.style.display !== 'none';
            box.style.display = open ? 'none' : '';
            document.getElementById('gsBoxToggle').textContent = open ? 'BOX SCORE \u25BE' : 'BOX SCORE \u25B4';
        });
    }
})();
