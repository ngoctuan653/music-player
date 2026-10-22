import { app, BrowserWindow, ipcMain, Menu, Tray, globalShortcut, shell, nativeImage, session, net, webContents, powerMonitor } from 'electron';
import path from 'path';
import http from 'http';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let staticServer: http.Server | null = null;

const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged;

// Allow media autoplay without requiring manual click inside the iframe
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

// --- High-Performance DoH (DNS-over-HTTPS) & Ad-Shield Setup ---
export interface DnsConfig {
  mode: 'ublock' | 'controld' | 'hagezi' | 'nextdns' | 'adguard' | 'family' | 'cloudflare' | 'custom' | 'off';
  url?: string;
  accountKey?: string;
}

// Default to 'ublock' or 'off'
let activeDnsConfig: DnsConfig = {
  mode: 'ublock',
  url: 'https://my.ublockdns.com/na56bjem',
  accountKey: 'valid glass gravity pipe',
};

try {
  const dnsConfigPath = path.join(app.getPath('userData'), 'dns-config.json');
  if (fs.existsSync(dnsConfigPath)) {
    const raw = fs.readFileSync(dnsConfigPath, 'utf8');
    const parsed = JSON.parse(raw);
    activeDnsConfig = { ...activeDnsConfig, ...parsed };
  }
} catch {
  // Use default DNS
}

// Compute DoH template URL
let dohTemplate = '';
if (activeDnsConfig.mode === 'ublock') {
  dohTemplate = activeDnsConfig.url?.trim() || 'https://my.ublockdns.com/na56bjem';
} else if (activeDnsConfig.mode === 'controld') {
  dohTemplate = 'https://freedns.controld.com/p1';
} else if (activeDnsConfig.mode === 'hagezi') {
  // Official HaGeZi Multi PRO DoH resolver (clean ad/tracking blocklist)
  dohTemplate = 'https://root.hagezi.org/dns-query';
} else if (activeDnsConfig.mode === 'nextdns') {
  dohTemplate = 'https://dns.nextdns.io/dns-query';
} else if (activeDnsConfig.mode === 'adguard') {
  dohTemplate = 'https://dns.adguard-dns.com/dns-query';
} else if (activeDnsConfig.mode === 'family') {
  dohTemplate = 'https://family.adguard-dns.com/dns-query';
} else if (activeDnsConfig.mode === 'cloudflare') {
  dohTemplate = 'https://security.cloudflare-dns.com/dns-query';
} else if (activeDnsConfig.mode === 'custom' && activeDnsConfig.url?.trim()) {
  dohTemplate = activeDnsConfig.url.trim();
}

// Only activate DoH command line switches if user has explicitly turned it on
if (dohTemplate && activeDnsConfig.mode !== 'off') {
  app.commandLine.appendSwitch('enable-features', 'DnsOverHttps');
  app.commandLine.appendSwitch('dns-over-https-templates', dohTemplate);
  app.commandLine.appendSwitch('dns-over-https-mode', 'automatic');
}

function createStaticServer(): Promise<string> {
  return new Promise((resolve, reject) => {
    const distPath = path.join(__dirname, '../dist');
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.json': 'application/json',
      '.woff2': 'font/woff2',
    };

    staticServer = http.createServer((req, res) => {
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');

      let cleanUrl = (req.url || '/').split('?')[0];
      if (cleanUrl === '/') cleanUrl = '/index.html';
      const filePath = path.join(distPath, cleanUrl);

      fs.readFile(filePath, (err, data) => {
        if (err) {
          // Fallback to index.html for SPA routing
          fs.readFile(path.join(distPath, 'index.html'), (e2, indexData) => {
            if (e2) {
              res.writeHead(404);
              res.end('Not Found');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(indexData);
            }
          });
          return;
        }

        const ext = path.extname(filePath);
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });

    const FIXED_PORT = 39281;
    staticServer.listen(FIXED_PORT, '127.0.0.1', () => {
      resolve(`http://127.0.0.1:${FIXED_PORT}`);
    });

    staticServer.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        // Fallback to dynamic port if 39281 is occupied, but prefer 39281
        const fallbackServer = http.createServer(staticServer!.listeners('request')[0] as any);
        fallbackServer.listen(0, '127.0.0.1', () => {
          const port = (fallbackServer.address() as any)?.port;
          resolve(`http://127.0.0.1:${port}`);
        });
      } else {
        reject(err);
      }
    });
  });
}

