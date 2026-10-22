import React, { useEffect, useState } from 'react';
import { X, MessageSquare, ThumbsUp, RefreshCw } from 'lucide-react';
import { CommentItem, TrackReference } from '../../models/types';
import { YouTubeSearchService } from '../../services/youtubeSearch';
import { LocalStorageManager } from '../../storage/localStore';

interface CommentsDrawerProps {
  track: TrackReference | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CommentsDrawer: React.FC<CommentsDrawerProps> = ({ track, isOpen, onClose }) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadComments = async () => {
    if (!track) return;
    setIsLoading(true);
    setError(null);
    try {
      const apiKey = LocalStorageManager.getSettings().apiKey;
      const list = await YouTubeSearchService.fetchComments(track.videoId, apiKey);
      setComments(list);
      if (list.length === 0) {
        setError('No comments found or comments are disabled for this video.');
      }
    } catch {
      setError('Unable to load comments for this video.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && track) {
      loadComments();
    }
  }, [isOpen, track?.videoId]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-7 bottom-16 right-0 w-80 bg-[#1c1c1e] border-l border-white/[0.08] shadow-2xl z-40 flex flex-col select-none text-xs">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between bg-[#232323]">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-[#fc3c44]" />
          <span className="font-mono text-[11px] font-semibold text-white uppercase tracking-wider">
            Comments ({comments.length})
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={loadComments}
            disabled={isLoading}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/[0.06] disabled:opacity-50"
            title="Refresh comments"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/[0.06]"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Track summary */}
      {track && (
        <div className="px-3.5 py-2 border-b border-white/[0.06] bg-[#161616] flex items-center gap-2">
          <img src={track.thumbnailUrl} alt="" className="w-8 h-6 rounded object-cover bg-zinc-900 border border-white/[0.06]" />
          <span className="truncate text-[11px] text-zinc-300 font-medium">{track.title}</span>
        </div>
      )}

      {/* Content list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {isLoading ? (
          <div className="py-20 text-center text-zinc-400 font-mono text-[11px] space-y-2">
            <div className="w-4 h-4 border-2 border-[#fc3c44] border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading comments...</p>
          </div>
        ) : error && comments.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 font-mono text-[11px]">
            {error}
          </div>
        ) : (
          comments.map((item) => (
            <div key={item.id} className="space-y-1 pb-2.5 border-b border-white/[0.04]">
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <div className="flex items-center gap-1.5 truncate pr-2">
                  {item.authorThumb ? (
                    <img src={item.authorThumb} alt="" className="w-4 h-4 rounded-full object-cover" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-zinc-800 text-[9px] flex items-center justify-center text-zinc-300">
                      {item.author.charAt(0)}
                    </span>
                  )}
                  <span className="font-semibold text-zinc-200 truncate">{item.author}</span>
                </div>
                <span className="text-zinc-500 font-mono shrink-0">{item.publishedTime}</span>
              </div>

              <p className="text-[11px] text-zinc-300 leading-relaxed break-words font-sans pl-5 select-text">
                {item.content}
              </p>

              {item.likeCount ? (
                <div className="flex items-center gap-1 text-[10px] text-zinc-400 pl-5 font-mono pt-0.5">
                  <ThumbsUp className="w-2.5 h-2.5" />
                  <span>{item.likeCount}</span>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
