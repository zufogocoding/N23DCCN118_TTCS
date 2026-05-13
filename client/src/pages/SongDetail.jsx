import React from "react";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { useState } from "react";
import { PlusCircle, CheckCircle } from "lucide-react";
import CreatePlaylistModal from "../components/CreatePlaylistModal"; 
import {
  Play,
//   PlusCircle,
  ArrowDownCircle,
  MoreHorizontal,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Volume2,
  ListMusic,
  MonitorSpeaker,
  Heart,
  Search,
} from "lucide-react";

const SongDetail = () => {
    const [added, setAdded] = useState(false);
    const [liked, setLiked] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { id } = useParams();


  const songs = {
    1: {
      title: "TRÓI EM LẠI",
      artist: 'HIEU THU HAI',
      image:
        "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=600&auto=format&fit=crop",
      artistImage: "https://i.pravatar.cc/500?img=32",
      color: "from-pink-600 to-[#121212]",
      duration: "4:24",
      plays: "11,992,209 plays",
    },

    2: {
      title: "Đi Giữa Trời Rực Rỡ",
      artist: "Ngô Lan Hương",
      image:
        "https://upload.wikimedia.org/wikipedia/vi/4/4d/%C4%90i_gi%E1%BB%AFa_tr%E1%BB%9Di_r%E1%BB%B1c_r%E1%BB%A1.jpg",
      artistImage:
        "https://i.pinimg.com/736x/4b/22/91/4b2291df22f8d9c2a5cb1a5e5d4f3d7b.jpg",
      color: "from-cyan-600 to-[#121212]",
      duration: "3:40",
      plays: "18,158,450 plays",
    },

    3: {
      title: "Bước Qua Nhau",
      artist: "Vũ",
      image:
        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop",
      artistImage: "https://i.pravatar.cc/500?img=18",
      color: "from-purple-600 to-[#121212]",
      duration: "4:02",
      plays: "8,500,100 plays",
    },
  };

  const song = songs[id];

  if (!song) {
    return (
      <div className="text-white p-10 bg-black min-h-screen">
        Không tìm thấy bài hát
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">

      {/* LEFT SIDEBAR */}
<aside className="w-[220px] bg-black border-r border-white/10 px-6 py-8 hidden lg:flex flex-col">

  {/* LOGO */}
  <h1 className="text-cyan-400 text-2xl font-black mb-14 tracking-wide">
    SOUNDWAVE.
  </h1>

  {/* MENU */}
  <div className="space-y-7 text-lg font-semibold">
    <div className="flex items-center gap-4 text-white hover:text-cyan-400 transition cursor-pointer">
      <span className="text-2xl">⌂</span>
        <Link to="/" className="hover:text-cyan-400">
      <span>Trang chủ</span>
      </Link>
    </div>
    

    <button
        onClick={() => setShowSearch(!showSearch)}
        className="flex items-center gap-4"
        >
        <Search size={22} />
        <span>Tìm kiếm</span>
    </button>

    <div className="flex items-center gap-4 text-gray-400 hover:text-white transition cursor-pointer">
      <span className="text-2xl">☰</span>
      <span>Thư viện</span>
    </div>

    <div 
      onClick={() => setIsModalOpen(true)} 
      className="flex items-center gap-4 text-gray-400 hover:text-white transition cursor-pointer"
    >
        <span className="text-2xl">⊞</span>
        <span>Tạo Playlist</span>
    </div>

    <div className="flex items-center gap-4 text-cyan-100 cursor-pointer">
      <span className="text-2xl">♥</span>
      <span>Bài hát đã thích</span>
    </div>
  </div>

  {/* PLAYLIST */}
  <div className="border-t border-white/10 mt-10 pt-6 space-y-4 text-sm text-gray-400">

    <p className="hover:text-white cursor-pointer transition">
      <Link to="/playlist/chill-vibes" className="hover:text-white cursor-pointer">
      Chill Vibes
      </Link>
    </p>

    <p className="hover:text-white cursor-pointer transition">
      <Link to="/playlist/workout-mix" className="hover:text-white cursor-pointer">
      Workout Mix
      </Link>
    </p>

    <p className="hover:text-white cursor-pointer transition">
      Lofi Coding
    </p>

  </div>
</aside>

      {/* MAIN */}
      <main
        className={`flex-1 overflow-y-auto bg-gradient-to-b ${song.color} pb-32`}
      >

        {/* TOP HEADER - ĐƯA TÌM KIẾM LÊN ĐÂY */}
        <header className="sticky top-0 z-20 px-10 py-4 bg-black/20 backdrop-blur-md flex items-center">
          {showSearch && (
            <div className="bg-white rounded-full px-5 py-2 flex items-center gap-3 w-[400px] shadow-xl">
              <Search size={20} color="black" />
              <input
                type="text"
                placeholder="What do you want to listen to?"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => {if (e.key === "Enter") {
                setShowSearch(false); // Đóng thanh tìm kiếm
                setSearchText("");

                //ham tim kiem
                }}}
                className="outline-none text-black text-base w-full bg-transparent"
                autoFocus // Tự động chọn vào ô này khi hiện ra
              />
            </div>
    )}
        </header>

        {/* HERO */}
        <div className="px-10 pt-16 pb-10 flex items-end gap-8 min-h-[340px]">

          <img
            src={song.image}
            alt={song.title}
            className="w-60 h-60 rounded-md object-cover shadow-2xl"
          />

          <div>

            <p className="uppercase text-sm mb-3 font-bold">
              Song
            </p>

            <h1 className="text-6xl font-black leading-tight mb-4">
              {song.title}
            </h1>

            <div className="flex items-center gap-2 text-gray-200">
              <span className="font-bold">
                {song.artist}
              </span>

              <span>•</span>

              <span>2024</span>

              <span>•</span>

              <span>{song.duration}</span>

              <span>•</span>

              <span>{song.plays}</span>
            </div>
          </div>
        </div>

        {/* ACTION BAR */}
        <div className="px-10 py-6 flex items-center gap-6 bg-black/20">

          <button className="bg-[#1ed760] w-20 h-20 rounded-full flex items-center justify-center hover:scale-105 transition">
            <Play
              fill="black"
              color="black"
              size={38}
              className="ml-1"
            />
          </button>

            <button
                onClick={() => {
                    setAdded(true);

                    setTimeout(() => {
                    setAdded(false);
                    }, 5000);
                }}
                >
                {added ? (
                    <CheckCircle
                    size={36}
                    className="text-green-400 transition"
                    />
                ) : (
                    <PlusCircle
                    size={36}
                    className="text-gray-300 hover:text-cyan-400 transition"
                    />
                )}
            </button>

          <ArrowDownCircle size={36} className="text-gray-300" />

         <button onClick={() => setLiked(!liked)}>
            <Heart
                size={36}
                className={
                liked
                    ? "text-red-500 fill-red-500 transition"
                    : "text-gray-300 transition"
                }
            />
        </button>

          <MoreHorizontal size={36} className="text-gray-300" />
        </div>

      </main>
        
       <CreatePlaylistModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
      
      {/* FOOTER PLAYER */}
      <footer className="fixed bottom-0 left-0 right-0 h-24 bg-black border-t border-white/10 flex items-center justify-between px-6 z-50">

        {/* LEFT */}
        <div className="flex items-center gap-4 w-[30%]">

          <img
            src={song.image}
            alt=""
            className="w-14 h-14 rounded object-cover"
          />

          <div>
            <p className="font-semibold">
              {song.title}
            </p>

            <p className="text-sm text-gray-400">
              {song.artist}
            </p>
          </div>
        </div>

        {/* CENTER */}
        <div className="flex flex-col items-center w-[40%]">

          <div className="flex items-center gap-6 mb-3">

            <Shuffle size={18} className="text-cyan-400" />

            <SkipBack size={22} />

            <button className="bg-white p-3 rounded-full">
              <Play fill="black" color="black" size={22} />
            </button>

            <SkipForward size={22} />

            <Repeat size={18} />

          </div>

          <div className="flex items-center gap-3 w-full">

            <span className="text-xs text-gray-400">
              0:02
            </span>

            <div className="h-1 bg-gray-700 rounded-full flex-1 overflow-hidden">
              <div className="h-full w-1/4 bg-white rounded-full"></div>
            </div>

            <span className="text-xs text-gray-400">
              {song.duration}
            </span>

          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center justify-end gap-4 w-[30%] text-gray-300">

          <ListMusic size={18} />

          <MonitorSpeaker size={18} />

          <Volume2 size={18} />

          <div className="w-28 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div className="w-1/2 h-full bg-white rounded-full"></div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SongDetail;