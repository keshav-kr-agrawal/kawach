import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { 
      id: 'map', 
      label: 'Map', 
      path: '/user/map',
      renderIcon: (isActive) => (
        <svg viewBox="0 0 24 24" fill={isActive ? '#09090b' : 'none'} stroke={isActive ? '#09090b' : 'rgba(9, 9, 11, 0.65)'} strokeWidth={isActive ? '2.5' : '2'} className="w-5 h-5 transition-all">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
          <line x1="8" y1="2" x2="8" y2="18"/>
          <line x1="16" y1="6" x2="16" y2="22"/>
        </svg>
      )
    },
    { 
      id: 'services', 
      label: 'Directory', 
      path: '/user/services',
      renderIcon: (isActive) => (
        <svg viewBox="0 0 24 24" fill={isActive ? '#09090b' : 'none'} stroke={isActive ? '#09090b' : 'rgba(9, 9, 11, 0.65)'} strokeWidth={isActive ? '2.5' : '2'} className="w-5 h-5 transition-all">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
      )
    },
    { 
      id: 'camera', 
      label: 'Capture', 
      path: '/user/camera',
      renderIcon: (isActive) => (
        <svg viewBox="0 0 24 24" fill={isActive ? '#09090b' : 'none'} stroke={isActive ? '#09090b' : 'rgba(9, 9, 11, 0.65)'} strokeWidth={isActive ? '2.5' : '2'} className="w-5 h-5 transition-all">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      )
    },
    { 
      id: 'chat', 
      label: 'Nayak', 
      path: '/user/nayak',
      renderIcon: (isActive) => (
        <svg viewBox="0 0 24 24" fill={isActive ? '#09090b' : 'none'} stroke={isActive ? '#09090b' : 'rgba(9, 9, 11, 0.65)'} strokeWidth={isActive ? '2.5' : '2'} className="w-5 h-5 transition-all">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      )
    },
    { 
      id: 'feed', 
      label: 'Feed', 
      path: '/user/feed',
      renderIcon: (isActive) => (
        <svg viewBox="0 0 24 24" fill={isActive ? '#09090b' : 'none'} stroke={isActive ? '#09090b' : 'rgba(9, 9, 11, 0.65)'} strokeWidth={isActive ? '2.5' : '2'} className="w-4 h-4 transition-all">
          <polygon points="12 2 19 21 12 17 5 21 12 2"/>
        </svg>
      )
    }
  ];

  // Determine active tab ID based on route
  const getActiveTabId = () => {
    const path = location.pathname;
    if (path.startsWith('/user/map')) return 'map';
    if (path.startsWith('/user/services')) return 'services';
    if (path.startsWith('/user/camera')) return 'camera';
    if (path.startsWith('/user/chat') || path.startsWith('/user/nayak') || path.startsWith('/nayak')) return 'chat';
    if (path.startsWith('/user/feed')) return 'feed';
    return '';
  };

  const activeTab = getActiveTabId();
  const activeIndex = tabs.findIndex(t => t.id === activeTab);

  return (
    <div className="flex-none w-full relative z-40 select-none" style={{
      height: 'calc(58px + env(safe-area-inset-bottom, 0px))',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      background: '#E9BA26', // Sophisticated Safety Yellow (#E9BA26)
      boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.08)',
      borderTop: '1px solid rgba(0, 0, 0, 0.1)',
      boxSizing: 'border-box'
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        height: '58px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around'
      }}>
        {/* Animated Sliding White Background Circle */}
        {activeIndex !== -1 && (
          <div 
            className="nav-sliding-circle"
            style={{
              position: 'absolute',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#ffffff', // White sliding indicator circle
              top: '4px',
              left: `calc(${activeIndex * 20}% + (20% - 32px) / 2)`,
              transition: 'left 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              zIndex: 1,
              boxShadow: '0 3px 10px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.06)',
              pointerEvents: 'none'
            }}
          />
        )}

        {/* Navigation tabs */}
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => navigate(tab.path)}
              style={{
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                height: '100%',
                cursor: 'pointer',
                position: 'relative',
                zIndex: 2,
                WebkitTapHighlightColor: 'transparent',
                outline: 'none',
                paddingTop: '2px',
                paddingBottom: '2px',
                boxSizing: 'border-box'
              }}
            >
              <div style={{
                transform: isActive ? 'scale(1.05)' : 'scale(1)',
                transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'transparent'
              }}>
                {tab.renderIcon(isActive)}
              </div>
              
              {/* Label inside the yellow bar */}
              <span style={{
                fontSize: '9px',
                lineHeight: '1.2',
                marginTop: '1px',
                fontWeight: isActive ? '800' : '700',
                opacity: isActive ? 1 : 0.75,
                fontFamily: 'Sora, sans-serif',
                letterSpacing: '0.01em',
                color: '#09090b',
                whiteSpace: 'nowrap',
                transition: 'all 0.3s ease'
              }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
