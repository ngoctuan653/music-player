export interface TrackReference {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration?: string;
  addedAt: number;
  isManual?: boolean;
  isRadio?: boolean;
}

export interface QueueSourceInfo {
  type: 'radio' | 'manual' | 'playlist';
  seedTitle?: string;
  seedVideoId?: string;
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
  glassEffect: 'auto' | 'high' | 'balanced' | 'performance' | 'off';
  focusModeStyle?: 'turntable' | 'sleeve';
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

declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      isMaximized?: () => Promise<boolean>;
      onWindowStateChange?: (callback: (isMaximized: boolean) => void) => () => void;
      onGlassEnvironment?: (callback: (environment: { onBattery: boolean; gpuHealthy: boolean }) => void) => () => void;
      getGlassEnvironment?: () => Promise<{ onBattery: boolean; gpuHealthy: boolean }>;
      onGlassWindowVisibility?: (callback: (visible: boolean) => void) => () => void;
      setAudioOutputDevice?: (deviceId: string) => Promise<boolean>;
      fetchNet?: (url: string) => Promise<{ ok: boolean; status: number; data?: string; error?: string }>;
      fetchYouTubeRadio?: (params: { videoId: string; reqId: number }) => Promise<{
        reqId: number;
        videoId: string;
        tracks: SearchResultItem[];
        source: 'web_remix' | 'web' | 'secondary' | 'empty';
      }>;
      onMediaControl: (callback: (action: string) => void) => () => void;
      setAppBadge?: (text: string) => void;
      getDnsConfig?: () => Promise<{ mode: 'ublock' | 'controld' | 'hagezi' | 'nextdns' | 'cloudflare' | 'adguard' | 'family' | 'custom' | 'off'; url?: string; accountKey?: string }>;
      setDnsConfig?: (config: { mode: 'ublock' | 'controld' | 'hagezi' | 'nextdns' | 'cloudflare' | 'adguard' | 'family' | 'custom' | 'off'; url?: string; accountKey?: string }) => Promise<{ success: boolean; error?: string }>;
      getDiskStorage?: () => Promise<any>;
      saveDiskStorage?: (data: any) => Promise<boolean>;
      restartApp?: () => void;
    };
  }
}

