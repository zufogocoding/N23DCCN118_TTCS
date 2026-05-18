import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SongDetail from "./pages/music/SongDetail";
import PlaylistView from './pages/music/PlaylistView';


// Layouts
import AuthLayout from './components/layout/AuthLayout';
import MainLayout from './components/layout/MainLayout';
import AdminLayout from './components/layout/AdminLayout';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import Home from './pages/user/Home';
import Search from './pages/user/Search';
import Profile from './pages/user/Profile';
import AdminDashboard from './pages/admin/AdminDashboard';
import ArtistRequests from './pages/admin/ArtistRequests';
import BecomeArtist from './pages/user/BecomeArtist';
import PendingSongs from "./pages/admin/PendingSongs";
import UploadSong from "./pages/artist/UploadSong";
import LibraryPage from "./pages/LibraryHome/LibraryPage";
import ManageGenres from './pages/admin/ManageGenres';
import ArtistProfile from './pages/artist/ArtistProfile';
import AlbumView from './pages/music/AlbumView';
import AdminAlbums from './pages/admin/AdminAlbums';

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
  if (!isAdmin) return <Navigate to="/" replace />;

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

          {/* Các trang Public */}
          <Route index element={<Home />} />
          <Route path="search" element={<Search />} />
          <Route path="artist/:id" element={<ArtistProfile />} />

          {/* Các trang Protected */}
          <Route path="/library" element={<LibraryPage />} />
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
          <Route
            path="upload-song"
            element={
              <ProtectedRoute>
                <UploadSong />
              </ProtectedRoute>
            }
          />

          {/* Song detail và Playlist view */}
          <Route path="song/:id" element={<SongDetail />} />
          <Route path="playlist/:playlistId" element={<PlaylistView />} />
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
          <Route path="pending-songs" element={<PendingSongs />} />
          <Route path="albums" element={<AdminAlbums />} />
          <Route path="playlists" element={<div className="p-8 text-white text-2xl font-bold">Quản lý Playlists (Đang xây dựng)</div>} />
          <Route path="genres" element={<ManageGenres />} />
          <Route path="reports" element={<div className="p-8 text-white text-2xl font-bold">Quản lý Reports (Đang xây dựng)</div>} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
