import React, { useState, useRef, useEffect } from 'react';
import { sendChat, getMessages, uploadMedia, linkReport, getAnonUserId, translateText, SUPPORTED_LANGUAGES } from '../../api/nayakService';
import { uploadMediaBlob } from '../../api/mediaService';
import { createReport, newReportId, REPORT_SOURCES } from '../../api/reportService';
import { routeReport } from '../../api/routingService';

const EMERGENCY_CATEGORIES = ['Infrastructure', 'Violence/Loitering', 'Theft/Property', 'Traffic Warning', 'Emergency Alert'];
const DEFAULT_COORDS = { lat: 12.9716, lng: 77.5946 }; // Bengaluru fallback

// Exactly 5 selectable modes. Tapping one toggles it "active" (a selected
// tag, not a one-shot action) — whatever the citizen sends next (text or a
// file) carries `mode` to the backend so it routes deterministically to the
// right real classifier/tool instead of relying purely on free-text intent
// guessing.
const NAYAK_SERVICES = [
  {
    id: 'currency',
    mode: 'currency',
    label: 'Currency',
    icon: '💵',
    badge: 'CNN & RBI Rulebook',
    type: 'upload',
    accept: 'image/*',
  },
  {
    id: 'scam-message',
    mode: 'scam_message',
    label: 'Scam Msg',
    icon: '✉️',
    badge: 'Script Pattern AI',
    type: 'query',
  },
  {
    id: 'link-detection',
    mode: 'link_detection',
    label: 'Link Detection',
    icon: '🔗',
    badge: 'Domain Verifier',
    type: 'query',
  },
  {
    id: 'scam-call',
    mode: 'scam_call',
    label: 'Scam Call',
    icon: '📞',
    badge: 'Voice/Video Upload',
    type: 'upload',
    accept: 'audio/mpeg,audio/mp3,.mp3,video/mp4,.mp4',
  },
  {
    id: 'law-check',
    mode: 'law_check',
    label: 'Law Check',
    icon: '⚖️',
    badge: 'BNS Rulebook',
    type: 'query',
  },
];

