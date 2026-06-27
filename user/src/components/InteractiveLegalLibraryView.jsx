import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Search, Sparkles, ChevronDown, Bookmark, ArrowLeft, Compass } from 'lucide-react';

export default function InteractiveLegalLibraryView({ onBack, onToggleBookmark, bookmarkedLawIds }) {
  const [userType, setUserType] = useState('Driver');
  const [issueType, setIssueType] = useState('Bribe Request');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [flippedCardId, setFlippedCardId] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [simulationResult, setSimulationResult] = useState(null);
  const [isReady, setIsReady] = useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // User type dropdown options mapping to issues
  const userIssues = {
    Driver: ['Bribe Request', 'Police Spot Check', 'Vehicle Seizure'],
    Tenant: ['Eviction Threat', 'Security Deposit Retention', 'Landlord Harassment'],
    Woman: ['Harassment in Public', 'Workplace Discrimination', 'Domestic Grievance'],
    Consumer: ['Defective Product Scam', 'Fake Booking Fraud', 'Cyber Phishing Details']
  };

  // Pre-seed mock data for Flashcards
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

  // Pre-seed Category data with soft, modern pastel gradients
  const categories = [
    {
      id: 'cat-traffic',
      title: 'Traffic & Vehicles',
      gradient: 'from-amber-50 to-orange-100',
      icon: '🚦',
      laws: [
        { title: 'Spot Fines Limit', law: 'Only sub-inspectors or above can issue spot fines. Head constables can only collect standard challans.', penalty: 'Unauthorized fines are null.', action: 'Ask for officer rank badge.' },
        { title: 'Challan Verification', law: 'You have up to 15 days to pay a traffic challan. Refusing to sign does not constitute immediate arrest.', penalty: 'Unpaid fines go to virtual court.', action: 'Verify challans on official KSP portal.' }
      ]
    },
    {
      id: 'cat-cyber',
      title: 'Cyber Fraud & Scams',
      gradient: 'from-blue-50 to-sky-100',
      icon: '💻',
      laws: [
        { title: 'UPI Fraud Refund', law: 'Under RBI guidelines, reporting an unauthorized digital transaction within 3 days ensures zero liability for the customer.', penalty: 'Bank must provisionally credit funds within 10 working days.', action: 'Call 1930 immediately to freeze the recipient bank accounts.' },
        { title: 'Identity Spoofing', law: 'Using synthetic voice clones or deepfake calls to extract money is a cognizable cyber crime.', penalty: 'IT Act Section 66D (imprisonment up to 3 years).', action: 'Report spoof accounts and phone numbers instantly.' }
      ]
    },
    {
      id: 'cat-tenant',
      title: 'Tenant & Property',
      gradient: 'from-emerald-50 to-teal-100',
      icon: '🏠',
      laws: [
        { title: 'Eviction Notice', law: 'A landlord cannot evict a tenant without a formal written notice of at least 30 days or a court order.', penalty: 'Illegal lockouts face penal action.', action: 'File a police complaint if locks are changed without due legal process.' },
        { title: 'Utility Cut-off', law: 'A landlord cannot cut off water, electricity, or basic amenities to force eviction.', penalty: 'Fines and recovery orders by rent control tribunals.', action: 'Lodge an immediate injunction request.' }
      ]
    },
    {
      id: 'cat-women',
      title: 'Women Safety & Rights',
      gradient: 'from-pink-50 to-rose-100',
      icon: '🛡️',
      laws: [
        { title: 'Zero FIR Provision', law: 'A woman can file a police report (FIR) at ANY station, regardless of where the crime occurred.', penalty: 'Station officers refusing to register face disciplinary action.', action: 'Demand registration of a "Zero FIR". The case will transfer to the correct station.' },
        { title: 'Right to Free Legal Aid', law: 'Female victims of assault have the right to free state-appointed legal counsel.', penalty: 'Constitutional guarantee under Article 39A.', action: 'Request a legal aid advocate at the police station.' }
      ]
    },
    {
      id: 'cat-consumer',
      title: 'Consumer Protection',
      gradient: 'from-violet-50 to-purple-100',
      icon: '🛒',
      laws: [
        { title: 'Overcharging MRP', law: 'Selling goods above the Maximum Retail Price (MRP) constitutes an unfair trade practice.', penalty: 'Fines starting at ₹25,000 for retailers.', action: 'Lodge complain via National Consumer Helpline.' },
        { title: 'Product Warranty Breach', law: 'Manufacturers are legally bound to repair or replace defective goods within the warranty term.', penalty: 'Product liability and compensation orders.', action: 'Send a formal legal notice via Registered Post.' }
      ]
    }
  ];

  // Perform interactive simulation
  const handleRunSimulation = () => {
    let result = {
      scenario: `As a ${userType} encountering ${issueType}:`,
      act: '',
      rights: '',
      action: ''
    };

    if (userType === 'Driver') {
      if (issueType === 'Bribe Request') {
        result.act = 'Prevention of Corruption Act, 1988';
        result.rights = 'It is a felony for an officer to demand currency for ignoring traffic regulations.';
        result.action = 'Refuse to pay. Record audio/video. State clearly: "I will pay only via official e-challan."';
      } else {
        result.act = 'Motor Vehicles Act, Section 130';
        result.rights = 'You are only required to show your physical/digital documents (via DigiLocker). Officers cannot snatch documents.';
        result.action = 'Show documents on your device screen. Do not hand them over physically if you suspect misconduct.';
      }
    } else if (userType === 'Tenant') {
      result.act = 'Rent Control Act / Model Tenancy Act';
      result.rights = 'Landlords cannot forcefully dispossess tenants or cut off utilities without a judicial eviction order.';
      result.action = 'Keep copies of rent receipts and tenancy agreement. Alert local civil authorities if locks are tampered with.';
    } else if (userType === 'Woman') {
      result.act = 'Section 354 IPC / BNS equivalent';
      result.rights = 'Absolute right to physical safety and immediate registration of Zero FIR at any precinct.';
      result.action = 'Call 112 or press Sentinel Emergency dispatch. You have the right to request a female officer for statements.';
    } else {
      result.act = 'Consumer Protection Act, 2019 / IT Act Sec 66';
      result.rights = 'Protection against deceptive online listings, cyber scams, and faulty refunds.';
      result.action = 'Take screenshots of transactions. File grievance on national cybercrime portal or call 1930.';
    }

    setSimulationResult(result);
  };

  // AI query search RAG simulator
  const handleSearchQuerySubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setAiLoading(true);
    setAiAnswer(null);

    setTimeout(() => {
      const cleanQuery = searchQuery.toLowerCase();
      let answer = {
        title: `Search Result: "${searchQuery}"`,
        summary: 'Relevant legal citation retrieved from Section 65B Certified Law Databases.',
        act: 'Indian Penal Code / Bharatiya Nyaya Sanhita',
        details: 'A citizen has the fundamental right of private defense of body and property as detailed under Section 96 to 106. No officer can forcefully harass or detenuate you without registered case files.',
        action: 'Request the officer for case diaries or official grounds of search. Record video proof if safety parameters are crossed.',
        citations: ['BNS Section 35(1)', 'CrPC Section 50']
      };

      if (cleanQuery.includes('key') || cleanQuery.includes('bike') || cleanQuery.includes('traffic')) {
        answer = {
          title: 'Traffic Stop Regulations',
          summary: 'Confiscating vehicle keys by traffic police officers.',
          act: 'Motor Vehicles Act, 1988',
          details: 'Confiscating or plucking the keys from a running vehicle is not legally sanctioned and represents illegal restraint.',
          action: 'Ask politely for the challan invoice. Refuse to hand over the ignition keys.',
          citations: ['MVA Section 130', 'KSP Traffic SOP #14']
        };
      } else if (cleanQuery.includes('cyber') || cleanQuery.includes('fraud') || cleanQuery.includes('scam') || cleanQuery.includes('money')) {
        answer = {
          title: 'Financial Cyber Crime Recovery',
          summary: 'Reporting unauthorized financial transfers and cyber fraud.',
          act: 'Information Technology Act, Section 66D',
          details: 'Under RBI rules, immediate notification of card/net banking fraud locks citizen liability and initiates interbank transaction freezing.',
          action: 'Lodge transaction IDs instantly on National Helpline 1930 to trigger cyber node blocks.',
          citations: ['RBI Circular DBR.No.Leg.BC.78', 'IT Act 2000']
        };
      }

      setAiAnswer(answer);
      setAiLoading(false);
    }, 1000);
  };

  return (
    <div className="subview-container select-text">
      
      {/* Header Overlay */}
      <div className="sticky top-0 bg-white border-b border-slate-200/80 px-4 py-4 flex items-center justify-between z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-700 transition-colors"
            title="Go back"
            style={{ minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-black text-slate-900 font-outfit uppercase tracking-wider">Citizen Law Library</h2>
            <p className="text-[10px] text-slate-500 font-medium -mt-0.5">Know Your Rights • Local Regulations</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-50 border border-yellow-100 rounded-full text-[9px] font-bold text-yellow-800 uppercase tracking-wide">
          <Compass className="w-3.5 h-3.5 text-yellow-600" /> Offline Mode
        </div>
      </div>

      {isReady ? (
        <div className="px-4 py-5 space-y-6 pb-24">

        {/* 1. SITUATION SIMULATOR HERO CARD */}
        <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs relative overflow-hidden">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Compass className="w-4 h-4 text-yellow-500" /> Situation Simulator
          </h3>
          
          {/* Mad-Libs builder */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-4 text-slate-800 text-sm font-semibold leading-loose">
            I am a{' '}
            <select 
              value={userType} 
              onChange={(e) => {
                const type = e.target.value;
                setUserType(type);
                setIssueType(userIssues[type][0]);
                setSimulationResult(null);
              }}
              className="mx-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-yellow-400 cursor-pointer shadow-xs font-bold"
              style={{ minHeight: '36px' }}
            >
              <option value="Driver">Driver / Commuter</option>
              <option value="Tenant">Tenant</option>
              <option value="Woman">Woman</option>
              <option value="Consumer">Consumer</option>
            </select>{' '}
            and I am facing a{' '}
            <select 
              value={issueType} 
              onChange={(e) => {
                setIssueType(e.target.value);
                setSimulationResult(null);
              }}
              className="mx-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-yellow-400 cursor-pointer shadow-xs font-bold"
              style={{ minHeight: '36px' }}
            >
              {userIssues[userType].map((issue) => (
                <option key={issue} value={issue}>{issue}</option>
              ))}
            </select>
            .
          </div>

          <button 
            onClick={handleRunSimulation}
            className="w-full py-3.5 bg-[#09090B] hover:bg-[#18181b] text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm font-outfit uppercase tracking-wider"
            style={{ minHeight: '44px' }}
          >
            <Sparkles className="w-4 h-4 text-yellow-400" /> Calculate Immediate Action
          </button>

          {/* Simulation Output */}
          <AnimatePresence>
            {simulationResult && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 border-t border-slate-100 pt-4 space-y-3 overflow-hidden"
              >
                <div className="p-3.5 bg-yellow-50/70 border border-yellow-100 rounded-xl">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-yellow-800 uppercase tracking-wide">Relevant Act</span>
                    <span className="text-[9px] font-bold text-slate-400 font-mono">BITE-SIZED</span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{simulationResult.act}</h4>
                  <p className="text-slate-600 text-xs mt-1.5 leading-relaxed font-semibold">{simulationResult.rights}</p>
                </div>

                <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide block mb-1">Immediate Legal Action</span>
                  <p className="text-slate-700 text-xs leading-relaxed font-semibold">{simulationResult.action}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* 2. DAILY RIGHTS FLASHCARDS (Discover Feed) */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            🔥 Daily Rights Feed (Tap to Flip)
          </h3>
          
          {/* Horizontal scroll snap row */}
          <div className="flex gap-4 overflow-x-auto snap-x scroll-smooth pb-3 px-1 scrollbar-none">
            {flashcards.map((card) => {
              const isFlipped = flippedCardId === card.id;
              const isBookmarked = bookmarkedLawIds.includes(card.id);

              return (
                <div 
                  key={card.id}
                  className="flex-shrink-0 w-[280px] h-[340px] snap-center perspective-1000 cursor-pointer"
                  onClick={() => setFlippedCardId(isFlipped ? null : card.id)}
                >
                  <motion.div 
                    className="relative w-full h-full duration-500 transform-style-3d"
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                  >
                    
                    {/* Front of Card */}
                    <div className="absolute inset-0 w-full h-full bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between backface-hidden shadow-xs hover:border-slate-300 transition-all">
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <span className="px-2.5 py-0.5 bg-yellow-50 border border-yellow-100 rounded-full text-[9px] font-bold text-yellow-800 uppercase tracking-wide">
                            Situation Card
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleBookmark(card.id);
                            }}
                            className={`p-2 rounded-lg border transition-colors ${
                              isBookmarked 
                                ? 'bg-yellow-100 border-yellow-200 text-yellow-700' 
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
                            }`}
                            title={isBookmarked ? 'Bookmarked' : 'Bookmark law'}
                            style={{ minWidth: '36px', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Bookmark className="w-3.5 h-3.5" fill={isBookmarked ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                        <h4 className="text-lg font-black text-slate-900 font-outfit leading-tight mb-3">
                          {card.title}
                        </h4>
                        <p className="text-slate-600 text-xs font-semibold leading-relaxed">
                          {card.frontDescription}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-4">
                        <span>Tap to Reveal Rights</span> ➜
                      </div>
                    </div>

                    {/* Back of Card (Flipped Y-180) */}
                    <div 
                      className="absolute inset-0 w-full h-full bg-yellow-50 border border-yellow-100 rounded-3xl p-6 flex flex-col justify-between backface-hidden shadow-xl text-slate-800 transform rotate-y-180"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="px-2.5 py-0.5 bg-yellow-100 border border-yellow-250 rounded-full text-[9px] font-bold text-yellow-800 uppercase tracking-wide">
                            {card.backTitle}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleBookmark(card.id);
                            }}
                            className={`p-2 rounded-lg border transition-colors ${
                              isBookmarked 
                                ? 'bg-yellow-200 border-yellow-300 text-yellow-800' 
                                : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                            }`}
                            style={{ minWidth: '36px', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Bookmark className="w-3.5 h-3.5" fill={isBookmarked ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-slate-600 text-[11px] font-semibold leading-relaxed">
                            {card.backContent}
                          </p>
                          <div className="bg-white border border-yellow-100 rounded-xl p-3 shadow-2xs">
                            <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                              Action to Take
                            </span>
                            <p className="text-slate-700 text-[10px] leading-relaxed font-semibold">
                              {card.action}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Tap card to flip back
                      </div>
                    </div>

                  </motion.div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. ASK AI FLOATING LEGAL ORB */}
        <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs relative overflow-hidden">
          <div className="absolute -left-12 -bottom-12 w-28 h-28 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-yellow-50 rounded-lg flex items-center justify-center border border-yellow-100">
              <Sparkles className="w-4 h-4 text-yellow-600 animate-pulse" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Ask AI Legal Copilot
            </h3>
          </div>

          <form onSubmit={handleSearchQuerySubmit} className="relative mb-3">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Can police seize my vehicle at night?"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-yellow-400 font-semibold shadow-2xs"
              style={{ minHeight: '44px' }}
            />
            <button 
              type="submit" 
              className="absolute right-2 top-2 p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
              style={{ minHeight: '36px', minWidth: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          {aiLoading && (
            <div className="py-4 text-center text-xs text-slate-500 font-semibold flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
              Scanning legal database nodes...
            </div>
          )}

          <AnimatePresence>
            {aiAnswer && !aiLoading && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-yellow-50/50 border border-yellow-100 rounded-2xl p-4 mt-3 space-y-3"
              >
                <div>
                  <span className="text-[9px] font-bold text-yellow-800 uppercase tracking-wider">Verified Citation</span>
                  <h4 className="font-extrabold text-sm text-slate-900">{aiAnswer.title}</h4>
                  <p className="text-slate-600 text-[11px] mt-1.5 leading-relaxed font-semibold">{aiAnswer.details}</p>
                </div>
                <div className="bg-white border border-slate-100 p-3 rounded-xl shadow-2xs">
                  <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">Your action</span>
                  <p className="text-slate-700 text-[10px] leading-relaxed font-semibold">{aiAnswer.action}</p>
                </div>
                <div className="flex gap-2.5 pt-1">
                  {aiAnswer.citations.map((cite, i) => (
                    <span key={i} className="px-2 py-0.5 bg-yellow-100 border border-yellow-200 rounded-md text-[8px] font-bold text-yellow-800">
                      🔖 {cite}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* 4. 3D CATEGORY GRID */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            📚 Browse Categories
          </h3>
          
          <div className="space-y-3">
            {categories.map((cat) => {
              const isExpanded = expandedCategory === cat.id;

              return (
                <div 
                  key={cat.id} 
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs transition-all animate-fade-in"
                >
                  {/* Category Header Card */}
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                    style={{ minHeight: '44px' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 bg-gradient-to-br ${cat.gradient} rounded-xl flex items-center justify-center text-lg shadow-2xs`}>
                        {cat.icon}
                      </div>
                      <h4 className="font-black text-slate-800 text-sm font-outfit">{cat.title}</h4>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Accordion Expansion */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-slate-50/50 border-t border-slate-100 overflow-hidden"
                      >
                        <div className="p-4 space-y-4">
                          {cat.laws.map((law, idx) => (
                            <div key={idx} className="bg-white border border-slate-200/85 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                              <h5 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide border-b border-slate-100 pb-1.5">
                                {law.title}
                              </h5>
                              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                                <div>
                                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">The Law</span>
                                  <p className="text-[10px] text-slate-700 mt-0.5 leading-relaxed font-semibold">{law.law}</p>
                                </div>
                                <div>
                                  <span className="text-[8px] font-bold text-[#E11D48] uppercase tracking-wider block">The Penalty</span>
                                  <p className="text-[10px] text-slate-700 mt-0.5 leading-relaxed font-semibold">{law.penalty}</p>
                                </div>
                                <div>
                                  <span className="text-[8px] font-bold text-emerald-700 uppercase tracking-wider block">Your Action</span>
                                  <p className="text-[10px] text-slate-700 mt-0.5 leading-relaxed font-semibold">{law.action}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              );
            })}
          </div>
        </section>

        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
