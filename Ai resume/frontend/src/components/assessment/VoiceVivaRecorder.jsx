import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Square,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Radio,
  FileAudio,
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { jobService } from '../../services/jobService';

export default function VoiceVivaRecorder({
  jobId,
  vivaPrompt,
  onVivaComplete,
  initialData = null,
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [attemptsRemaining, setAttemptsRemaining] = useState(2);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(initialData?.audioUrl || null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [vivaResult, setVivaResult] = useState(initialData?.vivaResult || null);
  const [micError, setMicError] = useState('');
  const [volumeLevel, setVolumeLevel] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const streamRef = useRef(null);

  const defaultPrompt =
    vivaPrompt ||
    'In 60 seconds, explain how you handle database connection pooling and API concurrency under high traffic in your backend services.';

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerIntervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const startRecording = async () => {
    setMicError('');
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicError('Your browser does not support audio recording. Please use Chrome or Edge.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Setup Web Audio Analyser for live visual wave amplitude
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const pcmData = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(pcmData);
          let sum = 0;
          for (let i = 0; i < pcmData.length; i++) {
            sum += pcmData[i];
          }
          const avg = sum / pcmData.length;
          setVolumeLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      } catch (audioErr) {
        console.warn('AudioContext visualization skipped:', audioErr);
      }

      // Determine supported MIME type
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop stream tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setVolumeLevel(0);
      };

      mediaRecorder.start(250); // Slice every 250ms
      setIsRecording(true);
      setTimeLeft(60);

      // Countdown Timer
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      setMicError('Microphone permission was denied. Please allow microphone access to proceed.');
    }
  };

  const stopRecording = () => {
    clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleReRecord = () => {
    if (attemptsRemaining <= 1) return;
    setAttemptsRemaining((prev) => prev - 1);
    setAudioBlob(null);
    setAudioUrl(null);
    setVivaResult(null);
    setTimeLeft(60);
    setMicError('');
  };

  const handleEvaluateAudio = async () => {
    if (!audioBlob) return;
    setIsEvaluating(true);
    setMicError('');

    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'viva_recording.webm');
      formData.append('question_prompt', defaultPrompt);

      const res = await jobService.submitVivaAudio(jobId, formData);
      setVivaResult(res);

      if (onVivaComplete) {
        onVivaComplete({
          audioBlob,
          audioUrl: res.viva_audio_url,
          vivaScore: res.viva_score,
          transcription: res.viva_transcription,
          evaluation: res.viva_evaluation,
        });
      }
    } catch (err) {
      console.error('Viva audio evaluation failed:', err);
      setMicError(
        err.response?.data?.detail ||
          'Failed to evaluate oral answer. Please verify network and try again.'
      );
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/40 dark:from-slate-900 dark:via-slate-850 dark:to-indigo-950/40 p-5 shadow-xs space-y-4">
      {/* Header & Prompt */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
              <Radio className="w-4 h-4 animate-pulse" />
            </span>
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              Oral Technical Viva Screening
              <Badge variant="purple" size="xs">
                60s Max
              </Badge>
            </h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Record a 60-second oral response using your microphone. Evaluated for technical knowledge, communication clarity, vocabulary, and delivery.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Attempts Left:
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-black ${
              attemptsRemaining > 1
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            }`}
          >
            {attemptsRemaining} / 2
          </span>
        </div>
      </div>

      {/* Oral Viva Question Card */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
          Oral Viva Question:
        </span>
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
          "{defaultPrompt}"
        </p>
      </div>

      {/* Mic Permission / Error Alert */}
      {micError && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2 font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{micError}</span>
        </div>
      )}

      {/* Live Recording Console */}
      <div className="p-4 rounded-xl bg-slate-900 text-white space-y-4">
        {/* Timer & Equalizer Visualizer */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isRecording ? 'bg-rose-500 animate-ping' : 'bg-slate-600'
              }`}
            />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {isRecording ? 'Recording Live Audio...' : audioUrl ? 'Audio Captured' : 'Ready to Record'}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-base font-black">
            <span
              className={
                timeLeft <= 10 && isRecording ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
              }
            >
              00:{timeLeft.toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Dynamic Audio Wave Equalizer Bar */}
        <div className="h-10 bg-slate-850 rounded-lg p-2 flex items-center justify-center gap-1 overflow-hidden border border-slate-750">
          {Array.from({ length: 32 }).map((_, idx) => {
            const height = isRecording
              ? Math.max(15, Math.min(100, volumeLevel * ((idx % 4) + 1) * 0.4 + Math.random() * 20))
              : audioUrl
              ? 25
              : 8;
            return (
              <div
                key={idx}
                className={`w-1.5 rounded-full transition-all duration-75 ${
                  isRecording
                    ? 'bg-gradient-to-t from-emerald-500 to-indigo-400'
                    : audioUrl
                    ? 'bg-indigo-500/70'
                    : 'bg-slate-700'
                }`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>

        {/* Audio Player Preview */}
        {audioUrl && !isRecording && (
          <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <FileAudio className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Preview your 60-second oral recording:</span>
            </div>
            <audio src={audioUrl} controls className="h-8 max-w-full sm:max-w-xs" />
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            {!isRecording && !audioUrl && (
              <Button
                variant="primary"
                size="sm"
                onClick={startRecording}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Mic className="w-4 h-4" />
                Start Recording
              </Button>
            )}

            {isRecording && (
              <Button
                variant="danger"
                size="sm"
                onClick={stopRecording}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5 animate-pulse"
              >
                <Square className="w-4 h-4" />
                Stop & Preview
              </Button>
            )}

            {audioUrl && !isRecording && attemptsRemaining > 1 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleReRecord}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 font-bold flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Re-record ({attemptsRemaining - 1} attempt left)
              </Button>
            )}
          </div>

          {audioUrl && !isRecording && !vivaResult && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleEvaluateAudio}
              disabled={isEvaluating}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold flex items-center gap-2 shadow-sm ml-auto"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gemini Evaluating Speech...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Verify & Evaluate with Gemini AI
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Gemini AI Speech Evaluation Card (When Ready) */}
      {vivaResult && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-800/80 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                AI Oral Viva Verified
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                🎙️ Viva Score: {Math.round(vivaResult.viva_score)}%
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Technical: <strong>{vivaResult.viva_evaluation?.technical_accuracy_score || 80}%</strong></span>
              <span>•</span>
              <span>Fluency: <strong>{vivaResult.viva_evaluation?.communication_fluency_score || 85}%</strong></span>
            </div>
          </div>

          {/* Transcript Box */}
          {vivaResult.viva_transcription && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                AI Transcribed Speech:
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                "{vivaResult.viva_transcription}"
              </p>
            </div>
          )}

          {/* Strengths & AI Summary */}
          {vivaResult.ai_viva_summary && (
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <strong>Evaluation:</strong> {vivaResult.ai_viva_summary}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
