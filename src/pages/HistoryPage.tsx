import React, { useEffect, useState } from 'react';
import { History as HistoryIcon, Trash2, Play, Plus, FolderPlus } from 'lucide-react';
import { TrackReference } from '../models/types';
import { LocalStorageManager } from '../storage/localStore';
import { playlistService } from '../services/playlistService';

interface HistoryPageProps {
  onPlayTrack: (track: TrackReference) => void;
  onOpenAddToPlaylist: (track: TrackReference) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  onPlayTrack,
  onOpenAddToPlaylist,
}) => {
  const [history, setHistory] = useState<TrackReference[]>([]);

  useEffect(() => {
    setHistory(LocalStorageManager.getHistory());
  }, []);

  const handleClearHistory = () => {
    if (confirm('Bạn có chắc muốn xóa toàn bộ lịch sử nghe nhạc?')) {
      LocalStorageManager.clearHistory();
      setHistory([]);
    }
  };

  return (
    <div className="p-5 max-w-4xl mx-auto space-y-4 select-none text-xs">
      <div className="flex items-center justify-between border-b border-white/[0.05] pb-2">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
          <HistoryIcon className="w-3.5 h-3.5 text-red-500" />
          <span>LỊCH SỬ NGHE ({history.length})</span>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.04] hover:bg-red-950/30 text-zinc-400 hover:text-red-400 font-mono text-[10px] transition-colors border border-white/[0.06]"
          >
            <Trash2 className="w-3 h-3" />
            <span>XÓA LỊCH SỬ</span>
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="py-20 text-center text-zinc-600 font-mono">
          Chưa có lịch sử bài hát nào.
        </div>
      ) : (
        <div className="divide-y divide-white/[0.03] border border-white/[0.05] rounded-lg bg-[#0e0e11] overflow-hidden">
          {history.map((track, idx) => (
            <div
              key={`${track.videoId}_${idx}`}
              onClick={() => onPlayTrack(track)}
              className="group flex items-center justify-between px-3 py-2 hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-3">
                <span className="w-4 text-center font-mono text-[10px] text-zinc-600 group-hover:hidden">
                  {idx + 1}
                </span>
                <Play className="w-3.5 h-3.5 text-zinc-200 fill-current hidden group-hover:block shrink-0" />

                <img
                  src={track.thumbnailUrl}
                  alt=""
                  className="w-10 h-7 rounded object-cover bg-zinc-900 shrink-0"
                />

                <div className="min-w-0 flex-1">
                  <p className="text-xs text-zinc-200 truncate group-hover:text-white" title={track.title}>
                    {track.title}
                  </p>
                  <p className="text-[10px] text-zinc-500 truncate mt-0.5">{track.channelTitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playlistService.enqueueEnd(track);
                  }}
                  className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/[0.05]"
                  title="Thêm vào hàng đợi"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAddToPlaylist(track);
                  }}
                  className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/[0.05]"
                  title="Thêm vào playlist"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