// Comprehensive advertising, telemetry and tracking patterns (HaGeZi-aligned)
// Cancelling these at onBeforeRequest stops the request BEFORE DNS resolution,
// Comprehensive advertising, telemetry and tracking patterns (HaGeZi-aligned)
// Cancelling these at onBeforeRequest stops the request BEFORE DNS resolution,
// preventing TCP connections and eliminating SSL handshake errors (-101) completely.
// NOTE: We do NOT block *.youtube.com endpoints here because doing so breaks YouTube's integrity/DRM checks!
const adBlockPatterns = [
  // Google / DoubleClick advertising networks (external)
  '*://*.doubleclick.net/*',
  '*://*.googlesyndication.com/*',
  '*://*.googleadservices.com/*',
  '*://static.doubleclick.net/*',
  '*://pagead2.googlesyndication.com/*',
  '*://pagead2.googleadservices.com/*',
  '*://ad.doubleclick.net/*',
  '*://adservice.google.com/*',
  '*://googleads.g.doubleclick.net/*',
  '*://securepubads.g.doubleclick.net/*',
  '*://pubads.g.doubleclick.net/*',
  '*://tpc.googlesyndication.com/*',
  // Third-party Video Ad Servers & Telemetry (HaGeZi Multi PRO streaming list)
  '*://*.innovid.com/*',
  '*://*.flashtalking.com/*',
  '*://*.serving-sys.com/*',
  '*://*.scorecardresearch.com/*',
  '*://*.moatads.com/*',
  '*://*.doubleverify.com/*',
  '*://*.adroll.com/*',
  '*://*.criteo.com/*',
  '*://*.rubiconproject.com/*',
  '*://*.openx.net/*',
  '*://*.pubmatic.com/*',
  '*://*.taboola.com/*',
  '*://*.outbrain.com/*',
  // YouTube in-stream ad manifests, tracking and midroll signals
  '*://*.youtube.com/api/stats/ads*',
  '*://*.youtube.com/pagead/*',
  '*://*.youtube.com/ptracking*',
  '*://*.youtube.com/get_midroll_info*',
];

const attachedSessions = new WeakSet<session.Session>();

function attachAdBlocker(sess: session.Session) {
  if (attachedSessions.has(sess)) return;
  attachedSessions.add(sess);

  try {
    sess.webRequest.onBeforeRequest({ urls: adBlockPatterns }, (_details, callback) => {
      // Cancel before request leaves the browser: 0 latency, 0 SSL sockets opened
      callback({ cancel: true });
    });
  } catch (err) {
    console.warn('Could not register ad-block filter on session:', err);
  }

  // Ensure YouTube player requests have standard desktop User-Agent and Referer headers
  const ytFilter = {
    urls: [
      '*://www.youtube.com/*',
      '*://www.youtube-nocookie.com/*',
      '*://music.youtube.com/*',
    ],
  };

  try {
    sess.webRequest.onBeforeSendHeaders(ytFilter, (details, callback) => {
      const headers = { ...details.requestHeaders };
      headers['Referer'] = 'https://www.youtube.com/';
      headers['User-Agent'] =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';
      callback({ cancel: false, requestHeaders: headers });
    });

    sess.webRequest.onHeadersReceived(ytFilter, (details, callback) => {
      const responseHeaders = { ...details.responseHeaders };
      delete responseHeaders['x-frame-options'];
      delete responseHeaders['X-Frame-Options'];
      if (responseHeaders['content-security-policy']) {
        responseHeaders['content-security-policy'] = responseHeaders['content-security-policy'].map((csp: string) =>
          csp.replace(/frame-ancestors[^;]+;?/gi, '')
        );
      }
      callback({ cancel: false, responseHeaders });
    });
  } catch (err) {
    console.warn('Could not register YouTube header filter on session:', err);
  }

  sess.setPermissionCheckHandler((_webContents, permission) => {
    if (permission === 'speaker-selection' || permission === 'media') {
      return true;
    }
    return false;
  });

  sess.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'speaker-selection' || permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });
}

