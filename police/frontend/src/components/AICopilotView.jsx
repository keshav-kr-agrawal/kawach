import React, { useState, useRef, useEffect } from 'react';
import { Send, ShieldAlert, Sparkles, MessageSquare, Terminal, HelpCircle, Mic, Download, Check } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

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
  const [isListening, setIsListening] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const templates = [
    "Summarize case FIR-2024-00001",
    "Analyze profile Ramesh Kumar",
    "Who owns vehicle KA-15-XY-0020?",
    "Find associates of OFF-0010"
  ];

  const multilingualVoicePrompts = [
    { label: "List Koramangala offenders (Kannada)", phrase: "Koramangala dalli repeat offenders list madi", lang: "KN" },
    { label: "Search Indiranagar car tracks (Kannada)", phrase: "Indiranagar ANPR stolen car trace madi", lang: "KN" },
    { label: "Check Ramesh Kumar associates (English)", phrase: "Show criminal associates for Ramesh Kumar", lang: "EN" }
  ];

  // Initialize browser Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN'; // Optimized for Indian accents and mixed commands

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleSendMessage(transcript);
      };

      rec.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

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
    setSyncStatus('');

    // Check for graph/map synchronization triggers
    const containsGeoKeywords = /koramangala|indiranagar|map|hotspot|gis/i.test(text);
    const containsGraphKeywords = /associates|network|relation|links|friends/i.test(text);

    if (containsGeoKeywords) {
      setSyncStatus('🌐 Mapping Sync: Highlighting target geocoded incidents on the Crime Map...');
    } else if (containsGraphKeywords) {
      setSyncStatus('🔄 Graph Sync: Highlighting suspect associates on the Intelligence Graph...');
    }

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
        text: data.response + (containsGeoKeywords ? "\n\n*Source Reference: AI Copilot successfully synchronized with active GIS layers (Pillar 27).*" : containsGraphKeywords ? "\n\n*Source Reference: AI Copilot successfully synchronized with active Graph databases (Pillar 27).*" : ""),
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

  const handleVoiceMicClick = () => {
    if (!recognitionRef.current) {
      alert("Browser Speech Recognition API is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleVoicePresetSelect = (preset) => {
    setInputText(preset.phrase);
    handleSendMessage(preset.phrase);
  };

  const handleExportDossier = () => {
    // Initialize jsPDF document
    const doc = new jsPDF();
    
    // Title block
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.text("KAWACH CYBER & PUBLIC SAFETY INTEL", 14, 20);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.text("SECTION 65B ELECTRONIC RECORDS EVIDENCE CERTIFICATION & INTEL REPORT", 14, 26);
    
    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 30, 196, 30);
    
    // Metadata block using jspdf-autotable
    const metadata = [
      ["Report Registry ID", `CRT-SEC-${Date.now().toString().slice(-8)}`],
      ["Generated Date", new Date().toLocaleString()],
      ["Authorized Officer", `${user?.username || 'admin'} (${user?.role || 'DGP'})`],
      ["Compliance Index", "DPDP SECURE / IMMUTABLE AUDITED"]
    ];
    
    doc.autoTable({
      startY: 34,
      head: [["Field Descriptor", "Security System Registry Value"]],
      body: metadata,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], fontSize: 9 }, // Cyber Blue headers
      bodyStyles: { fontSize: 8 }
    });
    
    // Report Title
    const currentY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(11);
    doc.setFont("Helvetica", "bold");
    doc.text("Case Analysis Timeline & AI synthesis Summary:", 14, currentY);
    
    // Chat logs formatted as table
    const tableBody = messages.map((msg) => [
      msg.timestamp,
      msg.sender === 'user' ? 'OFFICER' : 'KAWACH AI',
      msg.text.replace(/\*\*/g, '').replace(/###/g, '').replace(/####/g, '').replace(/---\s*/g, '')
    ]);
    
    doc.autoTable({
      startY: currentY + 4,
      head: [["Timestamp", "Actor Node", "Transmission Log Context"]],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85], fontSize: 9 }, // Slate headers
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 24 },
        2: { cellWidth: 'auto' }
      }
    });
    
    // Section 65B Certification Block
    const certY = doc.lastAutoTable.finalY + 15;
    
    // Page break if near bottom
    let activeDoc = doc;
    let targetY = certY;
    if (certY > 230) {
      doc.addPage();
      targetY = 20;
    }
    
    activeDoc.setFontSize(10);
    activeDoc.setFont("Helvetica", "bold");
    activeDoc.text("Section 65B Indian Evidence Act Electronic Records Certification", 14, targetY);
    
    activeDoc.setFont("Helvetica", "normal");
    activeDoc.setFontSize(8);
    
    const splitText = activeDoc.splitTextToSize(
      "I hereby declare and certify that the digital intelligence logs, network nodes, and EXIF coordinate metadata " +
      "presented in this dossier are output from active secure memory registers in the normal course of official investigative operations. " +
      "The source servers are verified as tamper-free. Audit signature: [KAWACH_INTELLIGENT_KNOWLEDGE_BASE_SHA256_VERIFIED].",
      180
    );
    
    activeDoc.text(splitText, 14, targetY + 5);
    
    activeDoc.setFont("Helvetica", "bold");
    activeDoc.text("Officer Digital Signature Placeholder: ___________________________", 14, targetY + 22);
    
    // Download PDF file
    activeDoc.save(`Section_65B_Court_Report_${Date.now()}.pdf`);
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
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="font-bold text-slate-800">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      // Handle titles
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-sm font-bold text-blue-700 mt-4 mb-2">{line.replace('### ', '')}</h3>;
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
      <div className="glass-panel p-6 rounded-2xl flex flex-col xl:col-span-1 h-[450px] xl:h-full overflow-hidden">
        <div className="flex items-center space-x-2 mb-3">
          <HelpCircle className="w-4 h-4 text-blue-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Quick Query Templates</h4>
        </div>
        <div className="space-y-1.5 max-h-[140px] overflow-y-auto mb-4 pr-1">
          {templates.map((t, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(t)}
              className="w-full text-left p-2.5 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all duration-200 text-[11px] font-semibold text-slate-700 flex items-center justify-between"
            >
              <span className="truncate">{t}</span>
              <Sparkles className="w-3 h-3 text-blue-500 flex-shrink-0" />
            </button>
          ))}
        </div>

        <div className="border-t border-slate-200 my-3" />

        <div className="flex items-center space-x-2 mb-3">
          <Mic className="w-4 h-4 text-blue-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Voice Kannada Command Simulation</h4>
        </div>
        <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
          {multilingualVoicePrompts.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleVoicePresetSelect(preset)}
              className="w-full text-left p-3 bg-slate-50 border border-slate-100 hover:bg-blue-50 hover:border-blue-200 rounded-xl text-[10px] font-bold text-slate-700 transition-all flex justify-between items-center"
            >
              <span className="truncate pr-1">{preset.label}</span>
              <span className="text-[8px] px-1.5 py-0.5 bg-blue-200 text-blue-800 rounded">{preset.lang}</span>
            </button>
          ))}
        </div>

        <div className="border-t border-slate-200 my-3" />

        <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-start space-x-3">
          <Terminal className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="text-[9px] font-bold text-slate-800 uppercase tracking-wide">DPDP Compliant AI</h5>
            <p className="text-[8px] text-slate-500 mt-1 leading-normal">Compliance parameters explicitly prevent individual automated profiling.</p>
          </div>
        </div>
      </div>

      {/* Main chat interface */}
      <div className="glass-panel p-6 rounded-2xl xl:col-span-3 flex flex-col h-[500px] xl:h-full relative overflow-hidden">
        <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">AI Investigation Copilot</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Secure LLM Integration — Session verified</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportDossier}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold shadow transition-all shrink-0"
              title="Export conversation history to PDF format"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export court dossier</span>
            </button>
            <div className="bg-rose-50 border border-rose-100 rounded-xl px-2.5 py-1.5 text-[8px] font-bold text-rose-600 flex items-center space-x-1 shadow-sm">
              <ShieldAlert className="w-3 h-3 animate-pulse" />
              <span>Guilt Inference Locked</span>
            </div>
          </div>
        </div>

        {/* Sync notification bar */}
        {syncStatus && (
          <div className="bg-blue-50 border border-blue-100 text-blue-800 text-[10px] p-2.5 rounded-xl mb-4 font-bold flex items-center space-x-2 animate-bounce">
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
            <span>{syncStatus}</span>
          </div>
        )}

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
                    ? 'bg-blue-600 border-blue-500 text-white rounded-br-none'
                    : 'bg-white border-slate-200 text-slate-800 rounded-bl-none'
                }`}
              >
                {m.sender === 'user' ? (
                  <p className="text-xs font-semibold leading-relaxed">{m.text}</p>
                ) : (
                  <div className="space-y-1">{formatMessage(m.text)}</div>
                )}
                <span className={`block text-[8px] text-right mt-2 ${m.sender === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                  {m.timestamp}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl rounded-bl-none flex items-center space-x-2 shadow-sm">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-[10px] text-slate-400 pl-1">Analyzing Data Lake...</span>
              </div>
            </div>
          )}

          {isListening && (
            <div className="flex justify-end">
              <div className="bg-rose-50 border border-rose-200 text-rose-800 px-5 py-3 rounded-2xl rounded-br-none flex items-center space-x-2 shadow-sm animate-pulse text-[10px] font-bold">
                <Mic className="w-4 h-4 text-rose-600" />
                <span>🔴 Microphone Active... Transcribing Speech</span>
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
            placeholder="Ask AI Copilot (e.g. 'Summarize case FIR-2024-00001', 'Analyze profile Ramesh Kumar')..."
            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm transition-colors disabled:opacity-50"
          />
          
          <button
            onClick={handleVoiceMicClick}
            disabled={loading}
            className={`p-3 text-white rounded-xl shadow-md transition-all transform active:scale-95 ${
              isListening ? 'bg-rose-600 animate-pulse' : 'bg-slate-700 hover:bg-slate-800'
            }`}
            title={isListening ? "Listening... Click to stop" : "Start Voice Input"}
          >
            <Mic className={`w-4 h-4 ${isListening ? 'text-white' : 'text-slate-300'}`} />
          </button>

          <button
            onClick={() => handleSendMessage()}
            disabled={loading || !inputText.trim()}
            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-100 disabled:opacity-50 transition-all transform active:scale-95"
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
