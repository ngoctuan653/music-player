import React, { useEffect, useState } from 'react';
import { History as HistoryIcon, Trash2, Play, Plus, FolderPlus, Sparkles, UserCheck, Volume2 } from 'lucide-react';
import { TrackReference } from '../models/types';
import { LocalStorageManager } from '../storage/localStore';
import { playlistService } from '../services/playlistService';
import { playerService } from '../services/playerService';
import { RecommendationService, UserTasteProfile } from '../services/recommendationService';

interface HistoryPageProps {
  onPlayTrack: (track: TrackReference, sourceList?: TrackReference[]) => void;
  onOpenAddToPlaylist: (track: TrackReference) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  onPlayTrack,
  onOpenAddToPlaylist,
}) => {
  const [history, setHistory] = useState<TrackReference[]>([]);
  const [profile, setProfile] = useState<UserTasteProfile | null>(null);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubH = LocalStorageManager.subscribeHistory((h) => {
      setHistory(h);
      setProfile(RecommendationService.getTasteProfile());
    });

    const unsubPlayer = playerService.subscribe((s) => {
      setCurrentPlayingId(s.currentTrack?.videoId || null);
    });

    return () => {
      unsubH();
      unsubPlayer();
    };
  }, []);

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear your listening history?')) {
      LocalStorageManager.clearHistory();
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 select-none font-sans">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
        <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <HistoryIcon className="w-4 h-4 text-[#fc3c44]" />
          <span>LISTENING HISTORY ({history.length})</span>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-[#fc3c44] font-mono text-xs transition-colors border border-white/[0.08]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>CLEAR HISTORY</span>
          </button>
        )}
      </div>

      {/* On-Device Taste Profile Card */}
      {profile && profile.totalPlays > 0 && (
        <section className="bg-[#1c1c1e] border border-white/[0.08] rounded-xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-zinc-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Your Personal Taste Profile</span>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-mono">
              <UserCheck className="w-3 h-3" />
              100% PRIVATE • ON-DEVICE LEARNING
            </span>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-zinc-400">
              The player automatically analyzes your music listening patterns on this device to personalize your daily recommendations without needing a Google account.
            </p>

            {profile.topArtists.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-zinc-500 font-mono">Top Artists:</span>
                {profile.topArtists.slice(0, 5).map((a) => (
                  <span
                    key={a.name}
                    className="px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/[0.08] text-xs font-medium text-zinc-200"
                  >
                    {a.name} <span className="text-[10px] font-mono text-[#fc3c44]">({a.count})</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* History List */}
      {history.length === 0 ? (
        <div className="py-24 text-center text-zinc-500 font-mono text-sm">
          No listening history yet. Songs you play will appear here and train your personal recommendations.
        </div>
      ) : (
        <div className="bg-[#1c1c1e] border border-white/[0.08] divide-y divide-white/[0.06] rounded-xl overflow-hidden shadow-sm">
          {history.map((track, idx) => {
            const isPlaying = track.videoId === currentPlayingId;
            return (
              <div
                key={`${track.videoId}_${idx}`}
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
      )}
    </div>
  );
};
