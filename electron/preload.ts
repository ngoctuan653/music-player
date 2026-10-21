import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  setAudioOutputDevice: (deviceId: string) => ipcRenderer.invoke('set-audio-output-device', deviceId),
  fetchNet: (url: string) => ipcRenderer.invoke('net-fetch', url),
  onMediaControl: (callback: (action: string) => void) => {
    const handler = (_event: any, action: string) => callback(action);
    ipcRenderer.on('media-control', handler);
    return () => {
      ipcRenderer.removeListener('media-control', handler);
    };
  },
});
