import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, Play, Plus, FolderPlus, X, AlertCircle, Info } from 'lucide-react';
import { SearchResultItem, TrackReference } from '../models/types';
import { YouTubeSearchService } from '../services/youtubeSearch';
import { playlistService } from '../services/playlistService';
import { LocalStorageManager } from '../storage/localStore';

interface SearchPageProps {
  onPlayTrack: (track: TrackReference) => void;
  onOpenAddToPlaylist: (track: TrackReference) => void;
  initialQuery?: string;
  onNavigateToSettings: () => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  onPlayTrack,
  onOpenAddToPlaylist,
  initialQuery = '',
  onNavigateToSettings,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const debounceTimerRef = useRef<any>(null);

  const apiKey = LocalStorageManager.getSettings().apiKey;

  const performSearch = async (q: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await YouTubeSearchService.search(q, apiKey);
      setResults(res.items);
      if (res.error) {
        setErrorMsg(res.error);
      }
    } catch {
      setErrorMsg('Đã có lỗi xảy ra trong quá trình tìm kiếm.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query.trim()) {
      performSearch('');
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(query);
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, apiKey]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      performSearch(query);
    }
  };

  const toTrackRef = (item: SearchResultItem): TrackReference => ({
    videoId: item.videoId,
    title: item.title,
    channelTitle: item.channelTitle,
    thumbnailUrl: item.thumbnailUrl,
    addedAt: Date.now(),
  });

  return (
    <div className="p-5 max-w-4xl mx-auto space-y-4 select-none text-xs">
      {/* Search Bar (Command Line Aesthetic) */}
      <div className="relative">
        <SearchIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          autoFocus
          placeholder="Tìm bài hát, nghệ sĩ hoặc dán trực tiếp link..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-[#111114] border border-white/[0.08] rounded pl-9 pr-8 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500 font-mono transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-zinc-500 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Notice Banner if without API Key */}
      {!apiKey && (
        <div className="bg-[#14130d] border border-amber-900/40 rounded p-2.5 flex items-start justify-between gap-3 text-[11px] text-amber-200/80">
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Chế độ Direct Link & Gợi ý. Bạn có thể dán link YouTube bất kỳ để nghe ngay, hoặc thêm API Key trong Cài đặt để tìm kiếm tự do.
            </span>
          </div>
          <button
            onClick={onNavigateToSettings}
            className="text-[10px] font-mono underline text-amber-300 hover:text-white shrink-0"
          >
            Cài đặt
          </button>
        </div>
      )}

      {/* Error notification banner */}
      {errorMsg && (
        <div className="bg-red-950/30 border border-red-900/40 rounded p-2.5 flex items-center gap-2 text-[11px] text-red-300 font-mono">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 border-b border-white/[0.05] pb-1">
        <span>KẾT QUẢ ({results.length})</span>
        {isLoading && (
          <span className="flex items-center gap-1.5 text-red-400">
            <span className="w-2 h-2 border border-red-400 border-t-transparent rounded-full animate-spin" />
            ĐANG TÌM...
          </span>
        )}
      </div>

      {/* Results Table */}
      {results.length === 0 && !isLoading ? (
        <div className="py-16 text-center text-zinc-600 font-mono text-xs">
          Không tìm thấy bài hát phù hợp.
        </div>
      ) : (
        <div className="divide-y divide-white/[0.03] border border-white/[0.05] rounded-lg bg-[#0e0e11] overflow-hidden">
          {results.map((item, idx) => {
            const track = toTrackRef(item);
            return (
              <div
                key={item.videoId}
                onClick={() => onPlayTrack(track)}
                className="group flex items-center justify-between px-3 py-2 hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-3">
                  <span className="w-4 text-center font-mono text-[10px] text-zinc-600 group-hover:hidden">
                    {idx + 1}
                  </span>
                  <Play className="w-3.5 h-3.5 text-zinc-200 fill-current hidden group-hover:block shrink-0" />

                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    className="w-10 h-7 rounded object-cover bg-zinc-900 shrink-0"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-zinc-200 truncate group-hover:text-white" title={item.title}>
                      {item.title}
                    </p>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">{item.channelTitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playlistService.enqueueNext(track);
                    }}
                    className="px-2 py-0.5 text-[10px] font-mono text-zinc-400 hover:text-white rounded hover:bg-white/[0.06]"
                    title="Phát tiếp theo"
                  >
                    Kế tiếp
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playlistService.enqueueEnd(track);
                    }}
                    className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/[0.06]"
                    title="Thêm vào hàng đợi"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAddToPlaylist(track);
                    }}
                    className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/[0.06]"
                    title="Thêm vào playlist"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
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
