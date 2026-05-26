import logging
import random
from datetime import datetime, timedelta
import numpy as np
import psycopg2
from app.database import get_db_connection

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Constants for Mock Data
GENRES = ["Lo-Fi", "EDM", "Pop", "Rock"]
N_USERS = 50
N_SONGS_PER_GENRE = 30

def create_genres_if_needed(cur):
    """
    Ensure the standard testing genres exist in DB and return their IDs.
    """
    logger.info("Ensuring target Genres exist...")
    genre_ids = {}
    for tag in GENRES:
        cur.execute('SELECT id FROM "Genre" WHERE "genreTag" = %s', (tag,))
        row = cur.fetchone()
        if row:
            genre_ids[tag] = row[0]
        else:
            cur.execute('INSERT INTO "Genre" ("genreTag") VALUES (%s) RETURNING id', (tag,))
            genre_ids[tag] = cur.fetchone()[0]
    return genre_ids

def clean_old_mock_data(cur):
    """
    Clean old mock interactions, users, and songs to prevent duplicates and keep a pristine dataset.
    """
    logger.info("Cleaning old mock seed data from Database...")
    # Delete mock interactions
    cur.execute('DELETE FROM "Interaction" WHERE "userId" IN (SELECT id FROM "User" WHERE email LIKE \'mock_user_%%@soundclown.com\')')
    # Delete mock song genres
    cur.execute('DELETE FROM "SongGenre" WHERE "songId" IN (SELECT id FROM "Song" WHERE "audioUrl" LIKE \'mock_audio_%%\')')
    # Delete mock songs
    cur.execute('DELETE FROM "Song" WHERE "audioUrl" LIKE \'mock_audio_%%\'')
    # Delete mock users
    cur.execute('DELETE FROM "User" WHERE email LIKE \'mock_user_%%@soundclown.com\'')
    logger.info("✅ Database cleaned successfully.")

def insert_mock_songs(cur, genre_ids):
    """
    Inserts mock songs with technical audio properties aligned to their genre.
    """
    logger.info("Inserting mock Songs with high-fidelity audio attributes...")
    song_ids_by_genre = {tag: [] for tag in GENRES}
    
    # Simple descriptions and titles
    titles = {
        "Lo-Fi": ["Chill Rain", "Midnight Coffee", "Sleepless Night", "Study Session", "Soft Blanket", "Retro Lounge", "Cozy Corner", "Jazz Hop", "Vintage Piano", "Dreamy Clouds"],
        "EDM": ["Beat Drop", "Neon Cyber", "Laser Glow", "Bass Boost", "Pulse Wave", "Arena Rave", "Synth Shift", "Strobe Speed", "Electricity", "Velocity"],
        "Pop": ["Summer Dance", "Broken Heart", "Party Night", "Sweet Talk", "Hold On", "Forever Young", "Kiss Me", "Radio Wave", "Bright Sun", "Lost in Love"],
        "Rock": ["Heavy Metal", "Thunder Riff", "Screaming Guitar", "Anarchy", "Iron Core", "Stage Dive", "Hard Rocker", "Rebellion", "Electric Fire", "Black Abyss"]
    }
    
    for tag in GENRES:
        for i in range(N_SONGS_PER_GENRE):
            title = f"{random.choice(titles[tag])} {i+1}"
            artist = f"Mock {tag} Artist {random.randint(1, 5)}"
            audio_url = f"mock_audio_{tag.lower()}_{i+1}.mp3"
            duration = random.randint(120000, 300000) # 2-5 minutes in ms
            
            # Setup realistic DSP features for each genre
            if tag == "Lo-Fi":
                tempo = float(random.randint(60, 85))          # Low BPM
                energy = float(random.uniform(0.1, 0.35))      # Low energy
                danceability = float(random.uniform(0.2, 0.5))  # Mellow rhythm
            elif tag == "EDM":
                tempo = float(random.randint(120, 140))        # High BPM
                energy = float(random.uniform(0.8, 1.0))       # Max energy
                danceability = float(random.uniform(0.75, 1.0)) # Danceable beat
            elif tag == "Pop":
                tempo = float(random.randint(90, 115))         # Medium BPM
                energy = float(random.uniform(0.5, 0.75))      # Medium-high energy
                danceability = float(random.uniform(0.6, 0.85))# Catchy rhythm
            elif tag == "Rock":
                tempo = float(random.randint(110, 135))        # High BPM
                energy = float(random.uniform(0.7, 0.95))      # Aggressive energy
                danceability = float(random.uniform(0.3, 0.6))  # Dynamic/unrhythmic
                
            cur.execute(
                """
                INSERT INTO "Song" (title, "artistName", "audioUrl", "durationMs", tempo, energy, danceability, status, "isDeleted", "playCount")
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'approved', false, 0)
                RETURNING id
                """,
                (title, artist, audio_url, duration, tempo, energy, danceability)
            )
            song_id = cur.fetchone()[0]
            song_ids_by_genre[tag].append(song_id)
            
            # Assign Genre relation
            cur.execute(
                'INSERT INTO "SongGenre" ("songId", "genreId") VALUES (%s, %s)',
                (song_id, genre_ids[tag])
            )
            
    logger.info(f"✅ Successfully inserted {N_SONGS_PER_GENRE * len(GENRES)} mock Songs.")
    return song_ids_by_genre

