import logging
from app.database import get_db_connection

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def clean():
    logger.info("Cleaning mock seed data...")
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute('DELETE FROM "Interaction" WHERE "userId" IN (SELECT id FROM "User" WHERE email LIKE \'mock_user_%@soundclown.com\')')
            logger.info("Deleted mock interactions.")
            cur.execute('DELETE FROM "SongGenre" WHERE "songId" IN (SELECT id FROM "Song" WHERE "audioUrl" LIKE \'mock_audio_%\')')
            cur.execute('DELETE FROM "Song" WHERE "audioUrl" LIKE \'mock_audio_%\'')
            logger.info("Deleted mock songs.")
            cur.execute('DELETE FROM "User" WHERE email LIKE \'mock_user_%@soundclown.com\'')
            logger.info("Deleted mock users.")
    logger.info("Done! All mock seed data has been removed.")

if __name__ == "__main__":
    clean()
