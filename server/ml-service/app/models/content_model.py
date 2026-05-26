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
        Sử dụng execute_values để batch update thay vì N+1 individual UPDATEs.
        """
        from psycopg2.extras import execute_values

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

        logger.info("Computing 128-dim Song Content Vectors (batch mode)...")

        # Tính toán tất cả vectors trong bộ nhớ trước, sau đó batch insert 1 lần
        batch_data = []  # list of (vector_str, song_id)
        for _, row in df_songs.iterrows():
            song_id = int(row["id"])
            
            # 1. Normalize audio features
            tempo = row["tempo"]
            energy = row["energy"]
            danceability = row["danceability"]
            
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
                    vector[self.genre_to_idx[genre]] = 1.0
                        
            # 4. L2 Normalize
            norm = np.linalg.norm(vector)
            if norm > 0:
                vector = vector / norm

            batch_data.append((format_pgvector(vector), song_id))

        # 5. Batch update tất cả trong 1 query duy nhất
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                execute_values(
                    cur,
                    'UPDATE "Song" SET "contentVector" = data.v::vector '
                    'FROM (VALUES %s) AS data(v, id) WHERE "Song".id = data.id::int',
                    batch_data,
                    page_size=500
                )
        logger.info(f"✅ Batch updated {len(batch_data)} Song Content Vectors.")
        return True

    def build_and_save_user_vectors(self):
        """
        Aggregate song content vectors based on positive interactions of each user to build User Content Profiles.
        Sử dụng numpy vectorized operations và execute_values batch thay vì double iterrows loop.
        """
        from psycopg2.extras import execute_values

        query_positive_interactions = """
            SELECT "userId", "songId", "isLiked", "completionRate"
            FROM "Interaction"
            WHERE "isLiked" = true OR "completionRate" >= 0.5
        """
        query_active_users = 'SELECT id FROM "User" WHERE "isActive" = true'
        query_song_vectors = 'SELECT id, "contentVector"::text as content_vector FROM "Song" WHERE "contentVector" IS NOT NULL'
        
        with get_db_connection() as conn:
            df_interactions = pd.read_sql_query(query_positive_interactions, conn)
            df_users = pd.read_sql_query(query_active_users, conn)
            df_songs = pd.read_sql_query(query_song_vectors, conn)

        if df_users.empty:
            logger.warning("⚠️ No active users found to generate content profiles.")
            return False
            
        if df_interactions.empty or df_songs.empty:
            logger.warning("⚠️ Insufficient interaction or song vector data. Seeding default balanced vectors.")
            self.seed_default_user_vectors(df_users["id"].tolist())
            return True

        # Parse tất cả song vectors thành numpy matrix 1 lần
        valid_songs = []
        for _, row in df_songs.iterrows():
            vec_str = row["content_vector"]
            if vec_str:
                try:
                    vec = np.fromstring(vec_str.strip("[]"), sep=",", dtype=np.float32)
                    if len(vec) == self.vector_dim:
                        valid_songs.append((int(row["id"]), vec))
                except Exception as e:
                    logger.error(f"Error parsing content vector for song {int(row['id'])}: {e}")

        if not valid_songs:
            self.seed_default_user_vectors(df_users["id"].tolist())
            return True

        song_ids_arr = np.array([s[0] for s in valid_songs], dtype=np.int64)
        song_vec_matrix = np.stack([s[1] for s in valid_songs])  # shape: (n_songs, vector_dim)
        song_id_to_row = {sid: i for i, sid in enumerate(song_ids_arr)}

        # Tính weight cho từng interaction một lần (vectorized)
        df_interactions = df_interactions[df_interactions["songId"].isin(song_id_to_row)].copy()
        df_interactions["weight"] = np.where(
            df_interactions["isLiked"],
            3.0,
            np.where(df_interactions["completionRate"].fillna(0) >= 0.5, 1.0, 0.0)
        )
        df_interactions = df_interactions[df_interactions["weight"] > 0]
        df_interactions["song_row"] = df_interactions["songId"].map(song_id_to_row)

        logger.info("Aggregating User Content Profiles (vectorized mode)...")

        user_ids = df_users["id"].tolist()
        default_vector = np.zeros(self.vector_dim, dtype=np.float32)
        default_vector[0:3] = 0.5
        default_norm = np.linalg.norm(default_vector)
        default_vector = default_vector / default_norm if default_norm > 0 else default_vector
        default_vec_str = format_pgvector(default_vector)

        batch_data = []
        for user_id in user_ids:
            user_ints = df_interactions[df_interactions["userId"] == user_id]

            if user_ints.empty:
                batch_data.append((default_vec_str, user_id))
                continue

            # Vectorized weighted sum: ma trận nhân thay cho Python loop
            weights = user_ints["weight"].values.astype(np.float32)          # (k,)
            rows    = user_ints["song_row"].values.astype(np.int64)            # (k,)
            profile = weights @ song_vec_matrix[rows]                          # (vector_dim,)

            norm = np.linalg.norm(profile)
            profile = profile / norm if norm > 0 else default_vector

            batch_data.append((format_pgvector(profile), user_id))

        # Batch update tất cả user vectors trong 1 query duy nhất
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                execute_values(
                    cur,
                    'UPDATE "User" SET "contentVector" = data.v::vector '
                    'FROM (VALUES %s) AS data(v, id) WHERE "User".id = data.id::int',
                    batch_data,
                    page_size=500
                )
        logger.info(f"✅ Batch updated {len(batch_data)} User Content Profiles.")
        return True

    def seed_default_user_vectors(self, user_ids):
        """
        Populate default vectors for cold-start users. Sử dụng batch execute_values.
        """
        from psycopg2.extras import execute_values

        logger.info("Seeding default balanced content vectors for users...")

        default_vector = np.zeros(self.vector_dim, dtype=np.float32)
        default_vector[0:3] = 0.5
        norm = np.linalg.norm(default_vector)
        if norm > 0:
            default_vector = default_vector / norm
        default_vec_str = format_pgvector(default_vector)

        batch_data = [(default_vec_str, uid) for uid in user_ids]

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                execute_values(
                    cur,
                    'UPDATE "User" SET "contentVector" = data.v::vector '
                    'FROM (VALUES %s) AS data(v, id) WHERE "User".id = data.id::int',
                    batch_data,
                    page_size=500
                )
        logger.info(f"✅ Batch seeded default vectors for {len(user_ids)} users.")

    def build_and_save_single_song_vector(self, song_id):
        """
        Generate 128-dimensional content vector for a single song and save it in PostgreSQL.
        """
        self.fetch_and_map_genres()
        
        query_song = """
            SELECT id, title, energy, tempo, danceability 
            FROM "Song" 
            WHERE id = %s AND "isDeleted" = false
        """
        query_song_genres = """
            SELECT sg."songId", g."genreTag"
            FROM "SongGenre" sg
            JOIN "Genre" g ON sg."genreId" = g.id
            WHERE sg."songId" = %s
        """
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query_song, (song_id,))
                # Map column names
                columns = [desc[0] for desc in cur.description]
                row = cur.fetchone()
                if not row:
                    logger.warning(f"Song {song_id} not found in DB.")
                    return False
                
                song_data = dict(zip(columns, row))
                
                # Fetch song genres
                cur.execute(query_song_genres, (song_id,))
                song_genres = [r[1] for r in cur.fetchall()]
                
                # Normalize features
                tempo = song_data["tempo"]
                energy = song_data["energy"]
                danceability = song_data["danceability"]
                
                norm_tempo = normalize_min_max(tempo, 50.0, 200.0)
                norm_energy = float(energy) if energy is not None and not math.isnan(energy) else 0.5
                norm_danceability = float(danceability) if danceability is not None and not math.isnan(danceability) else 0.5
                
                # Build vector
                vector = np.zeros(self.vector_dim, dtype=np.float32)
                vector[0] = norm_tempo
                vector[1] = norm_energy
                vector[2] = norm_danceability
                
                for genre in song_genres:
                    if genre in self.genre_to_idx:
                        idx = self.genre_to_idx[genre]
                        vector[idx] = 1.0
                        
                # L2 Normalize
                norm = np.linalg.norm(vector)
                if norm > 0:
                    vector = vector / norm
                    
                vector_str = format_pgvector(vector)
                cur.execute(
                    'UPDATE "Song" SET "contentVector" = %s::vector WHERE id = %s',
                    (vector_str, song_id)
                )
        logger.info(f"✅ Single Song Content Vector for song {song_id} updated successfully.")
        return True

    def run_pipeline(self):
        """
        Executes the content-based vectors pipeline.
        """
        songs_ok = self.build_and_save_song_vectors()
        if not songs_ok:
            return False
        users_ok = self.build_and_save_user_vectors()
        return users_ok

