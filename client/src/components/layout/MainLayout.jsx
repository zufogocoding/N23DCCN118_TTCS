import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import {
  Home, Search, Library, PlusSquare, Heart,
  PlayCircle, SkipBack, SkipForward, Shuffle, Repeat,
  Volume2, Mic2, ListMusic, Maximize2, MoreHorizontal
} from 'lucide-react';
// Đảm bảo đường dẫn import UserDropdown chính xác với cấu trúc thư mục của bạn
import UserDropdown from '../UserDropdown';

export default function MainLayout() {
  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden">

      {/* KHU VỰC TRÊN: 3 CỘT */}
      <div className="flex flex-1 overflow-hidden">

        {/* CỘT 1: SIDEBAR TRÁI */}
        <div className="w-[240px] bg-black border-r border-[#222] flex flex-col hidden md:flex">
          <div className="p-6">
            <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#00e6e6] to-[#008080]">
              SOUNDWAVE.
            </h1>
          </div>

          <nav className="flex flex-col gap-4 px-6 text-sm font-semibold text-[#a0a0a0]">
            <Link to="/" className="flex items-center gap-4 text-white hover:text-white transition-colors">
              <Home size={24} /> Trang chủ
            </Link>
            <Link to="/search" className="flex items-center gap-4 hover:text-white transition-colors">
              <Search size={24} /> Tìm kiếm
            </Link>
            <Link to="/library" className="flex items-center gap-4 hover:text-white transition-colors">
              <Library size={24} /> Thư viện
            </Link>
          </nav>

          <div className="mt-8 px-6 flex flex-col gap-4 text-sm font-semibold text-[#a0a0a0]">
            <button className="flex items-center gap-4 hover:text-white transition-colors">
              <PlusSquare size={24} /> Tạo Playlist
            </button>
            <button className="flex items-center gap-4 hover:text-white transition-colors text-[#00e6e6]">
              <Heart size={24} className="fill-current" /> Bài hát đã thích
            </button>
          </div>

          <div className="mt-4 px-6 border-t border-[#222] pt-4 flex-1 overflow-y-auto mb-4">
            <ul className="text-sm text-[#a0a0a0] flex flex-col gap-3">
              <li className="hover:text-white cursor-pointer truncate">Chill Vibes</li>
              <li className="hover:text-white cursor-pointer truncate">Workout Mix</li>
              <li className="hover:text-white cursor-pointer truncate">Lofi Coding</li>
            </ul>
          </div>
        </div>

        {/* CỘT 2: NỘI DUNG CHÍNH Ở GIỮA */}
        <div className="flex-1 bg-[#121212] overflow-y-auto rounded-lg m-2 relative flex flex-col">
          {/* Header chứa UserDropdown */}
          <div className="sticky top-0 z-50 flex items-center justify-end px-6 py-4 bg-gradient-to-b from-[#121212] to-transparent">
            <UserDropdown />
          </div>

          {/* Nội dung các trang */}
          <div className="px-6 pb-6">
            <Outlet />
          </div>
        </div>

        {/* CỘT 3: NOW PLAYING BÊN PHẢI */}
        <div className="w-[300px] bg-black p-4 hidden lg:flex flex-col border-l border-[#222]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-sm uppercase tracking-widest text-[#00e6e6]">Đang phát</h3>
            <MoreHorizontal size={20} className="text-[#a0a0a0] cursor-pointer" />
          </div>

          <img
            src="https://images.unsplash.com/photo-1598387993441-a364f854c3e1?q=80&w=400&auto=format&fit=crop"
            alt="Now Playing"
            className="w-full aspect-square object-cover rounded-xl mb-4 shadow-2xl shadow-[#00e6e6]/10"
          />

          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="font-bold text-xl hover:underline cursor-pointer">Sài Gòn Đau Lòng Lắm</h2>
              <p className="text-[#a0a0a0] text-sm hover:underline cursor-pointer">Hứa Kim Tuyền</p>
            </div>
            <Heart size={20} className="text-[#00e6e6] fill-current mt-1 cursor-pointer" />
          </div>

          <div className="bg-[#181818] p-4 rounded-xl mt-4 border border-[#333]">
            <h4 className="font-bold text-sm mb-2">Về nghệ sĩ</h4>
            <p className="text-xs text-[#a0a0a0] line-clamp-3 leading-relaxed">
              Hứa Kim Tuyền là một nhạc sĩ, nhà sản xuất âm nhạc nổi tiếng với nhiều bản hit lãng mạn, gắn liền với tâm trạng của giới trẻ...
            </p>
          </div>
        </div>
      </div>

      {/* KHU VỰC DƯỚI: THANH MUSIC PLAYER */}
      <div className="h-[95px] bg-black border-t border-[#222] flex items-center justify-between px-4 z-50">

        {/* 1. Trái: Info bài hát */}
        <div className="flex items-center gap-4 w-[30%] min-w-[180px]">
          <img src="https://images.unsplash.com/photo-1598387993441-a364f854c3e1?q=80&w=100&auto=format&fit=crop" alt="Cover" className="w-14 h-14 rounded-md object-cover shadow-lg" />
          <div className="hidden sm:block">
            <h4 className="font-semibold text-sm hover:underline cursor-pointer">Sài Gòn Đau Lòng Lắm</h4>
            <p className="text-xs text-[#a0a0a0] hover:underline cursor-pointer">Hứa Kim Tuyền</p>
          </div>
          <Heart size={16} className="text-[#a0a0a0] hover:text-[#00e6e6] cursor-pointer ml-2 transition-colors" />
        </div>

        {/* 2. Giữa: Player Controls */}
        <div className="flex flex-col items-center justify-center w-[40%] max-w-[500px]">
          <div className="flex items-center gap-6 mb-2">
            <button className="text-[#a0a0a0] hover:text-white transition-colors"><Shuffle size={18} /></button>
            <button className="text-[#a0a0a0] hover:text-white transition-colors"><SkipBack size={20} fill="currentColor" /></button>
            <button className="text-white hover:scale-110 transition-transform bg-white rounded-full p-1 shadow-lg shadow-white/5">
              <PlayCircle size={36} className="text-black" fill="currentColor" />
            </button>
            <button className="text-[#a0a0a0] hover:text-white transition-colors"><SkipForward size={20} fill="currentColor" /></button>
            <button className="text-[#a0a0a0] hover:text-white transition-colors"><Repeat size={18} /></button>
          </div>
          <div className="w-full flex items-center gap-2 text-xs text-[#a0a0a0] font-mono">
            <span>2:34</span>
            <div className="h-1 flex-1 bg-[#333] rounded-full overflow-hidden cursor-pointer group relative">
              <div className="w-2/3 h-full bg-[#00e6e6] group-hover:bg-[#00ffff] transition-colors"></div>
            </div>
            <span>4:12</span>
          </div>
        </div>

        {/* 3. Phải: Tools (Volume, Queue) */}
        <div className="flex items-center justify-end gap-3 w-[30%] min-w-[180px] text-[#a0a0a0]">
          <Mic2 size={18} className="hover:text-white cursor-pointer transition-colors" />
          <ListMusic size={18} className="hover:text-white cursor-pointer transition-colors" />
          <Volume2 size={18} className="hover:text-white cursor-pointer transition-colors" />
          <div className="w-24 h-1 bg-[#333] rounded-full overflow-hidden cursor-pointer group">
            <div className="w-1/2 h-full bg-white group-hover:bg-[#00e6e6] transition-colors"></div>
          </div>
          <Maximize2 size={16} className="hover:text-white cursor-pointer ml-2 transition-colors" />
        </div>
      </div>

    </div>
  );
}
