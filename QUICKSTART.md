# SRT Stream Application - Quick Start Guide

## What is This Project?

A **professional Electron desktop application** for sending and receiving **SRT (Secure Reliable Transport)** video streams over the internet. Think of it like a professional-grade video streaming tool for live broadcasts, remote production, or studio connections.

## Key Features

- **Dual Mode**: Send OR receive SRT video streams
- **Dual-Path Failover**: Broadcast-grade redundancy (automatic failover between primary/backup streams)
- **Beautiful UI**: Modern React interface with real-time monitoring
- **AI Assistant**: Built-in AI help (requires Ollama)
- **Live Video Playback**: Watch received streams in real-time
- **Encryption Support**: AES encryption with passphrases
- **Cross-Platform**: Works on macOS, Windows, and Linux

## Prerequisites

Before you start, you need:

### 1. Node.js (v18 or higher)
```bash
node --version  # Should show v18.x or higher
```

If not installed:
- **macOS**: `brew install node`
- **Windows**: Download from https://nodejs.org
- **Linux**: `sudo apt install nodejs npm`

### 2. FFmpeg with SRT Support

**macOS**:
```bash
brew install ffmpeg
```

**Windows**:
- Download from https://ffmpeg.org/download.html
- Add to system PATH

**Linux**:
```bash
sudo apt update
sudo apt install ffmpeg
```

Verify SRT support:
```bash
ffmpeg -protocols | grep srt
```

## Installation

```bash
# 1. Navigate to the project directory
cd /home/user/SRT

# 2. Install dependencies (this will take a few minutes)
npm install

# 3. Start the development app
npm run dev
```

The application window should open automatically!

## How to Use

### Receiver Mode (Receive a stream)

1. Click **"Receiver"** toggle in the top-right
2. Set **Listen Port**: 9000 (default)
3. Set **Latency**: 200ms (default, increase for unstable networks)
4. Optional: Set **Passphrase** for encryption
5. Click **"Start Receiving"**
6. Video will play automatically when a sender connects

### Sender Mode (Send a stream)

1. Click **"Sender"** toggle in the top-right
2. Set **Destination Host**: IP address of receiver (e.g., `192.168.1.100`)
3. Set **Destination Port**: 9000 (must match receiver)
4. Set **Input Source**:
   - Leave empty for **test pattern** (easiest for testing)
   - Or enter a video file path: `/path/to/video.mp4`
   - Or enter a stream URL: `http://example.com/stream.m3u8`
5. Optional: Set **Passphrase** (must match receiver if used)
6. Click **"Start Sending"**

### Testing Locally

To test on the same computer:

**Terminal 1 (Receiver)**:
```bash
npm run dev
```
- Select "Receiver" mode
- Port: 9000
- Click "Start Receiving"

**Terminal 2 (Sender)**:
```bash
npm run dev
```
- Select "Sender" mode
- Host: `127.0.0.1` (localhost)
- Port: 9000
- Input: leave empty for test pattern
- Click "Start Sending"

You should see the test pattern video playing in the receiver!

## Dual-Path Failover (Professional Feature)

For critical broadcasts, you can use **two separate feeds** with automatic failover:

**Receiver Setup**:
1. Enable **"Dual-Path Failover"** checkbox
2. Primary Port: 9000
3. Redundant Port: 9001
4. Start receiving

**Sender Setup** (two locations):
- **Location A**: Send to receiver's IP on port 9000
- **Location B**: Send to receiver's IP on port 9001

The system automatically switches to the healthiest stream!

## Project Structure

```
SRT/
├── src/
│   ├── main/                    # Electron backend
│   │   ├── main.ts             # App entry point
│   │   ├── srt-manager.ts      # Single stream manager
│   │   ├── dual-path-srt-manager.ts  # Failover manager
│   │   └── http-server.ts      # HLS video server
│   └── renderer/                # React frontend
│       ├── App.tsx             # Main UI
│       └── components/          # UI components
├── package.json                 # Dependencies & scripts
├── README.md                    # Full documentation
└── QUICKSTART.md               # This file
```

## Available Commands

```bash
# Development (hot reload)
npm run dev

# Build for production
npm run build

# Package as app
npm run package              # All platforms
npm run package:mac          # macOS only
npm run package:win          # Windows only
npm run package:linux        # Linux only
```

## Troubleshooting

### "FFmpeg not found"
- Ensure FFmpeg is installed: `ffmpeg -version`
- Make sure it's in your system PATH

### "Port already in use"
- Change the port number
- Or find what's using it: `lsof -i :9000` (macOS/Linux)

### Stream not playing
- Check both sender and receiver use the same port
- Verify passphrases match if encryption is enabled
- Increase latency to 500-1000ms

### High packet loss
- Increase latency setting
- Check network connection quality
- Reduce video bitrate

## Next Steps

1. **Read the full README.md** for advanced features
2. **Configure dual-path failover** for redundancy
3. **Try the AI Assistant** (requires Ollama installation)
4. **Build a production app** with `npm run package`

## Tech Stack

- **Electron** - Desktop app framework
- **React** + **TypeScript** - UI
- **Tailwind CSS** - Styling
- **FFmpeg** - Video processing & SRT protocol
- **HLS.js** - Video playback

## Support

For issues or questions, check:
- Full documentation: `README.md`
- Project repository issues

---

**Built by**: craigmoss-so
**License**: MIT
