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

  test('Shuffle Mode: Next selects unplayed tracks and Back navigates accurately through history', () => {
    const queue = [
      { videoId: 't0', title: 'Track 0', channelTitle: 'Artist A' },
      { videoId: 't1', title: 'Track 1', channelTitle: 'Artist B' },
      { videoId: 't2', title: 'Track 2', channelTitle: 'Artist C' },
      { videoId: 't3', title: 'Track 3', channelTitle: 'Artist D' },
    ];
    let currentIndex = 0;
    const shuffleHistory = [];
    const playedShuffleIndices = new Set([0]);

    const playIndex = (idx, options = {}) => {
      currentIndex = idx;
      playedShuffleIndices.add(idx);
    };

    const playNext = () => {
      if (currentIndex >= 0) {
        shuffleHistory.push(currentIndex);
        playedShuffleIndices.add(currentIndex);
      }
      const unplayed = queue
        .map((_, i) => i)
        .filter((i) => i !== currentIndex && !playedShuffleIndices.has(i));

      assert.ok(unplayed.length > 0, 'Should find unplayed tracks');
      const nextIdx = unplayed[0];
      playIndex(nextIdx, { isShuffleNext: true });
    };

    const playPrevious = () => {
      if (shuffleHistory.length > 0) {
        const prevIdx = shuffleHistory.pop();
        if (prevIdx !== undefined && prevIdx >= 0) {
          playIndex(prevIdx, { isHistoryNavigation: true });
        }
      }
    };

    // 1. First Next: jumps to t1, history has [0]
    playNext();
    assert.equal(currentIndex, 1);
    assert.deepEqual(shuffleHistory, [0]);

    // 2. Second Next: jumps to t2, history has [0, 1]
    playNext();
    assert.equal(currentIndex, 2);
    assert.deepEqual(shuffleHistory, [0, 1]);

    // 3. User clicks Back: must return to t1!
    playPrevious();
    assert.equal(currentIndex, 1);
    assert.deepEqual(shuffleHistory, [0]);

    // 4. User clicks Back again: must return to t0!
    playPrevious();
    assert.equal(currentIndex, 0);
    assert.deepEqual(shuffleHistory, []);
  });

  test('Shuffle Mode: Prioritizes manually enqueued tracks over random candidates', () => {
    const queue = [
      { videoId: 't0', title: 'Current Song' },
      { videoId: 't1', title: 'Random Song 1' },
      { videoId: 't2', title: 'User Queued Song', isManual: true },
      { videoId: 't3', title: 'Random Song 2' },
    ];
    let currentIndex = 0;
    const played = new Set([0]);

    const unplayed = queue
      .map((_, i) => i)
      .filter((i) => i !== currentIndex && !played.has(i));

    const manualIdx = unplayed.find((i) => Boolean(queue[i]?.isManual));
    assert.equal(manualIdx, 2, 'Should pick the manually queued track at index 2');
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

