import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, Play, Plus, FolderPlus, X, AlertCircle, Volume2 } from 'lucide-react';
import { SearchResultItem, TrackReference } from '../models/types';
import { YouTubeSearchService } from '../services/youtubeSearch';
import { playlistService } from '../services/playlistService';
import { playerService } from '../services/playerService';
import { LocalStorageManager } from '../storage/localStore';

interface SearchPageProps {
  onPlayTrack: (track: TrackReference, sourceList?: TrackReference[]) => void;
  onOpenAddToPlaylist: (track: TrackReference) => void;
  initialQuery?: string;
  onNavigateToSettings?: () => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  onPlayTrack,
  onOpenAddToPlaylist,
  initialQuery = '',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const debounceTimerRef = useRef<any>(null);

  const apiKey = LocalStorageManager.getSettings().apiKey;

  useEffect(() => {
    const unsub = playerService.subscribe((s) => {
      setCurrentPlayingId(s.currentTrack?.videoId || null);
    });
    return unsub;
  }, []);

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
      setErrorMsg('An error occurred during search.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

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
    duration: item.duration,
    addedAt: Date.now(),
  });

  const searchTrackRefs = results.map(toTrackRef);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5 select-none font-sans">
      {/* Search Bar (Spotlight Style) */}
      <div className="bg-[#1c1c1e] border border-white/[0.08] relative rounded-xl p-1.5 shadow-sm">
        <SearchIcon className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          autoFocus
          placeholder="Search songs, artists, albums, or paste YouTube link..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-[#232323] border border-white/[0.08] rounded-lg pl-11 pr-9 py-2.5 text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-[#fc3c44] transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Error notification banner */}
      {errorMsg && (
        <div className="bg-red-950/30 border border-red-900/40 rounded-lg p-3 flex items-center gap-2.5 text-xs text-red-300 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#fc3c44]" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs font-mono text-zinc-400 border-b border-white/[0.08] pb-2">
        <span className="uppercase tracking-wider font-semibold">SEARCH RESULTS ({results.length})</span>
        {isLoading && (
          <span className="flex items-center gap-2 text-[#fc3c44] text-xs">
            <span className="w-2.5 h-2.5 border-2 border-[#fc3c44] border-t-transparent rounded-full animate-spin" />
            SEARCHING...
          </span>
        )}
      </div>

      {/* Results Table */}
      {results.length === 0 && !isLoading ? (
        <div className="py-24 text-center text-zinc-500 font-mono text-sm">
          No tracks found. Try searching for an artist or song title.
        </div>
      ) : (
        <div className="bg-[#1c1c1e] border border-white/[0.08] divide-y divide-white/[0.06] rounded-xl overflow-hidden">
          {results.map((item, idx) => {
            const track = toTrackRef(item);
            const isPlaying = track.videoId === currentPlayingId;
            return (
              <div
                key={item.videoId}
                onClick={() => onPlayTrack(track, searchTrackRefs)}
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
    </div>
  );
};
