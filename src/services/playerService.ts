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
  private isFallbackTried: boolean = false;

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
      this.webview.removeEventListener('did-finish-load', this.webviewLoadListener);
    }

    this.webview = wv;

    // When webview finishes loading a video page
    this.webviewLoadListener = () => {
      this.onWebviewLoaded();
    };
    this.webview.addEventListener('did-finish-load', this.webviewLoadListener);

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

            // 1. Detect active in-stream ad
            const isAd = Boolean(
              p?.classList.contains('ad-showing') ||
              p?.classList.contains('ad-interrupting') ||
              document.querySelector('.ad-showing, .ad-interrupting, .ytp-ad-player-overlay') ||
              (p && typeof p.getAdState === 'function' && p.getAdState() === 1)
            );

            if (isAd && v) {
              // Mute instantly
              v.muted = true;
              // Jump directly to end of ad segment
              if (!isNaN(v.duration) && v.duration > 0) {
                v.currentTime = v.duration + 0.5;
              } else {
                v.currentTime = 99999;
              }
            }

            // 2. Click any skip button immediately
            const skipBtns = document.querySelectorAll(
              '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-text, button.ytp-ad-skip-button-text, .ytp-ad-overlay-close-button, button[class*="skip-button"], button[id*="skip"], .ytp-ad-text.ytp-ad-preview-text'
            );
            skipBtns.forEach(b => { try { b.click(); } catch(e) {} });

            if (p && typeof p.skipAd === 'function') {
              try { p.skipAd(); } catch (e) {}
            }

            // 3. Auto-confirm viewer discretion / age warning / interstitial (Kendrick Lamar fix)
            const confirmBtns = document.querySelectorAll(
              '#confirm-button, ytd-button-renderer#confirm-button button, button[aria-label*="understand" i], button[aria-label*="proceed" i], button[aria-label*="continue" i], #dismiss-button, .yt-spec-button-shape-next--filled, ytd-consent-bump-v2-lightbox button, tp-yt-paper-dialog button#dismiss-button'
            );
            confirmBtns.forEach(b => { try { b.click(); } catch(e) {} });

            // 4. Auto-resume main video if paused after prompt
            if (v && v.paused && !isAd) {
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
            v.play().catch(() => {});
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

            // Check if ad is active
            const adActive = Boolean(
              (p && typeof p.getAdState === 'function' && p.getAdState() === 1) ||
              p?.classList.contains('ad-showing') ||
              p?.classList.contains('ad-interrupting') ||
              document.querySelector('.ad-showing, .ad-interrupting, .ytp-ad-player-overlay')
            );

            if (adActive) {
              v.muted = true;
              if (!isNaN(v.duration) && v.duration > 0) {
                v.currentTime = v.duration + 0.5;
              } else {
                v.currentTime = 99999;
              }
              const skipBtns = document.querySelectorAll(
                '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, button.ytp-ad-skip-button-text, .ytp-ad-overlay-close-button, button[class*="skip-button"], button[id*="skip"]'
              );
              skipBtns.forEach(b => { try { b.click(); } catch(e) {} });
              if (p && typeof p.skipAd === 'function') {
                try { p.skipAd(); } catch(e) {}
              }
            } else if (v && v.playbackRate !== 1) {
              v.playbackRate = 1;
              v.muted = ${this.status.isMuted};
            }

            // Click interstitial warnings / confirm buttons
            const confirmBtns = document.querySelectorAll(
              '#confirm-button, ytd-button-renderer#confirm-button button, button[aria-label*="understand" i], button[aria-label*="proceed" i], button[aria-label*="continue" i], #dismiss-button, .yt-spec-button-shape-next--filled'
            );
            confirmBtns.forEach(b => { try { b.click(); } catch(e) {} });

            // Check if video has hard error screen
            const hasError = Boolean(
              document.querySelector('#error-screen, ytd-player-error-message-renderer')
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
          // If video encountered a hard error screen on youtube.com/watch, fallback to embed
          if (data.hasError && !this.isFallbackTried && this.status.currentTrack) {
            this.isFallbackTried = true;
            console.warn('Watch page restricted, switching to embed fallback for', this.status.currentTrack.videoId);
            const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(this.status.currentTrack.videoId)}?autoplay=1&enablejsapi=1`;
            void this.webview.loadURL(embedUrl).catch(() => {});
            return;
          }

          if (data.adActive) {
            this.status = {
              ...this.status,
              isBuffering: true,
              error: null,
            };
            this.notify();
            return;
          }

          const matchesTrack = !data.videoId || data.videoId === this.status.currentTrack.videoId;
          if (matchesTrack) {
            const isPlaying = !data.paused && !data.ended;
            const isBuffering = isPlaying && data.readyState < 3;

            this.status = {
              ...this.status,
              currentTime: data.currentTime,
              duration: data.duration > 0 ? data.duration : this.status.duration,
              isPlaying,
              isBuffering,
              error: null,
            };
            this.notify();

            // Track ended check
            const timeSinceTrackStart = Date.now() - this.trackStartTime;
            if (timeSinceTrackStart > 3500) {
              const isNearEnd = data.readyState >= 2 &&
                ((data.ended && data.currentTime > 3) ||
                  (data.duration > 10 && data.currentTime >= data.duration - 0.6));
              if (isNearEnd && !this.isEndedHandled) {
                this.isEndedHandled = true;
                this.handleTrackEnded();
              }
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
    this.isFallbackTried = false;
    this.trackStartTime = Date.now();
    this.status = {
      ...this.status,
      currentTrack: track,
      error: null,
      currentTime: 0,
      duration: 0,
      isBuffering: false,
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
              if (p && typeof p.loadVideoById === 'function') {
                p.loadVideoById('${track.videoId}');
                p.playVideo?.();
                // Click confirm button if present immediately
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
              error: 'Unable to stream this YouTube track.',
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
    if (this.webview) {
      this.webview.executeJavaScript('document.querySelector("video")?.play()').catch(() => {});
      this.status.isPlaying = true;
      this.notify();
    }
  }

  public pause(): void {
    if (this.webview) {
      this.webview.executeJavaScript('document.querySelector("video")?.pause()').catch(() => {});
      this.status.isPlaying = false;
      this.notify();
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
    this.status.currentTime = seconds;
    this.notify();

    if (this.webview) {
      this.webview
        .executeJavaScript(`if (document.querySelector('video')) document.querySelector('video').currentTime = ${seconds};`)
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
          `if (document.querySelector('video')) { document.querySelector('video').volume = ${clamped / 100}; document.querySelector('video').muted = false; }`
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
        .executeJavaScript(`if (document.querySelector('video')) document.querySelector('video').muted = ${nextMuted};`)
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
