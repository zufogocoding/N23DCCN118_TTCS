import os
import logging
from fastapi import FastAPI, HTTPException, Query

from fastapi.middleware.cors import CORSMiddleware
from app.services.train_service import trigger_training, get_training_status
from app.services.recommend_service import get_recommendations_for_user, get_similar_songs
from app.utils.audio_analyzer import analyze_audio_properties
from app.models.content_model import ContentModel
from app.database import get_db_connection


# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SoundClown ML API",
    description="Hybrid Recommendation Engine (Implicit ALS + pgvector Content Filtering)",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "SoundClown ML API",
        "methods": {
            "health": "/health",
            "train": "/train (POST)",
            "train_status": "/train/status (GET)",
            "recommend": "/recommend/{user_id} (GET)",
            "similar": "/recommend/songs/{song_id}/similar (GET)"
        }
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/train")
def train(
    factors: int = Query(None, description="Dimension of latent factors"),
    regularization: float = Query(None, description="ALS regularization"),
    alpha: float = Query(None, description="ALS implicit confidence multiplier"),
    iterations: int = Query(None, description="Number of ALS iterations")
):
    """
    Trigger the hybrid model training pipeline asynchronously.
    Updates User & Song content and collaborative vectors directly in PostgreSQL.
    """
    success, message = trigger_training(factors, regularization, alpha, iterations)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "training", "message": message}

@app.get("/train/status")
def train_status():
    """
    Check the current training status (idle, training, success, failed).
    """
    return get_training_status()

@app.get("/recommend/{user_id}")
def recommend(user_id: int, limit: int = Query(10, ge=1, le=50)):
    """
    Fetch personalized hybrid pgvector recommendations for the given user.
    """
    try:
        recommendations = get_recommendations_for_user(user_id, limit)
        return {
            "user_id": user_id,
            "count": len(recommendations),
            "recommendations": recommendations
        }
    except Exception as e:
        logger.error(f"Error in recommend endpoint for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch recommendations: {str(e)}")

@app.get("/recommend/songs/{song_id}/similar")
def similar(song_id: int, limit: int = Query(10, ge=1, le=50)):
    """
    Fetch songs that are rhythmically and contextually similar to the target song using pgvector.
    """
    try:
        similar_songs = get_similar_songs(song_id, limit)
        return {
            "song_id": song_id,
            "count": len(similar_songs),
            "similar_songs": similar_songs
        }
    except Exception as e:
        logger.error(f"Error in similar songs endpoint for song {song_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch similar songs: {str(e)}")

@app.post("/songs/{song_id}/analyze")
def analyze(
    song_id: int, 
    file_path: str = Query(..., description="Relative path of the song from uploads directory"),
    genre_tag: str = Query(None, description="Genre tag of the song for fallback mapping")
):
    """
    Run DSP audio feature analysis on uploaded track and update database.
    """
    try:
        # Convert relative path to absolute container path
        # In container: uploads is mounted at /app/uploads
        # Node server sends paths like "/uploads/audio/xyz.mp3" or "uploads/audio/xyz.mp3"
        cleaned_path = file_path.lstrip("/")
        if not cleaned_path.startswith("uploads/"):
            cleaned_path = os.path.join("uploads", cleaned_path)
            
        absolute_path = os.path.join("/app", cleaned_path)
        
        # 1. Run DSP analysis
        features = analyze_audio_properties(absolute_path, genre_tag)
        
        # 2. Update song metrics in CSDL
        query = 'UPDATE "Song" SET tempo = %s, energy = %s, danceability = %s WHERE id = %s'
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    query, 
                    (float(features["tempo"]), float(features["energy"]), float(features["danceability"]), song_id)
                )
                
        # 3. Regenerate single song pgvector content embedding
        content_model = ContentModel(vector_dim=128)
        content_model.build_and_save_single_song_vector(song_id)
        
        return {
            "status": "success",
            "song_id": song_id,
            "features": features
        }
    except Exception as e:
        logger.error(f"Error in analyze endpoint for song {song_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Audio analysis failed: {str(e)}")

