import { Link } from "react-router-dom";
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, Bell, Heart } from 'lucide-react';

export default function Home() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

  const handleProtectedAction = (action) => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
    } else if (action) {
      action();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* HEADER BÊN TRONG CỘT GIỮA */}
      <div className="sticky top-0 bg-[#121212]/90 backdrop-blur-md z-10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-[#a0a0a0] cursor-not-allowed">
              <ChevronLeft size={20} />
            </button>
            <button className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-[#a0a0a0] cursor-not-allowed">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="relative relative w-[300px] hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={18} />
            <input
              type="text"
              placeholder="What do you want to listen to?"
              className="w-full py-2 pl-10 pr-4 rounded-full bg-white text-black text-sm outline-none font-medium"
            />
          </div>
        </div>
        {/*Clean Import*/}
        <div></div>
      </div>

      {/* NỘI DUNG CUỘN */}
      <div className="p-6 pt-0 flex-1 overflow-y-auto">

        {/* Lời chào */}
        <div className="mt-8 mb-6">
          <h1 className="text-4xl font-black text-[#5e9ca0] mb-1 uppercase tracking-wider">{user.username ? 'Welcome Back' : 'Welcome to Soundwave'}</h1>
          {user.username && <h2 className="text-xl font-bold">{user.username}</h2>}
        </div>

        {/* Section: My Library */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#b83280]">My Library</h2>
            <button className="text-sm font-bold text-[#a0a0a0] hover:text-white uppercase tracking-wider">Show all</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div onClick={() => handleProtectedAction()} className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer group">
              <img src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&auto=format&fit=crop" className="w-full aspect-square object-cover rounded-md mb-4 shadow-lg" alt="Cover" />
              <h3 className="font-bold truncate text-white">Chill Vibes</h3>
            </div>
            {/* Card 2 */}
            <div onClick={() => handleProtectedAction()} className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer group">
              <img src="https://images.unsplash.com/photo-1534258936925-c58bed479fcb?q=80&w=400&auto=format&fit=crop" className="w-full aspect-square object-cover rounded-md mb-4 shadow-lg" alt="Cover" />
              <h3 className="font-bold truncate text-white">Workout Mix</h3>
            </div>
            {/* Card 3 */}
            <div onClick={() => handleProtectedAction()} className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer group">
              <div className="w-full aspect-square bg-gradient-to-br from-indigo-600 to-purple-800 rounded-md mb-4 shadow-lg flex items-center justify-center">
                <Heart size={48} className="text-white fill-current" />
              </div>
              <h3 className="font-bold truncate text-white">Liked Songs</h3>
            </div>
          </div>
        </div>

        {/* Section: Trending Songs */}
 frontend-quynh
<div className="mb-10">
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-2xl font-bold text-white">Trending Songs</h2>
    <button className="text-sm font-bold text-[#a0a0a0] hover:text-white uppercase tracking-wider">
      Show all
    </button>
  </div>

  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">

    {/* Song Card 1 */}
    <Link to="/song/1">
      <div className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer">
        <img
          src="https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop"
          className="w-full aspect-square object-cover rounded-md mb-4 shadow-lg"
          alt="Cover"
        />
        <h3 className="font-bold text-white truncate text-base mb-1">
          Trói Em Lại
        </h3>
        <p className="text-sm text-[#a0a0a0] truncate">
          HIEUTHUHAI
        </p>
      </div>
    </Link>

    {/* Song Card 2 */}
    <Link to="/song/2">
      <div className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer">
        <img
          src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400&auto=format&fit=crop"
          className="w-full aspect-square object-cover rounded-md mb-4 shadow-lg"
          alt="Cover"
        />
        <h3 className="font-bold text-white truncate text-base mb-1">
          Đi Giữa Trời Rực Rỡ
        </h3>
        <p className="text-sm text-[#a0a0a0] truncate">
          Ngô Lan Hương
        </p>
      </div>
    </Link>

    {/* Song Card 3 */}
    <Link to="/song/3">
      <div className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer">
        <img
          src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400&auto=format&fit=crop"
          className="w-full aspect-square object-cover rounded-md mb-4 shadow-lg"
          alt="Cover"
        />
        <h3 className="font-bold text-white truncate text-base mb-1">
          Bước Qua Nhau
        </h3>
        <p className="text-sm text-[#a0a0a0] truncate">
          Vũ
        </p>
      </div>
    </Link>

  </div>
</div>
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Trending Songs</h2>
            <button className="text-sm font-bold text-[#a0a0a0] hover:text-white uppercase tracking-wider">Show all</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {/* Song Card 1 */}
            <div onClick={() => handleProtectedAction()} className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer">
              <img src="https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop" className="w-full aspect-square object-cover rounded-md mb-4 shadow-lg" alt="Cover" />
              <h3 className="font-bold text-white truncate text-base mb-1">Trói Em Lại</h3>
              <p className="text-sm text-[#a0a0a0] truncate">HIEUTHUHAI</p>
            </div>
            {/* Song Card 2 */}
            <div onClick={() => handleProtectedAction()} className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer">
              <img src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400&auto=format&fit=crop" className="w-full aspect-square object-cover rounded-md mb-4 shadow-lg" alt="Cover" />
              <h3 className="font-bold text-white truncate text-base mb-1">Đi Giữa Trời Rực...</h3>
              <p className="text-sm text-[#a0a0a0] truncate">Ngô Lan Hương</p>
            </div>
            {/* Song Card 3 */}
            <div onClick={() => handleProtectedAction()} className="bg-[#181818] p-4 rounded-xl hover:bg-[#282828] transition-colors cursor-pointer">
              <img src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400&auto=format&fit=crop" className="w-full aspect-square object-cover rounded-md mb-4 shadow-lg" alt="Cover" />
              <h3 className="font-bold text-white truncate text-base mb-1">Bước Qua Nhau</h3>
              <p className="text-sm text-[#a0a0a0] truncate">Vũ</p>
            </div>
          </div>
        </div>
 main

      </div>
    </div>
  );
}