def insert_mock_users(cur):
    """
    Inserts 50 mock users.
    """
    logger.info("Inserting mock Users...")
    user_ids = []
    
    # Generic bcrypt hash for "password123" to make it compatible
    dummy_pass_hash = "$2b$10$R2MswwHjRoc67CbeQxXpReF9k7xV1y6eK/Qf/2Y5s4k2kHqE/J6yS"
    
    for i in range(1, N_USERS + 1):
        username = f"mock_user_{i}"
        display_name = f"Mock Listener {i}"
        email = f"mock_user_{i}@soundclown.com"
        
        cur.execute(
            """
            INSERT INTO "User" (username, "displayName", email, password, "isActive", "isAdmin", role, "isVerified")
            VALUES (%s, %s, %s, %s, true, false, 'user', true)
            RETURNING id
            """,
            (username, display_name, email, dummy_pass_hash)
        )
        user_id = cur.fetchone()[0]
        user_ids.append(user_id)
        
    logger.info(f"✅ Successfully inserted {len(user_ids)} mock Users.")
    return user_ids

def generate_persona_interactions(cur, user_ids, song_ids_by_genre):
    """
    Generates over 5,000 interaction logs mapping to concrete user personas with controlled entropy.
    Personas:
    - User 1 - 15: Lo-Fi Lover (80% Lo-Fi, 15% Pop, 5% Random)
    - User 16 - 30: Gym Goer / EDM & Rock (40% EDM, 40% Rock, 15% Pop, 5% Random)
    - User 31 - 45: Pop Fan (80% Pop, 15% Lo-Fi, 5% Random)
    - User 46 - 50: Explorer (Fully Random - represents 10% pure stochastic noise)
    """
    logger.info("Generating simulated Persona-based Interaction dataset...")
    
    # Group all song IDs into a single list for random checks
    all_song_ids = []
    for sids in song_ids_by_genre.values():
        all_song_ids.extend(sids)

    # Pick 3 songs from each genre to be "Universal Hits" (universally popular songs)
    universal_hits = []
    for tag in GENRES:
        universal_hits.extend(random.sample(song_ids_by_genre[tag], 3))

    interaction_count = 0
    now = datetime.now()

    for idx, user_id in enumerate(user_ids):
        user_num = idx + 1
        
        # Assign primary / secondary tastes based on ID
        if user_num <= 15:
            # Lo-Fi Lover
            persona = "Lo-Fi"
            primary_genres = ["Lo-Fi"]
            secondary_genres = ["Pop"]
            hated_genres = ["EDM", "Rock"]
        elif user_num <= 30:
            # Gym Goer
            persona = "EDM/Rock"
            primary_genres = ["EDM", "Rock"]
            secondary_genres = ["Pop"]
            hated_genres = ["Lo-Fi"]
        elif user_num <= 45:
            # Pop Fan
            persona = "Pop"
            primary_genres = ["Pop"]
            secondary_genres = ["Lo-Fi"]
            hated_genres = ["Rock", "EDM"]
        else:
            # Random Explorer
            persona = "Explorer"
            primary_genres = GENRES
            secondary_genres = []
            hated_genres = []

        # Generate ~100 to ~150 interactions per user
        n_interactions = random.randint(100, 150)
        
        # Pre-select tracks they will interact with to simulate repeat listens
        # Real users repeat songs!
        primary_pool = []
        for pg in primary_genres:
            primary_pool.extend(song_ids_by_genre[pg])
        
        secondary_pool = []
        for sg in secondary_genres:
            secondary_pool.extend(song_ids_by_genre[sg])
            
        hated_pool = []
        for hg in hated_genres:
            hated_pool.extend(song_ids_by_genre[hg])
            
        # Select active listening pool
        listening_pool = random.sample(primary_pool, k=min(18, len(primary_pool)))
        if secondary_pool:
            listening_pool.extend(random.sample(secondary_pool, k=min(5, len(secondary_pool))))
        listening_pool.extend(universal_hits) # Everyone listens to hits!

        for _ in range(n_interactions):
            # Select song based on probability weight
            rand_val = random.random()
            
            if rand_val < 0.05 and hated_pool:
                # 5% chance to click a hated song (will likely result in a skip)
                song_id = random.choice(hated_pool)
                is_hated = True
            elif rand_val < 0.15 and secondary_pool:
                # 10% chance to hear a secondary genre song
                song_id = random.choice(listening_pool)
                is_hated = False
            else:
                # 80%+ chance to listen to primary pool / repeat lists
                song_id = random.choice(listening_pool)
                is_hated = False
                
            # Simulate listening behavior
            time_stamp = now - timedelta(days=random.randint(0, 30), hours=random.randint(0, 23), minutes=random.randint(0, 59))
            
            if is_hated:
                # Disliked song: high skip rate, low completion
                is_skipped = True
                is_liked = False
                completion_rate = float(random.uniform(0.01, 0.15))
                duration_played = int(240000 * completion_rate)
            else:
                # Liked/Interesting song:
                # Accidental skip or actual listen
                is_skipped = random.random() < 0.10  # 10% accidental skip rate
                
                if is_skipped:
                    is_liked = False
                    completion_rate = float(random.uniform(0.05, 0.40))
                    duration_played = int(240000 * completion_rate)
                else:
                    completion_rate = float(random.uniform(0.70, 1.0))  # high completion
                    # 30% chance to Like the song if they completed it
                    is_liked = random.random() < 0.35
                    duration_played = int(240000 * completion_rate)

            # Insert Interaction record
            cur.execute(
                """
                INSERT INTO "Interaction" ("userId", "songId", "timeStamp", "completionRate", "isLiked", "isSkipped", "durationPlayed")
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
                """,
                (user_id, song_id, time_stamp, completion_rate, is_liked, is_skipped, duration_played)
            )
            interaction_count += 1
            
            # Increment play count on Song
            if not is_skipped and completion_rate >= 0.5:
                cur.execute(
                    'UPDATE "Song" SET "playCount" = "playCount" + 1 WHERE id = %s',
                    (song_id,)
                )

    logger.info(f"✅ Successfully generated ~{interaction_count} high-fidelity interaction records!")

def run_seed():
    logger.info("=========================================")
    logger.info("🌱 SOUNDCLOWN RECOMMENDATION DATA SEEDER")
    logger.info("=========================================")
    
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # 1. Clean existing seed data
            clean_old_mock_data(cur)
            
            # 2. Get/Create Genres
            genre_ids = create_genres_if_needed(cur)
            
            # 3. Create mock songs
            song_ids_by_genre = insert_mock_songs(cur, genre_ids)
            
            # 4. Create mock users
            user_ids = insert_mock_users(cur)
            
            # 5. Populate persona interactions
            generate_persona_interactions(cur, user_ids, song_ids_by_genre)
            
    logger.info("=========================================")
    logger.info("🌱 DATA SEEDING COMPLETED SUCCESSFULY!")
    logger.info("=========================================")

if __name__ == "__main__":
    run_seed()
