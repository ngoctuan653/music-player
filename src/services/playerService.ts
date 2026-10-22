import { PlayerStatus, TrackReference } from '../models/types';
import { audioOutputService } from './audioOutputService';

export type PlayerListener = (status: PlayerStatus) => void;

export interface PlayerInjectedScriptOptions {
  volume: number;
  isMuted: boolean;
  activeSink?: string;
  userWantsPlaying: boolean;
}

export function buildPlayerInjectedScript(opts: PlayerInjectedScriptOptions): string {
  const { volume, isMuted, activeSink, userWantsPlaying } = opts;
  return `
    (() => {
      // 1. Maintain runtime playback intent
      window.__userWantsPlaying = ${userWantsPlaying ? 'true' : 'false'};

      // 2. Ad cleaner & prompt skipper (NEVER forces playback)
      function purgeAdsAndWarnings() {
        try {
          const p = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
          const v = document.querySelector('video');

          // Disable YouTube native autonav to prevent skipping past user queue
          if (p && typeof p.setAutonav === 'function') {
            try { p.setAutonav(false); } catch(e) {}
          }

          // Strictly detect ACTIVE in-stream ad
          const isAd = Boolean(
            p?.classList.contains('ad-showing') ||
            p?.classList.contains('ad-interrupting') ||
            (p && typeof p.getAdState === 'function' && p.getAdState() === 1)
          );

          if (isAd && v) {
            v.muted = true;
            v.playbackRate = 16;
            if (!isNaN(v.duration) && v.duration > 0 && v.currentTime < v.duration - 0.2) {
              v.currentTime = v.duration;
            }
          } else if (v && !isAd) {
            if (v.playbackRate !== 1) v.playbackRate = 1;
            if (v.muted && !${isMuted ? 'true' : 'false'}) {
              v.muted = false;
            }
          }

          // Click any skip button immediately
          const skipBtns = document.querySelectorAll(
            '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-text, button.ytp-ad-skip-button-text, .ytp-ad-overlay-close-button'
          );
          skipBtns.forEach(b => { try { b.click(); } catch(e) {} });

          if (p && typeof p.skipAd === 'function') {
            try { p.skipAd(); } catch (e) {}
          }

          // Auto-confirm viewer discretion / age warning prompts (e.g. Kendrick Lamar Not Like Us)
          const confirmBtns = document.querySelectorAll(
            '#confirm-button, ytd-button-renderer#confirm-button button, button[aria-label*="understand" i], button[aria-label*="proceed" i], button[aria-label*="continue" i], yt-playability-error-supported-renderers button, ytd-enforcement-message-view-model button'
          );
          confirmBtns.forEach(b => { try { b.click(); } catch(e) {} });
        } catch (e) {}
      }

      // Install MutationObserver targeting player container if available
      if (!window.__yt_ad_cleaner_installed) {
        window.__yt_ad_cleaner_installed = true;
        try {
          const target = document.getElementById('player') || document.getElementById('movie_player') || document.body;
          const obs = new MutationObserver(purgeAdsAndWarnings);
          obs.observe(target, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
          });
        } catch(e) {}
        setInterval(purgeAdsAndWarnings, 250);
      }

      purgeAdsAndWarnings();

      // Audio sink & volume initialization
      try {
        const v = document.querySelector('video');
        if (v) {
          v.volume = ${volume / 100};
          v.muted = ${isMuted ? 'true' : 'false'};
          if (typeof v.setSinkId === 'function' && '${activeSink || 'default'}' !== 'default') {
            v.setSinkId('${activeSink}').catch(() => {});
          }
        }
      } catch (e) {}
    })();
  `;
}

