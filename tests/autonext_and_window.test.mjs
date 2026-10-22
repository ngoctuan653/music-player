import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Auto-Play Next & Queue Progression Logic', () => {
  test('Advances to next track when track finishes', () => {
    const queue = [
      { videoId: 'track1', title: 'Song 1' },
      { videoId: 'track2', title: 'Song 2' },
      { videoId: 'track3', title: 'Song 3' },
    ];
    let currentIndex = 0;

    const playNext = () => {
      if (currentIndex + 1 < queue.length) {
        currentIndex++;
      }
    };

    playNext();
    assert.equal(currentIndex, 1);
    assert.equal(queue[currentIndex].videoId, 'track2');

    playNext();
    assert.equal(currentIndex, 2);
    assert.equal(queue[currentIndex].videoId, 'track3');
  });

  test('Loops back to start when queue finishes if autoPlayNext is enabled', () => {
    const queue = [
      { videoId: 'track1', title: 'Song 1' },
      { videoId: 'track2', title: 'Song 2' },
    ];
    let currentIndex = 1;
    const settings = { autoPlayNext: true };
    const repeatMode = 'off';

    const playNext = () => {
      if (currentIndex + 1 < queue.length) {
        currentIndex++;
      } else if (repeatMode === 'all') {
        currentIndex = 0;
      } else if (settings.autoPlayNext && queue.length > 0) {
        currentIndex = 0;
      }
    };

    playNext();
    assert.equal(currentIndex, 0);
    assert.equal(queue[currentIndex].videoId, 'track1');
  });

  test('Near-end detection with latch flag fires exactly once', () => {
    let isEndedHandled = false;
    let trackEndedFiredCount = 0;

    const checkTrackNearEnd = (currentTime, duration, ended) => {
      const isNearEnd = ended || (duration > 5 && currentTime >= duration - 0.6);
      if (isNearEnd && !isEndedHandled) {
        isEndedHandled = true;
        trackEndedFiredCount++;
      }
    };

    // Polling sample 1: playing at 195s / 200s
    checkTrackNearEnd(195, 200, false);
    assert.equal(trackEndedFiredCount, 0);

    // Polling sample 2: near end at 199.5s / 200s
    checkTrackNearEnd(199.5, 200, false);
    assert.equal(trackEndedFiredCount, 1);

    // Polling sample 3: next tick, video.ended is true
    checkTrackNearEnd(200, 200, true);
    assert.equal(trackEndedFiredCount, 1, 'Should not fire a second time due to latch');

    // On new track load: latch resets
    isEndedHandled = false;
    checkTrackNearEnd(0, 180, false);
    assert.equal(trackEndedFiredCount, 1);
  });

  test('Guards against rapid premature skip during initial track buffer time', () => {
    let trackStartTime = Date.now();
    let isEndedHandled = false;
    let trackEndedFired = false;

    const checkTrackNearEnd = (currentTime, duration, ended) => {
      const timeSinceStart = Date.now() - trackStartTime;
      if (timeSinceStart > 3500) {
        const isNearEnd = (ended && currentTime > 3) || (duration > 10 && currentTime >= duration - 0.6);
        if (isNearEnd && !isEndedHandled) {
          isEndedHandled = true;
          trackEndedFired = true;
        }
      }
    };

    // Stale video.ended from previous track arriving at 100ms
    checkTrackNearEnd(200, 200, true);
    assert.equal(trackEndedFired, false, 'Should be blocked by 3.5s guard');

    // After 3.6s, with valid play state:
    trackStartTime = Date.now() - 4000;
    checkTrackNearEnd(199.5, 200, false);
    assert.equal(trackEndedFired, true, 'Should trigger once song naturally nears end');
  });
});

describe('Window Maximize Toggle Logic', () => {
  test('Toggles maximize and restore down state', () => {
    let isMaximized = false;
    const toggleMaximize = () => {
      isMaximized = !isMaximized;
      return isMaximized;
    };

    assert.equal(toggleMaximize(), true);
    assert.equal(toggleMaximize(), false);
  });
});

