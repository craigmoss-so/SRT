import React, { useState, useEffect } from 'react';
import ConfigPanel from './components/ConfigPanel';
import VideoPlayer from './components/VideoPlayer';
import StatsPanel from './components/StatsPanel';
import StatusBar from './components/StatusBar';

type Mode = 'sender' | 'receiver';

interface SRTStats {
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

function App() {
  const [mode, setMode] = useState<Mode>('receiver');
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<SRTStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<any>(null);

  useEffect(() => {
    // Set up event listeners
    window.electronAPI.onStats((newStats) => {
      setStats(newStats);
    });

    window.electronAPI.onError((errorMsg) => {
      setError(errorMsg);
      setIsRunning(false);
    });

    window.electronAPI.onConnection((info) => {
      setConnectionInfo(info);
    });

    return () => {
      // Cleanup listeners
      window.electronAPI.removeAllListeners('srt:stats');
      window.electronAPI.removeAllListeners('srt:error');
      window.electronAPI.removeAllListeners('srt:connection');
    };
  }, []);

  const handleStart = async (config: any) => {
    setError(null);

    try {
      let result;
      if (mode === 'sender') {
        result = await window.electronAPI.startSender(config);
      } else {
        result = await window.electronAPI.startReceiver(config);
      }

      if (result.success) {
        setIsRunning(true);
      } else {
        setError(result.error || 'Unknown error');
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleStop = async () => {
    try {
      const result = await window.electronAPI.stop();
      if (result.success) {
        setIsRunning(false);
        setStats(null);
        setConnectionInfo(null);
      } else {
        setError(result.error || 'Failed to stop');
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="glass border-b border-slate-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">SRT Stream</h1>
              <p className="text-sm text-slate-400">Professional Video Transport</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex bg-slate-800/50 rounded-lg p-1">
              <button
                onClick={() => !isRunning && setMode('sender')}
                disabled={isRunning}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === 'sender'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Sender
              </button>
              <button
                onClick={() => !isRunning && setMode('receiver')}
                disabled={isRunning}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === 'receiver'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Receiver
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left panel - Config */}
        <div className="w-96 glass border-r border-slate-700/50 flex flex-col">
          <ConfigPanel
            mode={mode}
            isRunning={isRunning}
            onStart={handleStart}
            onStop={handleStop}
          />
        </div>

        {/* Center - Video player (for receiver mode) */}
        <div className="flex-1 flex flex-col">
          {mode === 'receiver' && isRunning ? (
            <VideoPlayer />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl flex items-center justify-center">
                  <svg className="w-16 h-16 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {mode === 'sender' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    )}
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-slate-300 mb-2">
                  {mode === 'sender' ? 'Ready to Send' : 'Ready to Receive'}
                </h2>
                <p className="text-slate-500">
                  {mode === 'sender'
                    ? 'Configure your stream and click Start to begin sending'
                    : 'Configure your receiver and click Start to begin receiving'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right panel - Stats */}
        <div className="w-80 glass border-l border-slate-700/50">
          <StatsPanel stats={stats} connectionInfo={connectionInfo} />
        </div>
      </main>

      {/* Status bar */}
      <StatusBar
        isRunning={isRunning}
        mode={mode}
        error={error}
        onClearError={() => setError(null)}
      />
    </div>
  );
}

export default App;