class PlayerService {
  private webview: any = null;
  private webviewLoadListener: (() => void) | null = null;
  private progressTimer: any = null;
  private listeners: Set<PlayerListener> = new Set();
  public onTrackEndedCallback: (() => void) | null = null;
  private isEndedHandled: boolean = false;
  private trackStartTime: number = 0;
  private userWantsPlaying: boolean = false;
  private isPlayerReady: boolean = false;
  private pendingTrack: TrackReference | null = null;
  private errorStreakCounter: number = 0;

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

  public initWebview(wv: any): void {
    if (!wv) return;
    if (this.webview === wv) return;

    if (this.webview && this.webviewLoadListener) {
      try {
        this.webview.removeEventListener('dom-ready', this.webviewLoadListener);
        this.webview.removeEventListener('did-finish-load', this.webviewLoadListener);
      } catch {}
    }

    this.webview = wv;
    this.isPlayerReady = false;

    this.webviewLoadListener = () => {
      this.onWebviewLoaded();
    };

    try {
      this.webview.addEventListener('dom-ready', this.webviewLoadListener);
      this.webview.addEventListener('did-finish-load', this.webviewLoadListener);
    } catch {}

    this.startPollingTimer();
  }

  // Backwards compatibility if called with containerId
  public initPlayer(containerId?: string): void {
    const el = document.getElementById(containerId || 'yt-player-webview');
    if (el) {
      this.initWebview(el);
    }
  }

  private onWebviewLoaded(): void {
    if (!this.webview) return;

    // Inject sleek CSS: hide all YouTube header/footer/sidebar/recommendations and ad containers
    const css = `
      #masthead-container, #secondary, #below, #chat, #comments, ytd-miniplayer,
      .video-ads, .ytp-ad-module, .ytp-ad-player-overlay, .ytp-ad-overlay-container,
      .ytp-ad-action-interstitial, .ytp-ad-preview-container, .ytp-ad-text,
      ytd-promoted-video-renderer, ytd-display-ad-renderer, ytd-banner-promo-renderer,
      ytd-in-feed-ad-layout-renderer, ytd-ad-slot-renderer, #player-ads,
      .ytd-player-legacy-desktop-watch-ads-renderer, ytd-action-companion-ad-renderer,
      #companion {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
      #page-manager {
        margin: 0 !important;
      }
      ytd-watch-flexy {
        padding: 0 !important;
        min-width: 0 !important;
      }
      #player-container-outer, #player-container-inner, #player, #ytd-player, .html5-video-player {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 999999 !important;
      }
      video.video-stream {
        width: 100% !important;
        height: 100% !important;
        object-fit: contain !important;
      }
      body {
        overflow: hidden !important;
        background: black !important;
      }
    `;

    try {
      this.webview.insertCSS(css).catch(() => {});
    } catch {}

    const activeSink = audioOutputService.getActiveDeviceId();
    const script = buildPlayerInjectedScript({
      volume: this.status.volume,
      isMuted: this.status.isMuted,
      activeSink,
      userWantsPlaying: this.userWantsPlaying,
    });

    try {
      this.webview.executeJavaScript(script).catch(() => {});
    } catch {}
  }

