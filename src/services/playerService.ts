import { PlayerStatus, TrackReference } from '../models/types';
import { audioOutputService } from './audioOutputService';

export type PlayerListener = (status: PlayerStatus) => void;

class PlayerService {
  private webview: any = null;
  private webviewLoadListener: (() => void) | null = null;
  private progressTimer: any = null;
  private listeners: Set<PlayerListener> = new Set();
  public onTrackEndedCallback: (() => void) | null = null;
  private isEndedHandled: boolean = false;
  private trackStartTime: number = 0;
  private userWantsPlaying: boolean = false;

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

    // Inject persistent in-page ad skipper, interstitial confirmation, and audio config
    const activeSink = audioOutputService.getActiveDeviceId();
    const script = `
      (() => {
        function purgeAdsAndWarnings() {
          try {
            const p = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
            const v = document.querySelector('video');

            // 1. Strictly detect ACTIVE in-stream ad
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
              if (v.muted && !${this.status.isMuted}) {
                v.muted = false;
              }
            }

            // 2. Click any skip button immediately
            const skipBtns = document.querySelectorAll(
              '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-text, button.ytp-ad-skip-button-text, .ytp-ad-overlay-close-button'
            );
            skipBtns.forEach(b => { try { b.click(); } catch(e) {} });

            if (p && typeof p.skipAd === 'function') {
              try { p.skipAd(); } catch (e) {}
            }

            // 3. Auto-confirm viewer discretion / age warning prompts (Kendrick Lamar Not Like Us)
            const confirmBtns = document.querySelectorAll(
              '#confirm-button, ytd-button-renderer#confirm-button button, button[aria-label*="understand" i], button[aria-label*="proceed" i], button[aria-label*="continue" i], yt-playability-error-supported-renderers button, ytd-enforcement-message-view-model button'
            );
            confirmBtns.forEach(b => { try { b.click(); } catch(e) {} });

            // 4. Auto-resume main video if paused after consent prompt
            if (v && v.paused && !isAd && ${this.userWantsPlaying}) {
              v.play().catch(() => {});
              if (p && typeof p.playVideo === 'function') {
                p.playVideo();
              }
            }
          } catch (e) {}
        }

        // Install MutationObserver for instant synchronous ad skipping
        if (!window.__yt_ad_cleaner_installed) {
          window.__yt_ad_cleaner_installed = true;
          try {
            const obs = new MutationObserver(purgeAdsAndWarnings);
            obs.observe(document.body || document.documentElement, {
              childList: true,
              subtree: true,
              attributes: true,
              attributeFilter: ['class']
            });
          } catch(e) {}
          setInterval(purgeAdsAndWarnings, 150);
        }

        // Run once immediately
        purgeAdsAndWarnings();

        // Audio sink & volume initialization
        try {
          const v = document.querySelector('video');
          if (v) {
            v.volume = ${this.status.volume / 100};
            v.muted = ${this.status.isMuted};
            if (typeof v.setSinkId === 'function' && '${activeSink}' !== 'default') {
              v.setSinkId('${activeSink}').catch(() => {});
            }
            if (${this.userWantsPlaying}) {
              v.play().catch(() => {});
              const p = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
              if (p && typeof p.playVideo === 'function') {
                try { p.playVideo(); } catch (e) {}
              }
            }
          }
        } catch (e) {}
      })();
    `;

