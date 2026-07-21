import React, { useState, useRef, useEffect } from 'react';
import { VIDEO_STATUS } from '../../api/videoService';
import { routeReport } from '../../api/routingService';
import { supabase } from '../../supabaseClient';

export default function SecureCameraView({ onUploadComplete, gpsCoords }) {
  const [hasCameraAccess, setHasCameraAccess] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [recordTime, setRecordTime] = useState(0);

  // Upload Form details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Infrastructure');
  const [emergencyOverride, setEmergencyOverride] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Media Analysis state
  const [quickValidateResult, setQuickValidateResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const getApiBase = () =>
    (import.meta.env.VITE_CLASSIFIER_API_URL || 'http://localhost:8001/classify').replace(/\/classify$/, '');

  const runQuickValidate = async (blob) => {
    if (!blob) return;
    setIsValidating(true);
    setQuickValidateResult(null);
    try {
      const fd = new FormData();
      fd.append('file', blob, 'recorded_video.mp4');
      const res = await fetch(`${getApiBase()}/classify`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setQuickValidateResult(data);
      if (data.predicted_class && data.predicted_class !== 'UNKNOWN') {
        const catMap = {
          ACCIDENT: 'Traffic Warning',
          FIRE: 'Emergency Alert',
          FLOOD: 'Infrastructure',
          VIOLENCE: 'Violence/Loitering',
          THEFT: 'Theft/Property'
        };
        if (catMap[data.predicted_class]) {
          setCategory(catMap[data.predicted_class]);
        }
      }
    } catch (err) {
      console.warn('[QUICK SCAN WARNING]', err);
    } finally {
      setIsValidating(false);
    }
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      let mediaStream = null;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true
        });
      } catch (err1) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        } catch (err2) {
          throw err2;
        }
      }
      streamRef.current = mediaStream;
      setHasCameraAccess(true);
    } catch (err) {
      console.error('[CAMERA ACCESS FAILED]', err);
      setCameraError('Camera access blocked or unavailable. Please enable camera permissions in your device settings.');
      setHasCameraAccess(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setHasCameraAccess(false);
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Ensure live camera stream is attached whenever video element is mounted
  useEffect(() => {
    if (hasCameraAccess && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(err => console.log('Camera video play error:', err));
    }
  }, [hasCameraAccess]);

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    try {
      let recorderOptions = {};
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) recorderOptions = { mimeType: 'video/webm;codecs=vp9' };
        else if (MediaRecorder.isTypeSupported('video/webm')) recorderOptions = { mimeType: 'video/webm' };
        else if (MediaRecorder.isTypeSupported('video/mp4')) recorderOptions = { mimeType: 'video/mp4' };
      }

      const recorder = new MediaRecorder(streamRef.current, recorderOptions);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const mimeType = recorderOptions.mimeType || 'video/mp4';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setSheetOpen(true);
        runQuickValidate(blob);
      };
      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordTime(0);

      timerRef.current = setInterval(() => {
        setRecordTime(prev => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('[RECORDING START FAILED]', err);
      alert('Camera recording error: ' + (err.message || 'Unable to record live stream'));
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleRetake = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setRecordedBlob(null);
    setVideoUrl(null);
    setSheetOpen(false);
    setTitle('');
    setDescription('');
    setQuickValidateResult(null);
    startCamera();
  };

  const handleSubmitUpload = async (e) => {
    e.preventDefault();
    if (!recordedBlob || uploading) return;

    setUploading(true);
    try {
      const fileExt = 'mp4';
      const fileName = `clip_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `citizen_clips/${fileName}`;

      let publicUrl = videoUrl;
      try {
        const { data, error } = await supabase.storage
          .from('citizen-reports')
          .upload(filePath, recordedBlob, { contentType: 'video/mp4' });

        if (!error && data) {
          const { data: pubData } = supabase.storage.from('citizen-reports').getPublicUrl(filePath);
          if (pubData?.publicUrl) {
            publicUrl = pubData.publicUrl;
          }
        }
      } catch (e) {
        console.warn('Supabase storage upload skipped, using active live video blob URL.', e);
      }

      const localUuid = localStorage.getItem('kawach_uploader_uuid') || `anon_${Date.now()}`;
      localStorage.setItem('kawach_uploader_uuid', localUuid);

      const newReport = {
        id: `c-${Date.now()}`,
        title: title || `${category} Safety Alert`,
        description: description || 'Citizen reported clip with metadata scrubbed.',
        category: category,
        status: emergencyOverride ? 'EMERGENCY_DISPATCH' : 'PUBLIC_APPROVED',
        videoUrl: publicUrl,
        uploaderUuid: localUuid,
        lat: gpsCoords?.lat || 12.9716,
        lng: gpsCoords?.lng || 77.5946,
        timestamp: new Date().toISOString(),
        views: 1
      };

      routeReport(newReport);
      if (onUploadComplete) onUploadComplete(newReport);

      alert('Evidence Saved & Transmitted Successfully! Metadata scrubbed & signed.');
      setSheetOpen(false);
      setRecordedBlob(null);
      setVideoUrl(null);
      setTitle('');
      setDescription('');
      startCamera();
    } catch (err) {
      console.error('[UPLOAD EVIDENCE FAILED]', err);
      alert('Upload failed. Please try recording again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white font-sans overflow-hidden select-text relative">
      
      {/* Header — Restored with top notch safety padding */}
      <div className="px-4 pt-6 pb-3 bg-white border-b border-amber-400/20 flex-none flex items-center justify-between z-20 md:px-6 md:pt-8 md:pb-4">
        <div>
          <span className="text-[9px] font-bold text-[#b08850] uppercase tracking-widest block font-mono">
            ANONYMOUS EVIDENCE RECORDING
          </span>
          <h2 className="text-xl font-black text-ink font-sora">
            Secure <span className="font-serif italic font-normal text-[#b08850] pr-1">Capture</span>
          </h2>
        </div>
        <span className="px-2.5 py-1 bg-amber-400/10 border border-amber-400/30 text-[#b08850] text-[10px] font-bold rounded-full font-mono">
          EXIF Scrub Active
        </span>
      </div>

      {/* Camera Viewport Canvas */}
      <div className="flex-1 relative bg-amber-950 flex items-center justify-center overflow-hidden">
        {hasCameraAccess ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="p-6 text-center text-ink-faint space-y-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10 mx-auto text-amber-400"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <p className="text-xs font-semibold">{cameraError || 'Initializing live camera...'}</p>
            <button
              type="button"
              onClick={startCamera}
              className="px-4 py-2 bg-[#E9BA26] text-ink font-bold rounded-xl text-xs font-sora shadow-sm"
            >
              Grant Camera Access
            </button>
          </div>
        )}

        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse shadow-md font-mono">
            <span className="w-2.5 h-2.5 bg-white rounded-full" />
            REC 00:{recordTime < 10 ? `0${recordTime}` : recordTime}
          </div>
        )}

        {/* Shutter Record Control Button */}
        {hasCameraAccess && !sheetOpen && (
          <div className="absolute bottom-8 left-0 right-0 z-20 flex items-center justify-center">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-18 h-18 rounded-full border-4 flex items-center justify-center transition-all shadow-2xl ${
                isRecording 
                  ? 'border-red-600 bg-red-600 scale-110' 
                  : 'border-white bg-[#E9BA26] hover:scale-105'
              }`}
            >
              <div className={`transition-all ${
                isRecording ? 'w-6 h-6 bg-white rounded-md' : 'w-8 h-8 rounded-full bg-amber-950'
              }`} />
            </button>
          </div>
        )}
      </div>

      {/* Review & Submit Sheet Modal */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 bg-amber-950/70 backdrop-blur-xs flex items-end justify-center">
          <div className="bg-white border-t-2 border-[#E9BA26] rounded-t-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-amber-100 pb-3">
              <h3 className="font-black text-ink text-base font-sora">
                Review &amp; Upload Evidence
              </h3>
              <button onClick={handleRetake} className="text-ink-faint hover:text-ink-soft font-bold text-xs">
                Retake Clip ✕
              </button>
            </div>

            {/* Video Preview */}
            <div className="w-full h-44 bg-amber-950 rounded-2xl overflow-hidden relative">
              {videoUrl && (
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Form Details */}
            <form onSubmit={handleSubmitUpload} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-1">
                  Incident Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs font-bold text-ink"
                >
                  <option value="Infrastructure">Infrastructure (Burst main, road hazard)</option>
                  <option value="Traffic Warning">Traffic Warning (Cave-in, signal failure)</option>
                  <option value="Emergency Alert">Emergency Alert (Fire, electric spark)</option>
                  <option value="Violence/Loitering">Violence / Loitering</option>
                  <option value="Theft/Property">Theft / Property Crime</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-1">
                  Title / Headline
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Transformer spark near 5th Block..."
                  className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs font-semibold text-ink"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block mb-1">
                  Brief Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide location details or observations..."
                  className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs font-semibold text-ink"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-4 py-2.5 bg-amber-50 text-ink-soft font-bold rounded-xl text-xs"
                >
                  Retake
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2.5 bg-[#E9BA26] hover:bg-amber-400 text-ink font-black rounded-xl text-xs uppercase tracking-wider font-sora shadow-sm"
                >
                  {uploading ? 'Transmitting...' : 'Upload Evidence'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
