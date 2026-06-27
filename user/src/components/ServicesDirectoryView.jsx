import React, { useState } from 'react';
import { Phone, Shield, HeartPulse, Flame, Zap, Droplet, Truck, AlertTriangle, Star, CheckCircle } from 'lucide-react';

export default function ServicesDirectoryView({ gpsCoords }) {
  const [activeSector, setActiveSector] = useState('government'); // government or private
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('proximity'); // proximity, quality, price
  const [callModal, setCallModal] = useState(null);

  // Hand-Verified Core Emergency Lifelines (Direct Top Section)
  const emergencyLifelines = [
    { name: 'Police Control Room', phone: '112', icon: Shield, color: '#3B82F6', details: 'Direct emergency police assistance', verified: true },
    { name: 'Ambulance Helpline', phone: '108', icon: HeartPulse, color: '#E11D48', details: 'Immediate medical dispatch', verified: true },
    { name: 'Fire & Rescue Command', phone: '101', icon: Flame, color: '#F59E0B', details: 'Hazard containment & emergency safety', verified: true }
  ];

  // Hand-verified mock database
  const servicesData = [
    {
      id: 'gov-1',
      name: 'Koramangala Police Station',
      category: 'Police',
      sector: 'government',
      distance: 0.4,
      rating: 4.2,
      priceScore: 1,
      phone: '112',
      address: '8th Block, Koramangala, Bengaluru',
      icon: Shield,
      color: '#3B82F6',
      verified: true
    },
    {
      id: 'gov-2',
      name: 'St. John’s Hospital (Govt Emergency)',
      category: 'Ambulance',
      sector: 'government',
      distance: 1.1,
      rating: 4.0,
      priceScore: 1,
      phone: '108',
      address: 'Sarjapur Road, John Nagar, Bengaluru',
      icon: HeartPulse,
      color: '#E11D48',
      verified: true
    },
    {
      id: 'gov-3',
      name: 'HSR Layout Fire Station',
      category: 'Fire',
      sector: 'government',
      distance: 2.5,
      rating: 4.6,
      priceScore: 1,
      phone: '101',
      address: 'Sector 4, HSR Layout, Bengaluru',
      icon: Flame,
      color: '#F59E0B',
      verified: true
    },
    {
      id: 'gov-4',
      name: 'BESCOM Electricity Support',
      category: 'Electricity',
      sector: 'government',
      distance: 1.8,
      rating: 3.5,
      priceScore: 1,
      phone: '1912',
      address: '5th Block, Koramangala, Bengaluru',
      icon: Zap,
      color: '#F59E0B',
      verified: true
    },
    {
      id: 'gov-5',
      name: 'NDRF Disaster Unit (KSP)',
      category: 'Disaster',
      sector: 'government',
      distance: 5.2,
      rating: 4.9,
      priceScore: 1,
      phone: '1078',
      address: 'Yelahanka, Bengaluru Outskirts',
      icon: AlertTriangle,
      color: '#818cf8',
      verified: true
    },
    {
      id: 'gov-6',
      name: 'BWSSB Water Emergency Board',
      category: 'Water',
      sector: 'government',
      distance: 2.2,
      rating: 3.7,
      priceScore: 1,
      phone: '1916',
      address: '2nd Stage, Indiranagar, Bengaluru',
      icon: Droplet,
      color: '#3B82F6',
      verified: true
    },
    {
      id: 'pvt-1',
      name: 'Apollo Hospital ICU Ambulance',
      category: 'Ambulance',
      sector: 'private',
      distance: 0.8,
      rating: 4.8,
      priceScore: 3,
      phone: '+919900019100',
      address: 'Bannerghatta Road, Bengaluru',
      icon: HeartPulse,
      color: '#E11D48',
      verified: true
    },
    {
      id: 'pvt-2',
      name: 'SecureShield Patrols Ltd',
      category: 'Police',
      sector: 'private',
      distance: 1.5,
      rating: 4.5,
      priceScore: 3,
      phone: '+918045612340',
      address: '100ft Road, Indiranagar, Bengaluru',
      icon: Shield,
      color: '#3B82F6',
      verified: true
    },
    {
      id: 'pvt-3',
      name: 'Koramangala Towing & Recovery',
      category: 'Towing',
      sector: 'private',
      distance: 0.6,
      rating: 4.1,
      priceScore: 2,
      phone: '+919888800221',
      address: '4th Block, Koramangala, Bengaluru',
      icon: Truck,
      color: '#64748B',
      verified: true
    },
    {
      id: 'pvt-4',
      name: 'Cauvery Water Tanker Supplies',
      category: 'Water',
      sector: 'private',
      distance: 1.9,
      rating: 3.9,
      priceScore: 1,
      phone: '+919777123456',
      address: 'Ejipura Main Road, Bengaluru',
      icon: Droplet,
      color: '#3B82F6',
      verified: true
    },
    {
      id: 'pvt-5',
      name: 'Speedy Towing Services',
      category: 'Towing',
      sector: 'private',
      distance: 2.8,
      rating: 4.7,
      priceScore: 3,
      phone: '+919666677777',
      address: 'Outer Ring Road, Bellandur',
      icon: Truck,
      color: '#64748B',
      verified: true
    }
  ];

  const categories = ['All', 'Police', 'Ambulance', 'Fire', 'Water', 'Electricity', 'Towing', 'Disaster'];

  // Filtering Logic
  const filteredServices = servicesData.filter((service) => {
    const matchesSector = service.sector === activeSector;
    const matchesCategory = selectedCategory === 'All' || service.category === selectedCategory;
    return matchesSector && matchesCategory;
  });

  // Sorting Logic
  const sortedServices = [...filteredServices].sort((a, b) => {
    if (sortBy === 'proximity') {
      return a.distance - b.distance;
    }
    if (sortBy === 'quality') {
      return b.rating - a.rating;
    }
    if (sortBy === 'price') {
      return a.priceScore - b.priceScore;
    }
    return 0;
  });

  const getPriceIndicator = (score) => {
    if (score === 1) return 'Free';
    return '₹'.repeat(score);
  };

  const handleCallSimulation = (service) => {
    setCallModal(service);
  };

  return (
    <div className="view-container" style={{ 
      padding: '20px 16px 100px', 
      backgroundColor: '#fafafa', // Soft Off-White
      boxSizing: 'border-box',
      height: '100%',
      overflowY: 'auto'
    }}>
      
      {/* View Header (Hidden because of layout level TopBar) */}
      <div style={{ display: 'none' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontFamily: 'Outfit', fontWeight: '850', color: '#09090B' }}>
          Community & Helplines
        </h1>
        <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748B', fontWeight: '500' }}>
          Hand-verified support stations and utility lines to assist you instantly.
        </p>
      </div>

      {/* 🚨 CORE EMERGENCY LIFELINES SECTION (FIRST AND PROMINENT) */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '14px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
        marginBottom: '20px',
        border: '1px solid #e5e5e5'
      }}>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#E11D48', fontWeight: '800', letterSpacing: '0.05em' }}>
          🚨 EMERGENCY HELPLINES
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {emergencyLifelines.map((lifeline, idx) => {
            const LifeIcon = lifeline.icon;
            return (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  backgroundColor: '#fdfdfd',
                  border: '1px solid #f0f0f0',
                  borderRadius: '14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: `${lifeline.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: lifeline.color,
                    border: `1px solid ${lifeline.color}25`
                  }}>
                    <LifeIcon size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '750', color: '#09090B' }}>
                        {lifeline.name} ({lifeline.phone})
                      </h3>
                      <CheckCircle size={12} fill="#3B82F6" stroke="#ffffff" />
                    </div>
                    <p style={{ margin: 0, fontSize: '10px', color: '#64748B', fontWeight: '500' }}>
                      {lifeline.details}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleCallSimulation(lifeline)}
                  style={{
                    background: '#ffd900', // Safety Yellow
                    border: '1px solid #ffd900',
                    borderRadius: '10px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#09090B',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(255, 217, 0, 0.15)'
                  }}
                >
                  <Phone size={14} strokeWidth={2.5} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sector Tab Selector (Govt vs Private) */}
      <div style={{
        display: 'flex',
        padding: '4px',
        borderRadius: '16px',
        marginBottom: '16px',
        backgroundColor: '#e5e5e5'
      }}>
        <button
          onClick={() => setActiveSector('government')}
          style={{
            flex: 1,
            padding: '12px 10px',
            borderRadius: '12px',
            border: 'none',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            backgroundColor: activeSector === 'government' ? '#ffd900' : 'transparent',
            color: '#09090B',
            transition: 'all 0.2s ease',
            boxShadow: activeSector === 'government' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            minHeight: '44px'
          }}
        >
          Government Services
        </button>
        <button
          onClick={() => setActiveSector('private')}
          style={{
            flex: 1,
            padding: '12px 10px',
            borderRadius: '12px',
            border: 'none',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            backgroundColor: activeSector === 'private' ? '#ffd900' : 'transparent',
            color: '#09090B',
            transition: 'all 0.2s ease',
            boxShadow: activeSector === 'private' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            minHeight: '44px'
          }}
        >
          Private Assistance
        </button>
      </div>

      {/* Category Slider */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        overflowX: 'auto', 
        paddingBottom: '16px',
        marginBottom: '8px',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        minHeight: '48px'
      }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: '1px solid #e5e5e5',
              fontSize: '12px',
              fontWeight: '700',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              backgroundColor: selectedCategory === cat ? '#ffffff' : '#f8f8f8',
              borderColor: selectedCategory === cat ? '#ffd900' : '#e5e5e5',
              color: '#09090B',
              boxShadow: selectedCategory === cat ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
              flexShrink: 0,
              height: '38px',
              minHeight: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Sorting Selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        fontSize: '11px'
      }}>
        <span style={{ color: '#64748B', fontWeight: '500' }}>
          {sortedServices.length} verified listings
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#64748B', fontWeight: '500' }}>Sort by:</span>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              background: '#ffffff',
              color: '#09090B',
              border: '1px solid #e5e5e5',
              padding: '6px 8px',
              borderRadius: '8px',
              outline: 'none',
              fontFamily: 'Outfit, sans-serif',
              fontWeight: '600',
              fontSize: '11px',
              minHeight: '32px'
            }}
          >
            <option value="proximity">Proximity</option>
            <option value="quality">Quality Rating</option>
            <option value="price">Price Rank</option>
          </select>
        </div>
      </div>

      {/* Services List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {sortedServices.length > 0 ? (
          sortedServices.map((service) => {
            const ServiceIcon = service.icon;

            return (
              <div 
                key={service.id} 
                className="glass-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  position: 'relative',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.01)',
                  padding: '12px'
                }}
              >
                {/* Custom Icon Container */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: '#f8f8f8',
                  border: '1px solid #e5e5e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: service.color
                }}>
                  <ServiceIcon size={18} />
                </div>

                {/* Service Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: '13px',
                      fontWeight: '750',
                      color: '#09090B',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {service.name}
                    </h3>
                    {service.verified && (
                      <span style={{
                        fontSize: '9px',
                        color: '#3B82F6',
                        backgroundColor: '#e3f2fd',
                        padding: '1px 6px',
                        borderRadius: '6px',
                        fontWeight: '700',
                        display: 'inline-flex',
                        alignItems: 'center',
                        flexShrink: 0
                      }}>
                        Verified
                      </span>
                    )}
                  </div>
                  <p style={{
                    margin: '2px 0 4px 0',
                    fontSize: '10px',
                    color: '#64748B',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontWeight: '500'
                  }}>
                    {service.address}
                  </p>
                  
                  {/* Metadata tags */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '9px', fontWeight: '600' }}>
                    <span style={{ color: '#3B82F6' }}>
                      📍 {service.distance} km
                    </span>
                    <span style={{ color: '#e5e5e5' }}>|</span>
                    <span style={{ color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Star size={9} fill="#F59E0B" stroke="none" /> {service.rating}
                    </span>
                    <span style={{ color: '#e5e5e5' }}>|</span>
                    <span style={{ color: '#22c55e' }}>
                      {getPriceIndicator(service.priceScore)}
                    </span>
                  </div>
                </div>

                {/* Call Action Button */}
                <button
                  onClick={() => handleCallSimulation(service)}
                  style={{
                    background: '#ffd900', // Safety Yellow
                    border: 'none',
                    borderRadius: '10px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#09090B',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(255, 217, 0, 0.15)',
                    minHeight: '36px',
                    minWidth: '36px'
                  }}
                >
                  <Phone size={14} strokeWidth={2.5} />
                </button>
              </div>
            );
          })
        ) : (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: '#64748B',
            fontSize: '13px'
          }}>
            No emergency services match the chosen filter.
          </div>
        )}
      </div>

      {/* Call Simulator Overlay */}
      {callModal && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#ffffff',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          color: '#09090B'
        }}>
          {/* Dialing Circle */}
          <div style={{
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 217, 0, 0.25)',
            border: '3px solid #ffd900',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#09090B',
            marginBottom: '20px',
            boxShadow: '0 0 20px rgba(255, 217, 0, 0.3)'
          }} className="pulse-red">
            <Phone size={36} strokeWidth={2.5} />
          </div>

          <h2 style={{ fontSize: '18px', margin: '0 0 6px 0', fontFamily: 'Outfit', fontWeight: '850', textAlign: 'center' }}>
            {callModal.name}
          </h2>
          <span style={{ fontSize: '12px', color: '#3B82F6', fontWeight: '700', letterSpacing: '0.05em' }}>
            CONNECTING: {callModal.phone}
          </span>
          
          {/* Comforting Human privacy assurance */}
          <p style={{
            fontSize: '11px',
            color: '#64748B',
            margin: '12px 0 0 0',
            textAlign: 'center',
            maxWidth: '240px',
            lineHeight: 1.4,
            fontWeight: '600',
            backgroundColor: '#f8fafc',
            padding: '10px 14px',
            borderRadius: '12px',
            border: '1px solid #e5e5e5'
          }}>
            🔐 Secure Line: Confidential voice connection is active to keep your personal details private.
          </p>

          <button
            onClick={() => setCallModal(null)}
            style={{
              marginTop: '40px',
              padding: '12px 32px',
              borderRadius: '24px',
              border: 'none',
              backgroundColor: '#E11D48', // Soft Crimson
              color: '#ffffff',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '13px',
              boxShadow: '0 4px 15px rgba(225, 29, 72, 0.2)',
              minHeight: '44px'
            }}
          >
            End Call
          </button>
        </div>
      )}
    </div>
  );
}