  private startPollingTimer(): void {
    if (this.progressTimer) return;

    this.progressTimer = setInterval(async () => {
      if (!this.webview) return;

      const queryScript = `
        (() => {
          try {
            const p = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
            const v = document.querySelector('video');
            const isReady = Boolean(p && typeof p.loadVideoById === 'function');
            const playerState = p && typeof p.getPlayerState === 'function' ? p.getPlayerState() : -1;
            const videoId = p && typeof p.getVideoData === 'function' ? p.getVideoData()?.video_id : null;

            // Check if in-stream ad is strictly active
            const adActive = Boolean(
              p?.classList.contains('ad-showing') ||
              p?.classList.contains('ad-interrupting') ||
              (p && typeof p.getAdState === 'function' && p.getAdState() === 1)
            );

            if (adActive && v) {
              v.muted = true;
              v.playbackRate = 16;
              if (!isNaN(v.duration) && v.duration > 0 && v.currentTime < v.duration - 0.2) {
                v.currentTime = v.duration;
              }
              const skipBtns = document.querySelectorAll(
                '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, button.ytp-ad-skip-button-text'
              );
              skipBtns.forEach(b => { try { b.click(); } catch(e) {} });
              if (p && typeof p.skipAd === 'function') {
                try { p.skipAd(); } catch(e) {}
              }
            } else if (v && !adActive) {
              if (v.playbackRate !== 1) v.playbackRate = 1;
              if (v.muted && !${this.status.isMuted ? 'true' : 'false'}) {
                v.muted = false;
              }
            }

            // Real media error on video element
            const mediaError = Boolean(v?.error);

            // Error screen check: only if visibly rendered on screen
            const errEl = document.querySelector('ytd-player-error-message-renderer, #error-screen');
            let isDomErrorVisible = false;
            if (errEl) {
              const style = window.getComputedStyle(errEl);
              isDomErrorVisible = style.display !== 'none' && style.visibility !== 'hidden' && (errEl.innerText || '').trim().length > 15;
            }

            return {
              isReady,
              playerState,
              videoId,
              adActive,
              mediaError,
              isDomErrorVisible,
              currentTime: v?.currentTime || 0,
              duration: v?.duration || 0,
              paused: v ? v.paused : true,
              ended: v ? v.ended : false,
              readyState: v ? v.readyState : 0,
            };
          } catch (e) {
            return null;
          }
        })();
      `;

      try {
        const data = await this.webview.executeJavaScript(queryScript);
        if (data) {
          // 1. Player readiness lifecycle transition
          if (data.isReady && !this.isPlayerReady) {
            this.isPlayerReady = true;

            // If a track was queued during cold start, dispatch it now!
            if (this.pendingTrack && this.userWantsPlaying) {
              const target = this.pendingTrack;
              this.pendingTrack = null;
              this.trackStartTime = Date.now();
              const initPlayScript = `
                (() => {
                  try {
                    window.__userWantsPlaying = true;
                    const p = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
                    const v = document.querySelector('video');
                    if (p && typeof p.loadVideoById === 'function') {
                      const currentId = p.getVideoData ? p.getVideoData()?.video_id : null;
                      if (currentId === '${target.videoId}') {
                        p.seekTo?.(0, true);
                        p.playVideo?.();
                      } else {
                        p.loadVideoById('${target.videoId}');
                        p.playVideo?.();
                      }
                      if (v) {
                        v.muted = ${this.status.isMuted ? 'true' : 'false'};
                        v.volume = ${this.status.volume / 100};
                        v.play().catch(() => {});
                      }
                    }
                  } catch(e) {}
                })()
              `;
              void this.webview.executeJavaScript(initPlayScript).catch(() => {});
            }
          }

          if (!this.status.currentTrack) return;

          // 2. Active ad segment handling
          if (data.adActive) {
            this.status = {
              ...this.status,
              isBuffering: true,
              error: null,
            };
            this.notify();
            return;
          }

          // 3. Error handling: Media errors trigger immediately; DOM errors require 3 consecutive cycles
          if (data.mediaError) {
            this.status = {
              ...this.status,
              isPlaying: false,
              isBuffering: false,
              error: 'Không thể phát track này do lỗi stream từ YouTube.',
            };
            this.notify();
            return;
          }

          if (this.isPlayerReady && data.isDomErrorVisible && data.currentTime === 0) {
            this.errorStreakCounter++;
            if (this.errorStreakCounter >= 3) {
              this.status = {
                ...this.status,
                isPlaying: false,
                isBuffering: false,
                error: 'Không thể phát track này do giới hạn bản quyền của YouTube.',
              };
              this.notify();
              return;
            }
          } else {
            this.errorStreakCounter = 0;
          }

          // 4. Runtime playback intent synchronization
          if (!this.userWantsPlaying) {
            // User wants paused: if video or movie_player is running, force pause
            if (!data.paused || data.playerState === 1) {
              this.webview.executeJavaScript(`
                (() => {
                  try {
                    window.__userWantsPlaying = false;
                    document.querySelector('video')?.pause();
                    document.getElementById('movie_player')?.pauseVideo?.();
                  } catch(e){}
                })()
              `).catch(() => {});
            }
          } else if (this.userWantsPlaying && data.paused && !data.ended && data.isReady) {
            // User wants playing: resume if player is unstarted (-1) or paused (2) and not buffering (3)
            if (data.playerState === -1 || data.playerState === 2) {
              this.webview.executeJavaScript(`
                (() => {
                  try {
                    if (window.__userWantsPlaying) {
                      document.getElementById('movie_player')?.playVideo?.();
                      document.querySelector('video')?.play().catch(() => {});
                    }
                  } catch(e){}
                })()
              `).catch(() => {});
            }
          }

          const isVideoPlaying = !data.paused && !data.ended && (data.playerState === 1 || data.currentTime > 0);
          const isBuffering = this.userWantsPlaying && (!isVideoPlaying || data.readyState < 3 || data.playerState === 3);

          this.status = {
            ...this.status,
            currentTime: data.currentTime,
            duration: data.duration > 0 ? data.duration : this.status.duration,
            isPlaying: this.userWantsPlaying,
            isBuffering,
            error: null,
          };
          this.notify();

          // 5. Natural track ended check (MUST only fire on full songs, never on ad segments)
          const timeSinceTrackStart = Date.now() - this.trackStartTime;
          if (timeSinceTrackStart > 3500 && !data.adActive && data.duration > 45 && data.currentTime > 30) {
            const isNearEnd =
              data.currentTime >= data.duration - 1.2 ||
              (data.ended && data.currentTime >= data.duration - 3);

            if (isNearEnd && !this.isEndedHandled) {
              this.isEndedHandled = true;
              this.handleTrackEnded();
            }
          }
        }
      } catch {
        // webview navigating or destroyed
      }
    }, 250);
  }

