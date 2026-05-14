import { useEffect, useState } from "react";

export default function PendingSongs() {
  const [songs, setSongs] = useState([]);

  // realtime date
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // fetch pending songs
  useEffect(() => {
    fetch("http://127.0.0.1:9000/api/admin/songs/pending")
      .then((res) => res.json())
      .then((data) => {
        setSongs(data);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  // approve
  const approveSong = async (id) => {
    await fetch(
      `http://127.0.0.1:9000/api/admin/song/${id}/approve`,
      {
        method: "PATCH",
      }
    );

    setSongs(songs.filter((song) => song.id !== id));
  };

  // reject
  const rejectSong = async (id) => {
    await fetch(
      `http://127.0.0.1:9000/api/admin/song/${id}/reject`,
      {
        method: "PATCH",
      }
    );

    setSongs(songs.filter((song) => song.id !== id));
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#000",
        color: "white",
        fontFamily: "Arial",
      }}
    >
      {/* SIDEBAR */}
      <div
        style={{
          width: "220px",
          background: "#050505",
          borderRight: "1px solid #1f1f1f",
          padding: "25px",
        }}
      >
        <h1
          style={{
            color: "#00e5ff",
            fontSize: "28px",
            fontWeight: "bold",
            lineHeight: "35px",
            marginBottom: "50px",
          }}
        >
          System
          <br />
          Manager
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          <p>Dashboard</p>
          <p>Users</p>
          <p>Artists</p>

          <div
            style={{
              background: "#022b33",
              padding: "14px",
              borderRadius: "12px",
              color: "#00e5ff",
            }}
          >
            Songs
          </div>

          <p>Albums</p>
          <p>Playlists</p>
          <p>Reports</p>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, padding: "25px" }}>
        {/* TOP */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "42px",
                fontWeight: "bold",
                margin: 0,
              }}
            >
              Pending Songs
            </h1>

            <p
              style={{
                color: "#9ca3af",
                marginTop: "10px",
                fontSize: "18px",
              }}
            >
              Review uploaded songs before publishing
            </p>
          </div>

          <div
            style={{
              background: "#111827",
              padding: "14px 20px",
              borderRadius: "14px",
              fontSize: "18px",
            }}
          >
            {today}
          </div>
        </div>

        {/* STATS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "20px",
            marginBottom: "30px",
          }}
        >
          {/* pending */}
          <div
            style={{
              background: "#0b0b0b",
              border: "1px solid #1f1f1f",
              borderRadius: "18px",
              padding: "25px",
            }}
          >
            <p style={{ color: "#9ca3af", fontSize: "18px" }}>
              Pending Songs
            </p>

            <h2
              style={{
                color: "#00e5ff",
                fontSize: "38px",
                marginTop: "15px",
              }}
            >
              {songs.length}
            </h2>
          </div>

          {/* approved */}
          <div
            style={{
              background: "#0b0b0b",
              border: "1px solid #1f1f1f",
              borderRadius: "18px",
              padding: "25px",
            }}
          >
            <p style={{ color: "#9ca3af", fontSize: "18px" }}>
              Approved Today
            </p>

            <h2
              style={{
                color: "#22c55e",
                fontSize: "38px",
                marginTop: "15px",
              }}
            >
              0
            </h2>
          </div>

          {/* rejected */}
          <div
            style={{
              background: "#0b0b0b",
              border: "1px solid #1f1f1f",
              borderRadius: "18px",
              padding: "25px",
            }}
          >
            <p style={{ color: "#9ca3af", fontSize: "18px" }}>
              Rejected Today
            </p>

            <h2
              style={{
                color: "#ef4444",
                fontSize: "38px",
                marginTop: "15px",
              }}
            >
              0
            </h2>
          </div>
        </div>

        {/* SONG LIST */}
        <div
          style={{
            background: "#0b0b0b",
            border: "1px solid #1f1f1f",
            borderRadius: "18px",
            padding: "20px",
          }}
        >
          <h2
            style={{
              fontSize: "24px",
              marginBottom: "20px",
            }}
          >
            Pending Review List
          </h2>

          {songs.length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: "16px" }}>
              No pending songs
            </p>
          ) : (
            songs.map((song) => (
              <div
                key={song.id}
                style={{
                  border: "1px solid #1f1f1f",
                  borderRadius: "16px",
                  padding: "20px",
                  marginBottom: "15px",
                  background: "#111111",
                }}
              >
                <h3
                  style={{
                    fontSize: "22px",
                    marginBottom: "10px",
                  }}
                >
                  {song.title}
                </h3>

                <p style={{ color: "#9ca3af", fontSize: "15px" }}>
                  Song ID: {song.id}
                </p>

                <p style={{ color: "#9ca3af", fontSize: "15px" }}>
                  Status: {song.status}
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    marginTop: "18px",
                  }}
                >
                  {/* approve */}
                  <button
                    onClick={() => approveSong(song.id)}
                    style={{
                      background: "#00c853",
                      border: "none",
                      padding: "10px 18px",
                      borderRadius: "10px",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "bold",
                    }}
                  >
                    Approve
                  </button>

                  {/* reject */}
                  <button
                    onClick={() => rejectSong(song.id)}
                    style={{
                      background: "#ff1744",
                      border: "none",
                      padding: "10px 18px",
                      borderRadius: "10px",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "bold",
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}