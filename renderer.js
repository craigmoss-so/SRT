// DOM Elements
const modeButtons = document.querySelectorAll('.mode-btn');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const logContent = document.getElementById('log-content');
const ffmpegStatus = document.getElementById('ffmpeg-status');
const videoPlayer = document.getElementById('video-player');
const videoSection = document.querySelector('.video-section');

// Configuration Elements
const srtModeSelect = document.getElementById('srt-mode');
const addressInput = document.getElementById('address');
const portInput = document.getElementById('port');
const latencyInput = document.getElementById('latency');
const inputSourceSelect = document.getElementById('input-source');

// State
let currentMode = 'sender';
let isStreaming = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkFFmpegAvailability();
  setupEventListeners();
  updateUIForMode();
});

// Check FFmpeg Availability
async function checkFFmpegAvailability() {
  try {
    const result = await window.electronAPI.checkFFmpeg();
    if (result.available) {
      ffmpegStatus.textContent = '✓ FFmpeg is available';
      ffmpegStatus.style.color = '#ffffff';
    } else {
      ffmpegStatus.textContent = '✗ ' + result.message;
      ffmpegStatus.style.color = '#888888';
      addLogEntry(result.message, 'error');
    }
  } catch (error) {
    ffmpegStatus.textContent = '✗ Error checking FFmpeg';
    ffmpegStatus.style.color = '#888888';
    addLogEntry('Error checking FFmpeg: ' + error.message, 'error');
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Mode switching
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!isStreaming) {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        updateUIForMode();
        addLogEntry(`Switched to ${currentMode.toUpperCase()} mode`);
      }
    });
  });

  // Start button
  startBtn.addEventListener('click', handleStart);

  // Stop button
  stopBtn.addEventListener('click', handleStop);

  // SRT mode change
  srtModeSelect.addEventListener('change', () => {
    updateAddressField();
  });

  // Stream status listener
  window.electronAPI.onStreamStatus((event, data) => {
    handleStreamStatus(data);
  });

  // FFmpeg log listener
  window.electronAPI.onFFmpegLog((event, data) => {
    // Filter out verbose logs, only show important ones
    if (data.includes('error') || data.includes('Error') ||
        data.includes('Opening') || data.includes('Opened') ||
        data.includes('Connection') || data.includes('Stream')) {
      addLogEntry(data.trim());
    }
  });

  // Update address field based on SRT mode
  updateAddressField();
}

// Update UI based on mode
function updateUIForMode() {
  document.body.className = currentMode === 'receiver' ? 'receiver-mode' : 'sender-mode';

  if (currentMode === 'receiver') {
    videoSection.style.display = 'block';
  } else {
    videoSection.style.display = 'none';
  }
}

// Update address field based on SRT mode
function updateAddressField() {
  const srtMode = srtModeSelect.value;
  if (srtMode === 'listener') {
    addressInput.disabled = true;
    addressInput.value = '0.0.0.0';
  } else {
    addressInput.disabled = false;
    if (addressInput.value === '0.0.0.0') {
      addressInput.value = '127.0.0.1';
    }
  }
}

// Handle Start
async function handleStart() {
  if (isStreaming) return;

  const config = {
    mode: srtModeSelect.value,
    address: addressInput.value,
    port: parseInt(portInput.value),
    latency: parseInt(latencyInput.value),
    input: inputSourceSelect.value
  };

  // Validate configuration
  if (!config.port || config.port < 1 || config.port > 65535) {
    addLogEntry('Invalid port number. Please enter a value between 1 and 65535.', 'error');
    return;
  }

  if (!config.latency || config.latency < 20) {
    addLogEntry('Latency must be at least 20ms.', 'error');
    return;
  }

  if (config.mode !== 'listener' && !config.address) {
    addLogEntry('Address is required for caller and rendezvous modes.', 'error');
    return;
  }

  setStatus('connecting', 'Starting stream...');
  addLogEntry(`Starting ${currentMode} in ${config.mode} mode...`);

  try {
    let result;
    if (currentMode === 'sender') {
      result = await window.electronAPI.startSender(config);
    } else {
      result = await window.electronAPI.startReceiver(config);
    }

    if (result.success) {
      isStreaming = true;
      startBtn.disabled = true;
      stopBtn.disabled = false;
      addLogEntry(result.message, 'success');
    } else {
      setStatus('error', 'Failed to start');
      addLogEntry('Error: ' + result.message, 'error');
    }
  } catch (error) {
    setStatus('error', 'Error occurred');
    addLogEntry('Error: ' + error.message, 'error');
  }
}

// Handle Stop
async function handleStop() {
  if (!isStreaming) return;

  addLogEntry('Stopping stream...');

  try {
    const result = await window.electronAPI.stopStream();

    isStreaming = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    setStatus('idle', 'Ready');

    // Stop video playback
    if (currentMode === 'receiver') {
      videoPlayer.pause();
      videoPlayer.src = '';
    }

    if (result.success) {
      addLogEntry(result.message, 'success');
    } else {
      addLogEntry('Warning: ' + result.message, 'error');
    }
  } catch (error) {
    addLogEntry('Error stopping stream: ' + error.message, 'error');
  }
}

// Handle Stream Status Updates
function handleStreamStatus(data) {
  const { status, message, streamUrl } = data;

  switch (status) {
    case 'connected':
      setStatus('active', message);
      addLogEntry(message, 'success');
      break;
    case 'receiving':
      setStatus('active', message);
      addLogEntry(message, 'success');
      if (streamUrl && currentMode === 'receiver') {
        // For actual implementation, you would use a media server
        // This is a placeholder - in production, use proper HLS/DASH streaming
        addLogEntry('Stream URL ready (requires media server setup)', 'success');
      }
      break;
    case 'stopped':
      setStatus('idle', 'Ready');
      addLogEntry(message);
      isStreaming = false;
      startBtn.disabled = false;
      stopBtn.disabled = true;
      break;
    case 'error':
      setStatus('error', 'Error occurred');
      addLogEntry('Error: ' + message, 'error');
      break;
    default:
      addLogEntry(message);
  }
}

// Set Status
function setStatus(type, text) {
  statusIndicator.className = `status-indicator ${type}`;
  statusText.textContent = text;
}

// Add Log Entry
function addLogEntry(message, type = 'info') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;

  const timestamp = new Date().toLocaleTimeString();
  entry.textContent = `[${timestamp}] ${message}`;

  logContent.appendChild(entry);
  logContent.scrollTop = logContent.scrollHeight;

  // Limit log entries to prevent memory issues
  while (logContent.children.length > 100) {
    logContent.removeChild(logContent.firstChild);
  }
}

// Handle window unload
window.addEventListener('beforeunload', () => {
  if (isStreaming) {
    window.electronAPI.stopStream();
  }
});
