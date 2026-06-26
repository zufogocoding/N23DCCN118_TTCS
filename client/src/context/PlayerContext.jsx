/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

const PlayerContext = createContext();

export const usePlayer = () => useContext(PlayerContext);

const safeGet = (key, fallback) => {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val : fallback;
  } catch {
    return fallback;
  }
};

const safeSet = (key, val) => {
  try {
    localStorage.setItem(key, val);
  } catch (e) {
    console.warn('Failed to write to localStorage:', e);
  }
};

const safeRemove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('Failed to remove from localStorage:', e);
  }
};

export const PlayerProvider = ({ children }) => {
  const audioRef = useRef(new Audio());
  const lastSaveTimeRef = useRef(0);
  const { user } = useAuth();

  const [currentSong, setCurrentSong] = useState(() => {
    const saved = safeGet('player_current_song', null);
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState(() => {
    const saved = safeGet('player_queue', null);
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentIndex, setCurrentIndex] = useState(() => {
    const saved = safeGet('player_current_index', '-1');
    return parseInt(saved, 10);
  });

  const [volume, setVolume] = useState(() => {
    const saved = safeGet('player_volume', '1');
    return parseFloat(saved);
  });
  const [currentTime, setCurrentTime] = useState(() => {
    const saved = safeGet('player_current_time', '0');
    return parseFloat(saved);
  });
  const [duration, setDuration] = useState(0);

  const [isShuffle, setIsShuffle] = useState(() => {
    return safeGet('player_is_shuffle', 'false') === 'true';
  });
  const [isRepeat, setIsRepeat] = useState(() => {
    return safeGet('player_is_repeat', 'false') === 'true';
  });

  const currentIndexRef = useRef(currentIndex);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Restore currentSong and currentTime on initial mount
  useEffect(() => {
    if (!currentSong) return;

    audioRef.current.src = `/api/songs/${currentSong.id}/stream`;

    const handleLoadedMetadata = () => {
      try {
        const savedTime = safeGet('player_current_time', '0');
        const parsedTime = parseFloat(savedTime);
        if (!isNaN(parsedTime) && parsedTime > 0) {
          audioRef.current.currentTime = parsedTime;
          setCurrentTime(parsedTime);
        }
      } catch (e) {
        console.error('Failed to restore playback time:', e);
      }
    };

    const audio = audioRef.current;
    audio.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    if (currentSong) {
      safeSet('player_current_song', JSON.stringify(currentSong));
    } else {
      safeRemove('player_current_song');
      safeRemove('player_current_time');
    }
  }, [currentSong]);

  useEffect(() => {
    safeSet('player_queue', JSON.stringify(queue));
  }, [queue]);

  useEffect(() => {
    safeSet('player_current_index', currentIndex.toString());
  }, [currentIndex]);

  useEffect(() => {
    safeSet('player_volume', volume.toString());
  }, [volume]);

  useEffect(() => {
    safeSet('player_is_shuffle', isShuffle.toString());
  }, [isShuffle]);

  useEffect(() => {
    safeSet('player_is_repeat', isRepeat.toString());
  }, [isRepeat]);

  // Cập nhật âm lượng
  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  // Sync current time on unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (audioRef.current) {
        safeSet('player_current_time', audioRef.current.currentTime.toString());
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const togglePlay = useCallback(() => {
    if (!currentSong) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [currentSong, isPlaying]);

  const trackListen = useCallback((songId) => {
    if (user?.id) {
      api.post('/api/interactions/listen', {
        songId,
        durationPlayed: 0,
        isSkipped: false
      }).catch(err => console.error('Track listen error:', err));
    } else {
      try {
        const guestRecent = JSON.parse(localStorage.getItem('guest_recent_songs') || '[]');
        const updatedRecent = [
          { id: songId },
          ...guestRecent.filter(s => s.id !== songId)
        ].slice(0, 20);
        localStorage.setItem('guest_recent_songs', JSON.stringify(updatedRecent));
        window.dispatchEvent(new Event('guestHistoryUpdated'));
      } catch (err) {
        console.error('Error saving guest recent history:', err);
      }
    }
  }, [user?.id]);

  const playSong = useCallback((song, playlist = queue) => {
    setCurrentSong(song);
    setQueue(playlist);
    const idx = playlist.findIndex(s => s.id === song.id);
    setCurrentIndex(idx);

    audioRef.current.src = `/api/songs/${song.id}/stream`;
    audioRef.current.play().catch(() => {
      console.warn('Không thể phát bài hát này');
    });
    setIsPlaying(true);

    trackListen(song.id);
  }, [queue, trackListen]);

  const playNext = useCallback((isManual = false) => {
    if (queue.length === 0) return;

    if (isRepeat && !isManual) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      return;
    }

    let nextIndex = currentIndex + 1;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
      if (queue.length > 1 && nextIndex === currentIndex) {
        nextIndex = (nextIndex + 1) % queue.length;
      }
    } else if (nextIndex >= queue.length) {
      nextIndex = 0;
    }

    playSong(queue[nextIndex], queue);
  }, [queue, isRepeat, isShuffle, currentIndex, playSong]);

  const playNextRef = useRef(playNext);
  useEffect(() => { playNextRef.current = playNext; }, [playNext]);

  const playPrev = useCallback((isManual = false) => {
    if (queue.length === 0) return;
    if (currentTime > 3 && isManual) {
      audioRef.current.currentTime = 0;
      return;
    }
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) prevIndex = queue.length - 1;
    playSong(queue[prevIndex], queue);
  }, [queue, currentTime, currentIndex, playSong]);

  const handleSeek = useCallback((time) => {
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const formatTime = useCallback((time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, []);

  const addToQueueNext = useCallback((song) => {
    setQueue(prev => {
      const newQueue = [...prev];
      const insertIdx = currentIndex >= 0 ? currentIndex + 1 : 0;
      newQueue.splice(insertIdx, 0, song);
      return newQueue;
    });
    if (!currentSong) {
      playSong(song, [song]);
    }
  }, [currentIndex, currentSong, playSong]);

  const addToQueueEnd = useCallback((song) => {
    setQueue(prev => [...prev, song]);
    if (!currentSong) {
      playSong(song, [song]);
    }
  }, [currentSong, playSong]);

  const removeFromQueue = useCallback((index) => {
    setQueue(prevQueue => {
      const newQueue = [...prevQueue];
      newQueue.splice(index, 1);
      const ci = currentIndexRef.current;

      if (newQueue.length === 0) {
        audioRef.current.pause();
        setCurrentSong(null);
        setIsPlaying(false);
        setCurrentIndex(-1);
      } else if (index === ci) {
        let nextIndex = index;
        if (nextIndex >= newQueue.length) {
          nextIndex = 0;
        }

        const nextSong = newQueue[nextIndex];
        setCurrentSong(nextSong);
        setCurrentIndex(nextIndex);

        audioRef.current.src = `/api/songs/${nextSong.id}/stream`;
        audioRef.current.play().catch(() => {
          console.warn('Không thể phát bài hát này');
        });
        setIsPlaying(true);

        trackListen(nextSong.id);
      } else if (index < ci) {
        setCurrentIndex(prevIndex => prevIndex - 1);
      }

      return newQueue;
    });
  }, [trackListen]);

  useEffect(() => {
    const audio = audioRef.current;

    const setAudioData = () => setDuration(audio.duration);
    const setAudioTime = () => {
      const time = audio.currentTime;
      setCurrentTime(time);
      const now = Date.now();
      if (now - lastSaveTimeRef.current > 2000) {
        safeSet('player_current_time', time.toString());
        lastSaveTimeRef.current = now;
      }
    };
    const handleEnded = () => playNextRef.current();

    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentIndex, queue, isRepeat, isShuffle]);

  return (
    <PlayerContext.Provider value={{
      currentSong, isPlaying, volume, currentTime, duration, isShuffle, isRepeat,
      queue, currentIndex,
      setVolume, togglePlay, playSong,
      playNext: () => playNext(true),
      playPrev: () => playPrev(true),
      handleSeek, formatTime,
      addToQueueNext, addToQueueEnd, removeFromQueue,
      toggleShuffle: () => {
        const next = !isShuffle;
        setIsShuffle(next);
        if (next) setIsRepeat(false);
      },
      toggleRepeat: () => {
        const next = !isRepeat;
        setIsRepeat(next);
        if (next) setIsShuffle(false);
      }
    }}>
      {children}
    </PlayerContext.Provider>
  );
};
