import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Award,
  ChevronLeft,
  ChevronRight,
  Send,
  HelpCircle,
  FileText,
  Edit3,
  Check,
  RotateCcw,
  ShieldAlert,
  AlertTriangle,
  Maximize2,
  Lock,
  Code2,
  Radio,
  Mic,
  Video,
  TrendingUp,
  Zap,
  Flame,
  Target,
  Activity,
  Layers,
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import CodeSandboxEditor from './CodeSandboxEditor';
import VoiceVivaRecorder from './VoiceVivaRecorder';
import VideoPitchRecorder from './VideoPitchRecorder';
import { jobService } from '../../services/jobService';

export default function ScreeningTestModal({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  companyName,
  resumeId,
  expectedSalary,
  onSuccess,
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Candidate answers state
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [writtenAnswers, setWrittenAnswers] = useState({});
  const [candidateCode, setCandidateCode] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('python');
  const [vivaData, setVivaData] = useState(null);
  const [videoPitchUrl, setVideoPitchUrl] = useState('');
  const [videoPitchBlob, setVideoPitchBlob] = useState(null);
  const candidateCodeRef = useRef('');

  // Dynamic AI Adaptive Testing State
  const [adaptiveSessionToken, setAdaptiveSessionToken] = useState(null);
  const [currentAdaptiveQ, setCurrentAdaptiveQ] = useState(null);
  const [adaptiveTheta, setAdaptiveTheta] = useState(50.0);
  const [adaptiveTier, setAdaptiveTier] = useState('MEDIUM');
  const [adaptiveStreak, setAdaptiveStreak] = useState(0);
  const [adaptiveStreakMessage, setAdaptiveStreakMessage] = useState('');
  const [adaptiveHistory, setAdaptiveHistory] = useState([]);
  const [adaptiveCompleted, setAdaptiveCompleted] = useState(false);
  const [adaptiveFinalResults, setAdaptiveFinalResults] = useState(null);
  const [isSubmittingAdaptiveOption, setIsSubmittingAdaptiveOption] = useState(false);

  useEffect(() => {
    candidateCodeRef.current = candidateCode;
  }, [candidateCode]);

  // Navigation & UI state
  const [activeSection, setActiveSection] = useState('mcq'); // 'mcq' | 'written' | 'coding' | 'viva' | 'pitch'
  const [mcqPage, setMcqPage] = useState(0); // 0 to 4 (5 questions per page)
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Anti-Cheating & Proctoring State
  const [proctoringStarted, setProctoringStarted] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [proctoringViolations, setProctoringViolations] = useState([]);
  const [proctoringModal, setProctoringModal] = useState(null); // { title, message, count, level: 'warning' | 'danger' | 'terminated' }
  const [isTerminated, setIsTerminated] = useState(false);
  const [normalSubmitSuccessModal, setNormalSubmitSuccessModal] = useState(null);

  // Proctoring Refs for event listeners & latest state
  const answersRef = useRef({ mcq: {}, written: {} });
  const violationsRef = useRef([]);
  const tabSwitchCountRef = useRef(0);
  const isTerminatedRef = useRef(false);
  const lastViolationTimeRef = useRef(0);
  const hasSubmittedRef = useRef(false);
  const isManualSubmitting = useRef(false);
  const proctoringCleanupRef = useRef(null);

  useEffect(() => {
    answersRef.current = { mcq: mcqAnswers, written: writtenAnswers };
  }, [mcqAnswers, writtenAnswers]);

  // Timer: 45 minutes default
  const [secondsRemaining, setSecondsRemaining] = useState(45 * 60);

  // Timer countdown
  useEffect(() => {
    if (!isOpen || !assessment || testResult || !proctoringStarted || isTerminated) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, assessment, testResult, proctoringStarted, isTerminated]);

  const handleTimeExpire = () => {
    executeSubmission("TIMEOUT");
  };

  // Load test questions
  useEffect(() => {
    if (isOpen && jobId) {
      loadAssessment();
    }
  }, [isOpen, jobId]);

  const loadAssessment = async () => {
    setLoading(true);
    setErrorMsg('');
    setTestResult(null);
    setMcqAnswers({});
    setWrittenAnswers({});
    setVivaData(null);
    setTabSwitchCount(0);
    setProctoringViolations([]);
    setProctoringModal(null);
    setIsTerminated(false);
    setProctoringStarted(false);
    setNormalSubmitSuccessModal(null);
    setAdaptiveSessionToken(null);
    setCurrentAdaptiveQ(null);
    setAdaptiveTheta(50.0);
    setAdaptiveTier('MEDIUM');
    setAdaptiveStreak(0);
    setAdaptiveStreakMessage('');
    setAdaptiveHistory([]);
    setAdaptiveCompleted(false);
    setAdaptiveFinalResults(null);
    setIsSubmittingAdaptiveOption(false);
    tabSwitchCountRef.current = 0;
    violationsRef.current = [];
    isTerminatedRef.current = false;
    lastViolationTimeRef.current = 0;
    hasSubmittedRef.current = false;
    isManualSubmitting.current = false;
    try {
      const data = await jobService.getJobAssessment(jobId);
      setAssessment(data);
      if (data.adaptive_session_token && data.first_adaptive_question) {
        setAdaptiveSessionToken(data.adaptive_session_token);
        setCurrentAdaptiveQ(data.first_adaptive_question);
        setAdaptiveTheta(50.0);
        setAdaptiveTier(data.first_adaptive_question.tier || 'MEDIUM');
        setAdaptiveStreak(0);
        setAdaptiveStreakMessage('Dynamic Item Response engine active. Starting at Applied / Intermediate tier.');
      }
      if (data.coding_challenge) {
        const starter =
          data.coding_challenge?.starter_code?.[codeLanguage] ||
          data.coding_challenge?.starter_code?.python ||
          '';
        setCandidateCode(starter);
        candidateCodeRef.current = starter;
      }
      if (data.time_limit_minutes) {
        setSecondsRemaining(data.time_limit_minutes * 60);
      }
    } catch (err) {
      console.error('Failed to load assessment:', err);
      setErrorMsg(
        err.response?.data?.detail ||
          'Unable to load screening assessment. Please ensure the job circular is active.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen request bypassed or denied:', e);
    }
    setProctoringStarted(true);
  };

  const detachProctoringListeners = () => {
    if (proctoringCleanupRef.current) {
      proctoringCleanupRef.current();
      proctoringCleanupRef.current = null;
    }
  };

  // Anti-Cheating & Proctoring Event Listeners
  useEffect(() => {
    if (!isOpen || !assessment || testResult || !proctoringStarted || isTerminated) return;

    const recordViolation = (eventType) => {
      if (isTerminatedRef.current || hasSubmittedRef.current || isManualSubmitting.current) return;

      const now = Date.now();
      // Debounce window blur and visibility change within 1500ms
      if (now - lastViolationTimeRef.current < 1500) return;
      lastViolationTimeRef.current = now;

      tabSwitchCountRef.current += 1;
      const count = tabSwitchCountRef.current;
      setTabSwitchCount(count);

      const timeStr = new Date().toLocaleTimeString();
      const desc =
        eventType === 'fullscreen'
          ? `Fullscreen exit at ${timeStr}`
          : `Tab switch / focus loss #${count} at ${timeStr}`;

      const item = { timestamp: timeStr, event: desc, count };
      violationsRef.current = [...violationsRef.current, item];
      setProctoringViolations([...violationsRef.current]);

      if (count === 1) {
        setProctoringModal({
          title: 'Warning (1/2): Tab Switch Detected',
          message:
            'Warning (1/2): Tab switch / window minimization detected! Remaining attempts: 1 before automatic test termination.',
          count: 1,
          level: 'warning',
        });
      } else if (count === 2) {
        setProctoringModal({
          title: 'Final Warning (2/2): Tab Switch Detected',
          message:
            'Final Warning (2/2): Another violation will permanently auto-submit your exam.',
          count: 2,
          level: 'danger',
        });
      } else if (count >= 3) {
        if (hasSubmittedRef.current) return;
        hasSubmittedRef.current = true;
        isTerminatedRef.current = true;
        setIsTerminated(true);

        // Detach all listeners immediately before initiating submission to prevent duplicate violation triggers
        cleanupListeners();

        setProctoringModal({
          title: 'Examination Terminated',
          message:
            'Examination Terminated: Excessive tab switching detected (>2 times). Submitting your exam and proctoring logs to the recruiter...',
          count: 3,
          level: 'terminated',
          completed: false,
        });
        // Instant Auto-Submission
        executeSubmission('AUTO_PROCTOR_VIOLATION', count, violationsRef.current);
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        recordViolation('visibility');
      }
    };

    const handleWindowBlur = () => {
      recordViolation('blur');
    };

    const handleFullscreen = () => {
      if (!document.fullscreenElement) {
        recordViolation('fullscreen');
      }
    };

    const handleKeyDown = (e) => {
      // Disallow Ctrl+C, Ctrl+V, Ctrl+U, Ctrl+S, Ctrl+P, F12
      if (
        (e.ctrlKey || e.metaKey) &&
        ['c', 'v', 'u', 's', 'p', 'x', 'a'].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        return false;
      }
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
    };

    const cleanupListeners = () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreen);
      window.removeEventListener('keydown', handleKeyDown);
    };
    proctoringCleanupRef.current = cleanupListeners;

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreen);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cleanupListeners();
      proctoringCleanupRef.current = null;
    };
  }, [isOpen, assessment, testResult, proctoringStarted, isTerminated]);

  if (!isOpen) return null;

  const mcqs = assessment?.mcq_questions || [];
  const writtens = assessment?.written_questions || [];
  const totalMcqTarget = adaptiveSessionToken ? 15 : (mcqs.length || 25);
  const totalQuestions = totalMcqTarget + writtens.length + (assessment?.coding_challenge ? 1 : 0) + 2;

  const answeredMcqCount = adaptiveSessionToken ? adaptiveHistory.length : Object.keys(mcqAnswers).length;
  const answeredWrittenCount = Object.values(writtenAnswers).filter(
    (v) => (v || '').trim().length > 10
  ).length;
  const codingAttempted = candidateCode && candidateCode.trim().length > 15 ? 1 : 0;
  const vivaAttempted = vivaData?.audioUrl ? 1 : 0;
  const pitchAttempted = videoPitchUrl ? 1 : 0;
  const totalAnswered = answeredMcqCount + answeredWrittenCount + codingAttempted + vivaAttempted + pitchAttempted;

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (qid, optionLetter) => {
    if (isTerminated) return;
    setMcqAnswers((prev) => ({
      ...prev,
      [String(qid)]: optionLetter,
    }));
  };

  const handleWrittenChange = (qid, text) => {
    if (isTerminated) return;
    setWrittenAnswers((prev) => ({
      ...prev,
      [String(qid)]: text,
    }));
  };

  const handleAnswerAdaptiveQuestion = async (optionLetter) => {
    if (isTerminated || isSubmittingAdaptiveOption || !currentAdaptiveQ || !adaptiveSessionToken) return;
    setIsSubmittingAdaptiveOption(true);

    const qNum = currentAdaptiveQ.question_number || (adaptiveHistory.length + 1);
    setMcqAnswers((prev) => ({
      ...prev,
      [String(currentAdaptiveQ.id)]: optionLetter,
    }));

    try {
      const response = await jobService.submitAdaptiveNext({
        session_token: adaptiveSessionToken,
        selected_option: optionLetter,
      });

      const entry = {
        question_number: qNum,
        question_id: currentAdaptiveQ.id,
        tier: currentAdaptiveQ.tier,
        weight: currentAdaptiveQ.weight,
        selected_option: optionLetter,
        correct_option: response.correct_option,
        is_correct: response.was_correct,
        theta_after: response.updated_theta,
        topic: currentAdaptiveQ.topic,
      };

      const updatedHistory = [...adaptiveHistory, entry];
      setAdaptiveHistory(updatedHistory);
      setAdaptiveTheta(response.updated_theta);
      setAdaptiveTier(response.updated_tier);
      setAdaptiveStreak(response.current_streak);
      setAdaptiveStreakMessage(response.streak_message);

      if (response.is_completed) {
        setAdaptiveCompleted(true);
        setAdaptiveFinalResults(response.final_results);
      } else if (response.next_question) {
        setCurrentAdaptiveQ(response.next_question);
      }
    } catch (err) {
      console.error('Error submitting adaptive question:', err);
    } finally {
      setIsSubmittingAdaptiveOption(false);
    }
  };

  const executeSubmission = async (
    reason = 'NORMAL',
    customCount = null,
    customViolations = null
  ) => {
    setShowWarningModal(false);
    const isAutoViolation = reason === 'AUTO_PROCTOR_VIOLATION';
    
    // Set manual submitting flag immediately & detach event listeners before preparing payload
    isManualSubmitting.current = true;
    detachProctoringListeners();

    if (isAutoViolation) {
      hasSubmittedRef.current = true;
      isTerminatedRef.current = true;
      setIsTerminated(true);
    }

    setSubmitting(true);
    const finalCount =
      customCount !== null ? customCount : tabSwitchCountRef.current;
    const finalViolations =
      customViolations !== null ? customViolations : violationsRef.current;
    const isSus = finalCount > 2 || isAutoViolation;

    try {
      let finalVideoPitchUrl = videoPitchUrl;
      if (videoPitchBlob && (!finalVideoPitchUrl || !finalVideoPitchUrl.startsWith('/uploads'))) {
        try {
          const vfd = new FormData();
          const ext = videoPitchBlob.type?.includes('mp4') ? 'mp4' : 'webm';
          vfd.append('file', videoPitchBlob, `pitch_${Date.now()}.${ext}`);
          if (jobId) vfd.append('job_id', jobId);
          const upRes = await jobService.uploadVideoPitch(vfd);
          if (upRes?.video_pitch_url) {
            finalVideoPitchUrl = upRes.video_pitch_url;
            setVideoPitchUrl(finalVideoPitchUrl);
          }
        } catch (e) {
          console.warn('Video pitch upload failed during submission:', e);
        }
      }

      const payload = {
        resume_id: resumeId || undefined,
        mcq_answers: answersRef.current.mcq,
        written_answers: answersRef.current.written,
        candidate_code: candidateCodeRef.current || candidateCode,
        code_language: codeLanguage,
        viva_audio_url: vivaData?.audioUrl || undefined,
        viva_score: vivaData?.vivaScore !== undefined ? Number(vivaData.vivaScore) : undefined,
        viva_transcription: vivaData?.transcription || undefined,
        viva_evaluation: vivaData?.evaluation || undefined,
        video_pitch_url: finalVideoPitchUrl || undefined,
        adaptive_session_token: adaptiveSessionToken || undefined,
        adaptive_ability_rating: adaptiveFinalResults?.skill_ceiling || undefined,
        adaptive_theta_score: adaptiveTheta !== undefined ? Number(adaptiveTheta) : undefined,
        adaptive_skill_curve: adaptiveHistory.length > 0 ? adaptiveHistory : undefined,
        adaptive_tier_distribution: adaptiveFinalResults?.tier_distribution || undefined,
        tab_switch_count: finalCount,
        is_suspicious: finalCount > 2 ? true : false,
        proctoring_violations: finalViolations,
        submission_reason: isAutoViolation ? 'AUTO_PROCTOR_VIOLATION' : 'NORMAL',
        expected_salary: expectedSalary ? Number(expectedSalary) : undefined,
      };
      const res = await jobService.submitJobAssessment(jobId, payload);
      setTestResult(res);
      if (onSuccess) {
        onSuccess(res);
      }
      if (isAutoViolation || isSus) {
        setProctoringModal({
          title: 'Exam Terminated & Submitted',
          message: 'Exam submitted with proctoring flag. Redirecting to dashboard...',
          count: finalCount,
          level: 'terminated',
          completed: true,
        });
        setTimeout(() => {
          onClose();
          navigate('/dashboard');
        }, 1500);
      } else {
        // Clean Normal Submission
        setProctoringModal(null);
        setNormalSubmitSuccessModal({
          title: 'Exam Submitted Successfully!',
          message: 'Your assessment has been recorded. Reviewing your scores...',
        });
        setTimeout(() => {
          setNormalSubmitSuccessModal(null);
        }, 1500);
      }
    } catch (err) {
      console.error('Submission error:', err);
      if (isAutoViolation || isSus) {
        setProctoringModal({
          title: 'Exam Terminated & Submitted',
          message: 'Exam submitted with proctoring flag. Redirecting to dashboard...',
          count: finalCount,
          level: 'terminated',
          completed: true,
        });
        setTimeout(() => {
          onClose();
          navigate('/dashboard');
        }, 1500);
      } else {
        setNormalSubmitSuccessModal(null);
        alert(
          err.response?.data?.detail ||
            'Failed to submit screening test. Please check your network and try again.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAttempt = () => {
    if (totalAnswered < totalQuestions) {
      setShowWarningModal(true);
    } else {
      executeSubmission('NORMAL');
    }
  };

  // Pagination for MCQs (5 questions per page)
  const pageSize = 5;
  const totalPages = Math.ceil(mcqs.length / pageSize) || 1;
  const currentMcqs = mcqs.slice(mcqPage * pageSize, (mcqPage + 1) * pageSize);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900">
        {/* Header */}
        <div className="p-5 sm:px-7 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                {companyName || 'Hiring Organization'}
              </span>
              <span className="text-slate-300">•</span>
              <Badge variant="primary" size="xs">
                Pre-Screening Exam
              </Badge>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate mt-0.5">
              {jobTitle || 'Technical Candidate Screening'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Proctoring Status Badge */}
            {proctoringStarted && !testResult && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-colors ${
                  tabSwitchCount === 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : tabSwitchCount === 1
                    ? 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
                    : 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                }`}
                title="Tab switches count"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Switches: {tabSwitchCount}/2</span>
              </div>
            )}

            {/* Timer Badge */}
            {!testResult && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-colors ${
                  secondsRemaining < 300
                    ? 'bg-rose-50 text-rose-600 border-rose-300 animate-pulse'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}
                title="Time remaining"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTimer(secondsRemaining)}</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              title="Close Exam"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="p-16 text-center space-y-4 my-auto">
            <div className="w-12 h-12 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Preparing Gemini AI Screening Test...
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Synthesizing 25 role-tailored MCQs and 5 practical written problems based on circular requirements.
              </p>
            </div>
          </div>
        ) : errorMsg ? (
          <div className="p-12 text-center space-y-4 my-auto">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-gray-900">Unable to Start Exam</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">{errorMsg}</p>
            <Button variant="secondary" size="sm" onClick={loadAssessment}>
              <RotateCcw className="w-4 h-4 mr-1.5" /> Retry Loading
            </Button>
          </div>
        ) : testResult ? (
          /* =========================================================
             TEST RESULT & CELEBRATION VIEW
             ========================================================= */
          <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
            <div className="text-center space-y-3 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/60 p-8 rounded-3xl border border-indigo-100">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
                <Award className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600">
                  Assessment Completed & Evaluated
                </span>
                <h3 className="text-2xl font-black text-gray-900 mt-1">
                  Your Pre-Screening Score: {Math.round(testResult.total_test_score)}%
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {testResult.summary_feedback ||
                    'Your answers and AI rubric evaluations have been compiled and submitted to the recruiter.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Application Recorded
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                  <Sparkles className="w-3.5 h-3.5" /> Shortlist Priority: High
                </span>
              </div>

              {testResult.is_suspicious && (
                <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-medium flex items-start gap-3 max-w-lg mx-auto text-left">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold text-rose-700 mb-0.5">Proctoring Flag Recorded</strong>
                    <span>
                      {testResult.tab_switch_count > 2 || testResult.submission_reason === 'AUTO_PROCTOR_VIOLATION'
                        ? `Exam terminated or flagged due to excessive tab switches (${testResult.tab_switch_count} violations recorded).`
                        : 'Tab focus shifts were detected and logged for the hiring team.'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Scorecard Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  MCQ Section (30% Weight)
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black text-gray-900">
                    {testResult.mcq_score} / 50.0 pts
                  </span>
                  <span className="text-xs font-bold text-emerald-600">
                    {testResult.mcq_correct_count} of {testResult.total_mcqs} Correct
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(testResult.mcq_correct_count / (testResult.total_mcqs || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Written Problems (25% Weight)
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black text-gray-900">
                    {testResult.written_score} / 50.0 pts
                  </span>
                  <span className="text-xs font-bold text-indigo-600">
                    AI Rubric Graded
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(testResult.written_score / 50.0) * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                  Live Coding (25% Weight)
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black text-indigo-950">
                    {testResult.coding_score !== undefined ? testResult.coding_score : 0} / 100 pts
                  </span>
                  <span className="text-xs font-bold text-indigo-600 font-mono">
                    {testResult.code_evaluation?.time_complexity || 'O(N)'}
                  </span>
                </div>
                <div className="w-full bg-indigo-200 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, testResult.coding_score || 0)}%` }}
                  />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                  Oral Viva (20% Weight)
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black text-purple-950">
                    {testResult.viva_score !== undefined ? Math.round(testResult.viva_score) : 0}%
                  </span>
                  <span className="text-xs font-bold text-purple-600">
                    Speech Evaluated
                  </span>
                </div>
                <div className="w-full bg-purple-200 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-purple-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, testResult.viva_score || 0)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* AI Live Coding Review Summary Card */}
            {testResult.code_evaluation && (
              <div className="p-5 rounded-2xl bg-slate-900 text-slate-200 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-xs text-white uppercase tracking-wider">
                      Gemini Pro Live Coding Evaluation
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-600/30 text-indigo-300 font-mono text-[11px] font-bold">
                      Time: {testResult.code_evaluation.time_complexity || 'O(N)'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-600/30 text-purple-300 font-mono text-[11px] font-bold">
                      Space: {testResult.code_evaluation.space_complexity || 'O(1)'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {testResult.code_evaluation.ai_summary}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  {testResult.code_evaluation.strengths?.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                      <span className="text-[11px] font-bold text-emerald-400 block mb-1">
                        ✔ Technical Strengths:
                      </span>
                      <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                        {testResult.code_evaluation.strengths.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {testResult.code_evaluation.weaknesses?.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                      <span className="text-[11px] font-bold text-amber-400 block mb-1">
                        ⚠️ Improvement Opportunities:
                      </span>
                      <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                        {testResult.code_evaluation.weaknesses.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI Oral Viva Review Summary Card */}
            {(testResult.viva_evaluation || testResult.viva_audio_url) && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 text-slate-200 border border-purple-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-900/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-xs text-white uppercase tracking-wider">
                      Gemini Pro Oral Viva Screening
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-600/40">
                      🎙️ Viva Score: {Math.round(testResult.viva_score || 0)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Technical: <strong>{testResult.viva_evaluation?.technical_accuracy_score || 75}%</strong></span>
                    <span>•</span>
                    <span>Fluency: <strong>{testResult.viva_evaluation?.communication_fluency_score || 80}%</strong></span>
                  </div>
                </div>

                {testResult.viva_audio_url && (
                  <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-xs text-purple-200 font-medium">Recorded Oral Viva Audio:</span>
                    <audio
                      src={testResult.viva_audio_url.startsWith('http') ? testResult.viva_audio_url : `http://127.0.0.1:8000${testResult.viva_audio_url}`}
                      controls
                      className="h-8 max-w-full sm:max-w-xs"
                    />
                  </div>
                )}

                {testResult.viva_transcription && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                      AI Transcribed Speech:
                    </span>
                    <p className="text-xs text-slate-300 italic bg-slate-950/70 p-3 rounded-xl border border-purple-900/40 leading-relaxed font-sans">
                      "{testResult.viva_transcription}"
                    </p>
                  </div>
                )}

                {testResult.viva_evaluation?.ai_viva_summary && (
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    <strong>AI Assessor Summary:</strong> {testResult.viva_evaluation.ai_viva_summary}
                  </p>
                )}
              </div>
            )}

            {/* Dynamic AI Adaptive Skill Curve & Demonstrated Skill Ceiling */}
            {(testResult.adaptive_ability_rating || adaptiveFinalResults || (testResult.adaptive_skill_curve && testResult.adaptive_skill_curve.length > 0)) && (
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-slate-200 border border-indigo-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-900/60 pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-xs text-white uppercase tracking-wider">
                      Dynamic Item Response • Adaptive Skill Analysis
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      Ceiling: {testResult.adaptive_ability_rating || adaptiveFinalResults?.skill_ceiling || 'Proficient / Applied'}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      Theta: {(testResult.adaptive_theta_score || adaptiveFinalResults?.final_theta || adaptiveTheta).toFixed(1)} / 100
                    </span>
                  </div>
                </div>

                {/* Step progression curve */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">Latent Ability Step Trajectory:</span>
                    <span className="text-[11px] text-slate-400">Green = Solved Correctly • Red = Stepped Down</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {(testResult.adaptive_skill_curve || adaptiveHistory || []).map((step, idx) => {
                      const tierColorMap = {
                        EASY: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                        MEDIUM: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                        HARD: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
                        EXPERT: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                      };
                      return (
                        <div
                          key={idx}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border flex items-center gap-1.5 ${tierColorMap[step.tier] || 'bg-slate-800 text-slate-300'}`}
                          title={`Step ${step.question_number || idx + 1}: ${step.tier} (Weight: ${step.weight}x) - ${step.is_correct ? 'Correct' : 'Incorrect'}`}
                        >
                          <span className="text-slate-400">#{step.question_number || idx + 1}</span>
                          <span>{step.tier}</span>
                          <span className={step.is_correct ? 'text-emerald-400 font-black' : 'text-rose-400 font-black'}>
                            {step.is_correct ? '✔' : '✘'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tier distribution breakdown */}
                {testResult.adaptive_tier_distribution && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                    {Object.entries(testResult.adaptive_tier_distribution).map(([tierKey, data]) => {
                      const labels = {
                        EASY: '🟢 Foundational',
                        MEDIUM: '🟡 Applied',
                        HARD: '🟣 Deep Technical',
                        EXPERT: '🔴 Expert Arch.',
                      };
                      return (
                        <div key={tierKey} className="p-2.5 rounded-xl bg-slate-900/80 border border-indigo-950 space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 block">{labels[tierKey] || tierKey}</span>
                          <span className="font-mono text-xs font-extrabold text-white">
                            {data.correct || 0} / {data.attempted || 0} Solved
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Written Question-by-Question Feedback */}
            {testResult.written_evaluations && testResult.written_evaluations.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-900">
                  Written Feedback Breakdown
                </h4>
                <div className="space-y-2.5">
                  {testResult.written_evaluations.map((ev, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-white border border-slate-200 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-gray-900">
                          Problem #{ev.question_id || idx + 1}
                        </span>
                        <span className="text-indigo-600 font-extrabold">
                          {ev.marks_awarded} / {ev.max_marks || 10} pts
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed font-medium">
                        {ev.feedback}
                      </p>
                      {ev.strengths && (
                        <p className="text-emerald-800 text-[11px] font-medium">
                          <strong>Strengths:</strong> {ev.strengths}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <Button
                variant="primary"
                onClick={onClose}
                className="w-full sm:w-auto text-xs font-bold px-6 py-2.5"
              >
                Close & Return to Dashboard
              </Button>
            </div>
          </div>
        ) : !proctoringStarted ? (
          /* =========================================================
             PRE-EXAM PROCTORING ONBOARDING VIEW
             ========================================================= */
          <div className="p-6 sm:p-10 overflow-y-auto space-y-6 max-w-2xl mx-auto my-auto text-center">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto shadow-md shadow-indigo-100">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-indigo-600">
                AI Automated Anti-Cheating Environment
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-gray-900">
                Proctored Candidate Assessment Rules
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                This screening test is monitored in real time. Please review the following mandatory guidelines before proceeding:
              </p>
            </div>

            <div className="text-left bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3.5 text-xs text-slate-700">
              <div className="flex items-start gap-3">
                <Maximize2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-gray-900 font-bold block">1. Fullscreen Requirement:</strong>
                  The exam must be taken in Fullscreen mode. Exiting fullscreen is detected and counted as a violation.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-gray-900 font-bold block">2. Strict Tab Switching Limits (Max 2 Allowed):</strong>
                  Switching browser tabs, minimizing the browser, or shifting focus away from the test window triggers a security violation.
                  <span className="block mt-0.5 text-amber-700 font-semibold">
                    • 1st violation: Warning alert & remaining attempts counter
                    <br />
                    • 2nd violation: Final warning
                    <br />
                    • 3rd violation: Test is immediately terminated and auto-submitted with a Suspicion Flag
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-gray-900 font-bold block">3. Copy/Paste & Context Menu Disabled:</strong>
                  Clipboard shortcuts, text selection, and right-click menus are disabled throughout the examination.
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={onClose} className="w-full sm:w-auto text-xs">
                Cancel & Exit
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleStartExam}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 font-bold text-xs px-8 py-3 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                <Maximize2 className="w-4 h-4" />
                I Acknowledge & Start Monitored Exam
              </Button>
            </div>
          </div>
        ) : (
          /* =========================================================
             ACTIVE EXAM INTERACTION VIEW
             ========================================================= */
          <>
            {/* Navigation Stepper & Progress Bar */}
            <div className="px-6 py-3 border-b border-slate-200 bg-white space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                {/* Section Toggle Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveSection('mcq')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                      activeSection === 'mcq'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Part 1: {adaptiveSessionToken ? 'Adaptive MCQs' : 'MCQs'} ({answeredMcqCount}/{totalMcqTarget})
                  </button>

                  <button
                    onClick={() => setActiveSection('written')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                      activeSection === 'written'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Part 2: Written ({answeredWrittenCount}/5)
                  </button>

                  <button
                    onClick={() => setActiveSection('coding')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                      activeSection === 'coding'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    Part 3: Live Coding Sandbox ({codingAttempted}/1)
                  </button>

                  <button
                    onClick={() => setActiveSection('viva')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                      activeSection === 'viva'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5" />
                    Part 4: Oral Viva ({vivaAttempted}/1)
                  </button>

                  <button
                    onClick={() => setActiveSection('pitch')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                      activeSection === 'pitch'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    Part 5: 60s Video Pitch ({pitchAttempted}/1)
                  </button>
                </div>

                <div className="flex items-center gap-2 text-slate-600 font-semibold self-end sm:self-auto">
                  <span>
                    Overall Progress: <strong className="text-gray-900 font-extrabold">{totalAnswered}</strong> / {totalQuestions}
                  </span>
                  <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(totalAnswered / (totalQuestions || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Exam Body Area */}
            <div
              className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 bg-slate-50/70 select-none"
              onContextMenu={(e) => e.preventDefault()}
              onCopy={(e) => e.preventDefault()}
              onPaste={(e) => e.preventDefault()}
            >
              {activeSection === 'mcq' ? (
                /* ----------------- SECTION 1: MCQS (ADAPTIVE & STATIC FALLBACK) ----------------- */
                adaptiveSessionToken ? (
                  adaptiveCompleted ? (
                    /* Adaptive Round Completed Summary */
                    <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/60 border border-indigo-200 space-y-6 text-center animate-fadeIn">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
                        <Zap className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600">
                          Adaptive Pre-Screening Module Completed
                        </span>
                        <h3 className="text-xl sm:text-2xl font-black text-gray-900">
                          Latent Ability Benchmark Established
                        </h3>
                        <p className="text-xs text-slate-600 max-w-md mx-auto">
                          The dynamic testing engine has completed your sequential 15-question challenge curve and calibrated your competency ceiling.
                        </p>
                      </div>

                      {/* Metric highlights */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto text-left">
                        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Demonstrated Ceiling</span>
                          <span className="text-xs font-black text-indigo-600 mt-1 block">
                            {adaptiveFinalResults?.skill_ceiling || 'Proficient / Applied'}
                          </span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Latent Ability (Theta)</span>
                          <span className="text-sm font-black text-purple-600 mt-1 block">
                            {(adaptiveFinalResults?.final_theta || adaptiveTheta).toFixed(1)} / 100
                          </span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Weighted MCQ Score</span>
                          <span className="text-sm font-black text-emerald-600 mt-1 block">
                            {adaptiveFinalResults?.mcq_scaled_points || 35.0} / 50 pts
                          </span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-white border border-slate-200">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Raw Accuracy</span>
                          <span className="text-sm font-black text-gray-900 mt-1 block">
                            {adaptiveFinalResults?.total_correct || adaptiveHistory.filter(h => h.is_correct).length} / 15 ({adaptiveFinalResults?.raw_accuracy || 0}%)
                          </span>
                        </div>
                      </div>

                      {/* Adaptive Step Curve Mini-Timeline */}
                      <div className="p-4 rounded-2xl bg-white border border-slate-200 text-left space-y-2 max-w-2xl mx-auto">
                        <span className="text-[11px] font-bold text-slate-700 block">
                          Adaptive Skill Progression Curve (15 Steps):
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {adaptiveHistory.map((item, idx) => {
                            const tierColors = {
                              EASY: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                              MEDIUM: 'bg-amber-100 text-amber-900 border-amber-300',
                              HARD: 'bg-purple-100 text-purple-900 border-purple-300',
                              EXPERT: 'bg-rose-100 text-rose-900 border-rose-300',
                            };
                            return (
                              <div
                                key={idx}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold border flex items-center gap-1 ${tierColors[item.tier] || 'bg-slate-100 text-slate-700'}`}
                                title={`Q${item.question_number}: ${item.tier} (${item.is_correct ? 'Correct' : 'Incorrect'}) - Theta: ${item.theta_after}`}
                              >
                                <span>Q{item.question_number}</span>
                                <span>{item.is_correct ? '✔' : '✘'}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button
                          variant="primary"
                          size="md"
                          onClick={() => setActiveSection('written')}
                          className="font-bold text-xs px-6 py-2.5 shadow-md shadow-indigo-600/20"
                        >
                          Proceed to Part 2: Written Problems <ChevronRight className="w-4 h-4 ml-1.5" />
                        </Button>
                      </div>
                    </div>
                  ) : currentAdaptiveQ ? (
                    /* Active Adaptive Question Runner */
                    <div className="space-y-5">
                      {/* Adaptive Header Control Bar */}
                      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Challenge Tier & Weight */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-500">
                            Question {currentAdaptiveQ.question_number || (adaptiveHistory.length + 1)} of {currentAdaptiveQ.total_questions || 15}
                          </span>
                          <span className="text-slate-300">•</span>
                          {currentAdaptiveQ.tier === 'EASY' && (
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              🟢 Foundational (1.0x Weight)
                            </span>
                          )}
                          {currentAdaptiveQ.tier === 'MEDIUM' && (
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                              🟡 Applied / Intermediate ⚡ (1.5x Weight)
                            </span>
                          )}
                          {currentAdaptiveQ.tier === 'HARD' && (
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                              🟣 Deep Technical 🔥 (2.2x Weight)
                            </span>
                          )}
                          {currentAdaptiveQ.tier === 'EXPERT' && (
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                              🔴 Expert Architecture 🚀 (3.0x Weight)
                            </span>
                          )}
                        </div>

                        {/* Streak & Theta Ability Gauge */}
                        <div className="flex items-center gap-3">
                          {adaptiveStreak >= 2 ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-orange-100 text-orange-800 border border-orange-300 flex items-center gap-1">
                              <Flame className="w-3.5 h-3.5 text-orange-600 animate-bounce" /> {adaptiveStreak} Streak!
                            </span>
                          ) : adaptiveStreak < 0 ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                              Recalibrating
                            </span>
                          ) : null}

                          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Theta: <strong className="text-gray-900 font-black">{adaptiveTheta.toFixed(1)}</strong>/100</span>
                            <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden ml-1">
                              <div
                                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, Math.max(5, adaptiveTheta))}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Streak Notification Banner */}
                      {adaptiveStreakMessage && (
                        <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs text-indigo-950 animate-fadeIn">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Zap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            {adaptiveStreakMessage}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200 shrink-0 ml-2">
                            Adaptive Engine
                          </span>
                        </div>
                      )}

                      {/* Adaptive Question Card */}
                      <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                          <div className="flex items-start gap-3">
                            <span className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                              #{currentAdaptiveQ.question_number || (adaptiveHistory.length + 1)}
                            </span>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Domain / Topic: {currentAdaptiveQ.topic || 'Software Engineering'}
                              </span>
                              <h4 className="text-base sm:text-lg font-bold text-gray-900 leading-snug mt-0.5">
                                {currentAdaptiveQ.question}
                              </h4>
                            </div>
                          </div>
                        </div>

                        {/* Options grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                          {(currentAdaptiveQ.options || []).map((opt, optIdx) => {
                            const letterMatch = opt.match(/^([A-D])\)/i);
                            const letter = letterMatch ? letterMatch[1].toUpperCase() : String.fromCharCode(65 + optIdx);
                            const isSelected = mcqAnswers[String(currentAdaptiveQ.id)] === letter;

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                disabled={isSubmittingAdaptiveOption || isTerminated}
                                onClick={() => handleAnswerAdaptiveQuestion(letter)}
                                className={`p-4 rounded-xl border text-left text-xs transition-all flex items-start gap-3.5 cursor-pointer disabled:opacity-60 ${
                                  isSelected
                                    ? 'border-2 border-indigo-600 bg-indigo-50/90 text-indigo-950 font-bold shadow-xs ring-1 ring-indigo-500'
                                    : 'border border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400 text-slate-800 font-medium'
                                }`}
                              >
                                <span
                                  className={`w-6 h-6 rounded-full border text-xs font-black flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white border-indigo-600'
                                      : 'border-slate-400 bg-white text-slate-800'
                                  }`}
                                >
                                  {letter}
                                </span>
                                <span className={`leading-relaxed pt-0.5 ${isSelected ? 'text-indigo-950 font-bold' : 'text-slate-800'}`}>
                                  {opt}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {isSubmittingAdaptiveOption && (
                          <div className="flex items-center justify-center gap-2 text-xs font-bold text-indigo-600 pt-2 animate-pulse">
                            <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            <span>Calibrating response & computing next difficulty tier...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null
                ) : (
                  /* Standard 25 Static MCQs Fallback */
                  <div className="space-y-6">
                    {/* Page Indicator & Quick Question Jump Pills */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                      <span className="text-xs font-bold text-slate-700">
                        Questions {mcqPage * pageSize + 1} -{' '}
                        {Math.min((mcqPage + 1) * pageSize, mcqs.length)} of {mcqs.length}
                      </span>

                      <div className="flex flex-wrap items-center gap-1">
                        {mcqs.map((q, idx) => {
                          const isAnswered = !!mcqAnswers[String(q.id)];
                          const isCurrentPage =
                            idx >= mcqPage * pageSize && idx < (mcqPage + 1) * pageSize;
                          return (
                            <button
                              key={q.id}
                              onClick={() => setMcqPage(Math.floor(idx / pageSize))}
                              className={`w-6 h-6 rounded-md text-[10px] font-black transition-all ${
                                isCurrentPage
                                  ? 'ring-2 ring-indigo-600 font-extrabold'
                                  : ''
                              } ${
                                isAnswered
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300'
                              }`}
                              title={`Jump to Q${idx + 1}`}
                            >
                              {idx + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 5 Questions on current page */}
                    <div className="space-y-6">
                      {currentMcqs.map((q, index) => {
                        const absoluteIdx = mcqPage * pageSize + index + 1;
                        const selectedOption = mcqAnswers[String(q.id)];

                        return (
                          <div
                            key={q.id}
                            className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4"
                          >
                            <div className="flex items-start gap-3">
                              <span className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                                {absoluteIdx}
                              </span>
                              <h4 className="text-sm sm:text-base font-semibold text-gray-900 leading-relaxed">
                                {q.question}
                              </h4>
                            </div>

                            {/* 4 Options */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 pl-0 sm:pl-10">
                              {(q.options || []).map((opt, optIdx) => {
                                const letterMatch = opt.match(/^([A-D])\)/i);
                                const letter = letterMatch ? letterMatch[1].toUpperCase() : String.fromCharCode(65 + optIdx);
                                const isSelected = selectedOption === letter;

                                return (
                                  <button
                                    key={optIdx}
                                    type="button"
                                    onClick={() => handleSelectOption(q.id, letter)}
                                    className={`p-3.5 rounded-xl border text-left text-xs transition-all flex items-start gap-3 cursor-pointer ${
                                      isSelected
                                        ? 'border-2 border-indigo-600 bg-indigo-50/90 text-indigo-950 font-semibold shadow-xs ring-1 ring-indigo-500'
                                        : 'border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium'
                                    }`}
                                  >
                                    <span
                                      className={`w-5 h-5 rounded-full border text-[10px] font-black flex items-center justify-center shrink-0 transition-colors ${
                                        isSelected
                                          ? 'bg-indigo-600 text-white border-indigo-600'
                                          : 'border-slate-400 bg-white text-slate-800'
                                      }`}
                                    >
                                      {letter}
                                    </span>
                                    <span className={`leading-snug pt-0.5 ${isSelected ? 'text-indigo-950 font-bold' : 'text-gray-900 text-slate-800 font-medium'}`}>
                                      {opt}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* MCQ Pagination Controls */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setMcqPage((p) => Math.max(0, p - 1))}
                        disabled={mcqPage === 0}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous 5
                      </Button>

                      <span className="text-xs font-semibold text-slate-600">
                        Page {mcqPage + 1} of {totalPages}
                      </span>

                      {mcqPage + 1 < totalPages ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setMcqPage((p) => p + 1)}
                        >
                          Next 5 <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setActiveSection('written')}
                        >
                          Proceed to Written Section <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              ) : activeSection === 'written' ? (
                /* ----------------- SECTION 2: WRITTEN PROBLEMS ----------------- */
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-start gap-3 text-xs text-indigo-950">
                    <HelpCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold text-gray-900 text-sm mb-0.5">Short Written Guidelines:</strong>
                      <p className="text-slate-800 font-medium leading-relaxed">
                        Write 2 to 4 concise paragraphs explaining your technical methodology, architectural trade-offs, and concrete industry practices. Gemini AI will evaluate each response against standard grading rubrics.
                      </p>
                    </div>
                  </div>

                  {writtens.map((wq, idx) => {
                    const textValue = writtenAnswers[String(wq.id)] || '';
                    const wordCount = textValue.trim() ? textValue.trim().split(/\s+/).length : 0;

                    return (
                      <div
                        key={wq.id}
                        className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                              #{idx + 1}
                            </span>
                            <h4 className="text-sm sm:text-base font-semibold text-gray-900 leading-relaxed">
                              {wq.question}
                            </h4>
                          </div>
                          <Badge variant="outline" size="xs" className="font-bold text-slate-800 border-slate-300 bg-slate-100 shrink-0">
                            Max {wq.max_marks || 10} pts
                          </Badge>
                        </div>

                        <textarea
                          rows={4}
                          value={textValue}
                          onChange={(e) => handleWrittenChange(wq.id, e.target.value)}
                          placeholder="Type your structured solution and explanation here..."
                          className="w-full p-3.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl text-gray-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 leading-relaxed"
                        />

                        <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                          <span>
                            {wordCount} words{' '}
                            {wordCount < 25 ? '(Recommend at least 25-30 words)' : '✓ Good depth'}
                          </span>
                          <span className={wordCount >= 25 ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                            {wordCount >= 25 ? 'Ready' : 'Incomplete'}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setActiveSection('mcq')}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Back to MCQs
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setActiveSection('coding')}
                    >
                      Proceed to Live Coding Sandbox <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              ) : activeSection === 'coding' ? (
                /* ----------------- SECTION 3: LIVE CODING SANDBOX ----------------- */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="font-bold">
                        Interactive Live Coding Sandbox (Powered by Gemini Pro)
                      </span>
                    </div>
                    <span className="text-slate-600 font-mono text-[11px]">
                      Solve the algorithmic challenge, run test assertions, and submit with your exam
                    </span>
                  </div>

                  <CodeSandboxEditor
                    problem={assessment?.coding_challenge}
                    code={candidateCode}
                    onChange={setCandidateCode}
                    language={codeLanguage}
                    onLanguageChange={setCodeLanguage}
                  />

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setActiveSection('written')}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Back to Written Questions
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setActiveSection('viva')}
                      className="bg-indigo-600 hover:bg-indigo-700 font-bold"
                    >
                      Proceed to Oral Viva Round <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              ) : activeSection === 'viva' ? (
                /* ----------------- SECTION 4: VOICE VIVA SCREENING ----------------- */
                <div className="space-y-4">
                  <VoiceVivaRecorder
                    jobId={jobId}
                    vivaPrompt={assessment?.viva_prompt}
                    onVivaComplete={(data) => setVivaData(data)}
                    initialData={vivaData}
                  />

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setActiveSection('coding')}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Back to Live Coding
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setActiveSection('pitch')}
                      className="bg-indigo-600 hover:bg-indigo-700 font-bold"
                    >
                      Proceed to 60s Video Pitch <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              ) : (
                /* ----------------- SECTION 5: 60-SECOND VIDEO ELEVATOR PITCH ----------------- */
                <div className="space-y-4">
                  <VideoPitchRecorder
                    jobId={jobId}
                    initialVideoUrl={videoPitchUrl}
                    onVideoRecorded={(blob, url) => {
                      setVideoPitchBlob(blob);
                      setVideoPitchUrl(url);
                    }}
                  />

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setActiveSection('viva')}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Back to Oral Viva
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSubmitAttempt}
                      disabled={submitting}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 font-bold shadow-md text-white"
                    >
                      Submit Application & Assessment <Send className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:px-7 border-t border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-700 font-medium">
                Total Answered: <strong className="text-gray-900 font-extrabold">{totalAnswered}</strong> of {totalQuestions} Questions
              </span>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubmitAttempt}
                  disabled={submitting}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 font-bold"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      AI Automated Grading in Progress...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Submit Application & Assessment
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Unanswered Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900">
                Unanswered Questions Detected
              </h4>
              <p className="text-xs text-slate-600 mt-1">
                You have answered {totalAnswered} of {totalQuestions} questions. Are you sure you
                want to finalize your submission? Unanswered questions will receive 0 marks.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowWarningModal(false)}
              >
                Continue Test
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => executeSubmission('NORMAL')}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Submit Anyway
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Normal Submission Clean Success Modal */}
      {normalSubmitSuccessModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-emerald-500 ring-4 ring-emerald-500/20 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-gray-900">
                {normalSubmitSuccessModal.title || 'Exam Submitted Successfully!'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {normalSubmitSuccessModal.message || 'Your assessment has been recorded. Reviewing your scores...'}
              </p>
            </div>

            <div className="flex justify-center pt-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Score Recorded
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proctoring Warning & Violation Alert Modal */}
      {proctoringModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`bg-white rounded-2xl p-6 max-w-md w-full border shadow-2xl space-y-4 ${
              proctoringModal.level === 'terminated'
                ? 'border-rose-500 ring-4 ring-rose-500/20'
                : proctoringModal.level === 'danger'
                ? 'border-rose-400 ring-2 ring-rose-400/20'
                : 'border-amber-400 ring-2 ring-amber-400/20'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
                proctoringModal.level === 'terminated'
                  ? 'bg-rose-100 text-rose-600'
                  : proctoringModal.level === 'danger'
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-amber-100 text-amber-600'
              }`}
            >
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-black text-gray-900">
                {proctoringModal.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {proctoringModal.message}
              </p>
              {proctoringModal.level !== 'terminated' && (
                <div className="inline-block text-[11px] font-bold text-amber-800 bg-amber-50 py-1 px-3 rounded-lg border border-amber-200">
                  Violations Remaining: {2 - proctoringModal.count}
                </div>
              )}
            </div>

            <div className="flex justify-center pt-2">
              {proctoringModal.level === 'terminated' ? (
                proctoringModal.completed ? (
                  <div className="text-xs font-bold text-emerald-600 flex items-center gap-2 py-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Exam submitted with proctoring flag. Redirecting to dashboard...
                  </div>
                ) : (
                  <div className="text-xs font-bold text-rose-600 flex items-center gap-2 py-2">
                    <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                    Submitting flagged exam to recruiter...
                  </div>
                )
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setProctoringModal(null);
                    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
                      document.documentElement.requestFullscreen().catch(() => {});
                    }
                  }}
                  className={
                    proctoringModal.level === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }
                >
                  I Understand & Resume Exam
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
