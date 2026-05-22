import { getMediaUrl } from './api';

// Helper to extract artist name(s) from a song object
export function getArtistName(song) {
  if (!song) return 'Unknown Artist';
  if (song.artists && song.artists.length > 0) {
    return song.artists.map(a => a.artist?.artistName || a.artist?.user?.displayName || a.artist?.user?.username || 'Unknown').join(', ');
  }
  if (song.artist?.name) return song.artist.name;
  if (song.artistName) return song.artistName;
  return 'Unknown Artist';
}

// Helper to get cover art URL with fallback mechanism
export function getCoverArt(song) {
  if (!song) return '';
  if (song.coverArtUrl) {
    return getMediaUrl(song.coverArtUrl);
  }
  if (song.coverImage) {
    return getMediaUrl(song.coverImage);
  }
  // Fallback based on song ID
  const fallbacks = [
    'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?q=80&w=400&auto=format&fit=crop',
  ];
  const id = song.id || 1;
  return fallbacks[(id - 1) % fallbacks.length];
}

// Helper to format duration from milliseconds to mm:ss format
export function formatDuration(ms) {
  if (!ms) return '0:00';
  // Check if the value is in seconds or milliseconds
  // Normally durationMs is in ms. If it's a small value (e.g., under 10000) and not integer 0, it might be in seconds.
  const totalSec = typeof ms === 'number' && ms > 1000 ? Math.floor(ms / 1000) : Math.floor(ms);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
