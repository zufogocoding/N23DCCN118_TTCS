import logging
import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix
import implicit
from app.models.als_model import ImplicitALSModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def split_train_test(df_interactions, test_ratio=0.2, seed=42):
    """
    Splits user interactions into Train and Test sets.
    For each user with at least 5 interactions, masks test_ratio portion of positive interactions.
    """
    np.random.seed(seed)
    
    # Filter positive interactions
    df_pos = df_interactions[(df_interactions["isLiked"] == True) | (df_interactions["completionRate"] >= 0.5)].copy()
    
    if df_pos.empty:
        logger.warning("No positive interactions to evaluate.")
        return df_interactions, pd.DataFrame()

    train_indices = []
    test_indices = []

    # Group by user to split individually
    for uid, group in df_pos.groupby("userId"):
        indices = group.index.tolist()
        if len(indices) >= 5:
            n_test = int(np.ceil(len(indices) * test_ratio))
            # Shuffle indices
            np.random.shuffle(indices)
            test_indices.extend(indices[:n_test])
            train_indices.extend(indices[n_test:])
        else:
            train_indices.extend(indices)

    # DataFrame slices
    df_train = df_interactions.copy()
    # Mask test rows in train dataset by setting completionRate and isLiked to 0
    df_train.loc[test_indices, "completionRate"] = 0.0
    df_train.loc[test_indices, "isLiked"] = False
    
    df_test = df_interactions.loc[test_indices].copy()
    return df_train, df_test

def compute_ap_at_k(actual, predicted, k=10):
    """
    Computes Average Precision at K (AP@K) for a single user.
    """
    if not actual:
        return 0.0
        
    predicted = predicted[:k]
    score = 0.0
    num_hits = 0.0

    for i, p in enumerate(predicted):
        if p in actual and p not in predicted[:i]:
            num_hits += 1.0
            score += num_hits / (i + 1.0)

    return score / min(len(actual), k)

def compute_ndcg_at_k(actual, predicted, k=10):
    """
    Computes Normalized Discounted Cumulative Gain at K (NDCG@K) for a single user.
    """
    if not actual:
        return 0.0
        
    predicted = predicted[:k]
    dcg = 0.0
    idcg = 0.0

    # Calculate DCG
    for i, p in enumerate(predicted):
        if p in actual:
            dcg += 1.0 / np.log2(i + 2.0)

    # Calculate Ideal DCG (IDCG)
    for i in range(min(len(actual), k)):
        idcg += 1.0 / np.log2(i + 2.0)

    if idcg == 0.0:
        return 0.0
        
    return dcg / idcg

def evaluate_als_model(factors, regularization, alpha, iterations, k=10):
    """
    Evaluates the ALS model with given hyperparameters and returns MAP@K and NDCG@K.
    """
    # 1. Initialize temporary model
    temp_model = ImplicitALSModel(factors=factors, regularization=regularization, alpha=alpha, iterations=iterations)
    
    # 2. Fetch all raw datasets
    df_interactions, user_ids, song_ids = temp_model.fetch_interactions_and_metadata()
    if df_interactions.empty or len(user_ids) < 3 or len(song_ids) < 5:
        logger.warning("Insufficient data to perform mathematical evaluation.")
        return 0.0, 0.0

    # 3. Perform Train/Test Split
    df_train, df_test = split_train_test(df_interactions, test_ratio=0.2)
    if df_test.empty:
        logger.warning("Test set is empty. Cannot evaluate.")
        return 0.0, 0.0

    # 4. Build Train Matrix & Fit Model
    user_item_matrix = temp_model.build_interaction_matrix(df_train, user_ids, song_ids)
    if user_item_matrix is None:
        return 0.0, 0.0
        
    item_user_matrix = user_item_matrix.T.tocsr()
    
    # Train
    als = implicit.als.AlternatingLeastSquares(
        factors=factors,
        regularization=regularization,
        iterations=iterations,
        random_state=42,
        use_gpu=False
    )
    als.fit(item_user_matrix, show_progress=False)

    # 5. Calculate Metrics
    ap_scores = []
    ndcg_scores = []
    
    # Group test items by user
    user_test_items = df_test.groupby("userId")["songId"].apply(list).to_dict()

    for user_id, actual_songs in user_test_items.items():
        if user_id not in temp_model.user_to_idx:
            continue
            
        user_idx = temp_model.user_to_idx[user_id]
        
        # Get recommendations
        # ids contains indices of recommended items, scores contain confidence scores
        ids, _ = als.recommend(
            user_idx, 
            user_item_matrix[user_idx], 
            N=k, 
            filter_already_liked_items=False
        )
        
        # Map indices back to original song IDs
        predicted_songs = [temp_model.idx_to_song[idx] for idx in ids]
        
        # Compute AP & NDCG
        ap = compute_ap_at_k(actual_songs, predicted_songs, k=k)
        ndcg = compute_ndcg_at_k(actual_songs, predicted_songs, k=k)
        
        ap_scores.append(ap)
        ndcg_scores.append(ndcg)

    mean_map = float(np.mean(ap_scores)) if ap_scores else 0.0
    mean_ndcg = float(np.mean(ndcg_scores)) if ndcg_scores else 0.0
    return mean_map, mean_ndcg

def run_grid_search():
    """
    Executes a grid search across standard hyperparameter ranges to find mathematically optimal settings.
    """
    logger.info("=========================================")
    logger.info("🚀 Initiating Grid Search Optimization Pipeline...")
    logger.info("=========================================")
    
    grid = {
        "factors": [16, 32, 64],
        "regularization": [0.01, 0.1, 1.0],
        "alpha": [1.0, 10.0, 40.0],
        "iterations": [10, 15]
    }
    
    best_ndcg = -1.0
    best_map = -1.0
    best_params = {}
    
    results = []
    
    for f in grid["factors"]:
        for r in grid["regularization"]:
            for a in grid["alpha"]:
                for it in grid["iterations"]:
                    try:
                        m_map, m_ndcg = evaluate_als_model(f, r, a, it, k=10)
                        results.append({
                            "factors": f,
                            "regularization": r,
                            "alpha": a,
                            "iterations": it,
                            "MAP@10": m_map,
                            "NDCG@10": m_ndcg
                        })
                        
                        logger.info(f"Params: factors={f}, reg={r}, alpha={a}, iter={it} | MAP@10: {m_map:.4f} | NDCG@10: {m_ndcg:.4f}")
                        
                        # Rank primarily on NDCG@10, secondary on MAP@10
                        if m_ndcg > best_ndcg:
                            best_ndcg = m_ndcg
                            best_map = m_map
                            best_params = {"factors": f, "regularization": r, "alpha": a, "iterations": it}
                    except Exception as e:
                        logger.error(f"Failed combination (f={f}, r={r}, a={a}, i={it}): {e}")

    logger.info("=========================================")
    logger.info("🏆 GRID SEARCH COMPLETED SUCCESSFULY!")
    logger.info(f"Optimal Hyperparameters: {best_params}")
    logger.info(f"Best NDCG@10 score: {best_ndcg:.4f}")
    logger.info(f"Best MAP@10 score: {best_map:.4f}")
    logger.info("=========================================")
    
    return best_params, best_ndcg

if __name__ == "__main__":
    run_grid_search()
