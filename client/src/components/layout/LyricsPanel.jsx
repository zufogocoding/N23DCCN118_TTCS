import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { getCoverArt } from '../../utils/songHelpers';
import { api } from '../../utils/api';

function parseLrc(lrcText) {
  if (!lrcText) return null;
  const lines = lrcText.split('\n');
  const result = [];
  const timeReg = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
  let isLrc = false;

  lines.forEach((line) => {
    const matches = [...line.matchAll(timeReg)];
    if (matches.length > 0) {
      const text = line.replace(timeReg, '').trim();
      if (text) {
        isLrc = true;
        matches.forEach((match) => {
          const min = parseInt(match[1], 10);
          const sec = parseInt(match[2], 10);
          const fraction = match[3] || '0';
          const ms = parseInt(fraction.padEnd(3, '0').slice(0, 3), 10);
          const time = min * 60 + sec + ms / 1000;
          result.push({ time, text, original: line });
        });
      }
    }
  });

  if (!isLrc) return null;
  return result.sort((a, b) => a.time - b.time);
}

export default function LyricsPanel({ isOpen, onClose }) {
  const { currentSong, currentTime, handleSeek } = usePlayer();
  const [lyrics, setLyrics] = useState(null);
  const [lyricsText, setLyricsText] = useState('');
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);

  useEffect(() => {
    const loadInlineLyrics = currentSong?.lyrics;
    setLyricsText(loadInlineLyrics || '');
    setLyrics(loadInlineLyrics ? parseLrc(loadInlineLyrics) : null);
    setActiveIndex(-1);
  }, [currentSong]);

  useEffect(() => {
    let cancelled = false;

    const fetchLyrics = async () => {
      if (!currentSong?.id || currentSong?.lyrics) return;
      setLoadingLyrics(true);
      try {
        const res = await api.get(`/api/songs/${currentSong.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const fetchedLyrics = data.lyrics || '';
        setLyricsText(fetchedLyrics);
        setLyrics(parseLrc(fetchedLyrics));
      } catch (err) {
        console.error('Failed to load lyrics:', err);
      } finally {
        if (!cancelled) setLoadingLyrics(false);
      }
    };

    fetchLyrics();
    return () => {
      cancelled = true;
    };
  }, [currentSong?.id, currentSong?.lyrics]);

  useEffect(() => {
    if (!isOpen || !lyrics || lyrics.length === 0) return;

    let newActiveIndex = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time - 0.2) {
        newActiveIndex = i;
      } else {
        break;
      }
    }

    if (newActiveIndex !== activeIndex) {
      setActiveIndex(newActiveIndex);

      if (newActiveIndex !== -1 && containerRef.current) {
        const activeEl = containerRef.current.querySelector(`[data-index="${newActiveIndex}"]`);
        activeEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTime, lyrics, isOpen, activeIndex]);

  if (!isOpen) return null;

  const coverArt = currentSong ? getCoverArt(currentSong) : null;

  return (
    <div className="w-[450px] bg-[#101112] border-l border-white/10 h-full flex flex-col shadow-2xl z-40 absolute right-0 top-0 pb-[96px] overflow-hidden">
      {coverArt && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center opacity-35 blur-3xl scale-110 transition-all duration-1000"
            style={{ backgroundImage: `url(${coverArt})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-[#101112]/85 to-[#101112]" />
        </>
      )}

      <div className="relative z-10 flex items-center justify-between p-6 border-b border-white/10 bg-black/25 backdrop-blur-md">
        <div className="min-w-0">
          <h2 className="text-lg font-black text-white">Lời bài hát</h2>
          {currentSong && (
            <p className="text-xs text-white/45 truncate mt-1">{currentSong.title}</p>
          )}
        </div>
        <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors shrink-0">
          <X size={20} />
        </button>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 py-8 no-scrollbar" ref={containerRef}>
        {!currentSong ? (
          <div className="text-center text-white/50 font-bold mt-20 text-lg">Chưa phát bài nào</div>
        ) : loadingLyrics ? (
          <div className="text-center text-white/50 font-bold mt-20 text-lg">Đang tải lời bài hát...</div>
        ) : !lyricsText ? (
          <div className="text-center text-white/50 font-bold mt-20 text-lg">Bài hát này chưa có lời</div>
        ) : !lyrics ? (
          <div className="whitespace-pre-wrap text-xl font-semibold text-white/85 leading-loose px-2">
            {lyricsText}
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-[36vh]">
            {lyrics.map((line, index) => {
              const isActive = index === activeIndex;
              const isPast = index < activeIndex;
              const distance = Math.abs(index - activeIndex);
              const isNear = distance === 1;

              return (
                <button
                  type="button"
                  key={index}
                  data-index={index}
                  onClick={() => handleSeek(line.time)}
                  className={`w-full text-left px-2 py-2 transition-all duration-500 ease-out transform origin-left ${
                    isActive
                      ? 'text-3xl font-black text-white drop-shadow-[0_0_16px_rgba(255,255,255,0.22)] scale-[1.02]'
                      : isPast
                        ? `${isNear ? 'text-2xl text-white/55' : 'text-xl text-white/30'} font-bold hover:text-white/75`
                        : `${isNear ? 'text-2xl text-white/45' : 'text-xl text-white/25'} font-bold hover:text-white/70`
                  }`}
                  style={{
                    filter: isActive || isNear ? 'blur(0px)' : 'blur(0.25px)',
                  }}
                >
                  <span className="block leading-snug">{line.text}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
