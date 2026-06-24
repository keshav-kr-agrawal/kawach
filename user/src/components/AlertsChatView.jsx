import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Radio, ShieldAlert } from 'lucide-react';

export default function AlertsChatView() {
  const [messages, setMessages] = useState([
    {
      id: 'msg-1',
      sender: 'bot',
      text: "🛡️ Hello! I am your KAWACH Safety Guard. You can ask me to evaluate local safety conditions, verify viral WhatsApp rumors, or check safe route mappings.",
      timestamp: '12:00 PM'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [checkingRumor, setCheckingRumor] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: text,
      timestamp: timestamp
    };

    setMessages((prev) => [...prev, newMsg]);
    if (!textToSend) setInputText('');

    simulateAIResponse(text);
  };

  const simulateAIResponse = (userQuery) => {
    setCheckingRumor(true);
    
    setTimeout(() => {
      let botText = '';
      const query = userQuery.toLowerCase();

      if (query.includes('rumor') || query.includes('kidnap') || query.includes('forward')) {
        botText = "🚨 **RUMOR VERIFICATION SYSTEM VERDICT:** \n\n**Claim:** Child kidnapping gangs in Koramangala.\n**Verdict:** ❌ **VERIFIED HOAX**\n\n**Rationale:** Bengaluru City Police has confirmed no such gangs or incidents exist. This is a false rumor. Please do not forward.";
      } else if (query.includes('route') || query.includes('safe') || query.includes('hsr') || query.includes('koramangala')) {
        botText = "🗺️ **ROUTE INTELLIGENCE REPORT:**\n\nKoramangala to HSR check. \n\n* **Green Zone:** 80ft Road Koramangala is clear and streetlights are functional.\n* **Advisory:** Inner Ring Road has minor water logging. Avoid two-wheelers for now.\n* **Patrols:** 3 active police vehicles on beat.";
      } else if (query.includes('scam') || query.includes('arrest') || query.includes('cbi') || query.includes('police call')) {
        botText = "⚠️ **DIGITAL ARREST EXTORTION WARNING:**\n\nIf you receive a video call claiming to be CBI or Police placing you under 'digital arrest' and demanding money: \n\n1. **DISCONNECT IMMEDIATELY.** \n2. Police will never demand cash transfers via chat/call.\n3. Report to **1930**.";
      } else {
        botText = "✅ **KAWACH Safety Assistant:**\n\nNo immediate incident clusters or active safety warnings match your query. Let me know if you would like me to check a specific route or WhatsApp forward.";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-' + Date.now(),
          sender: 'bot',
          text: botText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setCheckingRumor(false);
    }, 1200);
  };

  const handleQuickQuestion = (qText) => {
    handleSendMessage(qText);
  };

  return (
    <div className="view-container" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 84px)', backgroundColor: '#ffffff' }}>
      
      {/* Safety Alert Broadcast Banner (Snapchat red warning style) */}
      <div style={{
        background: '#fff1f0',
        borderBottom: '1px solid #ffa39e',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#ff3b30'
        }} className="pulse-red" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.05em', color: '#ff3b30', textTransform: 'uppercase' }}>
            Broadcasting Safety Notice
          </span>
          <p style={{ margin: 0, fontSize: '11px', color: '#333333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500' }}>
            High-speed water clogging logged on Outer Ring Road. Police advising detours.
          </p>
        </div>
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
                backgroundColor: isBot ? '#fffde7' : '#f2f2f2',
                border: `1px solid ${isBot ? '#fffc00' : '#e5e5e5'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isBot ? '#000000' : '#666666',
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
                  background: isBot ? '#e3f2fd' : '#f2f2f2', // light blue bot bubbles, light gray user bubbles
                  border: isBot ? '1px solid rgba(0, 122, 255, 0.15)' : '1px solid #e5e5e5',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.01)'
                }}
              >
                <div style={{ 
                  fontSize: '13px', 
                  color: '#000000', 
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  fontWeight: '500'
                }}>
                  {msg.text}
                </div>
                <div style={{ 
                  textAlign: isBot ? 'left' : 'right', 
                  fontSize: '9px', 
                  color: '#999999',
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
              backgroundColor: '#e3f2fd',
              border: '1px solid rgba(0, 122, 255, 0.15)'
            }}>
              <span className="shimmer" style={{ width: '40px', height: '8px', borderRadius: '4px' }} />
              <span style={{ fontSize: '11px', color: '#666666', fontWeight: '500' }}>Auditing safety databases...</span>
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
            padding: '6px 14px',
            borderRadius: '20px',
            border: '1px solid #e5e5e5',
            backgroundColor: '#f8f8f8',
            fontSize: '11px',
            color: '#333333',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontWeight: '600'
          }}
        >
          🔍 Kidnap Rumor Check
        </button>
        <button
          onClick={() => handleQuickQuestion('Is route to HSR safe right now?')}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            border: '1px solid #e5e5e5',
            backgroundColor: '#f8f8f8',
            fontSize: '11px',
            color: '#333333',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontWeight: '600'
          }}
        >
          🗺️ Safe Route to HSR
        </button>
        <button
          onClick={() => handleQuickQuestion('Received CBI video call scam')}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            border: '1px solid #e5e5e5',
            backgroundColor: '#f8f8f8',
            fontSize: '11px',
            color: '#333333',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontWeight: '600'
          }}
        >
          ⚠️ CBI Call Scam
        </button>
      </div>

      {/* Message Input Panel (White theme) */}
      <div className="glass-panel" style={{
        padding: '10px 16px 20px',
        borderTop: '1px solid #e5e5e5',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        background: '#ffffff'
      }}>
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
          placeholder="Ask KAWACH AI or paste WhatsApp forward..."
          style={{
            flex: 1,
            backgroundColor: '#f2f2f2',
            border: '1px solid #e5e5e5',
            borderRadius: '24px',
            padding: '12px 18px',
            color: '#000000',
            fontSize: '13px',
            outline: 'none',
            fontFamily: 'Inter, sans-serif',
            fontWeight: '500'
          }}
        />
        <button
          onClick={() => handleSendMessage()}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            backgroundColor: '#fffc00', // Snapchat Yellow
            color: '#000000',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(255, 252, 0, 0.2)'
          }}
        >
          <Send size={16} strokeWidth={2.5} />
        </button>
      </div>

    </div>
  );
}
