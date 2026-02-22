// DOM Elements
const modeButtons = document.querySelectorAll('.mode-btn');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const logContent = document.getElementById('log-content');
const ffmpegStatus = document.getElementById('ffmpeg-status');
const sourcesList = document.getElementById('sources-list');
const streamsGrid = document.getElementById('streams-grid');
const addSourceBtn = document.getElementById('add-source-btn');
const sourceModal = document.getElementById('source-modal');
const modalClose = document.getElementById('modal-close');
const saveSourceBtn = document.getElementById('save-source-btn');
const cancelSourceBtn = document.getElementById('cancel-source-btn');

// Configuration Elements
const srtModeSelect = document.getElementById('srt-mode');
const addressInput = document.getElementById('address');
const portInput = document.getElementById('port');
const latencyInput = document.getElementById('latency');
const inputSourceSelect = document.getElementById('input-source');

// Modal Elements
const modalTitle = document.getElementById('modal-title');
const sourceNameInput = document.getElementById('source-name');
const sourceNetworkSelect = document.getElementById('source-network');
const sourceSrtModeSelect = document.getElementById('source-srt-mode');
const sourceAddressInput = document.getElementById('source-address');
const sourcePortInput = document.getElementById('source-port');
const sourceLatencyInput = document.getElementById('source-latency');
const sourcePassphraseInput = document.getElementById('source-passphrase');

// State
let currentMode = 'sender';
let isStreaming = false;
let sources = [];
let activeStreams = new Map(); // Track active streams by sourceId
let editingSourceId = null; // Track which source is being edited

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkFFmpegAvailability();
  setupEventListeners();
  updateUIForMode();
  loadSources();
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

  // Start button (sender mode)
  startBtn.addEventListener('click', handleStart);

  // Stop button (sender mode)
  stopBtn.addEventListener('click', handleStop);

  // SRT mode change
  srtModeSelect.addEventListener('change', () => {
    updateAddressField();
  });

  // Source SRT mode change (modal)
  sourceSrtModeSelect.addEventListener('change', () => {
    updateSourceAddressField();
  });

  // Add source button
  addSourceBtn.addEventListener('click', () => {
    openSourceModal();
  });

  // Modal close
  modalClose.addEventListener('click', closeSourceModal);
  cancelSourceBtn.addEventListener('click', closeSourceModal);

  // Save source
  saveSourceBtn.addEventListener('click', saveSource);

  // Click outside modal to close
  sourceModal.addEventListener('click', (e) => {
    if (e.target === sourceModal) {
      closeSourceModal();
    }
  });

  // Stream status listener (sender mode)
  window.electronAPI.onStreamStatus((event, data) => {
    handleStreamStatus(data);
  });

  // FFmpeg log listener (sender mode)
  window.electronAPI.onFFmpegLog((event, data) => {
    if (data.includes('error') || data.includes('Error') ||
        data.includes('Opening') || data.includes('Opened') ||
        data.includes('Connection') || data.includes('Stream')) {
      addLogEntry(data.trim());
    }
  });

  // Source stream status listener (receiver mode)
  window.electronAPI.onSourceStreamStatus((event, data) => {
    handleSourceStreamStatus(data);
  });

  // Source stream log listener (receiver mode)
  window.electronAPI.onSourceStreamLog((event, data) => {
    if (data.message.includes('error') || data.message.includes('Error') ||
        data.message.includes('Opening') || data.message.includes('Opened')) {
      addLogEntry(`[${getSourceName(data.sourceId)}] ${data.message.trim()}`);
    }
  });

  // Source stream stats listener (receiver mode)
  window.electronAPI.onSourceStreamStats((event, data) => {
    updateStreamStats(data);
  });

  // Update address fields
  updateAddressField();
  updateSourceAddressField();
}

// Update UI based on mode
function updateUIForMode() {
  document.body.className = currentMode === 'receiver' ? 'receiver-mode' : 'sender-mode';

  if (currentMode === 'receiver') {
    // Load and display sources
    renderSources();
  }
}

