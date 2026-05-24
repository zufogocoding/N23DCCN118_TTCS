import os
import logging
import math
import numpy as np
import librosa

logger = logging.getLogger(__name__)

# Expanded Genre-based Defaults as absolute fallback
GENRE_DEFAULTS = {
    "lo-fi": {"tempo": 75.0, "energy": 0.3, "danceability": 0.4},
    "lofi": {"tempo": 75.0, "energy": 0.3, "danceability": 0.4},
    "edm": {"tempo": 128.0, "energy": 0.85, "danceability": 0.9},
    "dance": {"tempo": 128.0, "energy": 0.85, "danceability": 0.9},
    "electronic": {"tempo": 128.0, "energy": 0.85, "danceability": 0.9},
    "techno": {"tempo": 128.0, "energy": 0.85, "danceability": 0.9},
    "house": {"tempo": 128.0, "energy": 0.85, "danceability": 0.9},
    "dubstep": {"tempo": 128.0, "energy": 0.85, "danceability": 0.9},
    "pop": {"tempo": 110.0, "energy": 0.65, "danceability": 0.7},
    "indie-pop": {"tempo": 110.0, "energy": 0.65, "danceability": 0.7},
    "rock": {"tempo": 125.0, "energy": 0.85, "danceability": 0.5},
    "metal": {"tempo": 125.0, "energy": 0.85, "danceability": 0.5},
    "punk": {"tempo": 125.0, "energy": 0.85, "danceability": 0.5},
    "grunge": {"tempo": 125.0, "energy": 0.85, "danceability": 0.5},
    "ballad": {"tempo": 85.0, "energy": 0.4, "danceability": 0.5},
    "r&b": {"tempo": 85.0, "energy": 0.4, "danceability": 0.5},
    "soul": {"tempo": 85.0, "energy": 0.4, "danceability": 0.5},
    "jazz": {"tempo": 85.0, "energy": 0.4, "danceability": 0.5},
    "blues": {"tempo": 85.0, "energy": 0.4, "danceability": 0.5},
    "hip-hop": {"tempo": 90.0, "energy": 0.7, "danceability": 0.8},
    "hiphop": {"tempo": 90.0, "energy": 0.7, "danceability": 0.8},
    "rap": {"tempo": 90.0, "energy": 0.7, "danceability": 0.8},
    "trap": {"tempo": 90.0, "energy": 0.7, "danceability": 0.8},
    "acoustic": {"tempo": 95.0, "energy": 0.4, "danceability": 0.5},
    "folk": {"tempo": 95.0, "energy": 0.4, "danceability": 0.5},
    "indie": {"tempo": 95.0, "energy": 0.4, "danceability": 0.5},
    "country": {"tempo": 95.0, "energy": 0.4, "danceability": 0.5},
    "classical": {"tempo": 80.0, "energy": 0.2, "danceability": 0.2},
    "instrumental": {"tempo": 80.0, "energy": 0.2, "danceability": 0.2},
    "orchestral": {"tempo": 80.0, "energy": 0.2, "danceability": 0.2},
    "soundtrack": {"tempo": 80.0, "energy": 0.2, "danceability": 0.2},
    "ambient": {"tempo": 65.0, "energy": 0.15, "danceability": 0.25},
    "chill": {"tempo": 65.0, "energy": 0.15, "danceability": 0.25},
    "relax": {"tempo": 65.0, "energy": 0.15, "danceability": 0.25},
    "meditation": {"tempo": 65.0, "energy": 0.15, "danceability": 0.25},
    "reggae": {"tempo": 80.0, "energy": 0.5, "danceability": 0.75},
    "ska": {"tempo": 80.0, "energy": 0.5, "danceability": 0.75},
    "dub": {"tempo": 80.0, "energy": 0.5, "danceability": 0.75},
    "latin": {"tempo": 100.0, "energy": 0.75, "danceability": 0.85},
    "reggaeton": {"tempo": 100.0, "energy": 0.75, "danceability": 0.85},
    "salsa": {"tempo": 100.0, "energy": 0.75, "danceability": 0.85},
    "bachata": {"tempo": 100.0, "energy": 0.75, "danceability": 0.85}
}

