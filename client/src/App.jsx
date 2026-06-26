import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import AuthLayout from './components/layout/AuthLayout';
import MainLayout from './components/layout/MainLayout';
import AdminLayout from './components/layout/AdminLayout';
import ErrorBoundary from './components/common/ErrorBoundary';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';

// Pages (eager - initial load)
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import Home from './pages/user/Home';

// Lazy loaded Pages
const Search = lazy(() => import('./pages/user/Search'));
const Profile = lazy(() => import('./pages/user/Profile'));
const Settings = lazy(() => import('./pages/user/Settings'));
const BecomeArtist = lazy(() => import('./pages/user/BecomeArtist'));
const LibraryPage = lazy(() => import("./pages/LibraryHome/LibraryPage"));
const ArtistProfile = lazy(() => import('./pages/artist/ArtistProfile'));
const AlbumView = lazy(() => import('./pages/music/AlbumView'));
const SongDetail = lazy(() => import("./pages/music/SongDetail"));
const PlaylistView = lazy(() => import('./pages/music/PlaylistView'));
const ChartDetail = lazy(() => import('./pages/user/ChartDetail'));
const UploadSong = lazy(() => import("./pages/artist/UploadSong"));
const ReleaseManager = lazy(() => import('./pages/artist/ReleaseManager'));
const AnalyticsDashboard = lazy(() => import('./pages/artist/AnalyticsDashboard'));

// Lazy loaded Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ArtistRequests = lazy(() => import('./pages/admin/ArtistRequests'));
const PendingSongs = lazy(() => import("./pages/admin/PendingSongs"));
const ManageGenres = lazy(() => import('./pages/admin/ManageGenres'));
const AdminAlbums = lazy(() => import('./pages/admin/AdminAlbums'));
const ManagePlaylists = lazy(() => import('./pages/admin/ManagePlaylists'));
const AdminUsers = lazy(() => import('./pages/admin/adminUser'));
const ManageSongs = lazy(() => import('./pages/admin/ManageSongs'));
const ManageReports = lazy(() => import('./pages/admin/ManageReports'));
const ManageCharts = lazy(() => import('./pages/admin/ManageCharts'));
const AdminSystemPlaylists = lazy(() => import('./pages/admin/AdminSystemPlaylists'));
const AdminSystemPlaylistDetail = lazy(() => import('./pages/admin/AdminSystemPlaylistDetail'));
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-[#121212] text-white">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1db954]"></div>
  </div>
);


// Component kiểm tra đăng nhập: Chưa có Token/User thì đuổi ra trang Login
const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Component bảo vệ Route dành riêng cho Admin
const AdminRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/" replace />;
  return children;
};

function App() {
  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <PlayerProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner />}>
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
              {/* analytics must come BEFORE artist/:id to avoid shadowing */}
              <Route path="artist/analytics" element={<ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>} />
              <Route path="artist/:id" element={<ArtistProfile />} />
              <Route path="chart/:type" element={<ChartDetail />} />
  
              {/* Các trang Protected */}
              <Route
                path="/library"
                element={
                  <ProtectedRoute>
                    <LibraryPage />
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
                path="settings"
                element={
                  <ProtectedRoute>
                    <Settings />
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
              <Route path="release/new" element={<ProtectedRoute><ReleaseManager /></ProtectedRoute>} />
              <Route path="release/:albumId" element={<ProtectedRoute><ReleaseManager /></ProtectedRoute>} />
  
              {/* Song detail, Playlist, Album view */}
              <Route path="song/:id" element={<SongDetail />} />
              <Route path="playlist/:playlistId" element={<PlaylistView />} />
              <Route path="album/:albumId" element={<AlbumView />} />
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
              <Route path="users" element={<AdminUsers />} />
              <Route path="artists" element={<ArtistRequests />} />
              <Route path="songs" element={<ManageSongs />} />
              <Route path="pending-songs" element={<PendingSongs />} />
              <Route path="albums" element={<AdminAlbums />} />
              <Route path="playlists" element={<ManagePlaylists />} />
              <Route path="genres" element={<ManageGenres />} />
              <Route path="charts" element={<ManageCharts />} />
              <Route path="reports" element={<ManageReports />} />
              <Route path="system-playlists" element={<AdminSystemPlaylists />} />
              <Route path="system-playlists/:id" element={<AdminSystemPlaylistDetail />} />
            </Route>
  
          </Routes>
        </Suspense>
  
        </BrowserRouter>
        </PlayerProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
