import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface SRTConfig {
  mode: 'sender' | 'receiver' | 'dual-receiver';
  host?: string;
  port: number;
  latency?: number;
  passphrase?: string;
  streamId?: string;
  inputSource?: string;
  maxBandwidth?: number;
  // Dual receiver config
  redundantHost?: string;
  redundantPort?: number;
  redundantPassphrase?: string;
  redundantStreamId?: string;
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

export interface DualPathStats {
  primary: SRTStats;
  redundant: SRTStats;
  activePath: 'primary' | 'redundant';
  switchCount: number;
  lastSwitchTime: number;
  primaryHealth: number; // 0-100 score
  redundantHealth: number; // 0-100 score
}

export class DualPathSRTManager extends EventEmitter {
  private primaryProcess: ChildProcess | null = null;
  private redundantProcess: ChildProcess | null = null;
  private currentConfig: SRTConfig | null = null;

  private primaryStats: SRTStats;
  private redundantStats: SRTStats;
  private activePath: 'primary' | 'redundant' = 'primary';
  private switchCount: number = 0;
  private lastSwitchTime: number = 0;

  private statsInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private hlsOutputPath: string;

  // Failover thresholds
  private readonly PACKET_LOSS_THRESHOLD = 1.0; // 1% packet loss triggers switch
  private readonly BITRATE_DROP_THRESHOLD = 0.5; // 50% bitrate drop triggers switch
  private readonly CONNECTION_TIMEOUT = 5000; // 5 seconds without connection
  private readonly SWITCH_COOLDOWN = 10000; // 10 seconds between switches (prevent flapping)
  private readonly HEALTH_CHECK_INTERVAL = 2000; // Check health every 2 seconds

  constructor() {
    super();
    this.primaryStats = this.getInitialStats();
    this.redundantStats = this.getInitialStats();
    this.hlsOutputPath = path.join(process.cwd(), 'stream');

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

  async startDualReceiver(config: SRTConfig): Promise<void> {
    if (this.primaryProcess || this.redundantProcess) {
      throw new Error('Dual receiver already running');
    }

    this.currentConfig = { ...config, mode: 'dual-receiver' };
    this.activePath = 'primary';
    this.switchCount = 0;

    // Start primary receiver
    const primaryArgs = this.buildReceiverArgs({
      ...config,
      mode: 'receiver',
      port: config.port,
    }, 'primary');

    this.primaryProcess = spawn('ffmpeg', primaryArgs);
    this.setupProcessHandlers(this.primaryProcess, 'primary');

    // Start redundant receiver
    if (config.redundantPort) {
      const redundantArgs = this.buildReceiverArgs({
        ...config,
        mode: 'receiver',
        port: config.redundantPort,
        passphrase: config.redundantPassphrase || config.passphrase,
        streamId: config.redundantStreamId || config.streamId,
      }, 'redundant');

      this.redundantProcess = spawn('ffmpeg', redundantArgs);
      this.setupProcessHandlers(this.redundantProcess, 'redundant');
    }

    this.startStatsMonitoring();
    this.startHealthMonitoring();

    this.emit('dual-path-started', {
      primary: { port: config.port },
      redundant: { port: config.redundantPort },
    });
  }

  async startSender(config: SRTConfig): Promise<void> {
    if (this.primaryProcess) {
      throw new Error('SRT process already running');
    }

    this.currentConfig = { ...config, mode: 'sender' };
    const args = this.buildSenderArgs(config);
    this.primaryProcess = spawn('ffmpeg', args);
    this.setupProcessHandlers(this.primaryProcess, 'primary');
    this.startStatsMonitoring();
  }

  async startReceiver(config: SRTConfig): Promise<void> {
    if (this.primaryProcess) {
      throw new Error('SRT process already running');
    }

    this.currentConfig = { ...config, mode: 'receiver' };
    const args = this.buildReceiverArgs(config, 'primary');
    this.primaryProcess = spawn('ffmpeg', args);
    this.setupProcessHandlers(this.primaryProcess, 'primary');
    this.startStatsMonitoring();
  }

  private buildSenderArgs(config: SRTConfig): string[] {
    const srtUrl = this.buildSRTUrl(config);
    const args = ['-re'];

    if (config.inputSource) {
      if (config.inputSource.startsWith('http')) {
        args.push('-i', config.inputSource);
      } else if (fs.existsSync(config.inputSource)) {
        args.push('-i', config.inputSource);
      } else {
        throw new Error('Invalid input source');
      }
    } else {
      args.push(
        '-f', 'lavfi',
        '-i', 'testsrc=duration=3600:size=1280x720:rate=30',
        '-f', 'lavfi',
        '-i', 'sine=frequency=1000:duration=3600'
      );
    }

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

  private buildReceiverArgs(config: SRTConfig, pathName: 'primary' | 'redundant'): string[] {
    const srtUrl = this.buildSRTUrl(config);
    const hlsPath = path.join(this.hlsOutputPath, `stream_${pathName}.m3u8`);

    const args = [
      '-i', srtUrl,
      '-c:v', 'copy',
      '-c:a', 'copy',
      '-f', 'hls',
      '-hls_time', '2',
      '-hls_list_size', '3',
      '-hls_flags', 'delete_segments+append_list',
      '-hls_segment_filename', path.join(this.hlsOutputPath, `${pathName}_segment%d.ts`),
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

  private setupProcessHandlers(process: ChildProcess, pathName: 'primary' | 'redundant'): void {
    if (!process) return;

    process.stdout?.on('data', (data) => {
      console.log(`SRT ${pathName} stdout:`, data.toString());
    });

    process.stderr?.on('data', (data) => {
      const output = data.toString();
      console.log(`SRT ${pathName} stderr:`, output);

      this.parseFFmpegOutput(output, pathName);

      if (output.includes('Opening') || output.includes('SRT')) {
        if (pathName === 'primary') {
          this.primaryStats.connected = true;
        } else {
          this.redundantStats.connected = true;
        }
        this.emit('connection', { path: pathName, connected: true });
      }
    });

    process.on('error', (error) => {
      console.error(`SRT ${pathName} process error:`, error);
      this.emit('error', `${pathName}: ${error.message}`);
    });

    process.on('exit', (code, signal) => {
      console.log(`SRT ${pathName} process exited with code ${code}`);
      if (pathName === 'primary') {
        this.primaryStats.connected = false;
      } else {
        this.redundantStats.connected = false;
      }
      this.emit('connection', { path: pathName, connected: false });
    });
  }

  private parseFFmpegOutput(output: string, pathName: 'primary' | 'redundant'): void {
    const stats = pathName === 'primary' ? this.primaryStats : this.redundantStats;

    const bitrateMatch = output.match(/bitrate=\s*(\d+\.?\d*)\s*kbits\/s/);
    if (bitrateMatch) {
      stats.bitrate = parseFloat(bitrateMatch[1]);
    }

    stats.timestamp = Date.now();
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.checkPathHealth();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  private checkPathHealth(): void {
    const primaryHealth = this.calculateHealthScore(this.primaryStats);
    const redundantHealth = this.calculateHealthScore(this.redundantStats);

    // Determine if we should switch
    const shouldSwitch = this.shouldSwitchPaths(primaryHealth, redundantHealth);

    if (shouldSwitch) {
      this.switchActivePath();
    }

    // Emit dual path stats
    const dualStats: DualPathStats = {
      primary: { ...this.primaryStats },
      redundant: { ...this.redundantStats },
      activePath: this.activePath,
      switchCount: this.switchCount,
      lastSwitchTime: this.lastSwitchTime,
      primaryHealth,
      redundantHealth,
    };

    this.emit('dual-stats', dualStats);
  }

  private calculateHealthScore(stats: SRTStats): number {
    let score = 100;

    // Not connected = 0 score
    if (!stats.connected) {
      return 0;
    }

    // Deduct for packet loss
    const total = stats.packets.sent + stats.packets.received;
    if (total > 0) {
      const lossPercent = (stats.packets.lost / total) * 100;
      score -= lossPercent * 20; // Each 1% loss removes 20 points
    }

    // Deduct for low bitrate
    if (stats.bitrate < 500) {
      score -= 30;
    } else if (stats.bitrate < 1000) {
      score -= 15;
    }

    // Deduct for high RTT
    if (stats.rtt > 300) {
      score -= 20;
    } else if (stats.rtt > 150) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private shouldSwitchPaths(primaryHealth: number, redundantHealth: number): boolean {
    // Don't switch if we're in cooldown
    const now = Date.now();
    if (now - this.lastSwitchTime < this.SWITCH_COOLDOWN) {
      return false;
    }

    // Don't switch if we don't have redundant receiver
    if (!this.redundantProcess) {
      return false;
    }

    if (this.activePath === 'primary') {
      // Switch to redundant if primary health is significantly worse
      return redundantHealth > primaryHealth + 20; // 20 point hysteresis
    } else {
      // Switch back to primary if it's significantly better
      return primaryHealth > redundantHealth + 20; // 20 point hysteresis
    }
  }

  private switchActivePath(): void {
    const oldPath = this.activePath;
    this.activePath = this.activePath === 'primary' ? 'redundant' : 'primary';
    this.switchCount++;
    this.lastSwitchTime = Date.now();

    // Switch the HLS stream being served
    const activePath = path.join(this.hlsOutputPath, `stream_${this.activePath}.m3u8`);
    const outputPath = path.join(this.hlsOutputPath, 'stream.m3u8');

    // Create symlink or copy
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    if (fs.existsSync(activePath)) {
      fs.copyFileSync(activePath, outputPath);
    }

    this.emit('path-switched', {
      from: oldPath,
      to: this.activePath,
      switchCount: this.switchCount,
      reason: 'automatic-failover',
      primaryHealth: this.calculateHealthScore(this.primaryStats),
      redundantHealth: this.calculateHealthScore(this.redundantStats),
    });
  }

  private startStatsMonitoring(): void {
    this.statsInterval = setInterval(() => {
      if (this.currentConfig?.mode === 'dual-receiver') {
        // Stats handled by health monitoring
      } else {
        this.emit('stats', this.primaryStats);
      }
    }, 1000);
  }

  async stop(): Promise<void> {
    if (this.primaryProcess) {
      this.primaryProcess.kill('SIGTERM');
      setTimeout(() => {
        if (this.primaryProcess && !this.primaryProcess.killed) {
          this.primaryProcess.kill('SIGKILL');
        }
      }, 5000);
    }

    if (this.redundantProcess) {
      this.redundantProcess.kill('SIGTERM');
      setTimeout(() => {
        if (this.redundantProcess && !this.redundantProcess.killed) {
          this.redundantProcess.kill('SIGKILL');
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

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.primaryProcess = null;
    this.redundantProcess = null;
    this.currentConfig = null;
    this.primaryStats = this.getInitialStats();
    this.redundantStats = this.getInitialStats();
  }

  async getStats(): Promise<SRTStats> {
    return { ...this.primaryStats };
  }

  getDualStats(): DualPathStats {
    return {
      primary: { ...this.primaryStats },
      redundant: { ...this.redundantStats },
      activePath: this.activePath,
      switchCount: this.switchCount,
      lastSwitchTime: this.lastSwitchTime,
      primaryHealth: this.calculateHealthScore(this.primaryStats),
      redundantHealth: this.calculateHealthScore(this.redundantStats),
    };
  }

  getHLSPath(): string {
    return path.join(this.hlsOutputPath, 'stream.m3u8');
  }

  getActivePath(): 'primary' | 'redundant' {
    return this.activePath;
  }
}
