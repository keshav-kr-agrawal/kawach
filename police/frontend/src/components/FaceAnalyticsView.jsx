import React, { useState } from 'react';
import { Camera, Search, User, Check, X, AlertTriangle, Users, HeartHandshake, Eye } from 'lucide-react';

function FaceAnalyticsView({ token, user }) {
  const [selectedPhoto, setSelectedPhoto] = useState('suspect1');
  const [scanning, setScanning] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Configured mock matching results
  const mockMatches = {
    'suspect1': {
      label: 'Watchlist Suspect A (Ramesh Kumar)',
      match_type: 'Criminal Watchlist Match',
      similarity: 94.8,
      profile: {
        id: 'OFF-0011',
        name: 'Ramesh Kumar',
        age: 58,
        gender: 'Male',
        syndicate: 'KGF Syndicate',
        risk_score: 94.2,
        remarks: 'Wanted in 3 cases of extortion and physical assaults near Bengaluru.'
      }
    },
    'suspect2': {
      label: 'Watchlist Suspect B (Zia Ahmed)',
      match_type: 'Criminal Watchlist Match',
      similarity: 91.2,
      profile: {
        id: 'OFF-0021',
        name: 'Zia Ahmed',
        age: 29,
        gender: 'Male',
        syndicate: 'Electronic City Cyber Cartel',
        risk_score: 91.0,
        remarks: 'Primary suspect in coordinated financial phishing complaints.'
      }
    },
    'missing1': {
      label: 'Missing Person Scan (Amit Gowda)',
      match_type: 'Missing Person Registry Match',
      similarity: 88.3,
      profile: {
        id: 'MP-0001',
        name: 'Amit Gowda 45',
        age: 14,
        gender: 'Male',
        last_seen: '2025-06-12 at Koramangala, Bengaluru',
        remarks: 'Reported missing 2 weeks ago. Inform beat patrol immediately.'
      }
    }
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedImage(URL.createObjectURL(file));
      setMatchResult(null);
      setFeedbackMsg('');
    }
  };

  const handleRunMatch = (key) => {
    setScanning(true);
    setMatchResult(null);
    setFeedbackMsg('');

    setTimeout(() => {
      setScanning(false);
      setMatchResult(mockMatches[key || selectedPhoto]);
    }, 1500);
  };

  const handleConfirmMatch = () => {
    setFeedbackMsg('✅ Match confirmed in logs. Dispatch alert dispatched to local police station beat patrol.');
    setMatchResult(null);
  };

  const handleRejectMatch = () => {
    setFeedbackMsg('❌ Match suggestion rejected. Logged as false-positive anomaly to refine model weights.');
    setMatchResult(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-auto lg:h-[calc(100vh-12rem)]">
      {/* Target Upload/Selector Pane */}
      <div className="lg:col-span-2 flex flex-col space-y-6 h-full">
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-[340px]">
          <div>
            <div className="flex items-center space-x-2.5 mb-5">
              <Camera className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Face Recognition Matcher</h3>
            </div>
            <p className="text-[10px] text-slate-400 mb-4">Provide a camera crop of a suspect or missing person to search the unified state registries:</p>

            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Registry Match Target</label>
                <select
                  value={selectedPhoto}
                  onChange={(e) => { setSelectedPhoto(e.target.value); setMatchResult(null); setUploadedImage(null); setFeedbackMsg(''); }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                >
                  <option value="suspect1">Suspect Crop (Ramesh Kumar - Watchlist)</option>
                  <option value="suspect2">Suspect Crop (Zia Ahmed - Watchlist)</option>
                  <option value="missing1">Missing Child Query (Amit Gowda - Missing Persons)</option>
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleRunMatch(selectedPhoto)}
            disabled={scanning}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-100 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{scanning ? "Comparing Face Signatures..." : "Run Face Match"}</span>
          </button>
        </div>

        {/* Upload box */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center flex-1 min-h-[220px]">
          {uploadedImage ? (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <img src={uploadedImage} alt="Uploaded face" className="max-h-40 rounded-lg object-contain shadow-sm" />
              <button 
                onClick={() => handleRunMatch('suspect1')}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow"
              >
                Match Uploaded Face
              </button>
            </div>
          ) : (
            <label className="w-full h-full border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors p-6">
              <Camera className="w-8 h-8 text-slate-400 mb-3" />
              <span className="text-xs font-semibold text-slate-700">Upload Face Photo</span>
              <span className="text-[10px] text-slate-400 mt-1">Supports clear front portraits</span>
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            </label>
          )}
        </div>
      </div>

      {/* Match Results Pane */}
      <div className="lg:col-span-3 flex flex-col h-full overflow-y-auto pl-1">
        {feedbackMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold text-center shadow-sm mb-6 animate-fade-in">
            {feedbackMsg}
          </div>
        )}

        {scanning && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center h-full text-center space-y-4 shadow-sm">
            <div className="relative w-20 h-20 rounded-full flex items-center justify-center border-4 border-indigo-50 border-t-indigo-600 animate-spin">
              <User className="w-8 h-8 text-indigo-400 absolute" />
            </div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Matching Facial Vector Nodes</h4>
            <p className="text-[11px] text-slate-400 max-w-[280px] leading-relaxed">Mapping facial landmarks, eye coordinates, and jaw registration angles against 2,000+ offender profiles and missing person registries.</p>
          </div>
        )}

        {!scanning && !matchResult && !feedbackMsg && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center h-full text-center text-slate-500 shadow-sm p-8">
            <Users className="w-12 h-12 text-slate-300 mb-3" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Awaiting Face Match</h4>
            <p className="text-xs mt-2 max-w-[240px] leading-relaxed">Select a face image query and run the signature match tool to locate matches in the data registries.</p>
          </div>
        )}

        {!scanning && matchResult && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 animate-fade-in">
            {/* Rationale header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                  matchResult.match_type.includes('Watchlist') ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-blue-50 text-blue-600 border-blue-200'
                }`}>
                  {matchResult.match_type.toUpperCase()}
                </span>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl">
                {matchResult.similarity}% Match Similarity
              </span>
            </div>

            {/* Profile Match details */}
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400">Match Name</span>
                    <span className="text-slate-800 font-bold mt-0.5 block">{matchResult.profile.name}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400">Profile ID</span>
                    <span className="text-slate-800 font-bold mt-0.5 block font-mono">{matchResult.profile.id}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400">Age / Gender</span>
                    <span className="text-slate-800 font-bold mt-0.5 block">{matchResult.profile.age} yrs • {matchResult.profile.gender}</span>
                  </div>
                  {matchResult.profile.risk_score && (
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400">Offender Risk Score</span>
                      <span className="text-rose-600 font-bold mt-0.5 block">{matchResult.profile.risk_score}%</span>
                    </div>
                  )}
                  {matchResult.profile.last_seen && (
                    <div className="col-span-2">
                      <span className="text-[9px] uppercase font-bold text-slate-400">Last Seen Details</span>
                      <span className="text-slate-800 font-bold mt-0.5 block">{matchResult.profile.last_seen}</span>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-slate-200/60 my-2 pt-2">
                  <span className="text-[9px] uppercase font-bold text-slate-400">Investigator Remarks</span>
                  <p className="text-slate-600 mt-1 leading-relaxed">{matchResult.profile.remarks}</p>
                </div>
              </div>
            </div>

            {/* Human in the loop confirm controls */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={handleConfirmMatch}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-100 transition-all flex items-center justify-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Identity & Dispatch</span>
              </button>
              <button
                onClick={handleRejectMatch}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Reject Match</span>
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start space-x-2 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[10px] text-amber-900 leading-normal">
                <strong>Legal Guardrail:</strong> Face analytics suggestions require manual human validation BEFORE any dispatch or containment measure is initiated.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FaceAnalyticsView;
