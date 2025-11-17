# SRT Stream Application

A professional, production-ready Electron application for sending and receiving SRT (Secure Reliable Transport) video streams with a beautiful modern UI.

## Features

- **Full SRT Compliance**: Utilizes FFmpeg with SRT support for complete protocol implementation
- **Beautiful Modern UI**: Built with React and Tailwind CSS with a stunning macOS-optimized interface
- **Dual Mode Operation**: Seamlessly switch between sender and receiver modes
- **Live Stream Decoding**: Real-time HLS-based video playback for received streams
- **Real-time Statistics**: Monitor bitrate, packet loss, RTT, and connection status
- **Production Ready**: Comprehensive error handling, logging, and stability features
- **Cross-platform**: Works on macOS, Windows, and Linux
- **Advanced Features**:
  - Encryption support with AES passphrase
  - Custom stream IDs
  - Configurable latency
  - Multiple input source options

## Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   ```bash
   # Check your Node.js version
   node --version
   ```

2. **FFmpeg with SRT Support**

   **macOS** (recommended):
   ```bash
   # Using Homebrew
   brew install ffmpeg
   ```

   **Windows**:
   - Download FFmpeg with SRT support from https://ffmpeg.org/download.html
   - Add FFmpeg to your system PATH

   **Linux**:
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install ffmpeg

   # Verify SRT support
   ffmpeg -protocols | grep srt
   ```

3. **Git** (for cloning the repository)

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd SRT
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

## Building for Production

### macOS

Build a DMG and ZIP for distribution:
```bash
npm run package:mac
```

The built application will be in the `release` directory.

### Windows

```bash
npm run package:win
```

### Linux

```bash
npm run package:linux
```

### All Platforms

```bash
npm run package
```

## Usage

### Receiver Mode

1. **Start the Application**
2. **Select "Receiver" mode** in the top-right toggle
3. **Configure Settings**:
   - **Listen Port**: The port to listen on (default: 9000)
   - **Latency**: Buffer latency in milliseconds (default: 200ms)
   - **Passphrase** (optional): Encryption key for secure transmission
   - **Stream ID** (optional): Stream identifier

4. **Click "Start Receiving"**
5. **Video will automatically play** when the stream is received

### Sender Mode

1. **Start the Application**
2. **Select "Sender" mode** in the top-right toggle
3. **Configure Settings**:
   - **Destination Host**: IP address or hostname of the receiver
   - **Destination Port**: Port number the receiver is listening on
   - **Latency**: Buffer latency in milliseconds
   - **Input Source**:
     - Leave empty for test pattern
     - Enter file path for video file: `/path/to/video.mp4`
     - Enter URL for stream: `http://example.com/stream.m3u8`
   - **Passphrase** (optional): Must match receiver's passphrase
   - **Stream ID** (optional): Must match receiver's stream ID

4. **Click "Start Sending"**
5. **Monitor statistics** in the right panel

## Architecture

### Technology Stack

- **Electron**: Cross-platform desktop application framework
- **React**: UI component library
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Modern utility-first CSS framework
- **FFmpeg**: Video processing and SRT protocol implementation
- **HLS.js**: Browser-based HLS video playback

### Project Structure

```
SRT/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.ts          # Application entry point
│   │   ├── preload.ts       # Secure IPC bridge
│   │   ├── srt-manager.ts   # SRT stream management
│   │   └── http-server.ts   # HLS stream server
│   └── renderer/             # React UI
│       ├── components/       # React components
│       │   ├── ConfigPanel.tsx
│       │   ├── VideoPlayer.tsx
│       │   ├── StatsPanel.tsx
│       │   └── StatusBar.tsx
│       ├── App.tsx          # Main application component
│       ├── main.tsx         # React entry point
│       └── index.css        # Global styles
├── build/                    # Build resources
│   └── entitlements.mac.plist
├── dist/                     # Compiled output
├── release/                  # Packaged applications
└── stream/                   # Temporary HLS files
```

## SRT Protocol Details

This application uses the SRT (Secure Reliable Transport) protocol, which provides:

- **Low Latency**: Typically 200-500ms end-to-end
- **Reliability**: Automatic packet retransmission
- **Security**: AES encryption support
- **Firewall Traversal**: Works across NAT and firewalls
- **Adaptive Bitrate**: Dynamic bandwidth management

### Typical Use Cases

1. **Live Event Broadcasting**: Send live video feeds over the internet
2. **Studio-to-Studio Links**: Connect remote production facilities
3. **Remote Contribution**: Enable remote reporters and cameras
4. **Backup Streaming**: Redundant stream delivery
5. **Cloud Contribution**: Send feeds to cloud platforms

## Troubleshooting

### FFmpeg Not Found

**Error**: "FFmpeg not found" or stream fails to start

**Solution**:
- Verify FFmpeg is installed: `ffmpeg -version`
- Ensure FFmpeg is in your system PATH
- On macOS, reinstall with: `brew reinstall ffmpeg`

### Stream Not Playing

**Error**: Video player shows "Waiting for stream..."

**Solution**:
- Verify the sender is running and connected
- Check that ports are not blocked by firewall
- Ensure sender and receiver use the same port number
- Verify passphrase matches if encryption is enabled

### High Packet Loss

**Issue**: Statistics show high packet loss percentage

**Solution**:
- Increase latency setting (try 500-1000ms)
- Check network connection quality
- Reduce input video bitrate
- Verify sender's upload bandwidth

### Port Already in Use

**Error**: "Port already in use" or "Address already in use"

**Solution**:
- Change the port number in configuration
- Stop other applications using the same port
- On macOS/Linux: `lsof -i :9000` to find processes using port 9000

## Development

### Development Mode

Run the application in development mode with hot reload:

```bash
npm run dev
```

This will:
1. Start the Vite dev server for the renderer process
2. Compile and run the Electron main process
3. Open DevTools automatically

### Building Components

**Renderer only**:
```bash
npm run build:renderer
```

**Main process only**:
```bash
npm run build:main
```

**Both**:
```bash
npm run build
```

## Configuration

### Recommended Settings

**Low Latency** (< 1 second):
- Latency: 200-300ms
- Requires stable, high-quality network

**Standard** (1-2 seconds):
- Latency: 500-1000ms
- Good balance for most use cases

**High Reliability** (2-4 seconds):
- Latency: 1500-3000ms
- Best for unstable networks

## Security

### Encryption

Enable encryption by setting a passphrase:
- Length: 10-79 characters
- Uses: AES-128 or AES-256 (based on length)
- Both sender and receiver must use identical passphrase

### Network Security

- Only expose ports that are necessary
- Use firewall rules to restrict access
- Consider VPN for sensitive content
- Rotate passphrases regularly

## Performance Optimization

### Sender Side

- Use hardware-accelerated encoding if available
- Match input resolution to network capacity
- Use appropriate bitrate (2.5-5 Mbps for 1080p)
- Enable `tune=zerolatency` for live content (already configured)

### Receiver Side

- Ensure sufficient CPU for decoding
- Use hardware-accelerated video playback
- Monitor buffer levels
- Close unnecessary applications

## License

MIT

## Support

For issues, questions, or contributions, please visit the repository issue tracker.

## Credits

Built with:
- Electron
- React
- TypeScript
- Tailwind CSS
- FFmpeg
- HLS.js
- SRT Protocol (Haivision)
