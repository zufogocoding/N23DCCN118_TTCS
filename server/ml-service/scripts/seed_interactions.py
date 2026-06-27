import json
import logging
import math
import os
import random
from datetime import datetime, timedelta

import numpy as np
import psycopg2
from psycopg2.extras import execute_values
from app.database import get_db_connection

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────
# GENRE CLUSTERS (shared by mock + test data)
# ─────────────────────────────────────────────────────────────────────
GENRE_CLUSTERS = {
    "Pop": {
        "tags": ["Pop", "V-Pop", "K-Pop"],
        "features": {"tempo": 115, "energy": 0.68, "danceability": 0.72},
        "variance": {"tempo": 8, "energy": 0.07, "danceability": 0.07},
        "count": 100,
    },
    "Rock": {
        "tags": ["Rock", "Alternative", "Metal"],
        "features": {"tempo": 130, "energy": 0.88, "danceability": 0.48},
        "variance": {"tempo": 10, "energy": 0.06, "danceability": 0.06},
        "count": 100,
    },
    "Lofi": {
        "tags": ["Lo-fi", "Acoustic", "Indie"],
        "features": {"tempo": 72, "energy": 0.28, "danceability": 0.38},
        "variance": {"tempo": 6, "energy": 0.06, "danceability": 0.06},
        "count": 100,
    },
    "HipHop": {
        "tags": ["Hip-Hop", "Rap", "Rap Việt"],
        "features": {"tempo": 92, "energy": 0.72, "danceability": 0.82},
        "variance": {"tempo": 7, "energy": 0.06, "danceability": 0.06},
        "count": 100,
    },
    "EDM": {
        "tags": ["EDM", "House", "Trance"],
        "features": {"tempo": 128, "energy": 0.90, "danceability": 0.92},
        "variance": {"tempo": 5, "energy": 0.05, "danceability": 0.05},
        "count": 100,
    },
}

ALL_CLUSTER_NAMES = list(GENRE_CLUSTERS.keys())

# ─────────────────────────────────────────────────────────────────────
# MOCK DATA CONFIG
# ─────────────────────────────────────────────────────────────────────
PERSONAS = [
    {
        "name": "Pop",
        "count": 15,
        "genre_weights": {"Pop": 0.40, "Rock": 0.03, "Lofi": 0.12, "HipHop": 0.03, "EDM": 0.02},
        "ground_truth": [0.75, 0.05, 0.10, 0.05, 0.05],
        "completion_primary": (0.80, 1.0),
        "completion_secondary": (0.40, 0.70),
        "completion_other": (0.03, 0.20),
        "like_rate_primary": 0.35,
        "like_rate_other": 0.03,
        "skip_rate_primary": 0.05,
        "skip_rate_other": 0.65,
        "n_interactions": (130, 170),
    },
    {
        "name": "Rock",
        "count": 15,
        "genre_weights": {"Pop": 0.03, "Rock": 0.42, "Lofi": 0.03, "HipHop": 0.02, "EDM": 0.10},
        "ground_truth": [0.05, 0.75, 0.05, 0.05, 0.10],
        "completion_primary": (0.75, 1.0),
        "completion_secondary": (0.40, 0.70),
        "completion_other": (0.03, 0.20),
        "like_rate_primary": 0.35,
        "like_rate_other": 0.03,
        "skip_rate_primary": 0.05,
        "skip_rate_other": 0.65,
        "n_interactions": (130, 170),
    },
    {
        "name": "Diverse",
        "count": 15,
        "genre_weights": {"Pop": 0.18, "Rock": 0.10, "Lofi": 0.18, "HipHop": 0.18, "EDM": 0.06},
        "ground_truth": [0.25, 0.15, 0.25, 0.25, 0.10],
        "completion_primary": (0.70, 0.95),
        "completion_secondary": (0.50, 0.80),
        "completion_other": (0.05, 0.25),
        "like_rate_primary": 0.30,
        "like_rate_other": 0.05,
        "skip_rate_primary": 0.08,
        "skip_rate_other": 0.50,
        "n_interactions": (140, 180),
    },
    {
        "name": "Explorer",
        "count": 5,
        "genre_weights": {"Pop": 0.10, "Rock": 0.10, "Lofi": 0.10, "HipHop": 0.10, "EDM": 0.10},
        "ground_truth": [0.20, 0.20, 0.20, 0.20, 0.20],
        "completion_primary": (0.30, 0.60),
        "completion_secondary": (0.20, 0.50),
        "completion_other": (0.05, 0.25),
        "like_rate_primary": 0.10,
        "like_rate_other": 0.02,
        "skip_rate_primary": 0.30,
        "skip_rate_other": 0.60,
        "n_interactions": (100, 140),
    },
]

