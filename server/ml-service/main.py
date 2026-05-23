from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="SoundClown ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL", "")

@app.get("/")
def root():
    return {"status": "ok", "service": "SoundClown ML API"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/recommend/{user_id}")
def recommend(user_id: int, limit: int = 10):
    """
    Trả về danh sách bài hát gợi ý cho user.
    TODO: Tích hợp model implicit ALS thực tế.
    """
    return {
        "user_id": user_id,
        "recommendations": [],
        "message": "ML recommendation service is running. Model not yet trained."
    }
