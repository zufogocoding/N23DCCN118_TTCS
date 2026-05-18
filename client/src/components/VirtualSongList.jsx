import { Virtuoso } from 'react-virtuoso';
import { Heart, Play } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';

export default function VirtualSongList({ songs, loadMore, hasMore, scrollContainerId }) {
  const { playSong } = usePlayer();

  const handleEndReached = () => {
    if (hasMore && loadMore) {
      loadMore();
    }
  };

  return (
    <Virtuoso
      useWindowScroll={!scrollContainerId}
      customScrollParent={
        scrollContainerId 
          ? document.getElementById(scrollContainerId) 
          : undefined
      }
      data={songs}
      endReached={handleEndReached}
      overscan={200}
      itemContent={(index, song) => (
        <div className="flex items-center justify-between p-3 rounded-md hover:bg-[#282828] group transition-colors cursor-pointer" onClick={() => playSong(song, songs)}>
          <div className="flex items-center gap-4">
            <img src={song.coverArtUrl ? `http://localhost:9000${song.coverArtUrl}` : '/default-cover.png'} alt="cover" className="w-12 h-12 rounded-sm object-cover" />
            <div>
              <h4 className="text-white font-semibold group-hover:underline">{song.title}</h4>
              <p className="text-sm text-[#a0a0a0] hover:underline">
                {song.artistName || (song.artists && song.artists[0]?.artist?.user?.username) || 'Unknown Artist'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <Heart size={20} className="text-[#a0a0a0] hover:text-white" />
            <button className="w-10 h-10 rounded-full bg-[#1ed760] flex items-center justify-center text-black hover:scale-105 transition-transform">
              <Play size={20} fill="currentColor" className="ml-1" />
            </button>
          </div>
        </div>
      )}
    />
  );
}
