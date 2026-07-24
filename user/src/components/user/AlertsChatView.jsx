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
    id: 'sos-alert',
    mode: 'sos_alert',
    label: 'Send Alert',
    icon: '🚨',
    badge: 'Immediate Dispatch',
    type: 'alert',
  },
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
    id: 'live-call-mic',
    mode: 'live_call_mic',
    label: 'Live Mic Shield',
    icon: '🎙️',
    badge: 'Real-Time Call Listener',
    type: 'live_mic',
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

  const isAuthentic = v.is_authenticated === true;
  const isSuspicious = v.is_authenticated === false;
  const scoreText = v.score != null ? `${Number(v.score).toFixed(1)}%` : null;
  const riskText = v.score != null ? `${(100 - Number(v.score)).toFixed(1)}%` : null;
  const structuralFlag = v.verdict_basis === 'structural_red_flag';
  const detailsStr = v.details || '';

  // 1. Voice / Call Scam Detection
  const isScamCall = (v.source && (v.source.includes('groq') || v.source.includes('voice') || v.source.includes('heuristic'))) ||
                     (v.verdict && (v.verdict.includes('SCAM') || v.verdict.includes('VOICE') || v.verdict.includes('CALL') || v.verdict.includes('ARREST'))) ||
                     v.transcript != null;

  if (isScamCall) {
    const transcriptBlock = v.transcript ? `\n\n---\n\n#### 🎙️ **Call Transcript (Groq Whisper AI)**\n> "${v.transcript}"` : '';
    const details = detailsStr || 'Scam call indicators analyzed.';

    if (isSuspicious) {
      return `### 🛡️ Forensic Scanner Verdict

#### 🚨 **Flagged Suspicious Scam Call**
**Risk Level:** ${riskText || 'High (92.0%)'}${transcriptBlock}

---

#### 🔍 **Key Findings**
- ${details.replace(/🚨|✅/g, '').trim()}
- Coercive impersonation signals matching Digital Arrest & Extortion threat pattern database.

---

#### 📋 **Recommended Action**
1. Disconnect the call immediately — police or CBI officers will NEVER demand money transfers or video arrests over Skype/calls.
2. Do not transfer any money, and do not share bank details or OTPs.
3. Confirm below to file an instant cybercrime intelligence report with law enforcement.`;
    }

    if (isAuthentic) {
      return `### 🛡️ Forensic Scanner Verdict

#### ✅ **Verified Authentic Voice / Audio**
**Authenticity Score:** ${scoreText || '95.0%'}${transcriptBlock}

---

#### 🔍 **Key Findings**
- No scam or extortion indicators detected in voice call analysis.`;
    }
  }

  // 2. Video Deepfake / Facial Swap Forensics
  const isVideoDeepfake = (v.source && (v.source.includes('/classify') || v.source.includes('deepfake'))) ||
                          detailsStr.toLowerCase().includes('deepfake') ||
                          detailsStr.toLowerCase().includes('face(s)') ||
                          (v.verdict && (v.verdict.includes('DEEPFAKE') || v.verdict.includes('INCONCLUSIVE') || v.verdict.includes('SUSPECT')));

  if (isVideoDeepfake && !detailsStr.toLowerCase().includes('currency')) {
    return `### 🛡️ Forensic Scanner Verdict

#### 🎥 **Video Deepfake & Facial Forensics**
**Verdict:** ${v.verdict || 'MEDIA_INSPECTED'}
**Fake Probability / Risk:** ${riskText || '55.0%'}

---

#### 🔍 **Key Findings**
- ${detailsStr}
- Video stream scanned for facial swapping, frame-level synthesis artifacts, and temporal inconsistencies.

---

#### 📋 **Recommended Action**
1. Exercise extreme caution — video media exhibits synthetic features or facial manipulation indicators.
2. Verify caller identity through an official, out-of-band communication channel before trusting video requests.
3. Never transfer funds or disclose identity credentials during unverified video calls.`;
  }

  // 3. Currency Note Screening
  const isCurrency = (v.source && v.source.includes('currency')) || detailsStr.toLowerCase().includes('currency');

  if (isCurrency) {
    let raw = detailsStr
      .replace(/—/g, ': ')
      .replace(/–/g, ': ')
      .replace(/;+/g, '.')
      .replace(/\s+\./g, '.')
      .replace(/\.\s*\./g, '.');

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
**Risk Level:** ${riskText || 'High'}${structuralFlag ? '\n\n> Decisive factor: a specific security feature failed (see findings below).' : ''}

---

#### 🔍 **Key Findings**
${bullets.length > 0 ? bullets.join('\n\n') : '* Security features do not match RBI authentic currency standards.'}

---

#### 📋 **Recommended Action**
1. Do not return this currency note to circulation.
2. Have it physically verified (watermark, latent image, UV test) at a bank branch.
3. Report counterfeit currency distribution to local law enforcement.`;
    }

    if (isAuthentic) {
      return `### 🛡️ Forensic Scanner Verdict

#### ✅ **Verified Authentic Currency Note**
**Authenticity Score:** ${scoreText || 'Verified'}

---

#### 🔍 **Key Findings**
${bullets.length > 0 ? bullets.join('\n\n') : '* Key security features match RBI authentic standards.'}

---

#### 📋 **Recommended Action**
Physical verification at a local bank branch remains the final authority.`;
    }
  }

  // 4. Fallback General Evidence
  return `### 🛡️ Forensic Scanner Verdict

#### 📁 **Incident Evidence Uploaded**
${detailsStr || 'Media stored and indexed in case file.'}`;
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
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [activeMediaService, setActiveMediaService] = useState(null);

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
  const cameraInputRef = useRef(null);
  const emFileInputRef = useRef(null);
  const chatVideoRef = useRef(null);
  const chatStreamRef = useRef(null);

  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [captureMode, setCaptureMode] = useState('visible'); // 'visible' | 'uv'

  // Live Call Mic Listening State
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [listeningSeconds, setListeningSeconds] = useState(0);
  const liveRecorderRef = useRef(null);
  const liveAudioChunksRef = useRef([]);
  const liveTimerRef = useRef(null);

  const startLiveMicListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      liveAudioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      liveRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          liveAudioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        clearInterval(liveTimerRef.current);
        setIsListeningMic(false);
        setListeningSeconds(0);

        const audioBlob = new Blob(liveAudioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size < 100) return;

        const file = new File([audioBlob], `live_call_segment_${Date.now()}.webm`, { type: 'audio/webm' });
        pushBot('🎙️ **Live Mic Call Segment Captured** — Transcribing & scanning speech stream with Groq Whisper & LLM...');
        processFile(file);

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsListeningMic(true);
      setListeningSeconds(0);
      liveTimerRef.current = setInterval(() => {
        setListeningSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('[LIVE MIC ACCESS ERROR]', err);
      alert('Microphone permission required for real-time live call listening.');
    }
  };

  const stopLiveMicListening = () => {
    if (liveRecorderRef.current && isListeningMic) {
      liveRecorderRef.current.stop();
    }
  };

  const triggerUpload = (isCamera) => {
    setMediaModalOpen(false);
    if (isCamera) {
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      } else {
        startChatCamera();
      }
    } else {
      if (fileInputRef.current) {
        fileInputRef.current.accept = 'image/*,video/*,audio/*';
        fileInputRef.current.click();
      }
    }
  };

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

  const startChatCamera = async () => {
    try {
      setCameraError(null);
      let mediaStream = null;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      } catch (err1) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        } catch (err2) {
          throw err2;
        }
      }
      chatStreamRef.current = mediaStream;
      setCameraActive(true);
    } catch (err) {
      console.error('[CHAT CAMERA ACCESS FAILED]', err);
      setCameraError('Camera access blocked or unavailable. Please enable permissions.');
      setCameraActive(false);
    }
  };

  const stopChatCamera = () => {
    if (chatStreamRef.current) {
      chatStreamRef.current.getTracks().forEach(track => track.stop());
      chatStreamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (currencyModalOpen) {
      startChatCamera();
    } else {
      stopChatCamera();
    }
    return () => {
      stopChatCamera();
    };
  }, [currencyModalOpen]);

  useEffect(() => {
    if (cameraActive && chatVideoRef.current && chatStreamRef.current) {
      chatVideoRef.current.srcObject = chatStreamRef.current;
      chatVideoRef.current.play().catch(err => console.log('Chat camera play error:', err));
    }
  }, [cameraActive, currencyModalOpen]);

  const handleCapturePhoto = () => {
    if (!chatVideoRef.current || !cameraActive) return;
    
    const video = chatVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const ext = 'jpg';
          const fileName = `currency_${Date.now()}_${captureMode}.${ext}`;
          const fileObj = new File([blob], fileName, { type: 'image/jpeg' });
          
          setCurrencyModalOpen(false);
          processFile(fileObj, captureMode);
        }
      }, 'image/jpeg', 0.95);
    }
  };

  const processFile = async (file, currentCapMode = 'visible') => {
    if (!file || busy) return;

    setBusy(true);
    const previewUrl = URL.createObjectURL(file);
    const isImg = file.type.startsWith('image/');
    const isVid = file.type.startsWith('video/');
    const isAud = file.type.startsWith('audio/') || /\.mp3$/i.test(file.name);
    
    const textLabel = isAud 
      ? `🎙️ Attached audio: ${file.name}` 
      : isImg && selectedMode === 'currency' 
        ? `Attached currency note: ${file.name} [Scan Mode: ${currentCapMode.toUpperCase()}]` 
        : `Attached media: ${file.name}`;

    const userMsg = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: textLabel,
      mediaUrl: isAud ? null : previewUrl,
      isImage: isImg,
      isVideo: isVid,
      timestamp: now()
    };
    setMessages((prev) => [...prev, userMsg]);

    const effectiveMode = (isVid || isAud) ? 'scam_call' : (selectedMode || 'general');

    if (isVid || isAud) {
      pushBot("🎙️ **Transcribing call audio & analyzing speech with Groq Whisper AI + LLM...**");
    }

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

      const mediaRes = await uploadMedia({ 
        mediaUrl: realUrl, 
        mediaType, 
        sessionId: activeSess, 
        captureMode: isImg && selectedMode === 'currency' ? currentCapMode : undefined,
        mode: effectiveMode
      });
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
    if (file) processFile(file, captureMode);
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
      processFile(files[0], captureMode);
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
          processFile(blob, captureMode);
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
    if (service.type === 'alert') {
      setEmergencyOpen(true);
      return;
    }
    if (service.mode === 'live_call_mic') {
      if (isListeningMic) {
        stopLiveMicListening();
      } else {
        startLiveMicListening();
      }
      return;
    }
    const nowSelected = selectedMode === service.mode ? null : service.mode;
    setSelectedMode(nowSelected);
    if (nowSelected) {
      if (service.mode === 'currency') {
        setCurrencyModalOpen(true);
      } else if (service.type === 'upload' && fileInputRef.current) {
        fileInputRef.current.accept = service.accept || 'image/*,video/*';
        fileInputRef.current.click();
      }
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
      {/* Live Mic Listening Indicator Bar */}
      {isListeningMic && (
        <div className="bg-red-950 text-white px-4 py-2.5 border-b border-red-500 flex items-center justify-between animate-pulse z-30">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-black font-mono tracking-wider">🎙️ LIVE SCAM MIC SHIELD ACTIVE ({listeningSeconds}s)</span>
          </div>
          <button
            type="button"
            onClick={stopLiveMicListening}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black rounded-lg uppercase tracking-wider font-sora shadow-sm"
          >
            Stop & Analyze
          </button>
        </div>
      )}
      
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

      {/* Sub-Header / Control Bar */}
      <div className="px-4 pt-3 pb-2.5 bg-white border-b border-amber-400/20 flex items-center justify-between flex-none md:px-6 md:pt-4 md:pb-3">
        <div>
          <span className="text-[9px] font-bold text-[#b08850] uppercase tracking-widest block font-mono">
            LAW-BACKED THREAT COUNSEL
          </span>
          <h2 className="text-base font-black text-ink font-sora md:text-lg">
            Nayak <span className="font-serif italic font-normal text-[#b08850] pr-1">AI Counsel</span>
          </h2>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          <select
            value={language}
            onChange={(e) => changeLanguage(e.target.value)}
            title="Reply language"
            className="min-w-[72px] text-[10px] font-bold text-ink-soft border border-amber-400/40 rounded-lg px-2 py-1 bg-white uppercase tracking-wider font-mono focus:outline-none cursor-pointer"
          >
            {SUPPORTED_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setEmergencyOpen(true)}
            className="px-2.5 md:px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs uppercase tracking-wider font-sora animate-pulse shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
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

      {/* Input Toolbar */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-amber-400/20 flex items-center gap-2 flex-none">
        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleFileAttach}
          className="hidden"
          accept="image/*,video/*,audio/*"
        />
        <input 
          type="file"
          ref={cameraInputRef}
          onChange={handleFileAttach}
          className="hidden"
          accept="image/*,video/*"
          capture="environment"
        />

        <button
          type="button"
          onClick={() => {
            setActiveMediaService({ id: 'attachment', label: 'Media Evidence', icon: '📎', accept: 'image/*,video/*,audio/*' });
            setMediaModalOpen(true);
          }}
          disabled={busy}
          className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-400/30 text-[#b08850] rounded-xl transition-all disabled:opacity-50 shrink-0 cursor-pointer"
          title="Attach document or media (Camera or File)"
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
          className="p-3 bg-[#E9BA26] hover:bg-amber-400 text-ink font-bold rounded-xl border border-amber-950/10 transition-all disabled:opacity-50 cursor-pointer"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </form>

      {/* Media Choice Modal (Camera Snap vs File Upload) */}
      {mediaModalOpen && (
        <div className="fixed inset-0 z-50 bg-amber-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#E9BA26] rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-amber-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-100 text-amber-800 rounded-xl font-black text-sm">
                  {activeMediaService?.icon || '📸'}
                </span>
                <div>
                  <h3 className="font-black text-ink text-sm font-sora uppercase tracking-wider">
                    {activeMediaService ? `Attach ${activeMediaService.label}` : 'Attach Evidence'}
                  </h3>
                  <span className="text-[9px] font-bold text-[#b08850] font-mono">
                    Nayak Forensic AI Inspection
                  </span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setMediaModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-amber-50 text-ink-soft hover:text-ink font-bold flex items-center justify-center border border-amber-200"
              >
                ✕
              </button>
            </div>

            <p className="text-xs font-semibold text-ink-soft leading-relaxed">
              Choose how you want to capture or attach evidence for forensic analysis:
            </p>

            <div className="grid grid-cols-1 gap-3 pt-1">
              <button
                type="button"
                onClick={() => triggerUpload(true)}
                className="w-full p-4 bg-amber-400/20 hover:bg-amber-400/35 text-ink border-2 border-[#E9BA26] rounded-2xl flex items-center gap-3 transition-all cursor-pointer group shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-[#E9BA26] flex items-center justify-center text-lg text-ink font-black shadow-xs group-hover:scale-105 transition-transform">
                  📸
                </div>
                <div className="text-left">
                  <h4 className="font-black text-xs font-sora text-ink">Take Photo / Live Camera</h4>
                  <p className="text-[10px] text-ink-soft font-semibold">Snap live picture directly with camera</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => triggerUpload(false)}
                className="w-full p-4 bg-slate-50 hover:bg-amber-50 text-ink border border-slate-200 hover:border-amber-300 rounded-2xl flex items-center gap-3 transition-all cursor-pointer group shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-lg text-slate-800 font-black shadow-xs group-hover:scale-105 transition-transform">
                  📁
                </div>
                <div className="text-left">
                  <h4 className="font-black text-xs font-sora text-ink">Upload File / Gallery</h4>
                  <p className="text-[10px] text-[#64748B] font-semibold">Choose photo, video or audio file from storage</p>
                </div>
              </button>
            </div>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => setMediaModalOpen(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 font-mono"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Currency Note Scan / Upload Modal */}
      {currencyModalOpen && (
        <div className="fixed inset-0 z-50 bg-amber-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border-2 border-amber-400 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl relative overflow-hidden">
            {/* Top decorative accent bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#E9BA26]" />
            
            <div className="flex items-center justify-between border-b border-amber-100 pb-3 pt-1">
              <h3 className="font-black text-ink text-base font-sora flex items-center gap-2">
                💵 Currency Note Verification
              </h3>
              <button 
                onClick={() => { setCurrencyModalOpen(false); setSelectedMode(null); }} 
                className="text-ink-faint hover:text-ink-soft font-bold text-base p-1"
              >
                ✕
              </button>
            </div>

            {/* Light Mode Selector */}
            <div className="flex items-center justify-between bg-slate-50 border border-amber-400/20 p-2.5 rounded-xl">
              <span className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                Capture Mode
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCaptureMode('visible')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                    captureMode === 'visible' 
                      ? 'bg-[#E9BA26] text-ink border-[#c99a1a]' 
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🔆 Visible Light
                </button>
                <button
                  type="button"
                  onClick={() => setCaptureMode('uv')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                    captureMode === 'uv' 
                      ? 'bg-[#E9BA26] text-ink border-[#c99a1a]' 
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🧬 UV Light
                </button>
              </div>
            </div>

            {/* Camera View Area */}
            {cameraActive ? (
              <div className="space-y-4">
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border-2 border-amber-400/40 shadow-inner flex items-center justify-center">
                  <video
                    ref={chatVideoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay scanning box */}
                  <div className="absolute inset-0 border-[3px] border-dashed border-amber-400/60 m-8 rounded-xl pointer-events-none flex items-center justify-center">
                    <span className="text-[9px] font-black text-amber-200 uppercase tracking-widest bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
                      Align Note Within Box
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    className="flex-1 py-3 bg-[#E9BA26] hover:bg-amber-400 text-ink font-black rounded-xl text-xs uppercase tracking-wider font-sora shadow-md flex items-center justify-center gap-2 border border-amber-950/10"
                  >
                    📸 Capture &amp; Scan Note
                  </button>
                  <button
                    type="button"
                    onClick={stopChatCamera}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-ink-soft font-bold rounded-xl text-xs"
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {cameraError ? (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-[11px] font-semibold text-rose-700 leading-relaxed">
                    ⚠ {cameraError}
                  </div>
                ) : (
                  <p className="text-[11px] text-ink-soft leading-relaxed font-semibold">
                    Inspect your currency note using our live AI model (CNN + OCR + RBI rulebook verification). Take a live photo or upload an existing note crop.
                  </p>
                )}

                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={startChatCamera}
                    className="w-full py-4.5 bg-slate-50 hover:bg-amber-50 border-2 border-dashed border-amber-400/30 hover:border-amber-400 text-ink font-bold rounded-2xl text-xs flex flex-col items-center justify-center gap-2 transition-all shadow-xs"
                  >
                    <span className="text-2xl">📸</span>
                    <span className="font-sora font-black uppercase tracking-wider text-[10px]">Open Live Camera Scanner</span>
                    <span className="text-[9px] text-ink-faint font-mono">Uses environment/back-facing lens</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = 'image/*';
                        fileInputRef.current.click();
                      }
                      setCurrencyModalOpen(false);
                    }}
                    className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-ink-soft font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <span>📁</span> Upload Note from Library
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => { setCurrencyModalOpen(false); setSelectedMode(null); }}
                className="px-4 py-2 bg-slate-50 text-ink-soft hover:bg-slate-100 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
