import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AIAssistantProps {
  stats: any;
  logs: any[];
  connectionInfo: any;
  mode: 'sender' | 'receiver';
  isRunning: boolean;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ stats, logs, connectionInfo, mode, isRunning }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: "Hello! I'm your SRT streaming assistant. I can help you understand your stream metrics, diagnose issues, and answer questions about your connection. Try asking:\n\n• What's my current bitrate?\n• Why is there packet loss?\n• Is my connection healthy?\n• What does RTT mean?",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ollamaAvailable, setOllamaAvailable] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    checkOllamaAvailability();
  }, []);

  const checkOllamaAvailability = async () => {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      setOllamaAvailable(response.ok);
    } catch {
      setOllamaAvailable(false);
    }
  };

  const getContextPrompt = (): string => {
    const context = {
      mode,
      isRunning,
      stats: stats || {},
      connectionInfo: connectionInfo || {},
      recentLogs: logs.slice(-5),
    };

    return `You are an expert SRT (Secure Reliable Transport) streaming assistant helping a broadcast operator monitor and troubleshoot their stream.

Current Stream Context:
- Mode: ${mode}
- Status: ${isRunning ? 'Running' : 'Stopped'}
- Connected: ${stats?.connected ? 'Yes' : 'No'}
- Bitrate: ${stats?.bitrate || 0} kbps
- Packet Loss: ${stats?.packets?.lost || 0} packets
- RTT: ${stats?.rtt || 0} ms
- Packets Sent: ${stats?.packets?.sent || 0}
- Packets Received: ${stats?.packets?.received || 0}
- Retransmitted: ${stats?.packets?.retransmitted || 0}

Recent activity: ${logs.length > 0 ? logs.slice(-3).map(l => l.message).join('; ') : 'None'}

Answer the operator's question concisely and professionally. Focus on actionable insights. If there are issues, suggest solutions.`;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      if (ollamaAvailable) {
        // Use Ollama API
        const response = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama2',
            prompt: `${getContextPrompt()}\n\nOperator: ${input}\n\nAssistant:`,
            stream: false,
          }),
        });

        const data = await response.json();
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response || 'Sorry, I could not process that request.',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // Fallback to rule-based responses
        const answer = getLocalAnswer(input.toLowerCase());
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: answer,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('AI Assistant error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please make sure Ollama is running on localhost:11434.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getLocalAnswer = (query: string): string => {
    // Rule-based fallback when Ollama is not available
    if (query.includes('bitrate')) {
      return `Your current bitrate is ${stats?.bitrate || 0} kbps. ${
        stats?.bitrate > 2000
          ? 'This is a healthy bitrate for HD streaming.'
          : stats?.bitrate > 0
          ? 'This bitrate is relatively low. Consider increasing encoding settings if quality is poor.'
          : 'No active bitrate detected. Make sure your stream is running.'
      }`;
    }

    if (query.includes('packet loss') || query.includes('packets lost')) {
      const lost = stats?.packets?.lost || 0;
      const total = (stats?.packets?.sent || 0) + (stats?.packets?.received || 0);
      const lossPercent = total > 0 ? ((lost / total) * 100).toFixed(2) : '0.00';
      return `You have ${lost} lost packets (${lossPercent}% loss). ${
        parseFloat(lossPercent) > 1
          ? 'This is concerning. Try increasing latency buffer or check network stability.'
          : parseFloat(lossPercent) > 0.1
          ? 'Minimal packet loss detected. Monitor if it increases.'
          : 'Excellent! No significant packet loss.'
      }`;
    }

    if (query.includes('rtt') || query.includes('latency') || query.includes('delay')) {
      const rtt = stats?.rtt || 0;
      return `Your Round Trip Time (RTT) is ${rtt}ms. ${
        rtt < 50
          ? 'Excellent - very low latency.'
          : rtt < 150
          ? 'Good latency for most applications.'
          : 'Relatively high latency. This may affect real-time interaction.'
      }`;
    }

    if (query.includes('connection') || query.includes('connected') || query.includes('status')) {
      return `Your stream is currently ${isRunning ? 'running' : 'stopped'} in ${mode} mode. ${
        stats?.connected
          ? 'Connection is active and healthy.'
          : 'No active connection detected.'
      }`;
    }

    if (query.includes('health') || query.includes('healthy') || query.includes('ok')) {
      const lost = stats?.packets?.lost || 0;
      const total = (stats?.packets?.sent || 0) + (stats?.packets?.received || 0);
      const lossPercent = total > 0 ? (lost / total) * 100 : 0;
      const isHealthy = stats?.connected && lossPercent < 0.5 && (stats?.bitrate || 0) > 500;

      return `Overall stream health: ${
        isHealthy
          ? '✅ HEALTHY - All metrics look good!'
          : '⚠️ NEEDS ATTENTION - Check bitrate and packet loss metrics.'
      }\n\nKey indicators:\n• Connection: ${stats?.connected ? '✅' : '❌'}\n• Bitrate: ${
        (stats?.bitrate || 0) > 500 ? '✅' : '⚠️'
      } ${stats?.bitrate || 0} kbps\n• Packet Loss: ${
        lossPercent < 0.5 ? '✅' : '⚠️'
      } ${lossPercent.toFixed(2)}%`;
    }

    if (query.includes('help') || query.includes('what can you')) {
      return "I can help you with:\n\n• Stream status and health checks\n• Understanding metrics (bitrate, packet loss, RTT)\n• Troubleshooting connection issues\n• Explaining SRT parameters\n• Monitoring recommendations\n\nJust ask me anything about your stream!";
    }

    return `I'm here to help with your SRT stream! Currently running in ${mode} mode. Your stream is ${
      isRunning ? 'active' : 'inactive'
    } with ${stats?.bitrate || 0} kbps bitrate. Try asking specific questions about metrics, connection status, or troubleshooting.`;
  };

  const quickQuestions = [
    "What's my current bitrate?",
    'Is my connection healthy?',
    'Why is there packet loss?',
    'What should I check?',
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-secondary)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">AI Assistant</h3>
              <p className="text-xs text-[var(--color-text-tertiary)]">
                {ollamaAvailable === null
                  ? 'Checking Ollama...'
                  : ollamaAvailable
                  ? 'Powered by Ollama'
                  : 'Local mode (Ollama offline)'}
              </p>
            </div>
          </div>
          <div className={`status-dot ${ollamaAvailable ? 'active' : 'inactive'}`} />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div key={message.id} className={`ai-message ${message.role} p-3 rounded-lg`}>
            <div className="flex items-start space-x-2">
              {message.role === 'assistant' ? (
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              )}
              <div className="flex-1">
                <div className="text-xs text-[var(--color-text-tertiary)] mb-1">
                  {message.role === 'assistant' ? 'AI Assistant' : 'You'} ·{' '}
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
                <div className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="ai-message assistant p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="shimmer h-4 w-4 rounded" />
              <div className="shimmer h-4 flex-1 rounded" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions */}
      {messages.length < 3 && (
        <div className="px-4 pb-2">
          <div className="text-xs text-[var(--color-text-tertiary)] mb-2">Quick questions:</div>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-[var(--color-border)]">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
            placeholder="Ask about your stream..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-white/30 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-white text-black rounded-lg font-medium text-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