SONG_PREFIXES = {
    "Pop":    ["Anh Sáng", "Yêu Xa", "Nhớ Mãi", "Cô Ấy", "Nụ Cười", "Đêm Nay", "Shine On", "Dancing Stars", "Dream Pop", "Neon Lights"],
    "Rock":   ["Bức Tường", "Tiếng Sét", "Đêm Tối", "Chiến Binh", "Lửa Cháy", "Vỡ Tan", "Gào Thét", "Storm Rising", "Electric Storm", "Metal Heart"],
    "Lofi":  ["Cà Phê", "Mưa Rơi", "Chiều Tà", "Góc Nhỏ", "Yên Bình", "Ngủ Quên", "Giọt Sương", "Nhẹ Nhàng", "Cozy Corner", "Gentle Flow"],
    "HipHop": ["Đường Phố", "Lời Rap", "Nhịp Đập", "Mic Drop", "Street Life", "Bars & Beats", "Flow State", "Real Talk", "Trap King", "City Vibes"],
    "EDM":    ["Siêu Năng Lượng", "Vũ Trụ", "Nổ Tung", "Điện Tử", "Bass Drop", "Rave Nation", "Pulse", "Frequency", "Drop Zone", "Voltage"],
}

# ─────────────────────────────────────────────────────────────────────
# TEST DATA CONFIG — 120 songs (24/cluster), 5 users
# ─────────────────────────────────────────────────────────────────────
TEST_CLUSTER_COUNT = 24

TEST_SONG_TITLES = {
    "Pop":    ['Ánh Sáng Mùa Hè', 'Yêu Xa', 'Nhớ Mãi', 'Cô Ấy', 'Nụ Cười', 'Đêm Nay', 'Thế Giới', 'Tình Yêu',
               'Mùa Thu', 'Nắng Sớm', 'Giấc Mơ', 'Bầu Trời', 'Hoa Hướng Dương', 'Câu Chuyện', 'Kí Ức', 'Gặp Gỡ',
               'Heartbeat', 'Shine On', 'Dancing Stars', 'Dream Pop', 'Candy Love', 'Summer Hits', 'Neon Lights', 'Pop Anthem'],
    "Rock":   ['Bức Tường Đá', 'Tiếng Sét', 'Đêm Tối', 'Chiến Binh', 'Lửa Cháy', 'Vỡ Tan', 'Gào Thét', 'Nổi Loạn',
               'Rage Machine', 'Iron Will', 'Storm Rising', 'Broken Glass', 'Electric Storm', 'Dead Zone', 'Rock Solid', 'Fist Fight',
               'Scream Out', 'Metal Heart', 'Rock Bottom', 'Power Surge', 'Shockwave', 'Thunder Road', 'Punk Spirit', 'Hard Line'],
    "Lofi":  ['Cà Phê Sáng', 'Mưa Rơi', 'Chiều Tà', 'Góc Nhỏ', 'Yên Bình', 'Ngủ Quên', 'Giọt Sương', 'Nhẹ Nhàng',
               'Study Beats', 'Rainy Day', 'Cozy Corner', 'Soft Glow', 'Gentle Flow', 'Slow Morning', 'Calm Waters', 'Night Haze',
               'Lo-fi Dreams', 'Chill Vibes', 'Quiet Hours', 'Fade Away', 'Warmth', 'Dusk Beats', 'Mellow Notes', 'Sleepy Town'],
    "HipHop": ['Đường Phố', 'Lời Rap', 'Nhịp Đập', 'Mic Drop', 'Street Life', 'Bars & Beats', 'Flow State', 'Real Talk',
               'Freestyle', 'Block Party', 'Hustle Hard', 'Trap King', 'City Vibes', 'Underground', 'King Pin', 'Raw Energy',
               'Money Moves', 'No Cap', 'Lit AF', 'Big Drip', 'Grind Mode', 'Hood Rich', 'Street Cred', 'Rap God'],
    "EDM":    ['Siêu Năng Lượng', 'Vũ Trụ', 'Nổ Tung', 'Điện Tử', 'Bass Drop', 'Rave Nation', 'Pulse', 'Frequency',
               'Drop Zone', 'Voltage', 'Circuit Breaker', 'Warp Drive', 'Laser Show', 'Digital Rush', 'Synth Wave', 'Apex',
               'Core Drop', 'Ultra Rave', 'Power Plant', 'Techno Surge', 'House Music', 'Trance State', 'Festival Banger', 'Club Anthem'],
}