  private handleTrackEnded(): void {
    if (this.status.repeatMode === 'one') {
      this.seekTo(0);
      this.play();
      this.isEndedHandled = false;
    } else if (this.onTrackEndedCallback) {
      this.onTrackEndedCallback();
    }
  }

  public async playTrack(track: TrackReference): Promise<void> {
    this.isEndedHandled = false;
    this.userWantsPlaying = true;
    this.trackStartTime = Date.now();
    this.errorStreakCounter = 0;
    this.status = {
      ...this.status,
      currentTrack: track,
      error: null,
      currentTime: 0,
      duration: 0,
      isBuffering: true,
      isPlaying: true,
    };
    this.notify();

    if (!this.webview) {
      const el = document.getElementById('yt-player-webview');
      if (el) {
        this.initWebview(el);
      }
    }

    if (this.webview) {
      // 1. Fast in-player switch if player engine is already initialized
      if (this.isPlayerReady) {
        try {
          const switchScript = `
            (() => {
              try {
                window.__userWantsPlaying = true;
                const p = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
                const v = document.querySelector('video');
                if (p && typeof p.loadVideoById === 'function') {
                  const currentId = p.getVideoData ? p.getVideoData()?.video_id : null;
                  if (currentId === '${track.videoId}') {
                    // Replay same song: seek to start and play
                    p.seekTo?.(0, true);
                    p.playVideo?.();
                  } else {
                    p.loadVideoById('${track.videoId}');
                    p.playVideo?.();
                  }
                  if (v) {
                    v.muted = ${this.status.isMuted ? 'true' : 'false'};
                    v.volume = ${this.status.volume / 100};
                    v.play().catch(() => {});
                  }
                  // Auto-confirm warning if present immediately
                  setTimeout(() => {
                    document.querySelectorAll('#confirm-button, ytd-button-renderer#confirm-button button, button[aria-label*="proceed" i]').forEach(b => {
                      try { b.click(); } catch(e) {}
                    });
                  }, 200);
                  return true;
                }
                return false;
              } catch (e) {
                return false;
              }
            })();
          `;
          const switched = await this.webview.executeJavaScript(switchScript);
          if (switched) {
            return;
          }
        } catch {}
      }

      // 2. Cold start or player engine not ready yet:
      this.pendingTrack = track;
      this.isPlayerReady = false;

      try {
        const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(track.videoId)}&autoplay=1&vq=small`;
        void this.webview.loadURL(watchUrl).catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          if (!message.includes('ERR_ABORTED')) {
            console.error('Failed to load track in webview:', error);
            this.status = {
              ...this.status,
              isPlaying: false,
              isBuffering: false,
              error: 'Không thể phát track này từ YouTube.',
            };
            this.notify();
          }
        });
      } catch (err) {
        console.error('Failed to load track in webview:', err);
      }
    }
  }

  public play(): void {
    this.userWantsPlaying = true;
    this.status.isPlaying = true;
    this.notify();

    if (this.webview) {
      this.webview
        .executeJavaScript(`
          (() => {
            try {
              window.__userWantsPlaying = true;
              const p = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
              p?.playVideo?.();
              const v = document.querySelector('video');
              if (v && v.paused) v.play().catch(() => {});
            } catch(e){}
          })()
        `)
        .catch(() => {});
    }
  }

  public pause(): void {
    this.userWantsPlaying = false;
    this.status.isPlaying = false;
    this.notify();

    if (this.webview) {
      this.webview
        .executeJavaScript(`
          (() => {
            try {
              window.__userWantsPlaying = false;
              const p = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
              p?.pauseVideo?.();
              const v = document.querySelector('video');
              if (v) v.pause();
            } catch(e){}
          })()
        `)
        .catch(() => {});
    }
  }

  public togglePlayPause(): void {
    if (this.userWantsPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public seekTo(seconds: number): void {
    this.status.currentTime = seconds;
    this.notify();

    if (this.webview) {
      this.webview
        .executeJavaScript(`
          (() => {
            try {
              const p = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
              if (p && typeof p.seekTo === 'function') {
                p.seekTo(${seconds}, true);
              }
              const v = document.querySelector('video');
              if (v) v.currentTime = ${seconds};
            } catch(e){}
          })()
        `)
        .catch(() => {});
    }
  }

  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(100, volume));
    this.status.volume = clamped;
    this.status.isMuted = clamped === 0;
    this.notify();

    if (this.webview) {
      this.webview
        .executeJavaScript(`
          (() => {
            try {
              const p = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
              if (p && typeof p.setVolume === 'function') {
                p.setVolume(${clamped});
                if (${clamped === 0}) p.mute?.(); else p.unMute?.();
              }
              const v = document.querySelector('video');
              if (v) {
                v.volume = ${clamped / 100};
                v.muted = ${clamped === 0};
              }
            } catch(e){}
          })()
        `)
        .catch(() => {});
    }
  }

  public toggleMute(): void {
    const nextMuted = !this.status.isMuted;
    this.status.isMuted = nextMuted;
    this.notify();

    if (this.webview) {
      this.webview
        .executeJavaScript(`
          (() => {
            try {
              const p = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
              if (p) {
                if (${nextMuted}) p.mute?.(); else p.unMute?.();
              }
              const v = document.querySelector('video');
              if (v) v.muted = ${nextMuted};
            } catch(e){}
          })()
        `)
        .catch(() => {});
    }
  }

  public setRepeatMode(mode: 'off' | 'one' | 'all'): void {
    this.status.repeatMode = mode;
    this.notify();
  }

  public toggleShuffle(): void {
    this.status.isShuffled = !this.status.isShuffled;
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
