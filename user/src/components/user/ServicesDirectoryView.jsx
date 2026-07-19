import React, { useState } from 'react';

export default function ServicesDirectoryView({ gpsCoords }) {
  const [activeSector, setActiveSector] = useState('government'); // government or private
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('proximity'); // proximity, quality, price
  const [callModal, setCallModal] = useState(null);

  // Hand-Verified Core Emergency Lifelines (Direct Top Section)
  const emergencyLifelines = [
    { 
      name: 'Police Control Room', 
      phone: '112', 
      details: 'Direct emergency police assistance', 
      verified: true,
      renderIcon: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    },
    { 
      name: 'Ambulance Helpline', 
      phone: '108', 
      details: 'Immediate medical dispatch', 
      verified: true,
      renderIcon: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
    },
    { 
      name: 'Fire & Rescue Command', 
      phone: '101', 
      details: 'Hazard containment & emergency safety', 
      verified: true,
      renderIcon: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
    }
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
      verified: true
    },
    {
      id: 'gov-5',
      name: 'NDRF Disaster Unit (KSP)',
      category: 'Disaster',
      sector: 'government',
      distance: 5.2,
      rating: 4.8,
      priceScore: 1,
      phone: '1070',
      address: 'Infantry Road, Central Command, Bengaluru',
      verified: true
    },
    {
      id: 'pvt-1',
      name: 'RapidTow 24/7 Crane Dispatch',
      category: 'Towing',
      sector: 'private',
      distance: 0.8,
      rating: 4.7,
      priceScore: 2,
      phone: '+91 98765 43210',
      address: '100 Feet Road, Indiranagar, Bengaluru',
      verified: true
    },
    {
      id: 'pvt-2',
      name: 'Apollo Quick Ambulance Unit',
      category: 'Ambulance',
      sector: 'private',
      distance: 1.4,
      rating: 4.9,
      priceScore: 3,
      phone: '+91 99887 76655',
      address: 'Bannerghatta Road, Bengaluru',
      verified: true
    },
    {
      id: 'pvt-3',
      name: 'CityLocksmith Auto & Home Express',
      category: 'Locksmith',
      sector: 'private',
      distance: 1.2,
      rating: 4.4,
      priceScore: 2,
      phone: '+91 91234 56789',
      address: 'BTM 2nd Stage, Bengaluru',
      verified: true
    }
  ];

  const categories = ['All', 'Police', 'Ambulance', 'Fire', 'Electricity', 'Disaster', 'Towing', 'Locksmith'];

  const filteredServices = servicesData
    .filter(s => s.sector === activeSector)
    .filter(s => selectedCategory === 'All' || s.category === selectedCategory)
    .sort((a, b) => {
      if (sortBy === 'proximity') return a.distance - b.distance;
      if (sortBy === 'quality') return b.rating - a.rating;
      if (sortBy === 'price') return a.priceScore - b.priceScore;
      return 0;
    });

  return (
    <div className="flex-1 flex flex-col h-full bg-white font-sans text-ink overflow-y-auto pb-24 select-text">
      
      {/* Editorial Header — Compact on phone */}
      <div className="px-4 py-3 bg-white border-b border-amber-400/20 md:px-6 md:pt-6 md:pb-4">
        <span className="text-[9px] font-bold text-[#b08850] uppercase tracking-widest block font-mono">
          VERIFIED CIVIC DIRECTORY
        </span>
        <h2 className="text-lg font-black text-ink font-sora md:text-2xl">
          Civic <span className="font-serif italic font-normal text-[#b08850] pr-1">Directory</span>
        </h2>
        <p className="hidden md:block text-ink-soft text-xs font-semibold mt-1 leading-relaxed">
          Instant access to official state response stations and vetted private utility dispatches in your ward.
        </p>
      </div>

      <div className="p-5 space-y-6">

        {/* 1. Core Emergency Lifelines Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-ink font-sora uppercase tracking-wider flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="#b08850" strokeWidth="2.5" className="w-4 h-4"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Emergency Lifelines
            </h3>
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
              24/7 Priority Grid
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {emergencyLifelines.map((line) => (
              <div 
                key={line.phone}
                className="bg-white border-2 border-[#E9BA26] rounded-2xl p-4 flex flex-col justify-between shadow-xs hover:border-amber-500 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-amber-400/15 rounded-xl flex items-center justify-center text-[#b08850] border border-amber-400/30">
                      {line.renderIcon()}
                    </div>
                    <span className="text-[10px] font-black font-mono bg-amber-950 text-[#E9BA26] px-2.5 py-1 rounded-lg">
                      Dial {line.phone}
                    </span>
                  </div>
                  <h4 className="font-black text-ink text-sm font-sora">{line.name}</h4>
                  <p className="text-ink-soft text-[10px] font-semibold mt-1 leading-relaxed">{line.details}</p>
                </div>

                <a 
                  href={`tel:${line.phone}`}
                  className="mt-4 w-full py-2.5 bg-[#E9BA26] hover:bg-amber-400 text-ink font-black rounded-xl text-xs flex items-center justify-center gap-2 border border-amber-950/10 uppercase tracking-wider font-sora transition-all"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  Call Now
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Sector Selector Tabs (Government vs Private) */}
        <section className="space-y-4">
          <div className="bg-amber-50 p-1 rounded-2xl flex gap-1 border border-amber-200">
            <button
              onClick={() => setActiveSector('government')}
              className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all font-sora ${
                activeSector === 'government'
                  ? 'bg-white text-ink shadow-xs border border-amber-400/40'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              🏛️ Government & Public Units
            </button>
            <button
              onClick={() => setActiveSector('private')}
              className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all font-sora ${
                activeSector === 'private'
                  ? 'bg-white text-ink shadow-xs border border-amber-400/40'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              🛠️ Private Vetted Operators
            </button>
          </div>

          {/* Categories Horizontal Scroll */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#E9BA26] text-ink border border-amber-950/10 shadow-xs'
                    : 'bg-white border border-amber-400/20 text-ink-soft hover:border-[#b08850]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort Controls */}
          <div className="flex items-center justify-between text-xs font-semibold text-ink-soft px-1 pt-1">
            <span>Showing {filteredServices.length} verified stations</span>
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('proximity')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold ${sortBy === 'proximity' ? 'bg-amber-400/20 text-[#b08850]' : 'text-ink-faint'}`}
              >
                Nearest First
              </button>
              <button
                onClick={() => setSortBy('quality')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold ${sortBy === 'quality' ? 'bg-amber-400/20 text-[#b08850]' : 'text-ink-faint'}`}
              >
                Highest Rated
              </button>
            </div>
          </div>
        </section>

        {/* 3. Services List Cards */}
        <section className="space-y-3">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="bg-white border border-amber-400/20 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs hover:border-[#b08850]/40 transition-all"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-ink text-sm font-sora">{service.name}</h4>
                  {service.verified && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md uppercase">
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-ink-soft text-xs font-semibold">{service.address}</p>
                <div className="flex items-center gap-4 text-[10px] font-bold text-ink-faint pt-1">
                  <span>📍 {service.distance} km away</span>
                  <span>⭐ {service.rating} / 5.0</span>
                  <span>{service.sector === 'government' ? 'FREE Public Service' : 'Standard Rate'}</span>
                </div>
              </div>

              <a
                href={`tel:${service.phone}`}
                className="w-full sm:w-auto px-4 py-2.5 bg-amber-50 hover:bg-[#E9BA26] border border-amber-400/40 text-ink font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all font-sora shrink-0"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                Call {service.phone}
              </a>
            </div>
          ))}
        </section>

      </div>
    </div>
  );
}