TEST_USERS = [
    {"username": "TEST_user_pop_fan",    "email": "test.pop.fan@soundwave.test",  "displayName": "[TEST] Pop Fan",       "profile": "Pop",     "likeGenres": ["Pop"],              "skipGenres": ["Metal", "EDM"],      "listenCount": 70,  "likeCount": 25},
    {"username": "TEST_user_rock_fan",   "email": "test.rock.fan@soundwave.test", "displayName": "[TEST] Rock Fan",      "profile": "Rock",    "likeGenres": ["Rock"],             "skipGenres": ["Lo-fi", "K-Pop"],    "listenCount": 70,  "likeCount": 25},
    {"username": "TEST_user_lofi_fan",   "email": "test.lofi.fan@soundwave.test", "displayName": "[TEST] Lo-fi Fan",     "profile": "Lofi",    "likeGenres": ["Lo-fi", "Acoustic"],"skipGenres": ["Metal", "Trance"],   "listenCount": 70,  "likeCount": 25},
    {"username": "TEST_user_diverse",    "email": "test.diverse@soundwave.test",  "displayName": "[TEST] Diverse Listener", "profile": "Diverse","likeGenres": ["Pop", "Hip-Hop", "Lo-fi"],"skipGenres": [],     "listenCount": 60,  "likeCount": 30},
    {"username": "TEST_user_cold_start", "email": "test.cold.start@soundwave.test","displayName": "[TEST] Cold Start User","profile": "ColdStart","likeGenres": [], "skipGenres": [],            "listenCount": 0,   "likeCount": 0},
]

CLUSTER_GENRE_MAP = {
    "Pop":    ["Pop", "V-Pop", "K-Pop"],
    "Rock":   ["Rock", "Alternative", "Metal"],
    "Lofi":   ["Lo-fi", "Acoustic", "Indie"],
    "HipHop": ["Hip-Hop", "Rap", "Rap Việt"],
    "EDM":    ["EDM", "House", "Trance"],
}

# ─────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────
def rand_float(base, variance, clamp_01=True):
    v = (random.random() * 2 - 1) * variance
    val = base + v
    return max(0.0, min(1.0, val)) if clamp_01 else val

def rand_int(base, variance):
    return base + random.randint(-variance, variance)

def pick(arr):
    return random.choice(arr)

def pick_n(arr, n):
    return random.sample(arr, min(n, len(arr)))

def weighted_sample(weights_dict):
    items = list(weights_dict.keys())
    weights = list(weights_dict.values())
    total = sum(weights)
    if total == 0:
        return random.choice(items)
    r = random.random() * total
    cumulative = 0
    for item, w in zip(items, weights):
        cumulative += w
        if r <= cumulative:
            return item
    return items[-1]

