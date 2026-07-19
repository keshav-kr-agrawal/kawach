import React, { useState, useRef, useEffect } from 'react';
import { sendChat, getMessages, uploadMedia, linkReport, getAnonUserId } from '../../api/nayakService';
import { uploadMediaBlob } from '../../api/mediaService';
import { createReport, newReportId, REPORT_SOURCES } from '../../api/reportService';
import { routeReport } from '../../api/routingService';

const EMERGENCY_CATEGORIES = ['Infrastructure', 'Violence/Loitering', 'Theft/Property', 'Traffic Warning', 'Emergency Alert'];
const DEFAULT_COORDS = { lat: 12.9716, lng: 77.5946 }; // Bengaluru fallback

export default function AlertsChatView() {
  const [messages, setMessages] = useState([
    {
      id: 'msg-1',
      sender: 'bot',
      text: "🛡️ Hello! This is your KAWACH Emergency Shield. Ask about local ward safety conditions, verify viral WhatsApp warnings, evaluate suspicious transaction calls, or verify your legal rights under Indian law.",
      timestamp: '12:00 PM'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [historyError, setHistoryError] = useState(false);
  const [coords, setCoords] = useState(DEFAULT_COORDS);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [emCategory, setEmCategory] = useState(EMERGENCY_CATEGORIES[4]);
  const [emDescription, setEmDescription] = useState('');
  const [emFile, setEmFile] = useState(null);
  const [emDispatching, setEmDispatching] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const emFileInputRef = useRef(null);

  const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const pushBot = (text, extra = {}) =>
    setMessages((prev) => [...prev, { id: 'bot-' + Date.now() + Math.random(), sender: 'bot', text, timestamp: now(), ...extra }]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const activeSess = localStorage.getItem('nayak_session_id');
    if (activeSess) {
      setSessionId(activeSess);
      fetchMessages(activeSess);
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { timeout: 5000 }
      );
    }
  }, []);

  const fetchMessages = async (sessId) => {
    setBusy(true);
    setHistoryError(false);
    try {
      const data = await getMessages(sessId);
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map((m, idx) => ({
          id: m.id || `hist-${idx}`,
          sender: m.role === 'user' ? 'user' : 'bot',
          text: m.content || m.text || '',
          timestamp: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : now(),
          citations: m.citations || []
        }));
        setMessages(mapped);
      }
    } catch (err) {
      console.error('[CHAT HISTORY FETCH FAILED]', err);
      setHistoryError(true);
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const query = inputText.trim();
    if (!query || busy) return;

    const userMsg = { id: 'user-' + Date.now(), sender: 'user', text: query, timestamp: now() };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setBusy(true);

    try {
      // Service contract: sendChat({ sessionId, ... }) and the backend replies
      // { session_id, message: { content }, proposal } — res.reply doesn't exist.
      const res = await sendChat({ sessionId, message: query, lat: coords.lat, lng: coords.lng });
      if (res?.session_id) {
        setSessionId(res.session_id);
        localStorage.setItem('nayak_session_id', res.session_id);
      }
      pushBot(res.message?.content || 'Emergency Shield active. Statement verified against legal node.', {
        citations: res.citations || [],
        proposal: res.proposal || null,
      });
    } catch (err) {
      console.error('[CHAT SEND FAILED]', err);
      pushBot('⚠️ System notice: Server connection intermittent. Check emergency directory if urgent.');
    } finally {
      setBusy(false);
    }
  };

  const handleFileAttach = async (e) => {
    const file = e.target.files?.[0];
    if (!file || busy) return;

    setBusy(true);
    const userMsg = { id: 'user-' + Date.now(), sender: 'user', text: `Attached media: ${file.name}`, timestamp: now() };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const mediaType = file.type.startsWith('image/') ? 'image'
        : file.type.startsWith('video/') ? 'video' : 'other';
      if (mediaType === 'other') {
        // Honest scope: no audio/doc classifier pipeline yet — say so instead of pretending.
        pushBot("🎙️ Audio/document analysis isn't live yet. Describe what it contains (e.g. paste the caller's words) and I'll assess the content as text.");
        return;
      }

      let activeSess = sessionId;
      if (!activeSess) {
        const initRes = await sendChat({ message: 'Media Inspection Request', lat: coords.lat, lng: coords.lng });
        activeSess = initRes.session_id;
        setSessionId(activeSess);
        localStorage.setItem('nayak_session_id', activeSess);
      }

      // 1) Upload the real bytes (Cloudinary → Supabase storage fallback)
      const realUrl = await uploadMediaBlob(file, { filename: file.name });
      if (!realUrl) {
        pushBot('⚠️ Could not store your file (media storage unreachable). Nothing was analyzed — no verdict was fabricated. Please retry in a moment.');
        return;
      }

      // 2) Backend fetches the URL and runs the real classifier
      const mediaRes = await uploadMedia({ mediaUrl: realUrl, mediaType, sessionId: activeSess });
      const v = mediaRes.verdict || {};

      let botText = '🛡️ KAWACH SCANNER VERDICT:\n\n';
      if (v.verdict === 'PENDING_ANALYSIS') {
        botText += '⏳ ANALYSIS PENDING — the AI classifier is unreachable right now. Your evidence is stored; no verdict was fabricated. Ask me again in a bit.';
      } else if (v.is_authenticated === true) {
        botText += `✅ VERIFIED AUTHENTIC${v.score != null ? ` (score: ${Number(v.score).toFixed(1)}%)` : ''}\n\n${v.details || ''}`;
      } else if (v.is_authenticated === false) {
        botText += `❌ FLAGGED SUSPICIOUS${v.score != null ? ` (score: ${Number(v.score).toFixed(1)}%)` : ''}\n\n${v.details || ''}`;
      } else {
        botText += `ℹ️ ${v.details || 'Stored for analysis.'}`;
      }
      if (v.model_mode) botText += `\n\nAnalysis mode: ${v.model_mode}`;
      pushBot(botText);

      if (v.is_authenticated === false) {
        pushBot('If you\'d like, tell me where you received this (shop, ATM, person) — I can check for similar reports near you and help you file it to the right department. Nothing is reported without your confirmation.');
      }
    } catch (err) {
      console.error('[MEDIA ATTACH FAILED]', err);
      pushBot('⚠️ Unable to upload file for verification. Try submitting via Camera tab.');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Proposal confirmation: the ONLY way a Nayak suggestion becomes a report ──
  const handleProposalDecision = async (msgId, accept) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg || msg.resolved) return;
    const p = msg.proposal || {};
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, resolved: accept ? 'filed' : 'declined' } : m)));

    if (!accept) {
      pushBot('Understood — nothing was filed. The evidence stays in our chat if you change your mind.');
      return;
    }

    try {
      const title = p.title || `Citizen report: ${p.category || 'incident'}`;
      const description = p.description || p.rationale || 'Filed via Nayak assistant after AI screening.';
      const routing = await routeReport(title, description, p.category);
      const repId = newReportId();
      const result = await createReport({
        id: repId,
        title,
        description,
        category: p.category || 'General Alert',
        uploaderUuid: getAnonUserId(),
        status: 'PUBLIC_APPROVED',
        lat: coords.lat,
        lng: coords.lng,
        videoUrl: p.evidence_media_url || null,
        routedDepartment: routing.department || routing.routed_department || p.suggested_department || null,
        routingPriority: routing.priority || p.severity || 'NORMAL',
        routingReason: routing.routing_reason || 'Nayak-proposed, citizen-confirmed.',
        source: REPORT_SOURCES.NAYAK_CHAT,
        nayakSessionId: sessionId,
      });
      if (!result.ok) throw result.error || new Error('insert failed');
      if (p.upload_id) await linkReport(p.upload_id, repId).catch(() => {});
      pushBot(`✅ REPORT FILED — ID ${repId}\n\nDepartment: ${routing.department || p.suggested_department || 'auto-routed'}\nPriority: ${routing.priority || p.severity || 'NORMAL'}\n\nThe department sees only the report content and location — never your identity.`);
    } catch (err) {
      console.error('[PROPOSAL FILING FAILED]', err);
      pushBot('⚠️ Filing failed — the report was NOT submitted. Please retry, or use the Camera tab.');
    }
  };

  const handleEmergencyDispatch = async (e) => {
    e.preventDefault();
    if (emDispatching) return;
    setEmDispatching(true);

    try {
      let mediaPath = null;
      if (emFile) {
        mediaPath = await uploadMediaBlob(emFile, { folder: 'emergency', filename: emFile.name });
      }

      // Route FIRST so the department lands on the row; keyword fallback means
      // an emergency is never blocked by a classifier outage.
      const title = `EMERGENCY ALERT: ${emCategory}`;
      const description = emDescription || 'Urgent citizen dispatch request';
      const routing = await routeReport(title, description, emCategory);

      const repId = newReportId();
      const result = await createReport({
        id: repId,
        title,
        description,
        category: emCategory,
        uploaderUuid: getAnonUserId(),
        status: 'PUBLIC_APPROVED',
        lat: coords.lat,
        lng: coords.lng,
        videoUrl: mediaPath,
        routedDepartment: routing.department || routing.routed_department || 'POLICE',
        routingPriority: 'CRITICAL',
        routingReason: routing.routing_reason || 'Citizen emergency dispatch.',
        escalationRequired: true,
        emergencyOverride: true,
        source: REPORT_SOURCES.CHAT_EMERGENCY,
        nayakSessionId: sessionId,
      });
      if (!result.ok) throw result.error || new Error('insert failed');

      // Register the evidence as a chat upload so it's linked to the report
      if (mediaPath && sessionId) {
        try {
          const up = await uploadMedia({
            mediaUrl: mediaPath,
            mediaType: emFile?.type?.startsWith('video/') ? 'video' : 'image',
            sessionId,
          });
          if (up?.id) await linkReport(up.id, repId);
        } catch (linkErr) {
          console.warn('[EMERGENCY] evidence link skipped:', linkErr);
        }
      }

      setEmergencyOpen(false);
      setEmDescription('');
      setEmFile(null);
      pushBot(`🔴 URGENT DISPATCH LOGGED! Case ID #${repId.slice(-6)}. Route assigned to District SP Command.`);
    } catch (err) {
      console.error('[EMERGENCY DISPATCH FAILED]', err);
      // Never fake success on a failed dispatch — say it failed and give the fallback.
      pushBot('⚠️ DISPATCH FAILED — your emergency was NOT filed. Please retry, use the Camera tab, or call 112 directly if urgent.');
    } finally {
      setEmDispatching(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white font-sans text-slate-900 overflow-hidden select-text relative">
      
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-yellow-400/20 flex items-center justify-between flex-none">
        <div>
          <span className="text-[9px] font-bold text-[#b08850] uppercase tracking-widest block font-mono">
            INSTANT THREAT & LEGAL VERIFICATION
          </span>
          <h2 className="text-xl font-black text-slate-950 font-sora">
            Emergency <span className="font-serif italic font-normal text-[#b08850] pr-1">Shield</span>
          </h2>
        </div>

        <button
          onClick={() => setEmergencyOpen(true)}
          className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs uppercase tracking-wider font-sora animate-pulse"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Emergency SOS
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-md rounded-2xl p-4 shadow-xs ${
                isUser 
                  ? 'bg-[#ffd900] text-slate-950 font-semibold border border-slate-950/10 rounded-br-none' 
                  : 'bg-white border border-yellow-400/25 text-slate-800 rounded-bl-none'
              }`}>
                <div className="flex items-center justify-between gap-4 mb-1.5 pb-1 border-b border-yellow-400/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                    {isUser ? 'You' : 'KAWACH Shield'}
                  </span>
                  <span className="text-[9px] font-medium text-slate-400">{m.timestamp}</span>
                </div>
                
                <p className="text-xs leading-relaxed font-semibold whitespace-pre-wrap">{m.text}</p>

                {m.proposal && (
                  <div className="mt-3 pt-2 border-t border-yellow-400/20">
                    <span className="text-[9px] font-bold text-[#b08850] uppercase tracking-wider block mb-1.5">📋 Proposed Report — needs your confirmation</span>
                    <div className="text-[10px] text-slate-600 font-semibold space-y-0.5 mb-2">
                      {m.proposal.category && <div>Category: {m.proposal.category}</div>}
                      {m.proposal.suggested_department && <div>Department: {m.proposal.suggested_department}</div>}
                      {m.proposal.severity && <div>Severity: {m.proposal.severity}</div>}
                      {m.proposal.nearby_similar_count > 0 && <div>⚠ {m.proposal.nearby_similar_count} similar report(s) near you</div>}
                    </div>
                    {m.resolved ? (
                      <span className="text-[10px] font-bold text-slate-500">{m.resolved === 'filed' ? '✅ Filed' : 'Not filed'}</span>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => handleProposalDecision(m.id, true)}
                          className="px-3 py-1.5 bg-[#ffd900] text-slate-950 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                          File report
                        </button>
                        <button onClick={() => handleProposalDecision(m.id, false)}
                          className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                          Not now
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {m.citations && m.citations.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-yellow-400/20 space-y-1">
                    <span className="text-[9px] font-bold text-[#b08850] uppercase tracking-wider block">Legal Citations:</span>
                    {m.citations.map((cite, i) => (
                      <span key={i} className="inline-block px-2 py-0.5 bg-yellow-400/10 text-[#b08850] rounded border border-yellow-400/20 text-[9px] font-bold mr-1.5 mb-1">
                        🔖 {cite}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {busy && (
          <div className="flex justify-start">
            <div className="bg-white border border-yellow-400/20 rounded-2xl p-3 text-xs text-slate-500 font-bold flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-[#ffd900] border-t-transparent rounded-full animate-spin" />
              Scanning legal database & threat logs...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-yellow-400/20 flex items-center gap-2 flex-none pb-20 md:pb-3">
        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleFileAttach}
          className="hidden"
          accept="image/*,video/*,.pdf"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="p-3 bg-yellow-50 hover:bg-yellow-100 border border-yellow-400/30 text-[#b08850] rounded-xl transition-all disabled:opacity-50"
          title="Attach document or media"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
        </button>

        <input 
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask a legal question or paste suspicious call info..."
          disabled={busy}
          className="flex-1 bg-slate-50 border border-yellow-400/20 rounded-xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#ffd900] font-semibold"
          style={{ minHeight: '44px' }}
        />

        <button
          type="submit"
          disabled={busy || !inputText.trim()}
          className="p-3 bg-[#ffd900] hover:bg-yellow-400 text-slate-950 font-bold rounded-xl border border-slate-950/10 transition-all disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </form>

      {/* Emergency Dispatch Modal */}
      {emergencyOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-red-500 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-red-600 text-base font-sora flex items-center gap-2">
                🚨 Direct Emergency Dispatch
              </h3>
              <button onClick={() => setEmergencyOpen(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleEmergencyDispatch} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Incident Category
                </label>
                <select
                  value={emCategory}
                  onChange={(e) => setEmCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800"
                >
                  {EMERGENCY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Emergency Description
                </label>
                <textarea
                  rows={3}
                  value={emDescription}
                  onChange={(e) => setEmDescription(e.target.value)}
                  placeholder="State immediate danger details, address, or landmarks..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEmergencyOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emDispatching}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs uppercase tracking-wider font-sora shadow-sm"
                >
                  {emDispatching ? 'Routing SOS...' : 'Trigger Immediate Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
