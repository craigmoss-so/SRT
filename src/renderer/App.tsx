import React, { useState, useEffect, useCallback } from 'react';
import ConfigPanel from './components/ConfigPanel';
import VideoPlayer from './components/VideoPlayer';
import StatsPanel from './components/StatsPanel';
import StatusBar from './components/StatusBar';
import DebugConsole, { LogEntry } from './components/DebugConsole';
import MetricsGraph from './components/MetricsGraph';
import AIAssistant from './components/AIAssistant';
import AlertsPanel, { Alert } from './components/AlertsPanel';

type Mode = 'sender' | 'receiver';
type MonitorTab = 'stats' | 'graphs' | 'logs' | 'alerts' | 'ai';

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
  const [activeTab, setActiveTab] = useState<MonitorTab>('stats');

  // Logs state
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Metrics history for graphs
  const [bitrateHistory, setBitrateHistory] = useState<number[]>([]);
  const [packetLossHistory, setPacketLossHistory] = useState<number[]>([]);
  const [rttHistory, setRttHistory] = useState<number[]>([]);

  // Alerts state
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const addLog = useCallback((level: LogEntry['level'], message: string, category?: string) => {
    const log: LogEntry = {
      id: Date.now().toString() + Math.random(),
      timestamp: Date.now(),
      level,
      message,
      category,
    };
    setLogs((prev) => [...prev, log].slice(-200)); // Keep last 200 logs
  }, []);

  const addAlert = useCallback((type: Alert['type'], title: string, message: string) => {
    const alert: Alert = {
      id: Date.now().toString() + Math.random(),
      type,
      title,
      message,
      timestamp: Date.now(),
      acknowledged: false,
    };
    setAlerts((prev) => [alert, ...prev]);
  }, []);

  useEffect(() => {
    addLog('info', 'Application started', 'System');

    // Set up event listeners
    window.electronAPI.onStats((newStats) => {
      setStats(newStats);

      // Update metrics history
      setBitrateHistory((prev) => [...prev, newStats.bitrate].slice(-60));
      const lossPercent =
        (newStats.packets.sent + newStats.packets.received) > 0
          ? (newStats.packets.lost / (newStats.packets.sent + newStats.packets.received)) * 100
          : 0;
      setPacketLossHistory((prev) => [...prev, lossPercent].slice(-60));
      setRttHistory((prev) => [...prev, newStats.rtt].slice(-60));

      // Check for alerts
      if (lossPercent > 1 && newStats.connected) {
        const existingAlert = alerts.find(
          (a) => a.title === 'High Packet Loss' && !a.acknowledged
        );
        if (!existingAlert) {
          addAlert(
            'warning',
            'High Packet Loss',
            `Packet loss is at ${lossPercent.toFixed(2)}%. Consider increasing latency buffer.`
          );
        }
      }

      if (newStats.bitrate < 500 && newStats.connected && isRunning) {
        const existingAlert = alerts.find(
          (a) => a.title === 'Low Bitrate' && !a.acknowledged
        );
        if (!existingAlert) {
          addAlert(
            'warning',
            'Low Bitrate',
            `Bitrate dropped to ${newStats.bitrate} kbps. Check network connection.`
          );
        }
      }
    });

    window.electronAPI.onError((errorMsg) => {
      setError(errorMsg);
      setIsRunning(false);
      addLog('error', errorMsg, 'SRT');
      addAlert('error', 'Stream Error', errorMsg);
    });

    window.electronAPI.onConnection((info) => {
      setConnectionInfo(info);
      if (info.connected) {
        addLog('success', 'Connection established', 'SRT');
        addAlert('success', 'Connected', 'SRT connection established successfully');
      } else {
        addLog('warning', 'Connection lost', 'SRT');
        addAlert('warning', 'Disconnected', 'SRT connection was lost');
      }
    });

    return () => {
      window.electronAPI.removeAllListeners('srt:stats');
      window.electronAPI.removeAllListeners('srt:error');
      window.electronAPI.removeAllListeners('srt:connection');
    };
  }, [addLog, addAlert, isRunning, alerts]);

  const handleStart = async (config: any) => {
    setError(null);
    addLog('info', `Starting ${mode} mode...`, 'SRT');

    try {
      let result;
      if (mode === 'sender') {
        result = await window.electronAPI.startSender(config);
      } else {
        result = await window.electronAPI.startReceiver(config);
      }

      if (result.success) {
        setIsRunning(true);
        addLog('success', `${mode} started successfully`, 'SRT');
      } else {
        setError(result.error || 'Unknown error');
        addLog('error', result.error || 'Unknown error', 'SRT');
      }
    } catch (err) {
      setError((err as Error).message);
      addLog('error', (err as Error).message, 'SRT');
    }
  };

  const handleStop = async () => {
    addLog('info', 'Stopping stream...', 'SRT');
    try {
      const result = await window.electronAPI.stop();
      if (result.success) {
        setIsRunning(false);
        setStats(null);
        setConnectionInfo(null);
        setBitrateHistory([]);
        setPacketLossHistory([]);
        setRttHistory([]);
        addLog('success', 'Stream stopped', 'SRT');
      } else {
        setError(result.error || 'Failed to stop');
        addLog('error', result.error || 'Failed to stop', 'SRT');
      }
    } catch (err) {
      setError((err as Error).message);
      addLog('error', (err as Error).message, 'SRT');
    }
  };

  const tabs: { id: MonitorTab; label: string; icon: JSX.Element }[] = [
    {
      id: 'stats',
      label: 'Statistics',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'graphs',
      label: 'Metrics',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      ),
    },
    {
      id: 'logs',
      label: 'Logs',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    {
      id: 'ai',
      label: 'AI Assistant',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
  ];

  const activeAlertCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg-primary)]">
      {/* Header */}
      <header className="glass border-b border-[var(--color-border)] px-6 py-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-white to-gray-300 rounded flex items-center justify-center">
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">SRT Stream</h1>
              <p className="text-xs text-[var(--color-text-tertiary)]">Professional Transport Protocol</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex bg-[var(--color-bg-secondary)] rounded-lg p-1 border border-[var(--color-border)]">
              <button
                onClick={() => !isRunning && setMode('sender')}
                disabled={isRunning}
                className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                  mode === 'sender'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-[var(--color-text-secondary)] hover:text-white'
                } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Sender
              </button>
              <button
                onClick={() => !isRunning && setMode('receiver')}
                disabled={isRunning}
                className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                  mode === 'receiver'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-[var(--color-text-secondary)] hover:text-white'
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
        <div className="w-80 glass border-r border-[var(--color-border)] flex flex-col">
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
            <div className="flex-1 flex items-center justify-center bg-black">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-6 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl flex items-center justify-center">
                  <svg className="w-16 h-16 text-[var(--color-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {mode === 'sender' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    )}
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-[var(--color-text-secondary)] mb-2">
                  {mode === 'sender' ? 'Ready to Send' : 'Ready to Receive'}
                </h2>
                <p className="text-[var(--color-text-tertiary)] text-sm">
                  {mode === 'sender'
                    ? 'Configure your stream and click Start to begin sending'
                    : 'Configure your receiver and click Start to begin receiving'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right panel - Monitoring */}
        <div className="w-96 glass border-l border-[var(--color-border)] flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-3 py-3 text-xs font-medium transition-all relative ${
                  activeTab === tab.id
                    ? 'text-white bg-[var(--color-bg-primary)]'
                    : 'text-[var(--color-text-tertiary)] hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-center space-x-1.5">
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.id === 'alerts' && activeAlertCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-[var(--color-error)] text-white text-xs rounded-full">
                      {activeAlertCount}
                    </span>
                  )}
                </div>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'stats' && (
              <StatsPanel stats={stats} connectionInfo={connectionInfo} />
            )}
            {activeTab === 'graphs' && (
              <div className="p-4 space-y-4 overflow-y-auto h-full bg-[var(--color-bg-secondary)]">
                <MetricsGraph
                  data={bitrateHistory}
                  label="Bitrate"
                  color="#4ade80"
                  max={5000}
                  unit=" kbps"
                />
                <MetricsGraph
                  data={packetLossHistory}
                  label="Packet Loss"
                  color="#ef4444"
                  max={5}
                  unit="%"
                />
                <MetricsGraph
                  data={rttHistory}
                  label="Round Trip Time"
                  color="#60a5fa"
                  max={500}
                  unit=" ms"
                />
              </div>
            )}
            {activeTab === 'logs' && (
              <DebugConsole
                logs={logs}
                onClear={() => {
                  setLogs([]);
                  addLog('info', 'Logs cleared', 'System');
                }}
              />
            )}
            {activeTab === 'alerts' && (
              <AlertsPanel
                alerts={alerts}
                onAcknowledge={(id) =>
                  setAlerts((prev) =>
                    prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
                  )
                }
                onClearAll={() => setAlerts([])}
              />
            )}
            {activeTab === 'ai' && (
              <AIAssistant
                stats={stats}
                logs={logs}
                connectionInfo={connectionInfo}
                mode={mode}
                isRunning={isRunning}
              />
            )}
          </div>
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
