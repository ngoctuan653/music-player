export interface TrackReference {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration?: string;
  addedAt: number;
}

export interface QueueItem {
  id: string;
  track: TrackReference;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  tracks: TrackReference[];
  createdAt: number;
  updatedAt: number;
}

export type RepeatMode = 'off' | 'one' | 'all';

export interface PlayerStatus {
  currentTrack: TrackReference | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isBuffering: boolean;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  error: string | null;
}

export interface AppSettings {
  minimizeToTray: boolean;
  closeToTray: boolean;
  apiKey: string;
  autoPlayNext: boolean;
  theme: 'dark' | 'system';
}

export interface SearchResultItem {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration?: string;
  publishedAt?: string;
}

export interface CommentItem {
  id: string;
  author: string;
  authorThumb?: string;
  content: string;
  publishedTime: string;
  likeCount?: string | number;
}

export type ActivePage = 'home' | 'search' | 'queue' | 'playlists' | 'history' | 'settings';

