import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface SRTConfig {
  mode: 'sender' | 'receiver';
  host?: string;
  port: number;
  latency?: number;
  passphrase?: string;
  streamId?: string;
  inputSource?: string;
  maxBandwidth?: number;
}

export interface SRTStats {
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

export class SRTManager extends EventEmitter {
  private srtProcess: ChildProcess | null = null;
  private currentConfig: SRTConfig | null = null;
  private statsInterval: NodeJS.Timeout | null = null;
  private stats: SRTStats;
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

  private getInitialStats(): SRTStats {
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

  async startSender(config: SRTConfig): Promise<void> {
    if (this.srtProcess) {
      throw new Error('SRT process already running');
    }

    this.currentConfig = { ...config, mode: 'sender' };

    // Build FFmpeg command for SRT sender
    const args = this.buildSenderArgs(config);

    this.srtProcess = spawn('ffmpeg', args);

    this.setupProcessHandlers();
    this.startStatsMonitoring();
  }

  async startReceiver(config: SRTConfig): Promise<void> {
    if (this.srtProcess) {
      throw new Error('SRT process already running');
    }

    this.currentConfig = { ...config, mode: 'receiver' };

    // Build FFmpeg command for SRT receiver with HLS output for browser playback
    const args = this.buildReceiverArgs(config);

    this.srtProcess = spawn('ffmpeg', args);

    this.setupProcessHandlers();
    this.startStatsMonitoring();
  }

  private buildSenderArgs(config: SRTConfig): string[] {
    const srtUrl = this.buildSRTUrl(config);
    const args = ['-re']; // Read input at native frame rate

    // Input source
    if (config.inputSource) {
      if (config.inputSource.startsWith('http')) {
        args.push('-i', config.inputSource);
      } else if (fs.existsSync(config.inputSource)) {
        args.push('-i', config.inputSource);
      } else {
        throw new Error('Invalid input source');
      }
    } else {
      // Use test pattern if no input
      args.push(
        '-f', 'lavfi',
        '-i', 'testsrc=duration=3600:size=1280x720:rate=30',
        '-f', 'lavfi',
        '-i', 'sine=frequency=1000:duration=3600'
      );
    }

    // Encoding parameters for production quality
    args.push(
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
      srtUrl
    );

    return args;
  }

  private buildReceiverArgs(config: SRTConfig): string[] {
    const srtUrl = this.buildSRTUrl(config);
    const hlsPath = path.join(this.hlsOutputPath, 'stream.m3u8');

    const args = [
      '-i', srtUrl,
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

  private buildSRTUrl(config: SRTConfig): string {
    const params: string[] = [];

    if (config.latency) {
      params.push(`latency=${config.latency}`);
    }

    if (config.passphrase) {
      params.push(`passphrase=${encodeURIComponent(config.passphrase)}`);
    }

    if (config.streamId) {
      params.push(`streamid=${encodeURIComponent(config.streamId)}`);
    }

    if (config.maxBandwidth) {
      params.push(`maxbw=${config.maxBandwidth}`);
    }

    const queryString = params.length > 0 ? '?' + params.join('&') : '';

    if (config.mode === 'sender') {
      return `srt://${config.host}:${config.port}${queryString}`;
    } else {
      return `srt://0.0.0.0:${config.port}?mode=listener${queryString ? '&' + params.join('&') : ''}`;
    }
  }

  private setupProcessHandlers(): void {
    if (!this.srtProcess) return;

    this.srtProcess.stdout?.on('data', (data) => {
      // FFmpeg outputs to stderr, but handle stdout just in case
      console.log('SRT stdout:', data.toString());
    });

    this.srtProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      console.log('SRT stderr:', output);

      // Parse FFmpeg output for stats
      this.parseFFmpegOutput(output);

      // Check for connection
      if (output.includes('Opening') || output.includes('SRT')) {
        this.stats.connected = true;
        this.emit('connection', { connected: true });
      }
    });

    this.srtProcess.on('error', (error) => {
      console.error('SRT process error:', error);
      this.emit('error', error.message);
    });

    this.srtProcess.on('exit', (code, signal) => {
      console.log(`SRT process exited with code ${code} and signal ${signal}`);
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
    if (this.srtProcess) {
      this.srtProcess.kill('SIGTERM');

      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (this.srtProcess && !this.srtProcess.killed) {
          this.srtProcess.kill('SIGKILL');
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

    this.srtProcess = null;
    this.currentConfig = null;
    this.stats = this.getInitialStats();
  }

  async getStats(): Promise<SRTStats> {
    return { ...this.stats };
  }

  getHLSPath(): string {
    return path.join(this.hlsOutputPath, 'stream.m3u8');
  }
}
