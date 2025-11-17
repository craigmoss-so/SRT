import React from 'react';

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

interface StatsPanelProps {
  stats: SRTStats | null;
  connectionInfo: any;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, connectionInfo }) => {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(0);
  };

  const formatBitrate = (kbps: number): string => {
    if (kbps >= 1000) {
      return (kbps / 1000).toFixed(2) + ' Mbps';
    }
    return kbps.toFixed(0) + ' kbps';
  };

  const calculatePacketLoss = (): string => {
    if (!stats || !stats.packets) return '0.00';
    const total = stats.packets.sent || stats.packets.received || 0;
    if (total === 0) return '0.00';
    const lossPercent = (stats.packets.lost / total) * 100;
    return lossPercent.toFixed(2);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-slate-700/50">
        <h2 className="text-lg font-semibold text-white mb-1">Statistics</h2>
        <p className="text-sm text-slate-400">Real-time stream metrics</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Connection Status */}
        <div className="glass rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-300">Connection</h3>
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  stats?.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}
              />
              <span className={`text-sm font-medium ${
                stats?.connected ? 'text-green-400' : 'text-red-400'
              }`}>
                {stats?.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* Bitrate */}
        {stats && (
          <>
            <div className="glass rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-300">Bitrate</h3>
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-white">
                {formatBitrate(stats.bitrate)}
              </div>
              <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
                  style={{ width: `${Math.min((stats.bitrate / 5000) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Packets */}
            <div className="glass rounded-lg p-4">
              <h3 className="text-sm font-medium text-slate-300 mb-3">Packets</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Sent</span>
                  <span className="text-sm font-medium text-white">
                    {formatNumber(stats.packets.sent)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Received</span>
                  <span className="text-sm font-medium text-white">
                    {formatNumber(stats.packets.received)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Lost</span>
                  <span className="text-sm font-medium text-red-400">
                    {formatNumber(stats.packets.lost)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Retransmitted</span>
                  <span className="text-sm font-medium text-yellow-400">
                    {formatNumber(stats.packets.retransmitted)}
                  </span>
                </div>
              </div>
            </div>

            {/* Packet Loss */}
            <div className="glass rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-300">Packet Loss</h3>
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-white">
                {calculatePacketLoss()}%
              </div>
            </div>

            {/* RTT */}
            <div className="glass rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-slate-300">Round Trip Time</h3>
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-white">
                {stats.rtt.toFixed(1)} ms
              </div>
            </div>
          </>
        )}

        {/* No data message */}
        {!stats && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-800/50 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-slate-500 text-sm">No stream data yet</p>
            <p className="text-slate-600 text-xs mt-1">Start streaming to see statistics</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsPanel;
