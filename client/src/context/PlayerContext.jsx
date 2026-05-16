/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useRef, useEffect } from 'react';

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

  // Lắng nghe sự kiện từ thẻ audio
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
    const streamUrl = `http://localhost:9000/api/songs/${song.id}/stream`;
    audioRef.current.src = streamUrl;
    audioRef.current.play().catch(() => {
      // Nếu lỗi (ví dụ file không tồn tại), vẫn set state đúng
      console.warn('Không thể phát bài hát này');
    });
    setIsPlaying(true);

    // Call API để tracking lượt nghe
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        fetch('http://localhost:9000/api/interactions/listen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            songId: song.id,
            durationPlayed: 0, // Tạm thời gửi 0, chỉ để tăng playCount
            isSkipped: false
          })
        }).catch(err => console.error('Track listen error:', err));
      } catch (e) {
        console.error(e);
      }
    }
  }

  function playNext() {
    if (queue.length === 0) return;
    if (isRepeat) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      return;
    }

    let nextIndex = currentIndex + 1;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (nextIndex >= queue.length) {
      nextIndex = 0; // Quay lại bài đầu nếu hết danh sách
    }

    playSong(queue[nextIndex], queue);
  }

  function playPrev() {
    if (queue.length === 0) return;
    // Nếu đang phát quá 3 giây, nút prev sẽ tua lại từ đầu bài thay vì qua bài trước
    if (currentTime > 3) {
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

  // Format thời gian hiển thị (VD: 02:34)
  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <PlayerContext.Provider value={{
      currentSong, isPlaying, volume, currentTime, duration, isShuffle, isRepeat,
      setVolume, togglePlay, playSong, playNext, playPrev, handleSeek, formatTime,
      toggleShuffle: () => setIsShuffle(!isShuffle),
      toggleRepeat: () => setIsRepeat(!isRepeat)
    }}>
      {children}
    </PlayerContext.Provider>
  );
};