# ─────────────────────────────────────────────────────────────────────
# DATABASE: CLEANUP — removes both mock_ and TEST_ data
# ─────────────────────────────────────────────────────────────────────
def clean_old_data(cur):
    logger.info("Cleaning old mock + test data...")
    for table_sql in [
        'DELETE FROM "Interaction" WHERE "userId" IN (SELECT id FROM "User" WHERE email LIKE \'mock_%%@soundclown.com\' OR email LIKE \'%@soundwave.test\')',
        'DELETE FROM "SongLike" WHERE "userId" IN (SELECT id FROM "User" WHERE email LIKE \'mock_%%@soundclown.com\' OR email LIKE \'%@soundwave.test\')',
        'DELETE FROM "SongGenre" WHERE "songId" IN (SELECT id FROM "Song" WHERE "artistName" LIKE \'Mock_%%\' OR "artistName" LIKE \'TEST_%%\')',
        'DELETE FROM "Song" WHERE "artistName" LIKE \'Mock_%%\' OR "artistName" LIKE \'TEST_%%\'',
        'DELETE FROM "User" WHERE email LIKE \'mock_%%@soundclown.com\' OR email LIKE \'%@soundwave.test\'',
    ]:
        cur.execute(table_sql)
    logger.info("Old data cleaned.")

def ensure_genres(cur):
    logger.info("Ensuring genres exist...")
    all_tags = set()
    for cluster in GENRE_CLUSTERS.values():
        for tag in cluster["tags"]:
            all_tags.add(tag)
    genre_map = {}
    for tag in sorted(all_tags):
        cur.execute('SELECT id FROM "Genre" WHERE "genreTag" = %s', (tag,))
        row = cur.fetchone()
        if row:
            genre_map[tag] = row[0]
        else:
            cur.execute('INSERT INTO "Genre" ("genreTag") VALUES (%s) RETURNING id', (tag,))
            genre_map[tag] = cur.fetchone()[0]
    logger.info(f"{len(genre_map)} genres ready.")
    return genre_map

# ─────────────────────────────────────────────────────────────────────
# MOCK DATA: 500 songs, 50 users
# ─────────────────────────────────────────────────────────────────────
def create_mock_songs(cur, genre_map):
    n_total = sum(c["count"] for c in GENRE_CLUSTERS.values())
    logger.info(f"Creating {n_total} mock songs...")
    songs_by_cluster = {name: [] for name in ALL_CLUSTER_NAMES}
    for cluster_name, cluster in GENRE_CLUSTERS.items():
        prefixes = SONG_PREFIXES[cluster_name]
        for i in range(cluster["count"]):
            base = prefixes[i % len(prefixes)]
            variant = i // len(prefixes)
            title = base if variant == 0 else f"{base} #{variant + 1}"
            tempo = rand_float(cluster["features"]["tempo"], cluster["variance"]["tempo"], clamp_01=False)
            energy = rand_float(cluster["features"]["energy"], cluster["variance"]["energy"])
            danceability = rand_float(cluster["features"]["danceability"], cluster["variance"]["danceability"])
            artist = f"Mock_{cluster_name}_Artist_{random.randint(1, 5)}"
            audio_url = f"mock_audio_{cluster_name.lower()}_{i + 1}.mp3"
            duration = random.randint(180000, 300000)
            cur.execute(
                """
                INSERT INTO "Song" (title, "artistName", "audioUrl", "durationMs", tempo, energy, danceability, status, "isDeleted", "playCount")
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'approved', false, 0)
                RETURNING id
                """,
                (title, artist, audio_url, duration, tempo, energy, danceability),
            )
            song_id = cur.fetchone()[0]
            songs_by_cluster[cluster_name].append(song_id)
            primary_tag = pick(cluster["tags"])
            cur.execute(
                'INSERT INTO "SongGenre" ("songId", "genreId") VALUES (%s, %s) ON CONFLICT DO NOTHING',
                (song_id, genre_map[primary_tag]),
            )
            if random.random() < 0.4:
                secondary_tag = cluster["tags"][0] if cluster["tags"][0] != primary_tag else cluster["tags"][-1]
                if secondary_tag in genre_map:
                    cur.execute(
                        'INSERT INTO "SongGenre" ("songId", "genreId") VALUES (%s, %s) ON CONFLICT DO NOTHING',
                        (song_id, genre_map[secondary_tag]),
                    )
    logger.info(f"Created {sum(len(v) for v in songs_by_cluster.values())} mock songs.")
    return songs_by_cluster

