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
  const clampedVol = Math.max(0, Math.min(100, volume));
  const gain = clampedVol <= 0 ? 0 : clampedVol >= 100 ? 1 : Math.pow(clampedVol / 100, 2);
  const ytVol = Math.round(gain * 100);
  return `
    (() => {
      // 0. Intercept JSON.parse & ytInitialPlayerResponse to neutralize ad placements from YouTube player
      try {
        if (!window.__yt_json_hooked) {
          window.__yt_json_hooked = true;
          const origParse = JSON.parse;
          JSON.parse = function(...args) {
            const data = origParse.apply(this, args);
            if (data && typeof data === 'object') {
              if (data.adPlacements) data.adPlacements = [];
              if (data.playerAds) data.playerAds = [];
              if (data.adSlots) data.adSlots = [];
            }
            return data;
          };
          if (window.ytInitialPlayerResponse && typeof window.ytInitialPlayerResponse === 'object') {
            if (window.ytInitialPlayerResponse.adPlacements) window.ytInitialPlayerResponse.adPlacements = [];
            if (window.ytInitialPlayerResponse.playerAds) window.ytInitialPlayerResponse.playerAds = [];
            if (window.ytInitialPlayerResponse.adSlots) window.ytInitialPlayerResponse.adSlots = [];
          }
        }
      } catch(e) {}

      // 1. Maintain runtime playback intent & single source of truth for volume
      window.__userWantsPlaying = ${userWantsPlaying ? 'true' : 'false'};
      window.__currentGain = ${gain};
      window.__isCurrentMuted = ${isMuted ? 'true' : 'false'};

      // 2. High-speed Ad cleaner & prompt skipper
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
            window.__yt_was_in_ad = true;
            // Keep inaudible stream active at 16x speed to bypass ad in milliseconds without buffer stall
            v.muted = false;
            v.volume = 0.00001;
            v.playbackRate = 16;
            // Safely skip forward only within already buffered chunk to prevent Chromium pipeline stall
            if (v.buffered && v.buffered.length > 0) {
              const bEnd = v.buffered.end(v.buffered.length - 1);
              if (bEnd > v.currentTime + 0.5) {
                v.currentTime = bEnd - 0.1;
              }
            }
          } else if (v && window.__yt_was_in_ad) {
            // Restore normal volume ONLY once when transitioning out of ad
            window.__yt_was_in_ad = false;
            if (v.playbackRate !== 1) v.playbackRate = 1;
            const targetGain = typeof window.__currentGain === 'number' ? window.__currentGain : ${gain};
            const targetMuted = typeof window.__isCurrentMuted === 'boolean' ? window.__isCurrentMuted : ${isMuted ? 'true' : 'false'};
            v.volume = targetGain;
            v.muted = targetMuted;
          }

          // Click any skip button immediately
          const skipBtns = document.querySelectorAll(
            '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button-modern, .ytp-ad-skip-button-text, button.ytp-ad-skip-button-text, button[class*="skip-button"], .ytp-ad-overlay-close-button'
          );
          skipBtns.forEach(b => { try { b.click(); } catch(e) {} });

          if (p && typeof p.skipAd === 'function') {
            try { p.skipAd(); } catch (e) {}
          }

          if (p && typeof p.setPlaybackQuality === 'function') {
            try {
              if (p.getPlaybackQuality?.() !== 'tiny') {
                p.setPlaybackQuality('tiny');
              }
            } catch (e) {}
          }

          // Auto-confirm viewer discretion / age warning prompts
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

      // 3. Audio sink & volume initialization (runs ONCE on track load)
      try {
        const v = document.querySelector('video');
        if (v) {
          v.volume = ${gain};
          v.muted = ${isMuted ? 'true' : 'false'};
          if (typeof v.setSinkId === 'function' && '${activeSink || 'default'}' !== 'default') {
            v.setSinkId('${activeSink}').catch(() => {});
          }
        }
        const p = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
        if (p && typeof p.setVolume === 'function') {
          p.setVolume(${ytVol});
          if (${isMuted}) p.mute?.(); else p.unMute?.();
        }
        if (p) {
          try {
            if (typeof p.setPlaybackQuality === 'function') p.setPlaybackQuality('tiny');
            if (typeof p.setPlaybackQualityRange === 'function') p.setPlaybackQualityRange('tiny', 'tiny');
          } catch (e) {}
        }
      } catch (e) {}

      // 4. Protected MediaSession bridge inside webview for Bluetooth headsets & Windows SMTC
      try {
        if ('mediaSession' in navigator && !window.__yt_mediasession_installed) {
          window.__yt_mediasession_installed = true;
          const ms = navigator.mediaSession;
          const notify = (action) => {
            console.log('__WEBVIEW_MEDIA_ACTION__:' + action);
          };

          const origSetAction = ms.setActionHandler.bind(ms);
          // Protect action handlers from being overwritten by YouTube's scripts
          ms.setActionHandler = (action, handler) => {
            if (['play', 'pause', 'nexttrack', 'previoustrack', 'stop'].includes(action)) {
              return;
            }
            return origSetAction(action, handler);
          };

          origSetAction('play', () => {
            notify('play');
            try {
              document.querySelector('video')?.play()?.catch(() => {});
              document.getElementById('movie_player')?.playVideo?.();
            } catch(e){}
          });
          origSetAction('pause', () => {
            notify('pause');
            try {
              document.querySelector('video')?.pause();
              document.getElementById('movie_player')?.pauseVideo?.();
            } catch(e){}
          });
          origSetAction('nexttrack', () => {
            notify('nextTrack');
          });
          origSetAction('previoustrack', () => {
            notify('prevTrack');
          });
          origSetAction('stop', () => {
            notify('pause');
          });
        }
      } catch(e) {}
    })();
  `;
}

