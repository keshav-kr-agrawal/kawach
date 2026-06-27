import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, ShieldCheck, Upload, Trash2, Video, Zap, FileText } from 'lucide-react';
import { VIDEO_STATUS } from '../api/videoService';
import { routeReport } from '../api/routingService';


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
  const [category, setCategory] = useState('General Alert');
  const [emergencyOverride, setEmergencyOverride] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [saveLocalCopy, setSaveLocalCopy] = useState(true);

  // AI Classifier Integration state
  const [classifierResult, setClassifierResult] = useState(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classificationError, setClassificationError] = useState(null);

  const videoRef = useRef(null);
  const reviewVideoRef = useRef(null);
  const streamRef = useRef(null);

  const runClassification = async (blob) => {
    if (!blob) return;
    setIsClassifying(true);
    setClassificationError(null);
    setClassifierResult(null);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'recorded_video.mp4');

      const apiUrl = import.meta.env.VITE_CLASSIFIER_API_URL || 'http://localhost:8001/classify';
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setClassifierResult(data);
        console.log('[AI Classifier] Verdict:', data);
      } else {
        const errText = await response.text();
        console.warn('Classifier failed:', errText);
        setClassificationError('Server returned error');
      }
    } catch (err) {
      console.warn('Failed to reach classifier service:', err);
      setClassificationError('Classifier offline');
    } finally {
      setIsClassifying(false);
    }
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

        // Run AI classification
        runClassification(blob);
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

      // Run AI classification
      runClassification(mockBlob);
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
    setClassifierResult(null);
    setIsClassifying(false);
    setClassificationError(null);
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

    if (saveLocalCopy) {
      triggerLocalDownload(recordedBlob);
    }

    setUploading(true);

    // Dispatch zero-shot civic department routing in parallel with upload
    const routingPromise = routeReport(title.trim(), description.trim(), category);

    let finalVideoUrl = videoUrl;
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    // Only attempt Cloudinary upload if environment variables are configured
    if (cloudName && uploadPreset) {
      try {
        const formData = new FormData();
        formData.append('file', recordedBlob);
        formData.append('upload_preset', uploadPreset);
        formData.append('resource_type', 'video');

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
          {
            method: 'POST',
            body: formData
          }
        );

        if (response.ok) {
          const data = await response.json();
          finalVideoUrl = data.secure_url;
          console.log('[CLOUDINARY] Upload successful:', finalVideoUrl);
        } else {
          const errData = await response.json();
          console.error('[CLOUDINARY] Upload failed with status:', response.status, errData);
        }
      } catch (err) {
        console.error('[CLOUDINARY] Network error during upload:', err);
      }
    } else {
      console.warn('[CLOUDINARY] Environment variables VITE_CLOUDINARY_CLOUD_NAME or VITE_CLOUDINARY_UPLOAD_PRESET missing. Falling back to local preview URL.');
    }

    const uploaderUuid = 'anon-' + Math.random().toString(36).substring(2, 15) + '-' + Math.random().toString(36).substring(2, 15);
    const videoId = 'vid-' + Math.random().toString(36).substring(2, 10);

    // Await routing results
    let routingResult = null;
    try {
      routingResult = await routingPromise;
    } catch (err) {
      console.warn('[ROUTING] Failed to resolve routed department:', err);
    }

    // Simulate a slight network delay only if we did not perform a real upload
    const delay = cloudName && uploadPreset ? 0 : 1200;

    setTimeout(() => {
      const newReport = {
        id: videoId,
        title: title.trim(),
        description: description.trim(),
        category: category,
        uploaderUuid: uploaderUuid,
        status: emergencyOverride 
          ? VIDEO_STATUS.PUBLIC_APPROVED 
          : (classifierResult?.verdict === 'AI_GENERATED' ? 'AI_FLAGGED' : VIDEO_STATUS.AI_CHECK_1),
        timestamp: 'Just now',
        lat: gpsCoords[0], // Anchors video directly at exact current GPS location
        lng: gpsCoords[1],
        emergencyOverride: emergencyOverride,
        videoUrl: finalVideoUrl, // saves reference to local URL or Cloudinary URL
        trimStart: trimStart,
        trimEnd: trimEnd,
        views: 0,
        classifierResult: classifierResult,
        // Dynamic Civic Routing Metadata
        routedDepartment: routingResult?.department || 'SANITATION',
        routingPriority: routingResult?.priority || 'NORMAL',
        routingReason: routingResult?.routing_reason || 'Routed via general municipal alert heuristic.',
        escalationRequired: routingResult?.escalation_required || false
      };

      onUploadComplete(newReport);
      setUploading(false);
      setRecordedBlob(null);
      setVideoUrl(null);
      setEmergencyOverride(false);
      setTitle('');
      setDescription('');
      setClassifierResult(null);
      setIsClassifying(false);
      setClassificationError(null);
    }, delay);
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
          /* ================== POST-CAPTURE REVIEW STATE (Snapchat Theme) ================== */
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            padding: '16px 20px',
            zIndex: 5,
            boxSizing: 'border-box',
            background: '#ffffff',
            overflowY: 'auto'
          }} className="scroll-y">
            
            {/* Real Video Player preview */}
            <div style={{
              width: '100%',
              height: '160px',
              borderRadius: '16px',
              backgroundColor: '#000000',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
              marginBottom: '12px'
            }}>
              {videoUrl ? (
                <video
                  ref={reviewVideoRef}
                  src={videoUrl}
                  controls
                  loop
                  onLoadedMetadata={handleLoadedMetadata}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffd900' }}>
                  [Playback Sandbox active]
                </div>
              )}
            </div>

            {/* AI Classifier Result Badge */}
            <div style={{ marginBottom: '12px' }}>
              {isClassifying && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: '16px',
                  backgroundColor: '#f8fafc',
                  border: '1px dashed #3b82f6',
                  color: '#2563eb',
                  fontSize: '12px',
                  fontWeight: '700',
                  fontFamily: 'Outfit'
                }}>
                  <Zap size={16} className="animate-spin text-blue-500" />
                  <span>AI Layer: Scanning video integrity...</span>
                </div>
              )}

              {classificationError && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fef3c7',
                  color: '#d97706',
                  fontSize: '11px',
                  fontWeight: '700',
                  fontFamily: 'Outfit'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ⚠️ AI Integrity Offline ({classificationError})
                  </span>
                  <button 
                    onClick={() => runClassification(recordedBlob)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      backgroundColor: '#d97706',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '10px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}

              {classifierResult && (
                <div style={{
                  padding: '14px 16px',
                  borderRadius: '16px',
                  fontFamily: 'Outfit',
                  border: '1px solid',
                  transition: 'all 0.3s ease',
                  backgroundColor: 
                    classifierResult.verdict === 'AUTHENTIC' ? '#ecfdf5' :
                    classifierResult.verdict === 'AI_GENERATED' ? '#fef2f2' : '#fffbeb',
                  borderColor: 
                    classifierResult.verdict === 'AUTHENTIC' ? '#10b981' :
                    classifierResult.verdict === 'AI_GENERATED' ? '#ef4444' : '#f59e0b',
                  color: 
                    classifierResult.verdict === 'AUTHENTIC' ? '#065f46' :
                    classifierResult.verdict === 'AI_GENERATED' ? '#991b1b' : '#92400e',
                  boxShadow: 
                    classifierResult.verdict === 'AUTHENTIC' ? '0 4px 12px rgba(16, 185, 129, 0.1)' :
                    classifierResult.verdict === 'AI_GENERATED' ? '0 4px 12px rgba(239, 68, 68, 0.15)' : '0 4px 12px rgba(245, 158, 11, 0.1)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Zap size={16} style={{ 
                      fill: 'currentColor',
                      color: classifierResult.verdict === 'AUTHENTIC' ? '#10b981' :
                             classifierResult.verdict === 'AI_GENERATED' ? '#ef4444' : '#f59e0b'
                    }} />
                    <span style={{ fontSize: '13px', fontWeight: '800', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                      {classifierResult.verdict === 'AUTHENTIC' && 'AUTHENTIC — Real Video'}
                      {classifierResult.verdict === 'AI_GENERATED' && 'AI-GENERATED — Deepfake Detected'}
                      {classifierResult.verdict === 'INCONCLUSIVE' && 'INCONCLUSIVE — Manual Review Needed'}
                    </span>
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '6px 12px', 
                    fontSize: '11px', 
                    opacity: 0.9,
                    borderTop: '1px solid rgba(0,0,0,0.06)',
                    paddingTop: '8px',
                    fontWeight: '600'
                  }}>
                    <div>Fake Probability: <span style={{ fontWeight: '800' }}>{(classifierResult.fake_probability * 100).toFixed(1)}%</span></div>
                    <div>Confidence: <span style={{ fontWeight: '800' }}>{classifierResult.confidence_level}</span></div>
                    <div>Faces Detected: <span style={{ fontWeight: '800' }}>{classifierResult.faces_detected}</span></div>
                    <div>Frames Scanned: <span style={{ fontWeight: '800' }}>{classifierResult.frames_analyzed}</span></div>
                  </div>
                  <div style={{ fontSize: '9px', opacity: 0.6, marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Inference: {classifierResult.processing_time_ms.toFixed(0)}ms</span>
                    <span>Ensemble: {classifierResult.model_count} weight models</span>
                  </div>
                </div>
              )}
            </div>

            {/* Trimming slider panel */}
            <div style={{
              backgroundColor: '#f8f8f8',
              border: '1px solid #e5e5e5',
              borderRadius: '16px',
              padding: '12px',
              marginBottom: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '750', marginBottom: '8px', color: '#333' }}>
                <span>✂️ SELECT 15s UPLOAD OFFSET</span>
                <span style={{ color: '#007aff' }}>
                  Window: {(trimEnd - trimStart).toFixed(1)}s (Max: 15s)
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '10px', color: '#666', width: '50px' }}>Start: {trimStart.toFixed(1)}s</span>
                  <input 
                    type="range"
                    min="0"
                    max={videoDuration || 15}
                    step="0.1"
                    value={trimStart}
                    onChange={(e) => handleStartTrimChange(e.target.value)}
                    style={{ flex: 1, accentColor: '#ffd900' }}
                  />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '10px', color: '#666', width: '50px' }}>End: {trimEnd.toFixed(1)}s</span>
                  <input 
                    type="range"
                    min="0"
                    max={videoDuration || 15}
                    step="0.1"
                    value={trimEnd}
                    onChange={(e) => handleEndTrimChange(e.target.value)}
                    style={{ flex: 1, accentColor: '#ffd900' }}
                  />
                </div>
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '9px', color: '#888', textAlign: 'center' }}>
                * Note: Full {videoDuration.toFixed(1)}s raw file has been auto-saved to your local downloads folder.
              </p>
            </div>

            {/* Incident metadata inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
              <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Incident Title (e.g. Broken Water Pipe)"
                style={{
                  backgroundColor: '#f2f2f2',
                  border: '1px solid #e5e5e5',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '12px',
                  color: '#000000',
                  outline: 'none',
                  fontWeight: '600'
                }}
              />
              
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description details (where, who, what happened)..."
                rows={2}
                style={{
                  backgroundColor: '#f2f2f2',
                  border: '1px solid #e5e5e5',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '12px',
                  color: '#000000',
                  outline: 'none',
                  fontFamily: 'sans-serif',
                  resize: 'none',
                  fontWeight: '500'
                }}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    flex: 1,
                    backgroundColor: '#f2f2f2',
                    border: '1px solid #e5e5e5',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    fontSize: '12px',
                    color: '#000000',
                    outline: 'none',
                    fontWeight: '600'
                  }}
                >
                  <option value="Violence/Loitering">Violence / Loitering</option>
                  <option value="Infrastructure">Infrastructure Hazard</option>
                  <option value="Theft/Property">Theft / Property Crime</option>
                  <option value="Traffic Warning">Traffic Violation</option>
                  <option value="Emergency Alert">Emergency Alert</option>
                </select>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid #e5e5e5',
                  borderRadius: '12px',
                  padding: '4px 10px',
                  backgroundColor: '#fdfdfd'
                }}>
                  <span style={{ fontSize: '10px', color: '#ff3b30', fontWeight: '800' }}>Direct Dispatch:</span>
                  <input 
                    type="checkbox"
                    checked={emergencyOverride}
                    onChange={(e) => setEmergencyOverride(e.target.checked)}
                    style={{ accentColor: '#ff3b30', width: '16px', height: '16px' }}
                  />
                </div>
              </div>

              {/* Save Full Copy Checkbox */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid #e5e5e5',
                borderRadius: '12px',
                padding: '10px 14px',
                backgroundColor: '#fdfdfd',
                marginTop: '2px'
              }}>
                <span style={{ fontSize: '11px', color: '#333333', fontWeight: '750', fontFamily: 'Outfit' }}>
                  📥 Save full recording to device downloads
                </span>
                <input 
                  type="checkbox"
                  checked={saveLocalCopy}
                  onChange={(e) => setSaveLocalCopy(e.target.checked)}
                  style={{ accentColor: '#ffd900', width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingBottom: '10px' }}>
              <button
                onClick={handleRetake}
                disabled={uploading}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  border: '1px solid #e5e5e5',
                  backgroundColor: '#f2f2f2',
                  color: '#000000',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                Retake
              </button>
              
              <button
                onClick={handleUpload}
                disabled={uploading}
                style={{
                  flex: 2,
                  padding: '10px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: emergencyOverride ? '#ff3b30' : '#ffd900',
                  color: '#000000',
                  fontWeight: '800',
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: `0 4px 12px ${emergencyOverride ? 'rgba(255, 59, 48, 0.2)' : 'rgba(255, 217, 0, 0.25)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                {uploading ? 'Sealing...' : 'Upload Encrypted'}
              </button>
            </div>

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