// Load sources from storage
async function loadSources() {
  try {
    const result = await window.electronAPI.loadSources();
    if (result.success) {
      sources = result.sources || [];
      renderSources();
      addLogEntry(`Loaded ${sources.length} source configuration(s)`);
    }
  } catch (error) {
    addLogEntry('Error loading sources: ' + error.message, 'error');
  }
}

// Save sources to storage
async function saveSources() {
  try {
    const result = await window.electronAPI.saveSources(sources);
    if (!result.success) {
      addLogEntry('Error saving sources: ' + result.message, 'error');
    }
  } catch (error) {
    addLogEntry('Error saving sources: ' + error.message, 'error');
  }
}

// Render sources in sidebar
function renderSources() {
  if (currentMode !== 'receiver') return;

  sourcesList.innerHTML = '';

  if (sources.length === 0) {
    sourcesList.innerHTML = '<div style="text-align: center; padding: 40px 20px; color: #606060;">No sources configured<br><small>Click + to add a source</small></div>';
    return;
  }

  sources.forEach(source => {
    const card = createSourceCard(source);
    sourcesList.appendChild(card);
  });
}

// Create source card element
function createSourceCard(source) {
  const isStreaming = activeStreams.has(source.id);

  const card = document.createElement('div');
  card.className = `source-card ${isStreaming ? 'streaming' : ''}`;
  card.dataset.sourceId = source.id;

  card.innerHTML = `
    <div class="source-card-header">
      <div class="source-name">${source.name}</div>
      <div class="source-actions">
        <button class="source-action-btn edit-btn" title="Edit">✎</button>
        <button class="source-action-btn delete-btn" title="Delete">✕</button>
      </div>
    </div>
    <div class="source-info">
      <div class="source-info-item">
        <span class="source-info-label">Mode:</span>
        <span>${source.srtMode.toUpperCase()}</span>
      </div>
      <div class="source-info-item">
        <span class="source-info-label">Address:</span>
        <span>${source.address}:${source.port}</span>
      </div>
      <div class="source-info-item">
        <span class="source-info-label">Latency:</span>
        <span>${source.latency}ms</span>
      </div>
      <div class="source-network-badge">${source.network.toUpperCase()}</div>
    </div>
    <div class="source-controls" style="margin-top: 12px; display: flex; gap: 8px;">
      <button class="control-btn start-source-btn" style="flex: 1; padding: 8px 16px; font-size: 0.85em; min-width: 0;">${isStreaming ? 'STOP' : 'START'}</button>
    </div>
  `;

  // Add event listeners
  const editBtn = card.querySelector('.edit-btn');
  const deleteBtn = card.querySelector('.delete-btn');
  const startSourceBtn = card.querySelector('.start-source-btn');

  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    editSource(source.id);
  });

  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteSource(source.id);
  });

  startSourceBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isStreaming) {
      stopSourceStream(source.id);
    } else {
      startSourceStream(source.id);
    }
  });

  return card;
}

// Open source modal
function openSourceModal(sourceId = null) {
  editingSourceId = sourceId;

  if (sourceId) {
    // Edit mode
    const source = sources.find(s => s.id === sourceId);
    if (!source) return;

    modalTitle.textContent = 'Edit SRT Source';
    sourceNameInput.value = source.name;
    sourceNetworkSelect.value = source.network;
    sourceSrtModeSelect.value = source.srtMode;
    sourceAddressInput.value = source.address;
    sourcePortInput.value = source.port;
    sourceLatencyInput.value = source.latency;
    sourcePassphraseInput.value = source.passphrase || '';
  } else {
    // Add mode
    modalTitle.textContent = 'Add SRT Source';
    sourceNameInput.value = '';
    sourceNetworkSelect.value = 'internet';
    sourceSrtModeSelect.value = 'caller';
    sourceAddressInput.value = '127.0.0.1';
    sourcePortInput.value = '9000';
    sourceLatencyInput.value = '120';
    sourcePassphraseInput.value = '';
  }

  updateSourceAddressField();
  sourceModal.classList.add('active');
}

// Close source modal
function closeSourceModal() {
  sourceModal.classList.remove('active');
  editingSourceId = null;
}