class PlayerService {
  private webview: any = null;
  private webviewLoadListener: (() => void) | null = null;
  private webviewConsoleListener: ((e: any) => void) | null = null;
  private progressTimer: any = null;
  private listeners: Set<PlayerListener> = new Set();
  public onTrackEndedCallback: (() => void) | null = null;
  public onMediaAction: ((action: string) => void) | null = null;
  private isEndedHandled: boolean = false;
  private trackStartTime: number = 0;
  private userWantsPlaying: boolean = false;
  private isPlayerReady: boolean = false;
  private pendingTrack: TrackReference | null = null;
  private errorStreakCounter: number = 0;
  private retryTimer: any = null;
  private retryCount: number = 0;
  private snapTimers: any[] = [];
  private adStuckStreak: number = 0;
  private adLastTime: number = -1;
  private adStuckRetryCount: number = 0;
  private ytPlayerVolumeDebounceTimer: any = null;

  private status: PlayerStatus = {
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: (() => {
      try {
        const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('ytm_volume') : null;
        if (saved !== null && !isNaN(Number(saved))) {
          return Math.max(0, Math.min(100, Number(saved)));
        }
      } catch {}
      return 80;
    })(),
    isMuted: false,
    isBuffering: false,
    repeatMode: 'off',
    isShuffled: false,
    error: null,
  };

  public calculateGain(volumePercent: number): number {
    const clamped = Math.max(0, Math.min(100, volumePercent));
    if (clamped <= 0) return 0;
    if (clamped >= 100) return 1;
    // Audio taper (Square Law): converts linear slider percentage to natural human loudness curve.
    // In human perception, linear amplitude at 75% already delivers ~92% perceived loudness,
    // causing a perceived ceiling where moving 75% -> 100% does not noticeably increase sound.
    // Using (x / 100)^2 provides a smooth, balanced dynamic range across the full 0-100% scale,
    // ensuring volume continues to gain powerfully and audibly all the way from 75% to 100%.
    return Math.pow(clamped / 100, 2);
  }

