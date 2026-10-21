import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Audio Output Routing & Device Selection Tests', () => {
  test('Filters audiooutput devices correctly from media devices list', () => {
    const rawDevices = [
      { deviceId: 'mic1', kind: 'audioinput', label: 'Microphone (Realtek)' },
      { deviceId: 'cam1', kind: 'videoinput', label: 'HD Webcam' },
      { deviceId: 'default', kind: 'audiooutput', label: 'Speakers (Realtek Audio)' },
      { deviceId: 'headphone_bt', kind: 'audiooutput', label: 'Sony WH-1000XM4 (Bluetooth)' },
    ];

    const outputs = rawDevices.filter(d => d.kind === 'audiooutput');
    assert.equal(outputs.length, 2);
    assert.equal(outputs[0].deviceId, 'default');
    assert.equal(outputs[1].deviceId, 'headphone_bt');
  });

  test('Shortens and cleans up device labels for compact Studio Dock', () => {
    function cleanDeviceLabel(label) {
      return label
        .replace(/\s*\(Default\)/gi, '')
        .replace(/Audio Device/gi, '')
        .trim()
        .slice(0, 18)
        .trim();
    }

    assert.equal(cleanDeviceLabel('Speakers (Realtek Audio) (Default)'), 'Speakers (Realtek');
    assert.equal(cleanDeviceLabel('Sony WH-1000XM4'), 'Sony WH-1000XM4');
    assert.equal(cleanDeviceLabel('Headphones (High Definition Audio Device)'), 'Headphones (High D');
  });

  test('Detects headphone vs speaker category by keywords', () => {
    function isHeadphones(label) {
      const lower = label.toLowerCase();
      return lower.includes('headphone') || lower.includes('tai nghe') || lower.includes('airpods') || lower.includes('buds');
    }

    assert.equal(isHeadphones('Sony WH-1000XM4 Headphones'), true);
    assert.equal(isHeadphones('Apple AirPods Pro'), true);
    assert.equal(isHeadphones('Galaxy Buds2'), true);
    assert.equal(isHeadphones('Tai nghe Bluetooth'), true);
    assert.equal(isHeadphones('Realtek(R) Audio Speakers'), false);
    assert.equal(isHeadphones('LG UltraFine Display Audio'), false);
  });
});

describe('YouTube Error 150/101 Bypass Header Logic Tests', () => {
  test('Intercepts and rewrites headers for YouTube requests', () => {
    function processRequestHeaders(url, existingHeaders) {
      const headers = { ...existingHeaders };
      if (url.includes('youtube.com') || url.includes('googlevideo.com') || url.includes('ytimg.com')) {
        headers['Referer'] = 'https://www.youtube.com/';
        headers['Origin'] = 'https://www.youtube.com';
        headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/133.0.0.0 Safari/537.36';
      }
      return headers;
    }

    const initial = { 'Referer': 'http://localhost:5173/' };
    const modified = processRequestHeaders('https://www.youtube.com/embed/jfKfPfyJRdk', initial);

    assert.equal(modified['Referer'], 'https://www.youtube.com/');
    assert.equal(modified['Origin'], 'https://www.youtube.com');
    assert.match(modified['User-Agent'], /Chrome/);
  });

  test('Strips X-Frame-Options from YouTube responses', () => {
    function cleanResponseHeaders(headers) {
      const clean = { ...headers };
      delete clean['x-frame-options'];
      delete clean['X-Frame-Options'];
      return clean;
    }

    const raw = {
      'content-type': 'text/html',
      'x-frame-options': 'SAMEORIGIN',
      'X-Frame-Options': 'DENY'
    };

    const result = cleanResponseHeaders(raw);
    assert.equal(result['x-frame-options'], undefined);
    assert.equal(result['X-Frame-Options'], undefined);
    assert.equal(result['content-type'], 'text/html');
  });

  test('Parses raw YouTube search initial data HTML without API key', () => {
    function parseResults(html) {
      const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
      if (!match) return [];
      const data = JSON.parse(match[1]);
      const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
      const results = [];
      for (const section of contents) {
        const items = section?.itemSectionRenderer?.contents || [];
        for (const item of items) {
          if (item.videoRenderer) {
            results.push({
              videoId: item.videoRenderer.videoId,
              title: item.videoRenderer.title?.runs?.[0]?.text,
              channelTitle: item.videoRenderer.ownerText?.runs?.[0]?.text
            });
          }
        }
      }
      return results;
    }

    const mockHtml = `
      <script>var ytInitialData = {"contents":{"twoColumnSearchResultsRenderer":{"primaryContents":{"sectionListRenderer":{"contents":[{"itemSectionRenderer":{"contents":[{"videoRenderer":{"videoId":"mock1234567","title":{"runs":[{"text":"Mock Song"}]},"ownerText":{"runs":[{"text":"Mock Artist"}]}}}]}}]}}}}};</script>
    `;

    const results = parseResults(mockHtml);
    assert.equal(results.length, 1);
    assert.equal(results[0].videoId, 'mock1234567');
    assert.equal(results[0].title, 'Mock Song');
    assert.equal(results[0].channelTitle, 'Mock Artist');
  });
});
