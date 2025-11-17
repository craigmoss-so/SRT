# SRT Streaming Application

A standalone desktop application for sending and receiving SRT (Secure Reliable Transport) streams on Windows and macOS. Built with Electron and featuring a beautiful greyscale UI with white text.

## Features

- **Dual Mode Operation**: Switch between Sender and Receiver modes
- **All SRT Modes Supported**:
  - **Caller**: Connect to a listening endpoint
  - **Listener**: Wait for incoming connections
  - **Rendezvous**: Peer-to-peer connection mode
- **Real-time Video Display**: View received streams in the application
- **Greyscale UI**: Clean, professional interface with white text
- **Cross-platform**: Works on Windows and macOS
- **Configurable Parameters**:
  - Custom address and port
  - Adjustable latency (20-8000ms)
  - Multiple test pattern sources for sending

## Prerequisites

Before running the application, you need to install FFmpeg with SRT support:

### Windows
1. Download FFmpeg with SRT support from [https://github.com/BtbN/FFmpeg-Builds/releases](https://github.com/BtbN/FFmpeg-Builds/releases)
2. Extract the archive and add the `bin` folder to your system PATH
3. Verify installation: `ffmpeg -version`

### macOS
```bash
brew install ffmpeg
```

Verify SRT support:
```bash
ffmpeg -protocols | grep srt
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd SRT
```

2. Install dependencies:
```bash
npm install
```

## Usage

### Running in Development Mode
```bash
npm start
```

### Building for Production

Build for Windows:
```bash
npm run build:win
```

Build for macOS:
```bash
npm run build:mac
```

Build for both platforms:
```bash
npm run build
```

The compiled applications will be available in the `dist` folder.

## Application Modes

### Sender Mode
Send video streams using various test patterns:
1. Select **SENDER** mode
2. Choose SRT mode (Caller/Listener/Rendezvous)
3. Configure address and port
4. Select input source (test pattern)
5. Click **START** to begin streaming

### Receiver Mode
Receive and display incoming video streams:
1. Select **RECEIVER** mode
2. Choose SRT mode (Caller/Listener/Rendezvous)
3. Configure address and port
4. Click **START** to begin receiving
5. The received stream will be processed (video display requires additional media server setup)

## SRT Mode Descriptions

- **Caller Mode**: The application initiates a connection to a remote listener. Use this when connecting to an existing SRT server.

- **Listener Mode**: The application waits for incoming connections. The address field is disabled as it listens on all interfaces (0.0.0.0).

- **Rendezvous Mode**: Both peers attempt to connect to each other simultaneously. Useful for peer-to-peer streaming where neither side is designated as server or client.

## Configuration Options

- **Address**: IP address or hostname (disabled in Listener mode)
- **Port**: Port number (1-65535)
- **Latency**: SRT latency in milliseconds (20-8000ms, default: 120ms)
- **Input Source** (Sender only): Various test patterns at different resolutions

## Technical Details

### Technology Stack
- **Electron**: Cross-platform desktop framework
- **FFmpeg**: Media processing and SRT protocol handling
- **Node.js**: Backend logic and process management

### Architecture
- **Main Process** (`main.js`): Handles FFmpeg processes and IPC communication
- **Renderer Process** (`renderer.js`): UI logic and user interactions
- **Preload Script** (`preload.js`): Secure bridge between main and renderer processes

### Security
- Context isolation enabled
- Node integration disabled in renderer
- Secure IPC communication via preload script

## Troubleshooting

### FFmpeg Not Found
- Ensure FFmpeg is installed and in your system PATH
- Restart the application after installing FFmpeg
- Check the footer status message for FFmpeg availability

### Stream Not Connecting
- Verify the address and port are correct
- Check firewall settings
- Ensure the remote endpoint is running and accessible
- Try increasing the latency value

### No Video Display in Receiver Mode
- The current implementation requires additional setup for video playback
- For production use, integrate a media server (e.g., HLS/DASH streaming)
- Check the log section for error messages

## Development

### Project Structure
```
SRT/
├── main.js          # Electron main process
├── preload.js       # Preload script for IPC
├── renderer.js      # Frontend logic
├── index.html       # UI structure
├── styles.css       # Greyscale styling
├── package.json     # Dependencies and scripts
└── README.md        # Documentation
```

### Adding Features
- Modify `main.js` for backend functionality
- Update `renderer.js` for UI logic
- Enhance `styles.css` for styling changes
- Edit `index.html` for UI structure

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## Support

For issues and questions, please open an issue in the repository.
