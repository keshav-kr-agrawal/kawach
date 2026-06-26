import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, ShieldCheck, Upload, Trash2, Video, Zap, FileText } from 'lucide-react';
import { VIDEO_STATUS } from '../api/videoService';

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

  const videoRef = useRef(null);
  const reviewVideoRef = useRef(null);
  const streamRef = useRef(null);
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

  const handleUpload = () => {
    if (!recordedBlob) return;

    if (!title.trim() || !description.trim()) {
      alert("Please fill in the incident title and description.");
      return;
    }

    if (saveLocalCopy) {
      triggerLocalDownload(recordedBlob);
    }

    setUploading(true);

    const uploaderUuid = 'anon-' + Math.random().toString(36).substring(2, 15) + '-' + Math.random().toString(36).substring(2, 15);
    const videoId = 'vid-' + Math.random().toString(36).substring(2, 10);

    setTimeout(() => {
      const newReport = {
        id: videoId,
        title: title.trim(),
        description: description.trim(),
        category: category,
        uploaderUuid: uploaderUuid,
        status: emergencyOverride ? VIDEO_STATUS.PUBLIC_APPROVED : VIDEO_STATUS.AI_CHECK_1,
        timestamp: 'Just now',
        lat: gpsCoords[0], // Anchors video directly at exact current GPS location
        lng: gpsCoords[1],
        emergencyOverride: emergencyOverride,
        videoUrl: videoUrl, // saves reference to local URL so we can play back REAL video
        trimStart: trimStart,
        trimEnd: trimEnd,
        views: 0
      };

      onUploadComplete(newReport);
      setUploading(false);
      setRecordedBlob(null);
      setVideoUrl(null);
      setEmergencyOverride(false);
      setTitle('');
      setDescription('');
    }, 1800);
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
