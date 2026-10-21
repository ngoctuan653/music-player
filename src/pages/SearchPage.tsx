import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, Play, Plus, ListPlus, FolderPlus, X, AlertCircle, Info } from 'lucide-react';
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

    // Debounce search by 400ms
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
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Search Header Input */}
      <div className="relative">
        <SearchIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          autoFocus
          placeholder="Tìm bài hát, nghệ sĩ hoặc dán trực tiếp link / ID YouTube..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-[#1c1c1c] border border-[#333333] rounded-2xl pl-12 pr-10 py-3.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors shadow-inner"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white rounded-full hover:bg-[#333]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* API Notice / Info banner */}
      {!apiKey && (
        <div className="bg-[#1e1c14] border border-[#4d3e18] rounded-xl p-3.5 flex items-start gap-3 text-xs text-[#eed187]">
          <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-semibold text-amber-300">
              Chế độ tìm kiếm qua Link & Nhạc tuyển chọn (Chưa cấu hình API Key)
            </p>
            <p className="text-amber-200/80 leading-relaxed">
              Bạn có thể dán link video YouTube bất kỳ vào ô tìm kiếm để nghe ngay lập tức. Để tìm kiếm trực tiếp kho video YouTube, bạn có thể nhập <strong>YouTube Data API Key</strong> miễn phí của Google.
            </p>
          </div>
          <button
            onClick={onNavigateToSettings}
            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-medium rounded-lg shrink-0 transition-colors border border-amber-500/30"
          >
            Thêm API Key
          </button>
        </div>
      )}

      {/* Error notification banner */}
      {errorMsg && (
        <div className="bg-red-950/40 border border-red-800/50 rounded-xl p-3.5 flex items-center gap-3 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span className="flex-1">{errorMsg}</span>
        </div>
      )}

      {/* Search Results List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-400 px-3 pb-1 border-b border-[#252525]">
          <span>KẾT QUẢ TÌM KIẾM ({results.length})</span>
          {isLoading && (
            <span className="flex items-center gap-1.5 text-red-400">
              <span className="w-2.5 h-2.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
              Đang tìm kiếm...
            </span>
          )}
        </div>

        {results.length === 0 && !isLoading ? (
          <div className="py-16 text-center text-gray-500 text-xs space-y-2">
            <SearchIcon className="w-8 h-8 mx-auto text-gray-600 mb-2 opacity-50" />
            <p>Không tìm thấy kết quả phù hợp cho "{query}"</p>
            <p className="text-[11px] text-gray-600">
              Hãy thử tìm với từ khóa khác hoặc dán link video YouTube cụ thể.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {results.map((item) => {
              const track = toTrackRef(item);
              return (
                <div
                  key={item.videoId}
                  className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-[#1f1f1f] transition-colors border border-transparent hover:border-[#2d2d2d]"
                >
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                    <div className="relative w-16 h-10 rounded-lg overflow-hidden bg-[#222222] shrink-0 group-hover:shadow-md">
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => onPlayTrack(track)}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Phát ngay"
                      >
                        <Play className="w-4 h-4 text-white fill-white translate-x-0.5" />
                      </button>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        onClick={() => onPlayTrack(track)}
                        className="text-xs md:text-sm font-medium text-white truncate hover:underline cursor-pointer"
                        title={item.title}
                      >
                        {item.title}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5" title={item.channelTitle}>
                        {item.channelTitle}
                      </p>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={() => onPlayTrack(track)}
                      className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Phát bài này"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span className="hidden sm:inline">Phát</span>
                    </button>

                    <button
                      onClick={() => playlistService.enqueueNext(track)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2c2c2c] rounded-lg transition-colors"
                      title="Phát kế tiếp (Enqueue Next)"
                    >
                      <ListPlus className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => playlistService.enqueueEnd(track)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2c2c2c] rounded-lg transition-colors"
                      title="Thêm vào cuối hàng đợi"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onOpenAddToPlaylist(track)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2c2c2c] rounded-lg transition-colors"
                      title="Thêm vào playlist"
                    >
                      <FolderPlus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
