import { app, BrowserWindow, ipcMain, Menu, Tray, globalShortcut, shell, nativeImage, session, net } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged;

// Allow media autoplay without requiring manual click inside the iframe
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-background-timer-throttling');

function setupNetworkInterceptors() {
  const filter = {
    urls: [
      '*://*.youtube.com/*',
      '*://*.googlevideo.com/*',
      '*://*.ytimg.com/*',
      '*://*.google.com/*',
      '*://*.googleapis.com/*',
    ],
  };

  // Rewrite headers so YouTube player does not reject requests with Error 150/101
  session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    const headers = { ...details.requestHeaders };
    headers['Referer'] = 'https://www.youtube.com/';
    // Only modify Origin if already present (e.g. CORS/POST) to avoid 400 Bad Request on iframe navigation
    if (headers['Origin'] || details.method === 'POST') {
      headers['Origin'] = 'https://www.youtube.com';
    }
    headers['User-Agent'] =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';
    callback({ cancel: false, requestHeaders: headers });
  });

  // Strip restrictive framing headers and allow CORS from YouTube / Google APIs
  session.defaultSession.webRequest.onHeadersReceived(filter, (details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['X-Frame-Options'];
    responseHeaders['access-control-allow-origin'] = ['*'];
    responseHeaders['access-control-allow-methods'] = ['GET, POST, OPTIONS, HEAD'];
    responseHeaders['access-control-allow-headers'] = ['*'];

    // Remove or soften frame-ancestors in Content-Security-Policy
    if (responseHeaders['content-security-policy']) {
      responseHeaders['content-security-policy'] = responseHeaders['content-security-policy'].map(csp =>
        csp.replace(/frame-ancestors[^;]+;?/gi, '')
      );
    }
    callback({ cancel: false, responseHeaders });
  });

  // Automatically approve speaker selection and media permissions
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    if (permission === 'speaker-selection' || permission === 'media') {
      return true;
    }
    return false;
  });

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'speaker-selection' || permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 840,
    minHeight: 540,
    frame: false, // Custom frameless title bar
    backgroundColor: '#09090b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow smooth streaming and direct requests without CORS blocks
    },
    icon: path.join(__dirname, '../public/icon.png'),
    show: false,
  });

  if (isDev && process.env['VITE_DEV_SERVER_URL']) {
    mainWindow.loadURL(process.env['VITE_DEV_SERVER_URL']);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Forward renderer console logs to main process stdout
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[Renderer L${level}] ${message} (${sourceId}:${line})`);
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
}

function createTray() {
  const iconPath = path.join(__dirname, '../public/icon.png');
  let icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    icon = nativeImage.createEmpty();
  } else {
    icon = icon.resize({ width: 16, height: 16 });
  }

  tray = new Tray(icon);
  tray.setToolTip('YouTube Music Desktop');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mở ứng dụng',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Phát / Tạm dừng',
      click: () => {
        mainWindow?.webContents.send('media-control', 'togglePlayPause');
      },
    },
    {
      label: 'Bài tiếp theo',
      click: () => {
        mainWindow?.webContents.send('media-control', 'nextTrack');
      },
    },
    {
      label: 'Bài trước đó',
      click: () => {
        mainWindow?.webContents.send('media-control', 'prevTrack');
      },
    },
    { type: 'separator' },
    {
      label: 'Thoát hoàn toàn',
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

  app.whenReady().then(() => {
    setupNetworkInterceptors();
    createWindow();
    createTray();
    registerMediaShortcuts();

    // IPC window control listeners
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

    // Native fetch IPC handler (completely bypasses web-level CORS and CSP)
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

    // IPC audio output device routing across all frames & elements
    ipcMain.handle('set-audio-output-device', async (_event, deviceId: string) => {
      if (!mainWindow) return false;
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
        await mainWindow.webContents.executeJavaScript(script, true);
        for (const frame of mainWindow.webContents.mainFrame.frames) {
          try {
            await frame.executeJavaScript(script, true);
          } catch {
            // cross-origin frame or unloading
          }
        }
        return true;
      } catch (err) {
        console.warn('Error routing audio output device via IPC:', err);
        return false;
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('before-quit', () => {
    isQuitting = true;
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    tray?.destroy();
  });
}
