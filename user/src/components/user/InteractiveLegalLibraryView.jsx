import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InteractiveLegalLibraryView({ onBack, onToggleBookmark, bookmarkedLawIds }) {
  const [userType, setUserType] = useState('Driver');
  const [issueType, setIssueType] = useState('Bribe Request');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [flippedCardId, setFlippedCardId] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(null);

  const flashcards = [
    {
      id: 'fc-1',
      title: 'Cop takes your keys?',
      backTitle: 'Motor Vehicles Act, 1988',
      frontDescription: 'A traffic officer stops you and attempts to pluck the keys out of your ignition. Can they legally do this?',
      backContent: 'Under the Motor Vehicles Act, no officer has the legal authority to forcibly confiscate ignition keys. Doing so constitutes illegal restraint.',
      action: 'Politely ask for their badge ID and rank. Document the incident or record on your device. File a complaint with the traffic control room.',
      penalty: 'Officer faces internal departmental action for misconduct.'
    },
    {
      id: 'fc-2',
      title: 'Midnight Arrest Rule',
      backTitle: 'Section 46(4) of CrPC',
      frontDescription: 'Can a female citizen be arrested after sunset and before sunrise by law enforcement?',
      backContent: 'Strictly prohibited. No woman can be arrested after 6 PM or before 6 AM except in exceptional circumstances under written permission of a Judicial Magistrate.',
      action: 'Demand to see the written order of a Judicial Magistrate. If absent, refuse custody. Ensure a female officer is present at all times.',
      penalty: 'Arresting officers can be charged under Section 166 (Public servant disobeying law).'
    },
    {
      id: 'fc-3',
      title: 'Digital Arrest Scams',
      backTitle: 'BNS Section 318 (Cheating)',
      frontDescription: 'You receive a video call claiming your Aadhaar card is linked to money laundering and they order you to stay online under "digital arrest".',
      backContent: 'There is NO legal concept of "Digital Arrest". Real police forces do not conduct interrogations via Skype, WhatsApp, or Zoom for case freezing.',
      action: 'Disconnect immediately. Do not share banking passwords or transfer money. Report the caller phone number/UPI ID to the Citizen Fraud Shield.',
      penalty: 'Scammers face up to 7 years in prison and heavy financial fines.'
    },
    {
      id: 'fc-4',
      title: 'Bribe Demands',
      backTitle: 'Prevention of Corruption Act',
      frontDescription: 'An official demands a payment of "speed money" to approve your application or passport clearance.',
      backContent: 'Demanding or accepting bribe currency is a severe criminal offense. Speed money is NOT a legally recognized processing fee.',
      action: 'Refuse to pay. Discreetly record the interaction or voice note the officer. Immediately report the official name to the Anti-Corruption Bureau.',
      penalty: 'Min 3 years to Max 7 years imprisonment for corrupt officials.'
    }
  ];

  const categories = [
    {
      id: 'cat-traffic',
      title: 'Traffic & Vehicles',
      gradient: 'from-amber-100 to-amber-50',
      icon: '🚦',
      laws: [
        { title: 'Spot Fines Limit', law: 'Only sub-inspectors or above can issue spot fines. Head constables can only collect standard challans.', penalty: 'Unauthorized fines are null.', action: 'Ask for officer rank badge.' },
        { title: 'Challan Verification', law: 'You have up to 15 days to pay a traffic challan. Refusing to sign does not constitute immediate arrest.', penalty: 'Unpaid fines go to virtual court.', action: 'Verify challans on official KSP portal.' }
      ]
    },
    {
      id: 'cat-cyber',
      title: 'Cyber Fraud & Scams',
      gradient: 'from-amber-100 to-amber-50',
      icon: '💻',
      laws: [
        { title: 'UPI Fraud Refund', law: 'Under RBI guidelines, reporting an unauthorized digital transaction within 3 days ensures zero liability for the customer.', penalty: 'Bank must provisionally credit funds within 10 working days.', action: 'Call 1930 immediately to freeze the recipient bank accounts.' },
        { title: 'Identity Spoofing', law: 'Using synthetic voice clones or deepfake calls to extract money is a cognizable cyber crime.', penalty: 'IT Act Section 66D (imprisonment up to 3 years).', action: 'Report spoof accounts and phone numbers instantly.' }
      ]
    },
    {
      id: 'cat-tenant',
      title: 'Tenant & Property',
      gradient: 'from-amber-100 to-amber-50',
      icon: '🏠',
      laws: [
        { title: 'Eviction Notice', law: 'A landlord cannot evict a tenant without a formal written notice of at least 30 days or a court order.', penalty: 'Illegal lockouts face penal action.', action: 'File a police complaint if locks are changed without due legal process.' },
        { title: 'Utility Cut-off', law: 'A landlord cannot cut off water, electricity, or basic amenities to force eviction.', penalty: 'Fines and recovery orders by rent control tribunals.', action: 'Lodge an immediate injunction request.' }
      ]
    },
    {
      id: 'cat-women',
      title: 'Women Safety & Rights',
      gradient: 'from-amber-100 to-amber-50',
      icon: '🛡️',
      laws: [
        { title: 'Zero FIR Provision', law: 'A woman can file a police report (FIR) at ANY station, regardless of where the crime occurred.', penalty: 'Station officers refusing to register face disciplinary action.', action: 'Demand registration of a "Zero FIR". The case will transfer to the correct station.' },
        { title: 'Right to Free Legal Aid', law: 'Female victims of assault have the right to free state-appointed legal counsel.', penalty: 'Constitutional guarantee under Article 39A.', action: 'Request a legal aid advocate at the police station.' }
      ]
    }
  ];

  const handleSearchQuerySubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setAiLoading(true);

    setTimeout(() => {
      setAiLoading(false);
      setAiAnswer({
        title: `Legal Rights Regarding "${searchQuery}"`,
        details: 'Under Bharatiya Nyaya Sanhita (BNS) protocols, citizens hold absolute constitutional protection against unauthorized seizure or coercion.',
        action: 'State your rights politely, record proof on your mobile device, and request officer badge numbers.',
        citations: ['BNS Sec 318', 'CrPC Sec 46(4)', 'Article 21']
      });
    }, 600);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white font-sans text-ink overflow-y-auto pb-24 select-text">
      
      {/* Editorial Header */}
      <div className="px-6 pt-6 pb-4 bg-white border-b border-amber-400/20">
        <span className="text-[9px] font-bold text-[#b08850] uppercase tracking-widest block mb-1 font-mono">
          BHARATIYA NYAYA SANHITA (BNS) CITATIONS
        </span>
        <h2 className="text-2xl font-black text-ink font-sora">
          Citizen <span className="font-serif italic font-normal text-[#b08850] pr-1">Law Library</span>
        </h2>
        <p className="text-ink-soft text-xs font-semibold mt-1 leading-relaxed">
          Know your constitutional rights in 60 seconds. Flashcard scenarios and verified legal codes.
        </p>
      </div>

      <div className="p-5 space-y-8">

        {/* 1. Flashcard Scenario Grid */}
        <section className="space-y-3">
          <h3 className="text-xs font-black text-ink font-sora uppercase tracking-wider flex items-center gap-1.5">
            ⚡ Interactive Right Flashcards
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {flashcards.map((card) => {
              const isFlipped = flippedCardId === card.id;

              return (
                <div
                  key={card.id}
                  onClick={() => setFlippedCardId(isFlipped ? null : card.id)}
                  className="bg-white border-2 border-[#E9BA26] rounded-2xl p-5 shadow-xs cursor-pointer hover:border-amber-500 transition-all min-h-[160px] flex flex-col justify-between"
                >
                  {!isFlipped ? (
                    <div>
                      <span className="text-[9px] font-mono font-black text-[#b08850] uppercase tracking-widest block mb-1">
                        Scenario
                      </span>
                      <h4 className="font-black text-ink text-sm font-sora">{card.title}</h4>
                      <p className="text-ink-soft text-xs font-semibold mt-2 leading-relaxed">
                        {card.frontDescription}
                      </p>
                      <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider mt-4 block">
                        Tap card to inspect legal rights ➔
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[9px] font-mono font-black text-emerald-700 uppercase tracking-widest block mb-1">
                        Verified Law Code: {card.backTitle}
                      </span>
                      <p className="text-ink text-xs font-semibold leading-relaxed">
                        {card.backContent}
                      </p>
                      <div className="mt-3 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[10px] font-bold text-ink">
                        Required Action: {card.action}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 2. Legal Search Verification Bar */}
        <section className="bg-white border border-amber-400/20 rounded-3xl p-6 space-y-4 shadow-xs">
          <h3 className="text-sm font-black text-ink font-sora uppercase tracking-wider">
            🔎 Legal Rule Verification Lookup
          </h3>

          <form onSubmit={handleSearchQuerySubmit} className="relative">
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Can traffic police seize my ignition key?"
              className="w-full bg-amber-50 border border-amber-400/20 rounded-xl pl-4 pr-12 py-3.5 text-xs text-ink placeholder-ink-faint focus:outline-none focus:border-[#E9BA26] font-semibold"
              style={{ minHeight: '44px' }}
            />
            <button
              type="submit"
              className="absolute right-2 top-2 p-2 bg-[#E9BA26] rounded-lg text-ink font-bold hover:bg-amber-400"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </form>

          {aiLoading && (
            <div className="py-2 text-xs font-bold text-[#b08850] flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-[#E9BA26] border-t-transparent rounded-full animate-spin" />
              Verifying BNS legal statutes...
            </div>
          )}

          {aiAnswer && !aiLoading && (
            <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 space-y-2">
              <h4 className="font-extrabold text-sm text-ink font-sora">{aiAnswer.title}</h4>
              <p className="text-ink-soft text-xs leading-relaxed font-semibold">{aiAnswer.details}</p>
              <div className="pt-1 flex gap-2">
                {aiAnswer.citations.map((c, i) => (
                  <span key={i} className="px-2 py-0.5 bg-amber-200 text-ink text-[9px] font-bold rounded font-mono">
                    🔖 {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 3. Browse Law Categories Accordion */}
        <section className="space-y-3">
          <h3 className="text-xs font-black text-ink font-sora uppercase tracking-wider">
            📚 Browse Category Rules
          </h3>

          <div className="space-y-3">
            {categories.map((cat) => {
              const isExpanded = expandedCategory === cat.id;

              return (
                <div key={cat.id} className="bg-white border border-amber-400/20 rounded-2xl overflow-hidden shadow-xs">
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-amber-50/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{cat.icon}</span>
                      <h4 className="font-black text-ink text-sm font-sora">{cat.title}</h4>
                    </div>
                    <span className="text-xs font-bold text-ink-faint">{isExpanded ? '▲' : '▼'}</span>
                  </button>

                  {isExpanded && (
                    <div className="p-4 bg-amber-50/60 border-t border-amber-100 space-y-3">
                      {cat.laws.map((l, idx) => (
                        <div key={idx} className="bg-white border border-amber-400/20 p-3.5 rounded-xl space-y-2">
                          <h5 className="font-extrabold text-ink text-xs font-sora">{l.title}</h5>
                          <p className="text-ink-soft text-xs font-semibold">{l.law}</p>
                          <div className="flex items-center justify-between text-[10px] font-bold pt-1 border-t border-amber-100">
                            <span className="text-red-600">Penalty: {l.penalty}</span>
                            <span className="text-emerald-700">Action: {l.action}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
