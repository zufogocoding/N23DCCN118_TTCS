#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ML_DIR="$SCRIPT_DIR/ml-service"

echo "╔══════════════════════════════════════════════╗"
echo "║     SOUNDWAVE — FULL REPORT GENERATOR       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 1. Seed (mock 500 + test 120) ──────────────────
echo "▸ [1/4] Seeding controlled dataset..."
cd "$ML_DIR" && python3 -m scripts.seed_interactions
cd "$SCRIPT_DIR"
echo ""

# ── 2. Train ALS model (1 lần duy nhất) ────────────
echo "▸ [2/4] Training ALS model (factors=16)..."
curl -s -X POST "http://localhost:8000/train?factors=16" > /dev/null
for i in $(seq 1 30); do
  status=$(curl -s http://localhost:8000/train/status | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
  if [ "$status" = "success" ]; then
    echo "  ✓ Training completed"
    break
  fi
  if [ "$status" = "failed" ]; then
    echo "  ✗ Training failed!" >&2
    exit 1
  fi
  sleep 2
done
echo ""

# ── 3. Ground truth validation ─────────────────────
echo "▸ [3/4] Validating ground truth clustering..."
cd "$ML_DIR" && python3 -m app.utils.ground_truth_validator
cd "$SCRIPT_DIR"
echo ""

# ── 4. Run full test suite (cùng model) ────────────
echo "▸ [4/4] Running full AI test suite..."
cd "$SCRIPT_DIR" && node tests/ai-test-runner.js 2>&1

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║     REPORT GENERATED                         ║"
echo "║     File: tests/ai-test-report.html          ║"
echo "╚══════════════════════════════════════════════╝"
