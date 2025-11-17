import React from 'react';

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

interface AlertsPanelProps {
  alerts: Alert[];
  onAcknowledge: (id: string) => void;
  onClearAll: () => void;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, onAcknowledge, onClearAll }) => {
  const activeAlerts = alerts.filter((a) => !a.acknowledged);
  const acknowledgedAlerts = alerts.filter((a) => a.acknowledged);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'success':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'text-[var(--color-error)]';
      case 'warning':
        return 'text-[var(--color-warning)]';
      case 'success':
        return 'text-[var(--color-success)]';
      default:
        return 'text-[var(--color-info)]';
    }
  };

  const getAlertBorder = (type: string) => {
    switch (type) {
      case 'error':
        return 'border-l-[var(--color-error)]';
      case 'warning':
        return 'border-l-[var(--color-warning)]';
      case 'success':
        return 'border-l-[var(--color-success)]';
      default:
        return 'border-l-[var(--color-info)]';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-secondary)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Alerts</h3>
            {activeAlerts.length > 0 && (
              <span className="px-2 py-0.5 bg-[var(--color-error)] text-white text-xs font-medium rounded-full">
                {activeAlerts.length}
              </span>
            )}
          </div>
          {alerts.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Alerts List */}
      <div className="flex-1 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] font-medium">All Clear</p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">No alerts at this time</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {/* Active Alerts */}
            {activeAlerts.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-[var(--color-bg-primary)]">
                  <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                    Active ({activeAlerts.length})
                  </span>
                </div>
                {activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 border-l-4 ${getAlertBorder(
                      alert.type
                    )} hover:bg-white/5 transition-colors animate-slide-up`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`${getAlertColor(alert.type)} flex-shrink-0 mt-0.5`}>
                        {getAlertIcon(alert.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                            {alert.title}
                          </h4>
                          <button
                            onClick={() => onAcknowledge(alert.id)}
                            className="ml-2 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                          >
                            Dismiss
                          </button>
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed mb-2">
                          {alert.message}
                        </p>
                        <span className="text-xs text-[var(--color-text-tertiary)] tabular-nums">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Acknowledged Alerts */}
            {acknowledgedAlerts.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-[var(--color-bg-primary)]">
                  <span className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide">
                    Acknowledged ({acknowledgedAlerts.length})
                  </span>
                </div>
                {acknowledgedAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 opacity-50 hover:opacity-70 transition-opacity"
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`${getAlertColor(alert.type)} flex-shrink-0 mt-0.5`}>
                        {getAlertIcon(alert.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-[var(--color-text-primary)] line-through">
                          {alert.title}
                        </h4>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                          {alert.message}
                        </p>
                        <span className="text-xs text-[var(--color-text-tertiary)] tabular-nums mt-1 block">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsPanel;
