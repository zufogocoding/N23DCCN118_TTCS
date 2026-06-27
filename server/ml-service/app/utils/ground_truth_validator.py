import json
import logging
import math
import os
from itertools import combinations

import numpy as np
from app.database import get_db_connection

logger = logging.getLogger(__name__)

GROUND_TRUTH_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "ground_truth.json"
)

# Validation thresholds (calibrated for high-dim vectors with ~50-500 users)
# In high-dimensional space, random cosine similarity ~0 with std ~ 1/sqrt(dim).
# These thresholds check for SIGNAL above noise, not perfect separation.
# Note: cross-cluster genre tagging (20%) + higher DSP variance added June 2026
# makes ground truth noisier but more realistic — thresholds adjusted accordingly.
THRESHOLDS = {
    "intra_coherence_min": 0.10,
    "inter_separation_max": 0.30,
    "separation_gap_min": 0.02,
    "cluster_purity_min": 0.27,
}


def load_ground_truth(path=None):
    path = path or GROUND_TRUTH_PATH
    if not os.path.exists(path):
        logger.error(f"Ground truth file not found: {path}")
        logger.error("Run seed_interactions.py first.")
        return None
    with open(path, "r") as f:
        return json.load(f)


def parse_pgvector(vector_str):
    if not vector_str:
        return None
    return np.array(
        [float(x) for x in vector_str.strip("[]").split(",")], dtype=np.float32
    )