function setupNetworkInterceptors() {
  attachAdBlocker(session.defaultSession);

  // Also attach to all guest sessions created for <webview> tags and log console messages
  app.on('web-contents-created', (_event, contents) => {
    contents.setMaxListeners(100);
    attachAdBlocker(contents.session);
    try {
      contents.setBackgroundThrottling(false);
    } catch {}

    // Explicitly guarantee no user gesture requirement and disable throttling for <webview> tags
    contents.on('will-attach-webview' as any, (_waEvent: any, webPreferences: any) => {
      webPreferences.autoplayPolicy = 'no-user-gesture-required';
      webPreferences.backgroundThrottling = false;
    });

    if (contents.getType() === 'webview') {
      try {
        contents.setBackgroundThrottling(false);
      } catch {}

      contents.on('console-message', (_e, level, msg) => {
        if (msg.includes('Insecure Content-Security-Policy') || msg.includes('powerPreference')) return;
        console.log(`[Webview L${level}] ${msg}`);
      });
    }
  });
}

function getAppIconPath(): string {
  const candidates = [
    path.join(__dirname, '../build/icon.ico'),
    path.join(__dirname, '../public/icon.ico'),
    path.join(__dirname, '../dist/icon.png'),
    path.join(__dirname, '../public/icon.png'),
    path.join(process.resourcesPath || '', 'build/icon.ico'),
    path.join(process.resourcesPath || '', 'public/icon.ico'),
    path.join(process.resourcesPath || '', 'dist/icon.png'),
    path.join(process.resourcesPath || '', 'public/icon.png'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return path.join(__dirname, '../public/icon.png');
}

function getAppPngIconPath(): string {
  const candidates = [
    path.join(__dirname, '../dist/icon.png'),
    path.join(__dirname, '../public/icon.png'),
    path.join(process.resourcesPath || '', 'dist/icon.png'),
    path.join(process.resourcesPath || '', 'public/icon.png'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return path.join(__dirname, '../public/icon.png');
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 420,
    minHeight: 560,
    frame: false,
    backgroundColor: '#09090b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true, // Clean secure standard
      webviewTag: true,  // Enables native YouTube Webview streaming engine
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
    icon: getAppIconPath(),
    show: false,
  });

  // Handle multimedia & Bluetooth headset commands via Windows WM_APPCOMMAND
  mainWindow.on('app-command', (_event, cmd) => {
    switch (cmd) {
      case 'media-play-pause':
        mainWindow?.webContents.send('media-control', 'togglePlayPause');
        break;
      case 'media-play':
        mainWindow?.webContents.send('media-control', 'play');
        break;
      case 'media-pause':
      case 'media-stop':
        mainWindow?.webContents.send('media-control', 'pause');
        break;
      case 'media-next-track':
        mainWindow?.webContents.send('media-control', 'nextTrack');
        break;
      case 'media-previous-track':
        mainWindow?.webContents.send('media-control', 'prevTrack');
        break;
      case 'volume-up':
        mainWindow?.webContents.send('media-control', 'volumeUp');
        break;
      case 'volume-down':
        mainWindow?.webContents.send('media-control', 'volumeDown');
        break;
      case 'volume-mute':
        mainWindow?.webContents.send('media-control', 'toggleMute');
        break;
    }
  });

  const handleMediaInput = (event: any, input: any) => {
    if (input.type !== 'keyDown') return;
    const key = input.key;
    if (key === 'MediaPlayPause') {
      mainWindow?.webContents.send('media-control', 'togglePlayPause');
      event.preventDefault();
    } else if (key === 'MediaTrackNext') {
      mainWindow?.webContents.send('media-control', 'nextTrack');
      event.preventDefault();
    } else if (key === 'MediaTrackPrevious') {
      mainWindow?.webContents.send('media-control', 'prevTrack');
      event.preventDefault();
    } else if (key === 'MediaStop') {
      mainWindow?.webContents.send('media-control', 'pause');
      event.preventDefault();
    } else if (key === 'AudioVolumeUp') {
      mainWindow?.webContents.send('media-control', 'volumeUp');
    } else if (key === 'AudioVolumeDown') {
      mainWindow?.webContents.send('media-control', 'volumeDown');
    } else if (key === 'AudioVolumeMute') {
      mainWindow?.webContents.send('media-control', 'toggleMute');
    }
  };

  mainWindow.webContents.on('before-input-event', handleMediaInput);

  mainWindow.webContents.on('did-attach-webview' as any, (_e: any, guestContents: any) => {
    try {
      guestContents.setBackgroundThrottling(false);
      guestContents.on('before-input-event', handleMediaInput);
    } catch {}
  });

  if (isDev && process.env['VITE_DEV_SERVER_URL']) {
    await mainWindow.loadURL(process.env['VITE_DEV_SERVER_URL']);
  } else {
    try {
      const serverUrl = await createStaticServer();
      await mainWindow.loadURL(serverUrl);
    } catch {
      await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  }

  // Do not leave the app invisible if ready-to-show is delayed by Chromium.
  mainWindow.show();
  mainWindow.focus();

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`Renderer failed to load (${errorCode}): ${errorDescription} - ${validatedURL}`);
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error(`Renderer process exited: ${details.reason} (${details.exitCode})`);
  });

  // Forward renderer console logs to main process stdout
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[Renderer L${level}] ${message} (${sourceId}:${line})`);
  });

  // Track maximize / restore states
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized-change', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximized-change', false);
  });

  // Handle external links safely in default system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Close to tray behavior
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('show', () => {
    mainWindow?.webContents.send('glass-window-visibility', true);
  });
  mainWindow.on('hide', () => {
    mainWindow?.webContents.send('glass-window-visibility', false);
  });
}

function createTray() {
  const iconPath = getAppIconPath();
  let icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    icon = nativeImage.createFromPath(getAppPngIconPath());
  }
  if (icon.isEmpty()) {
    icon = nativeImage.createEmpty();
  } else {
    icon = icon.resize({ width: 16, height: 16 });
  }

  tray = new Tray(icon);
  tray.setToolTip('Music Player');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Music Player',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Play / Pause',
      click: () => {
        mainWindow?.webContents.send('media-control', 'togglePlayPause');
      },
    },
    {
      label: 'Next Track',
      click: () => {
        mainWindow?.webContents.send('media-control', 'nextTrack');
      },
    },
    {
      label: 'Previous Track',
      click: () => {
        mainWindow?.webContents.send('media-control', 'prevTrack');
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

function registerMediaShortcuts() {
  try {
    globalShortcut.register('MediaPlayPause', () => {
      mainWindow?.webContents.send('media-control', 'togglePlayPause');
    });
    globalShortcut.register('MediaNextTrack', () => {
      mainWindow?.webContents.send('media-control', 'nextTrack');
    });
    globalShortcut.register('MediaPreviousTrack', () => {
      mainWindow?.webContents.send('media-control', 'prevTrack');
    });
    globalShortcut.register('MediaStop', () => {
      mainWindow?.webContents.send('media-control', 'pause');
    });
  } catch (err) {
    console.warn('Could not register media shortcuts:', err);
  }
}

// Ensure single app instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    setupNetworkInterceptors();

    const notifyGlassEnvironment = () => {
      mainWindow?.webContents.send('glass-environment', {
        onBattery: powerMonitor.isOnBatteryPower(),
        gpuHealthy: true,
      });
    };
    powerMonitor.on('on-ac', notifyGlassEnvironment);
    powerMonitor.on('on-battery', notifyGlassEnvironment);
    app.on('child-process-gone', (_event, details) => {
      if (details.type === 'GPU') {
        mainWindow?.webContents.send('glass-environment', {
          onBattery: powerMonitor.isOnBatteryPower(),
          gpuHealthy: false,
        });
      }
    });

    // Register IPC listeners BEFORE window creation so initial renderer calls succeed
    ipcMain.on('window-minimize', () => {
      mainWindow?.minimize();
    });

    ipcMain.on('window-maximize', () => {
      if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow?.maximize();
      }
    });

    ipcMain.on('window-close', () => {
      mainWindow?.close();
    });

    ipcMain.handle('get-glass-environment', () => ({
      onBattery: powerMonitor.isOnBatteryPower(),
      gpuHealthy: true,
    }));

    ipcMain.handle('is-window-maximized', () => {
      return mainWindow?.isMaximized() ?? false;
    });

    ipcMain.handle('get-dns-config', () => {
      return activeDnsConfig;
    });

    ipcMain.handle('set-dns-config', async (_event, config: DnsConfig) => {
      try {
        activeDnsConfig = config;
        const dnsConfigPath = path.join(app.getPath('userData'), 'dns-config.json');
        fs.writeFileSync(dnsConfigPath, JSON.stringify(config, null, 2), 'utf8');
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    });

    const userStorageFilePath = path.join(app.getPath('userData'), 'user-storage.json');

    ipcMain.handle('get-disk-storage', async () => {
      try {
        if (fs.existsSync(userStorageFilePath)) {
          const raw = fs.readFileSync(userStorageFilePath, 'utf8');
          return JSON.parse(raw);
        }
      } catch (e) {
        console.warn('Failed to read user-storage.json:', e);
      }
      return null;
    });

    ipcMain.handle('save-disk-storage', async (_event, data: any) => {
      try {
        const jsonStr = JSON.stringify(data);
        // Strict safety guard: ensure storage file never exceeds 128KB to protect disk
        if (jsonStr.length > 128 * 1024) {
          console.warn('Storage payload unusually large, skipping oversize write');
          return false;
        }
        fs.writeFileSync(userStorageFilePath, jsonStr, 'utf8');
        return true;
      } catch (e) {
        console.warn('Failed to write user-storage.json:', e);
        return false;
      }
    });

    // Clean app relaunch handler
    ipcMain.on('app-restart', () => {
      app.relaunch();
      app.exit(0);
    });

    // Native fetch IPC handler (bypasses CORS/CSP safely from node main process)
    ipcMain.handle('net-fetch', async (_event, url: string) => {
      try {
        const res = await net.fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
            'Referer': 'https://www.youtube.com/',
          },
        });
        const text = await res.text();
        return { ok: res.ok, status: res.status, data: text };
      } catch (err: any) {
        return { ok: false, status: 500, error: err.message };
      }
    });

    // 2-hour TTL cache for YouTube Radio Mixes
    interface CachedRadio {
      timestamp: number;
      tracks: Array<{
        videoId: string;
        title: string;
        channelTitle: string;
        duration?: string;
        thumbnailUrl: string;
      }>;
      source: 'web_remix' | 'web' | 'secondary' | 'empty';
    }
    const radioCache = new Map<string, CachedRadio>();
    const RADIO_CACHE_TTL_MS = 2 * 60 * 60 * 1000;

    ipcMain.handle('fetch-youtube-radio', async (_event, params: { videoId: string; reqId: number }) => {
      const { videoId, reqId } = params;
      if (!videoId) {
        return { reqId, videoId, tracks: [], source: 'empty' };
      }

      const cached = radioCache.get(videoId);
      if (cached && Date.now() - cached.timestamp < RADIO_CACHE_TTL_MS) {
        return { reqId, videoId, tracks: cached.tracks, source: cached.source };
      }

      // Step 1: Query YouTube Music (client WEB_REMIX, RDAMVM)
      try {
        const musicPost = JSON.stringify({
          context: {
            client: {
              clientName: 'WEB_REMIX',
              clientVersion: '1.20240101.01.00',
              hl: 'vi',
              gl: 'VN',
            },
          },
          playlistId: 'RDAMVM' + videoId,
          videoId,
        });

        const musicRes = await net.fetch('https://music.youtube.com/youtubei/v1/next?prettyPrint=false', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
            'Origin': 'https://music.youtube.com',
            'Referer': 'https://music.youtube.com/',
          },
          body: musicPost,
        });

        if (musicRes.ok) {
          const json: any = await musicRes.json();
          const rawContents =
            json?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]
              ?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer?.contents || [];

          const tracks: any[] = [];
          for (const item of rawContents) {
            const pvr = item.playlistPanelVideoRenderer;
            if (pvr && pvr.videoId && pvr.videoId.length === 11) {
              const title =
                pvr.title?.runs?.map((r: any) => r.text).join('') || pvr.title?.simpleText || '';
              const channel =
                pvr.longBylineText?.runs?.map((r: any) => r.text).join('') ||
                pvr.shortBylineText?.runs?.map((r: any) => r.text).join('') ||
                'YouTube Music';
              const duration = pvr.lengthText?.runs?.[0]?.text || pvr.lengthText?.simpleText || undefined;
              const thumbs = pvr.thumbnail?.thumbnails || [];
              const thumbUrl = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${pvr.videoId}/hqdefault.jpg`;
              tracks.push({
                videoId: pvr.videoId,
                title,
                channelTitle: channel,
                duration,
                thumbnailUrl: thumbUrl.startsWith('//') ? 'https:' + thumbUrl : thumbUrl,
              });
            }
          }

          if (tracks.length >= 8) {
            radioCache.set(videoId, { timestamp: Date.now(), tracks, source: 'web_remix' });
            return { reqId, videoId, tracks, source: 'web_remix' };
          }
        }
      } catch (err) {
        console.warn('YouTube Music radio fetch failed, trying YouTube Web fallback:', err);
      }

      // Step 2: Fallback to YouTube Web (client WEB, RD)
      try {
        const webPost = JSON.stringify({
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20240101.00.00',
              hl: 'vi',
              gl: 'VN',
            },
          },
          playlistId: 'RD' + videoId,
          videoId,
        });

        const webRes = await net.fetch('https://www.youtube.com/youtubei/v1/next?prettyPrint=false', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
          },
          body: webPost,
        });

        if (webRes.ok) {
          const json: any = await webRes.json();
          const rawContents = json?.contents?.twoColumnWatchNextResults?.playlist?.playlist?.contents || [];
          const tracks: any[] = [];

          for (const item of rawContents) {
            const pvr = item.playlistPanelVideoRenderer;
            if (pvr && pvr.videoId && pvr.videoId.length === 11) {
              const title =
                pvr.title?.runs?.map((r: any) => r.text).join('') || pvr.title?.simpleText || '';
              const channel =
                pvr.shortBylineText?.runs?.map((r: any) => r.text).join('') ||
                pvr.shortBylineText?.simpleText ||
                'YouTube';
              const duration = pvr.lengthText?.simpleText || undefined;
              const thumbs = pvr.thumbnail?.thumbnails || [];
              const thumbUrl = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${pvr.videoId}/hqdefault.jpg`;
              tracks.push({
                videoId: pvr.videoId,
                title,
                channelTitle: channel,
                duration,
                thumbnailUrl: thumbUrl.startsWith('//') ? 'https:' + thumbUrl : thumbUrl,
              });
            }
          }

          if (tracks.length >= 5) {
            radioCache.set(videoId, { timestamp: Date.now(), tracks, source: 'web' });
            return { reqId, videoId, tracks, source: 'web' };
          }

          // Step 3: Secondary results (watch next lockupViewModel)
          const secondary =
            json?.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results || [];
          for (const item of secondary) {
            const lvm = item.lockupViewModel;
            if (lvm && lvm.contentId && lvm.contentId.length === 11) {
              const meta = lvm.metadata?.lockupMetadataViewModel;
              const title = meta?.title?.content || '';
              const channel =
                meta?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content ||
                'YouTube';
              const duration =
                lvm.contentImage?.thumbnailViewModel?.overlays?.[0]?.thumbnailOverlayTimeStatusViewModel?.text || undefined;
              const thumb =
                lvm.contentImage?.thumbnailViewModel?.image?.sources?.[0]?.url ||
                `https://i.ytimg.com/vi/${lvm.contentId}/hqdefault.jpg`;
              tracks.push({
                videoId: lvm.contentId,
                title,
                channelTitle: channel,
                duration,
                thumbnailUrl: thumb.startsWith('//') ? 'https:' + thumb : thumb,
              });
            }
          }

          if (tracks.length > 0) {
            radioCache.set(videoId, { timestamp: Date.now(), tracks, source: 'secondary' });
            return { reqId, videoId, tracks, source: 'secondary' };
          }
        }
      } catch (err) {
        console.warn('YouTube Web radio fallback failed:', err);
      }

      return { reqId, videoId, tracks: [], source: 'empty' };
    });

    ipcMain.handle('set-audio-output-device', async (_event, deviceId: string) => {
      const script = `
        (async () => {
          try {
            const els = Array.from(document.querySelectorAll('audio, video'));
            for (const el of els) {
              if (typeof el.setSinkId === 'function') {
                await el.setSinkId('${deviceId}');
              }
            }
          } catch (e) {
            console.warn('setSinkId error in document:', e);
          }
        })();
      `;
      try {
        const allWc = webContents.getAllWebContents();
        for (const wc of allWc) {
          try {
            await wc.executeJavaScript(script, true);
          } catch {
            // Unresponsive or destroying frame
          }
        }
        return true;
      } catch (err) {
        console.warn('Error routing audio output device via IPC:', err);
        return false;
      }
    });

    await createWindow();
    createTray();
    registerMediaShortcuts();
    notifyGlassEnvironment();

    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await createWindow();
      }
    });
  });

  app.on('before-quit', () => {
    isQuitting = true;
    if (staticServer) {
      staticServer.close();
    }
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    tray?.destroy();
  });
}
