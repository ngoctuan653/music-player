import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('On-Device Personalization & Taste Profile Engine', () => {
  test('Identifies top artist from listening history', () => {
    const history = [
      { videoId: '1', title: 'Song A', channelTitle: 'Artist One' },
      { videoId: '2', title: 'Song B', channelTitle: 'Artist Two' },
      { videoId: '3', title: 'Song C', channelTitle: 'Artist One' },
      { videoId: '4', title: 'Song D', channelTitle: 'Artist One' },
      { videoId: '5', title: 'Song E', channelTitle: 'Artist Two' },
    ];

    const artistCounts = {};
    for (const track of history) {
      artistCounts[track.channelTitle] = (artistCounts[track.channelTitle] || 0) + 1;
    }

    const topArtists = Object.entries(artistCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    assert.equal(topArtists[0].name, 'Artist One');
    assert.equal(topArtists[0].count, 3);
    assert.equal(topArtists[1].name, 'Artist Two');
    assert.equal(topArtists[1].count, 2);
  });

  test('Identifies favorite genres from track titles', () => {
    const history = [
      { videoId: '1', title: 'Chill Lofi Beats for Study', channelTitle: 'Channel 1' },
      { videoId: '2', title: 'Night Lofi Hip Hop Relax', channelTitle: 'Channel 2' },
      { videoId: '3', title: 'Acoustic Pop Chill Vibes', channelTitle: 'Channel 3' },
    ];

    const keywords = ['lofi', 'chill', 'acoustic', 'pop', 'edm'];
    const counts = {};

    for (const track of history) {
      const lower = track.title.toLowerCase();
      for (const kw of keywords) {
        if (lower.includes(kw)) {
          counts[kw] = (counts[kw] || 0) + 1;
        }
      }
    }

    assert.equal(counts['lofi'], 2);
    assert.equal(counts['chill'], 2);
    assert.equal(counts['acoustic'], 1);
  });

  test('Filters out already-listened songs so recommendations stay fresh', () => {
    const history = [
      { videoId: 'played1', title: 'Already Played Song 1' },
      { videoId: 'played2', title: 'Already Played Song 2' },
    ];

    const candidateRecommendations = [
      { videoId: 'played1', title: 'Already Played Song 1' },
      { videoId: 'fresh1', title: 'Brand New Recommended Track 1' },
      { videoId: 'fresh2', title: 'Brand New Recommended Track 2' },
    ];

    const playedSet = new Set(history.map(t => t.videoId));
    const fresh = candidateRecommendations.filter(t => !playedSet.has(t.videoId));

    assert.equal(fresh.length, 2);
    assert.equal(fresh[0].videoId, 'fresh1');
    assert.equal(fresh[1].videoId, 'fresh2');
  });

  test('Notifies reactive history subscribers on track addition', () => {
    const listeners = new Set();
    let currentHistory = [];

    const subscribeHistory = (fn) => {
      listeners.add(fn);
      fn(currentHistory);
      return () => listeners.delete(fn);
    };

    const addTrack = (track) => {
      currentHistory = [track, ...currentHistory];
      listeners.forEach(fn => fn(currentHistory));
    };

    let receivedHistory = [];
    const unsub = subscribeHistory((h) => {
      receivedHistory = h;
    });

    assert.equal(receivedHistory.length, 0);

    addTrack({ videoId: 'song1', title: 'Song 1' });
    assert.equal(receivedHistory.length, 1);
    assert.equal(receivedHistory[0].videoId, 'song1');

    unsub();
  });
});
