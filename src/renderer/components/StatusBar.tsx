import React from 'react';

interface StatusBarProps {
  isRunning: boolean;
  mode: 'sender' | 'receiver';
  error: string | null;
  onClearError: () => void;
}

const StatusBar: React.FC<StatusBarProps> = ({ isRunning, mode, error, onClearError }) => {
  return (
    <footer className="glass border-t border-slate-700/50 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Status indicator */}
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isRunning ? 'bg-green-500 animate-pulse-slow' : 'bg-slate-600'
              }`}
            />
            <span className="text-sm text-slate-400">
              {isRunning ? (
                <span className="text-green-400 font-medium">
                  {mode === 'sender' ? 'Sending' : 'Receiving'}
                </span>
              ) : (
                'Idle'
              )}
            </span>
          </div>

          {/* Mode indicator */}
          <div className="h-4 w-px bg-slate-700" />
          <span className="text-sm text-slate-400">
            Mode: <span className="text-slate-300 font-medium capitalize">{mode}</span>
          </span>

          {/* Version */}
          <div className="h-4 w-px bg-slate-700" />
          <span className="text-sm text-slate-500">v1.0.0</span>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center space-x-3 bg-red-500/10 border border-red-500/30 px-4 py-2 rounded-lg">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm text-red-300">{error}</span>
            <button
              onClick={onClearError}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Right side info */}
        {!error && (
          <div className="flex items-center space-x-4 text-sm text-slate-500">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>SRT Protocol</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Production Ready</span>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
};

export default StatusBar;
