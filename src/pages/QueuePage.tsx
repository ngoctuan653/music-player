import React, { useEffect, useState } from 'react';
import { ListMusic, Trash2, Play, Volume2, X } from 'lucide-react';
import { TrackReference } from '../models/types';
import { playlistService } from '../services/playlistService';

export const QueuePage: React.FC = () => {
  const [queue, setQueue] = useState<TrackReference[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  useEffect(() => {
    return playlistService.subscribeQueue((q, idx) => {
      setQueue(q);
      setCurrentIndex(idx);
    });
  }, []);

  const handlePlayIndex = (idx: number) => {
    playlistService.playIndex(idx);
  };

  const handleRemove = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    playlistService.removeFromQueue(idx);
  };

  const handleClear = () => {
    playlistService.clearQueue();
  };

  return (
    <div className="p-5 max-w-4xl mx-auto space-y-4 select-none text-xs">
      <div className="flex items-center justify-between border-b border-white/[0.05] pb-2">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
          <ListMusic className="w-3.5 h-3.5 text-red-500" />
          <span>HÀNG ĐỢI PHÁT ({queue.length})</span>
        </div>

        {queue.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.04] hover:bg-red-950/30 text-zinc-400 hover:text-red-400 font-mono text-[10px] transition-colors border border-white/[0.06]"
          >
            <Trash2 className="w-3 h-3" />
            <span>XÓA DANH SÁCH</span>
          </button>
        )}
      </div>

      {queue.length === 0 ? (
        <div className="py-20 text-center text-zinc-600 font-mono">
          Hàng đợi đang trống. Hãy chọn bài hát để phát.
        </div>
      ) : (
        <div className="divide-y divide-white/[0.03] border border-white/[0.05] rounded-lg bg-[#0e0e11] overflow-hidden">
          {queue.map((track, idx) => {
            const isPlaying = idx === currentIndex;
            return (
              <div
                key={`${track.videoId}_${idx}`}
                onClick={() => handlePlayIndex(idx)}
                className={`group flex items-center justify-between px-3 py-2 transition-colors cursor-pointer ${
                  isPlaying
                    ? 'bg-red-500/10 text-white font-medium'
                    : 'hover:bg-white/[0.03] text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-3">
                  <div className="w-4 text-center font-mono text-[10px] shrink-0">
                    {isPlaying ? (
                      <Volume2 className="w-3.5 h-3.5 text-red-500 animate-pulse mx-auto" />
                    ) : (
                      <span className="text-zinc-600 group-hover:hidden">{idx + 1}</span>
                    )}
                    {!isPlaying && (
                      <Play className="w-3 h-3 text-zinc-300 fill-current hidden group-hover:block mx-auto" />
                    )}
                  </div>

                  <img
                    src={track.thumbnailUrl}
                    alt=""
                    className="w-10 h-7 rounded object-cover bg-zinc-900 shrink-0"
                  />

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs truncate ${isPlaying ? 'text-red-400' : 'text-zinc-200'}`}
                      title={track.title}
                    >
                      {track.title}
                    </p>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">{track.channelTitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => handleRemove(idx, e)}
                    className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-white/[0.05]"
                    title="Xóa khỏi hàng đợi"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
