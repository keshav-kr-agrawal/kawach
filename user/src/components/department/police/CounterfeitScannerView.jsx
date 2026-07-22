import React, { useState } from 'react';
import { Shield, Upload, CheckCircle, XCircle, AlertCircle, Camera, Sparkles, RefreshCw, Sun, Zap } from 'lucide-react';

const getClassifierBase = () =>
  (import.meta.env.VITE_CLASSIFIER_API_URL || 'http://localhost:8001/classify').replace(/\/classify$/, '');

const VERDICT_STYLES = {
  GENUINE: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  LIKELY_GENUINE: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  SUSPECT_FEATURES: 'text-amber-600 bg-amber-50 border-amber-200',
  LIKELY_COUNTERFEIT: 'text-rose-600 bg-rose-50 border-rose-200',
  COUNTERFEIT: 'text-rose-600 bg-rose-50 border-rose-200',
  NOT_A_CURRENCY_NOTE: 'text-slate-600 bg-slate-50 border-slate-200',
  INSUFFICIENT_QUALITY: 'text-slate-600 bg-slate-50 border-slate-200',
};

function CounterfeitScannerView() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [captureMode, setCaptureMode] = useState('visible'); // 'visible' | 'uv'
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);

  const handleUploadImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedImage(URL.createObjectURL(file));
      setUploadedFile(file);
      setScanResult(null);
      setScanError(null);
    }
  };

  const handleRunScan = async () => {
    if (!uploadedFile) return;
    setScanning(true);
    setScanResult(null);
    setScanError(null);

    try {
      const form = new FormData();
      form.append('file', uploadedFile);
      const res = await fetch(
        `${getClassifierBase()}/classify-currency?capture_mode=${captureMode}`,
        { method: 'POST', body: form }
      );
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || `Classifier returned ${res.status}`);
      }
      const result = await res.json();
      setScanResult(result);
    } catch (err) {
      console.error('[CURRENCY SCAN] Real classifier call failed:', err);
      setScanError(err.message || 'Could not reach the currency classifier service.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-auto lg:h-[calc(100vh-12rem)]">
      {/* Upload/Selection Workspace Panel */}
      <div className="lg:col-span-2 flex flex-col space-y-6 h-full">
        {/* Scanner Controller */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-[220px]">
          <div>
            <div className="flex items-center space-x-2.5 mb-5">
              <Camera className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Counterfeit Scanning Agent (Live Classifier)</h3>
            </div>
            <p className="text-[10px] text-slate-400 mb-4">Upload a real currency note photo — this calls the live `/classify-currency` model (CNN + OCR + structural checks), the same pipeline used by the citizen app's Nayak chat.</p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCaptureMode('visible')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold border transition-colors ${captureMode === 'visible' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}
              >
                <Sun className="w-3 h-3" /> Visible Light
              </button>
              <button
                onClick={() => setCaptureMode('uv')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold border transition-colors ${captureMode === 'uv' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}
              >
                <Zap className="w-3 h-3" /> UV Capture
              </button>
            </div>
          </div>
        </div>

        {/* Live Upload Box */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center flex-1 min-h-[220px]">
          {uploadedImage ? (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <img src={uploadedImage} alt="Uploaded currency crop" className="max-h-40 rounded-lg object-contain shadow-sm" />
              <button
                onClick={handleRunScan}
                disabled={scanning}
                className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
                {scanning ? 'Analyzing...' : 'Run Security Scan'}
              </button>
              <button
                onClick={() => { setUploadedImage(null); setUploadedFile(null); setScanResult(null); setScanError(null); }}
                className="mt-2 text-[10px] text-slate-400 underline"
              >
                Choose a different photo
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
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Running Real CNN + OCR Pipeline</h4>
            <p className="text-[11px] text-slate-400 max-w-[280px] leading-relaxed">Image-quality gate, note-presence gate, EasyOCR pass, serial/text structural checks, and CNN advisory scoring — live on the Classifier service.</p>
          </div>
        )}

        {!scanning && scanError && (
          <div className="glass-panel p-6 rounded-2xl border border-rose-200 flex flex-col items-center justify-center h-full text-center text-rose-600 shadow-sm p-8">
            <XCircle className="w-12 h-12 text-rose-300 mb-3" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Classifier Unreachable</h4>
            <p className="text-xs mt-2 max-w-[280px] leading-relaxed text-slate-500">{scanError}</p>
            <p className="text-[10px] mt-3 text-slate-400">No verdict is fabricated when the model is offline — start the Classifier service (port 8001) and retry.</p>
          </div>
        )}

        {!scanning && !scanError && !scanResult && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center h-full text-center text-slate-500 shadow-sm p-8">
            <Shield className="w-12 h-12 text-slate-300 mb-3" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Scan Report Pending</h4>
            <p className="text-xs mt-2 max-w-[240px] leading-relaxed">Upload a currency note photo and click "Run Security Scan" to call the live model.</p>
          </div>
        )}

        {!scanning && !scanError && scanResult && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 animate-fade-in">
            {/* Header / Verdict */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Denomination</span>
                <span className="text-xs font-bold text-slate-800 font-mono mt-0.5 block">
                  {scanResult.denomination ? `₹${scanResult.denomination}` : 'Unidentified'}
                  {scanResult.confidence ? ` · ${scanResult.confidence} confidence` : ''}
                </span>
              </div>
              <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${VERDICT_STYLES[scanResult.verdict] || 'text-slate-600 bg-slate-50 border-slate-200'}`}>
                {(scanResult.verdict || 'UNKNOWN').replace(/_/g, ' ')}
              </span>
            </div>

            {scanResult.authenticity_score != null && (
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Authenticity Score</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${scanResult.authenticity_score >= 60 ? 'bg-emerald-500' : scanResult.authenticity_score >= 30 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${scanResult.authenticity_score}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-700">{scanResult.authenticity_score}%</span>
              </div>
            )}

            {/* Feature Checkpoints (real security_checks from the model) */}
            {Array.isArray(scanResult.security_checks) && scanResult.security_checks.length > 0 && (
              <div className="space-y-4">
                <h5 className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">Security Feature Checkpoints</h5>
                <div className="space-y-3">
                  {scanResult.security_checks.map((chk, idx) => {
                    const passed = chk.score != null ? chk.score >= 0.5 : null;
                    return (
                      <div key={idx} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-800">{(chk.feature || '').replace(/_/g, ' ')}</span>
                          <p className="text-[10px] text-slate-500 leading-relaxed">{chk.finding}</p>
                        </div>
                        {passed !== null && (
                          <span className={`flex items-center space-x-1 px-2.5 py-1 rounded font-bold text-[9px] shrink-0 border ${
                            passed ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                          }`}>
                            {passed ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            <span>{chk.tier}</span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Guidance / Disclaimer from the real model */}
            {(scanResult.guidance || scanResult.disclaimer) && (
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start space-x-3 text-xs">
                <AlertCircle className="w-4.5 h-4.5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h6 className="font-bold text-blue-950 uppercase tracking-wider text-[10px]">Verification Note</h6>
                  {scanResult.guidance && <p className="text-blue-900/80 mt-1 leading-relaxed text-[11px]">{scanResult.guidance}</p>}
                  {scanResult.disclaimer && <p className="text-blue-900/60 mt-1 leading-relaxed text-[10px] italic">{scanResult.disclaimer}</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CounterfeitScannerView;
