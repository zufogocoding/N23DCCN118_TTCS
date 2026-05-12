import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SongDetail from "./pages/SongDetail";
// Layouts
import AuthLayout from './components/layout/AuthLayout';
import MainLayout from './components/layout/MainLayout';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
// Cần tạo file ForgotPassword.jsx hoặc comment tạm dòng này nếu chưa có
import ForgotPassword from './pages/auth/ForgotPassword'; 
import Home from './pages/user/Home';
import Search from './pages/user/Search';

// Component kiểm tra đăng nhập: Chưa có Token/User thì đuổi ra trang Login
const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem('user');
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* NHÓM XÁC THỰC (Không cần đăng nhập) */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>

        {/* NHÓM APP CHÍNH */}
        <Route path="/" element={<MainLayout />}>
          
          {/* Các trang Public (Không cần đăng nhập vẫn xem được Layout) */}
          <Route index element={<Home />} />
          <Route path="search" element={<Search />} />
          
          {/* Các trang Protected (Bắt buộc đăng nhập mới xem được nội dung) */}
          <Route 
            path="library" 
            element={
              <ProtectedRoute>
                <div className="p-8 text-white text-2xl font-bold">Thư Viện Của Tôi (Đang xây dựng)</div>
              </ProtectedRoute>
            } 
          />
          
        </Route>
        // Route chi tiet bai hat
        <Route path="/song/:id" element={<SongDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;