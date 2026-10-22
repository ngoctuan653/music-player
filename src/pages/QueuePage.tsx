import React, { useEffect, useState } from 'react';
import { ListMusic, Trash2, Play, Volume2, X, Radio, Sparkles } from 'lucide-react';
import { TrackReference, QueueSourceInfo } from '../models/types';
import { playlistService } from '../services/playlistService';

export const QueuePage: React.FC = () => {
  const [queue, setQueue] = useState<TrackReference[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [queueSource, setQueueSource] = useState<QueueSourceInfo | null>(null);

  useEffect(() => {
    return playlistService.subscribeQueue((q, idx, src) => {
      setQueue(q);
      setCurrentIndex(idx);
      setQueueSource(src);
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

  // Find first upcoming radio track index to render a neat section divider
  const firstUpcomingRadioIdx = queue.findIndex(
    (t, idx) => idx > currentIndex && Boolean(t.isRadio)
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5 select-none font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
            <ListMusic className="w-4 h-4 text-[#fc3c44]" />
            <span>Playback queue <span className="text-zinc-500">({queue.length})</span></span>
          </div>

          {queueSource?.type === 'radio' && queueSource.seedTitle && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-950/40 border border-red-900/40 text-red-300 text-xs font-mono truncate max-w-md">
              <Radio className="w-3 h-3 text-[#fc3c44] shrink-0 animate-pulse" />
              <span className="truncate">Radio based on: {queueSource.seedTitle}</span>
            </div>
          )}
        </div>

        {queue.length > 0 && (
          <button
            onClick={handleClear}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-[#fc3c44] font-mono text-xs transition-colors border border-white/[0.08]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>CLEAR QUEUE</span>
          </button>
        )}
      </div>

      {queue.length === 0 ? (
        <div className="py-24 text-center text-zinc-500 font-mono text-sm">
          Queue is empty. Select a song from Explore or Search to start a radio stream.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-[#1c1c1e] border border-white/[0.08] divide-y divide-white/[0.06] rounded-xl overflow-hidden shadow-sm">
            {queue.map((track, idx) => {
              const isPlaying = idx === currentIndex;
              const isFirstRadioDivider = idx === firstUpcomingRadioIdx;

              return (
                <React.Fragment key={`${track.videoId}_${idx}`}>
                  {isFirstRadioDivider && (
                    <div className="bg-white/[0.02] px-4 py-2 flex items-center justify-between border-y border-white/[0.08]">
                      <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400">
                        <Sparkles className="w-3.5 h-3.5 text-[#fc3c44]" />
                        <span className="font-semibold uppercase tracking-wider text-zinc-300">
                          Autoplay Radio • Similar Vibe
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-500">
                        Infinite Continuous Queue
                      </span>
                    </div>
                  )}

                  <div
                    onClick={() => handlePlayIndex(idx)}
                    className={`group flex items-center justify-between px-4 py-2.5 transition-colors cursor-pointer ${
                      isPlaying
                        ? 'bg-white/[0.06] text-white font-medium border-l-2 border-[#fc3c44]'
                        : 'hover:bg-white/[0.06] text-zinc-300'
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

                      <div className="relative w-12 h-12 rounded-md overflow-hidden bg-zinc-900 shrink-0 border border-white/[0.06]">
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
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm truncate ${
                              isPlaying ? 'text-[#fc3c44] font-semibold' : 'text-zinc-200 group-hover:text-white'
                            }`}
                            title={track.title}
                          >
                            {track.title}
                          </p>
                          {track.isRadio && !isPlaying && (
                            <span className="px-1.5 py-0.2 rounded bg-white/[0.06] text-[9px] font-mono text-zinc-400 shrink-0">
                              Radio
                            </span>
                          )}
                          {track.isManual && (
                            <span className="px-1.5 py-0.2 rounded bg-red-950/30 text-[9px] font-mono text-red-300 shrink-0">
                              Manual
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">{track.channelTitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleRemove(idx, e)}
                        className="p-1.5 text-zinc-400 hover:text-[#fc3c44] rounded-md hover:bg-white/[0.08]"
                        title="Remove from queue"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