def create_mock_users(cur):
    logger.info("Creating 50 mock users with personas...")
    dummy_hash = "$2b$10$R2MswwHjRoc67CbeQxXpReF9k7xV1y6eK/Qf/2Y5s4k2kHqE/J6yS"
    all_users = []
    user_idx = 0
    for persona in PERSONAS:
        for i in range(persona["count"]):
            user_idx += 1
            cur.execute(
                """
                INSERT INTO "User" (username, "displayName", email, password, "isActive", "isAdmin", role, "isVerified")
                VALUES (%s, %s, %s, %s, true, false, 'user', true)
                RETURNING id
                """,
                (f"mock_user_{user_idx}", f"Mock {persona['name']} {i + 1}", f"mock_user_{user_idx}@soundclown.com", dummy_hash),
            )
            uid = cur.fetchone()[0]
            all_users.append({"id": uid, "persona": persona["name"], "ground_truth": persona["ground_truth"]})
    logger.info(f"Created {len(all_users)} mock users.")
    return all_users

def generate_mock_interactions(cur, users, songs_by_cluster):
    logger.info("Generating mock persona-based interactions...")
    now = datetime.now()
    total_interactions = 0
    total_likes = 0
    cluster_songs = {name: songs_by_cluster[name] for name in ALL_CLUSTER_NAMES}

    persona_pools = {}
    for persona in PERSONAS:
        name = persona["name"]
        total_w = sum(persona["genre_weights"].values())
        pool = {}
        for genre, w in persona["genre_weights"].items():
            n = max(1, round(w / total_w * 30))
            n = min(n, len(cluster_songs[genre]))
            pool[genre] = cluster_songs[genre][:n]
        persona_pools[name] = pool

    def pick_song(genre, pool):
        if pool[genre] and random.random() < 0.70:
            return pick(pool[genre])
        return pick(cluster_songs[genre])

    primary_threshold = 0.15
    secondary_threshold = 0.06

    for user_info in users:
        persona_name = user_info["persona"]
        persona_cfg = next(p for p in PERSONAS if p["name"] == persona_name)
        weights = persona_cfg["genre_weights"]
        n_interactions = random.randint(*persona_cfg["n_interactions"])
        primary_genres = [g for g, w in weights.items() if w >= primary_threshold]
        secondary_genres = [g for g, w in weights.items() if secondary_threshold <= w < primary_threshold]
        pool_by_genre = persona_pools[persona_name]
        liked_song_ids = set()

        for _ in range(n_interactions):
            genre = weighted_sample(weights)
            is_primary = genre in primary_genres
            is_secondary = genre in secondary_genres
            song_id = pick_song(genre, pool_by_genre)

            if is_primary:
                completion_rate = random.uniform(*persona_cfg["completion_primary"])
                is_skipped = random.random() < persona_cfg["skip_rate_primary"]
                is_liked = random.random() < persona_cfg["like_rate_primary"]
            elif is_secondary:
                completion_rate = random.uniform(*persona_cfg["completion_secondary"])
                is_skipped = random.random() < (persona_cfg["skip_rate_primary"] + persona_cfg["skip_rate_other"]) / 2
                is_liked = random.random() < (persona_cfg["like_rate_primary"] + persona_cfg["like_rate_other"]) / 2
            else:
                completion_rate = random.uniform(*persona_cfg["completion_other"])
                is_skipped = random.random() < persona_cfg["skip_rate_other"]
                is_liked = random.random() < persona_cfg["like_rate_other"]

            if is_skipped and completion_rate > 0.3:
                completion_rate = random.uniform(0.03, 0.25)
            if is_liked:
                completion_rate = max(completion_rate, 0.7)
            duration_played = int(240000 * completion_rate)
            days_ago = int(random.betavariate(2, 5) * 60)
            time_stamp = now - timedelta(days=days_ago, hours=random.randint(0, 23))

            cur.execute(
                """
                INSERT INTO "Interaction" ("userId", "songId", "timeStamp", "completionRate", "isLiked", "isSkipped", "durationPlayed")
                VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT DO NOTHING
                """,
                (user_info["id"], song_id, time_stamp, completion_rate, is_liked, is_skipped, duration_played),
            )
            total_interactions += 1

            if is_liked:
                liked_song_ids.add(song_id)
            if not is_skipped and completion_rate >= 0.50:
                cur.execute('UPDATE "Song" SET "playCount" = "playCount" + 1 WHERE id = %s', (song_id,))

        for song_id in liked_song_ids:
            try:
                cur.execute(
                    'INSERT INTO "SongLike" ("userId", "songId") VALUES (%s, %s) ON CONFLICT DO NOTHING',
                    (user_info["id"], song_id),
                )
                total_likes += 1
            except Exception:
                pass

    logger.info(f"Generated {total_interactions} mock interactions, {total_likes} likes.")

