import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { playlistsData } from '../data/playlists'; // Import dữ liệu vừa tạo
import { Play, Clock, MoreHorizontal, Heart } from 'lucide-react';
import { House } from "lucide-react";
const PlaylistView = () => {
  const { playlistId } = useParams(); // Lấy ID từ thanh địa chỉ trình duyệt
  const data = playlistsData[playlistId];

  if (!data) return <div className="p-10 text-white">Playlist không tồn tại!</div>;

  return (
    
    <div className={`flex-1 bg-gradient-to-b ${data.color} to-[#121212] overflow-y-auto min-h-screen text-white relative`}>

    {/* BUTTON BACK + HOME */}
    <div className="absolute top-6 left-6 flex items-center gap-4 z-50">
      <button
        onClick={() => window.history.back()}
        // className="w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white text-2xl"
      >
        
      </button>

      <Link
        to="/"
        // className="px-6 py-3 rounded-full bg-black/40 hover:bg-black/60 text-white font-semibold flex items-center gap-2"
      >
           <House size={26} className="text-white" />
      </Link>
    </div>
      {/* Header */}
      <div className="p-8 flex items-end gap-6 bg-black/20 pt-20">
        <img src={data.image} alt="" className="w-52 h-52 shadow-2xl" />
        <div>
          <p className="text-xs font-bold uppercase">Playlist</p>
          <h1 className="text-7xl font-black my-2">{data.title}</h1>
          <p className="text-gray-300 text-sm font-bold">{data.author} • {data.songs.length} bài hát</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-8 flex items-center gap-8">
        <button className="bg-[#1ed760] w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 transition shadow-lg text-black">
          <Play fill="black" size={28} />
        </button>
        <MoreHorizontal size={32} className="text-gray-400" />
      </div>

      {/* Danh sách bài hát (Bảng) */}
      <div className="px-8 pb-32">
        <table className="w-full text-left border-collapse">
          <thead className="text-gray-400 text-sm border-b border-white/10 uppercase">
            <tr>
              <th className="pb-3 w-12 font-normal">#</th>
              <th className="pb-3 font-normal">Tiêu đề</th>
              <th className="pb-3 font-normal">Album</th>
              <th className="pb-3 font-normal text-right pr-4">
                <div className="flex justify-end">
                     <Clock size={16} />
                </div>
               </th>            
               </tr>
          </thead>
          <tbody>
            {data.songs.map((song, index) => (
              <tr key={song.id} className="hover:bg-white/10 group transition-colors cursor-pointer">
                <td className="py-3 text-gray-400 group-hover:text-white">{index + 1}</td>
                <td className="py-3">
                  <div className="flex flex-col">
                    <span className="text-white font-medium">{song.title}</span>
                    <span className="text-gray-400 text-sm group-hover:text-white">{song.artist}</span>
                  </div>
                </td>
                <td className="py-3 text-gray-400 text-sm group-hover:text-white">{song.album}</td>
                <td className="py-3 text-right pr-4 text-gray-400 text-sm">{song.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlaylistView;