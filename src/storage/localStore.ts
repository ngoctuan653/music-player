import { Playlist, TrackReference, AppSettings } from '../models/types';

const SCHEMA_VERSION = '1.0.0';

const STORAGE_KEYS = {
  VERSION: 'ytm_schema_version',
  PLAYLISTS: 'ytm_playlists',
  HISTORY: 'ytm_history',
  SETTINGS: 'ytm_settings',
  QUEUE: 'ytm_queue',
  LAST_TRACK: 'ytm_last_track',
};

const DEFAULT_SETTINGS: AppSettings = {
  minimizeToTray: true,
  closeToTray: true,
  apiKey: import.meta.env.VITE_YOUTUBE_API_KEY || '',
  autoPlayNext: true,
  theme: 'dark',
  glassEffect: 'auto',
};

const DEFAULT_PLAYLISTS: Playlist[] = [
  {
    id: 'favorites',
    name: 'Favorites',
    description: 'Your favorite tracks',
    tracks: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'chill-mix',
    name: 'Chill & Relax',
    description: 'Relaxing beats and melodies',
    tracks: [
      {
        videoId: 'jfKfPfyJRdk',
        title: 'lofi hip hop radio 📚 - beats to relax/study to',
        channelTitle: 'Lofi Girl',
        thumbnailUrl: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
        addedAt: Date.now(),
      },
      {
        videoId: '5qap5aO4i9A',
        title: 'lofi hip hop radio 💤 - beats to sleep/chill to',
        channelTitle: 'Lofi Girl',
        thumbnailUrl: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg',
        addedAt: Date.now(),
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
];

export function sanitizeTrack(track: any): TrackReference {
  if (!track || typeof track !== 'object') {
    return {
      videoId: '',
      title: 'Unknown Title',
      channelTitle: 'Unknown Artist',
      thumbnailUrl: '',
      addedAt: Date.now(),
    };
  }

  let thumb = String(track.thumbnailUrl || '');
  if (thumb.length > 200) {
    thumb = track.videoId ? `https://i.ytimg.com/vi/${track.videoId}/mqdefault.jpg` : thumb.slice(0, 200);
  }

  return {
    videoId: String(track.videoId || '').slice(0, 32),
    title: String(track.title || 'Unknown').slice(0, 120),
    channelTitle: String(track.channelTitle || 'Unknown Artist').slice(0, 80),
    thumbnailUrl: thumb,
    duration: track.duration ? String(track.duration).slice(0, 16) : undefined,
    addedAt: typeof track.addedAt === 'number' ? track.addedAt : Date.now(),
  };
}

export class LocalStorageManager {
  private static syncDebounceTimer: any = null;

  public static syncToDiskNow(): Promise<void> {
    return this.syncToDisk();
  }

  private static scheduleSyncToDisk(): void {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }
    this.syncDebounceTimer = setTimeout(() => {
      void this.syncToDisk();
    }, 600);
  }

  private static async syncToDisk(): Promise<void> {
    if (window.electronAPI?.saveDiskStorage) {
      try {
        const dump: Record<string, any> = {};
        for (const key of Object.values(STORAGE_KEYS)) {
          const val = localStorage.getItem(key);
          if (val !== null && val !== undefined) {
            try {
              dump[key] = JSON.parse(val);
            } catch {
              dump[key] = val;
            }
          }
        }
        await window.electronAPI.saveDiskStorage(dump);
      } catch (e) {
        console.warn('Failed to sync storage to disk:', e);
      }
    }
  }

  static async init(): Promise<void> {
    // 1. Restore from disk if available and localStorage is empty
    if (window.electronAPI?.getDiskStorage) {
      try {
        const diskData = await window.electronAPI.getDiskStorage();
        if (diskData && typeof diskData === 'object') {
          for (const [key, val] of Object.entries(diskData)) {
            if (!localStorage.getItem(key) && val !== null && val !== undefined) {
              localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
            }
          }
        }
      } catch (e) {
        console.warn('Failed to restore from disk storage:', e);
      }
    }

    const currentVersion = localStorage.getItem(STORAGE_KEYS.VERSION);
    if (!currentVersion) {
      localStorage.setItem(STORAGE_KEYS.VERSION, SCHEMA_VERSION);
      if (!localStorage.getItem(STORAGE_KEYS.PLAYLISTS)) {
        this.savePlaylists(DEFAULT_PLAYLISTS);
      }
      if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
        this.saveSettings(DEFAULT_SETTINGS);
      }
    }
    void this.syncToDisk();
  }

  static getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  static saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      this.scheduleSyncToDisk();
    } catch (e) {
      console.error('Failed to save settings to localStorage', e);
    }
  }

  static getPlaylists(): Playlist[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
      if (!data) return DEFAULT_PLAYLISTS;
      const parsed: Playlist[] = JSON.parse(data);
      return parsed.map(pl => {
        if (pl.id === 'favorites' && (pl.name === 'Bài hát yêu thích' || !pl.name)) {
          return { ...pl, name: 'Favorites', description: 'Your favorite tracks' };
        }
        return pl;
      });
    } catch {
      return DEFAULT_PLAYLISTS;
    }
  }

  static savePlaylists(playlists: Playlist[]): void {
    try {
      // Keep storage bounded: max 25 playlists, max 80 tracks per playlist, all sanitized
      const boundedPlaylists = playlists.slice(0, 25).map(pl => ({
        ...pl,
        name: String(pl.name || '').slice(0, 80),
        description: String(pl.description || '').slice(0, 160),
        tracks: (pl.tracks || []).slice(0, 80).map(sanitizeTrack),
      }));
      localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(boundedPlaylists));
      this.scheduleSyncToDisk();
    } catch (e) {
      console.error('Failed to save playlists to localStorage', e);
    }
  }

  private static historyListeners: Set<(history: TrackReference[]) => void> = new Set();

  static subscribeHistory(listener: (history: TrackReference[]) => void): () => void {
    this.historyListeners.add(listener);
    listener(this.getHistory());
    return () => {
      this.historyListeners.delete(listener);
    };
  }

  private static notifyHistory(): void {
    const history = this.getHistory();
    this.historyListeners.forEach(listener => {
      try {
        listener(history);
      } catch (err) {
        console.warn('Error in history listener:', err);
      }
    });
  }

  static getHistory(): TrackReference[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static addToHistory(track: TrackReference): void {
    try {
      const cleanTrack = sanitizeTrack(track);
      if (!cleanTrack.videoId) return;

      let history = this.getHistory();
      // Remove track if it already exists to move it to the front
      history = history.filter(item => item.videoId !== cleanTrack.videoId);
      history.unshift({ ...cleanTrack, addedAt: Date.now() });
      // Keep strictly up to 50 tracks to protect disk capacity
      if (history.length > 50) {
        history = history.slice(0, 50);
      }
      history = history.map(sanitizeTrack);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
      this.notifyHistory();
      this.scheduleSyncToDisk();
    } catch (e) {
      console.error('Failed to save history', e);
    }
  }

  static clearHistory(): void {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    this.notifyHistory();
    this.scheduleSyncToDisk();
  }

  static getSavedQueue(): { queue: TrackReference[]; currentIndex: number; queueSource?: any } | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.QUEUE);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static saveQueue(queue: TrackReference[], currentIndex: number, queueSource?: any): void {
    try {
      // Cap persisted queue to max 30 tracks centered around currentIndex to maintain minimal disk footprint
      const MAX_PERSISTED_QUEUE = 30;
      let boundedQueue = queue;
      let adjustedIndex = currentIndex;

      if (queue.length > MAX_PERSISTED_QUEUE) {
        const windowStart = Math.max(0, Math.min(currentIndex - 5, queue.length - MAX_PERSISTED_QUEUE));
        boundedQueue = queue.slice(windowStart, windowStart + MAX_PERSISTED_QUEUE);
        adjustedIndex = Math.max(0, currentIndex - windowStart);
      }

      const cleanQueue = boundedQueue.map(sanitizeTrack);
      const cleanSource = queueSource && typeof queueSource === 'object'
        ? { type: queueSource.type, name: String(queueSource.name || '').slice(0, 60) }
        : undefined;

      localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify({
        queue: cleanQueue,
        currentIndex: adjustedIndex,
        queueSource: cleanSource,
      }));
      this.scheduleSyncToDisk();
    } catch (e) {
      console.error('Failed to save queue', e);
    }
  }
}