def get_defaults_by_genre(genre_tag: str):
    """
    Look up default audio values by checking match keywords in genre tag.
    """
    if not genre_tag:
        return {"tempo": 100.0, "energy": 0.5, "danceability": 0.5}
        
    tag = genre_tag.lower()
    for key, val in GENRE_DEFAULTS.items():
        if key in tag:
            return val
            
    # Default balanced values if no genre matched
    return {"tempo": 100.0, "energy": 0.5, "danceability": 0.5}

def analyze_audio_properties(file_path: str, genre_tag: str = None) -> dict:
    """
    Analyze an audio file using Librosa to estimate its DSP properties:
    - Tempo (BPM)
    - Energy (based on RMS energy normalized)
    - Danceability (based on onset rhythm strength)
    
    Optimized:
    - Only reads a 60-second snippet from the middle of the track (offset 60s, duration 60s)
    - Downsamples to 11025 Hz to optimize speed and limit memory footprint.
    - Resolves OOM risks for large files (e.g. 1-hour tracks).
    - Fully robust fallback system.
    """
    logger.info(f"Analyzing audio file: {file_path}")
    
    # Check if file exists
    if not file_path or not os.path.exists(file_path):
        logger.warning(f"File not found on disk: {file_path}. Falling back to genre defaults.")
        return get_defaults_by_genre(genre_tag)
        
    try:
        # Step 1: Pre-detect duration to choose a safe offset
        # If file is shorter than 90s, we start at offset 0
        # If longer, we start at offset 60s to capture a representative middle segment
        try:
            duration = librosa.get_duration(path=file_path)
            offset = 60.0 if duration > 90.0 else 0.0
            slice_duration = min(60.0, duration)
        except Exception as duration_err:
            logger.warning(f"Could not read duration: {duration_err}. Using standard offset=0.")
            offset = 0.0
            slice_duration = 60.0

        # Step 2: Load the slice (downsampled to 11025 Hz for extreme speed & efficiency)
        y, sr = librosa.load(
            file_path,
            offset=offset,
            duration=slice_duration,
            sr=11025
        )
        
        if len(y) == 0:
            raise ValueError("Empty audio buffer loaded.")
            
        # Step 3: Estimate Tempo (BPM)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        
        # Handle version-agnostic librosa tempo array/float types
        if hasattr(tempo, "item"):
            tempo_val = float(tempo.item())
        elif isinstance(tempo, np.ndarray):
            tempo_val = float(tempo[0]) if len(tempo) > 0 else 100.0
        else:
            tempo_val = float(tempo)
            
        # Standardize unreasonable BPMs (e.g. double tempo / half tempo anomalies)
        if tempo_val < 50:
            tempo_val *= 2
        elif tempo_val > 200:
            tempo_val /= 2
            
        # Clamp between 50 and 200
        tempo_val = min(max(tempo_val, 50.0), 200.0)
        
        # Step 4: Estimate Energy (mean RMS amplitude normalized)
        rms = librosa.feature.rms(y=y)
        mean_rms = float(np.mean(rms)) if len(rms) > 0 else 0.0
        energy_val = min(max(mean_rms * 3.5, 0.0), 1.0) # Scale appropriately
        
        # Step 5: Estimate Danceability (onset envelope strength and regularity)
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        mean_onset = float(np.mean(onset_env)) if len(onset_env) > 0 else 0.0
        danceability_val = min(max(mean_onset / 4.0, 0.0), 1.0)
        
        # If calculations return NaN, fallback safely
        if math.isnan(tempo_val) or tempo_val == 0:
            tempo_val = 100.0
        if math.isnan(energy_val):
            energy_val = 0.5
        if math.isnan(danceability_val):
            danceability_val = 0.5
            
        logger.info(f"✅ DSP analysis completed successfully: Tempo={tempo_val:.1f}, Energy={energy_val:.2f}, Danceability={danceability_val:.2f}")
        return {
            "tempo": round(tempo_val, 1),
            "energy": round(energy_val, 2),
            "danceability": round(danceability_val, 2)
        }
        
    except Exception as e:
        logger.error(f"❌ Error during DSP audio analysis: {e}. Gracefully falling back to genre defaults.", exc_info=True)
        return get_defaults_by_genre(genre_tag)
