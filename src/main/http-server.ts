import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

export class SimpleHTTPServer {
  private server: http.Server | null = null;
  private port: number;
  private streamDir: string;

  constructor(port: number = 8080, streamDir: string) {
    this.port = port;
    this.streamDir = streamDir;
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        if (!req.url || req.url === '/') {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }

        // Remove query parameters and decode URI
        const urlPath = decodeURIComponent(req.url.split('?')[0]);

        // Serve files from the stream directory
        const filePath = path.join(this.streamDir, urlPath.replace('/stream/', ''));

        // Check if file exists
        if (!fs.existsSync(filePath)) {
          res.writeHead(404);
          res.end('File not found');
          return;
        }

        // Determine content type
        const ext = path.extname(filePath);
        let contentType = 'application/octet-stream';

        if (ext === '.m3u8') {
          contentType = 'application/vnd.apple.mpegurl';
        } else if (ext === '.ts') {
          contentType = 'video/mp2t';
        }

        // Read and serve the file
        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(500);
            res.end('Error reading file');
            return;
          }

          res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': data.length,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          });
          res.end(data);
        });
      });

      this.server.on('error', (err) => {
        console.error('HTTP server error:', err);
        reject(err);
      });

      this.server.listen(this.port, () => {
        console.log(`HTTP server running on port ${this.port}`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('HTTP server stopped');
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getPort(): number {
    return this.port;
  }
}
