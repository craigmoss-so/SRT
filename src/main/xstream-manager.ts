import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface XStreamConfig {
  baseUrl: string;
  username: string;
  password: string;
  mode: 'sender' | 'receiver';
}

export interface XStreamStats {
  bitrate: number;
  packets: {
    sent: number;
    received: number;
    lost: number;
    retransmitted: number;
  };
  rtt: number;
  bandwidth: number;
  connected: boolean;
  timestamp: number;
}

export class XStreamManager extends EventEmitter {
  private ffmpegProcess: ChildProcess | null = null;
  private statsInterval: NodeJS.Timeout | null = null;
  private stats: XStreamStats;
  private hlsOutputPath: string;

  constructor() {
    super();
    this.stats = this.getInitialStats();
    this.hlsOutputPath = path.join(process.cwd(), 'stream');

    // Create stream directory if it doesn't exist
    if (!fs.existsSync(this.hlsOutputPath)) {
      fs.mkdirSync(this.hlsOutputPath, { recursive: true });
    }
  }

  private getInitialStats(): XStreamStats {
    return {
      bitrate: 0,
      packets: {
        sent: 0,
        received: 0,
        lost: 0,
        retransmitted: 0,
      },
      rtt: 0,
      bandwidth: 0,
      connected: false,
      timestamp: Date.now(),
    };
  }

  async startReceiver(config: XStreamConfig): Promise<void> {
    if (this.ffmpegProcess) {
      throw new Error('XStream process already running');
    }

    // Build authenticated XStream URL
    const xstreamUrl = this.buildXStreamUrl(config);

    // Build FFmpeg command for XStream receiver with HLS output
    const args = this.buildReceiverArgs(xstreamUrl);

    console.log('Starting XStream receiver with args:', args);

    this.ffmpegProcess = spawn('ffmpeg', args);

    this.setupProcessHandlers();
    this.startStatsMonitoring();
  }

  async startSender(config: XStreamConfig): Promise<void> {
    if (this.ffmpegProcess) {
      throw new Error('XStream process already running');
    }

    // Build authenticated XStream URL
    const xstreamUrl = this.buildXStreamUrl(config);

    // Build FFmpeg command for XStream sender
    const args = this.buildSenderArgs(xstreamUrl);

    console.log('Starting XStream sender with args:', args);

    this.ffmpegProcess = spawn('ffmpeg', args);

    this.setupProcessHandlers();
    this.startStatsMonitoring();
  }

  private buildXStreamUrl(config: XStreamConfig): string {
    // Build authenticated URL for XStream platform
    // This is a placeholder - actual XStream URL format may vary
    // Example formats:
    // - https://username:password@baseurl/stream
    // - https://baseurl/stream?user=username&pass=password
    // - Custom authentication header (would need different implementation)

    try {
      const url = new URL(config.baseUrl);

      // Option 1: Basic auth in URL
      // url.username = encodeURIComponent(config.username);
      // url.password = encodeURIComponent(config.password);

      // Option 2: Query parameters (more common for streaming platforms)
      url.searchParams.set('username', config.username);
      url.searchParams.set('password', config.password);

      return url.toString();
    } catch (error) {
      throw new Error(`Invalid XStream base URL: ${config.baseUrl}`);
    }
  }

  private buildReceiverArgs(xstreamUrl: string): string[] {
    const hlsPath = path.join(this.hlsOutputPath, 'stream.m3u8');

    const args = [
      '-i', xstreamUrl,
      '-c:v', 'copy', // Copy video without re-encoding
      '-c:a', 'copy', // Copy audio without re-encoding
      '-f', 'hls',
      '-hls_time', '2',
      '-hls_list_size', '3',
      '-hls_flags', 'delete_segments+append_list',
      '-hls_segment_filename', path.join(this.hlsOutputPath, 'segment%d.ts'),
      hlsPath
    ];

    return args;
  }

  private buildSenderArgs(xstreamUrl: string): string[] {
    // For sender mode, we'll use a test pattern by default
    // In a real scenario, you might want to send from a file or capture device
    const args = [
      '-re', // Read input at native frame rate
      '-f', 'lavfi',
      '-i', 'testsrc=duration=3600:size=1280x720:rate=30',
      '-f', 'lavfi',
      '-i', 'sine=frequency=1000:duration=3600',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      '-profile:v', 'main',
      '-level', '4.0',
      '-b:v', '2500k',
      '-maxrate', '3000k',
      '-bufsize', '6000k',
      '-g', '60',
      '-sc_threshold', '0',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '48000',
      '-ac', '2',
      '-f', 'mpegts',
      xstreamUrl
    ];

    return args;
  }

  private setupProcessHandlers(): void {
    if (!this.ffmpegProcess) return;

    this.ffmpegProcess.stdout?.on('data', (data) => {
      console.log('XStream stdout:', data.toString());
    });

    this.ffmpegProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      console.log('XStream stderr:', output);

      // Parse FFmpeg output for stats
      this.parseFFmpegOutput(output);

      // Check for connection
      if (output.includes('Opening') || output.includes('Stream') || output.includes('Input')) {
        this.stats.connected = true;
        this.emit('connection', { connected: true });
      }

      // Check for errors
      if (output.includes('401') || output.includes('403') || output.includes('Unauthorized')) {
        this.emit('error', 'Authentication failed. Please check your credentials.');
      }
    });

    this.ffmpegProcess.on('error', (error) => {
      console.error('XStream process error:', error);
      this.emit('error', error.message);
    });

    this.ffmpegProcess.on('exit', (code, signal) => {
      console.log(`XStream process exited with code ${code} and signal ${signal}`);
      this.stats.connected = false;
      this.emit('connection', { connected: false });
      this.cleanup();
    });
  }

  private parseFFmpegOutput(output: string): void {
    // Parse bitrate
    const bitrateMatch = output.match(/bitrate=\s*(\d+\.?\d*)\s*kbits\/s/);
    if (bitrateMatch) {
      this.stats.bitrate = parseFloat(bitrateMatch[1]);
    }

    // Update timestamp
    this.stats.timestamp = Date.now();
  }

  private startStatsMonitoring(): void {
    this.statsInterval = setInterval(() => {
      this.emit('stats', this.stats);
    }, 1000); // Emit stats every second
  }

  async stop(): Promise<void> {
    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill('SIGTERM');

      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (this.ffmpegProcess && !this.ffmpegProcess.killed) {
          this.ffmpegProcess.kill('SIGKILL');
        }
      }, 5000);
    }

    this.cleanup();
  }

  private cleanup(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    this.ffmpegProcess = null;
    this.stats = this.getInitialStats();
  }

  async getStats(): Promise<XStreamStats> {
    return { ...this.stats };
  }

  getHLSPath(): string {
    return path.join(this.hlsOutputPath, 'stream.m3u8');
  }
}
