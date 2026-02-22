const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let ffmpegProcess = null; // For sender mode
let streamProcesses = new Map(); // For receiver mode - multiple streams

// Store for sources configuration
const configPath = path.join(app.getPath('userData'), 'sources-config.json');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#2a2a2a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'icon.png')
  });

  mainWindow.loadFile('index.html');

  // Open DevTools in development
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    // Clean up all processes
    if (ffmpegProcess) {
      ffmpegProcess.kill();
    }
    streamProcesses.forEach(process => {
      if (process) process.kill();
    });
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle SRT sender (single stream)
ipcMain.handle('start-sender', async (event, config) => {
  try {
    if (ffmpegProcess) {
      ffmpegProcess.kill();
    }

    const { mode, address, port, latency, input } = config;
    let srtUrl;

    // Build SRT URL based on mode
    switch (mode) {
      case 'caller':
        srtUrl = `srt://${address}:${port}?mode=caller&latency=${latency}`;
        break;
      case 'listener':
        srtUrl = `srt://:${port}?mode=listener&latency=${latency}`;
        break;
      case 'rendezvous':
        srtUrl = `srt://${address}:${port}?mode=rendezvous&latency=${latency}`;
        break;
      default:
        throw new Error('Invalid SRT mode');
    }

    // FFmpeg command to send stream
    const ffmpegArgs = [
      '-re',
      '-f', 'lavfi',
      '-i', input || 'testsrc=size=1280x720:rate=30',
      '-f', 'lavfi',
      '-i', 'sine=frequency=1000:sample_rate=48000',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-f', 'mpegts',
      srtUrl
    ];

    ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

    ffmpegProcess.stderr.on('data', (data) => {
      const message = data.toString();
      console.log('FFmpeg:', message);
      mainWindow.webContents.send('ffmpeg-log', message);

      // Check for connection success
      if (message.includes('Opening') || message.includes('Opened')) {
        mainWindow.webContents.send('stream-status', { status: 'connected', message: 'Stream started successfully' });
      }
    });

    ffmpegProcess.on('error', (error) => {
      console.error('FFmpeg error:', error);
      mainWindow.webContents.send('stream-status', { status: 'error', message: error.message });
    });

    ffmpegProcess.on('close', (code) => {
      console.log('FFmpeg process closed with code:', code);
      mainWindow.webContents.send('stream-status', { status: 'stopped', message: 'Stream stopped' });
      ffmpegProcess = null;
    });

    return { success: true, message: 'Sender started' };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Handle starting a receiver stream (one of potentially many)
ipcMain.handle('start-source-stream', async (event, sourceId, config) => {
  try {
    // Stop existing stream for this source if any
    if (streamProcesses.has(sourceId)) {
      const existingProcess = streamProcesses.get(sourceId);
      existingProcess.kill();
      streamProcesses.delete(sourceId);
    }

    const { mode, address, port, latency, passphrase } = config;
    let srtUrl;

    // Build SRT URL based on mode
    switch (mode) {
      case 'caller':
        srtUrl = `srt://${address}:${port}?mode=caller&latency=${latency}`;
        break;
      case 'listener':
        srtUrl = `srt://:${port}?mode=listener&latency=${latency}`;
        break;
      case 'rendezvous':
        srtUrl = `srt://${address}:${port}?mode=rendezvous&latency=${latency}`;
        break;
      default:
        throw new Error('Invalid SRT mode');
    }

    // Add passphrase if provided
    if (passphrase && passphrase.trim()) {
      srtUrl += `&passphrase=${encodeURIComponent(passphrase)}`;
    }

    // FFmpeg command to receive stream and output stats
    // For actual video playback, you'd need to set up a media server
    // This implementation focuses on receiving and monitoring the stream
    const ffmpegArgs = [
      '-i', srtUrl,
      '-c', 'copy',
      '-f', 'null',
      '-'
    ];

    const process = spawn('ffmpeg', ffmpegArgs);
    streamProcesses.set(sourceId, process);

    process.stderr.on('data', (data) => {
      const message = data.toString();
      console.log(`FFmpeg [${sourceId}]:`, message);

      // Send logs specific to this source
      mainWindow.webContents.send('source-stream-log', { sourceId, message });

      // Check for connection success
      if (message.includes('Opening') || message.includes('Opened')) {
        mainWindow.webContents.send('source-stream-status', {
          sourceId,
          status: 'connected',
          message: 'Stream connected'
        });
      }

      // Parse bitrate and other stats
      if (message.includes('bitrate=')) {
        const bitrateMatch = message.match(/bitrate=\s*(\S+)/);
        const fpsMatch = message.match(/fps=\s*(\S+)/);
        if (bitrateMatch || fpsMatch) {
          mainWindow.webContents.send('source-stream-stats', {
            sourceId,
            bitrate: bitrateMatch ? bitrateMatch[1] : null,
            fps: fpsMatch ? fpsMatch[1] : null
          });
        }
      }
    });

    process.on('error', (error) => {
      console.error(`FFmpeg error [${sourceId}]:`, error);
      mainWindow.webContents.send('source-stream-status', {
        sourceId,
        status: 'error',
        message: error.message
      });
      streamProcesses.delete(sourceId);
    });

    process.on('close', (code) => {
      console.log(`FFmpeg process closed [${sourceId}] with code:`, code);
      mainWindow.webContents.send('source-stream-status', {
        sourceId,
        status: 'stopped',
        message: 'Stream stopped'
      });
      streamProcesses.delete(sourceId);
    });

    return { success: true, message: 'Stream started' };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Handle stopping a specific source stream
ipcMain.handle('stop-source-stream', async (event, sourceId) => {
  if (streamProcesses.has(sourceId)) {
    const process = streamProcesses.get(sourceId);
    process.kill();
    streamProcesses.delete(sourceId);
    return { success: true, message: 'Stream stopped' };
  }
  return { success: false, message: 'No active stream for this source' };
});

// Handle SRT receiver (legacy - single stream)
ipcMain.handle('start-receiver', async (event, config) => {
  try {
    if (ffmpegProcess) {
      ffmpegProcess.kill();
    }

    const { mode, address, port, latency } = config;
    let srtUrl;

    // Build SRT URL based on mode
    switch (mode) {
      case 'caller':
        srtUrl = `srt://${address}:${port}?mode=caller&latency=${latency}`;
        break;
      case 'listener':
        srtUrl = `srt://:${port}?mode=listener&latency=${latency}`;
        break;
      case 'rendezvous':
        srtUrl = `srt://${address}:${port}?mode=rendezvous&latency=${latency}`;
        break;
      default:
        throw new Error('Invalid SRT mode');
    }

    // Create HTTP server URL for the video element
    const httpPort = 8080;

    // FFmpeg command to receive stream and output to HTTP
    const ffmpegArgs = [
      '-i', srtUrl,
      '-c:v', 'copy',
      '-c:a', 'copy',
      '-f', 'mpegts',
      `http://127.0.0.1:${httpPort}/stream`
    ];

    ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

    ffmpegProcess.stderr.on('data', (data) => {
      const message = data.toString();
      console.log('FFmpeg:', message);
      mainWindow.webContents.send('ffmpeg-log', message);

      // Check for connection success
      if (message.includes('Opening') || message.includes('Opened')) {
        mainWindow.webContents.send('stream-status', {
          status: 'receiving',
          message: 'Receiving stream',
          streamUrl: `http://127.0.0.1:${httpPort}/stream`
        });
      }
    });

    ffmpegProcess.on('error', (error) => {
      console.error('FFmpeg error:', error);
      mainWindow.webContents.send('stream-status', { status: 'error', message: error.message });
    });

    ffmpegProcess.on('close', (code) => {
      console.log('FFmpeg process closed with code:', code);
      mainWindow.webContents.send('stream-status', { status: 'stopped', message: 'Stream stopped' });
      ffmpegProcess = null;
    });

    return { success: true, message: 'Receiver started' };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Handle stop stream (sender or legacy receiver)
ipcMain.handle('stop-stream', async () => {
  if (ffmpegProcess) {
    ffmpegProcess.kill();
    ffmpegProcess = null;
    return { success: true, message: 'Stream stopped' };
  }
  return { success: false, message: 'No active stream' };
});

// Handle stopping all streams
ipcMain.handle('stop-all-streams', async () => {
  let count = 0;
  streamProcesses.forEach((process, sourceId) => {
    process.kill();
    count++;
  });
  streamProcesses.clear();
  return { success: true, message: `Stopped ${count} stream(s)` };
});

// Check if FFmpeg is available
ipcMain.handle('check-ffmpeg', async () => {
  return new Promise((resolve) => {
    const test = spawn('ffmpeg', ['-version']);
    test.on('error', () => {
      resolve({ available: false, message: 'FFmpeg not found. Please install FFmpeg with SRT support.' });
    });
    test.on('close', (code) => {
      if (code === 0) {
        resolve({ available: true, message: 'FFmpeg is available' });
      } else {
        resolve({ available: false, message: 'FFmpeg found but may not be working correctly' });
      }
    });
  });
});

// Load saved sources configuration
ipcMain.handle('load-sources', async () => {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      return { success: true, sources: JSON.parse(data) };
    }
    return { success: true, sources: [] };
  } catch (error) {
    console.error('Error loading sources:', error);
    return { success: false, message: error.message, sources: [] };
  }
});

// Save sources configuration
ipcMain.handle('save-sources', async (event, sources) => {
  try {
    fs.writeFileSync(configPath, JSON.stringify(sources, null, 2), 'utf8');
    return { success: true, message: 'Sources saved' };
  } catch (error) {
    console.error('Error saving sources:', error);
    return { success: false, message: error.message };
  }
});
