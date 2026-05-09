import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import AuthLayout from './components/layout/AuthLayout';
import MainLayout from './components/layout/MainLayout';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Home from './pages/user/Home';

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
        </Route>

        {/* NHÓM APP CHÍNH */}
        <Route 
          path="/" 
          element={<MainLayout />}
        >
          {/* Outlet: Các trang này sẽ được nhúng vào giữa cái MainLayout */}
          <Route index element={<Home />} />
          <Route path="search" element={<div className="p-8 text-white text-2xl font-bold">Trang Tìm Kiếm (Đang xây dựng)</div>} />
          <Route path="library" element={
            <ProtectedRoute>
              <div className="p-8 text-white text-2xl font-bold">Thư Viện Của Tôi (Đang xây dựng)</div>
            </ProtectedRoute>
          } />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;