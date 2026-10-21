import { PlayerStatus, TrackReference } from '../models/types';
import { audioOutputService } from './audioOutputService';

// Declaring YouTube IFrame API global typings
declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
    electronAPI?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      setAudioOutputDevice?: (deviceId: string) => Promise<boolean>;
      onMediaControl: (callback: (action: string) => void) => () => void;
      setAppBadge?: (text: string) => void;
    };
  }
}

export type PlayerListener = (status: PlayerStatus) => void;

class PlayerService {
  private player: any = null;
  private isApiReady: boolean = false;
  private isPlayerReady: boolean = false;
  private progressTimer: any = null;
  private pendingVideoId: string | null = null;
  private listeners: Set<PlayerListener> = new Set();

  private status: PlayerStatus = {
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 80,
    isMuted: false,
    isBuffering: false,
    repeatMode: 'off',
    isShuffled: false,
    error: null,
  };

  constructor() {
    this.loadYouTubeIframeAPI();
  }

  private loadYouTubeIframeAPI(): void {
    if (window.YT && window.YT.Player) {
      this.isApiReady = true;
      return;
    }

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      this.isApiReady = true;
      if (prevReady) prevReady();
      if (this.pendingVideoId) {
        const id = this.pendingVideoId;
        this.pendingVideoId = null;
        this.initPlayer(id);
      }
    };

    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }

  public initPlayer(containerId: string): void {
    if (!this.isApiReady) {
      this.pendingVideoId = containerId;
      return;
    }

    if (this.player) {
      return;
    }

    try {
      this.player = new window.YT.Player(containerId, {
        height: '100%',
        width: '100%',
        host: 'https://www.youtube.com',
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: 'https://www.youtube.com',
          widget_referrer: 'https://www.youtube.com',
          fs: 0,
          enablejsapi: 1,
        },
        events: {
          onReady: () => {
            this.isPlayerReady = true;
            this.player.setVolume(this.status.volume);
            audioOutputService.applySinkToAllMedia();
            this.notify();
          },
          onStateChange: (event: any) => {
            this.handleStateChange(event.data);
          },
          onError: (event: any) => {
            this.handlePlayerError(event.data);
          },
        },
      });
    } catch (err) {
      console.error('Failed to initialize YouTube player:', err);
    }
  }

  private handleStateChange(state: number): void {
    let isPlaying = this.status.isPlaying;
    let isBuffering = false;

    if (state === 1) { // Playing
      isPlaying = true;
      isBuffering = false;
      this.status.error = null;
      this.startProgressTimer();
      // Ensure audio output is routed to active speaker
      audioOutputService.applySinkToAllMedia();
    } else if (state === 2) { // Paused
      isPlaying = false;
      isBuffering = false;
      this.stopProgressTimer();
    } else if (state === 3) { // Buffering
      isBuffering = true;
    } else if (state === 0) { // Ended
      isPlaying = false;
      isBuffering = false;
      this.stopProgressTimer();
      this.status.currentTime = this.status.duration;
      this.notify();

      if (this.onTrackEndedCallback) {
        this.onTrackEndedCallback();
      }
      return;
    }

    this.status = {
      ...this.status,
      isPlaying,
      isBuffering,
    };
    this.notify();
  }

  private handlePlayerError(errorCode: number): void {
    this.stopProgressTimer();

    // If errorCode 150 or 101 (owner restricted embedding), attempt unblocked fallback
    if ((errorCode === 150 || errorCode === 101) && this.status.currentTrack) {
      console.warn('Embedding restricted video detected, applying direct stream fallback...');
      try {
        // Reload video with direct loadVideoById with origin override
        this.player.loadVideoById({
          videoId: this.status.currentTrack.videoId,
          suggestedQuality: 'small',
        });
        this.status.error = null;
        return;
      } catch (e) {
        console.warn('Direct stream fallback attempt finished', e);
      }
    }

    let message = 'Không thể phát video này.';
    if (errorCode === 2) {
      message = 'Tham số video không hợp lệ.';
    } else if (errorCode === 5) {
      message = 'Lỗi phát HTML5 từ YouTube.';
    } else if (errorCode === 100) {
      message = 'Video không tồn tại hoặc đã bị xóa.';
    } else if (errorCode === 101 || errorCode === 150) {
      message = 'Chủ sở hữu giới hạn bản quyền phát trên web ngoài. Ứng dụng đang tối ưu kết nối trực tiếp.';
    }

    this.status = {
      ...this.status,
      isPlaying: false,
      isBuffering: false,
      error: message,
    };
    this.notify();
  }

  private startProgressTimer(): void {
    this.stopProgressTimer();
    this.progressTimer = setInterval(() => {
      if (this.player && this.isPlayerReady) {
        try {
          const currentTime = this.player.getCurrentTime() || 0;
          const duration = this.player.getDuration() || 0;
          this.status = {
            ...this.status,
            currentTime,
            duration,
          };
          this.notify();
        } catch (e) {
          console.warn('Error reading player time', e);
        }
      }
    }, 500);
  }

  private stopProgressTimer(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  public onTrackEndedCallback: (() => void) | null = null;

  public playTrack(track: TrackReference): void {
    this.status = {
      ...this.status,
      currentTrack: track,
      error: null,
      currentTime: 0,
      duration: 0,
      isBuffering: true,
    };
    this.notify();

    if (this.player && this.isPlayerReady) {
      try {
        this.player.loadVideoById({
          videoId: track.videoId,
        });
        setTimeout(() => {
          audioOutputService.applySinkToAllMedia();
        }, 300);
      } catch (e) {
        console.error('Error loading video by ID', e);
      }
    }
  }

  public play(): void {
    if (this.player && this.isPlayerReady) {
      try {
        this.player.playVideo();
      } catch (e) {
        console.error('playVideo failed', e);
      }
    }
  }

  public pause(): void {
    if (this.player && this.isPlayerReady) {
      try {
        this.player.pauseVideo();
      } catch (e) {
        console.error('pauseVideo failed', e);
      }
    }
  }

  public togglePlayPause(): void {
    if (this.status.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public seekTo(seconds: number): void {
    if (this.player && this.isPlayerReady) {
      try {
        this.player.seekTo(seconds, true);
        this.status = { ...this.status, currentTime: seconds };
        this.notify();
      } catch (e) {
        console.error('seekTo failed', e);
      }
    }
  }

  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(100, volume));
    if (this.player && this.isPlayerReady) {
      try {
        this.player.setVolume(clamped);
        if (clamped > 0 && this.status.isMuted) {
          this.player.unMute();
          this.status.isMuted = false;
        }
      } catch (e) {
        console.error('setVolume failed', e);
      }
    }
    this.status = { ...this.status, volume: clamped };
    this.notify();
  }

  public toggleMute(): void {
    if (this.player && this.isPlayerReady) {
      try {
        if (this.status.isMuted) {
          this.player.unMute();
          this.status.isMuted = false;
        } else {
          this.player.mute();
          this.status.isMuted = true;
        }
        this.notify();
      } catch (e) {
        console.error('toggleMute failed', e);
      }
    }
  }

  public setRepeatMode(mode: 'off' | 'one' | 'all'): void {
    this.status = { ...this.status, repeatMode: mode };
    this.notify();
  }

  public toggleShuffle(): void {
    this.status = { ...this.status, isShuffled: !this.status.isShuffled };
    this.notify();
  }

  public getStatus(): PlayerStatus {
    return { ...this.status };
  }

  public subscribe(listener: PlayerListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const current = { ...this.status };
    this.listeners.forEach((listener) => {
      try {
        listener(current);
      } catch (e) {
        console.error('Listener callback error', e);
      }
    });
  }
}

export const playerService = new PlayerService();
