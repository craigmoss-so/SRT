import { EventEmitter } from 'events';
import * as http from 'http';
import * as https from 'https';

export interface OllamaConfig {
  baseUrl: string; // Default: http://localhost:11434
  model: string;
}

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

export interface StreamMetrics {
  sourceType: 'srt' | 'xstream';
  bitrate: number;
  packetLoss: number;
  rtt: number;
  bandwidth: number;
  connected: boolean;
  timestamp: number;
  packetsReceived?: number;
  packetsSent?: number;
  packetsRetransmitted?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class OllamaService extends EventEmitter {
  private baseUrl: string;
  private currentModel: string | null = null;
  private conversationHistory: ChatMessage[] = [];
  private metricsHistory: StreamMetrics[] = [];
  private readonly MAX_METRICS_HISTORY = 60; // Keep last 60 samples

  constructor(baseUrl: string = 'http://localhost:11434') {
    super();
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Fetch available models from Ollama server
   */
  async getAvailableModels(): Promise<OllamaModel[]> {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.baseUrl}/api/tags`);
      const client = url.protocol === 'https:' ? https : http;

      const req = client.get(url.toString(), (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response.models || []);
          } catch (error) {
            reject(new Error(`Failed to parse Ollama response: ${error}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Failed to connect to Ollama: ${error.message}`));
      });

      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Connection to Ollama timed out'));
      });
    });
  }

  /**
   * Set the active model for chat
   */
  setModel(model: string): void {
    this.currentModel = model;
    this.conversationHistory = []; // Reset conversation when model changes
  }

  /**
   * Get current model
   */
  getModel(): string | null {
    return this.currentModel;
  }

  /**
   * Update metrics history for context
   */
  updateMetrics(metrics: StreamMetrics): void {
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.MAX_METRICS_HISTORY) {
      this.metricsHistory.shift();
    }
  }

  /**
   * Clear metrics history
   */
  clearMetrics(): void {
    this.metricsHistory = [];
  }

  /**
   * Build system prompt with current metrics context
   */
  private buildSystemPrompt(): string {
    const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];
    const avgBitrate = this.metricsHistory.length > 0
      ? this.metricsHistory.reduce((sum, m) => sum + m.bitrate, 0) / this.metricsHistory.length
      : 0;
    const avgPacketLoss = this.metricsHistory.length > 0
      ? this.metricsHistory.reduce((sum, m) => sum + m.packetLoss, 0) / this.metricsHistory.length
      : 0;
    const avgRtt = this.metricsHistory.length > 0
      ? this.metricsHistory.reduce((sum, m) => sum + m.rtt, 0) / this.metricsHistory.length
      : 0;

    return `You are an expert SRT (Secure Reliable Transport) streaming analyst assistant. You help users understand and troubleshoot their video streaming setup.

CURRENT STREAM STATUS:
- Source Type: ${latestMetrics?.sourceType || 'Not connected'}
- Connection: ${latestMetrics?.connected ? 'Connected' : 'Disconnected'}
- Current Bitrate: ${latestMetrics?.bitrate?.toFixed(2) || 0} kbps
- Packet Loss: ${latestMetrics?.packetLoss?.toFixed(2) || 0}%
- Round Trip Time (RTT): ${latestMetrics?.rtt?.toFixed(2) || 0} ms
- Bandwidth: ${latestMetrics?.bandwidth?.toFixed(2) || 0} kbps

AVERAGES (last ${this.metricsHistory.length} samples):
- Avg Bitrate: ${avgBitrate.toFixed(2)} kbps
- Avg Packet Loss: ${avgPacketLoss.toFixed(2)}%
- Avg RTT: ${avgRtt.toFixed(2)} ms

Provide concise, actionable advice. When analyzing issues:
1. Identify the likely cause based on metrics
2. Suggest specific solutions
3. Recommend optimal settings if applicable

For SRT streams, ideal metrics are:
- Packet loss < 0.1%
- RTT < 100ms for most applications
- Stable bitrate matching the configured output`;
  }

  /**
   * Send a chat message and get response (streaming)
   */
  async chat(userMessage: string, onToken?: (token: string) => void): Promise<string> {
    if (!this.currentModel) {
      throw new Error('No model selected. Please select a model first.');
    }

    // Add user message to history
    this.conversationHistory.push({ role: 'user', content: userMessage });

    // Build messages array with system prompt
    const messages: ChatMessage[] = [
      { role: 'system', content: this.buildSystemPrompt() },
      ...this.conversationHistory
    ];

    return new Promise((resolve, reject) => {
      const url = new URL(`${this.baseUrl}/api/chat`);
      const client = url.protocol === 'https:' ? https : http;

      const requestBody = JSON.stringify({
        model: this.currentModel,
        messages: messages,
        stream: true
      });

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const req = client.request(url.toString(), options, (res) => {
        let fullResponse = '';

        res.on('data', (chunk) => {
          const lines = chunk.toString().split('\n').filter((line: string) => line.trim());

          for (const line of lines) {
            try {
              const json = JSON.parse(line);
              if (json.message?.content) {
                fullResponse += json.message.content;
                if (onToken) {
                  onToken(json.message.content);
                }
                this.emit('token', json.message.content);
              }
              if (json.done) {
                // Add assistant response to history
                this.conversationHistory.push({ role: 'assistant', content: fullResponse });
                resolve(fullResponse);
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        });

        res.on('end', () => {
          if (fullResponse) {
            resolve(fullResponse);
          }
        });

        res.on('error', (error) => {
          reject(new Error(`Stream error: ${error.message}`));
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Failed to connect to Ollama: ${error.message}`));
      });

      req.setTimeout(120000, () => {
        req.destroy();
        reject(new Error('Request to Ollama timed out'));
      });

      req.write(requestBody);
      req.end();
    });
  }

  /**
   * Analyze current metrics and provide insights
   */
  async analyzeMetrics(): Promise<string> {
    if (this.metricsHistory.length === 0) {
      return 'No metrics data available. Start a stream to collect metrics.';
    }

    const prompt = `Analyze the current stream metrics and provide a brief health assessment.
Focus on:
1. Overall stream health (Good/Warning/Critical)
2. Any issues detected
3. Recommended actions if needed

Keep the response concise (2-3 sentences max).`;

    return this.chat(prompt);
  }

  /**
   * Analyze specific alert condition
   */
  async analyzeAlert(alertType: string, value: number): Promise<string> {
    const prompts: Record<string, string> = {
      'high_packet_loss': `ALERT: High packet loss detected at ${value.toFixed(2)}%. What could be causing this and how should the user fix it? Be brief.`,
      'low_bitrate': `ALERT: Bitrate dropped to ${value.toFixed(2)} kbps. Analyze potential causes and solutions. Be brief.`,
      'high_rtt': `ALERT: High RTT detected at ${value.toFixed(2)}ms. What does this indicate and how to improve it? Be brief.`,
      'connection_lost': `ALERT: Stream connection was lost. What are common causes and recovery steps? Be brief.`,
      'bandwidth_issue': `ALERT: Bandwidth utilization issue detected. Current: ${value.toFixed(2)} kbps. Analyze and advise. Be brief.`
    };

    const prompt = prompts[alertType] || `ALERT: ${alertType} detected with value ${value}. Analyze and provide recommendations.`;

    return this.chat(prompt);
  }

  /**
   * Clear conversation history
   */
  clearConversation(): void {
    this.conversationHistory = [];
  }

  /**
   * Check if Ollama server is available
   */
  async checkConnection(): Promise<boolean> {
    try {
      await this.getAvailableModels();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update base URL
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, '');
  }
}