function formatForensicVerdict(v) {
  if (!v || v.verdict === 'PENDING_ANALYSIS') {
    return `### 🛡️ Forensic Scanner Verdict

#### ⏳ **Analysis Pending**
The AI classifier is currently offline or unreachable. Your evidence has been securely stored. Please try again in a moment.`;
  }

  // Clean raw details text: strip em dashes, semicolons, raw technical tokens
  let raw = (v.details || '')
    .replace(/—/g, ': ')
    .replace(/–/g, ': ')
    .replace(/;+/g, '.')
    .replace(/\s+\./g, '.')
    .replace(/\.\s*\./g, '.');

  const isAuthentic = v.is_authenticated === true;
  const isSuspicious = v.is_authenticated === false;
  // v.score is the verdict-coherent authenticity score (0-100, high = genuine).
  // For suspicious verdicts we present it inverted as Risk so a big number
  // always means "bad" — mixing the two directions was genuinely confusing.
  const scoreText = v.score != null ? `${Number(v.score).toFixed(1)}%` : null;
  const riskText = v.score != null ? `${(100 - Number(v.score)).toFixed(1)}%` : null;
  const structuralFlag = v.verdict_basis === 'structural_red_flag';

  // Split details into readable bullet points. Short trailing fragments (a
  // semicolon-joined clause that became its own "sentence" once semicolons
  // were normalized to periods above) get merged back into the previous
  // point instead of becoming a disconnected one-line bullet — splitting
  // every clause into its own bullet read as mechanical, fragmented "AI
  // slop" rather than a clean findings list.
  const MIN_STANDALONE_LEN = 45;
  const rawSentences = raw
    .split(/\.\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.toLowerCase().startsWith('currency screening') && !s.toLowerCase().startsWith('analysis mode'));

  const mergedSentences = [];
  for (const s of rawSentences) {
    if (mergedSentences.length > 0 && s.length < MIN_STANDALONE_LEN) {
      mergedSentences[mergedSentences.length - 1] += `, ${s.charAt(0).toLowerCase()}${s.slice(1)}`;
    } else {
      mergedSentences.push(s);
    }
  }

  const bullets = mergedSentences.map(s => {
    let clean = s
      .replace(/LIKELY_COUNTERFEIT/gi, 'Likely Counterfeit')
      .replace(/LIKELY_GENUINE/gi, 'Likely Authentic')
      .replace(/cnn\+heuristic/gi, 'Computer Vision & RBI Rulebook')
      .replace(/\(-\d+%\s*change\)/gi, '')
      .replace(/shows NO ascending numeral growth/gi, 'shows non-ascending font height (genuine RBI notes have numerals growing in size from left to right)');
    return `- ${clean.endsWith('.') ? clean : clean + '.'}`;
  });

  if (isSuspicious) {
    return `### 🛡️ Forensic Scanner Verdict

#### ❌ **Flagged Suspicious Currency Note**
**Risk Level:** ${riskText || 'High'}${structuralFlag ? '\n\n> Decisive factor: a specific security feature failed (see findings below). The risk figure summarizes overall evidence strength on a 0 to 100 scale; it is not a calibrated statistical probability.' : ''}

---

#### 🔍 **Key Findings**
${bullets.length > 0 ? bullets.join('\n\n') : '* Security features do not match RBI authentic currency standards.'}

---

#### 📋 **Recommended Action**
1. Do not return this currency note to circulation.
2. Have it physically verified (watermark, latent image, UV test) at a bank branch.
3. If you received this note from an ATM, shop, or person, let me know where you received it so I can check for nearby reports and help you file a report.`;
  }

  if (isAuthentic) {
    return `### 🛡️ Forensic Scanner Verdict

#### ✅ **Verified Authentic Currency Note**
**Authenticity Score:** ${scoreText || 'Verified'}

---

#### 🔍 **Key Findings**
${bullets.length > 0 ? bullets.join('\n\n') : '* Key security features (RBI emblem, security thread, typography) match authentic standards.'}

---

#### 📋 **Recommended Action**
Physical verification (paper texture, raised print) at your local bank branch remains the final authority.`;
  }

  return `### 🛡️ Forensic Scanner Verdict

#### ℹ️ **Inspection Summary**
${bullets.length > 0 ? bullets.join('\n\n') : '* Media stored and analyzed.'}`;
}

// Heading styles by level (1-6). Levels 4-6 all share the h4-ish look —
// this renderer's messages never go deeper than #### in practice, but a
// generic 1-6 match means a stray extra hash never falls through to
// plain text and shows up as a literal '#####' on screen.
const HEADING_STYLE = {
  1: 'text-sm font-black text-ink font-sora mt-2 mb-1 border-b border-amber-400/20 pb-1',
  2: 'text-xs font-black text-ink font-sora mt-2 mb-1',
  3: 'text-xs font-bold text-[#b08850] uppercase tracking-wider font-mono mt-2 mb-1',
  4: 'text-xs font-bold text-[#b08850] uppercase tracking-wider font-mono mt-2 mb-1',
  5: 'text-xs font-bold text-[#b08850] uppercase tracking-wider font-mono mt-2 mb-1',
  6: 'text-xs font-bold text-[#b08850] uppercase tracking-wider font-mono mt-2 mb-1',
};

/**
 * Inline formatting: **bold** only (this app never emits italics/links/code
 * spans in chat text). Any stray, unpaired '**' left over after well-formed
 * pairs are extracted is stripped rather than shown — a source string with
 * odd markup should never leak raw asterisks onto the screen.
 */
function renderInline(text) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, pIdx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={pIdx} className="font-extrabold text-ink bg-amber-400/25 px-1 py-0.5 rounded text-[11px] font-sora">{part.slice(2, -2)}</strong>;
    }
    return part.includes('**') ? part.replace(/\*\*/g, '') : part;
  });
}