# ─────────────────────────────────────────────────────────────────────
# TEST DATA: 120 songs, 5 users
# ─────────────────────────────────────────────────────────────────────
def create_test_songs(cur, genre_map):
    logger.info(f"Creating 120 test songs (24/cluster)...")
    test_songs = {name: [] for name in ALL_CLUSTER_NAMES}
    for cluster_name, cluster in GENRE_CLUSTERS.items():
        titles = TEST_SONG_TITLES[cluster_name]
        for i in range(TEST_CLUSTER_COUNT):
            title = f"TEST_{titles[i]}"
            tempo = rand_float(cluster["features"]["tempo"], cluster["variance"]["tempo"], clamp_01=False)
            energy = rand_float(cluster["features"]["energy"], cluster["variance"]["energy"])
            danceability = rand_float(cluster["features"]["danceability"], cluster["variance"]["danceability"])
            artist = f"TEST_Artist_{cluster_name}"
            audio_url = f"/uploads/audio/test_{cluster_name.lower()}_{i + 1}.mp3"
            duration = random.randint(180000, 300000)
            cur.execute(
                """
                INSERT INTO "Song" (title, "artistName", "audioUrl", "durationMs", tempo, energy, danceability, status, "isDeleted", "playCount")
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'approved', false, 0)
                RETURNING id
                """,
                (title, artist, audio_url, duration, tempo, energy, danceability),
            )
            song_id = cur.fetchone()[0]
            test_songs[cluster_name].append(song_id)
            primary_tag = pick(cluster["tags"])
            cur.execute(
                'INSERT INTO "SongGenre" ("songId", "genreId") VALUES (%s, %s) ON CONFLICT DO NOTHING',
                (song_id, genre_map[primary_tag]),
            )
            if random.random() < 0.4:
                secondary_tag = cluster["tags"][0] if cluster["tags"][0] != primary_tag else cluster["tags"][-1]
                if secondary_tag in genre_map:
                    cur.execute(
                        'INSERT INTO "SongGenre" ("songId", "genreId") VALUES (%s, %s) ON CONFLICT DO NOTHING',
                        (song_id, genre_map[secondary_tag]),
                    )
    count = sum(len(v) for v in test_songs.values())
    logger.info(f"Created {count} test songs.")
    return test_songs

