import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Plus, 
  Clock, 
  Search, 
  Compass, 
  FolderPlus, 
  Flame, 
  Trophy, 
  Sparkles, 
  Globe, 
  Music2, 
  Zap,
  Loader2,
  Volume2
} from 'lucide-react';
import { TrackReference, SearchResultItem } from '../models/types';
import { YouTubeSearchService } from '../services/youtubeSearch';
import { playlistService } from '../services/playlistService';
import { playerService } from '../services/playerService';
import { LocalStorageManager } from '../storage/localStore';
import { RecommendationService, PersonalizedSection } from '../services/recommendationService';

interface HomePageProps {
  onPlayTrack: (track: TrackReference, sourceList?: TrackReference[]) => void;
  onOpenAddToPlaylist: (track: TrackReference) => void;
  onNavigateToSearch: (query?: string) => void;
}

const CATEGORIES = [
  { id: 'billboard_hot100', label: 'Billboard Hot 100', icon: Trophy },
  { id: 'billboard_global', label: 'Billboard Global 200', icon: Globe },
  { id: 'billboard_vietnam', label: 'Billboard Vietnam Hot 100', icon: Sparkles },
  { id: 'global_viral', label: 'Global Viral Hits', icon: Flame },
  { id: 'kpop_hits', label: 'K-Pop Top Hits', icon: Zap },
  { id: 'vpop_fresh', label: 'V-Pop Hot Hits', icon: Music2 },
];

