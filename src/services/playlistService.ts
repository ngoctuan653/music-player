import { Playlist, TrackReference } from '../models/types';
import { LocalStorageManager } from '../storage/localStore';
import { playerService } from './playerService';
import { RecommendationEngine } from './recommendationEngine';

type QueueListener = (queue: TrackReference[], currentIndex: number) => void;
type PlaylistsListener = (playlists: Playlist[]) => void;

class PlaylistService {
  private queue: TrackReference[] = [];
  private currentIndex: number = -1;
  private playlists: Playlist[] = [];
  private queueListeners: Set<QueueListener> = new Set();
  private playlistsListeners: Set<PlaylistsListener> = new Set();

  constructor() {
    this.playlists = LocalStorageManager.getPlaylists();
    const saved = LocalStorageManager.getSavedQueue();
    if (saved && saved.queue.length > 0) {
      this.queue = saved.queue;
      this.currentIndex = Math.max(0, Math.min(saved.currentIndex, saved.queue.length - 1));
    }

    // Set callback on player service when a track ends
    playerService.onTrackEndedCallback = () => {
      this.handleTrackEnded();
    };
  }

  // ---- Queue Operations ----

  public getQueue(): TrackReference[] {
    return [...this.queue];
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  public getCurrentTrack(): TrackReference | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
      return this.queue[this.currentIndex];
    }
    return null;
  }

  public playTrackNow(track: TrackReference, sourceList?: TrackReference[]): void {
    // Search results are not a playback queue. Only tracks explicitly added
    // to the queue should be considered by Next.
    void sourceList;
    const existingIdx = this.queue.findIndex(t => t.videoId === track.videoId);
    if (existingIdx !== -1) {
      this.currentIndex = existingIdx;
    } else if (this.queue.length === 0) {
      this.queue = [track];
      this.currentIndex = 0;
    } else {
      this.queue.splice(this.currentIndex + 1, 0, track);
      this.currentIndex = this.currentIndex + 1;
    }

    this.persistQueue();
    this.notifyQueue();
    LocalStorageManager.addToHistory(track);
    playerService.playTrack(track);
    void this.ensureUpcomingQueue();
  }

  public enqueueNext(track: TrackReference): void {
    if (this.queue.length === 0) {
      this.playTrackNow(track);
      return;
    }
    this.queue.splice(this.currentIndex + 1, 0, track);
    this.persistQueue();
    this.notifyQueue();
  }

  public enqueueEnd(track: TrackReference): void {
    if (this.queue.length === 0) {
      this.playTrackNow(track);
      return;
    }
    this.queue.push(track);
    this.persistQueue();
    this.notifyQueue();
  }

  public removeFromQueue(index: number): void {
    if (index < 0 || index >= this.queue.length) return;
    
    this.queue.splice(index, 1);
    if (index < this.currentIndex) {
      this.currentIndex--;
    } else if (index === this.currentIndex) {
      if (this.queue.length === 0) {
        this.currentIndex = -1;
      } else if (this.currentIndex >= this.queue.length) {
        this.currentIndex = this.queue.length - 1;
        playerService.playTrack(this.queue[this.currentIndex]);
      } else {
        playerService.playTrack(this.queue[this.currentIndex]);
      }
    }

    this.persistQueue();
    this.notifyQueue();
  }

  public clearQueue(): void {
    this.queue = [];
    this.currentIndex = -1;
    this.persistQueue();
    this.notifyQueue();
  }

  public playIndex(index: number): void {
    if (index >= 0 && index < this.queue.length) {
      this.currentIndex = index;
      const track = this.queue[this.currentIndex];
      LocalStorageManager.addToHistory(track);
      playerService.playTrack(track);
      this.persistQueue();
      this.notifyQueue();
      void this.ensureUpcomingQueue();
    }
  }

  public async playNext(): Promise<void> {
    if (this.queue.length === 0) return;

    const status = playerService.getStatus();
    if (status.isShuffled && this.queue.length > 1) {
      let nextIdx = Math.floor(Math.random() * this.queue.length);
      while (nextIdx === this.currentIndex) {
        nextIdx = Math.floor(Math.random() * this.queue.length);
      }
      this.playIndex(nextIdx);
      return;
    }

    if (this.currentIndex + 1 < this.queue.length) {
      this.playIndex(this.currentIndex + 1);
    } else if (status.repeatMode === 'all') {
      this.playIndex(0);
    } else {
      const settings = LocalStorageManager.getSettings();
      if (settings.autoPlayNext && this.queue.length > 0) {
        const current = this.getCurrentTrack();
        if (current) {
          const related = await this.findRelatedTrack(current);
          if (related) {
            this.queue.push(related);
            this.currentIndex = this.queue.length - 1;
            this.persistQueue();
            this.notifyQueue();
            LocalStorageManager.addToHistory(related);
            playerService.playTrack(related);
            void this.ensureUpcomingQueue();
          }
        }
      }
    }
  }

  private isFillingQueue: boolean = false;

  private async ensureUpcomingQueue(): Promise<void> {
    const settings = LocalStorageManager.getSettings();
    if (!settings.autoPlayNext) return;
    if (this.isFillingQueue) return;

    const remaining = this.queue.length - 1 - this.currentIndex;
    if (remaining >= 2) return;

    this.isFillingQueue = true;
    try {
      const current = this.getCurrentTrack();
      if (!current) return;

      const history = LocalStorageManager.getHistory();
      const nextTrack = await RecommendationEngine.getSmartNextTrack({
        currentTrack: current,
        currentQueue: this.queue,
        history,
      });

      if (nextTrack) {
        if (!this.queue.some(t => t.videoId === nextTrack.videoId)) {
          this.queue.push(nextTrack);
          this.persistQueue();
          this.notifyQueue();
        }
      }
    } catch (err) {
      console.warn('Failed to top up upcoming queue:', err);
    } finally {
      this.isFillingQueue = false;
    }
  }

  private async findRelatedTrack(current: TrackReference): Promise<TrackReference | null> {
    try {
      const history = LocalStorageManager.getHistory();
      return await RecommendationEngine.getSmartNextTrack({
        currentTrack: current,
        currentQueue: this.queue,
        history,
      });
    } catch (error) {
      console.warn('Could not find smart related track:', error);
      return null;
    }
  }

  public playPrevious(): void {
    if (this.queue.length === 0) return;

    const status = playerService.getStatus();
    // If track has been playing for more than 4 seconds, restart current track
    if (status.currentTime > 4) {
      playerService.seekTo(0);
      return;
    }

    if (this.currentIndex - 1 >= 0) {
      this.playIndex(this.currentIndex - 1);
    } else {
      playerService.seekTo(0);
    }
  }

  private handleTrackEnded(): void {
    const status = playerService.getStatus();
    if (status.repeatMode === 'one' && this.currentIndex !== -1) {
      playerService.seekTo(0);
      playerService.play();
      return;
    }

    void this.playNext();
  }

  private persistQueue(): void {
    LocalStorageManager.saveQueue(this.queue, this.currentIndex);
  }

  public subscribeQueue(listener: QueueListener): () => void {
    this.queueListeners.add(listener);
    listener(this.queue, this.currentIndex);
    return () => {
      this.queueListeners.delete(listener);
    };
  }

  private notifyQueue(): void {
    this.queueListeners.forEach(listener => listener(this.queue, this.currentIndex));
  }

  // ---- Playlist Operations ----

  public getPlaylists(): Playlist[] {
    return [...this.playlists];
  }

  public createPlaylist(name: string, description?: string): Playlist {
    const newPlaylist: Playlist = {
      id: 'pl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name.trim() || 'Playlist mới',
      description: description?.trim() || '',
      tracks: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.playlists.push(newPlaylist);
    this.persistPlaylists();
    this.notifyPlaylists();
    return newPlaylist;
  }

  public renamePlaylist(id: string, newName: string): void {
    const pl = this.playlists.find(p => p.id === id);
    if (pl) {
      pl.name = newName.trim();
      pl.updatedAt = Date.now();
      this.persistPlaylists();
      this.notifyPlaylists();
    }
  }

  public deletePlaylist(id: string): void {
    if (id === 'favorites') return; // Cannot delete favorites
    this.playlists = this.playlists.filter(p => p.id !== id);
    this.persistPlaylists();
    this.notifyPlaylists();
  }

  public addTrackToPlaylist(playlistId: string, track: TrackReference): boolean {
    const pl = this.playlists.find(p => p.id === playlistId);
    if (!pl) return false;

    // Avoid duplicates in the same playlist
    if (pl.tracks.some(t => t.videoId === track.videoId)) {
      return false;
    }

    pl.tracks.push({ ...track, addedAt: Date.now() });
    pl.updatedAt = Date.now();
    this.persistPlaylists();
    this.notifyPlaylists();
    return true;
  }

  public removeTrackFromPlaylist(playlistId: string, videoId: string): void {
    const pl = this.playlists.find(p => p.id === playlistId);
    if (pl) {
      pl.tracks = pl.tracks.filter(t => t.videoId !== videoId);
      pl.updatedAt = Date.now();
      this.persistPlaylists();
      this.notifyPlaylists();
    }
  }

  public isFavorite(videoId: string): boolean {
    const favorites = this.playlists.find(p => p.id === 'favorites');
    return favorites ? favorites.tracks.some(t => t.videoId === videoId) : false;
  }

  public toggleFavorite(track: TrackReference): boolean {
    const favorites = this.playlists.find(p => p.id === 'favorites');
    if (!favorites) return false;

    const exists = favorites.tracks.some(t => t.videoId === track.videoId);
    if (exists) {
      favorites.tracks = favorites.tracks.filter(t => t.videoId !== track.videoId);
    } else {
      favorites.tracks.unshift({ ...track, addedAt: Date.now() });
    }
    favorites.updatedAt = Date.now();
    this.persistPlaylists();
    this.notifyPlaylists();
    return !exists;
  }

  private persistPlaylists(): void {
    LocalStorageManager.savePlaylists(this.playlists);
  }

  public subscribePlaylists(listener: PlaylistsListener): () => void {
    this.playlistsListeners.add(listener);
    listener(this.playlists);
    return () => {
      this.playlistsListeners.delete(listener);
    };
  }

  private notifyPlaylists(): void {
    this.playlistsListeners.forEach(listener => listener(this.playlists));
  }
}

export const playlistService = new PlaylistService();