  public initWebview(wv: any): void {
    if (!wv) return;
    if (this.webview === wv) return;

    if (this.webview) {
      if (this.webviewLoadListener) {
        try {
          this.webview.removeEventListener('dom-ready', this.webviewLoadListener);
          this.webview.removeEventListener('did-finish-load', this.webviewLoadListener);
        } catch {}
      }
      if (this.webviewConsoleListener) {
        try {
          this.webview.removeEventListener('console-message', this.webviewConsoleListener);
        } catch {}
      }
    }

    this.webview = wv;
    this.isPlayerReady = false;

    this.webviewLoadListener = () => {
      this.onWebviewLoaded();
    };

    this.webviewConsoleListener = (e: any) => {
      const msg = e.message;
      if (typeof msg === 'string' && msg.startsWith('__WEBVIEW_MEDIA_ACTION__:')) {
        const action = msg.substring('__WEBVIEW_MEDIA_ACTION__:'.length);
        this.handleMediaAction(action);
      }
    };

    try {
      this.webview.addEventListener('dom-ready', this.webviewLoadListener);
      this.webview.addEventListener('did-finish-load', this.webviewLoadListener);
      this.webview.addEventListener('console-message', this.webviewConsoleListener);
    } catch {}

    this.startPollingTimer();
  }

  public handleMediaAction(action: string): void {
    switch (action) {
      case 'play':
        this.play();
        break;
      case 'pause':
        this.pause();
        break;
      case 'togglePlayPause':
        this.togglePlayPause();
        break;
      case 'nextTrack':
      case 'prevTrack':
        this.onMediaAction?.(action);
        break;
      case 'volumeUp':
        this.setVolume(this.status.volume + 5);
        break;
      case 'volumeDown':
        this.setVolume(this.status.volume - 5);
        break;
      case 'toggleMute':
        this.toggleMute();
        break;
      default:
        break;
    }
  }