// Save source
function saveSource() {
  const name = sourceNameInput.value.trim();
  const network = sourceNetworkSelect.value;
  const srtMode = sourceSrtModeSelect.value;
  const address = sourceAddressInput.value.trim();
  const port = parseInt(sourcePortInput.value);
  const latency = parseInt(sourceLatencyInput.value);
  const passphrase = sourcePassphraseInput.value.trim();

  // Validation
  if (!name) {
    alert('Please enter a source name');
    return;
  }

  if (srtMode !== 'listener' && !address) {
    alert('Address is required for caller and rendezvous modes');
    return;
  }

  if (!port || port < 1 || port > 65535) {
    alert('Please enter a valid port number (1-65535)');
    return;
  }

  if (!latency || latency < 20) {
    alert('Latency must be at least 20ms');
    return;
  }

  const sourceConfig = {
    name,
    network,
    srtMode,
    address: srtMode === 'listener' ? '0.0.0.0' : address,
    port,
    latency,
    passphrase
  };

  if (editingSourceId) {
    // Update existing source
    const index = sources.findIndex(s => s.id === editingSourceId);
    if (index !== -1) {
      sources[index] = { ...sources[index], ...sourceConfig };
      addLogEntry(`Updated source: ${name}`, 'success');
    }
  } else {
    // Add new source
    const newSource = {
      id: generateId(),
      ...sourceConfig
    };
    sources.push(newSource);
    addLogEntry(`Added source: ${name}`, 'success');
  }

  saveSources();
  renderSources();
  closeSourceModal();
}

// Edit source
function editSource(sourceId) {
  openSourceModal(sourceId);
}

// Delete source
async function deleteSource(sourceId) {
  const source = sources.find(s => s.id === sourceId);
  if (!source) return;

  if (!confirm(`Delete source "${source.name}"?`)) {
    return;
  }

  // Stop stream if active
  if (activeStreams.has(sourceId)) {
    await stopSourceStream(sourceId);
  }

  sources = sources.filter(s => s.id !== sourceId);
  saveSources();
  renderSources();
  addLogEntry(`Deleted source: ${source.name}`, 'success');
}

// Start source stream
async function startSourceStream(sourceId) {
  const source = sources.find(s => s.id === sourceId);
  if (!source) return;

  addLogEntry(`Starting stream for ${source.name}...`);

  try {
    const result = await window.electronAPI.startSourceStream(sourceId, source);

    if (result.success) {
      activeStreams.set(sourceId, { source, startTime: Date.now() });
      renderSources();
      addStreamDisplay(sourceId, source);
      addLogEntry(`Stream started: ${source.name}`, 'success');
    } else {
      addLogEntry(`Failed to start ${source.name}: ${result.message}`, 'error');
    }
  } catch (error) {
    addLogEntry(`Error starting ${source.name}: ${error.message}`, 'error');
  }
}

// Stop source stream
async function stopSourceStream(sourceId) {
  const streamInfo = activeStreams.get(sourceId);
  if (!streamInfo) return;

  addLogEntry(`Stopping stream for ${streamInfo.source.name}...`);

  try {
    const result = await window.electronAPI.stopSourceStream(sourceId);

    if (result.success) {
      activeStreams.delete(sourceId);
      renderSources();
      removeStreamDisplay(sourceId);
      addLogEntry(`Stream stopped: ${streamInfo.source.name}`, 'success');
    } else {
      addLogEntry(`Failed to stop stream: ${result.message}`, 'error');
    }
  } catch (error) {
    addLogEntry(`Error stopping stream: ${error.message}`, 'error');
  }
}

// Add stream display
function addStreamDisplay(sourceId, source) {
  // Remove "no streams" message if present
  const noStreamsMsg = streamsGrid.querySelector('.no-streams-message');
  if (noStreamsMsg) {
    noStreamsMsg.remove();
  }

  const display = document.createElement('div');
  display.className = 'stream-display';
  display.dataset.sourceId = sourceId;

  display.innerHTML = `
    <div class="stream-display-header">
      <div class="stream-display-title">${source.name}</div>
      <div class="stream-display-status">
        <div class="stream-status-dot"></div>
        <span>LIVE</span>
      </div>
    </div>
    <div class="stream-placeholder">
      <p>Receiving SRT Stream</p>
      <p style="font-size: 0.9em; color: #606060;">${source.network.toUpperCase()} - ${source.address}:${source.port}</p>
      <p style="font-size: 0.8em; color: #505050; margin-top: 10px;">Bitrate: <span class="bitrate-display">--</span> | FPS: <span class="fps-display">--</span></p>
    </div>
    <div class="stream-display-info">
      <div>Mode: ${source.srtMode.toUpperCase()} | Latency: ${source.latency}ms</div>
    </div>
  `;

  streamsGrid.appendChild(display);
}

