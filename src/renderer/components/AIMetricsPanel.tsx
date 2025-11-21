import React, { useState, useEffect, useRef, useCallback } from 'react';

interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface StreamMetrics {
  sourceType: 'srt' | 'xstream';
  bitrate: number;
  packetLoss: number;
  rtt: number;
  bandwidth: number;
  connected: boolean;
}

interface AIMetricsPanelProps {
  metrics: StreamMetrics | null;
  isStreamRunning: boolean;
  onAlertAnalysis?: (alertType: string, value: number) => void;
}

const AIMetricsPanel: React.FC<AIMetricsPanelProps> = ({
  metrics,
  isStreamRunning,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingResponse, scrollToBottom]);

  // Check Ollama connection on mount
  useEffect(() => {
    checkConnection();
  }, []);

  // Update metrics in Ollama service when they change
  useEffect(() => {
    if (metrics && window.electronAPI?.ollama) {
      window.electronAPI.ollama.updateMetrics({
        ...metrics,
        timestamp: Date.now(),
      });
    }
  }, [metrics]);

  // Set up token streaming listener
  useEffect(() => {
    if (window.electronAPI?.ollama) {
      window.electronAPI.ollama.onToken((token: string) => {
        setStreamingResponse((prev) => prev + token);
      });

      return () => {
        window.electronAPI.ollama.removeTokenListener();
      };
    }
  }, []);

  const checkConnection = async () => {
    try {
      const result = await window.electronAPI.ollama.checkConnection();
      setIsConnected(result.success && result.connected);
      if (result.success && result.connected) {
        fetchModels();
      }
    } catch {
      setIsConnected(false);
    }
  };

  const fetchModels = async () => {
    try {
      const result = await window.electronAPI.ollama.getModels();
      if (result.success && result.models) {
        setModels(result.models);
        // Auto-select first model if none selected
        if (!selectedModel && result.models.length > 0) {
          const firstModel = result.models[0].name;
          setSelectedModel(firstModel);
          await window.electronAPI.ollama.setModel(firstModel);
        }
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    }
  };

  const handleModelChange = async (model: string) => {
    setSelectedModel(model);
    await window.electronAPI.ollama.setModel(model);
    // Clear conversation when model changes
    setMessages([]);
    await window.electronAPI.ollama.clearConversation();
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !selectedModel) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setStreamingResponse('');

    try {
      const result = await window.electronAPI.ollama.chat(userMessage.content);
      if (result.success) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.response,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `Error: ${result.error}`,
            timestamp: Date.now(),
          },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error: ${error}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setStreamingResponse('');
    }
  };

  const handleAnalyzeMetrics = async () => {
    if (!selectedModel || isLoading) return;

    setIsLoading(true);
    setStreamingResponse('');

    try {
      const result = await window.electronAPI.ollama.analyzeMetrics();
      if (result.success) {
        const analysisMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: result.analysis,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, analysisMessage]);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsLoading(false);
      setStreamingResponse('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleUpdateUrl = async () => {
    await window.electronAPI.ollama.setBaseUrl(ollamaUrl);
    checkConnection();
    setShowSettings(false);
  };

  const formatSize = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-secondary)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm font-medium text-white">
              Ollama {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 text-[var(--color-text-tertiary)] hover:text-white transition-colors"
            title="Settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-3 p-3 bg-[var(--color-bg-primary)] rounded border border-[var(--color-border)]">
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
              Ollama Server URL
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded text-white text-sm focus:outline-none focus:border-white/30"
                placeholder="http://localhost:11434"
              />
              <button
                onClick={handleUpdateUrl}
                className="px-3 py-1.5 bg-white/10 text-white text-sm rounded hover:bg-white/20 transition-colors"
              >
                Connect
              </button>
            </div>
          </div>
        )}

        {/* Model Selector */}
        {isConnected && (
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-2">
              Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-white text-sm focus:outline-none focus:border-white/30"
            >
              <option value="">Select a model...</option>
              {models.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name} ({formatSize(model.size)})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Quick Actions */}
        {isConnected && selectedModel && (
          <div className="mt-3 flex space-x-2">
            <button
              onClick={handleAnalyzeMetrics}
              disabled={isLoading || !isStreamRunning}
              className="flex-1 px-3 py-2 bg-white/10 text-white text-sm rounded hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Analyze Stream</span>
            </button>
            <button
              onClick={() => {
                setMessages([]);
                window.electronAPI.ollama.clearConversation();
              }}
              className="px-3 py-2 text-[var(--color-text-tertiary)] hover:text-white text-sm transition-colors"
              title="Clear conversation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg className="w-12 h-12 text-[var(--color-text-tertiary)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[var(--color-text-secondary)] mb-2">Cannot connect to Ollama</p>
            <p className="text-xs text-[var(--color-text-tertiary)]">
              Make sure Ollama is running at {ollamaUrl}
            </p>
            <button
              onClick={checkConnection}
              className="mt-4 px-4 py-2 bg-white/10 text-white text-sm rounded hover:bg-white/20 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : !selectedModel ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg className="w-12 h-12 text-[var(--color-text-tertiary)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-[var(--color-text-secondary)]">Select a model to start</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg className="w-12 h-12 text-[var(--color-text-tertiary)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-[var(--color-text-secondary)] mb-2">AI Stream Analyst</p>
            <p className="text-xs text-[var(--color-text-tertiary)]">
              Ask questions about your stream metrics or click "Analyze Stream"
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-white text-black rounded-br-md'
                      : 'bg-[var(--color-bg-primary)] text-white border border-[var(--color-border)] rounded-bl-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && streamingResponse && (
              <div className="flex justify-start">
                <div className="max-w-[85%] px-4 py-2.5 rounded-2xl bg-[var(--color-bg-primary)] text-white border border-[var(--color-border)] rounded-bl-md">
                  <p className="text-sm whitespace-pre-wrap">{streamingResponse}</p>
                </div>
              </div>
            )}
            {isLoading && !streamingResponse && (
              <div className="flex justify-start">
                <div className="px-4 py-2.5 rounded-2xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-bl-md">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      {isConnected && selectedModel && (
        <div className="p-4 border-t border-[var(--color-border)]">
          <div className="flex space-x-2">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask about your stream metrics..."
              disabled={isLoading}
              rows={1}
              className="flex-1 px-4 py-2.5 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl text-white text-sm placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-white/30 disabled:opacity-50 resize-none"
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="px-4 py-2.5 bg-white text-black rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIMetricsPanel;
