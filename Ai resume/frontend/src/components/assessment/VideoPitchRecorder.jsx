import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  Camera,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Upload,
  Sparkles,
  Clock,
  Eye,
  ShieldCheck,
  StopCircle,
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { jobService } from '../../services/jobService';

const MAX_DURATION_SECONDS = 60;
const MAX_RETAKES = 2;

export default function VideoPitchRecorder({
  applicationId = null,
  jobId = null,
  onVideoRecorded = null,
  initialVideoUrl = null,
  required = false,
}) {
  const [stream, setStream] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionError, setPermissionError] = useState('');

  const [isRecording, setIsRecording] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(MAX_DURATION_SECONDS);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(initialVideoUrl || '');
  const [retakesLeft, setRetakesLeft] = useState(MAX_RETAKES);
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(Boolean(initialVideoUrl));
  const [uploadError, setUploadError] = useState('');

  const liveVideoRef = useRef(null);
  const playbackVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Clean up media streams and timers on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const stopCameraStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const startCameraStream = async () => {
    setPermissionError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam and audio capture are not supported in this browser.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      setStream(mediaStream);
      setHasPermission(true);

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera/mic access error:', err);
      let msg = 'Unable to access your camera and microphone.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera and microphone access in your browser settings and try again.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No video camera or microphone device found. Please connect a webcam.';
      }
      setPermissionError(msg);
      setHasPermission(false);
    }
  };

  // Re-attach live stream if element mounts/updates
  useEffect(() => {
    if (liveVideoRef.current && stream && !recordedBlob) {
      liveVideoRef.current.srcObject = stream;
    }
  }, [stream, recordedBlob]);

  const getSupportedMimeType = () => {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=h264,aac',
      'video/mp4',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  const handleStartRecording = () => {
    if (!stream) {
      startCameraStream();
      return;
    }

    recordedChunksRef.current = [];
    setRecordedBlob(null);
    setRecordedVideoUrl('');
    setUploadSuccess(false);
    setUploadError('');
    setSecondsRemaining(MAX_DURATION_SECONDS);

    const mimeType = getSupportedMimeType();
    const options = mimeType ? { mimeType } : {};

    try {
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mime = mimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: mime });
        const videoUrl = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedVideoUrl(videoUrl);
        setIsRecording(false);

        if (onVideoRecorded) {
          onVideoRecorded(blob, videoUrl);
        }
      };

      mediaRecorder.start(200); // chunk every 200ms
      setIsRecording(true);

      // 60-Second Countdown Timer
      let elapsed = 0;
      timerIntervalRef.current = setInterval(() => {
        elapsed += 1;
        setSecondsRemaining(MAX_DURATION_SECONDS - elapsed);

        if (elapsed >= MAX_DURATION_SECONDS) {
          clearInterval(timerIntervalRef.current);
          handleStopRecording();
        }
      }, 1000);
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
      setPermissionError('Failed to start video recording. Your browser may not support this video format.');
    }
  };

  const handleStopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleRetake = () => {
    if (retakesLeft <= 0) return;
    setRetakesLeft((prev) => prev - 1);
    setRecordedBlob(null);
    setRecordedVideoUrl('');
    setUploadSuccess(false);
    setUploadError('');
    setSecondsRemaining(MAX_DURATION_SECONDS);

    if (onVideoRecorded) {
      onVideoRecorded(null, '');
    }

    // Ensure live camera is running
    if (!stream) {
      startCameraStream();
    }
  };

  const handleUploadPitch = async () => {
    if (!recordedBlob) return;
    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      const ext = recordedBlob.type.includes('mp4') ? 'mp4' : 'webm';
      formData.append('file', recordedBlob, `elevator_pitch.${ext}`);

      if (applicationId) {
        formData.append('application_id', applicationId);
        const res = await jobService.uploadApplicationVideoPitch(applicationId, formData);
        setUploadSuccess(true);
        if (onVideoRecorded) {
          onVideoRecorded(recordedBlob, res.video_pitch_url);
        }
      } else {
        if (jobId) formData.append('job_id', jobId);
        const res = await jobService.uploadVideoPitch(formData);
        setUploadSuccess(true);
        if (onVideoRecorded) {
          onVideoRecorded(recordedBlob, res.video_pitch_url);
        }
      }
    } catch (err) {
      console.error('Failed to upload video pitch:', err);
      setUploadError(
        err.response?.data?.detail || 'Failed to upload video pitch. Please retry.'
      );
    } finally {
      setUploading(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const elapsedSeconds = MAX_DURATION_SECONDS - secondsRemaining;
  const progressPercent = (elapsedSeconds / MAX_DURATION_SECONDS) * 100;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5">
      {/* Header & Elevator Pitch Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Video className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              60-Second Video Pitch (Elevator Video)
            </h3>
            {required ? (
              <Badge variant="danger" size="xs">Required</Badge>
            ) : (
              <Badge variant="purple" size="xs">Recommended • 2x Interview Shortlist</Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Introduce yourself, mention 1-2 core technical strengths, and share why you are passionate about this vacancy.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Re-takes remaining:</span>
          <span className="px-2 py-0.5 rounded-full font-black text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {retakesLeft} / {MAX_RETAKES}
          </span>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="relative w-full aspect-video max-h-[380px] bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border border-slate-800">
        {/* State 1: Video Review / Playback */}
        {recordedVideoUrl && !isRecording ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <video
              ref={playbackVideoRef}
              src={recordedVideoUrl}
              controls
              playsInline
              className="w-full h-full object-contain"
            />
            {uploadSuccess && (
              <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-emerald-600/90 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-xs">
                <CheckCircle className="w-3.5 h-3.5" /> Pitch Ready & Confirmed
              </div>
            )}
          </div>
        ) : hasPermission ? (
          /* State 2: Live Webcam Preview with Mirror Effect */
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={liveVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />

            {/* Live Recording HUD Overlay */}
            {isRecording ? (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 bg-gradient-to-b from-black/40 via-transparent to-black/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600/90 text-white text-xs font-mono font-bold animate-pulse shadow-md backdrop-blur-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-white inline-block animate-ping" />
                    REC {formatTimer(elapsedSeconds)} / 01:00
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-mono backdrop-blur-xs border border-white/20">
                    Remaining: {formatTimer(secondsRemaining)}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden backdrop-blur-xs">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-black/60 text-white text-[11px] font-medium backdrop-blur-xs flex items-center gap-1.5 border border-white/10">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                Live Camera Active • Ready to Record
              </div>
            )}
          </div>
        ) : (
          /* State 3: Camera Not Enabled Yet */
          <div className="text-center p-6 space-y-3 text-slate-300 max-w-md">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 text-purple-400 flex items-center justify-center mx-auto shadow-inner">
              <Camera className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Camera Access Required</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Allow browser camera and microphone permissions to record your 60-second elevator pitch.
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={startCameraStream}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 font-bold"
            >
              <Camera className="w-4 h-4 mr-1.5" />
              Enable Camera & Mic
            </Button>
          </div>
        )}
      </div>

      {/* Permission Error Banner */}
      {permissionError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Hardware Permission Error</span>
            <p>{permissionError}</p>
          </div>
        </div>
      )}

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Success Banner */}
      {uploadSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Elevator Video Pitch successfully attached to your application!</span>
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            Ready for recruiter review
          </span>
        </div>
      )}

      {/* Control Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 flex-wrap">
          {!hasPermission ? (
            <Button
              size="sm"
              variant="outline"
              onClick={startCameraStream}
              className="text-xs font-bold"
            >
              <Camera className="w-3.5 h-3.5 mr-1.5" />
              Test Camera Preview
            </Button>
          ) : !isRecording && !recordedBlob ? (
            <Button
              size="sm"
              variant="primary"
              onClick={handleStartRecording}
              className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-600/20"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-white inline-block mr-2 animate-pulse" />
              Start 60s Video Pitch
            </Button>
          ) : isRecording ? (
            <Button
              size="sm"
              variant="primary"
              onClick={handleStopRecording}
              className="bg-rose-700 hover:bg-rose-800 text-white font-black text-xs animate-pulse"
            >
              <StopCircle className="w-4 h-4 mr-1.5" />
              Stop Recording ({formatTimer(secondsRemaining)})
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetake}
                disabled={retakesLeft <= 0 || uploading}
                className="text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                Re-record Pitch ({retakesLeft} left)
              </Button>

              {(applicationId || jobId) && !uploadSuccess && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleUploadPitch}
                  disabled={uploading}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs"
                >
                  {uploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                      Uploading Video...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      Save & Confirm Video Pitch
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </div>

        {/* Pitch Guide Checklist */}
        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-purple-500" /> Max 60 Seconds
          </span>
          <span className="flex items-center gap-1">
            <Mic className="w-3 h-3 text-emerald-500" /> Speak Clearly
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-indigo-500" /> Secure Storage
          </span>
        </div>
      </div>
    </div>
  );
}