// Remove stream display
function removeStreamDisplay(sourceId) {
  const display = streamsGrid.querySelector(`[data-source-id="${sourceId}"]`);
  if (display) {
    display.remove();
  }

  // Add "no streams" message if no streams are active
  if (streamsGrid.children.length === 0) {
    streamsGrid.innerHTML = `
      <div class="no-streams-message">
        <p>No active streams</p>
        <p class="hint">Add sources from the sidebar and start receiving</p>
      </div>
    `;
  }
}

// Update stream stats
function updateStreamStats(data) {
  const display = streamsGrid.querySelector(`[data-source-id="${data.sourceId}"]`);
  if (!display) return;

  if (data.bitrate) {
    const bitrateDisplay = display.querySelector('.bitrate-display');
    if (bitrateDisplay) bitrateDisplay.textContent = data.bitrate;
  }

  if (data.fps) {
    const fpsDisplay = display.querySelector('.fps-display');
    if (fpsDisplay) fpsDisplay.textContent = data.fps;
  }
}

// Handle source stream status
function handleSourceStreamStatus(data) {
  const { sourceId, status, message } = data;
  const streamInfo = activeStreams.get(sourceId);

  if (!streamInfo) return;

  switch (status) {
    case 'connected':
      addLogEntry(`[${streamInfo.source.name}] ${message}`, 'success');
      break;
    case 'stopped':
      activeStreams.delete(sourceId);
      renderSources();
      removeStreamDisplay(sourceId);
      addLogEntry(`[${streamInfo.source.name}] ${message}`);
      break;
    case 'error':
      addLogEntry(`[${streamInfo.source.name}] Error: ${message}`, 'error');
      break;
  }
}

// Update address field based on SRT mode (sender mode)
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

// Update source address field based on SRT mode (modal)
function updateSourceAddressField() {
  const srtMode = sourceSrtModeSelect.value;
  if (srtMode === 'listener') {
    sourceAddressInput.disabled = true;
    sourceAddressInput.value = '0.0.0.0';
  } else {
    sourceAddressInput.disabled = false;
    if (sourceAddressInput.value === '0.0.0.0') {
      sourceAddressInput.value = '127.0.0.1';
    }
  }
}

// Handle Start (sender mode)
async function handleStart() {
  if (isStreaming || currentMode !== 'sender') return;

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
  addLogEntry(`Starting sender in ${config.mode} mode...`);

  try {
    const result = await window.electronAPI.startSender(config);

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

// Handle Stop (sender mode)
async function handleStop() {
  if (!isStreaming || currentMode !== 'sender') return;

  addLogEntry('Stopping stream...');

  try {
    const result = await window.electronAPI.stopStream();

    isStreaming = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    setStatus('idle', 'Ready');

    if (result.success) {
      addLogEntry(result.message, 'success');
    } else {
      addLogEntry('Warning: ' + result.message, 'error');
    }
  } catch (error) {
    addLogEntry('Error stopping stream: ' + error.message, 'error');
  }
}

// Handle Stream Status Updates (sender mode)
function handleStreamStatus(data) {
  const { status, message } = data;

  switch (status) {
    case 'connected':
      setStatus('active', message);
      addLogEntry(message, 'success');
      break;
    case 'receiving':
      setStatus('active', message);
      addLogEntry(message, 'success');
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

// Utility functions
function generateId() {
  return 'source_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getSourceName(sourceId) {
  const source = sources.find(s => s.id === sourceId);
  return source ? source.name : sourceId;
}

// Handle window unload
window.addEventListener('beforeunload', async () => {
  if (isStreaming) {
    await window.electronAPI.stopStream();
  }
  if (activeStreams.size > 0) {
    await window.electronAPI.stopAllStreams();
  }
});
