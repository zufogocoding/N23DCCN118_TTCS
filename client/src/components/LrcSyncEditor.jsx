import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, SkipBack, StepForward } from 'lucide-react';

function stripLrcTime(line) {
  return line.replace(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g, '').trim();
}

function formatLrcTime(seconds) {
  const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds - minutes * 60;
  const wholeSeconds = Math.floor(rest);
  const centiseconds = Math.floor((rest - wholeSeconds) * 100);
  return `[${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}]`;
}

function valueToPlainLines(value) {
  return (value || '')
    .split('\n')
    .map(stripLrcTime)
    .filter(Boolean);
}

export default function LrcSyncEditor({ audioFile, value, onChange, rows = 6 }) {
  const audioRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [plainLyrics, setPlainLyrics] = useState(value || '');
  const [syncLines, setSyncLines] = useState([]);
  const [timedLines, setTimedLines] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSyncMode, setIsSyncMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!audioFile) {
      setAudioUrl('');
      return undefined;
    }

    const nextUrl = URL.createObjectURL(audioFile);
    setAudioUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [audioFile]);

  useEffect(() => {
    if (!isSyncMode) {
      setPlainLyrics(value || '');
    }
  }, [isSyncMode, value]);

  const nextLine = syncLines[currentIndex] || '';
  const progressText = useMemo(() => {
    if (!syncLines.length) return '0/0';
    return `${Math.min(currentIndex + 1, syncLines.length)}/${syncLines.length}`;
  }, [currentIndex, syncLines.length]);

  const startSync = () => {
    const lines = valueToPlainLines(plainLyrics);
    setSyncLines(lines);
    setTimedLines([]);
    setCurrentIndex(0);
    setIsSyncMode(true);
    onChange('');
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const exitSync = () => {
    setIsSyncMode(false);
    setIsPlaying(false);
    audioRef.current?.pause();
  };

  const resetSync = () => {
    setTimedLines([]);
    setCurrentIndex(0);
    onChange('');
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const togglePlayback = async () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      await audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const stampCurrentLine = () => {
    if (!audioRef.current || !nextLine) return;
    const stampedLine = `${formatLrcTime(audioRef.current.currentTime)} ${nextLine}`;
    const nextTimedLines = [...timedLines, stampedLine];
    setTimedLines(nextTimedLines);
    setCurrentIndex((idx) => Math.min(idx + 1, syncLines.length));
    onChange(nextTimedLines.join('\n'));
  };

  const backOneLine = () => {
    if (timedLines.length === 0) return;
    const nextTimedLines = timedLines.slice(0, -1);
    setTimedLines(nextTimedLines);
    setCurrentIndex((idx) => Math.max(0, idx - 1));
    onChange(nextTimedLines.join('\n'));
  };

  const handleManualChange = (nextValue) => {
    setPlainLyrics(nextValue);
    onChange(nextValue);
  };

  return (
    <div className="space-y-3">
      <textarea
        rows={rows}
        placeholder="Nhập lời thường, sau đó chọn file nhạc và bấm Đồng bộ LRC..."
        value={isSyncMode ? timedLines.join('\n') : plainLyrics}
        onChange={(e) => handleManualChange(e.target.value)}
        disabled={isSyncMode}
        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3.5 text-sm outline-none focus:border-[#00e6e6]/50 transition-colors resize-y placeholder-[#555] custom-scrollbar disabled:opacity-70"
      />

      <div className="rounded-xl border border-white/10 bg-[#0d0f10] p-4 space-y-3 shadow-inner">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white">Đồng bộ lyric LRC</p>
            <p className="text-xs text-[#888]">Phát nhạc, tới câu nào thì bấm gắn mốc thời gian.</p>
          </div>
          <button
            type="button"
            onClick={isSyncMode ? exitSync : startSync}
            disabled={!audioFile || (!plainLyrics.trim() && !isSyncMode)}
            className="px-4 py-2 rounded-lg bg-[#00e6e6] text-black text-sm font-bold hover:bg-[#24f0f0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSyncMode ? 'Xong' : 'Đồng bộ LRC'}
          </button>
        </div>

        {audioUrl ? (
          <audio
            ref={audioRef}
            src={audioUrl}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onEnded={() => setIsPlaying(false)}
            controls
            className="w-full h-10"
          />
        ) : (
          <p className="text-xs font-semibold text-amber-400">Cần chọn file nhạc trước khi đồng bộ timestamp.</p>
        )}

        {isSyncMode && (
          <div className="space-y-3">
            <div className="rounded-lg bg-[#121212] border border-[#2f3f40] p-4 min-h-[86px]">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-xs font-semibold text-[#00e6e6]">{progressText}</span>
                <span className="text-xs text-[#888]">Dòng đang chờ gắn mốc</span>
              </div>
              <p className="text-lg font-bold text-white leading-snug">
                {nextLine || 'Đã gắn hết lyric'}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={togglePlayback}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-semibold"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                {isPlaying ? 'Dừng' : 'Phát'}
              </button>
              <button
                type="button"
                onClick={stampCurrentLine}
                disabled={!nextLine}
                className="md:col-span-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#00e6e6]/15 text-[#00e6e6] hover:bg-[#00e6e6]/25 text-sm font-bold disabled:opacity-40"
              >
                <StepForward size={16} />
                Gắn mốc dòng này
              </button>
              <button
                type="button"
                onClick={backOneLine}
                disabled={timedLines.length === 0}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-semibold disabled:opacity-40"
              >
                <SkipBack size={16} />
                Lùi
              </button>
              <button
                type="button"
                onClick={resetSync}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/15 text-sm font-semibold"
              >
                <RotateCcw size={16} />
                Làm lại
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
