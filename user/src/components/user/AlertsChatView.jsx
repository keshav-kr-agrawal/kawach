import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, RefreshCw, Paperclip, Siren, X, FileCheck2, MapPin } from 'lucide-react';
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
      text: "🛡️ Hello! I am Nayak, your KAWACH Safety Guard. You can ask me to evaluate local safety conditions, verify viral WhatsApp rumors, check a suspicious currency note or image, or get citation-backed answers on Indian law.",
      timestamp: '12:00 PM'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [busy, setBusy] = useState(false);          // in-flight guard: blocks send + attach
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

  // Session restore + one-shot geolocation on mount
  useEffect(() => {
    const activeSess = localStorage.getItem('nayak_session_id');
    if (activeSess) {
      setSessionId(activeSess);
      fetchMessages(activeSess);
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}, // denied/unavailable — keep fallback, never block chat
        { timeout: 5000 }
      );
    }
  }, []);

  const fetchMessages = async (sessId) => {
    setBusy(true);
    setHistoryError(false);
    try {
      const data = await getMessages(sessId);
      if (data.length > 0) {
        setMessages(data.map(m => ({
          id: m.id,
          sender: m.role === 'user' ? 'user' : 'bot',
          text: m.content,
          timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          tool_name: m.tool_name,
          tool_result: m.tool_result
        })));
      }
    } catch (err) {
      console.error('[NAYAK] Failed to load messages:', err);
      setHistoryError(true);
    } finally {
      setBusy(false);
    }
  };

  const startNewSession = () => {
    localStorage.removeItem('nayak_session_id');
    setSessionId(null);
    setHistoryError(false);
    setMessages([
      {
        id: 'msg-start-' + Date.now(),
        sender: 'bot',
        text: "🛡️ Chat session reset. I am ready to evaluate new security issues, links, or BNS legal rights queries.",
        timestamp: now()
      }
    ]);
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim() || busy) return;

    setMessages((prev) => [...prev, { id: 'user-' + Date.now(), sender: 'user', text, timestamp: now() }]);
    if (!textToSend) setInputText('');
    setBusy(true);

    try {
      const data = await sendChat({ sessionId, message: text, lat: coords.lat, lng: coords.lng });
      if (data.session_id && data.session_id !== sessionId) {
        setSessionId(data.session_id);
        localStorage.setItem('nayak_session_id', data.session_id);
      }
      pushBot(data.message.content);
      if (data.proposal) {
        setMessages((prev) => [...prev, {
          id: 'proposal-' + Date.now(),
          sender: 'bot',
          type: 'proposal',
          proposal: data.proposal,
          sessionIdAtProposal: data.session_id || sessionId,
          resolved: null,
          timestamp: now()
        }]);
      }
    } catch (err) {
      console.error('[NAYAK] Chat call failed:', err);
      pushBot("⚠️ **SYSTEM CONNECTION DEGRADED:**\n\nUnable to reach the active KAWACH safety node grid. Please make sure the backend command console (`police/backend`) is running.");
    } finally {
      setBusy(false);
    }
  };

  // ── Real media upload: bytes → Cloudinary/Supabase → backend classification ──
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || busy) return;

    let mediaType = 'text';
    if (file.type.startsWith('image/')) mediaType = 'image';
    else if (file.type.startsWith('video/')) mediaType = 'video';
    else if (file.type.startsWith('audio/')) mediaType = 'audio';

    setMessages((prev) => [...prev, {
      id: 'user-file-' + Date.now(), sender: 'user',
      text: `📁 **Attached ${mediaType.toUpperCase()}:** ${file.name}`, timestamp: now()
    }]);
    setBusy(true);

    try {
      if (mediaType === 'audio' || mediaType === 'text') {
        // Honest scope: no audio/doc classifier pipeline yet — say so instead of pretending.
        pushBot("🎙️ **Audio/document analysis isn't live yet.** Describe what it contains (e.g. paste the caller's words) and I'll assess the content as text — the scam-script detector works on transcripts.");
        return;
      }

      // 1. Upload the real bytes
      const realUrl = await uploadMediaBlob(file, { filename: file.name });
      if (!realUrl) {
        pushBot("⚠️ **UPLOAD FAILED:** Could not store your file (media storage unreachable). Nothing was analyzed — no verdict was fabricated. Please retry in a moment.");
        return;
      }

      // 2. Backend fetches the real URL and runs the real classifier
      const data = await uploadMedia({ mediaUrl: realUrl, mediaType, sessionId });
      const v = data.verdict || {};

      let botText = '🛡️ **KAWACH SCANNER VERDICT:**\n\n';
      if (v.verdict === 'PENDING_ANALYSIS') {
        botText += '⏳ **ANALYSIS PENDING** — the AI classifier is unreachable right now. Your evidence is stored; no verdict was fabricated. Ask me again in a bit.';
      } else if (v.is_authenticated === true) {
        botText += `✅ **VERIFIED AUTHENTIC** (score: ${Number(v.score).toFixed(1)}%)\n\n**Details:** ${v.details}`;
      } else if (v.is_authenticated === false) {
        botText += `❌ **FLAGGED SUSPICIOUS** (score: ${Number(v.score).toFixed(1)}%)\n\n**Details:** ${v.details}`;
      } else {
        botText += `ℹ️ ${v.details || 'Stored for analysis.'}`;
      }
      if (v.model_mode) botText += `\n\n*Analysis mode: ${v.model_mode}*`;
      pushBot(botText);

      if (v.is_authenticated === false) {
        pushBot('If you\'d like, tell me where you received this (shop, ATM, person) — I can check for similar reports near you and help you file it to the right department. **Nothing is reported without your confirmation.**');
      }
    } catch (err) {
      console.error('[NAYAK] File scan failed:', err);
      pushBot("⚠️ **SCANNING ERROR:**\n\nUnable to reach the KAWACH media verification nodes. Your file was not analyzed — please verify the backend is running.");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Proposal confirmation: the ONLY way a Nayak suggestion becomes a report ──
  const handleProposalDecision = async (msgId, accept) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg || msg.resolved) return;
    const p = msg.proposal;

    if (!accept) {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, resolved: 'declined' } : m));
      pushBot('Understood — nothing was filed. The evidence stays in our chat if you change your mind.');
      return;
    }

    setBusy(true);
    try {
      // Authoritative routing (real classifier; keyword fallback inside routeReport)
      let dept = p.suggested_department, priority = p.severity || 'HIGH', reason = p.rationale;
      try {
        const routed = await routeReport(p.category, p.narrative || p.rationale, p.category);
        if (routed?.department) { dept = routed.department; priority = routed.priority || priority; reason = routed.routing_reason || reason; }
      } catch { /* keep proposal's suggestion */ }

      const report = {
        id: newReportId(),
        title: `Nayak: ${p.category}`,
        description: p.narrative || p.rationale,
        category: p.category,
        uploaderUuid: getAnonUserId(),
        status: 'PUBLIC_APPROVED',
        lat: coords.lat,
        lng: coords.lng,
        videoUrl: p.evidence_media_url || null,
        routedDepartment: dept,
        routingPriority: priority,
        routingReason: `Filed via Nayak with citizen confirmation. ${reason || ''}`.trim(),
        escalationRequired: priority === 'CRITICAL',
        source: REPORT_SOURCES.NAYAK_CHAT,
        nayakSessionId: msg.sessionIdAtProposal || sessionId,
      };
      const { ok } = await createReport(report);
      if (!ok) throw new Error('insert failed');

      if (p.upload_id) {
        try { await linkReport(p.upload_id, report.id); } catch (e) { console.warn('[NAYAK] link-report failed:', e); }
      }

      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, resolved: 'filed', filedReportId: report.id } : m));
      pushBot(`✅ **REPORT FILED** — ID \`${report.id}\`\n\n• **Department:** ${dept}\n• **Priority:** ${priority}\n• **Evidence:** ${p.evidence_media_url ? 'attached' : 'none'}\n\nTrack it from your profile. The department sees only the report content and location — never your identity.`);
    } catch (err) {
      console.error('[NAYAK] Report filing failed:', err);
      pushBot('⚠️ **FILING FAILED** — the report could not be saved. Your evidence and this conversation are intact; please try again.');
    } finally {
      setBusy(false);
    }
  };

  // ── Emergency dispatch: never blocked by AI availability ──
  const handleEmergencyDispatch = async () => {
    if (emDispatching) return;
    setEmDispatching(true);
    try {
      let evidenceUrl = null, uploadId = null;
      if (emFile) {
        evidenceUrl = await uploadMediaBlob(emFile, { folder: 'emergency', filename: emFile.name });
        if (evidenceUrl) {
          try {
            const up = await uploadMedia({
              mediaUrl: evidenceUrl,
              mediaType: emFile.type.startsWith('video/') ? 'video' : 'image',
              sessionId
            });
            uploadId = up.id;
          } catch { /* classification advisory only — emergency proceeds regardless */ }
        }
      }

      // Routing is advisory here: try the classifier, fall back silently — an
      // emergency must never wait on AI availability.
      let dept = 'POLICE', reason = 'Emergency dispatch by citizen.';
      try {
        const routed = await routeReport(emCategory, emDescription || emCategory, emCategory);
        if (routed?.department) { dept = routed.department; reason = routed.routing_reason || reason; }
      } catch { /* keyword fallback already inside routeReport; this is belt+braces */ }

      const report = {
        id: newReportId(),
        title: `🚨 EMERGENCY: ${emCategory}`,
        description: emDescription || `Emergency dispatch (${emCategory}) from Nayak chat.`,
        category: emCategory,
        uploaderUuid: getAnonUserId(),
        status: 'PUBLIC_APPROVED',
        lat: coords.lat,
        lng: coords.lng,
        videoUrl: evidenceUrl,
        emergencyOverride: true,
        routedDepartment: dept,
        routingPriority: 'CRITICAL',
        routingReason: reason,
        escalationRequired: true,
        source: REPORT_SOURCES.CHAT_EMERGENCY,
        nayakSessionId: sessionId,
      };
      const { ok } = await createReport(report);
      if (!ok) throw new Error('insert failed');
      if (uploadId) {
        try { await linkReport(uploadId, report.id); } catch { /* non-fatal */ }
      }

      setEmergencyOpen(false);
      setEmDescription('');
      setEmFile(null);
      pushBot(`🚨 **EMERGENCY DISPATCHED** — ID \`${report.id}\`\n\n• **Department:** ${dept} (CRITICAL priority, 15-minute SLA)\n• **Location:** ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}\n• **Evidence:** ${evidenceUrl ? 'attached' : 'none'}\n\nHelp is being routed. If you are in immediate danger also call **112**.`);
    } catch (err) {
      console.error('[NAYAK] Emergency dispatch failed:', err);
      pushBot('⚠️ **DISPATCH FAILED** — could not save the emergency report. Please retry, or call **112** directly.');
    } finally {
      setEmDispatching(false);
    }
  };

  const handleQuickQuestion = (qText) => handleSendMessage(qText);

  const renderMessageText = (txt) => {
    if (!txt) return '';
    const parts = txt.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} style={{ fontWeight: '700', color: '#1E293B' }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const chipStyle = {
    padding: '8px 14px', borderRadius: '20px', border: '1px solid #e5e5e5',
    backgroundColor: '#f8fafc', fontSize: '11px', color: '#09090B', cursor: 'pointer',
    whiteSpace: 'nowrap', fontWeight: '600', minHeight: '36px'
  };

  return (
    <div className="view-container" style={{ padding: '0 0 calc(70px + env(safe-area-inset-bottom)) 0', display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#ffffff' }}>

      {/* Safety Alert Broadcast Banner + actions */}
      <div style={{ background: '#fff5f5', borderBottom: '1px solid #ffe2e2', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#E11D48' }} className="pulse-red" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.05em', color: '#E11D48', textTransform: 'uppercase' }}>
            Broadcasting Safety Notice
          </span>
          <p style={{ margin: 0, fontSize: '11px', color: '#09090B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500' }}>
            High-speed water clogging logged on Outer Ring Road. Police advising detours.
          </p>
        </div>
        <button
          onClick={() => setEmergencyOpen(true)}
          title="Emergency Report — immediate dispatch"
          style={{
            display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#ef4444',
            border: 'none', borderRadius: '12px', padding: '7px 12px', fontSize: '10px',
            color: '#ffffff', fontWeight: '800', cursor: 'pointer', boxShadow: '0 2px 8px rgba(239,68,68,0.35)'
          }}
        >
          <Siren size={12} />
          Emergency
        </button>
        <button
          onClick={startNewSession}
          title="New Chat Session"
          style={{
            display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0', borderRadius: '12px', padding: '6px 10px',
            fontSize: '10px', color: '#64748B', fontWeight: '600', cursor: 'pointer'
          }}
        >
          <RefreshCw size={10} />
          Reset
        </button>
      </div>

      {/* History load failure bar */}
      {historyError && (
        <div style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', color: '#92400e', fontWeight: '600', flex: 1 }}>Couldn't load your chat history.</span>
          <button
            onClick={() => sessionId && fetchMessages(sessionId)}
            style={{ fontSize: '11px', fontWeight: '700', color: '#92400e', background: 'none', border: '1px solid #fcd34d', borderRadius: '10px', padding: '4px 10px', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Chat Messages Log */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: '#ffffff' }} className="scroll-y">

        {messages.map((msg) => {
          const isBot = msg.sender === 'bot';

          // ── Report proposal confirmation card ──
          if (msg.type === 'proposal') {
            const p = msg.proposal;
            return (
              <div key={msg.id} style={{ alignSelf: 'flex-start', maxWidth: '92%', width: '100%', display: 'flex', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#fffde7', border: '1px solid #ffd900', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileCheck2 size={16} />
                </div>
                <div style={{ flex: 1, border: '1.5px solid #ffd900', borderRadius: '16px', borderTopLeftRadius: '4px', background: '#fffdf0', padding: '14px', boxShadow: '0 2px 10px rgba(255,217,0,0.12)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.05em', color: '#a16207', textTransform: 'uppercase', marginBottom: '8px' }}>
                    📋 Report Proposal — needs your confirmation
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#09090B', marginBottom: '6px' }}>{p.category}</div>
                  <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5, marginBottom: '8px' }}>{p.rationale}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8' }}>
                      → {p.suggested_department}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '10px', background: p.severity === 'CRITICAL' ? '#fef2f2' : '#fff7ed', border: '1px solid #fecaca', color: p.severity === 'CRITICAL' ? '#dc2626' : '#ea580c' }}>
                      {p.severity}
                    </span>
                    {p.nearby_similar_count > 0 && (
                      <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <MapPin size={9} /> {p.nearby_similar_count} similar nearby
                      </span>
                    )}
                    {p.evidence_media_url && (
                      <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569' }}>
                        📎 evidence attached
                      </span>
                    )}
                  </div>
                  {msg.resolved === 'filed' ? (
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#166534' }}>✅ Filed — ID {msg.filedReportId}</div>
                  ) : msg.resolved === 'declined' ? (
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748B' }}>Declined — nothing was filed.</div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleProposalDecision(msg.id, true)}
                        disabled={busy}
                        style={{ flex: 1, padding: '10px', borderRadius: '12px', border: 'none', background: '#09090B', color: '#ffd900', fontWeight: '800', fontSize: '12px', cursor: busy ? 'wait' : 'pointer' }}
                      >
                        File report
                      </button>
                      <button
                        onClick={() => handleProposalDecision(msg.id, false)}
                        disabled={busy}
                        style={{ flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#64748B', fontWeight: '700', fontSize: '12px', cursor: busy ? 'wait' : 'pointer' }}
                      >
                        Not now
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex', gap: '10px', flexDirection: isBot ? 'row' : 'row-reverse',
                alignItems: 'flex-start', alignSelf: isBot ? 'flex-start' : 'flex-end', maxWidth: '85%'
              }}
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                backgroundColor: isBot ? '#fffde7' : '#f8fafc',
                border: `1px solid ${isBot ? '#ffd900' : '#e5e5e5'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isBot ? '#09090B' : '#64748B', flexShrink: 0
              }}>
                {isBot ? <Bot size={16} /> : <User size={16} />}
              </div>
              <div style={{
                padding: '12px 14px', borderRadius: '16px',
                borderTopLeftRadius: isBot ? '4px' : '16px',
                borderTopRightRadius: isBot ? '16px' : '4px',
                background: isBot ? '#eff6ff' : '#f8fafc',
                border: isBot ? '1px solid rgba(59, 130, 246, 0.15)' : '1px solid #e2e8f0',
                boxShadow: '0 2px 6px rgba(0,0,0,0.01)'
              }}>
                <div style={{ fontSize: '13px', color: '#09090B', lineHeight: 1.5, whiteSpace: 'pre-wrap', fontWeight: '500' }}>
                  {renderMessageText(msg.text)}
                </div>
                <div style={{ textAlign: isBot ? 'left' : 'right', fontSize: '9px', color: '#64748B', marginTop: '6px', fontWeight: '500' }}>
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {busy && (
          <div style={{ display: 'flex', gap: '10px', alignSelf: 'flex-start' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#fffde7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={16} />
            </div>
            <div style={{ padding: '12px 16px', borderRadius: '16px', borderTopLeftRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#eff6ff', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
              <span className="shimmer" style={{ width: '40px', height: '8px', borderRadius: '4px' }} />
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '500' }}>Auditing safety databases...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick query chips */}
      <div style={{ padding: '0 16px 8px 16px', display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', backgroundColor: '#ffffff' }}>
        <button onClick={() => handleQuickQuestion('Verify kidnap rumor in Koramangala')} style={chipStyle}>🔍 Kidnap Rumor Check</button>
        <button onClick={() => handleQuickQuestion('Is the route to HSR safe right now?')} style={chipStyle}>🗺️ Safe Route Check</button>
        <button onClick={() => handleQuickQuestion('I received a phone call claiming to be CBI placing me under digital arrest')} style={chipStyle}>⚠️ Digital Arrest Help</button>
        <button onClick={() => handleQuickQuestion('What is the RBI circular on UPI fraud customer liability?')} style={chipStyle}>📚 UPI Fraud Liability</button>
      </div>

      {/* Message Input Panel */}
      <div className="glass-panel" style={{ padding: '10px 16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'center', background: '#ffffff' }}>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept="image/*,video/*,audio/*" />
        <button
          onClick={() => !busy && fileInputRef.current?.click()}
          disabled={busy}
          title="Attach media to scan"
          style={{
            width: '44px', height: '44px', borderRadius: '50%',
            backgroundColor: busy ? '#f1f5f9' : '#f8fafc', color: busy ? '#cbd5e1' : '#64748B',
            border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: busy ? 'not-allowed' : 'pointer', minHeight: '44px', minWidth: '44px'
          }}
        >
          <Paperclip size={16} />
        </button>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
          placeholder="Ask Nayak AI or paste suspicious link/call transcript..."
          style={{
            flex: 1, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '24px',
            padding: '12px 18px', color: '#09090B', fontSize: '13px', outline: 'none',
            fontFamily: 'Inter, sans-serif', fontWeight: '500', minHeight: '44px'
          }}
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={busy}
          style={{
            width: '44px', height: '44px', borderRadius: '50%',
            backgroundColor: busy ? '#fef9c3' : '#ffd900', color: '#09090B', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: busy ? 'wait' : 'pointer', boxShadow: '0 2px 8px rgba(255, 217, 0, 0.2)',
            minHeight: '44px', minWidth: '44px'
          }}
        >
          <Send size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* ── Emergency Report Modal ── */}
      {emergencyOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '480px', padding: '20px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Siren size={18} color="#ef4444" />
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#09090B' }}>Emergency Report</span>
              </div>
              <button onClick={() => !emDispatching && setEmergencyOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 12px', lineHeight: 1.5 }}>
              Dispatches immediately at <strong>CRITICAL</strong> priority (15-min SLA). AI routing is advisory only — this will file even if analysis services are down. If in immediate danger, also call <strong>112</strong>.
            </p>

            <label style={{ fontSize: '10px', fontWeight: '800', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Issue type</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '6px 0 12px' }}>
              {EMERGENCY_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setEmCategory(cat)}
                  style={{
                    padding: '7px 12px', borderRadius: '14px', fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                    border: `1.5px solid ${emCategory === cat ? '#ef4444' : '#e2e8f0'}`,
                    background: emCategory === cat ? '#fef2f2' : '#f8fafc',
                    color: emCategory === cat ? '#dc2626' : '#475569'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <label style={{ fontSize: '10px', fontWeight: '800', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>What's happening? (optional)</label>
            <textarea
              value={emDescription}
              onChange={(e) => setEmDescription(e.target.value)}
              rows={2}
              placeholder="Brief description..."
              style={{ width: '100%', boxSizing: 'border-box', margin: '6px 0 12px', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', fontFamily: 'Inter, sans-serif', resize: 'none', outline: 'none' }}
            />

            <input type="file" ref={emFileInputRef} accept="image/*,video/*" style={{ display: 'none' }} onChange={(e) => setEmFile(e.target.files?.[0] || null)} />
            <button
              onClick={() => emFileInputRef.current?.click()}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '12px', border: '1px dashed #cbd5e1', background: '#f8fafc', fontSize: '11px', fontWeight: '700', color: '#475569', cursor: 'pointer', marginBottom: '14px' }}
            >
              <Paperclip size={13} />
              {emFile ? `📎 ${emFile.name}` : 'Attach evidence (optional)'}
            </button>

            <button
              onClick={handleEmergencyDispatch}
              disabled={emDispatching}
              style={{
                width: '100%', padding: '15px', borderRadius: '14px', border: 'none',
                background: emDispatching ? '#fca5a5' : '#ef4444', color: '#ffffff',
                fontWeight: '900', fontSize: '14px', letterSpacing: '0.02em',
                cursor: emDispatching ? 'wait' : 'pointer', boxShadow: '0 6px 20px rgba(239,68,68,0.35)'
              }}
            >
              {emDispatching ? 'DISPATCHING…' : '🚨 DISPATCH NOW'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