    try {
      this.webview.executeJavaScript(script).catch(() => {});
    } catch {}
  }

  private startPollingTimer(): void {
    if (this.progressTimer) return;

    this.progressTimer = setInterval(async () => {
      if (!this.webview || !this.status.currentTrack) return;

      const queryScript = `
        (() => {
          try {
            const v = document.querySelector('video');
            if (!v) return null;
            const p = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
            const videoId = p && typeof p.getVideoData === 'function'
              ? p.getVideoData().video_id
              : null;

            // Check if in-stream ad is strictly active
            const adActive = Boolean(
              p?.classList.contains('ad-showing') ||
              p?.classList.contains('ad-interrupting') ||
              (p && typeof p.getAdState === 'function' && p.getAdState() === 1)
            );

            if (adActive) {
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
            } else if (v) {
              if (v.playbackRate !== 1) v.playbackRate = 1;
              if (v.muted && !${this.status.isMuted}) {
                v.muted = false;
              }
              const targetVol = ${this.status.volume / 100};
              if (Math.abs(v.volume - targetVol) > 0.05) {
                v.volume = targetVol;
              }

              // Active playback enforcement based on user intent
              if (${this.userWantsPlaying} && v.paused && !v.ended) {
                v.play().catch(() => {});
                if (p && typeof p.playVideo === 'function') {
                  p.playVideo();
                }
              } else if (!${this.userWantsPlaying} && !v.paused) {
                v.pause();
                if (p && typeof p.pauseVideo === 'function') {
                  p.pauseVideo();
                }
              }
            }

            // Click interstitial warnings / confirm buttons (e.g. Kendrick Lamar content warning)
            const confirmBtns = document.querySelectorAll(
              '#confirm-button, ytd-button-renderer#confirm-button button, button[aria-label*="understand" i], button[aria-label*="proceed" i], button[aria-label*="continue" i], yt-playability-error-supported-renderers button, ytd-enforcement-message-view-model button'
            );
            confirmBtns.forEach(b => { try { b.click(); } catch(e) {} });

            // Check if there is a fatal playback error
            const errEl = document.querySelector('ytd-player-error-message-renderer:not([hidden]), #error-screen:not([hidden])');
            const hasError = Boolean(
              v.error ||
              (errEl && errEl.offsetParent !== null && errEl.innerText && errEl.innerText.trim().length > 15 && (!v.currentTime || v.currentTime === 0))
            );

            return {
              videoId,
              adActive,
              hasError,
              currentTime: v.currentTime || 0,
              duration: v.duration || 0,
              paused: v.paused,
              ended: v.ended,
              seeking: v.seeking,
              readyState: v.readyState
            };
          } catch (e) {
            return null;
          }
        })();
      `;

      try {
        const data = await this.webview.executeJavaScript(queryScript);
        if (data) {
          if (data.adActive) {
            this.status = {
              ...this.status,
              isBuffering: true,
              error: null,
            };
            this.notify();
            return;
          }

          if (data.hasError && data.currentTime === 0) {
            this.status = {
              ...this.status,
              isPlaying: false,
              isBuffering: false,
              error: 'Không thể phát track này do giới hạn bản quyền của YouTube.',
            };
            this.notify();
            return;
          }

          // Video ID mismatch check after 4s (if player failed to switch)
          const timeSinceTrackStart = Date.now() - this.trackStartTime;
          if (
            data.videoId &&
            this.status.currentTrack &&
            data.videoId !== this.status.currentTrack.videoId &&
            timeSinceTrackStart > 4000
          ) {
            const targetUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(this.status.currentTrack.videoId)}&vq=small`;
            void this.webview.loadURL(targetUrl).catch(() => {});
            return;
          }

          const isVideoPlaying = !data.paused && !data.ended;
          const isBuffering = this.userWantsPlaying && (!isVideoPlaying || data.readyState < 3);

          this.status = {
            ...this.status,
            currentTime: data.currentTime,
            duration: data.duration > 0 ? data.duration : this.status.duration,
            isPlaying: this.userWantsPlaying,
            isBuffering,
            error: null,
          };
          this.notify();

          // Natural track ended check
          if (timeSinceTrackStart > 3500) {
            const isNearEnd =
              data.duration > 15 &&
              (data.currentTime >= data.duration - 0.8 || (data.ended && data.currentTime >= data.duration - 2.5));

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
      // 1. Fast in-player switch without reloading the page
      try {
        const switchScript = `
          (() => {
            try {
              const p = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
              const v = document.querySelector('video');
              if (p && typeof p.loadVideoById === 'function') {
                p.loadVideoById('${track.videoId}');
                if (v) {
                  v.muted = ${this.status.isMuted};
                  v.volume = ${this.status.volume / 100};
                }
                p.playVideo?.();
                v?.play()?.catch(() => {});
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

      // 2. Fallback to loadURL if player is not initialized yet
      try {
        const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(track.videoId)}&vq=small`;
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
        .executeJavaScript(
          '(() => { try { document.querySelector("video")?.play(); document.getElementById("movie_player")?.playVideo?.(); } catch(e){} })()'
        )
        .catch(() => {});
    }
  }

  public pause(): void {
    this.userWantsPlaying = false;
    this.status.isPlaying = false;
    this.notify();

    if (this.webview) {
      this.webview
        .executeJavaScript(
          '(() => { try { document.querySelector("video")?.pause(); document.getElementById("movie_player")?.pauseVideo?.(); } catch(e){} })()'
        )
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
        .executeJavaScript(`(() => { try { const v = document.querySelector('video'); if (v) v.currentTime = ${seconds}; } catch(e){} })()`)
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
        .executeJavaScript(
          `(() => { try { const v = document.querySelector('video'); if (v) { v.volume = ${clamped / 100}; v.muted = false; } } catch(e){} })()`
        )
        .catch(() => {});
    }
  }

  public toggleMute(): void {
    const nextMuted = !this.status.isMuted;
    this.status.isMuted = nextMuted;
    this.notify();

    if (this.webview) {
      this.webview
        .executeJavaScript(`(() => { try { const v = document.querySelector('video'); if (v) v.muted = ${nextMuted}; } catch(e){} })()`)
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
