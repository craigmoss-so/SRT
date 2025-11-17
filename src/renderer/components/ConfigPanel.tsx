import React, { useState } from 'react';

interface ConfigPanelProps {
  mode: 'sender' | 'receiver';
  isRunning: boolean;
  onStart: (config: any) => void;
  onStop: () => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ mode, isRunning, onStart, onStop }) => {
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('9000');
  const [latency, setLatency] = useState('200');
  const [passphrase, setPassphrase] = useState('');
  const [streamId, setStreamId] = useState('');
  const [inputSource, setInputSource] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const config = {
      mode,
      host: mode === 'sender' ? host : undefined,
      port: parseInt(port, 10),
      latency: parseInt(latency, 10),
      passphrase: passphrase || undefined,
      streamId: streamId || undefined,
      inputSource: inputSource || undefined,
    };

    onStart(config);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-slate-700/50">
        <h2 className="text-lg font-semibold text-white mb-1">Configuration</h2>
        <p className="text-sm text-slate-400">
          {mode === 'sender' ? 'Configure stream output' : 'Configure stream input'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Host - Only for sender */}
          {mode === 'sender' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Destination Host
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                disabled={isRunning}
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="127.0.0.1"
                required
              />
            </div>
          )}

          {/* Port */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {mode === 'sender' ? 'Destination Port' : 'Listen Port'}
            </label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              disabled={isRunning}
              className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="9000"
              min="1024"
              max="65535"
              required
            />
          </div>

          {/* Latency */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Latency (ms)
            </label>
            <input
              type="number"
              value={latency}
              onChange={(e) => setLatency(e.target.value)}
              disabled={isRunning}
              className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="200"
              min="20"
              max="8000"
            />
            <p className="mt-1 text-xs text-slate-500">Recommended: 200-500ms</p>
          </div>

          {/* Input Source - Only for sender */}
          {mode === 'sender' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Input Source
              </label>
              <input
                type="text"
                value={inputSource}
                onChange={(e) => setInputSource(e.target.value)}
                disabled={isRunning}
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="/path/to/video.mp4 or http://..."
              />
              <p className="mt-1 text-xs text-slate-500">
                Leave empty for test pattern
              </p>
            </div>
          )}

          {/* Advanced Settings */}
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-slate-300 hover:text-white select-none">
              <span className="inline-block group-open:rotate-90 transition-transform mr-2">▶</span>
              Advanced Settings
            </summary>
            <div className="mt-4 space-y-4 pl-6">
              {/* Passphrase */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Passphrase (Encryption)
                </label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  disabled={isRunning}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="Optional encryption key"
                />
                <p className="mt-1 text-xs text-slate-500">
                  10-79 characters for AES encryption
                </p>
              </div>

              {/* Stream ID */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Stream ID
                </label>
                <input
                  type="text"
                  value={streamId}
                  onChange={(e) => setStreamId(e.target.value)}
                  disabled={isRunning}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="Optional stream identifier"
                />
              </div>
            </div>
          </details>
        </form>
      </div>

      {/* Action buttons */}
      <div className="p-6 border-t border-slate-700/50">
        {!isRunning ? (
          <button
            onClick={handleSubmit}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Start {mode === 'sender' ? 'Sending' : 'Receiving'}</span>
          </button>
        ) : (
          <button
            onClick={onStop}
            className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            <span>Stop</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ConfigPanel;