def create_test_users(cur):
    logger.info("Creating 5 test users...")
    dummy_hash = "$2b$10$R2MswwHjRoc67CbeQxXpReF9k7xV1y6eK/Qf/2Y5s4k2kHqE/J6yS"
    created = []
    for u in TEST_USERS:
        cur.execute(
            """
            INSERT INTO "User" (username, "displayName", email, password, "isActive", "isAdmin", role, "isVerified")
            VALUES (%s, %s, %s, %s, true, false, 'user', true)
            RETURNING id
            """,
            (u["username"], u["displayName"], u["email"], dummy_hash),
        )
        user_id = cur.fetchone()[0]
        created.append({"id": user_id, "config": u})
    logger.info(f"Created {len(created)} test users.")
    return created

def generate_test_interactions(cur, test_users, test_songs):
    logger.info("Generating test interactions...")
    now = datetime.now()
    total_interactions = 0
    total_likes = 0

    for user_rec in test_users:
        cfg = user_rec["config"]
        profile = cfg["profile"]
        if profile == "ColdStart":
            continue

        preferred_cluster = profile if profile != "Diverse" else None
        preferred_songs = []
        other_songs = []

        for cluster, ids in test_songs.items():
            if preferred_cluster and cluster == preferred_cluster:
                preferred_songs.extend(ids)
            elif profile == "Diverse":
                preferred_songs.extend(ids)
            else:
                other_songs.extend(ids)

        preferred_listens = int(cfg["listenCount"] * 0.75)
        selected_preferred = pick_n(preferred_songs, preferred_listens)
        liked_ids = set()

        for song_id in selected_preferred:
            days_ago = random.randint(0, 29)
            ts = now - timedelta(days=days_ago, hours=random.randint(0, 23))
            completion_rate = round(0.7 + random.random() * 0.3, 3)
            cur.execute(
                """
                INSERT INTO "Interaction" ("userId", "songId", "timeStamp", "completionRate", "isLiked", "isSkipped", "durationPlayed")
                VALUES (%s, %s, %s, %s, false, false, %s) ON CONFLICT DO NOTHING
                """,
                (user_rec["id"], song_id, ts, completion_rate, int(200000 * completion_rate)),
            )
            total_interactions += 1

        to_like = pick_n(selected_preferred, cfg["likeCount"])
        for song_id in to_like:
            if song_id not in liked_ids:
                liked_ids.add(song_id)
                cur.execute(
                    'INSERT INTO "SongLike" ("userId", "songId") VALUES (%s, %s) ON CONFLICT DO NOTHING',
                    (user_rec["id"], song_id),
                )
                total_likes += 1

        other_listens = cfg["listenCount"] - preferred_listens
        if other_songs and other_listens > 0:
            selected_other = pick_n(other_songs, other_listens)
            for song_id in selected_other:
                days_ago = random.randint(0, 29)
                ts = now - timedelta(days=days_ago, hours=random.randint(0, 23))
                completion_rate = round(0.05 + random.random() * 0.2, 3)
                cur.execute(
                    """
                    INSERT INTO "Interaction" ("userId", "songId", "timeStamp", "completionRate", "isLiked", "isSkipped", "durationPlayed")
                    VALUES (%s, %s, %s, %s, false, true, %s) ON CONFLICT DO NOTHING
                    """,
                    (user_rec["id"], song_id, ts, completion_rate, int(200000 * completion_rate)),
                )
                total_interactions += 1

    logger.info(f"Generated {total_interactions} test interactions, {total_likes} likes.")

