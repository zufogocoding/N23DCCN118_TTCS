import logging
from contextlib import contextmanager
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from app.config import DATABASE_URL

logger = logging.getLogger(__name__)

# Initialize connection pool
_pool = None

def init_db_pool():
    global _pool
    if _pool is None:
        try:
            logger.info("Initializing PostgreSQL Connection Pool...")
            # SimpleConnectionPool: minconn=1, maxconn=10
            # Stripping the ?schema=public if present as psycopg2 connection string parses standard URIs
            conn_str = DATABASE_URL.split("?")[0]
            _pool = SimpleConnectionPool(1, 10, conn_str)
            logger.info("✅ Connection Pool initialized successfully.")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Connection Pool: {e}")
            raise e

def close_db_pool():
    global _pool
    if _pool is not None:
        logger.info("Closing PostgreSQL Connection Pool...")
        _pool.closeall()
        _pool = None
        logger.info("✅ Connection Pool closed.")

@contextmanager
def get_db_connection():
    """
    Context manager to safely get and return a connection to the pool.
    Usage:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(...)
    """
    global _pool
    if _pool is None:
        init_db_pool()
        
    conn = None
    try:
        conn = _pool.getconn()
        yield conn
        conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Database error: {e}")
        raise e
    finally:
        if conn and _pool:
            _pool.putconn(conn)
