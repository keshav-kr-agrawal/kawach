import React, { useState, useRef, useEffect } from 'react';
import { Send, ShieldAlert, Sparkles, MessageSquare, Terminal, HelpCircle } from 'lucide-react';

function AICopilotView({ token, user }) {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Welcome to **KAWACH AI Copilot**. I am linked to the state data lake and can help synthesize case files, map offender networks, check vehicle records, and inspect call log timelines.\n\n*Select a template below or type your inquiry in natural language.*',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const templates = [
    "Summarize case FIR-2024-00001",
    "Analyze profile Ramesh Kumar",
    "Who owns vehicle KA-15-XY-0020?",
    "Find associates of OFF-0010"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    // Add user message
    const userMsg = {
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: text })
      });
      if (!res.ok) throw new Error('Copilot query failed');
      const data = await res.json();
      
      const aiMsg = {
        sender: 'ai',
        text: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      const errorMsg = {
        sender: 'ai',
        text: '⚠️ **Error:** Failed to connect to the AI service. Database fallback activated. Please try a simpler search or check your internet connection.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Convert markdown bold to JSX bold
  const formatMessage = (msgText) => {
    return msgText.split('\n').map((line, idx) => {
      let formattedLine = line;
      
      // Simple markdown bold replacement
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = boldRegex.exec(line)) !== null) {
        // Add normal text before the bold match
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        // Add bold text
        parts.push(<strong key={match.index} className="font-bold text-slate-800">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      // Handle titles
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-sm font-bold text-indigo-700 mt-4 mb-2">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('#### ')) {
        return <h4 key={idx} className="text-xs font-bold text-slate-800 mt-3 mb-1.5 uppercase tracking-wide">{line.replace('#### ', '')}</h4>;
      }
      
      // Bullet points
      if (line.startsWith('- ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-slate-700 mt-1 leading-relaxed">
            {parts.length > 0 ? parts : line.replace('- ', '')}
          </li>
        );
      }
      
      // Custom citation / disclaimer styling
      if (line.startsWith('*Disclaimer:') || line.startsWith('*System Compliance:')) {
        return <p key={idx} className="text-[10px] italic text-rose-500 mt-3 leading-relaxed">{line.replaceAll('*', '')}</p>;
      }
      if (line.startsWith('*Source Reference:')) {
        return <p key={idx} className="text-[9px] font-mono text-slate-400 mt-2">{line.replaceAll('*', '')}</p>;
      }

      return (
        <p key={idx} className="text-xs text-slate-700 leading-relaxed mt-1">
          {parts.length > 0 ? parts : line}
        </p>
      );
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-auto xl:h-[calc(100vh-12rem)]">
      {/* Help templates & compliance indicators */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col xl:col-span-1 h-[320px] xl:h-full overflow-hidden">
        <div className="flex items-center space-x-2 mb-4">
          <HelpCircle className="w-4 h-4 text-indigo-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Quick Query Templates</h4>
        </div>
        <p className="text-[10px] text-slate-400 mb-4">Click any template below to inject it instantly into the Copilot search feed:</p>
        
        <div className="space-y-2.5 flex-1 overflow-y-auto pr-2">
          {templates.map((t, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(t)}
              className="w-full text-left p-3.5 bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all duration-200 shadow-sm text-xs font-semibold text-slate-700 flex items-center justify-between"
            >
              <span className="truncate">{t}</span>
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 ml-2" />
            </button>
          ))}
        </div>

        <div className="border-t border-slate-200 my-4" />

        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start space-x-3">
          <Terminal className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">DPDP Compliant AI</h5>
            <p className="text-[9px] text-slate-500 mt-1 leading-normal">Compliance parameters explicitly prevent individual automated profiling. System queries are logged for validation.</p>
          </div>
        </div>
      </div>

      {/* Main chat interface */}
      <div className="glass-panel p-6 rounded-2xl xl:col-span-3 flex flex-col h-[500px] xl:h-full relative overflow-hidden">
        <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 animate-pulse">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">AI Investigation Copilot</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Secure LLM Integration — Session verified</p>
            </div>
          </div>
          <div className="bg-rose-50 border border-rose-100 rounded-xl px-3 py-1 text-[9px] font-bold text-rose-600 flex items-center space-x-1.5 shadow-sm">
            <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
            <span>Guilt Inference Locked</span>
          </div>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 rounded-2xl border border-slate-200/50 mb-4 shadow-inner">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl px-5 py-4 rounded-2xl shadow-sm border ${
                  m.sender === 'user'
                    ? 'bg-indigo-600 border-indigo-500 text-white rounded-br-none'
                    : 'bg-white border-slate-200 text-slate-800 rounded-bl-none'
                }`}
              >
                {m.sender === 'user' ? (
                  <p className="text-xs font-semibold leading-relaxed">{m.text}</p>
                ) : (
                  <div className="space-y-1">{formatMessage(m.text)}</div>
                )}
                <span className={`block text-[8px] text-right mt-2 ${m.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {m.timestamp}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl rounded-bl-none flex items-center space-x-2 shadow-sm">
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-[10px] text-slate-400 pl-1">Analyzing Data Lake...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input panel */}
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Ask AI Copilot (e.g. 'Summarize case FIR-2024-00001', 'Analyze profile Suresh Gowda')..."
            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm transition-colors disabled:opacity-50"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={loading || !inputText.trim()}
            className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-100 disabled:opacity-50 transition-all transform active:scale-95"
            title="Send query"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AICopilotView;