function MarkdownMessage({ content }) {
  if (!content) return null;
  const str = typeof content === 'string' ? content : (typeof content === 'object' ? JSON.stringify(content) : String(content));
  const lines = str.split('\n');
  return (
    <div className="space-y-1.5 leading-relaxed select-text font-sans text-xs text-ink">
      {lines.map((line, idx) => {
        if (!line.trim()) return <div key={idx} className="h-1" />;

        if (line.trim() === '---' || line.trim() === '***') {
          return <hr key={idx} className="my-2 border-amber-400/20" />;
        }

        const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const Tag = `h${Math.min(level, 3)}`;
          return <Tag key={idx} className={HEADING_STYLE[level]}>{renderInline(headingMatch[2])}</Tag>;
        }
        if (line.startsWith('> ')) {
          return <blockquote key={idx} className="border-l-3 border-[#E9BA26] bg-amber-50/80 p-2.5 rounded-r-xl my-1 text-xs italic text-ink">{renderInline(line.slice(2))}</blockquote>;
        }

        // A real bullet marker is a single •/-/* followed by whitespace —
        // NOT a double-asterisk bold line (**Label:** ...), which used to
        // get misdetected as a bullet and rendered with a stray extra dot.
        const bulletMatch = line.trim().match(/^(?:•|-|\*(?!\*))\s+(.*)$/);
        if (bulletMatch) {
          return (
            <div key={idx} className="flex gap-2 items-start my-0.5 pl-1">
              <span className="text-[#b08850] font-bold text-xs">•</span>
              <span className="flex-1 font-semibold">{renderInline(bulletMatch[1])}</span>
            </div>
          );
        }

        const orderedMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
        if (orderedMatch) {
          return (
            <div key={idx} className="flex gap-2 items-start my-0.5 pl-1">
              <span className="text-[#b08850] font-bold text-xs shrink-0">{orderedMatch[1]}.</span>
              <span className="flex-1 font-semibold">{renderInline(orderedMatch[2])}</span>
            </div>
          );
        }

        return <p key={idx} className="font-semibold text-ink leading-relaxed">{renderInline(line)}</p>;
      })}
    </div>
  );
}

