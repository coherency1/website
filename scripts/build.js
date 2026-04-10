#!/usr/bin/env node
// scripts/build.js
// Builds Deadeye and/or StatPad and copies output into pages/baseball/.
// Run: node scripts/build.js           → builds both
//      node scripts/build.js deadeye  → deadeye only
//      node scripts/build.js statpad  → statpad only
//
// Requires VITE_TURSO_URL and VITE_TURSO_TOKEN in env (set in Vercel dashboard).

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const ROOT    = path.resolve(__dirname, '..');
const target  = process.argv[2] ?? 'all';

function run(cmd, cwd) {
  console.log(`\n> ${cmd}  (in ${path.relative(ROOT, cwd)})`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function copyDir(src, dest) {
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

function buildDeadeye() {
  console.log('\n── Building Deadeye ──────────────────────────────────────────');
  const dir = path.resolve(ROOT, '../../deadeye');
  run('npm ci --prefer-offline', dir);
  run('npm run build', dir);

  const src  = path.join(dir, 'dist');
  const dest = path.join(ROOT, 'pages/baseball/deadeye');
  copyDir(src, dest);

  // Remove stale data/ folder (players.json no longer needed — data comes from Turso)
  const dataDir = path.join(dest, 'data');
  if (fs.existsSync(dataDir)) fs.rmSync(dataDir, { recursive: true });

  console.log(`  ✅ Deadeye → pages/baseball/deadeye/`);
}

function buildStatPad() {
  console.log('\n── Building StatPad ──────────────────────────────────────────');
  const dir = path.resolve(ROOT, '../../statpad/statpad-game/games/statpad');
  run('npm ci --prefer-offline', dir);
  run('npm run build', dir);

  const src  = path.join(dir, '../../dist/statpad');
  const dest = path.join(ROOT, 'pages/baseball/statpad');
  copyDir(src, dest);

  // Remove CSV artifacts no longer needed with Turso
  const lahmanDir = path.join(dest, 'lahman-folder');
  if (fs.existsSync(lahmanDir)) fs.rmSync(lahmanDir, { recursive: true });

  console.log(`  ✅ StatPad → pages/baseball/statpad/`);
}

if (target === 'all' || target === 'deadeye') buildDeadeye();
if (target === 'all' || target === 'statpad')  buildStatPad();

console.log('\n✅ Build complete.');
