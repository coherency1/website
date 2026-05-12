#!/bin/bash
# deploy-diamond.sh — Copy latest Diamond Engine sim data to website for Vercel deployment.
#
# Usage: ./scripts/deploy-diamond.sh
#
# Copies the most recent sim_*.json from ~/.config/diamond-engine/data/sims/
# to data/diamond/latest.json in this repo. Commit and push to trigger deploy.

set -e

SIM_DIR="$HOME/.config/diamond-engine/data/sims"
DEST_DIR="$(cd "$(dirname "$0")/.." && pwd)/data/diamond"

if [ ! -d "$SIM_DIR" ]; then
  echo "ERROR: Sim directory not found: $SIM_DIR"
  exit 1
fi

LATEST=$(ls -t "$SIM_DIR"/sim_*.json 2>/dev/null | head -1)
if [ -z "$LATEST" ]; then
  echo "ERROR: No sim files found in $SIM_DIR"
  exit 1
fi

mkdir -p "$DEST_DIR"
cp "$LATEST" "$DEST_DIR/latest.json"

SIM_DATE=$(basename "$LATEST" | sed 's/sim_//;s/\.json//')
SIZE=$(du -h "$DEST_DIR/latest.json" | cut -f1)

echo "Deployed: $LATEST → data/diamond/latest.json ($SIZE)"
echo "Sim date: $SIM_DATE"
echo ""
echo "Next: git add data/diamond/latest.json && git commit && git push"