export default function AlertsChatView() {
  const [messages, setMessages] = useState([
    {
      id: 'msg-1',
      sender: 'bot',
      text: "⚖️ Hello! I am **Nayak AI**, your law-backed legal and public threat counsel.\n\nAsk me about:\n- **Legal Rights & Laws**: BNS, Motor Vehicles Act, CrPC provisions & police power boundaries\n- **Scam & Fraud Verification**: Digital arrest calls, counterfeit currency, WhatsApp warnings\n- **Civic Incidents**: Ward safety, emergency SOS routing & incident filings.",
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
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);
  const [language, setLanguage] = useState(() => localStorage.getItem('nayak_language') || 'English');
  const [translatingId, setTranslatingId] = useState(null);

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('nayak_language', lang);
  };

  const handleTranslateMessage = async (msg) => {
    if (language === 'English') return;
    if (msg.translatedText) {
      // Toggle back to original on second click.
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, translatedText: null, translationFailed: false } : m)));
      return;
    }
    setTranslatingId(msg.id);
    try {
      const res = await translateText(msg.text, language);
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, translatedText: res.translated_text, translationFailed: !res.translated } : m)));
    } catch (err) {
      console.error('[TRANSLATE FAILED]', err);
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, translationFailed: true } : m)));
    } finally {
      setTranslatingId(null);
    }
  };
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

  const processFile = async (file) => {
    if (!file || busy) return;

    setBusy(true);
    const previewUrl = URL.createObjectURL(file);
    const isImg = file.type.startsWith('image/');
    const isVid = file.type.startsWith('video/');
    const isAud = file.type.startsWith('audio/') || /\.mp3$/i.test(file.name);
    const userMsg = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: isAud ? `🎙️ Attached audio: ${file.name}` : `Attached media: ${file.name}`,
      mediaUrl: isAud ? null : previewUrl,
      isImage: isImg,
      isVideo: isVid,
      timestamp: now()
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const mediaType = isImg ? 'image' : isVid ? 'video' : isAud ? 'audio' : 'other';
      if (mediaType === 'other') {
        pushBot("📄 That file type isn't supported yet. Upload an image, video (mp4), or audio (mp3), or describe it as text.");
        return;
      }

      let activeSess = sessionId;
      if (!activeSess) {
        const initRes = await sendChat({ message: 'Media Inspection Request', lat: coords.lat, lng: coords.lng });
        activeSess = initRes.session_id;
        setSessionId(activeSess);
        localStorage.setItem('nayak_session_id', activeSess);
      }

      const realUrl = await uploadMediaBlob(file, { filename: file.name });
      if (!realUrl) {
        pushBot('⚠️ Could not store your file (media storage unreachable). Nothing was analyzed — no verdict was fabricated. Please retry in a moment.');
        return;
      }

      const mediaRes = await uploadMedia({ mediaUrl: realUrl, mediaType, sessionId: activeSess });
      const v = mediaRes.verdict || {};

      const formattedVerdict = formatForensicVerdict(v);
      const isScamAlert = v.is_authenticated === false;
      const isGoodAuthentic = v.is_authenticated === true;
      pushBot(formattedVerdict, { isScamAlert, isGoodAuthentic });
    } catch (err) {
      console.error('[MEDIA ATTACH FAILED]', err);
      pushBot('⚠️ Unable to upload file for verification. Try submitting via Camera tab.');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileAttach = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingFile) setIsDraggingFile(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.relatedTarget === null || !e.currentTarget.contains(e.relatedTarget)) {
      setIsDraggingFile(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1 || item.type.indexOf('video') !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          processFile(blob);
          return;
        }
      }
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
      const res = await sendChat({ sessionId, message: query, lat: coords.lat, lng: coords.lng, lang: language, mode: selectedMode });
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

      await createReport({
        id: repId,
        title,
        description,
        category: p.category || 'Emergency Alert',
        severity: p.severity || 'HIGH',
        source: REPORT_SOURCES.ANONYMOUS_APP,
        coordinates: { lat: coords.lat, lng: coords.lng },
        status: 'SUBMITTED',
        route: routing.suggested_department || 'POLICE',
        department: routing.suggested_department || 'POLICE',
        user_hash: getAnonUserId(),
      });

      if (sessionId) {
        try {
          const hist = await getMessages(sessionId);
          const lastBot = hist?.slice().reverse().find((m) => m.role === 'bot');
          const up = lastBot?.uploads?.[0];
          if (up?.id) await linkReport(up.id, repId);
        } catch (linkErr) {
          console.warn('[PROPOSAL] evidence link skipped:', linkErr);
        }
      }

      pushBot(`✅ REPORT FILED (#${repId.slice(-6)}) to **${routing.suggested_department || 'POLICE'}**. Check Citizen Profile for status.`);
    } catch (err) {
      console.error('[PROPOSAL FILE FAILED]', err);
      pushBot('⚠️ Failed to submit report automatically. Please try submitting via the Camera tab.');
    }
  };

  const handleEmergencyDispatch = async (e) => {
    e.preventDefault();
    if (emDispatching) return;
    setEmDispatching(true);

    try {
      const repId = newReportId();
      const title = `EMERGENCY SOS: ${emCategory}`;
      const description = emDescription.trim() || 'Immediate emergency alert dispatched by citizen via SOS button.';
      const routing = await routeReport(title, description, emCategory);

      await createReport({
        id: repId,
        title,
        description,
        category: emCategory,
        severity: 'CRITICAL',
        source: REPORT_SOURCES.ANONYMOUS_APP,
        coordinates: { lat: coords.lat, lng: coords.lng },
        status: 'SUBMITTED',
        route: routing.suggested_department || 'POLICE',
        department: routing.suggested_department || 'POLICE',
        user_hash: getAnonUserId(),
      });

      if (emFile) {
        try {
          const activeSess = sessionId || (await sendChat({ message: 'Emergency attachment', lat: coords.lat, lng: coords.lng })).session_id;
          const mediaType = emFile.type.startsWith('image/') ? 'image' : emFile.type.startsWith('video/') ? 'video' : 'other';
          const realUrl = await uploadMediaBlob(emFile, { filename: emFile.name });
          const up = await uploadMedia({
            mediaUrl: realUrl,
            mediaType,
            sessionId: activeSess,
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
      pushBot('⚠️ DISPATCH FAILED — your emergency was NOT filed. Please retry, use the Camera tab, or call 112 directly if urgent.');
    } finally {
      setEmDispatching(false);
    }
  };

  const handleServiceClick = (service) => {
    const nowSelected = selectedMode === service.mode ? null : service.mode;
    setSelectedMode(nowSelected);
    if (nowSelected && service.type === 'upload' && fileInputRef.current) {
      fileInputRef.current.accept = service.accept || 'image/*,video/*';
      fileInputRef.current.click();
    }
  };

  const chipStyle = {
    padding: '6px 12px', borderRadius: '16px', border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc', fontSize: '11px', color: '#09090B', cursor: 'pointer',
    whiteSpace: 'nowrap', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '5px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)', flexShrink: 0, transition: 'all 0.15s ease'
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      className="flex-1 flex flex-col h-full bg-white font-sans text-ink overflow-hidden select-text relative"
    >
      
      {/* Drag & Drop Full Page Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 bg-[#ffd900]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-slate-950 border-4 border-dashed border-slate-950 m-2 rounded-3xl pointer-events-none animate-pulse">
          <span className="text-5xl mb-3">📥</span>
          <h3 className="font-sora text-xl font-black uppercase tracking-wider text-center">
            Drop File Anywhere to Attach
          </h3>
          <p className="text-xs font-bold text-slate-800 mt-1 font-mono text-center">
            Nayak AI will instantly run forensic inspection
          </p>
        </div>
      )}

      {/* Header — Restored with top notch safety margin */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-amber-400/20 flex items-center justify-between flex-none md:px-6 md:pt-6 md:pb-3">
        <div>
          <span className="text-[9px] font-bold text-[#b08850] uppercase tracking-widest block font-mono">
            LAW-BACKED LEGAL &amp; THREAT COUNSEL
          </span>
          <h2 className="text-lg font-black text-ink font-sora md:text-xl">
            Nayak <span className="font-serif italic font-normal text-[#b08850] pr-1">AI Counsel</span>
          </h2>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          <select
            value={language}
            onChange={(e) => changeLanguage(e.target.value)}
            title="Reply language"
            className="w-14 md:w-auto text-[9px] md:text-[10px] font-bold text-ink-soft border border-amber-400/30 rounded-lg px-1 md:px-1.5 py-1.5 bg-white uppercase tracking-wider font-mono focus:outline-none"
          >
            {SUPPORTED_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <button
            onClick={() => setEmergencyOpen(true)}
            className="px-2.5 md:px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs uppercase tracking-wider font-sora animate-pulse shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span className="hidden sm:inline">Emergency </span>SOS
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {messages.map((m, index) => {
          const isUser = m.sender === 'user';
          const textLower = m.text?.toLowerCase() || '';
          const isScamAlert = m.isScamAlert || textLower.includes('flagged suspicious') || textLower.includes('scam') || textLower.includes('likely counterfeit') || textLower.includes('high risk') || textLower.includes('❌');
          const isGoodAuthentic = m.isGoodAuthentic || textLower.includes('verified authentic') || textLower.includes('low risk') || textLower.includes('authentic currency note') || textLower.includes('✅');

          let cardStyle = "bg-white border border-amber-400/25 text-ink rounded-bl-none";
          let badgeStyle = "text-ink-soft";
          let badgeText = "⚖️ Nayak AI Counsel";

          if (!isUser) {
            if (isScamAlert) {
              cardStyle = "bg-red-50/95 border-2 border-red-500/50 text-red-950 rounded-bl-none shadow-sm";
              badgeStyle = "text-red-700 font-extrabold";
              badgeText = "🚨 SCAM / THREAT ALERT — NAYAK AI";
            } else if (isGoodAuthentic) {
              cardStyle = "bg-emerald-50/95 border-2 border-emerald-500/50 text-emerald-950 rounded-bl-none shadow-sm";
              badgeStyle = "text-emerald-700 font-extrabold";
              badgeText = "✅ VERIFIED AUTHENTIC — NAYAK AI";
            }
          }

          return (
            <React.Fragment key={m.id}>
              <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-md rounded-2xl p-4 shadow-xs ${
                  isUser 
                    ? 'bg-[#E9BA26] text-ink font-semibold border border-amber-950/10 rounded-br-none' 
                    : cardStyle
                }`}>
                  <div className="flex items-center justify-between gap-4 mb-1.5 pb-1 border-b border-amber-400/10">
                    <span className={`text-[10px] font-bold uppercase tracking-wider font-mono flex items-center gap-1 ${badgeStyle}`}>
                      {isUser ? 'You' : badgeText}
                    </span>
                    <span className="text-[9px] font-medium text-ink-faint">{m.timestamp}</span>
                  </div>
                  
                  {isUser ? (
                    <div>
                      <p className="text-xs leading-relaxed font-semibold whitespace-pre-wrap">{m.text}</p>
                      {m.mediaUrl && (
                        <div className="mt-2.5 rounded-xl overflow-hidden border border-amber-950/20 max-w-xs shadow-xs bg-slate-900">
                          {!m.isVideo && (m.isImage || m.mediaUrl.startsWith('blob:') || m.mediaUrl.startsWith('data:image') || m.mediaUrl.match(/\.(jpeg|jpg|png|webp|gif)/i)) ? (
                            <img 
                              src={m.mediaUrl} 
                              alt="Uploaded Evidence" 
                              className="w-full h-auto max-h-56 object-cover rounded-xl transition-transform hover:scale-105" 
                            />
                          ) : (
                            <video 
                              src={m.mediaUrl} 
                              controls 
                              className="w-full h-auto max-h-56 object-cover rounded-xl" 
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <MarkdownMessage content={m.translatedText || m.text} />
                      {language !== 'English' && (
                        <button
                          onClick={() => handleTranslateMessage(m)}
                          disabled={translatingId === m.id}
                          className="mt-1 text-[9px] font-bold text-[#b08850] uppercase tracking-wider disabled:opacity-50"
                        >
                          {translatingId === m.id
                            ? `🌐 Translating to ${language}...`
                            : m.translatedText
                              ? `Showing ${language} translation ↺ view original`
                              : `🌐 Translate to ${language}`}
                        </button>
                      )}
                      {m.translationFailed && (
                        <p className="mt-1 text-[9px] text-red-500">Translation service unreachable — showing original text.</p>
                      )}
                    </div>
                  )}

                  {m.proposal && (
                    <div className="mt-3 pt-2 border-t border-amber-400/20">
                      <span className="text-[9px] font-bold text-[#b08850] uppercase tracking-wider block mb-1.5">📋 Proposed Report: Needs your confirmation</span>
                      <div className="text-[10px] text-ink-soft font-semibold space-y-0.5 mb-2">
                        {m.proposal.category && <div>Category: {m.proposal.category}</div>}
                        {m.proposal.suggested_department && <div>Department: {m.proposal.suggested_department}</div>}
                        {m.proposal.severity && <div>Severity: {m.proposal.severity}</div>}
                        {m.proposal.nearby_similar_count > 0 && <div>⚠ {m.proposal.nearby_similar_count} similar report(s) near you</div>}
                      </div>
                      {m.resolved ? (
                        <span className="text-[10px] font-bold text-ink-soft">{m.resolved === 'filed' ? '✅ Filed' : 'Not filed'}</span>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => handleProposalDecision(m.id, true)}
                            className="px-3 py-1.5 bg-[#E9BA26] text-ink rounded-lg text-[10px] font-bold uppercase tracking-wider">
                            File report
                          </button>
                          <button onClick={() => handleProposalDecision(m.id, false)}
                            className="px-3 py-1.5 bg-white border border-amber-200 text-ink-soft rounded-lg text-[10px] font-bold uppercase tracking-wider">
                            Not now
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-amber-400/20 space-y-1">
                      <span className="text-[9px] font-bold text-[#b08850] uppercase tracking-wider block">Legal Citations:</span>
                      {m.citations.map((cite, i) => (
                        <span key={i} className="inline-block px-2 py-0.5 bg-amber-400/10 text-[#b08850] rounded border border-amber-400/20 text-[9px] font-bold mr-1.5 mb-1">
                          🔖 {cite}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </React.Fragment>
          );
        })}

        {busy && (
          <div className="flex justify-start">
            <div className="bg-white border border-amber-400/20 rounded-2xl p-3 text-xs text-ink-soft font-bold flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-[#E9BA26] border-t-transparent rounded-full animate-spin" />
              Nayak AI is consulting legal rulebooks &amp; incident DB...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Nayak mode tags — tap to select; whatever you send next (text or a
          file) carries this mode to the backend so it routes deterministically
          instead of guessing intent from free text. Tap again to deselect. */}
      <div
        style={{
          padding: '8px 12px',
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          backgroundColor: '#ffffff',
          borderTop: '1px solid #f1f5f9',
          whiteSpace: 'nowrap'
        }}
      >
        {NAYAK_SERVICES.map((s) => {
          const isActive = selectedMode === s.mode;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => handleServiceClick(s)}
              style={{
                ...chipStyle,
                ...(isActive
                  ? { backgroundColor: '#E9BA26', borderColor: '#c99a1a', color: '#09090b', fontWeight: 800 }
                  : {}),
              }}
              title={s.badge}
            >
              {s.icon} {s.label}{isActive ? ' ✓' : ''}
            </button>
          );
        })}
      </div>
      {selectedMode && (
        <p className="px-3 pb-1 text-[10px] font-semibold text-[#b08850] bg-white">
          {NAYAK_SERVICES.find((s) => s.mode === selectedMode)?.icon} {NAYAK_SERVICES.find((s) => s.mode === selectedMode)?.label} mode active
          {NAYAK_SERVICES.find((s) => s.mode === selectedMode)?.type === 'upload' ? ' — pick a file, or tap again to cancel.' : ' — type your message below.'}
        </p>
      )}

      {/* Input Bar */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-amber-400/20 flex items-center gap-2 flex-none">
        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleFileAttach}
          className="hidden"
          accept="image/*,video/*,audio/*"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-400/30 text-[#b08850] rounded-xl transition-all disabled:opacity-50 shrink-0"
          title="Attach document or media"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
        </button>

        <textarea 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
          placeholder="Talk to Nayak AI... (Shift + Enter for new line)"
          disabled={busy}
          rows={1}
          className="flex-1 bg-slate-50 border border-amber-400/20 rounded-xl px-4 py-2.5 text-xs text-ink placeholder-slate-400 focus:outline-none focus:border-[#E9BA26] font-semibold resize-none max-h-32 min-h-[44px]"
        />

        <button
          type="submit"
          disabled={busy || !inputText.trim()}
          className="p-3 bg-[#E9BA26] hover:bg-amber-400 text-ink font-bold rounded-xl border border-amber-950/10 transition-all disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </form>

      {/* Emergency Dispatch Modal */}
      {emergencyOpen && (
        <div className="fixed inset-0 z-50 bg-amber-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-red-500 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-amber-100 pb-3">
              <h3 className="font-black text-red-600 text-base font-sora flex items-center gap-2">
                🚨 Direct Emergency Dispatch
              </h3>
              <button onClick={() => setEmergencyOpen(false)} className="text-ink-faint hover:text-ink-soft">
                ✕
              </button>
            </div>

            <form onSubmit={handleEmergencyDispatch} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-1">
                  Incident Category
                </label>
                <select
                  value={emCategory}
                  onChange={(e) => setEmCategory(e.target.value)}
                  className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs font-bold text-ink"
                >
                  {EMERGENCY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-1">
                  Emergency Description
                </label>
                <textarea
                  rows={3}
                  value={emDescription}
                  onChange={(e) => setEmDescription(e.target.value)}
                  placeholder="State immediate danger details, address, or landmarks..."
                  className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs font-semibold text-ink focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEmergencyOpen(false)}
                  className="px-4 py-2.5 bg-amber-50 text-ink-soft font-bold rounded-xl text-xs"
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
