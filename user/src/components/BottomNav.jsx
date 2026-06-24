import React from 'react';
import { Map, Phone, Camera, MessageSquare, Compass } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'map', label: 'Map', icon: Map },
    { id: 'services', label: 'Services', icon: Phone },
    { id: 'camera', label: 'Camera', icon: Camera },
    { id: 'alerts', label: 'Chat', icon: MessageSquare },
    { id: 'reels', label: 'Feed', icon: Compass }
  ];

  const activeIndex = tabs.findIndex(t => t.id === activeTab);

  return (
    <div className="glass-panel" style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 'calc(70px + env(safe-area-inset-bottom))',
      zIndex: 1000,
      background: '#fffc00', // Snapchat Yellow entire bar
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
      borderTop: '1px solid rgba(0, 0, 0, 0.06)',
      overflow: 'visible'
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        height: '70px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        overflow: 'visible'
      }}>
        {/* Animated Sliding White Background Circle */}
        {activeIndex !== -1 && (
          <div 
            className="nav-sliding-circle"
            style={{
              position: 'absolute',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: '#ffffff', // White sliding indicator circle
              top: '6px',
              left: `calc(${activeIndex * 20}% + (20% - 44px) / 2)`,
              transition: 'left 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Organic bounce transition
              zIndex: 1,
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.06)',
              pointerEvents: 'none'
            }}
          />
        )}

        {/* Navigation tabs */}
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                flex: 1,
                height: '100%',
                cursor: 'pointer',
                position: 'relative',
                zIndex: 2,
                WebkitTapHighlightColor: 'transparent',
                outline: 'none',
                paddingTop: '6px'
              }}
            >
              {/* Subtle 3px Floating Icon wrapper */}
              <div style={{
                transform: isActive ? 'translateY(-3px) scale(1.18)' : 'translateY(0) scale(1)',
                transition: 'transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: 'transparent'
              }}>
                <Icon 
                  size={22} 
                  strokeWidth={isActive ? 2.5 : 2} 
                  fill={isActive ? '#000000' : 'none'} 
                  color={isActive ? '#000000' : 'rgba(0, 0, 0, 0.6)'}
                  style={{
                    transition: 'color 0.3s ease, fill 0.3s ease'
                  }}
                />
              </div>
              
              {/* Label inside the yellow bar */}
              <span style={{
                fontSize: '9px',
                marginTop: '1px',
                fontWeight: isActive ? '800' : '600',
                opacity: isActive ? 1 : 0.6,
                fontFamily: 'Outfit, sans-serif',
                letterSpacing: '0.01em',
                color: '#000000',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                transform: isActive ? 'translateY(-1px) scale(1.06)' : 'translateY(0) scale(1)'
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
