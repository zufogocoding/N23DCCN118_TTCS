#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ML_DIR="$SCRIPT_DIR/ml-service"

echo "╔══════════════════════════════════════════════╗"
echo "║     SOUNDWAVE — FULL REPORT GENERATOR       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 1. Seed ────────────────────────────────────────────
echo "▸ [1/5] Seeding controlled dataset (500 songs, 50 users)..."
cd "$ML_DIR" && python3 -m scripts.seed_interactions
cd "$SCRIPT_DIR"
echo ""

# ── 2. Train ML model ─────────────────────────────────
echo "▸ [2/5] Training ALS model (factors=16)..."
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

# ── 3. Ground truth validation ────────────────────────
echo "▸ [3/5] Validating ground truth clustering..."
cd "$ML_DIR" && python3 -m app.utils.ground_truth_validator
cd "$SCRIPT_DIR"
echo ""

# ── 4. Create TEST dataset ─────────────────────────────
echo "▸ [4/5] Creating TEST dataset..."
cd "$SCRIPT_DIR" && node tests/ai-test-dataset.js 2>&1 | grep -E "(✅|✅|Hoàn tất|Tổng cộng)" || true
echo "  Re-training with TEST data..."
curl -s -X POST "http://localhost:8000/train?factors=16" > /dev/null
for i in $(seq 1 30); do
  status=$(curl -s http://localhost:8000/train/status | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
  if [ "$status" = "success" ]; then
    echo "  ✓ Re-training completed"
    break
  fi
  if [ "$status" = "failed" ]; then
    echo "  ✗ Re-training failed!" >&2
    exit 1
  fi
  sleep 2
done
echo ""

# ── 5. Run full test suite ─────────────────────────────
echo "▸ [5/5] Running full AI test suite..."
cd "$SCRIPT_DIR" && node tests/ai-test-runner.js 2>&1

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║     REPORT GENERATED                         ║"
echo "║     File: tests/ai-test-report.html          ║"
echo "╚══════════════════════════════════════════════╝"
