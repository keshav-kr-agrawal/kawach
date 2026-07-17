import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, RefreshCw, AlertTriangle, Paperclip } from 'lucide-react';

export default function AlertsChatView() {
  const [messages, setMessages] = useState([
    {
      id: 'msg-1',
      sender: 'bot',
      text: "🛡️ Hello! I am Nayak, your KAWACH Safety Guard. You can ask me to evaluate local safety conditions, verify viral WhatsApp rumors, check safe route mappings, or get citation-backed answers on Indian law.",
      timestamp: '12:00 PM'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [checkingRumor, setCheckingRumor] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [userId, setUserId] = useState('default-citizen-uuid');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load user session history on mount
  useEffect(() => {
    let storedUid = localStorage.getItem('nayak_user_id');
    if (!storedUid) {
      storedUid = 'citizen-' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('nayak_user_id', storedUid);
    }
    setUserId(storedUid);

    const activeSess = localStorage.getItem('nayak_session_id');
    if (activeSess) {
      setSessionId(activeSess);
      fetchMessages(activeSess, storedUid);
    }
  }, []);

  const fetchMessages = async (sessId, uid) => {
    setCheckingRumor(true);
    try {
      const res = await fetch(`http://localhost:8000/api/nayak/sessions/${sessId}/messages`, {
        headers: { 'X-User-Id': uid }
      });
      if (res.ok) {
        const data = await res.json();
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
      }
    } catch (err) {
      console.error("[NAYAK] Failed to load messages:", err);
    } finally {
      setCheckingRumor(false);
    }
  };

  const startNewSession = () => {
    localStorage.removeItem('nayak_session_id');
    setSessionId(null);
    setMessages([
      {
        id: 'msg-start-' + Date.now(),
        sender: 'bot',
        text: "🛡️ Chat session reset. I am ready to evaluate new security issues, links, or BNS legal rights queries.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgId = 'user-' + Date.now();
    const newMsg = {
      id: userMsgId,
      sender: 'user',
      text: text,
      timestamp: timestamp
    };

    setMessages((prev) => [...prev, newMsg]);
    if (!textToSend) setInputText('');
    setCheckingRumor(true);

    try {
      const res = await fetch('http://localhost:8000/api/nayak/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: text,
          lat: 12.9716, // Bengaluru Urban Center
          lng: 77.5946
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.session_id && data.session_id !== sessionId) {
          setSessionId(data.session_id);
          localStorage.setItem('nayak_session_id', data.session_id);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: 'bot-' + Date.now(),
            sender: 'bot',
            text: data.message.content,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        throw new Error("Server returned HTTP " + res.status);
      }
    } catch (err) {
      console.error("[NAYAK] Chat call failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-err-' + Date.now(),
          sender: 'bot',
          text: "⚠️ **SYSTEM CONNECTION DEGRADED:**\n\nUnable to reach the active KAWACH safety node grid. Please make sure the backend command console (`police/backend`) is running.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setCheckingRumor(false);
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Determine media type
    let mediaType = 'text';
    if (file.type.startsWith('image/')) mediaType = 'image';
    else if (file.type.startsWith('video/')) mediaType = 'video';
    else if (file.type.startsWith('audio/')) mediaType = 'audio';

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgId = 'user-file-' + Date.now();
    
    // Add user message to chat indicating attachment
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: `📁 **Attached ${mediaType.toUpperCase()}:** ${file.name}`,
        timestamp: timestamp
      }
    ]);

    setCheckingRumor(true);

    try {
      const res = await fetch('http://localhost:8000/api/nayak/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        body: JSON.stringify({
          media_url: `uploads/${file.name}`,
          media_type: mediaType,
          session_id: sessionId
        })
      });

      if (res.ok) {
        const data = await res.json();
        const verdict = data.verdict;
        
        let botText = `🛡️ **KAWACH SCANNER VERDICT:**\n\n`;
        if (verdict.is_authenticated) {
          botText += `✅ **VERIFIED AUTHENTIC** (Confidence: ${(verdict.score).toFixed(1)}%)\n\n`;
        } else {
          botText += `❌ **FLAG SUSPICIOUS** (Trust Score: ${(verdict.score).toFixed(1)}%)\n\n`;
        }
        botText += `**Details:** ${verdict.details}`;

        setMessages((prev) => [
          ...prev,
          {
            id: 'bot-file-' + Date.now(),
            sender: 'bot',
            text: botText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        throw new Error("HTTP " + res.status);
      }
    } catch (err) {
      console.error("[NAYAK] File scan failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-file-err-' + Date.now(),
          sender: 'bot',
          text: "⚠️ **SCANNING ERROR:**\n\nUnable to reach the active KAWACH media verification nodes. Please verify the backend is running.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setCheckingRumor(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleQuickQuestion = (qText) => {
    handleSendMessage(qText);
  };

  const renderMessageText = (txt) => {
    if (!txt) return "";
    // Parse bold markdown **text**
    const parts = txt.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} style={{ fontWeight: '700', color: '#1E293B' }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="view-container" style={{ padding: '0 0 calc(70px + env(safe-area-inset-bottom)) 0', display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#ffffff' }}>
      
      {/* Safety Alert Broadcast Banner */}
      <div style={{
        background: '#fff5f5',
        borderBottom: '1px solid #ffe2e2',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#E11D48' // Soft Crimson
        }} className="pulse-red" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.05em', color: '#E11D48', textTransform: 'uppercase' }}>
            Broadcasting Safety Notice
          </span>
          <p style={{ margin: 0, fontSize: '11px', color: '#09090B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500' }}>
            High-speed water clogging logged on Outer Ring Road. Police advising detours.
          </p>
        </div>
        <button 
          onClick={startNewSession}
          title="New Chat Session"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '6px 10px',
            fontSize: '10px',
            color: '#64748B',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={10} />
          Reset Chat
        </button>
      </div>

      {/* Chat Messages Log */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        backgroundColor: '#ffffff'
      }} className="scroll-y">
        
        {messages.map((msg) => {
          const isBot = msg.sender === 'bot';

          return (
            <div 
              key={msg.id}
              style={{
                display: 'flex',
                gap: '10px',
                flexDirection: isBot ? 'row' : 'row-reverse',
                alignItems: 'flex-start',
                alignSelf: isBot ? 'flex-start' : 'flex-end',
                maxWidth: '85%'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: isBot ? '#fffde7' : '#f8fafc',
                border: `1px solid ${isBot ? '#ffd900' : '#e5e5e5'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isBot ? '#09090B' : '#64748B',
                flexShrink: 0
              }}>
                {isBot ? <Bot size={16} /> : <User size={16} />}
              </div>

              {/* Chat Bubble container */}
              <div 
                style={{
                  padding: '12px 14px',
                  borderRadius: '16px',
                  borderTopLeftRadius: isBot ? '4px' : '16px',
                  borderTopRightRadius: isBot ? '16px' : '4px',
                  background: isBot ? '#eff6ff' : '#f8fafc', // Soft blue and soft slate bubbles
                  border: isBot ? '1px solid rgba(59, 130, 246, 0.15)' : '1px solid #e2e8f0',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.01)'
                }}
              >
                <div style={{ 
                  fontSize: '13px', 
                  color: '#09090B', 
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  fontWeight: '500'
                }}>
                  {renderMessageText(msg.text)}
                </div>
                <div style={{ 
                  textAlign: isBot ? 'left' : 'right', 
                  fontSize: '9px', 
                  color: '#64748B',
                  marginTop: '6px',
                  fontWeight: '500'
                }}>
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {checkingRumor && (
          <div style={{ display: 'flex', gap: '10px', alignSelf: 'flex-start' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#fffde7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bot size={16} />
            </div>
            <div style={{
              padding: '12px 16px',
              borderRadius: '16px',
              borderTopLeftRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#eff6ff',
              border: '1px solid rgba(59, 130, 246, 0.15)'
            }}>
              <span className="shimmer" style={{ width: '40px', height: '8px', borderRadius: '4px' }} />
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '500' }}>Auditing safety databases...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick query chips */}
      <div style={{
        padding: '0 16px 8px 16px',
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        backgroundColor: '#ffffff'
      }}>
        <button
          onClick={() => handleQuickQuestion('Verify kidnap rumor in Koramangala')}
          style={{
            padding: '8px 14px',
            borderRadius: '20px',
            border: '1px solid #e5e5e5',
            backgroundColor: '#f8fafc',
            fontSize: '11px',
            color: '#09090B',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontWeight: '600',
            minHeight: '36px'
          }}
        >
          🔍 Kidnap Rumor Check
        </button>
        <button
          onClick={() => handleQuickQuestion('Is the route to HSR safe right now?')}
          style={{
            padding: '8px 14px',
            borderRadius: '20px',
            border: '1px solid #e5e5e5',
            backgroundColor: '#f8fafc',
            fontSize: '11px',
            color: '#09090B',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontWeight: '600',
            minHeight: '36px'
          }}
        >
          🗺️ Safe Route Check
        </button>
        <button
          onClick={() => handleQuickQuestion('I received a phone call claiming to be CBI placing me under digital arrest')}
          style={{
            padding: '8px 14px',
            borderRadius: '20px',
            border: '1px solid #e5e5e5',
            backgroundColor: '#f8fafc',
            fontSize: '11px',
            color: '#09090B',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontWeight: '600',
            minHeight: '36px'
          }}
        >
          ⚠️ Digital Arrest Help
        </button>
        <button
          onClick={() => handleQuickQuestion('What is the RBI circular on UPI fraud customer liability?')}
          style={{
            padding: '8px 14px',
            borderRadius: '20px',
            border: '1px solid #e5e5e5',
            backgroundColor: '#f8fafc',
            fontSize: '11px',
            color: '#09090B',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontWeight: '600',
            minHeight: '36px'
          }}
        >
          📚 UPI Fraud Liability
        </button>
      </div>

      {/* Message Input Panel */}
      <div className="glass-panel" style={{
        padding: '10px 16px 20px',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        background: '#ffffff'
      }}>
        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          style={{ display: 'none' }} 
        />
        
        {/* Attachment Button */}
        <button
          onClick={handleAttachClick}
          title="Attach media to scan"
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: '#f8fafc',
            color: '#64748B',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            minHeight: '44px',
            minWidth: '44px'
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
            flex: 1,
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '24px',
            padding: '12px 18px',
            color: '#09090B',
            fontSize: '13px',
            outline: 'none',
            fontFamily: 'Inter, sans-serif',
            fontWeight: '500',
            minHeight: '44px'
          }}
        />
        <button
          onClick={() => handleSendMessage()}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: '#ffd900', // Safety Yellow
            color: '#09090B',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(255, 217, 0, 0.2)',
            minHeight: '44px',
            minWidth: '44px'
          }}
        >
          <Send size={16} strokeWidth={2.5} />
        </button>
      </div>

    </div>
  );
}
