import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Clock, ArrowLeft } from 'lucide-react';
import { api } from '../../utils/api';
import { usePlayer } from '../../context/PlayerContext';
import { getArtistName, getCoverArt } from '../../utils/songHelpers';
import { getPrimaryArtistUserId } from '../../utils/artistNav';

export default function ChartDetail() {
  const { type } = useParams(); // DAILY, WEEKLY, MONTHLY
  const navigate = useNavigate();
  const { currentSong, isPlaying, playSong, pauseSong } = usePlayer();
  
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChart = async () => {
      try {
        const res = await api.get(`/api/charts/${type}`);
        if (res.ok) {
          const data = await res.json();
          setChart(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchChart();
  }, [type]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1ed760]"></div>
      </div>
    );
  }

  if (!chart) {
    return (
      <div className="p-8 text-center text-white">
        <h2>Không tìm thấy bảng xếp hạng</h2>
        <button onClick={() => navigate(-1)} className="mt-4 text-[#1ed760]">Quay lại</button>
      </div>
    );
  }

  const songs = chart.songs?.map(c => c.song) || [];
  const isPlayingThisChart = currentSong && songs.some(s => s.id === currentSong.id) && isPlaying;

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    if (isPlayingThisChart) {
      pauseSong();
    } else {
      playSong(songs[0], songs);
    }
  };

  const gradient = type === 'DAILY' ? 'from-[#8A2387] via-[#E94057] to-[#F27121]' : 
                   type === 'WEEKLY' ? 'from-[#00C9FF] to-[#92FE9D]' : 
                   'from-[#11998e] to-[#38ef7d]';

  const title = type === 'DAILY' ? 'Top 50 Ngày' : type === 'WEEKLY' ? 'Top 50 Tuần' : 'Top 50 Tháng';

  return (
    <div className="pb-20">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[#a0a0a0] hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} /> Quay lại
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-end gap-6 mb-8 mt-4">
        <div className={`w-48 h-48 md:w-56 md:h-56 shadow-2xl rounded-sm flex items-center justify-center bg-gradient-to-br ${gradient}`}>
          <h1 className="text-white font-bold text-4xl text-center px-4">{title}</h1>
        </div>
        <div className="flex-1 pb-2">
          <p className="text-sm font-bold text-white uppercase mb-2">Bảng xếp hạng</p>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6">{title}</h1>
          <p className="text-[#a0a0a0] text-sm mb-2">
            Cập nhật lần cuối: {new Date(chart.updateAt).toLocaleString()}
          </p>
          <p className="text-[#a0a0a0] text-sm">
            {songs.length} bài hát
          </p>
        </div>
      </div>

      {/* Play Button */}
      <div className="flex items-center gap-6 mb-8">
        <button 
          onClick={handlePlayAll}
          disabled={songs.length === 0}
          className="w-14 h-14 rounded-full bg-[#1ed760] hover:bg-[#1fdf64] hover:scale-105 flex items-center justify-center transition-all disabled:opacity-50 disabled:hover:scale-100"
        >
          {isPlayingThisChart ? <div className="w-4 h-4 bg-black rounded-sm" /> : <Play size={28} fill="black" color="black" className="ml-1" />}
        </button>
      </div>

      {/* Song List */}
      <div className="mt-8">
        {/* Table Header */}
        <div className="grid grid-cols-[40px_1fr_auto] md:grid-cols-[40px_1fr_auto_minmax(120px,200px)] gap-4 px-4 py-2 text-sm text-[#a0a0a0] border-b border-[#333] mb-4">
          <div className="text-center">#</div>
          <div>Tiêu đề</div>
          <div className="hidden md:block">Score</div>
          <div className="flex justify-end pr-8"><Clock size={16} /></div>
        </div>

        {/* Tracks */}
        <div className="flex flex-col gap-1">
          {chart.songs?.map((item, index) => {
            const song = item.song;
            const isCurrent = currentSong?.id === song.id;
            
            return (
              <div 
                key={song.id}
                onClick={() => playSong(song, songs)}
                className={`grid grid-cols-[40px_1fr_auto] md:grid-cols-[40px_1fr_auto_minmax(120px,200px)] gap-4 px-4 py-3 rounded-md hover:bg-white/10 group cursor-pointer items-center transition-colors ${isCurrent ? 'bg-white/10' : ''}`}
              >
                <div className="text-center text-[#a0a0a0] group-hover:hidden">
                  {isCurrent && isPlaying ? (
                    <div className="w-4 h-4 mx-auto flex items-end justify-center gap-0.5">
                      <div className="w-1 h-3 bg-[#1ed760] animate-bounce" style={{animationDelay: '0ms'}} />
                      <div className="w-1 h-4 bg-[#1ed760] animate-bounce" style={{animationDelay: '150ms'}} />
                      <div className="w-1 h-2 bg-[#1ed760] animate-bounce" style={{animationDelay: '300ms'}} />
                    </div>
                  ) : (
                    <span className={isCurrent ? 'text-[#1ed760]' : ''}>{item.rank}</span>
                  )}
                </div>
                <div className="hidden group-hover:block text-center text-white">
                  <Play size={16} fill="currentColor" className="mx-auto" />
                </div>

                <div className="flex items-center gap-3 min-w-0">
                  <img 
                    src={getCoverArt(song)} 
                    alt={song.title} 
                    className="w-10 h-10 object-cover rounded shadow"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium truncate ${isCurrent ? 'text-[#1ed760]' : 'text-white'}`}>
                      {song.title}
                    </p>
                    <p 
                      className="text-sm text-[#a0a0a0] truncate hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        const uid = getPrimaryArtistUserId(song);
                        if(uid) navigate(`/artist/${uid}`);
                      }}
                    >
                      {getArtistName(song)}
                    </p>
                  </div>
                </div>

                <div className="hidden md:flex items-center text-sm text-[#a0a0a0]">
                  {item.totalScore} streams
                </div>

                <div className="flex items-center justify-end text-sm text-[#a0a0a0] pr-4">
                  {Math.floor(song.durationMs / 60000)}:{Math.floor((song.durationMs % 60000) / 1000).toString().padStart(2, '0')}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