def cosine_sim(a, b):
    if a is None or b is None:
        return 0.0
    dot = float(np.dot(a, b))
    norm_a = float(np.linalg.norm(a))
    norm_b = float(np.linalg.norm(b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def fetch_user_vectors():
    """Fetch collaborative vectors for all active users from DB."""
    query = """
        SELECT id, "collaborativeVector"::text as vec
        FROM "User"
        WHERE "isActive" = true AND "collaborativeVector" IS NOT NULL
        ORDER BY id
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query)
            rows = cur.fetchall()

    user_vectors = {}
    for row in rows:
        vec = parse_pgvector(row[1])
        if vec is not None:
            user_vectors[int(row[0])] = vec
    logger.info(f"Fetched {len(user_vectors)} user collaborative vectors.")
    return user_vectors


def compute_group_metrics(user_vectors, ground_truth):
    """Compute intra-group coherence and inter-group separation."""
    groups = ground_truth["user_groups"]
    group_names = list(groups.keys())

    # Map user_id -> ground_truth group
    user_to_group = {}
    for group_name, user_ids in groups.items():
        for uid in user_ids:
            user_to_group[uid] = group_name

    # Filter to only users who have vectors
    available_users = set(user_vectors.keys()) & set(user_to_group.keys())
    if len(available_users) < 3:
        logger.error("Too few users with vectors to validate. Run training first.")
        return None

    # Compute all pairwise similarities
    pairs = list(combinations(sorted(available_users), 2))
    intra_sims = {g: [] for g in group_names}
    inter_sims = []

    for u1, u2 in pairs:
        sim = cosine_sim(user_vectors[u1], user_vectors[u2])
        g1, g2 = user_to_group[u1], user_to_group[u2]
        if g1 == g2:
            intra_sims[g1].append(sim)
        else:
            inter_sims.append(sim)

    # Averages
    avg_intra = {}
    for g in group_names:
        if intra_sims[g]:
            avg_intra[g] = float(np.mean(intra_sims[g]))
        else:
            avg_intra[g] = 0.0

    avg_intra_all = float(np.mean(list(avg_intra.values()))) if avg_intra else 0.0
    avg_inter = float(np.mean(inter_sims)) if inter_sims else 0.0
    separation_gap = avg_intra_all - avg_inter

    # Cluster purity: for each user, what % of their top-10 nearest neighbors
    # belong to the same group?
    purity_scores = []
    for uid in sorted(available_users):
        target_group = user_to_group[uid]
        # Compute similarity to all other users
        others = [u for u in available_users if u != uid]
        similarities = [(u, cosine_sim(user_vectors[uid], user_vectors[u])) for u in others]
        similarities.sort(key=lambda x: -x[1])
        top10 = similarities[:10]
        same_group_count = sum(1 for u, _ in top10 if user_to_group[u] == target_group)
        purity_scores.append(same_group_count / 10)

    avg_purity = float(np.mean(purity_scores)) if purity_scores else 0.0

    metrics = {
        "n_users_validated": len(available_users),
        "n_pairs_intra": sum(len(v) for v in intra_sims.values()),
        "n_pairs_inter": len(inter_sims),
        "group_sizes": {g: len([u for u in available_users if user_to_group[u] == g]) for g in group_names},
        "avg_intra_coherence": avg_intra_all,
        "avg_intra_by_group": avg_intra,
        "avg_inter_separation": avg_inter,
        "separation_gap": separation_gap,
        "cluster_purity": avg_purity,
        "results": {
            "intra_coherence": {
                "value": round(avg_intra_all, 4),
                "threshold": THRESHOLDS["intra_coherence_min"],
                "pass": avg_intra_all >= THRESHOLDS["intra_coherence_min"],
            },
            "inter_separation": {
                "value": round(avg_inter, 4),
                "threshold": THRESHOLDS["inter_separation_max"],
                "pass": avg_inter <= THRESHOLDS["inter_separation_max"],
            },
            "separation_gap": {
                "value": round(separation_gap, 4),
                "threshold": THRESHOLDS["separation_gap_min"],
                "pass": separation_gap >= THRESHOLDS["separation_gap_min"],
            },
            "cluster_purity": {
                "value": round(avg_purity, 4),
                "threshold": THRESHOLDS["cluster_purity_min"],
                "pass": avg_purity >= THRESHOLDS["cluster_purity_min"],
            },
        },
    }

    metrics["overall_pass"] = all(r["pass"] for r in metrics["results"].values())
    metrics["overall_score"] = round(
        sum(r["value"] for r in metrics["results"].values()) / 4, 4
    )

    return metrics


def print_report(metrics):
    if not metrics:
        logger.error("No metrics to report.")
        return

    n_groups = len(metrics.get("avg_intra_by_group", {}))
    group_sizes = list(metrics.get("group_sizes", {}).values())
    if group_sizes and n_groups > 1:
        n = metrics["n_users_validated"]
        expected_same = sum(s * (s - 1) / (n - 1) for s in group_sizes) / n
        random_purity = expected_same / 10 * 10  # top-10 ratio = same fraction
    else:
        random_purity = 0

    sep = "─" * 55
    logger.info(f"\n{sep}")
    logger.info("GROUND TRUTH VALIDATION REPORT")
    logger.info(sep)
    logger.info(f"Users validated: {metrics['n_users_validated']}")
    logger.info(f"Intra-group pairs: {metrics['n_pairs_intra']}")
    logger.info(f"Inter-group pairs: {metrics['n_pairs_inter']}")
    logger.info(f"Random baseline purity: {random_purity:.3f}")
    logger.info(sep)

    results = metrics["results"]
    for name, r in results.items():
        status = "✅ PASS" if r["pass"] else "❌ FAIL"
        logger.info(f"  {name:25s}: {r['value']:.4f}  (threshold: {r['threshold']})  {status}")

    logger.info(sep)
    logger.info(f"  Intra coherence by group:")
    for g, v in metrics["avg_intra_by_group"].items():
        logger.info(f"    {g:15s}: {v:.4f}")
    logger.info(sep)

    overall = "✅ ALL CHECKS PASSED" if metrics["overall_pass"] else "❌ SOME CHECKS FAILED"
    logger.info(f"  Overall: {overall}")
    logger.info(sep)


def validate(path=None):
    ground_truth = load_ground_truth(path)
    if not ground_truth:
        return None
    user_vectors = fetch_user_vectors()
    if not user_vectors:
        return None
    metrics = compute_group_metrics(user_vectors, ground_truth)
    print_report(metrics)
    return metrics


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
    )
    validate()
