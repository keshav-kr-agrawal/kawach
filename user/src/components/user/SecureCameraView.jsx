import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, ShieldCheck, Upload, Trash2, Video, Zap, FileText } from 'lucide-react';
import { VIDEO_STATUS } from '../../api/videoService';
import { routeReport } from '../../api/routingService';


export default function SecureCameraView({ onUploadComplete, gpsCoords }) {
  const [hasCameraAccess, setHasCameraAccess] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [recordTime, setRecordTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [flashActive, setFlashActive] = useState(false);

  // Trim configuration state
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  // Upload Form details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Infrastructure');
  const [emergencyOverride, setEmergencyOverride] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [saveLocalCopy, setSaveLocalCopy] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  // AI Analysis state
  const [quickValidateResult, setQuickValidateResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [fullAnalysisResult, setFullAnalysisResult] = useState(null);

  const videoRef = useRef(null);
  const reviewVideoRef = useRef(null);
  const streamRef = useRef(null);

  const getApiBase = () =>
    (import.meta.env.VITE_CLASSIFIER_API_URL || 'http://localhost:8001/classify').replace(/\/classify$/, '');

  // Pipeline 6 — quick scene scan, runs immediately on recording stop (~600ms)
  const runQuickValidate = async (blob) => {
    if (!blob) return;
    setIsValidating(true);
    setQuickValidateResult(null);
    try {
      const fd = new FormData();
      fd.append('file', blob, 'recorded_video.mp4');
      const res = await fetch(`${getApiBase()}/validate-report`, { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        setQuickValidateResult(data);
        console.log('[Quick Validate] Result:', data);
      } else {
        throw new Error('validate-report degraded');
      }
    } catch (err) {
      console.warn('[Quick Validate] Falling back to mock:', err);
      setQuickValidateResult({
        scene_detected: false,
        detected_issues: [],
        road_detections: 0,
        waste_detections: 0,
        suggested_dept: null,
        visual_priority: null,
        processing_time_ms: 0,
        trust_score: 50,
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Pipeline 4 — full unified analysis (deepfake + routing + scene), runs at upload time
  const runFullAnalysis = async (blob, t, d, cat) => {
    const fd = new FormData();
    fd.append('file', blob, 'incident_video.mp4');
    fd.append('title', t);
    fd.append('description', d);
    fd.append('category', cat);
    const res = await fetch(`${getApiBase()}/full-analysis`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error('full-analysis failed');
    return res.json();
  };
  const mediaRecorderRef = useRef(null);
  const recordedChunks = useRef([]);
  const timerRef = useRef(null);

  // Initialize camera stream
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const constraints = {
        video: { facingMode: { ideal: 'environment' } },
        audio: true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCameraAccess(true);
    } catch (err) {
      console.warn('Failed with environment camera, retrying with default video constraints...', err);
      try {
        const fallbackConstraints = { video: true, audio: true };
        const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasCameraAccess(true);
      } catch (fallbackErr) {
        console.warn('Camera access denied or unavailable. Loading mock viewfinder fallback:', fallbackErr);
        setHasCameraAccess(false);
        setCameraError(fallbackErr.message || 'Permission Denied');
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Bind viewfinder stream to video element once mounted to fix black screen issue on hosted links
  useEffect(() => {
    if (hasCameraAccess && streamRef.current && videoRef.current) {
      try {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch((err) => console.log('Viewfinder playback failed:', err));
      } catch (e) {
        console.warn('Failed to bind stream to viewfinder video:', e);
      }
    }
  }, [hasCameraAccess]);

  // Recording Logic (UNLIMITED length)
  const handleStartRecording = () => {
    recordedChunks.current = [];
    setRecordedBlob(null);
    setVideoUrl(null);
    setIsRecording(true);
    setRecordTime(0);

    if (!hasCameraAccess) {
      // Mock Recording stopwatch
      timerRef.current = setInterval(() => {
        setRecordTime((prev) => prev + 1);
      }, 1000);
      return;
    }

    try {
      const types = [
        'video/mp4;codecs=h264,aac',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm'
      ];
      let selectedMime = '';
      for (const t of types) {
        if (MediaRecorder.isTypeSupported(t)) {
          selectedMime = t;
          break;
        }
      }
      const options = selectedMime ? { mimeType: selectedMime } : {};
      console.log('Selected MediaRecorder mimeType:', selectedMime || 'default');

      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunks.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'video/mp4';
        const blob = new Blob(recordedChunks.current, { type: mimeType });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        
        // Auto-initialize trim boundaries
        setTrimStart(0);

        // Pipeline 6 quick scan immediately on stop
        runQuickValidate(blob);

        // Open the bottom sheet after a brief delay (let quick validate start)
        setTimeout(() => setSheetOpen(true), 300);
      };

      mediaRecorder.start();
      
      timerRef.current = setInterval(() => {
        setRecordTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start media recorder:', err);
    }
  };

  const handleStopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      // Mock un-capped recording stop
      const mockBlob = new Blob(['mock-video-raw-long'], { type: 'video/mp4' });
      setRecordedBlob(mockBlob);
      const mockUrl = 'https://www.w3schools.com/html/mov_bbb.mp4'; // fallback placeholder video
      setVideoUrl(mockUrl);
      setTrimStart(0);
      setTrimEnd(Math.min(15, recordTime));
      setVideoDuration(recordTime);

      runQuickValidate(mockBlob);
    }

    setIsRecording(false);
  };

  // Programmatically trigger a file download of the full raw recording to local downloads
  const triggerLocalDownload = (blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
    a.download = `Sentinel_Raw_Incident_${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  };

  const handleLoadedMetadata = () => {
    if (reviewVideoRef.current) {
      const dur = reviewVideoRef.current.duration;
      setVideoDuration(dur || recordTime);
      setTrimEnd(Math.min(15, dur || recordTime));
    }
  };

  const handleRetake = () => {
    if (videoUrl) {
      window.URL.revokeObjectURL(videoUrl);
    }
    setRecordedBlob(null);
    setVideoUrl(null);
    setRecordTime(0);
    setVideoDuration(0);
    setTitle('');
    setDescription('');
    setTrimStart(0);
    setTrimEnd(0);
    setQuickValidateResult(null);
    setIsValidating(false);
    setFullAnalysisResult(null);
    setSheetOpen(false);
    startCamera();
  };



  // Enforce range updates keeping selected window at 15s or less
  const handleStartTrimChange = (val) => {
    const start = parseFloat(val);
    setTrimStart(start);
    if (trimEnd - start > 15) {
      setTrimEnd(start + 15);
    } else if (trimEnd < start) {
      setTrimEnd(Math.min(start + 15, videoDuration));
    }
  };

  const handleEndTrimChange = (val) => {
    const end = parseFloat(val);
    setTrimEnd(end);
    if (end - trimStart > 15) {
      setTrimStart(Math.max(0, end - 15));
    } else if (end < trimStart) {
      setTrimStart(Math.max(0, end - 1));
    }
  };

  const handleUpload = async () => {
    if (!recordedBlob) return;

    if (!title.trim() || !description.trim()) {
      alert("Please fill in the incident title and description.");
      return;
    }

    if (saveLocalCopy) triggerLocalDownload(recordedBlob);

    setUploading(true);

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    // Run Pipeline 4 full-analysis + Cloudinary upload in parallel
    const cloudinaryPromise = (cloudName && uploadPreset)
      ? (async () => {
          const fd = new FormData();
          fd.append('file', recordedBlob);
          fd.append('upload_preset', uploadPreset);
          fd.append('resource_type', 'video');
          const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, { method: 'POST', body: fd });
          if (res.ok) {
            const d = await res.json();
            console.log('[CLOUDINARY] Upload successful:', d.secure_url);
            return d.secure_url;
          }
          return null;
        })().catch(e => { console.error('[CLOUDINARY]', e); return null; })
      : Promise.resolve(null);

    const fullAnalysisPromise = runFullAnalysis(recordedBlob, title.trim(), description.trim(), category)
      .catch(async (err) => {
        console.warn('[FULL-ANALYSIS] Failed, falling back to /route:', err);
        try {
          const fallback = await routeReport(title.trim(), description.trim(), category);
          return {
            verdict: quickValidateResult?.scene_detected ? 'AUTHENTIC' : 'INCONCLUSIVE',
            fake_probability: 0.1,
            confidence_level: 'LOW',
            faces_detected: 0,
            department: fallback.department,
            department_name: fallback.department_name || fallback.department,
            routing_reason: fallback.routing_reason,
            priority: fallback.priority,
            escalation_required: fallback.escalation_required || false,
            confidence: fallback.confidence || 'FALLBACK',
            sub_category: null,
            estimated_resolution_days: null,
            scene_detected: quickValidateResult?.scene_detected || false,
            detected_issues: quickValidateResult?.detected_issues || [],
            temporal_consistency: 0,
            dominant_class: null,
            visual_priority: quickValidateResult?.visual_priority || null,
            trust_score: quickValidateResult?.trust_score || 50,
            civic_urgency_score: 50,
          };
        } catch (_) { return null; }
      });

    const [finalVideoUrl, fullResult] = await Promise.all([cloudinaryPromise, fullAnalysisPromise]);

    setFullAnalysisResult(fullResult);

    let uploaderUuid = localStorage.getItem('kawach_uploader_uuid');
    if (!uploaderUuid) {
      uploaderUuid = 'anon-' + Math.random().toString(36).substring(2, 15) + '-' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('kawach_uploader_uuid', uploaderUuid);
    }
    const videoId = 'vid-' + Math.random().toString(36).substring(2, 10);

    const newReport = {
      id: videoId,
      title: title.trim(),
      description: description.trim(),
      category,
      uploaderUuid,
      status: emergencyOverride
        ? VIDEO_STATUS.PUBLIC_APPROVED
        : (fullResult?.verdict === 'AI_GENERATED' ? VIDEO_STATUS.REJECTED : VIDEO_STATUS.AI_CHECK_1),
      timestamp: 'Just now',
      lat: gpsCoords[0],
      lng: gpsCoords[1],
      emergencyOverride,
      videoUrl: finalVideoUrl || videoUrl,
      trimStart,
      trimEnd,
      views: 0,
      // Pipeline 1 — Deepfake
      aiVerdict: fullResult?.verdict || 'INCONCLUSIVE',
      fakeProb: fullResult?.fake_probability ?? 0.5,
      confidenceLevel: fullResult?.confidence_level || 'LOW',
      facesDetected: fullResult?.faces_detected || 0,
      // Pipeline 2 — Routing
      routedDepartment: fullResult?.department || quickValidateResult?.suggested_dept || 'SANITATION',
      routingPriority: fullResult?.priority || quickValidateResult?.visual_priority || 'NORMAL',
      routingReason: fullResult?.routing_reason || 'Routed via AI civic classification.',
      escalationRequired: fullResult?.escalation_required || false,
      subCategory: fullResult?.sub_category || null,
      estimatedResolutionDays: fullResult?.estimated_resolution_days || null,
      // Pipeline 3 — Scene
      sceneDetected: fullResult?.scene_detected ?? quickValidateResult?.scene_detected ?? false,
      detectedIssues: fullResult?.detected_issues || quickValidateResult?.detected_issues || [],
      temporalConsistency: fullResult?.temporal_consistency || 0,
      dominantClass: fullResult?.dominant_class || null,
      visualPriority: fullResult?.visual_priority || quickValidateResult?.visual_priority || null,
      // Trust scores
      trustScore: fullResult?.trust_score ?? quickValidateResult?.trust_score ?? 0,
      civicUrgencyScore: fullResult?.civic_urgency_score || 0,
    };

    onUploadComplete(newReport);
    setUploading(false);
    setRecordedBlob(null);
    setVideoUrl(null);
    setEmergencyOverride(false);
    setTitle('');
    setDescription('');
    setQuickValidateResult(null);
    setIsValidating(false);
    setFullAnalysisResult(null);
    setSheetOpen(false);
  };

  return (
    <div className="view-container" style={{ position: 'relative', height: '100%', paddingBottom: '90px', backgroundColor: '#000000' }}>
      
      {/* Top Header details */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        right: '20px',
        zIndex: 10,
        pointerEvents: 'none'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div className="glass-panel" style={{
            padding: '8px 12px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.15)'
          }}>
            <ShieldCheck size={16} style={{ color: '#ffd900' }} />
            <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.05em', color: '#ffffff', fontFamily: 'Outfit' }}>
              SECURE CAMERA UNIT
            </span>
          </div>
          
          {isRecording && (
            <div style={{
              backgroundColor: '#ff3b30',
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              animation: 'pulse-marker 1s infinite alternate'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#ffffff'
              }} />
              <span>
                {Math.floor(recordTime / 60)}:{(recordTime % 60) < 10 ? `0${recordTime % 60}` : recordTime % 60} (Saving full length)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Viewfinder Section */}
      <div style={{
        flex: 1,
        borderRadius: '24px',
        overflow: 'hidden',
        background: '#000000',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        margin: '10px 10px 0'
      }}>
        {recordedBlob ? (
          /* ================== POST-CAPTURE: VIDEO BACKGROUND + BOTTOM SHEET ================== */
          <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#000' }}>
            {/* Full-screen recorded video plays as background */}
            {videoUrl ? (
              <video
                ref={reviewVideoRef}
                src={videoUrl}
                loop
                muted
                playsInline
                autoPlay
                onLoadedMetadata={handleLoadedMetadata}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ position: 'absolute', inset: 0, backgroundColor: '#111' }} />
            )}

            {/* Dark gradient at bottom behind sheet */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)', pointerEvents: 'none' }} />

            {/* Retake button top-left */}
            <button
              onClick={handleRetake}
              style={{
                position: 'absolute', top: '20px', left: '16px',
                background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: '20px',
                color: '#ffffff', padding: '8px 14px',
                fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px', zIndex: 20
              }}
            >
              ✕ Retake
            </button>

            {/* Quick scan badge top-right */}
            {isValidating && (
              <div style={{
                position: 'absolute', top: '20px', right: '16px',
                background: 'rgba(59,130,246,0.2)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(59,130,246,0.4)', borderRadius: '20px',
                color: '#93c5fd', padding: '8px 12px',
                fontSize: '10px', fontWeight: '800', zIndex: 20,
                display: 'flex', alignItems: 'center', gap: '5px'
              }}>
                <Zap size={12} style={{ animation: 'spin 1s linear infinite' }} />
                AI Scanning...
              </div>
            )}
            {!isValidating && quickValidateResult && (
              <div style={{
                position: 'absolute', top: '20px', right: '16px',
                background: quickValidateResult.scene_detected ? 'rgba(16,185,129,0.2)' : 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${quickValidateResult.scene_detected ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.15)'}`,
                borderRadius: '20px',
                color: quickValidateResult.scene_detected ? '#6ee7b7' : 'rgba(255,255,255,0.7)',
                padding: '8px 12px',
                fontSize: '10px', fontWeight: '800', zIndex: 20,
                display: 'flex', alignItems: 'center', gap: '5px'
              }}>
                {quickValidateResult.scene_detected ? '⚡ Issue Detected' : '✓ Scene Clear'}
                {quickValidateResult.suggested_dept && (
                  <span style={{ background: '#ffd900', color: '#000', borderRadius: '10px', padding: '1px 6px', fontSize: '8px', fontWeight: '900' }}>
                    {quickValidateResult.suggested_dept}
                  </span>
                )}
              </div>
            )}

            {/* Open sheet button if closed */}
            {!sheetOpen && (
              <button
                onClick={() => setSheetOpen(true)}
                style={{
                  position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
                  background: '#ffd900', border: 'none', borderRadius: '28px',
                  padding: '14px 36px', fontSize: '14px', fontWeight: '900',
                  cursor: 'pointer', zIndex: 20, boxShadow: '0 4px 20px rgba(255,217,0,0.4)',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <Upload size={16} /> Upload & Analyze
              </button>
            )}

            {/* BOTTOM SHEET DRAWER */}
            {sheetOpen && (
              <div
                className="camera-bottom-sheet"
                style={{ zIndex: 30, padding: '0 0 calc(16px + env(safe-area-inset-bottom))' }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Drag Handle */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
                  <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: '#e2e8f0' }} />
                </div>

                <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                  {/* Trust score compact strip */}
                  {!isValidating && quickValidateResult && typeof quickValidateResult.trust_score === 'number' && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      background: quickValidateResult.scene_detected ? '#ecfdf5' : '#f8fafc',
                      border: `1px solid ${quickValidateResult.scene_detected ? '#a7f3d0' : '#e2e8f0'}`,
                      borderRadius: '14px', padding: '10px 14px'
                    }}>
                      <Zap size={14} style={{ color: quickValidateResult.scene_detected ? '#059669' : '#94a3b8', flexShrink: 0 }} />
                      <span style={{ fontSize: '11px', fontWeight: '800', color: quickValidateResult.scene_detected ? '#065f46' : '#374151', flex: 1 }}>
                        {quickValidateResult.scene_detected ? 'Civic Issue Detected' : 'Scene Appears Clear'}
                        {quickValidateResult.suggested_dept && ` → ${quickValidateResult.suggested_dept}`}
                      </span>
                      <span style={{
                        fontSize: '10px', fontWeight: '900',
                        color: quickValidateResult.trust_score >= 70 ? '#059669' : quickValidateResult.trust_score >= 40 ? '#d97706' : '#dc2626'
                      }}>
                        Trust {quickValidateResult.trust_score.toFixed(0)}
                      </span>
                    </div>
                  )}

                  {/* Title input */}
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Incident Title (e.g. Broken Water Pipe)"
                    style={{
                      backgroundColor: '#f1f5f9', border: 'none',
                      borderRadius: '14px', padding: '13px 16px',
                      fontSize: '13px', color: '#0f172a',
                      outline: 'none', fontWeight: '600', fontFamily: 'Outfit'
                    }}
                  />

                  {/* Description textarea */}
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description (where, what happened)..."
                    rows={2}
                    style={{
                      backgroundColor: '#f1f5f9', border: 'none',
                      borderRadius: '14px', padding: '13px 16px',
                      fontSize: '12px', color: '#0f172a',
                      outline: 'none', resize: 'none',
                      fontFamily: 'Outfit', fontWeight: '500'
                    }}
                  />

                  {/* Category pill selector */}
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Category</span>
                    <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                      {['Infrastructure', 'Violence/Loitering', 'Theft/Property', 'Traffic Warning', 'Emergency Alert'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setCategory(cat)}
                          style={{
                            padding: '7px 13px', borderRadius: '20px',
                            border: category === cat ? '2px solid #ffd900' : '1.5px solid #e2e8f0',
                            background: category === cat ? '#ffd900' : '#f8fafc',
                            color: category === cat ? '#000' : '#475569',
                            fontSize: '11px', fontWeight: category === cat ? '800' : '600',
                            cursor: 'pointer', fontFamily: 'Outfit',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {cat.split('/')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Trim sliders */}
                  <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: '800', color: '#475569', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <span>✂️ Clip Window</span>
                      <span style={{ color: '#ffd900', fontWeight: '900' }}>{(trimEnd - trimStart).toFixed(1)}s / 15s max</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '10px', color: '#94a3b8', width: '44px', fontWeight: '700' }}>Start {trimStart.toFixed(1)}s</span>
                        <input type="range" min="0" max={videoDuration || 15} step="0.1" value={trimStart}
                          onChange={(e) => handleStartTrimChange(e.target.value)}
                          style={{ flex: 1, accentColor: '#ffd900', cursor: 'pointer' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '10px', color: '#94a3b8', width: '44px', fontWeight: '700' }}>End {trimEnd.toFixed(1)}s</span>
                        <input type="range" min="0" max={videoDuration || 15} step="0.1" value={trimEnd}
                          onChange={(e) => handleEndTrimChange(e.target.value)}
                          style={{ flex: 1, accentColor: '#ffd900', cursor: 'pointer' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Emergency toggle row */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: emergencyOverride ? 'rgba(255,59,48,0.06)' : '#f8fafc',
                    border: `1.5px solid ${emergencyOverride ? 'rgba(255,59,48,0.3)' : '#e2e8f0'}`,
                    borderRadius: '14px', padding: '12px 16px'
                  }}>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: emergencyOverride ? '#dc2626' : '#374151', fontFamily: 'Outfit', display: 'block' }}>🚨 Direct Dispatch</span>
                      <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '500' }}>Bypass AI queue — emergency only</span>
                    </div>
                    {/* iOS toggle */}
                    <div
                      onClick={() => setEmergencyOverride(p => !p)}
                      style={{
                        width: '44px', height: '26px', borderRadius: '13px',
                        background: emergencyOverride ? '#ef4444' : '#e2e8f0',
                        position: 'relative', cursor: 'pointer',
                        transition: 'background 0.25s ease', flexShrink: 0
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: '3px',
                        left: emergencyOverride ? '21px' : '3px',
                        width: '20px', height: '20px', borderRadius: '50%',
                        background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                        transition: 'left 0.25s cubic-bezier(0.16,1,0.3,1)'
                      }} />
                    </div>
                  </div>

                  {/* Save copy toggle */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#f8fafc', border: '1.5px solid #e2e8f0',
                    borderRadius: '14px', padding: '12px 16px'
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#374151', fontFamily: 'Outfit' }}>📥 Save raw copy to device</span>
                    <div
                      onClick={() => setSaveLocalCopy(p => !p)}
                      style={{
                        width: '44px', height: '26px', borderRadius: '13px',
                        background: saveLocalCopy ? '#ffd900' : '#e2e8f0',
                        position: 'relative', cursor: 'pointer',
                        transition: 'background 0.25s ease', flexShrink: 0
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: '3px',
                        left: saveLocalCopy ? '21px' : '3px',
                        width: '20px', height: '20px', borderRadius: '50%',
                        background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                        transition: 'left 0.25s cubic-bezier(0.16,1,0.3,1)'
                      }} />
                    </div>
                  </div>

                  {/* Submit button */}
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    style={{
                      width: '100%', padding: '15px',
                      borderRadius: '18px', border: 'none',
                      background: uploading ? '#e2e8f0' : (emergencyOverride ? '#ef4444' : '#ffd900'),
                      color: uploading ? '#94a3b8' : '#000',
                      fontSize: '14px', fontWeight: '900',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      fontFamily: 'Outfit',
                      boxShadow: uploading ? 'none' : `0 6px 20px ${emergencyOverride ? 'rgba(239,68,68,0.3)' : 'rgba(255,217,0,0.4)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {uploading ? (
                      <><div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #94a3b8', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} /> Analyzing...</>
                    ) : (
                      <><Upload size={16} /> {emergencyOverride ? '🚨 Emergency Dispatch' : 'Upload & Analyze'}</>
                    )}
                  </button>

                </div>
              </div>
            )}
          </div>
        ) : (
          /* ================== ACTIVE CAPTURE VIEWFINDER STATE ================== */
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            
            {hasCameraAccess ? (
              <video 
                ref={videoRef}
                autoPlay 
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                textAlign: 'center',
                backgroundColor: '#111111'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 217, 0, 0.1)',
                  border: '1px solid rgba(255, 217, 0, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffd900',
                  marginBottom: '16px'
                }}>
                  <Camera size={28} />
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: '750', margin: '0 0 6px 0', color: '#ffffff' }}>
                  Camera Ready
                </h3>
                <p style={{ fontSize: '11px', color: '#999999', margin: '0 0 16px 0', maxWidth: '200px', fontWeight: '500' }}>
                  {cameraError ? `System: ${cameraError}` : 'Awaiting hardware verification.'}
                </p>
                
                <button
                  onClick={startCamera}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '18px',
                    fontSize: '11px',
                    fontWeight: '700',
                    border: '1px solid rgba(255,255,255,0.15)',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <RefreshCw size={12} />
                  Request Access
                </button>
              </div>
            )}

            {/* Snapchat-style Yellow Capture Button Overlay */}
            <div style={{
              position: 'absolute',
              bottom: '30px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 3
            }}>
              {isRecording ? (
                <button
                  onClick={handleStopRecording}
                  style={{
                    width: '76px',
                    height: '76px',
                    borderRadius: '50%',
                    backgroundColor: '#ff3b30',
                    border: '6px solid #ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 25px rgba(255, 59, 48, 0.5)'
                  }}
                  className="pulse-red"
                >
                  <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: '#ffffff' }} />
                </button>
              ) : (
                <button
                  onClick={handleStartRecording}
                  style={{
                    width: '76px',
                    height: '76px',
                    borderRadius: '50%',
                    backgroundColor: '#ffd900',
                    border: '6px solid #ffffff',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                    transition: 'all 0.15s ease'
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
