import logging
import threading
from app.models.als_model import ImplicitALSModel
from app.models.content_model import ContentModel
from app.config import ALS_FACTORS, ALS_REGULARIZATION, ALS_ALPHA, ALS_ITERATIONS

logger = logging.getLogger(__name__)

# Track training status to prevent concurrent training runs
_training_state = {
    "is_training": False,
    "status": "idle",
    "last_error": None,
    "last_trained": None,
    "last_status": "none"
}
_state_lock = threading.Lock()

def get_training_status():
    """
    Thread-safe fetch of training status.
    """
    with _state_lock:
        return _training_state.copy()

def _run_training_worker(factors, regularization, alpha, iterations):
    """
    Background worker performing actual database writes and mathematical fits.
    """
    global _training_state
    from datetime import datetime
    try:
        logger.info("🚀 Starting Recommendation System offline training worker...")
        
        # 1. Generate Song Content-Based Vectors (dimension 128)
        content_model = ContentModel(vector_dim=128)
        logger.info("Step 1/3: Computing Song Content Vectors...")
        songs_ok = content_model.build_and_save_song_vectors()
        if not songs_ok:
            raise RuntimeError("Failed to compute Song Content Vectors.")

        # 2. Fit and update Collaborative Vectors (dimension 64) via ALS
        als_model = ImplicitALSModel(
            factors=factors,
            regularization=regularization,
            alpha=alpha,
            iterations=iterations
        )
        logger.info("Step 2/3: Huấn luyện Implicit ALS Collaborative Filtering...")
        als_ok = als_model.train_pipeline()
        if not als_ok:
            logger.warning("Collaborative ALS training skipped due to insufficient interaction logs.")
            # Note: This is not a fatal failure, we still have Content-Based vectors!

        # 3. Generate User Content Profiles (dimension 128)
        logger.info("Step 3/3: Aggregating User Content Preference Profiles...")
        users_ok = content_model.build_and_save_user_vectors()
        if not users_ok:
            raise RuntimeError("Failed to build User Content Profiles.")

        with _state_lock:
            _training_state["is_training"] = False
            _training_state["status"] = "success"
            _training_state["last_error"] = None
            _training_state["last_trained"] = datetime.now().isoformat()
            _training_state["last_status"] = "success"
        logger.info("✅ Core Recommendation System training completed successfully!")

    except Exception as e:
        logger.error(f"❌ Training pipeline failed: {e}", exc_info=True)
        with _state_lock:
            _training_state["is_training"] = False
            _training_state["status"] = "failed"
            _training_state["last_error"] = str(e)
            _training_state["last_trained"] = datetime.now().isoformat()
            _training_state["last_status"] = "failed"

def trigger_training(factors=None, regularization=None, alpha=None, iterations=None):
    """
    Asynchronously triggers the training pipeline.
    """
    global _training_state
    
    # Use config defaults if not supplied
    f = factors if factors is not None else ALS_FACTORS
    r = regularization if regularization is not None else ALS_REGULARIZATION
    a = alpha if alpha is not None else ALS_ALPHA
    it = iterations if iterations is not None else ALS_ITERATIONS

    with _state_lock:
        if _training_state["is_training"]:
            logger.warning("Training already in progress. Ignoring trigger.")
            return False, "Training is already in progress."

        _training_state["is_training"] = True
        _training_state["status"] = "training"
        _training_state["last_error"] = None

    # Spawn background thread to prevent API blocking
    threading.Thread(
        target=_run_training_worker,
        args=(f, r, a, it),
        daemon=True
    ).start()
    
    return True, "Training started in background."
