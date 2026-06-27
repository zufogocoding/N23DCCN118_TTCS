import logging
import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix, coo_matrix
import implicit
from app.database import get_db_connection
from app.utils.helpers import format_pgvector

logger = logging.getLogger(__name__)

class ImplicitALSModel:
    def __init__(self, factors=32, regularization=0.1, alpha=10.0, iterations=15):
        self.factors = factors
        self.regularization = regularization
        self.alpha = alpha
        self.iterations = iterations
        self.model = None
        
        # Mappings
        self.user_to_idx = {}
        self.idx_to_user = {}
        self.song_to_idx = {}
        self.idx_to_song = {}

    def fetch_interactions_and_metadata(self):
        """
        Fetch all user-song interactions and unique users/songs from database.
        """
        query_interactions = """
            SELECT 
              i."userId", 
              i."songId", 
              i."completionRate", 
              CASE WHEN l."songId" IS NOT NULL THEN true ELSE false END AS "isLiked", 
              i."isSkipped", 
              i."durationPlayed"
            FROM "Interaction" i
            LEFT JOIN "SongLike" l ON i."userId" = l."userId" AND i."songId" = l."songId"
            
            UNION ALL
            
            SELECT 
              "userId", 
              "songId", 
              1.0 AS "completionRate", 
              true AS "isLiked", 
              false AS "isSkipped", 
              0 AS "durationPlayed"
            FROM "SongLike"
        """
        query_users = 'SELECT id FROM "User" WHERE "isActive" = true'
        query_songs = 'SELECT id FROM "Song" WHERE "isDeleted" = false AND status = \'approved\''

        with get_db_connection() as conn:
            # Fetch datasets
            df_interactions = pd.read_sql_query(query_interactions, conn)
            df_users = pd.read_sql_query(query_users, conn)
            df_songs = pd.read_sql_query(query_songs, conn)

        return df_interactions, df_users["id"].tolist(), df_songs["id"].tolist()

    def build_interaction_matrix(self, df_interactions, user_ids, song_ids):
        """
        Builds user-item index maps and a sparse confidence matrix for Implicit ALS.
        """
        # Create consecutive index mapping for unique active users & songs
        self.user_to_idx = {uid: i for i, uid in enumerate(user_ids)}
        self.idx_to_user = {i: uid for uid, i in self.user_to_idx.items()}
        
        self.song_to_idx = {sid: i for i, sid in enumerate(song_ids)}
        self.idx_to_song = {i: sid for sid, i in self.song_to_idx.items()}

        if df_interactions.empty:
            logger.warning("⚠️ No interactions found in the database. Matrix is empty.")
            return None

        # Filter interactions to only include active users & released songs
        df_filtered = df_interactions[
            df_interactions["userId"].isin(self.user_to_idx) & 
            df_interactions["songId"].isin(self.song_to_idx)
        ].copy()

        if df_filtered.empty:
            logger.warning("⚠️ No interactions left after filtering active users & released songs.")
            return None

        # Aggregate multiple interactions for the same user-song pair
        # Sum durationPlayed, take max of isLiked, sum isSkipped, mean of completionRate
        agg_rules = {
            "completionRate": "max",  # max completion rate achieved
            "isLiked": "max",         # if liked once, it is liked
            "isSkipped": "sum",       # sum skips to penalize
            "durationPlayed": "sum"   # sum duration played
        }
        df_grouped = df_filtered.groupby(["userId", "songId"]).agg(agg_rules).reset_index()

        # Calculate implicit preference rating and confidence
        # Formula: preference = 1.0 if (liked or completed > 50%), else 0.0
        # Confidence = 1 + alpha * (completionRate * 5.0 + 10.0 if liked else 0 - 3.0 * skips)
        df_grouped["isLiked_bool"] = df_grouped["isLiked"].astype(bool)
        df_grouped["completionRate_val"] = df_grouped["completionRate"].fillna(0.0)
        
        # Calculate interaction strength
        df_grouped["strength"] = (
            df_grouped["completionRate_val"] * 5.0 +
            df_grouped["isLiked_bool"].apply(lambda x: 10.0 if x else 0.0) -
            df_grouped["isSkipped"].apply(lambda x: min(x * 3.0, 8.0)) # cap skip penalty at 8.0
        )
        # Strength cannot be negative
        df_grouped["strength"] = df_grouped["strength"].clip(lower=0.0)
        
        # Calculate confidence
        df_grouped["confidence"] = 1.0 + self.alpha * df_grouped["strength"]

        # Map to consecutive indices
        row_indices = [self.user_to_idx[uid] for uid in df_grouped["userId"]]
        col_indices = [self.song_to_idx[sid] for sid in df_grouped["songId"]]
        data = df_grouped["confidence"].tolist()

        # Construct sparse row (user-item) matrix
        # implicit expects an item-user matrix for training, or user-item matrix of CSR format
        n_users = len(user_ids)
        n_songs = len(song_ids)
        
        user_item_matrix = csr_matrix(
            (data, (row_indices, col_indices)), 
            shape=(n_users, n_songs),
            dtype=np.float32
        )
        return user_item_matrix

    def fit(self, user_item_matrix):
        """
        Fits the ALS model.
        """
        logger.info(f"Training Implicit ALS (factors={self.factors}, reg={self.regularization}, iter={self.iterations})...")
        
        # Initialize Alternating Least Squares model
        # use_gpu=False is standard and safe
        self.model = implicit.als.AlternatingLeastSquares(
            factors=self.factors,
            regularization=self.regularization,
            iterations=self.iterations,
            random_state=42,
            use_gpu=False
        )
        
        # Model training expects item_user matrix (transpose of user_item)
        # implicit takes a CSR matrix where rows are items, cols are users
        item_user_matrix = user_item_matrix.T.tocsr()
        self.model.fit(item_user_matrix, show_progress=False)
        logger.info("✅ ALS Model training completed successfully.")

    def save_vectors_to_db(self):
        """
        Save calculated User factors and Song factors back to DB in collaborativeVector.
        Sử dụng execute_values để batch update thay vì N+1 individual UPDATEs.
        """
        from psycopg2.extras import execute_values

        if self.model is None:
            raise ValueError("Model is not trained yet.")
        
        # Because the model is trained with item_user_matrix (transposed, where items are rows and users are columns),
        # implicit's user_factors corresponds to items (songs) and item_factors corresponds to users.
        user_factors = self.model.item_factors
        song_factors = self.model.user_factors

        # In newer versions of implicit, user_factors/item_factors are Decomposition objects,
        # and we can extract the raw numpy arrays from their .factors attribute if present.
        if hasattr(user_factors, "factors"):
            user_factors = user_factors.factors
        if hasattr(song_factors, "factors"):
            song_factors = song_factors.factors

        logger.info(f"User factors shape: {user_factors.shape}, Item factors shape: {song_factors.shape}")
        logger.info("Batch updating Collaborative Vectors in PostgreSQL database...")

        # Chuẩn bị dữ liệu batch: list of (vector_string, id)
        n_users = min(len(self.idx_to_user), user_factors.shape[0])
        user_data = [
            (format_pgvector(user_factors[i]), self.idx_to_user[i])
            for i in range(n_users)
        ]

        n_songs = min(len(self.idx_to_song), song_factors.shape[0])
        song_data = [
            (format_pgvector(song_factors[i]), self.idx_to_song[i])
            for i in range(n_songs)
        ]

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Batch update tất cả User Collaborative Vectors chỉ trong 1 query
                if user_data:
                    execute_values(
                        cur,
                        'UPDATE "User" SET "collaborativeVector" = data.v::vector '
                        'FROM (VALUES %s) AS data(v, id) WHERE "User".id = data.id::int',
                        user_data,
                        page_size=500
                    )
                    logger.info(f"✅ Batch updated {n_users} User Collaborative Vectors.")

                # Batch update tất cả Song Collaborative Vectors chỉ trong 1 query
                if song_data:
                    execute_values(
                        cur,
                        'UPDATE "Song" SET "collaborativeVector" = data.v::vector '
                        'FROM (VALUES %s) AS data(v, id) WHERE "Song".id = data.id::int',
                        song_data,
                        page_size=500
                    )
                    logger.info(f"✅ Batch updated {n_songs} Song Collaborative Vectors.")

        logger.info("✅ Successfully updated all Collaborative Vectors in DB.")

    def train_pipeline(self):
        """
        Executes the full pipeline: fetches data, trains model, and updates the database.
        """
        df_interactions, user_ids, song_ids = self.fetch_interactions_and_metadata()
        
        if df_interactions.empty or len(user_ids) == 0 or len(song_ids) == 0:
            logger.warning("⚠️ Insufficient database records to train ALS Collaborative Filtering.")
            return False
            
        user_item_matrix = self.build_interaction_matrix(df_interactions, user_ids, song_ids)
        if user_item_matrix is None:
            logger.warning("⚠️ Interaction matrix is empty after building. Aborting ALS training.")
            return False
            
        self.fit(user_item_matrix)
        self.save_vectors_to_db()
        return True
