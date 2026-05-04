import React from 'react';
import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] text-white font-sans relative overflow-hidden">
      {/* Vòng tròn Gradient trang trí background */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#00e6e6] rounded-full mix-blend-multiply filter blur-[128px] opacity-20"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#008080] rounded-full mix-blend-multiply filter blur-[128px] opacity-20"></div>

      {/* Khung chứa Nội dung (Form Login/Register sẽ được nhúng vào vị trí Outlet) */}
      <div className="z-10 bg-[#141414] p-10 rounded-2xl border border-[#222] w-[420px] shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#00e6e6] to-[#008080]">
            SOUNDWAVE.
          </h1>
          <p className="text-[#888] text-sm mt-2">Nền tảng âm nhạc đỉnh cao</p>
        </div>
        
        {/* Component con (Login hoặc Register) sẽ hiển thị ở đây */}
        <Outlet />
      </div>
    </div>
  );
}