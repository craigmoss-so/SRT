const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Sender methods
  startSender: (config) => ipcRenderer.invoke('start-sender', config),

  // Receiver methods (legacy single stream)
  startReceiver: (config) => ipcRenderer.invoke('start-receiver', config),
  stopStream: () => ipcRenderer.invoke('stop-stream'),

  // Multi-source methods
  startSourceStream: (sourceId, config) => ipcRenderer.invoke('start-source-stream', sourceId, config),
  stopSourceStream: (sourceId) => ipcRenderer.invoke('stop-source-stream', sourceId),
  stopAllStreams: () => ipcRenderer.invoke('stop-all-streams'),

  // Source management
  loadSources: () => ipcRenderer.invoke('load-sources'),
  saveSources: (sources) => ipcRenderer.invoke('save-sources', sources),

  // System
  checkFFmpeg: () => ipcRenderer.invoke('check-ffmpeg'),

  // Event listeners
  onStreamStatus: (callback) => ipcRenderer.on('stream-status', callback),
  onFFmpegLog: (callback) => ipcRenderer.on('ffmpeg-log', callback),
  onSourceStreamStatus: (callback) => ipcRenderer.on('source-stream-status', callback),
  onSourceStreamLog: (callback) => ipcRenderer.on('source-stream-log', callback),
  onSourceStreamStats: (callback) => ipcRenderer.on('source-stream-stats', callback),

  // Remove listeners
  removeStreamStatusListener: (callback) => ipcRenderer.removeListener('stream-status', callback),
  removeFFmpegLogListener: (callback) => ipcRenderer.removeListener('ffmpeg-log', callback),
  removeSourceStreamStatusListener: (callback) => ipcRenderer.removeListener('source-stream-status', callback),
  removeSourceStreamLogListener: (callback) => ipcRenderer.removeListener('source-stream-log', callback),
  removeSourceStreamStatsListener: (callback) => ipcRenderer.removeListener('source-stream-stats', callback)
});
