import { X, Play, Trash2 } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { getCoverArt } from '../../utils/songHelpers';

export default function QueuePanel({ isOpen, onClose }) {
  const { queue, currentIndex, playSong, removeFromQueue } = usePlayer();

  if (!isOpen) return null;

  return (
    <div className="w-[350px] bg-[#121212] border-l border-[#333] h-full flex flex-col shadow-2xl z-40 absolute right-0 top-0 pb-[96px]">
      <div className="flex items-center justify-between p-4 border-b border-[#333]">
        <h2 className="text-lg font-bold text-white">Danh sách phát</h2>
        <button onClick={onClose} className="p-1.5 hover:bg-[#282828] rounded-full text-[#a0a0a0] hover:text-white">
          <X size={20} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {queue.length === 0 ? (
          <div className="text-center text-[#a0a0a0] mt-10">
            Hàng đợi trống
          </div>
        ) : (
          queue.map((song, index) => {
            const isPlaying = index === currentIndex;
            return (
              <div 
                key={`${song.id}-${index}`} 
                className={`flex items-center gap-3 p-2 rounded-md group hover:bg-[#282828] transition-colors ${isPlaying ? 'bg-[#282828]' : ''}`}
              >
                <div className="relative w-10 h-10 shrink-0 cursor-pointer" onClick={() => playSong(song, queue)}>
                  <img src={getCoverArt(song)} alt="" className={`w-full h-full rounded object-cover ${isPlaying ? 'opacity-50' : 'group-hover:opacity-50'}`} />
                  {isPlaying ? (
                    <div className="absolute inset-0 flex items-center justify-center text-[#1db954]">
                      <Play size={16} fill="currentColor" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white opacity-0 group-hover:opacity-100">
                      <Play size={16} fill="currentColor" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => playSong(song, queue)}>
                  <p className={`text-sm font-semibold truncate ${isPlaying ? 'text-[#1db954]' : 'text-white'}`}>{song.title}</p>
                  <p className="text-xs text-[#a0a0a0] truncate">{song.artist?.name || song.artistName || 'Nghệ sĩ'}</p>
                </div>
                
                <button 
                  onClick={() => removeFromQueue(index)}
                  className="p-1.5 text-[#a0a0a0] hover:text-[#ff4d4f] opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Xóa khỏi danh sách"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
