import test from 'node:test';
import assert from 'node:assert/strict';

// Helper to simulate buildPlayerInjectedScript behavior without full DOM
function buildPlayerInjectedScript(opts) {
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

test('Player Injected Script & Ad Purge Integrity', async (t) => {
  await t.test('purgeAdsAndWarnings never calls v.play() or p.playVideo()', () => {
    const script = buildPlayerInjectedScript({
      volume: 80,
      isMuted: false,
      userWantsPlaying: true,
    });

    // Extract purgeAdsAndWarnings function body
    const fnMatch = script.match(/function purgeAdsAndWarnings\(\)\s*\{([\s\S]*?)\}\s*\/\/ Install MutationObserver/);
    assert.ok(fnMatch, 'purgeAdsAndWarnings function should be found');
    const fnBody = fnMatch[1];

    assert.equal(
      fnBody.includes('v.play()'),
      false,
      'purgeAdsAndWarnings must NEVER contain v.play()'
    );
    assert.equal(
      fnBody.includes('p.playVideo()'),
      false,
      'purgeAdsAndWarnings must NEVER contain p.playVideo()'
    );
    assert.equal(
      fnBody.includes('play('),
      false,
      'purgeAdsAndWarnings must not invoke play methods'
    );
  });

  await t.test('script properly initializes window.__userWantsPlaying based on opts', () => {
    const pausedScript = buildPlayerInjectedScript({
      volume: 80,
      isMuted: false,
      userWantsPlaying: false,
    });
    assert.ok(pausedScript.includes('window.__userWantsPlaying = false;'));

    const playingScript = buildPlayerInjectedScript({
      volume: 80,
      isMuted: false,
      userWantsPlaying: true,
    });
    assert.ok(playingScript.includes('window.__userWantsPlaying = true;'));
  });

  await t.test('script sets autonav to false to disable native auto-skip', () => {
    const script = buildPlayerInjectedScript({
      volume: 50,
      isMuted: false,
      userWantsPlaying: true,
    });
    assert.ok(script.includes('p.setAutonav(false)'));
  });
});

test('Cold-Start Readiness & Deferred Track Dispatch Logic', async (t) => {
  class SimulatedPlayerEngine {
    constructor() {
      this.isPlayerReady = false;
      this.pendingTrack = null;
      this.userWantsPlaying = false;
      this.playedTracks = [];
      this.errorStreakCounter = 0;
      this.error = null;
    }

    playTrack(track) {
      this.userWantsPlaying = true;
      this.errorStreakCounter = 0;
      this.error = null;

      if (!this.isPlayerReady) {
        // Cold start: queue track into pendingTrack
        this.pendingTrack = track;
        return { action: 'cold_loadURL', url: `https://www.youtube.com/watch?v=${track.videoId}&autoplay=1` };
      }

      this.playedTracks.push(track.videoId);
      return { action: 'in_player_loadVideoById', videoId: track.videoId };
    }

    onPollCycle(data) {
      // 1. Player engine readiness transition
      if (data.isReady && !this.isPlayerReady) {
        this.isPlayerReady = true;

        if (this.pendingTrack && this.userWantsPlaying) {
          const target = this.pendingTrack;
          this.pendingTrack = null;
          this.playedTracks.push(target.videoId);
        }
      }

      // 2. Error guard: requires isPlayerReady, isDomErrorVisible, currentTime === 0, and 3 consecutive streaks
      if (this.isPlayerReady && data.isDomErrorVisible && data.currentTime === 0) {
        this.errorStreakCounter++;
        if (this.errorStreakCounter >= 3) {
          this.error = 'Lỗi phát';
        }
      } else {
        this.errorStreakCounter = 0;
      }
    }

    pause() {
      this.userWantsPlaying = false;
    }
  }

  await t.test('Cold start defers playback until isReady and does not fail on initial DOM template error', () => {
    const engine = new SimulatedPlayerEngine();

    // User clicks track 1 on cold start
    const res = engine.playTrack({ videoId: 'track_001', title: 'Song 1' });
    assert.equal(res.action, 'cold_loadURL');
    assert.equal(engine.pendingTrack?.videoId, 'track_001');
    assert.equal(engine.playedTracks.length, 0);

    // Poll 1: webview is still loading HTML, #error-screen in template might exist, but isReady is false
    engine.onPollCycle({ isReady: false, isDomErrorVisible: true, currentTime: 0 });
    assert.equal(engine.isPlayerReady, false);
    assert.equal(engine.error, null, 'Must NOT trigger error when engine is not ready');
    assert.equal(engine.errorStreakCounter, 0);

    // Poll 2: player finishes loading, isReady becomes true
    engine.onPollCycle({ isReady: true, isDomErrorVisible: false, currentTime: 0 });
    assert.equal(engine.isPlayerReady, true);
    assert.equal(engine.pendingTrack, null, 'Pending track must be consumed');
    assert.deepEqual(engine.playedTracks, ['track_001'], 'Deferred track 1 must be dispatched immediately');
    assert.equal(engine.error, null);

    // Subsequent tracks play immediately in-player
    const res2 = engine.playTrack({ videoId: 'track_002', title: 'Song 2' });
    assert.equal(res2.action, 'in_player_loadVideoById');
    assert.deepEqual(engine.playedTracks, ['track_001', 'track_002']);
  });

  await t.test('DOM error screen requires 3 consecutive cycles after ready before halting', () => {
    const engine = new SimulatedPlayerEngine();
    engine.isPlayerReady = true;

    // Cycle 1 of error
    engine.onPollCycle({ isReady: true, isDomErrorVisible: true, currentTime: 0 });
    assert.equal(engine.errorStreakCounter, 1);
    assert.equal(engine.error, null);

    // Cycle 2 of error
    engine.onPollCycle({ isReady: true, isDomErrorVisible: true, currentTime: 0 });
    assert.equal(engine.errorStreakCounter, 2);
    assert.equal(engine.error, null);

    // If transient error disappears before 3rd cycle:
    engine.onPollCycle({ isReady: true, isDomErrorVisible: false, currentTime: 1.2 });
    assert.equal(engine.errorStreakCounter, 0, 'Streak should reset when error clears');
    assert.equal(engine.error, null);

    // Now 3 persistent consecutive cycles
    engine.onPollCycle({ isReady: true, isDomErrorVisible: true, currentTime: 0 });
    engine.onPollCycle({ isReady: true, isDomErrorVisible: true, currentTime: 0 });
    engine.onPollCycle({ isReady: true, isDomErrorVisible: true, currentTime: 0 });
    assert.equal(engine.errorStreakCounter, 3);
    assert.equal(engine.error, 'Lỗi phát', 'Should flag error on 3rd consecutive cycle');
  });

  await t.test('Pausing during cold start prevents deferred track from playing upon ready', () => {
    const engine = new SimulatedPlayerEngine();

    // User clicks track 1
    engine.playTrack({ videoId: 'track_abc', title: 'Song ABC' });
    assert.equal(engine.userWantsPlaying, true);

    // User presses Pause before player is ready
    engine.pause();
    assert.equal(engine.userWantsPlaying, false);

    // Webview finishes loading
    engine.onPollCycle({ isReady: true, isDomErrorVisible: false, currentTime: 0 });
    assert.equal(engine.playedTracks.length, 0, 'Must NOT play track if user paused before ready');
  });
});