  public updateWebviewMetadata(track: TrackReference | null): void {
    if (!this.webview || !track) return;
    const title = (track.title || '').replace(/['\\]/g, '\\$&');
    const artist = (track.channelTitle || '').replace(/['\\]/g, '\\$&');
    const thumb = (track.thumbnailUrl || '').replace(/['\\]/g, '\\$&');
    this.webview
      .executeJavaScript(`
        (() => {
          try {
            if ('mediaSession' in navigator) {
              navigator.mediaSession.metadata = new MediaMetadata({
                title: '${title}',
                artist: '${artist}',
                artwork: [
                  { src: '${thumb}', sizes: '512x512', type: 'image/jpeg' }
                ]
              });
            }
          } catch(e){}
        })()
      `, true)
      .catch(() => {});
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
              // Maintain active audio track with inaudible volume to prevent background power-saving suspend
              v.muted = false;
              v.volume = 0.0001;
              v.playbackRate = 16;
              if (v.buffered && v.buffered.length > 0) {
                const bEnd = v.buffered.end(v.buffered.length - 1);
                if (bEnd > v.currentTime + 0.5) {
                  v.currentTime = bEnd - 0.1;
                }
              }
              const skipBtns = document.querySelectorAll(
                '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, button.ytp-ad-skip-button-text, .ytp-ad-overlay-close-button'
              );
              skipBtns.forEach(b => { try { b.click(); } catch(e) {} });
              if (p && typeof p.skipAd === 'function') {
                try { p.skipAd(); } catch(e) {}
              }
            } else if (v && !adActive) {
              if (v.playbackRate !== 1) v.playbackRate = 1;
              const curGain = typeof window.__currentGain === 'number' ? window.__currentGain : ${this.calculateGain(this.status.volume)};
              const curMuted = typeof window.__isCurrentMuted === 'boolean' ? window.__isCurrentMuted : ${this.status.isMuted ? 'true' : 'false'};
              if (v.muted !== curMuted) v.muted = curMuted;
              if (Math.abs(v.volume - curGain) > 0.08) {
                v.volume = curGain;
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
                      // Point C: Always force loadVideoById for cold start with tiny (144p) quality
                      // so background video streams minimal data for instantaneous music loading
                      p.loadVideoById('${target.videoId}', 0, 'tiny');
                      p.setPlaybackQuality?.('tiny');
                      p.setPlaybackQualityRange?.('tiny', 'tiny');
                      p.playVideo?.();
                      if (v) {
                        v.muted = ${this.status.isMuted ? 'true' : 'false'};
                        v.volume = ${this.calculateGain(this.status.volume)};
                        v.play().catch(e => console.log('play rejected:', e.name, e.message));
                      }
                      if (p && typeof p.setVolume === 'function') {
                        p.setVolume(${Math.round(this.calculateGain(this.status.volume) * 100)});
                      }
                    }
                  } catch(e) {}
                })()
              `;
              void this.webview.executeJavaScript(initPlayScript, true).catch(() => {});
              this.schedulePlaybackVerification(target.videoId);
              this.logPlaybackSnapshots();
            }
          }

          if (!this.status.currentTrack) return;

          // 2. Active ad segment handling (with Point D stuck ad recovery)
          if (data.adActive) {
            if (this.adLastTime === data.currentTime) {
              this.adStuckStreak++;
            } else {
              this.adStuckStreak = 0;
              this.adLastTime = data.currentTime;
            }

            // Fast recovery: If ad is active for ~1s (4 cycles of 250ms), force skipAd and reload cleanly
            if (this.adStuckStreak >= 4 && this.status.currentTrack) {
              this.adStuckStreak = 0;
              this.adStuckRetryCount++;
              const curTrackId = this.status.currentTrack.videoId;
              console.log(`[player] Ad stall detected, forcing fast skip/reload for track ${curTrackId}`);
              this.webview.executeJavaScript(`
                (() => {
                  try {
                    const p = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
                    if (p && typeof p.skipAd === 'function') {
                      p.skipAd();
                    }
                    if (p && typeof p.loadVideoById === 'function') {
                      p.loadVideoById('${curTrackId}', 0, 'tiny');
                      p.setPlaybackQuality?.('tiny');
                      p.setPlaybackQualityRange?.('tiny', 'tiny');
                      p.playVideo?.();
                    }
                    const v = document.querySelector('video');
                    if (v) {
                      v.muted = typeof window.__isCurrentMuted === 'boolean' ? window.__isCurrentMuted : ${this.status.isMuted ? 'true' : 'false'};
                      v.volume = typeof window.__currentGain === 'number' ? window.__currentGain : ${this.calculateGain(this.status.volume)};
                      v.play().catch(e => console.log('play rejected:', e.name, e.message));
                    }
                    if (p && typeof p.setVolume === 'function') {
                      p.setVolume(${Math.round(this.calculateGain(this.status.volume) * 100)});
                    }
                  } catch(e){}
                })()
              `, true).catch(() => {});
            }

            this.status = {
              ...this.status,
              isBuffering: true,
              error: null,
            };
            this.notify();
            return;
          } else {
            this.adStuckStreak = 0;
            this.adLastTime = -1;
            this.adStuckRetryCount = 0;
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
              `, true).catch(() => {});
            }
          } else if (this.userWantsPlaying && data.paused && !data.ended && data.isReady) {
            // User wants playing: resume if player is unstarted (-1) or paused (2) and not buffering (3)
            if (data.playerState === -1 || data.playerState === 2) {
              this.webview.executeJavaScript(`
                (() => {
                  try {
                    if (window.__userWantsPlaying) {
                      document.getElementById('movie_player')?.playVideo?.();
                      document.querySelector('video')?.play().catch(e => console.log('play rejected:', e.name, e.message));
                    }
                  } catch(e){}
                })()
              `, true).catch(() => {});
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

  private cancelPlaybackRetry(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.retryCount = 0;
  }

  private schedulePlaybackVerification(videoId: string): void {
    this.cancelPlaybackRetry();

    const check = () => {
      if (!this.userWantsPlaying || !this.webview) return;
      if (this.status.currentTrack?.videoId !== videoId) return;

      this.webview
        .executeJavaScript(
          `(() => {
            try {
              const p = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
              const v = document.querySelector('video');
              const state = p?.getPlayerState ? p.getPlayerState() : -1;
              const paused = v ? v.paused : true;
              return { state, paused };
            } catch(e) {
              return { state: -1, paused: true };
            }
          })()`,
          true
        )
        .then((res: { state: number; paused: boolean }) => {
          if (this.userWantsPlaying && res.state !== 1 && res.state !== 3 && this.retryCount < 3) {
            this.retryCount++;
            console.log(
              `[Playback Assurance] Retrying play for ${videoId} (attempt ${this.retryCount}/3, state=${res.state}, paused=${res.paused})`
            );
            this.webview
              .executeJavaScript(
                `(() => {
                  try {
                    if (window.__userWantsPlaying) {
                      const p = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
                      p?.playVideo?.();
                      const v = document.querySelector('video');
                      if (v && v.paused) {
                        v.play().catch(e => console.log('play rejected:', e.name, e.message));
                      }
                    }
                  } catch(e) {}
                })()`,
                true
              )
              .catch(() => {});

            if (this.retryCount < 3) {
              this.retryTimer = setTimeout(check, 1500);
            }
          }
        })
        .catch(() => {});
    };

    this.retryTimer = setTimeout(check, 1500);
  }

  private logPlaybackSnapshots(): void {
    this.snapTimers.forEach((t) => clearTimeout(t));
    this.snapTimers = [];

    const snap = () =>
      this.webview
        ?.executeJavaScript(
          `(() => {
            const p = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
            const v = document.querySelector('video');
            return JSON.stringify({
              href: location.href,
              hasPlayer: !!p,
              load: typeof p?.loadVideoById,
              state: p?.getPlayerState?.(),   // -1 unstarted, 1 playing, 2 paused, 3 buffering, 5 cued
              paused: v?.paused,
              ready: v?.readyState,
              t: v?.currentTime,
              err: v?.error?.code,
              ad: Boolean(
                p?.classList.contains('ad-showing') ||
                p?.classList.contains('ad-interrupting') ||
                (p && typeof p.getAdState === 'function' && p.getAdState() === 1)
              )
            });
          })()`,
          true
        )
        .then((s: string) => console.log('[snap]', s))
        .catch(() => {});

    this.snapTimers = [500, 1500, 3000, 5000].map((ms) => setTimeout(snap, ms));
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
    this.cancelPlaybackRetry();
    this.snapTimers.forEach((t) => clearTimeout(t));
    this.snapTimers = [];
    this.adStuckStreak = 0;
    this.adLastTime = -1;
    this.adStuckRetryCount = 0;
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
    this.updateWebviewMetadata(track);

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
                    p.loadVideoById('${track.videoId}', 0, 'tiny');
                    p.setPlaybackQuality?.('tiny');
                    p.setPlaybackQualityRange?.('tiny', 'tiny');
                    p.playVideo?.();
                  }
                  if (v) {
                    v.muted = ${this.status.isMuted ? 'true' : 'false'};
                    v.volume = ${this.calculateGain(this.status.volume)};
                    v.play().catch(e => console.log('play rejected:', e.name, e.message));
                  }
                  if (p && typeof p.setVolume === 'function') {
                    p.setVolume(${Math.round(this.calculateGain(this.status.volume) * 100)});
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
          const switched = await this.webview.executeJavaScript(switchScript, true);
          if (switched) {
            this.schedulePlaybackVerification(track.videoId);
            this.logPlaybackSnapshots();
            return;
          }
        } catch {}
      }

      // 2. Cold start or player engine not ready yet:
      this.pendingTrack = track;
      this.isPlayerReady = false;

      try {
        const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(track.videoId)}&autoplay=1&vq=tiny`;
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
        this.logPlaybackSnapshots();
      } catch (err) {
        console.error('Failed to load track in webview:', err);
      }
    }
  }

  public play(): void {
    this.userWantsPlaying = true;
    this.status.isPlaying = true;
    this.notify();

    if (this.status.currentTrack) {
      this.schedulePlaybackVerification(this.status.currentTrack.videoId);
    }

    if (this.webview) {
      this.webview
        .executeJavaScript(`
          (() => {
            try {
              window.__userWantsPlaying = true;
              const p = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
              p?.playVideo?.();
              const v = document.querySelector('video');
              if (v && v.paused) v.play().catch(e => console.log('play rejected:', e.name, e.message));
            } catch(e){}
          })()
        `, true)
        .catch(() => {});
    }
  }

  public pause(): void {
    this.cancelPlaybackRetry();
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
        `, true)
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
        `, true)
        .catch(() => {});
    }
  }

  private lastVolumeDispatchTime: number = 0;
  private pendingVolumeTimer: any = null;
  private pendingVolumeData: { gain: number; ytVolume: number; isNowMuted: boolean } | null = null;
  private wasPreviouslyMuted: boolean = false;

  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(100, volume));
    this.status.volume = clamped;
    const isNowMuted = clamped === 0;
    this.status.isMuted = isNowMuted;

    try {
      localStorage.setItem('ytm_volume', String(clamped));
    } catch {}
    this.notify();

    const gain = this.calculateGain(clamped);
    const ytVolume = Math.round(gain * 100);

    this.dispatchVolumeThrottled(gain, ytVolume, isNowMuted);
  }

  private dispatchVolumeThrottled(gain: number, ytVolume: number, isNowMuted: boolean): void {
    this.pendingVolumeData = { gain, ytVolume, isNowMuted };
    const now = Date.now();
    const timeSinceLast = now - this.lastVolumeDispatchTime;
    const THROTTLE_MS = 30;

    if (timeSinceLast >= THROTTLE_MS) {
      if (this.pendingVolumeTimer) {
        clearTimeout(this.pendingVolumeTimer);
        this.pendingVolumeTimer = null;
      }
      this.lastVolumeDispatchTime = now;
      this.sendVolumeToWebview(gain, ytVolume, isNowMuted);
    } else if (!this.pendingVolumeTimer) {
      this.pendingVolumeTimer = setTimeout(() => {
        this.pendingVolumeTimer = null;
        this.lastVolumeDispatchTime = Date.now();
        if (this.pendingVolumeData) {
          this.sendVolumeToWebview(
            this.pendingVolumeData.gain,
            this.pendingVolumeData.ytVolume,
            this.pendingVolumeData.isNowMuted
          );
        }
      }, THROTTLE_MS - timeSinceLast);
    }
  }

  private syncYtPlayerVolumeDebounced(ytVolume: number, isNowMuted: boolean, shouldUnmute: boolean): void {
    if (this.ytPlayerVolumeDebounceTimer) {
      clearTimeout(this.ytPlayerVolumeDebounceTimer);
    }
    this.ytPlayerVolumeDebounceTimer = setTimeout(() => {
      this.ytPlayerVolumeDebounceTimer = null;
      if (!this.webview) return;
      this.webview
        .executeJavaScript(`
          (() => {
            try {
              const p = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
              if (p && typeof p.setVolume === 'function') {
                p.setVolume(${ytVolume});
                if (${isNowMuted}) {
                  p.mute?.();
                } else if (${shouldUnmute}) {
                  p.unMute?.();
                }
              }
            } catch(e){}
          })()
        `, true)
        .catch(() => {});
    }, 200);
  }

  private sendVolumeToWebview(gain: number, ytVolume: number, isNowMuted: boolean): void {
    if (!this.webview) return;

    const shouldUnmute = this.wasPreviouslyMuted && !isNowMuted;
    this.wasPreviouslyMuted = isNowMuted;

    // Direct hardware-level audio gain on HTMLVideoElement: smooth, zero-latency, crackle-free
    this.webview
      .executeJavaScript(`
        (() => {
          try {
            window.__currentGain = ${gain};
            window.__isCurrentMuted = ${isNowMuted ? 'true' : 'false'};
            const v = document.querySelector('video');
            if (v) {
              v.volume = ${gain};
              v.muted = ${isNowMuted ? 'true' : 'false'};
            }
          } catch(e){}
        })()
      `, true)
      .catch(() => {});

    // Sync YouTube internal player API debounced to prevent audio buffer resets and stutter while dragging
    this.syncYtPlayerVolumeDebounced(ytVolume, isNowMuted, shouldUnmute);
  }

  public toggleMute(): void {
    const nextMuted = !this.status.isMuted;
    if (!nextMuted && this.status.volume === 0) {
      this.status.volume = 50;
      try {
        localStorage.setItem('ytm_volume', '50');
      } catch {}
    }
    this.status.isMuted = nextMuted;
    this.notify();

    const gain = nextMuted ? 0 : this.calculateGain(this.status.volume);
    const ytVolume = nextMuted ? 0 : Math.round(gain * 100);

    if (this.webview) {
      this.webview
        .executeJavaScript(`
          (() => {
            try {
              window.__currentGain = ${gain};
              window.__isCurrentMuted = ${nextMuted ? 'true' : 'false'};
              const v = document.querySelector('video');
              if (v) {
                v.muted = ${nextMuted};
                v.volume = ${gain};
              }
              const p = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
              if (p) {
                if (${nextMuted}) p.mute?.(); else {
                  p.unMute?.();
                  p.setVolume?.(${ytVolume});
                }
              }
            } catch(e){}
          })()
        `, true)
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
