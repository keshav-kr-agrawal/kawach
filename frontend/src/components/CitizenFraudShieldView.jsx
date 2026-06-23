import React, { useState } from 'react';
import { Shield, Send, CheckCircle2, AlertTriangle, FileText, Copy, Smartphone, Search, AlertCircle, ShieldAlert, Check } from 'lucide-react';

function CitizenFraudShieldView({ token, user }) {
  // Scanner States
  const [scanType, setScanType] = useState('phone'); // phone, upi, link
  const [scanValue, setScanValue] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);

  // WhatsApp Bot Simulator States
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'bot',
      text: '🤖 *KAWACH Citizen Fraud Shield Bot* (Verified)\n\nWelcome! Forward any suspicious phone number, UPI ID, bank account, or "CBI/Police" video call links to check if they match known criminal nodes or mule registries in the state data lake.\n\n*Try forwarding an inquiry below!*',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [botTyping, setBotTyping] = useState(false);

  const simulatePrompts = [
    { label: "Check Phone: +91-9844000010", type: "phone", value: "+91-9844000010" },
    { label: "Scan UPI: muleaccount@upi", type: "upi", value: "muleaccount@upi" },
    { label: "Verify Link: cbi-court-login.verify.in", type: "link", value: "https://cbi-court-login.verify.in/lock" }
  ];

  const handleScan = async (type = scanType, value = scanValue) => {
    const val = value || scanValue;
    if (!val.trim()) return;

    setScanning(true);
    setScanResult(null);

    try {
      const res = await fetch('http://localhost:8000/api/fraud-shield/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: type, value: val })
      });
      if (!res.ok) throw new Error('Scan failed');
      const data = await res.json();
      setScanResult(data);
    } catch (err) {
      console.error(err);
      // Fallback Mock result
      setScanResult({
        risk_level: "High",
        score: 88.5,
        rationale: `Simulated scan result for ${val}. Linked to high-frequency mule churn registers.`,
        actions: ["Disconnect immediately", "Do not transfer money"],
        ncrp_draft: {
          suspect_name: "Mock suspect",
          suspect_phone: val,
          suspect_account: "SB-1002-2342",
          suspect_bank: "State Bank of India",
          crime_type: "Cyber fraud",
          rationale: "Linked to active mule churn registers.",
          narrative: `Transferred funds to suspicious node: ${val}.`
        }
      });
    } finally {
      setScanning(false);
    }
  };

  const handleWhatsAppPromptClick = async (prompt) => {
    // Add user message
    const userMsg = {
      sender: 'user',
      text: prompt.value,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, userMsg]);
    setBotTyping(true);

    try {
      const res = await fetch('http://localhost:8000/api/fraud-shield/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: prompt.type, value: prompt.value })
      });
      if (!res.ok) throw new Error('Bot check failed');
      const data = await res.json();

      setTimeout(() => {
        setBotTyping(false);
        const botResponse = {
          sender: 'bot',
          text: `🔍 *Scan Result for ${prompt.value}:*\n\n` +
                `🚨 *Risk Level:* ${data.risk_level.toUpperCase()} (${data.score}% confidence)\n` +
                `📖 *AI Rationale:* ${data.rationale}\n\n` +
                `🛡️ *Recommended Actions:*\n` +
                data.actions.map(a => `- ${a}`).join('\n') +
                (data.risk_level !== 'Low' ? '\n\n*Instant Auto-Draft NCRP freeze request forms have been prepared for this node in your dashboard.*' : ''),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, botResponse]);
      }, 1000);

    } catch (err) {
      setBotTyping(false);
      const botError = {
        sender: 'bot',
        text: '⚠️ Failed to query the threat registry. Please try again.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, botError]);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  const getRiskColor = (level) => {
    if (level === 'High') return 'text-rose-600 bg-rose-50 border-rose-200';
    if (level === 'Medium') return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  };

  const getRiskBg = (level) => {
    if (level === 'High') return 'bg-rose-500';
    if (level === 'Medium') return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-auto lg:h-[calc(100vh-12rem)]">
      {/* Left Scanner & Form Draft Panel */}
      <div className="lg:col-span-3 flex flex-col space-y-6 h-full overflow-y-auto pr-1">
        {/* Scanner card */}
        <div className="glass-panel p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-2.5 mb-5">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">AI Cyber Threat Scanner</h3>
          </div>

          <div className="flex border-b border-slate-200 mb-5">
            {['phone', 'upi', 'link'].map((t) => (
              <button
                key={t}
                onClick={() => { setScanType(t); setScanResult(null); }}
                className={`py-2.5 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  scanType === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {t === 'upi' ? 'UPI / Bank Account' : t === 'phone' ? 'Phone Number' : 'Web URL Link'}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={scanValue}
                onChange={(e) => setScanValue(e.target.value)}
                placeholder={
                  scanType === 'phone' ? "Enter suspect number (e.g. +91-9844000011)..." :
                  scanType === 'upi' ? "Enter suspect UPI ID or Account (e.g. payment@upi)..." :
                  "Enter suspected video link / website (e.g. meet.zoom-court.in)..."
                }
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
              />
            </div>
            <button
              onClick={() => handleScan()}
              disabled={scanning || !scanValue.trim()}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-100 disabled:opacity-50 transition-all shrink-0"
            >
              {scanning ? "Scanning..." : "Run Threat Scan"}
            </button>
          </div>
        </div>

        {/* Scan Result Details */}
        {scanResult && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 animate-fade-in space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${getRiskColor(scanResult.risk_level)}`}>
                  {scanResult.risk_level.toUpperCase()} RISK
                </span>
                <span className="text-slate-500 text-xs font-semibold">AI Scan Score: {scanResult.score}% Threat</span>
              </div>
              
              {/* Progress gauge bar */}
              <div className="w-24 bg-slate-100 rounded-full h-2">
                <div className={`h-2 rounded-full ${getRiskBg(scanResult.risk_level)}`} style={{ width: `${scanResult.score}%` }} />
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">Explainable AI (XAI) Threat Rationale</h5>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 border border-slate-100 rounded-xl font-medium">
                {scanResult.rationale}
              </p>
            </div>

            <div className="space-y-3">
              <h5 className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">Command Control Recommended Safeguards</h5>
              <div className="space-y-2">
                {scanResult.actions.map((act, index) => (
                  <div key={index} className="flex items-start space-x-2.5 text-xs text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* NCRP Draft Form */}
            {scanResult.ncrp_draft && (
              <div className="border-t border-slate-200 pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4.5 h-4.5 text-rose-500" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Golden Hour NCRP Account Hold Form</h4>
                  </div>
                  <button
                    onClick={() => copyToClipboard(scanResult.ncrp_draft.narrative)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-bold hover:bg-slate-50 transition-colors"
                  >
                    {copiedDraft ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedDraft ? "Copied Narrative!" : "Copy Narrative"}</span>
                  </button>
                </div>

                <div className="bg-rose-50/50 border border-rose-100 p-5 rounded-xl space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Prefilled Suspect Name</span>
                      <span className="text-slate-800 font-bold mt-0.5 block">{scanResult.ncrp_draft.suspect_name}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Flagged Suspect Phone</span>
                      <span className="text-slate-800 font-bold mt-0.5 block font-mono">{scanResult.ncrp_draft.suspect_phone}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Target Bank Account</span>
                      <span className="text-slate-800 font-bold mt-0.5 block font-mono">{scanResult.ncrp_draft.suspect_account}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Suspect Nodal Bank</span>
                      <span className="text-slate-800 font-bold mt-0.5 block">{scanResult.ncrp_draft.suspect_bank}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">NCRP Cyber Complaint Narrative Draft</span>
                    <p className="text-slate-700 bg-white border border-slate-200 p-3 rounded-lg mt-1.5 text-[11px] leading-relaxed shadow-inner">
                      {scanResult.ncrp_draft.narrative}
                    </p>
                  </div>
                  <div className="text-[10px] text-rose-600 italic">
                    *Compliance Alert: Prefilled transaction details have been generated instantly from the Data Lake. Nodal bank officers will freeze the targeted account upon validation.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right WhatsApp Bot Simulator Pane */}
      <div className="lg:col-span-2 flex flex-col h-full bg-slate-900 border border-slate-950 rounded-3xl overflow-hidden shadow-2xl relative">
        {/* WhatsApp Mobile Header */}
        <div className="bg-[#075E54] p-4 flex items-center justify-between text-white flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-full">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs font-bold flex items-center space-x-1">
                <span>Citizen Fraud Shield Bot</span>
                <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white text-[8px] flex items-center justify-center font-bold">✓</span>
              </div>
              <span className="text-[8px] text-teal-100">KSP National Safety Engine</span>
            </div>
          </div>
          <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-700 rounded-md">Online</span>
        </div>

        {/* WhatsApp Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#E5DDD5] shadow-inner flex flex-col">
          {chatMessages.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-xs shadow-sm ${
                  m.sender === 'user'
                    ? 'bg-[#DCF8C6] text-slate-800 rounded-tr-none'
                    : 'bg-white text-slate-800 rounded-tl-none'
                }`}
              >
                {/* Format basic markdown inside simulator text */}
                <p className="whitespace-pre-line leading-relaxed text-[11px]">
                  {m.text.split('\n').map((line, lIdx) => {
                    let formattedLine = line;
                    // Format bold markers like *text*
                    const boldRegex = /\*(.*?)\*/g;
                    const parts = [];
                    let lastIndex = 0;
                    let match;
                    while ((match = boldRegex.exec(line)) !== null) {
                      if (match.index > lastIndex) {
                        parts.push(line.substring(lastIndex, match.index));
                      }
                      parts.push(<strong key={match.index} className="font-bold">{match[1]}</strong>);
                      lastIndex = boldRegex.lastIndex;
                    }
                    if (lastIndex < line.length) {
                      parts.push(line.substring(lastIndex));
                    }
                    return (
                      <span key={lIdx} className="block mt-0.5">
                        {parts.length > 0 ? parts : line}
                      </span>
                    );
                  })}
                </p>
                <span className="block text-[8px] text-slate-400 text-right mt-1.5">{m.time}</span>
              </div>
            </div>
          ))}

          {botTyping && (
            <div className="flex justify-start">
              <div className="bg-white px-4 py-2.5 rounded-xl rounded-tl-none flex items-center space-x-1.5 shadow-sm">
                <div className="w-1 h-1 bg-[#075E54] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 bg-[#075E54] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-1 bg-[#075E54] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        {/* Action prompts container inside mobile simulator */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex-shrink-0">
          <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block mb-2">Simulate Forwarding Messages</span>
          <div className="flex flex-wrap gap-2 mb-3">
            {simulatePrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleWhatsAppPromptClick(p)}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-[9px] px-2.5 py-1.5 rounded-lg transition-colors text-left truncate max-w-full"
              >
                {p.label}
              </button>
            ))}
          </div>
          
          <div className="text-[8px] text-center text-slate-500 italic mt-1">
            *Forward suspicious payloads in the simulated channel to check real-time safety response.
          </div>
        </div>
      </div>
    </div>
  );
}

export default CitizenFraudShieldView;
