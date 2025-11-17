const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  startSender: (config) => ipcRenderer.invoke('start-sender', config),
  startReceiver: (config) => ipcRenderer.invoke('start-receiver', config),
  stopStream: () => ipcRenderer.invoke('stop-stream'),
  checkFFmpeg: () => ipcRenderer.invoke('check-ffmpeg'),
  onStreamStatus: (callback) => ipcRenderer.on('stream-status', callback),
  onFFmpegLog: (callback) => ipcRenderer.on('ffmpeg-log', callback),
  removeStreamStatusListener: (callback) => ipcRenderer.removeListener('stream-status', callback),
  removeFFmpegLogListener: (callback) => ipcRenderer.removeListener('ffmpeg-log', callback)
});