# ─────────────────────────────────────────────────────────────────────
# SAVE METADATA
# ─────────────────────────────────────────────────────────────────────
def save_ground_truth_metadata(users, songs_by_cluster):
    metadata = {
        "generated_at": datetime.now().isoformat(),
        "n_users": len(users),
        "n_songs": sum(len(v) for v in songs_by_cluster.values()),
        "cluster_features": {
            name: {
                "tempo": GENRE_CLUSTERS[name]["features"]["tempo"],
                "energy": GENRE_CLUSTERS[name]["features"]["energy"],
                "danceability": GENRE_CLUSTERS[name]["features"]["danceability"],
            }
            for name in ALL_CLUSTER_NAMES
        },
        "user_groups": {},
        "user_preferences": {},
        "song_clusters": {name: [] for name in ALL_CLUSTER_NAMES},
    }
    for name in ALL_CLUSTER_NAMES:
        metadata["song_clusters"][name] = songs_by_cluster[name]
    groups = {}
    for u in users:
        persona = u["persona"]
        if persona not in groups:
            groups[persona] = []
        groups[persona].append(u["id"])
        metadata["user_preferences"][str(u["id"])] = {
            "group": persona,
            "distribution": u["ground_truth"],
        }
    metadata["user_groups"] = groups

    out_path = os.path.join(os.path.dirname(__file__), "..", "ground_truth.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"Ground truth metadata → {out_path}")

def save_test_metadata(test_users, test_songs, genre_map):
    metadata = {
        "generatedAt": datetime.now().isoformat(),
        "testUsers": [
            {
                "id": u["id"],
                "username": u["config"]["username"],
                "displayName": u["config"]["displayName"],
                "profile": u["config"]["profile"],
                "config": {
                    "listenCount": u["config"]["listenCount"],
                    "likeCount": u["config"]["likeCount"],
                    "likeGenres": u["config"]["likeGenres"],
                    "skipGenres": u["config"]["skipGenres"],
                },
            }
            for u in test_users
        ],
        "songClusters": {name: ids for name, ids in test_songs.items()},
        "genreMap": genre_map,
        "clusterFeatures": {
            name: {
                "tempo": GENRE_CLUSTERS[name]["features"]["tempo"],
                "energy": GENRE_CLUSTERS[name]["features"]["energy"],
                "danceability": GENRE_CLUSTERS[name]["features"]["danceability"],
            }
            for name in ALL_CLUSTER_NAMES
        },
        "totalSongs": sum(len(v) for v in test_songs.values()),
    }
    tests_dir = os.path.join(os.path.dirname(__file__), "..", "..", "tests")
    os.makedirs(tests_dir, exist_ok=True)
    out_path = os.path.join(tests_dir, "ai-test-metadata.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"Test metadata → {out_path}")

# ─────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────
def run_seed():
    logger.info("=" * 50)
    logger.info("SEEDING FULL CONTROLLED DATASET")
    logger.info("= MOCK: 500 songs, 50 users")
    logger.info("= TEST: 120 songs,  5 users")
    logger.info("=" * 50)

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            clean_old_data(cur)
            genre_map = ensure_genres(cur)

            mock_songs = create_mock_songs(cur, genre_map)
            mock_users = create_mock_users(cur)
            generate_mock_interactions(cur, mock_users, mock_songs)

            test_songs = create_test_songs(cur, genre_map)
            test_users = create_test_users(cur)
            generate_test_interactions(cur, test_users, test_songs)

            cur.execute('UPDATE "User" SET "collaborativeVector" = NULL WHERE email LIKE \'mock_%%@soundclown.com\' OR email LIKE \'%%@soundwave.test\'')
            cur.execute('UPDATE "Song" SET "collaborativeVector" = NULL')

    save_ground_truth_metadata(mock_users, mock_songs)
    save_test_metadata(test_users, test_songs, genre_map)

    total_songs = sum(len(v) for v in mock_songs.values()) + sum(len(v) for v in test_songs.values())
    total_users = len(mock_users) + len(test_users)
    logger.info("=" * 50)
    logger.info("SEEDING COMPLETED")
    logger.info(f"Total users: {total_users} ({len(mock_users)} mock + {len(test_users)} test)")
    logger.info(f"Total songs: {total_songs} ({sum(len(v) for v in mock_songs.values())} mock + {sum(len(v) for v in test_songs.values())} test)")
    logger.info("=" * 50)

if __name__ == "__main__":
    run_seed()
