import { useEffect, useState } from "react";
import axios from "axios";

export default function LibraryPage() {
  const [songs, setSongs] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);

  useEffect(() => {
    getUploadedSongs();
  }, []);

  async function getUploadedSongs() {
    try {
      const res = await axios.get(
        "http://localhost:9000/api/songs/user/1"
      );

      setSongs(res.data);

    } catch (err) {
      console.log("Lỗi:", err);
    }
  };

    
  const toggleMenu = (id) => {

    setOpenMenu(
      openMenu === id ? null : id
    );

  };



  const openEdit = (song) => {

    setSelectedSong({
      ...song,
      artistName: "",
      genre: "",
      description: ""
    });

    setOpenMenu(null);
  };



  const updateSong = async () => {

  try {

    await axios.put(

      `http://localhost:9000/api/songs/${selectedSong.id}`,

      {

        title:selectedSong.title,
        artistName:selectedSong.artistName,
        genre:selectedSong.genre,
        description:selectedSong.description

      }

    );

    setSelectedSong(null);

    getUploadedSongs();

  }

  catch(err){

    console.log(
      "Lỗi update:",
      err
    );

  }

};


  const deleteSong = async (id) => {

    try {

      await axios.delete(
        `http://localhost:9000/api/songs/${id}`
      );

      getUploadedSongs();

    }
    catch (err) {

      console.log(err);

    }

  };



  return (

    <div className="p-8 text-white">

      <h1 className="text-4xl font-bold mb-8">
        Thư viện của tôi
      </h1>


      <h2 className="text-2xl mb-5">
        Bài hát đã upload
      </h2>


      {songs.length === 0 ? (

        <p>Chưa có bài hát nào</p>

      ) : (

        songs.map((song) => (

          <div
            key={song.id}
            className="
            flex
            justify-between
            items-center
            bg-[#1e1e1e]
            p-4
            rounded-lg
            mb-3
            "
          >

            <div className="flex gap-4">

              <img
                src={
                  song.coverArtUrl
                    ? `http://localhost:9000/${song.coverArtUrl}`
                    : "/default-cover.png"
                }
                className="w-16 h-16 rounded"
              />


              <div>

                <h3 className="font-bold">
                  {song.title}
                </h3>

                <p className="text-gray-400">
                  {song.status}
                </p>

              </div>

            </div>



            <div className="relative">

              <button
                onClick={() => toggleMenu(song.id)}
                className="text-3xl"
              >
                ⋮
              </button>



              {openMenu === song.id && (

                <div
                  className="
                  absolute
                  right-0
                  bg-[#2a2a2a]
                  rounded-lg
                  p-2
                  w-36
                  z-50
                  "
                >

                  <button
                    className="
                    block
                    w-full
                    text-left
                    p-2
                    hover:bg-[#444]
                    "
                    onClick={() => openEdit(song)}
                  >
                     Chỉnh sửa
                  </button>



                  <button
                    className="
                    block
                    w-full
                    text-left
                    p-2
                    hover:bg-red-600
                    "
                    onClick={() =>
                      deleteSong(song.id)
                    }
                  >
                     Xóa
                  </button>

                </div>

              )}

            </div>

          </div>

        ))

      )}



      {selectedSong && (

        <div
          className="
          fixed
          inset-0
          bg-black/70
          flex
          items-center
          justify-center
          "
        >

          <div
            className="
            bg-[#222]
            p-6
            rounded-xl
            w-[500px]
            "
          >

            <h2
              className="
              text-2xl
              mb-4
              "
            >
              Chỉnh sửa bài hát
            </h2>


            <input
              className="
              w-full
              p-3
              bg-[#333]
              rounded
              mb-3
              "
              value={selectedSong.title}
              onChange={(e) =>
                setSelectedSong({
                  ...selectedSong,
                  title: e.target.value
                })
              }
            />


            <input
              className="
              w-full
              p-3
              bg-[#333]
              rounded
              mb-3
              "
              placeholder="Nghệ sĩ"
              value={selectedSong.artistName}
              onChange={(e) =>
                setSelectedSong({
                  ...selectedSong,
                  artistName: e.target.value
                })
              }
            />


            <input
              className="
              w-full
              p-3
              bg-[#333]
              rounded
              mb-3
              "
              placeholder="Thể loại"
              value={selectedSong.genre}
              onChange={(e) =>
                setSelectedSong({
                  ...selectedSong,
                  genre: e.target.value
                })
              }
            />


            <textarea
              className="
              w-full
              p-3
              bg-[#333]
              rounded
              mb-5
              "
              placeholder="Mô tả"
              value={selectedSong.description}
              onChange={(e) =>
                setSelectedSong({
                  ...selectedSong,
                  description: e.target.value
                })
              }
            />


            <div className="flex gap-3">

              <button
                onClick={updateSong}
                className="
                bg-cyan-500
                px-4
                py-2
                rounded
                "
              >
                Lưu
              </button>


              <button
                onClick={() =>
                  setSelectedSong(null)
                }
                className="
                bg-gray-500
                px-4
                py-2
                rounded
                "
              >
                Hủy
              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );
}