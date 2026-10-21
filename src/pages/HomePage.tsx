import React, { useState, useEffect } from 'react';
import { Play, Plus, Clock, Link as LinkIcon, Compass, FolderPlus } from 'lucide-react';
import { TrackReference, SearchResultItem } from '../models/types';
import { YouTubeSearchService } from '../services/youtubeSearch';
import { playlistService } from '../services/playlistService';
import { LocalStorageManager } from '../storage/localStore';

interface HomePageProps {
  onPlayTrack: (track: TrackReference) => void;
  onOpenAddToPlaylist: (track: TrackReference) => void;
  onNavigateToSearch: (query?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onPlayTrack,
  onOpenAddToPlaylist,
  onNavigateToSearch,
}) => {
  const [quickUrl, setQuickUrl] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [history, setHistory] = useState<TrackReference[]>([]);
  const [curatedTracks, setCuratedTracks] = useState<SearchResultItem[]>([]);

  useEffect(() => {
    setHistory(LocalStorageManager.getHistory().slice(0, 6));
    setCuratedTracks(YouTubeSearchService.getCuratedTracks());
  }, []);

  const handleQuickPlayUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUrl.trim()) return;

    setIsLoadingUrl(true);
    setUrlError(null);

    const videoId = YouTubeSearchService.extractVideoId(quickUrl);
    if (!videoId) {
      setUrlError('Link hoặc video ID không hợp lệ.');
      setIsLoadingUrl(false);
      return;
    }

    try {
      const info = await YouTubeSearchService.fetchInfoViaOEmbed(videoId);
      const track: TrackReference = {
        videoId: info.videoId,
        title: info.title,
        channelTitle: info.channelTitle,
        thumbnailUrl: info.thumbnailUrl,
        addedAt: Date.now(),
      };
      onPlayTrack(track);
      setQuickUrl('');
    } catch {
      setUrlError('Không thể lấy metadata của link này.');
    } finally {
      setIsLoadingUrl(false);
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
    <div className="p-5 max-w-4xl mx-auto space-y-6 select-none text-xs">
      {/* Quick Stream Input (Studio Command Bar) */}
      <div className="bg-[#111114] border border-white/[0.06] rounded-lg p-3">
        <form onSubmit={handleQuickPlayUrl} className="flex items-center gap-2">
          <div className="relative flex-1">
            <LinkIcon className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Dán link YouTube (watch?v=, youtu.be, shorts) hoặc video ID..."
              value={quickUrl}
              onChange={(e) => {
                setQuickUrl(e.target.value);
                setUrlError(null);
              }}
              className="w-full bg-[#0a0a0c] border border-white/[0.06] rounded pl-8 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500 font-mono transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isLoadingUrl || !quickUrl.trim()}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-medium rounded flex items-center gap-1.5 transition-colors shrink-0 text-xs shadow-sm"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>{isLoadingUrl ? 'Đang mở...' : 'Phát'}</span>
          </button>
        </form>
        {urlError && <p className="text-[11px] text-red-400 mt-1.5 font-mono">{urlError}</p>}
      </div>

      {/* Recently Played (Compact Tape) */}
      {history.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between text-zinc-400 border-b border-white/[0.05] pb-1.5">
            <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
              <Clock className="w-3.5 h-3.5 text-red-500" />
              <span>Gần đây ({history.length})</span>
            </div>
          </div>

          <div className="divide-y divide-white/[0.03] border border-white/[0.05] rounded-lg bg-[#0e0e11] overflow-hidden">
            {history.map((track, idx) => (
              <div
                key={track.videoId + track.addedAt}
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
            ))}
          </div>
        </section>
      )}

      {/* Curated Feed (Data-dense Typographic Table) */}
      <section className="space-y-2">
        <div className="flex items-center justify-between text-zinc-400 border-b border-white/[0.05] pb-1.5">
          <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
            <Compass className="w-3.5 h-3.5 text-red-500" />
            <span>Tuyển tập giai điệu & Lofi</span>
          </div>
          <button
            onClick={() => onNavigateToSearch('')}
            className="text-[11px] text-zinc-500 hover:text-zinc-300"
          >
            Tìm kiếm &rarr;
          </button>
        </div>

        <div className="divide-y divide-white/[0.03] border border-white/[0.05] rounded-lg bg-[#0e0e11] overflow-hidden">
          {curatedTracks.map((item, idx) => {
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
      </section>
    </div>
  );
};
