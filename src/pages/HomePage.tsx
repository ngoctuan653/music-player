import React, { useState, useEffect } from 'react';
import { Play, Sparkles, Plus, Clock, Link, Compass } from 'lucide-react';
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
    setHistory(LocalStorageManager.getHistory().slice(0, 8));
    setCuratedTracks(YouTubeSearchService.getCuratedTracks());
  }, []);

  const handleQuickPlayUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUrl.trim()) return;

    setIsLoadingUrl(true);
    setUrlError(null);

    const videoId = YouTubeSearchService.extractVideoId(quickUrl);
    if (!videoId) {
      setUrlError('Đường link hoặc ID YouTube không hợp lệ.');
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
      setUrlError('Không thể lấy thông tin bài hát từ link này.');
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
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* Hero Banner & Quick Link Input */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-950/60 via-[#1e1e1e] to-[#161616] border border-red-900/30 p-6 md:p-8">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600/20 text-red-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>YouTube Music Desktop</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Nghe nhạc YouTube gọn nhẹ trên Windows 11
          </h1>
          <p className="text-gray-400 text-xs md:text-sm">
            Dán đường link YouTube bất kỳ hoặc tìm kiếm để bắt đầu nghe nhạc trong cửa sổ riêng biệt.
          </p>

          <form onSubmit={handleQuickPlayUrl} className="pt-2 flex gap-2">
            <div className="relative flex-1">
              <Link className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Dán link YouTube (ví dụ: https://www.youtube.com/watch?v=...) hoặc video ID"
                value={quickUrl}
                onChange={(e) => {
                  setQuickUrl(e.target.value);
                  setUrlError(null);
                }}
                className="w-full bg-[#111111]/90 border border-[#383838] rounded-xl pl-9 pr-4 py-2.5 text-xs md:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isLoadingUrl || !quickUrl.trim()}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium text-xs md:text-sm rounded-xl flex items-center gap-2 transition-all shrink-0 shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isLoadingUrl ? 'Đang mở...' : 'Phát ngay'}</span>
            </button>
          </form>

          {urlError && <p className="text-xs text-red-400">{urlError}</p>}
        </div>
      </div>

      {/* Recently Played */}
      {history.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-500" />
              <span>Gần đây đã nghe</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3">
            {history.map((track) => (
              <div
                key={track.videoId + track.addedAt}
                className="group bg-[#181818] hover:bg-[#222222] border border-[#262626] rounded-xl p-2.5 transition-all flex flex-col justify-between"
              >
                <div className="relative aspect-video rounded-lg overflow-hidden bg-[#262626] mb-2">
                  <img
                    src={track.thumbnailUrl}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <button
                    onClick={() => onPlayTrack(track)}
                    className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110 active:scale-95"
                    title="Phát bài này"
                  >
                    <Play className="w-4 h-4 fill-current translate-x-0.5" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate" title={track.title}>
                    {track.title}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate" title={track.channelTitle}>
                    {track.channelTitle}
                  </p>
                </div>
                <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-[#262626]">
                  <button
                    onClick={() => playlistService.enqueueEnd(track)}
                    className="p-1 text-gray-400 hover:text-white rounded"
                    title="Thêm vào hàng đợi"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Curated Music Recommendations */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-red-500" />
            <span>Giai điệu nổi bật & Tuyển tập thư giãn</span>
          </h2>
          <button
            onClick={() => onNavigateToSearch('')}
            className="text-xs text-gray-400 hover:text-white"
          >
            Khám phá thêm &rarr;
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {curatedTracks.map((item) => {
            const track = toTrackRef(item);
            return (
              <div
                key={item.videoId}
                className="group bg-[#181818] hover:bg-[#242424] border border-[#282828] rounded-xl p-3 transition-all flex flex-col justify-between"
              >
                <div className="relative aspect-video rounded-lg overflow-hidden bg-[#262626] mb-2.5">
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <button
                    onClick={() => onPlayTrack(track)}
                    className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:scale-110 active:scale-95"
                    title="Phát ngay"
                  >
                    <Play className="w-4 h-4 fill-current translate-x-0.5" />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-semibold text-white truncate" title={item.title}>
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-gray-400 truncate mt-0.5" title={item.channelTitle}>
                    {item.channelTitle}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#2a2a2a] text-xs">
                  <button
                    onClick={() => onPlayTrack(track)}
                    className="text-red-400 hover:text-red-300 font-medium text-[11px]"
                  >
                    Nghe bài này
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => playlistService.enqueueEnd(track)}
                      className="p-1 text-gray-400 hover:text-white hover:bg-[#333] rounded"
                      title="Thêm vào hàng đợi"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onOpenAddToPlaylist(track)}
                      className="p-1 text-gray-400 hover:text-white hover:bg-[#333] rounded"
                      title="Thêm vào playlist"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

