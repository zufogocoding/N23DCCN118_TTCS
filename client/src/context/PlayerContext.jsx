/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { api } from '../utils/api';

const PlayerContext = createContext();

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
  const audioRef = useRef(new Audio());

  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const [volume, setVolume] = useState(1); // 0.0 to 1.0
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;

    const setAudioData = () => setDuration(audio.duration);
    const setAudioTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => playNext();

    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', handleEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, queue, isRepeat, isShuffle]);

  // Cập nhật âm lượng
  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  // Hàm Play/Pause
  const togglePlay = () => {
    if (!currentSong) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Hàm phát một bài cụ thể
  function playSong(song, playlist = queue) {
    setCurrentSong(song);
    setQueue(playlist);
    setCurrentIndex(playlist.findIndex(s => s.id === song.id));

    // Sử dụng streaming API endpoint
    const streamUrl = `/api/songs/${song.id}/stream`;
    audioRef.current.src = streamUrl;
    audioRef.current.play().catch(() => {
      // Nếu lỗi (ví dụ file không tồn tại), vẫn set state đúng
      console.warn('Không thể phát bài hát này');
    });
    setIsPlaying(true);

    // Call API để tracking lượt nghe
    const userStr = localStorage.getItem('user');
    if (userStr) {
      api.post('/api/interactions/listen', {
        songId: song.id,
        durationPlayed: 0, // Tạm thời gửi 0, chỉ để tăng playCount
        isSkipped: false
      }).catch(err => console.error('Track listen error:', err));
    } else {
      // Lưu lịch sử cục bộ cho Guest
      try {
        const guestRecent = JSON.parse(localStorage.getItem('guest_recent_songs') || '[]');
        const updatedRecent = [
          song,
          ...guestRecent.filter(s => s.id !== song.id)
        ].slice(0, 20); // Giữ tối đa 20 bài gần nhất
        localStorage.setItem('guest_recent_songs', JSON.stringify(updatedRecent));
        
        // Kích hoạt custom event để các component đang lắng nghe (như Home) biết và cập nhật lại
        window.dispatchEvent(new Event('guestHistoryUpdated'));
      } catch (err) {
        console.error('Error saving guest recent history:', err);
      }
    }
  }

  function playNext(isManual = false) {
    if (queue.length === 0) return;
    
    if (isRepeat && !isManual) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      return;
    }

    let nextIndex = currentIndex + 1;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
      // Tránh chọn lại bài hiện tại nếu danh sách > 1
      if (queue.length > 1 && nextIndex === currentIndex) {
        nextIndex = (nextIndex + 1) % queue.length;
      }
    } else if (nextIndex >= queue.length) {
      nextIndex = 0; // Quay lại bài đầu nếu hết danh sách
    }

    playSong(queue[nextIndex], queue);
  }

  function playPrev(isManual = false) {
    if (queue.length === 0) return;
    // Nếu đang phát quá 3 giây, nút prev sẽ tua lại từ đầu bài thay vì qua bài trước
    if (currentTime > 3 && isManual) {
      audioRef.current.currentTime = 0;
      return;
    }
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) prevIndex = queue.length - 1;
    playSong(queue[prevIndex], queue);
  };

  const handleSeek = (time) => {
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const addToQueueNext = (song) => {
    setQueue(prev => {
      const newQueue = [...prev];
      // Chèn vào ngay sau currentIndex
      const insertIdx = currentIndex >= 0 ? currentIndex + 1 : 0;
      newQueue.splice(insertIdx, 0, song);
      return newQueue;
    });
    // Nếu chưa có bài nào đang phát, phát luôn
    if (!currentSong) {
      playSong(song, [song]);
    }
  };

  const addToQueueEnd = (song) => {
    setQueue(prev => [...prev, song]);
    if (!currentSong) {
      playSong(song, [song]);
    }
  };

  const removeFromQueue = (index) => {
    setQueue(prev => {
      const newQueue = [...prev];
      newQueue.splice(index, 1);
      return newQueue;
    });
    // Cập nhật lại currentIndex nếu xóa bài trước đó
    if (index < currentIndex) {
      setCurrentIndex(prev => prev - 1);
    } else if (index === currentIndex) {
      // Nếu xóa bài đang phát, qua bài tiếp theo (nếu còn)
      if (queue.length > 1) {
        playNext(true);
      } else {
        // Hết queue
        audioRef.current.pause();
        setCurrentSong(null);
        setIsPlaying(false);
        setCurrentIndex(-1);
      }
    }
  };

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