export const HomePage: React.FC<HomePageProps> = ({
  onPlayTrack,
  onOpenAddToPlaylist,
  onNavigateToSearch,
}) => {
  const [quickQuery, setQuickQuery] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [history, setHistory] = useState<TrackReference[]>([]);
  const [activeCategory, setActiveCategory] = useState('billboard_hot100');
  const [exploreTracks, setExploreTracks] = useState<SearchResultItem[]>([]);
  const [isLoadingExplore, setIsLoadingExplore] = useState(false);
  const [exploreError, setExploreError] = useState<string | null>(null);
  const [personalized, setPersonalized] = useState<PersonalizedSection | null>(null);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubHistory = LocalStorageManager.subscribeHistory((h) => {
      setHistory(h.slice(0, 6));
      RecommendationService.getPersonalizedSection().then(setPersonalized).catch(() => {});
    });

    const unsubPlayer = playerService.subscribe((status) => {
      setCurrentPlayingId(status.currentTrack?.videoId || null);
    });

    loadCategoryTracks('billboard_hot100');

    return () => {
      unsubHistory();
      unsubPlayer();
    };
  }, []);

  const loadCategoryTracks = async (category: string) => {
    setIsLoadingExplore(true);
    setExploreError(null);
    setActiveCategory(category);
    try {
      const tracks = await YouTubeSearchService.getExploreTracks(
        category,
        LocalStorageManager.getSettings().apiKey,
      );
      setExploreTracks(tracks);
      if (tracks.length === 0) {
        setExploreError('Không lấy được dữ liệu live từ YouTube. Kiểm tra kết nối hoặc API key.');
      }
    } catch (error) {
      console.warn('Failed to load Explore category:', error);
      setExploreTracks([]);
      setExploreError('Không thể tải bảng xếp hạng live từ YouTube.');
    } finally {
      setIsLoadingExplore(false);
    }
  };

  const isYouTubeLinkOrId = (input: string) => {
    return Boolean(YouTubeSearchService.extractVideoId(input));
  };

  const handleSearchOrPlay = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickQuery.trim();
    if (!trimmed) return;

    const videoId = YouTubeSearchService.extractVideoId(trimmed);
    if (videoId) {
      // Direct YouTube URL or Video ID: stream immediately
      setIsLoadingUrl(true);
      setUrlError(null);
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
        setQuickQuery('');
      } catch {
        setUrlError('Unable to fetch metadata for this link.');
      } finally {
        setIsLoadingUrl(false);
      }
    } else {
      // General search query: seamlessly navigate to search results
      onNavigateToSearch(trimmed);
    }
  };

  const toTrackRef = (item: SearchResultItem): TrackReference => ({
    videoId: item.videoId,
    title: item.title,
    channelTitle: item.channelTitle,
    thumbnailUrl: item.thumbnailUrl,
    duration: item.duration,
    addedAt: Date.now(),
  });

  const exploreTrackRefs = exploreTracks.map(toTrackRef);
  const featuredTracks = exploreTracks.slice(0, 4);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-7 select-none font-sans">
      {/* Apple Music Hero Section */}
      {featuredTracks[0] && (
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end bg-[#1c1c1e] p-6 rounded-2xl border border-white/[0.06] shadow-xl">
          <img
            src={featuredTracks[0].thumbnailUrl}
            alt=""
            className="w-40 h-40 sm:w-44 sm:h-44 rounded-xl object-cover shadow-2xl shrink-0 bg-[#2c2c2e]"
          />
          <div className="flex flex-col gap-1.5 pb-1 min-w-0 flex-1">
            <span className="text-[11px] text-[#fc3c44] uppercase tracking-widest font-mono font-semibold">
              Featured Selection
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight truncate" title={featuredTracks[0].title}>
              {featuredTracks[0].title}
            </h1>
            <span className="text-zinc-400 text-sm font-medium truncate">
              {featuredTracks[0].channelTitle}
            </span>
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => onPlayTrack(toTrackRef(featuredTracks[0]), exploreTrackRefs)}
                className="px-5 py-2 bg-[#fc3c44] hover:bg-[#e0343b] text-white font-medium rounded-full flex items-center gap-2 text-xs transition-colors shadow-md"
              >
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                <span>Play Now</span>
              </button>
              <button
                onClick={() => onOpenAddToPlaylist(toTrackRef(featuredTracks[0]))}
                className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 font-medium rounded-full flex items-center gap-1.5 text-xs transition-colors border border-white/[0.08]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add to Library</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Search & Instant Stream Bar */}
      <div className="bg-[#1c1c1e] border border-white/[0.08] rounded-xl p-2 shadow-sm">
        <form onSubmit={handleSearchOrPlay} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search songs, artists, albums, or paste YouTube link..."
              value={quickQuery}
              onChange={(e) => {
                setQuickQuery(e.target.value);
                setUrlError(null);
              }}
              className="w-full bg-[#232323] border border-white/[0.08] rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#fc3c44] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoadingUrl || !quickQuery.trim()}
            className="px-5 py-2 bg-[#fc3c44] hover:bg-[#e0343b] disabled:opacity-40 text-white font-medium rounded-lg flex items-center gap-2 transition-colors shrink-0 text-xs shadow-sm"
          >
            {isYouTubeLinkOrId(quickQuery) ? (
              <Play className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            <span>
              {isLoadingUrl ? 'Loading...' : isYouTubeLinkOrId(quickQuery) ? 'Play' : 'Search'}
            </span>
          </button>
        </form>
        {urlError && <p className="text-xs text-[#fc3c44] mt-2 ml-1 font-mono">{urlError}</p>}
      </div>

      {/* Category Pills (Apple Music Style) */}
      <div className="space-y-3">
        {exploreError && (
          <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl px-4 py-2.5 text-xs text-amber-300 font-mono">
            {exploreError}
          </div>
        )}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => loadCategoryTracks(cat.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-[#fc3c44] text-white shadow-sm'
                    : 'bg-white/[0.06] text-zinc-300 hover:text-white hover:bg-white/[0.1] border border-white/[0.06]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Made For You (On-Device Personalized Recommendations) */}
      {personalized && personalized.tracks.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between text-zinc-400 border-b border-white/[0.08] pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-300">
                {personalized.title}
              </span>
              <span className="text-xs text-zinc-400 font-normal">
                • {personalized.reason}
              </span>
            </div>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
              PERSONALIZED
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {personalized.tracks.slice(0, 4).map((item) => {
              const track = toTrackRef(item);
              const isPlaying = track.videoId === currentPlayingId;
              return (
                <div
                  key={item.videoId}
                  onClick={() => onPlayTrack(track, personalized.tracks.map(toTrackRef))}
                  className="bg-[#1c1c1e] hover:bg-[#232323] border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-3 cursor-pointer transition-all hover:-translate-y-1 shadow-sm group"
                >
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-zinc-900 border border-white/[0.04] mb-2.5">
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {item.duration && (
                      <span className="absolute bottom-1 right-1 bg-black/80 text-[9px] font-mono text-zinc-200 px-1 py-0.5 rounded">
                        {item.duration}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-[#fc3c44] text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <p className={`text-xs font-medium truncate ${isPlaying ? 'text-[#fc3c44]' : 'text-zinc-200 group-hover:text-white'}`} title={item.title}>
                    {item.title}
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">{item.channelTitle}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured Cards Visual Grid */}
      {featuredTracks.length > 0 && !isLoadingExplore && (
        <section className="space-y-3">
          <div className="flex items-center justify-between text-zinc-400 border-b border-white/[0.08] pb-2">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Top Picks
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {featuredTracks.map((item) => {
              const track = toTrackRef(item);
              const isPlaying = track.videoId === currentPlayingId;
              return (
                <div
                  key={item.videoId}
                  onClick={() => onPlayTrack(track, exploreTrackRefs)}
                  className="bg-[#1c1c1e] hover:bg-[#232323] border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-3 cursor-pointer transition-all hover:-translate-y-1 shadow-sm group"
                >
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-zinc-900 border border-white/[0.04] mb-2.5">
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {item.duration && (
                      <span className="absolute bottom-1 right-1 bg-black/80 text-[9px] font-mono text-zinc-200 px-1 py-0.5 rounded">
                        {item.duration}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-[#fc3c44] text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <p className={`text-xs font-medium truncate ${isPlaying ? 'text-[#fc3c44]' : 'text-zinc-200 group-hover:text-white'}`} title={item.title}>
                    {item.title}
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">{item.channelTitle}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recently Played */}
      {history.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between text-zinc-400 border-b border-white/[0.08] pb-2">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <Clock className="w-4 h-4 text-[#fc3c44]" />
              <span>Recently Played ({history.length})</span>
            </div>
          </div>

          <div className="bg-[#1c1c1e] border border-white/[0.08] divide-y divide-white/[0.06] rounded-xl overflow-hidden">
            {history.map((track, idx) => {
              const isPlaying = track.videoId === currentPlayingId;
              return (
                <div
                  key={track.videoId + track.addedAt}
                  onClick={() => onPlayTrack(track, history)}
                  className={`group flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.06] transition-colors cursor-pointer ${
                    isPlaying ? 'bg-white/[0.04]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                    <div className="w-5 text-center font-mono text-xs shrink-0">
                      {isPlaying ? (
                        <Volume2 className="w-4 h-4 text-[#fc3c44] animate-pulse mx-auto" />
                      ) : (
                        <span className="text-zinc-500 group-hover:hidden">{idx + 1}</span>
                      )}
                      {!isPlaying && (
                        <Play className="w-3.5 h-3.5 text-zinc-300 fill-current hidden group-hover:block mx-auto" />
                      )}
                    </div>

                    <div className="relative w-12 h-12 rounded-md overflow-hidden shrink-0 bg-zinc-900 border border-white/[0.06]">
                      <img
                        src={track.thumbnailUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      {track.duration && (
                        <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-[8px] font-mono text-zinc-300 px-1 rounded leading-none">
                          {track.duration}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${isPlaying ? 'text-[#fc3c44]' : 'text-zinc-200 group-hover:text-white'}`} title={track.title}>
                        {track.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                        <span className="truncate">{track.channelTitle}</span>
                        {track.duration && (
                          <span className="font-mono text-zinc-500 shrink-0">• {track.duration}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playlistService.enqueueEnd(track);
                      }}
                      className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-white/[0.08]"
                      title="Add to queue"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAddToPlaylist(track);
                      }}
                      className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-white/[0.08]"
                      title="Add to playlist"
                    >
                      <FolderPlus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Real Live Explore Feed */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between text-zinc-400 border-b border-white/[0.08] pb-2">
          <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <Compass className="w-4 h-4 text-[#fc3c44]" />
            <span>
              {CATEGORIES.find((c) => c.id === activeCategory)?.label || 'Explore'} ({exploreTracks.length})
            </span>
          </div>
          <button
            onClick={() => onNavigateToSearch('')}
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            All Results &rarr;
          </button>
        </div>

        {isLoadingExplore ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#fc3c44]" />
            <span className="text-xs font-mono">Fetching live music from YouTube...</span>
          </div>
        ) : (
          <div className="bg-[#1c1c1e] border border-white/[0.08] divide-y divide-white/[0.06] rounded-xl overflow-hidden">
            {exploreTracks.map((item, idx) => {
              const track = toTrackRef(item);
              const isPlaying = track.videoId === currentPlayingId;
              return (
                <div
                  key={item.videoId}
                  onClick={() => onPlayTrack(track, exploreTrackRefs)}
                  className={`group flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.06] transition-colors cursor-pointer ${
                    isPlaying ? 'bg-white/[0.04]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                    <div className="w-5 text-center font-mono text-xs shrink-0">
                      {isPlaying ? (
                        <Volume2 className="w-4 h-4 text-[#fc3c44] animate-pulse mx-auto" />
                      ) : (
                        <span className="text-zinc-500 group-hover:hidden">{idx + 1}</span>
                      )}
                      {!isPlaying && (
                        <Play className="w-3.5 h-3.5 text-zinc-300 fill-current hidden group-hover:block mx-auto" />
                      )}
                    </div>

                    <div className="relative w-12 h-12 rounded-md overflow-hidden shrink-0 bg-zinc-900 border border-white/[0.06]">
                      <img
                        src={item.thumbnailUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      {item.duration && (
                        <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-[8px] font-mono text-zinc-300 px-1 rounded leading-none">
                          {item.duration}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${isPlaying ? 'text-[#fc3c44]' : 'text-zinc-200 group-hover:text-white'}`} title={item.title}>
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                        <span className="truncate">{item.channelTitle}</span>
                        {item.duration && (
                          <span className="font-mono text-zinc-500 shrink-0">• {item.duration}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playlistService.enqueueNext(track);
                      }}
                      className="px-2.5 py-1 text-xs font-mono text-zinc-400 hover:text-white rounded-md hover:bg-white/[0.08] border border-white/[0.06]"
                      title="Play next"
                    >
                      Play Next
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playlistService.enqueueEnd(track);
                      }}
                      className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-white/[0.08]"
                      title="Add to queue"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAddToPlaylist(track);
                      }}
                      className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-white/[0.08]"
                      title="Add to playlist"
                    >
                      <FolderPlus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
