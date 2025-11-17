const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let ffmpegProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
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
    if (ffmpegProcess) {
      ffmpegProcess.kill();
    }
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

// Handle SRT sender
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

// Handle SRT receiver
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

// Handle stop stream
ipcMain.handle('stop-stream', async () => {
  if (ffmpegProcess) {
    ffmpegProcess.kill();
    ffmpegProcess = null;
    return { success: true, message: 'Stream stopped' };
  }
  return { success: false, message: 'No active stream' };
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
