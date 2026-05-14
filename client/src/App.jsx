import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SongDetail from "./pages/SongDetail";
import PlaylistView from './pages/PlaylistView';

// Layouts
import AuthLayout from './components/layout/AuthLayout';
import MainLayout from './components/layout/MainLayout';
import AdminLayout from './components/layout/AdminLayout';


 // Pending Song
import PendingSongs from "./pages/admin/PendingSongs";
// PlaylistView

// upload
import UploadSong from "./pages/user/UploadSong";

import PlaylistView from './pages/PlaylistView'; 
// Pages

 
// Pages
main
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
// Cần tạo file ForgotPassword.jsx hoặc comment tạm dòng này nếu chưa có
import ForgotPassword from './pages/auth/ForgotPassword';
import Home from './pages/user/Home';
import Search from './pages/user/Search';
import Profile from './pages/user/Profile';
import AdminDashboard from './pages/admin/AdminDashboard';
import ArtistRequests from './pages/admin/ArtistRequests';
import BecomeArtist from './pages/user/BecomeArtist';

// Component kiểm tra đăng nhập: Chưa có Token/User thì đuổi ra trang Login
const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem('user');
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Component bảo vệ Route dành riêng cho Admin
const AdminRoute = ({ children }) => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return <Navigate to="/login" replace />;

  let isAdmin = false;
  let parseError = false;
  try {
    const user = JSON.parse(userStr);
    isAdmin = user.isAdmin;
  } catch {
    parseError = true;
  }

  if (parseError) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />; // Không phải admin -> đuổi về trang chủ

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
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="register-artist"
            element={
              <ProtectedRoute>
                <BecomeArtist />
              </ProtectedRoute>
            }
          />

        </Route>
        {/* NHÓM ADMIN */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<div className="p-8 text-white text-2xl font-bold">Quản lý Users (Đang xây dựng)</div>} />
          <Route path="artists" element={<ArtistRequests />} />
          <Route path="songs" element={<div className="p-8 text-white text-2xl font-bold">Quản lý Songs (Đang xây dựng)</div>} />
          <Route path="albums" element={<div className="p-8 text-white text-2xl font-bold">Quản lý Albums (Đang xây dựng)</div>} />
          <Route path="playlists" element={<div className="p-8 text-white text-2xl font-bold">Quản lý Playlists (Đang xây dựng)</div>} />
          <Route path="genres" element={<div className="p-8 text-white text-2xl font-bold">Quản lý Genres (Đang xây dựng)</div>} />
          <Route path="reports" element={<div className="p-8 text-white text-2xl font-bold">Quản lý Reports (Đang xây dựng)</div>} />
        </Route>

        {/* Song detail và Playlist view - bên trong MainLayout để dùng chung sidebar + player */}
        <Route path="/" element={<MainLayout />}>
          <Route path="song/:id" element={<SongDetail />} />
          <Route path="playlist/:playlistId" element={<PlaylistView />} />
        </Route>
 quynh
        /* Route chi tiet bai hat */
        <Route path="/song/:id" element={<SongDetail />} />
        <Route path="/playlist/:playlistId" element={<PlaylistView />} />
         /* Route duyet songs */
        <Route path="/admin/pending-songs" element={<PendingSongs />} />
        <Route path="/upload-song" element={<UploadSong />} />
        
         main
      </Routes>
    </BrowserRouter>
  );
}

export default App;
