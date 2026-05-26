import logging
from app.database import get_db_connection

logger = logging.getLogger(__name__)

def get_recommendations_for_user(user_id: int, limit: int = 10):
    """
    Fetch personalized hybrid recommendations using PostgreSQL pgvector cosine similarity.
    Calculates colab_score (Collaborative vector similarity) and content_score (Content vector similarity).
    Combined score: 0.7 * colab_score + 0.3 * content_score.
    Filters out songs the user has listened to recently (e.g. within the last 7 days).
    If user is a cold-start (no vectors), returns popular tracks as a fallback.
    """
    logger.info(f"Generating hybrid pgvector recommendations for user {user_id}...")
    
    # 1. First, check if the user exists and has a contentVector or collaborativeVector
    check_query = 'SELECT "collaborativeVector", "contentVector" FROM "User" WHERE id = %s AND "isActive" = true'
    user_has_vectors = False
    
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(check_query, (user_id,))
            row = cur.fetchone()
            if row and (row[0] is not None or row[1] is not None):
                user_has_vectors = True

    if not user_has_vectors:
        logger.info(f"User {user_id} is a Cold Start. Returning trending popular songs.")
        # Fallback to popular songs (excluding Mock Artists)
        fallback_query = """
            SELECT id, title, "artistName", "audioUrl", "coverArtUrl", "playCount",
                   0.0 as score, 'trending' as method
            FROM "Song"
            WHERE "isDeleted" = false AND status = 'approved'
              AND "artistName" NOT ILIKE '%%mock%%'
            ORDER BY "playCount" DESC, "createdAt" DESC
            LIMIT %s
        """
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor if hasattr(psycopg2, 'extras') else None) as cur:
                # Fallback standard cursor mapping if extras is not present
                cur.execute(fallback_query, (limit,))
                columns = [desc[0] for desc in cur.description]
                results = []
                for row in cur.fetchall():
                    results.append(dict(zip(columns, row)))
                return results

    # 2. User has vectors. Run the hybrid pgvector SQL similarity query
    recommend_query = """
        SELECT s.id, s.title, s."artistName", s."audioUrl", s."coverArtUrl", s."playCount",
               (COALESCE(
                   0.7 * (CASE WHEN u."collaborativeVector" IS NOT NULL AND s."collaborativeVector" IS NOT NULL 
                               THEN (1 - (u."collaborativeVector" <=> s."collaborativeVector")) 
                               ELSE 0.0 END) +
                   0.3 * (CASE WHEN u."contentVector" IS NOT NULL AND s."contentVector" IS NOT NULL 
                               THEN (1 - (u."contentVector" <=> s."contentVector")) 
                               ELSE 0.0 END),
                   0.0
               ) * (CASE WHEN s."artistName" ILIKE '%%mock%%' THEN 0.05 ELSE 1.0 END)) AS score,
               'hybrid_pgvector' as method
        FROM "Song" s, "User" u
        WHERE u.id = %s AND s."isDeleted" = false AND s.status = 'approved'
        ORDER BY score DESC, s."playCount" DESC
        LIMIT %s
    """
    
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(recommend_query, (user_id, limit))
            columns = [desc[0] for desc in cur.description]
            results = []
            for row in cur.fetchall():
                results.append(dict(zip(columns, row)))
            return results

def get_similar_songs(song_id: int, limit: int = 10):
    """
    Fetch songs that are content-similar to the target song using pgvector cosine similarity.
    """
    logger.info(f"Finding similar songs to song {song_id} using content vectors...")
    
    similar_query = """
        SELECT target.id, target.title, target."artistName", target."audioUrl", target."coverArtUrl",
               (1 - (origin."contentVector" <=> target."contentVector")) as similarity_score
        FROM "Song" origin, "Song" target
        WHERE origin.id = %s AND target.id != %s 
          AND target."isDeleted" = false AND target.status = 'released'
          AND origin."contentVector" IS NOT NULL AND target."contentVector" IS NOT NULL
        ORDER BY similarity_score DESC, target."playCount" DESC
        LIMIT %s
    """
    
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(similar_query, (song_id, song_id, limit))
            columns = [desc[0] for desc in cur.description]
            results = []
            for row in cur.fetchall():
                results.append(dict(zip(columns, row)))
            return results
