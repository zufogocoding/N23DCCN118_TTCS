"""
Hold-out validation: hide 20% of liked interactions for test users
before training, saving the hidden data to held_out.json for later recall evaluation.

Run this AFTER seed_interactions.py but BEFORE training.
"""
import json
import os
import random
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.config import DATABASE_URL
import psycopg2

# psycopg2 doesn't support URI query params like ?schema=public
DB_URI = DATABASE_URL.split("?")[0]

TEST_USERNAMES = [
    "TEST_user_pop_fan",
    "TEST_user_rock_fan",
    "TEST_user_lofi_fan",
    "TEST_user_diverse",
    "TEST_user_cold_start",
]

HOLD_OUT_RATIO = 0.2
MIN_HELD = 1

def main():
    conn = psycopg2.connect(DB_URI)
    cur = conn.cursor()

    cur.execute("SELECT id, username FROM \"User\" WHERE username = ANY(%s)", (TEST_USERNAMES,))
    users = {row[1]: row[0] for row in cur.fetchall()}

    held_out = {}
    for username, user_id in users.items():
        cur.execute("""
            SELECT sl."songId"
            FROM "SongLike" sl
            JOIN "Song" s ON sl."songId" = s.id
            WHERE sl."userId" = %s AND s."isDeleted" = false
        """, (user_id,))
        liked_songs = [row[0] for row in cur.fetchall()]

        if len(liked_songs) < 3:
            held_out[username] = {"userId": user_id, "heldOutSongIds": [], "nHidden": 0}
            continue

        random.shuffle(liked_songs)
        n_hide = max(MIN_HELD, int(len(liked_songs) * HOLD_OUT_RATIO))
        hidden = liked_songs[:n_hide]

        cur.execute(
            'DELETE FROM "Interaction" WHERE "userId" = %s AND "songId" = ANY(%s)',
            (user_id, hidden),
        )
        cur.execute(
            'DELETE FROM "SongLike" WHERE "userId" = %s AND "songId" = ANY(%s)',
            (user_id, hidden),
        )

        held_out[username] = {
            "userId": user_id,
            "heldOutSongIds": hidden,
            "nHidden": len(hidden),
        }
        print(f"  {username}: hid {len(hidden)}/{len(liked_songs)} songs")

    conn.commit()
    cur.close()
    conn.close()

    path = os.path.join(os.path.dirname(__file__), "..", "..", "tests", "held_out.json")
    with open(path, "w") as f:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            "users": held_out,
        }, f, indent=2)
    print(f"Hold-out saved to {path}")

if __name__ == "__main__":
    main()
