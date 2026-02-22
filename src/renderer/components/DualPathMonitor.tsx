import React from 'react';

interface DualPathStats {
  primary: {
    bitrate: number;
    packets: {
      sent: number;
      received: number;
      lost: number;
      retransmitted: number;
    };
    rtt: number;
    connected: boolean;
  };
  redundant: {
    bitrate: number;
    packets: {
      sent: number;
      received: number;
      lost: number;
      retransmitted: number;
    };
    rtt: number;
    connected: boolean;
  };
  activePath: 'primary' | 'redundant';
  switchCount: number;
  lastSwitchTime: number;
  primaryHealth: number;
  redundantHealth: number;
}

interface DualPathMonitorProps {
  dualStats: DualPathStats | null;
}

const DualPathMonitor: React.FC<DualPathMonitorProps> = ({ dualStats }) => {
  if (!dualStats) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-tertiary)] text-sm">
        No dual-path data available
      </div>
    );
  }

  const getHealthColor = (health: number) => {
    if (health >= 80) return 'text-[var(--color-success)]';
    if (health >= 50) return 'text-[var(--color-warning)]';
    return 'text-[var(--color-error)]';
  };

  const getHealthBg = (health: number) => {
    if (health >= 80) return 'bg-[var(--color-success)]';
    if (health >= 50) return 'bg-[var(--color-warning)]';
    return 'bg-[var(--color-error)]';
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(0);
  };

  const calculatePacketLoss = (packets: any): string => {
    const total = packets.sent + packets.received;
    if (total === 0) return '0.00';
    return ((packets.lost / total) * 100).toFixed(2);
  };

  const renderPathCard = (
    pathName: 'primary' | 'redundant',
    stats: any,
    health: number,
    isActive: boolean
  ) => (
    <div
      className={`metric-card rounded-lg p-4 relative ${
        isActive ? 'ring-2 ring-white/30' : ''
      }`}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-2 right-2">
          <div className="flex items-center space-x-1.5 bg-white/10 px-2 py-1 rounded-full">
            <div className="status-dot active animate-pulse-glow" />
            <span className="text-xs font-medium text-white">ACTIVE</span>
          </div>
        </div>
      )}

      {/* Path header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            {pathName}
          </h3>
          <div className={`status-dot ${stats.connected ? 'active' : 'inactive'}`} />
        </div>
      </div>

      {/* Health score */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs text-[var(--color-text-tertiary)]">Health Score</span>
          <span className={`metric-value text-2xl font-bold ${getHealthColor(health)}`}>
            {health}
          </span>
        </div>
        <div className="h-2 bg-[var(--color-bg-primary)] rounded-full overflow-hidden">
          <div
            className={`h-full ${getHealthBg(health)} transition-all duration-500`}
            style={{ width: `${health}%` }}
          />
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-[var(--color-text-tertiary)] mb-1">Bitrate</div>
          <div className="metric-value text-sm font-semibold text-white">
            {stats.bitrate >= 1000
              ? (stats.bitrate / 1000).toFixed(2) + ' Mbps'
              : stats.bitrate.toFixed(0) + ' kbps'}
          </div>
        </div>
        <div>
          <div className="text-xs text-[var(--color-text-tertiary)] mb-1">RTT</div>
          <div className="metric-value text-sm font-semibold text-white">
            {stats.rtt.toFixed(0)} ms
          </div>
        </div>
        <div>
          <div className="text-xs text-[var(--color-text-tertiary)] mb-1">Packet Loss</div>
          <div className="metric-value text-sm font-semibold text-[var(--color-error)]">
            {calculatePacketLoss(stats.packets)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-[var(--color-text-tertiary)] mb-1">Received</div>
          <div className="metric-value text-sm font-semibold text-white">
            {formatNumber(stats.packets.received)}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-secondary)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Dual Path Monitor</h3>
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)]">
            Auto Failover Active
          </div>
        </div>
      </div>

      {/* Path cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {renderPathCard('primary', dualStats.primary, dualStats.primaryHealth, dualStats.activePath === 'primary')}
        {renderPathCard('redundant', dualStats.redundant, dualStats.redundantHealth, dualStats.activePath === 'redundant')}

        {/* Switch history */}
        {dualStats.switchCount > 0 && (
          <div className="metric-card rounded-lg p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)] mb-3">
              Failover History
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[var(--color-text-tertiary)]">Total Switches</span>
                <span className="metric-value text-sm font-semibold text-white">
                  {dualStats.switchCount}
                </span>
              </div>
              {dualStats.lastSwitchTime > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--color-text-tertiary)]">Last Switch</span>
                  <span className="text-xs text-white tabular-nums">
                    {new Date(dualStats.lastSwitchTime).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Failover info */}
        <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-[var(--color-info)] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h5 className="text-xs font-semibold text-white mb-1">Automatic Failover</h5>
              <p className="text-xs text-[var(--color-text-tertiary)] leading-relaxed">
                System automatically switches to redundant path if primary health drops 20+ points.
                Includes 10-second cooldown to prevent flapping.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DualPathMonitor;
