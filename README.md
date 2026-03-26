# coherency.lol

Personal site and project hub. Aurora animated homepage with a baseball games hub.

## Structure

```
/                     → Aurora homepage (canvas northern lights, OKLCH colors)
/baseball/            → Baseball Hub (Dodger Stadium video board UI)
/baseball/statpad/    → StatPad game (rewrite → GitHub Pages)
/baseball/deadeye/    → Deadeye game (rewrite → GitHub Pages)
```

## Stack

- HTML, CSS, vanilla JS — no build step
- Fonts: Instrument Sans (homepage), Press Start 2P + DM Sans (baseball hub)
- Vercel for hosting and rewrites
- Games hosted via [baseball-games](https://github.com/coherency1/baseball-games) monorepo on GitHub Pages

## Development

```bash
# Local dev server
python -m http.server 8000
# or
npx serve
```

## Deploy

Push to `main` → Vercel auto-deploys from `coherency1/website`.

Game routing is handled by `vercel.json` rewrites — each game path proxies to the baseball-games GitHub Pages deploy.

## Repos

| Repo | Purpose |
|------|---------|
| [website](https://github.com/coherency1/website) | This repo — homepage + baseball hub |
| [baseball-games](https://github.com/coherency1/baseball-games) | All baseball games (monorepo) |
