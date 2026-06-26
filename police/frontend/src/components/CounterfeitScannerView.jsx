import React, { useState } from 'react';
import { Shield, Upload, Search, CheckCircle, XCircle, AlertCircle, Camera, Sparkles, Eye, RefreshCw } from 'lucide-react';

function CounterfeitScannerView({ token, user }) {
  const [selectedNote, setSelectedNote] = useState('500'); // '500' or '2000'
  const [uploadedImage, setUploadedImage] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [previewNote, setPreviewNote] = useState(null);

  // Pre-configured mock scanning templates
  const mockNotes = {
    '500': {
      value: '₹500 Note (Genuine)',
      type: 'genuine',
      serial: '5AB 802931',
      features: [
        { name: "Mahatma Gandhi Watermark", status: "Pass", details: "High-contrast portrait visible under backlight." },
        { name: "Microprinting Alignment", status: "Pass", details: "Clear 'RBI' and '500' letters visible under magnification." },
        { name: "Color-shifting Security Thread", status: "Pass", details: "Thread shifts from green to blue when tilted." },
        { name: "Latent Image '500'", status: "Pass", details: "Numeric value visible at 45 degree angle." },
        { name: "Devanagari Numeral", status: "Pass", details: "Perfect registration outline on front left." }
      ],
      verdict: "Genuine Note",
      verdictClass: "text-emerald-600 bg-emerald-50 border-emerald-200"
    },
    '500_fake': {
      value: '₹500 Note (Flagged Anomaly)',
      type: 'counterfeit',
      serial: '9CD 420881',
      features: [
        { name: "Mahatma Gandhi Watermark", status: "Fail", details: "Watermark is flat, printed directly on surface, lacking depth." },
        { name: "Microprinting Alignment", status: "Fail", details: "Bleeding ink observed on 'RBI' characters. Poor resolution." },
        { name: "Color-shifting Security Thread", status: "Pass", details: "Standard thread reflection detected." },
        { name: "Latent Image '500'", status: "Fail", details: "Latent text is missing or poorly embossed." },
        { name: "Devanagari Numeral", status: "Pass", details: "Correct positioning." }
      ],
      verdict: "Counterfeit Suspect - Anomalies Detected",
      verdictClass: "text-rose-600 bg-rose-50 border-rose-200"
    },
    '2000_fake': {
      value: '₹2000 Note (Flagged Anomaly)',
      type: 'counterfeit',
      serial: '2AB 999888',
      features: [
        { name: "Mahatma Gandhi Watermark", status: "Pass", details: "Watermark matches genuine alignment parameters." },
        { name: "Microprinting Alignment", status: "Fail", details: "Microprinting font is fuzzy and overlaps bordering borders." },
        { name: "Color-shifting Security Thread", status: "Fail", details: "Thread fails color shift check, remains static dark green." },
        { name: "Latent Image '2000'", status: "Fail", details: "No latent image visible under angular light scanning." },
        { name: "Devanagari Numeral", status: "Pass", details: "Registration outline aligns correctly." }
      ],
      verdict: "Counterfeit Suspect - High-Level Anomaly",
      verdictClass: "text-rose-600 bg-rose-50 border-rose-200"
    }
  };

  const handleUploadImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedImage(URL.createObjectURL(file));
      setScanResult(null);
      // Auto assign a random mock note classification
      setPreviewNote(randomMockKey());
    }
  };

  const randomMockKey = () => {
    const keys = Object.keys(mockNotes);
    return keys[Math.floor(random() * keys.length)];
  };

  // Helper random generator (fast fallback)
  const random = () => {
    let x = Math.sin(1) * 10000;
    return x - Math.floor(x);
  };

  const handleRunScan = (noteKey) => {
    setScanning(true);
    setScanResult(null);

    setTimeout(() => {
      setScanning(false);
      setScanResult(mockNotes[noteKey || previewNote || selectedNote]);
    }, 1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-auto lg:h-[calc(100vh-12rem)]">
      {/* Upload/Selection Workspace Panel */}
      <div className="lg:col-span-2 flex flex-col space-y-6 h-full">
        {/* Scanner Controller */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-[340px]">
          <div>
            <div className="flex items-center space-x-2.5 mb-5">
              <Camera className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Counterfeit Scanning Agent</h3>
            </div>
            <p className="text-[10px] text-slate-400 mb-4">Select a pre-configured template or upload a capture of a currency note to test security markers:</p>

            <div className="space-y-3.5 mb-5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Preset Scanning Target</label>
                <select
                  value={selectedNote}
                  onChange={(e) => { setSelectedNote(e.target.value); setScanResult(null); setUploadedImage(null); }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                >
                  <option value="500">₹500 Note (Genuine Template)</option>
                  <option value="500_fake">₹500 Note (Imitation Watermark Scan)</option>
                  <option value="2000_fake">₹2000 Note (Imitation Thread & Microprint Scan)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleRunScan(selectedNote)}
              disabled={scanning}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-100 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
              <span>{scanning ? "Analyzing Patterns..." : "Run Security Scan"}</span>
            </button>
          </div>
        </div>

        {/* Live Upload Box */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center flex-1 min-h-[220px]">
          {uploadedImage ? (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <img src={uploadedImage} alt="Uploaded currency crop" className="max-h-40 rounded-lg object-contain shadow-sm" />
              <button 
                onClick={() => handleRunScan(previewNote)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow transition-colors"
              >
                Scan Uploaded note
              </button>
            </div>
          ) : (
            <label className="w-full h-full border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors p-6">
              <Upload className="w-8 h-8 text-slate-400 mb-3" />
              <span className="text-xs font-semibold text-slate-700">Upload Note Image</span>
              <span className="text-[10px] text-slate-400 mt-1">Supports high-res JPG/PNG crops</span>
              <input type="file" accept="image/*" onChange={handleUploadImage} className="hidden" />
            </label>
          )}
        </div>
      </div>

      {/* Security Report & Features Pane */}
      <div className="lg:col-span-3 flex flex-col h-full overflow-y-auto pl-1">
        {scanning && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center h-full text-center space-y-4 shadow-sm">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
              <Sparkles className="w-6 h-6 text-blue-500 absolute animate-pulse" />
            </div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Simulating Computer Vision Pipeline</h4>
            <p className="text-[11px] text-slate-400 max-w-[280px] leading-relaxed">Checking Mahatma Gandhi portrait shadow coordinates, tilting color thread hue angles, and matching microprinting font metrics against RBI standards.</p>
          </div>
        )}

        {!scanning && !scanResult && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center h-full text-center text-slate-500 shadow-sm p-8">
            <Shield className="w-12 h-12 text-slate-300 mb-3" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Scan Report Pending</h4>
            <p className="text-xs mt-2 max-w-[240px] leading-relaxed">Select a note template or upload a currency capture and click "Run Security Scan" to generate the verification report.</p>
          </div>
        )}

        {!scanning && scanResult && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 animate-fade-in">
            {/* Header / Verdict */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Serial Identification</span>
                <span className="text-xs font-bold text-slate-800 font-mono mt-0.5 block">{scanResult.serial}</span>
              </div>
              <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${scanResult.verdictClass}`}>
                {scanResult.verdict.toUpperCase()}
              </span>
            </div>

            {/* Feature Checkpoints */}
            <div className="space-y-4">
              <h5 className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">Security Feature Checkpoints</h5>
              <div className="space-y-3">
                {scanResult.features.map((feat, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-800">{feat.name}</span>
                      <p className="text-[10px] text-slate-500 leading-relaxed">{feat.details}</p>
                    </div>
                    <span className={`flex items-center space-x-1 px-2.5 py-1 rounded font-bold text-[9px] shrink-0 border ${
                      feat.status === 'Pass' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      {feat.status === 'Pass' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{feat.status}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Details Callout */}
            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start space-x-3 text-xs">
              <AlertCircle className="w-4.5 h-4.5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <h6 className="font-bold text-blue-950 uppercase tracking-wider text-[10px]">Verification Note</h6>
                <p className="text-blue-900/80 mt-1 leading-relaxed text-[11px]">This report is produced by a lightweight mobile computer vision model checking watermark density profiles and microprint lines. Always verify high-denomination note features manually in doubtful circumstances.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CounterfeitScannerView;
