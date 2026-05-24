import logging
import math
import numpy as np
import pandas as pd
from app.database import get_db_connection
from app.utils.helpers import format_pgvector, normalize_min_max

logger = logging.getLogger(__name__)

class ContentModel:
    def __init__(self, vector_dim=128):
        self.vector_dim = vector_dim
        # Map of genre tags to indices in the vector
        self.genre_to_idx = {}
        self.idx_to_genre = {}

    def fetch_and_map_genres(self):
        """
        Fetch all genre tags and map them to consecutive indices (starting after the first 3 audio feature slots).
        First 3 slots are: [tempo, energy, danceability]
        Indices for genres start at slot 3 and go up to vector_dim - 1 (127).
        """
        query = 'SELECT id, "genreTag" FROM "Genre" ORDER BY "genreTag" ASC'
        with get_db_connection() as conn:
            df = pd.read_sql_query(query, conn)
            
        genre_tags = df["genreTag"].tolist()
        
        # Max genres we can represent is vector_dim - 3 (125 genres)
        max_genres = self.vector_dim - 3
        for i, tag in enumerate(genre_tags[:max_genres]):
            idx = i + 3
            self.genre_to_idx[tag] = idx
            self.idx_to_genre[idx] = tag
            
        logger.info(f"Mapped {len(self.genre_to_idx)} genre tags to Content Vector indices (slots 3 to {len(self.genre_to_idx) + 2}).")

    def build_and_save_song_vectors(self):
        """
        Generate 128-dimensional content vectors for all songs and save them in PostgreSQL.
        """
        self.fetch_and_map_genres()
        
        # Query all songs and their genre relations
        query_songs = """
            SELECT id, title, energy, tempo, danceability 
            FROM "Song" 
            WHERE "isDeleted" = false
        """
        query_song_genres = """
            SELECT sg."songId", g."genreTag"
            FROM "SongGenre" sg
            JOIN "Genre" g ON sg."genreId" = g.id
        """
        
        with get_db_connection() as conn:
            df_songs = pd.read_sql_query(query_songs, conn)
            df_song_genres = pd.read_sql_query(query_song_genres, conn)

        if df_songs.empty:
            logger.warning("⚠️ No songs found in the database to build Content Vectors.")
            return False

        # Group genres by songId
        genres_by_song = df_song_genres.groupby("songId")["genreTag"].apply(list).to_dict()

        logger.info("Computing and saving 128-dim Song Content Vectors...")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                for _, row in df_songs.iterrows():
                    song_id = int(row["id"])
                    
                    # 1. Normalize audio features
                    tempo = row["tempo"]
                    energy = row["energy"]
                    danceability = row["danceability"]
                    
                    # Normalize BPM between 50 and 200
                    norm_tempo = normalize_min_max(tempo, 50.0, 200.0)
                    norm_energy = float(energy) if energy is not None and not math.isnan(energy) else 0.5
                    norm_danceability = float(danceability) if danceability is not None and not math.isnan(danceability) else 0.5
                    
                    # 2. Build vector array
                    vector = np.zeros(self.vector_dim, dtype=np.float32)
                    vector[0] = norm_tempo
                    vector[1] = norm_energy
                    vector[2] = norm_danceability
                    
                    # 3. Apply genre one-hot slots
                    song_genres = genres_by_song.get(song_id, [])
                    for genre in song_genres:
                        if genre in self.genre_to_idx:
                            idx = self.genre_to_idx[genre]
                            vector[idx] = 1.0
                            
                    # 4. L2 Normalize the vector so cosine similarity is optimal
                    norm = np.linalg.norm(vector)
                    if norm > 0:
                        vector = vector / norm
                        
                    # 5. Format to pgvector string and update DB
                    vector_str = format_pgvector(vector)
                    cur.execute(
                        'UPDATE "Song" SET "contentVector" = %s::vector WHERE id = %s',
                        (vector_str, song_id)
                    )
                    
            logger.info("✅ Song Content Vectors updated successfully in DB.")
        return True

    def build_and_save_user_vectors(self):
        """
        Aggregate song content vectors based on positive interactions of each user to build User Content Profiles.
        """
        # Fetch positive interactions (liked or high completion rate)
        query_positive_interactions = """
            SELECT "userId", "songId", "isLiked", "completionRate"
            FROM "Interaction"
            WHERE "isLiked" = true OR "completionRate" >= 0.5
        """
        # Fetch active users
        query_active_users = 'SELECT id FROM "User" WHERE "isActive" = true'
        # Fetch all song content vectors
        query_song_vectors = 'SELECT id, "contentVector"::text as content_vector FROM "Song" WHERE "contentVector" IS NOT NULL'
        
        with get_db_connection() as conn:
            df_interactions = pd.read_sql_query(query_positive_interactions, conn)
            df_users = pd.read_sql_query(query_active_users, conn)
            df_songs = pd.read_sql_query(query_song_vectors, conn)

        if df_users.empty:
            logger.warning("⚠️ No active users found to generate content profiles.")
            return False
            
        if df_interactions.empty or df_songs.empty:
            logger.warning("⚠️ Insufficient interaction or song vector data to construct User Profiles. Seeding default balanced vectors.")
            self.seed_default_user_vectors(df_users["id"].tolist())
            return True

        # Map song content vectors from string '[v1,v2,...]' to numpy arrays
        song_vectors_dict = {}
        for _, row in df_songs.iterrows():
            sid = int(row["id"])
            vec_str = row["content_vector"]
            if vec_str:
                # Parse vector string '[0.1,0.2,...]'
                try:
                    vec = np.fromstring(vec_str.strip("[]"), sep=",", dtype=np.float32)
                    if len(vec) == self.vector_dim:
                        song_vectors_dict[sid] = vec
                except Exception as e:
                    logger.error(f"Error parsing content vector for song {sid}: {e}")

        logger.info("Aggregating user listening interactions to build User Content Profiles...")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                for _, user_row in df_users.iterrows():
                    user_id = int(user_row["id"])
                    
                    # Filter positive interactions for this user
                    user_ints = df_interactions[df_interactions["userId"] == user_id]
                    
                    if user_ints.empty:
                        # Fallback: seed balanced vector
                        vector = np.zeros(self.vector_dim, dtype=np.float32)
                        vector[0:3] = 0.5  # default balanced features
                        norm = np.linalg.norm(vector)
                        if norm > 0:
                            vector = vector / norm
                        vector_str = format_pgvector(vector)
                        cur.execute(
                            'UPDATE "User" SET "contentVector" = %s::vector WHERE id = %s',
                            (vector_str, user_id)
                        )
                        continue
                        
                    # Aggregate vectors with weighted weights
                    # Weight = 3.0 for like, 1.0 for completion rate >= 0.5
                    user_profile = np.zeros(self.vector_dim, dtype=np.float32)
                    count_weighted = 0.0
                    
                    for _, i_row in user_ints.iterrows():
                        sid = int(i_row["songId"])
                        is_liked = bool(i_row["isLiked"])
                        completion = float(i_row["completionRate"]) if i_row["completionRate"] is not None else 0.0
                        
                        if sid in song_vectors_dict:
                            weight = 3.0 if is_liked else (1.0 if completion >= 0.5 else 0.0)
                            user_profile += song_vectors_dict[sid] * weight
                            count_weighted += weight
                            
                    if count_weighted > 0:
                        # L2 Normalize aggregated profile
                        norm = np.linalg.norm(user_profile)
                        if norm > 0:
                            user_profile = user_profile / norm
                    else:
                        user_profile[0:3] = 0.5
                        user_profile = user_profile / np.linalg.norm(user_profile)
                        
                    # Update database
                    vector_str = format_pgvector(user_profile)
                    cur.execute(
                        'UPDATE "User" SET "contentVector" = %s::vector WHERE id = %s',
                        (vector_str, user_id)
                    )
                    
            logger.info("✅ User Content Profiles successfully updated in DB.")
        return True

    def seed_default_user_vectors(self, user_ids):
        """
        Populate default vectors for cold-start users.
        """
        logger.info("Seeding default balanced content vectors for users...")
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                for uid in user_ids:
                    vector = np.zeros(self.vector_dim, dtype=np.float32)
                    vector[0:3] = 0.5  # default balanced features
                    norm = np.linalg.norm(vector)
                    if norm > 0:
                        vector = vector / norm
                    vector_str = format_pgvector(vector)
                    cur.execute(
                        'UPDATE "User" SET "contentVector" = %s::vector WHERE id = %s',
                        (vector_str, uid)
                    )
        logger.info("✅ Finished seeding default user vectors.")

    def run_pipeline(self):
        """
        Executes the content-based vectors pipeline.
        """
        songs_ok = self.build_and_save_song_vectors()
        if not songs_ok:
            return False
        users_ok = self.build_and_save_user_vectors()
        return users_ok
