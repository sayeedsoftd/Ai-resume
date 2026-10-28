import React, { useState, useEffect } from 'react';
import { resumeService } from '../services/resumeService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Award,
  Layers,
  Cpu,
  Target,
  BarChart3,
  UserCheck,
  ChevronRight,
  BookOpen,
  X,
  Check,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

const ResumeUpload = () => {
  const [file, setFile] = useState(null);
  const [targetJd, setTargetJd] = useState('');
  const [uploading, setUploading] = useState(false);
  const [analyzingJd, setAnalyzingJd] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [activeStage, setActiveStage] = useState(4);

  const loadResumes = async () => {
    try {
      const data = await resumeService.getResumes();
      setResumes(data);
      if (data.length > 0) {
        setSelectedResume(data[0]);
        loadAnalysis(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAnalysis = async (resumeId) => {
    try {
      const result = await resumeService.getResumeAnalysis(resumeId);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadResumes();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const uploaded = await resumeService.uploadResume(file, targetJd);
      setFile(null);
      await loadResumes();
      setSelectedResume(uploaded);
      if (uploaded.custom_jd_match) {
        setAnalysis({
          resume_id: uploaded.id,
          extracted_skills: uploaded.extracted_skills,
          experience_years: uploaded.experience_years,
          ats_score: uploaded.ats_score,
          shortlist_status: uploaded.shortlist_status,
          score_breakdown: uploaded.score_breakdown,
          recommendations: uploaded.suggestions || [],
          strengths: uploaded.matched_skills ? [`Matched: ${uploaded.matched_skills.join(', ')}`] : [],
          weaknesses: uploaded.missing_skills ? [`Missing: ${uploaded.missing_skills.join(', ')}`] : [],
          custom_jd_match: uploaded.custom_jd_match,
          matched_skills: uploaded.matched_skills,
          missing_skills: uploaded.missing_skills,
          target_job_description: uploaded.target_job_description,
        });
      } else {
        await loadAnalysis(uploaded.id);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload and parse resume.');
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyzeSelectedAgainstJd = async () => {
    if (!selectedResume || !targetJd.trim()) return;
    setAnalyzingJd(true);
    setError('');
    try {
      const result = await resumeService.analyzeAgainstJob({
        resume_id: selectedResume.id,
        job_description_text: targetJd.trim(),
      });
      setAnalysis((prev) => ({
        ...prev,
        ats_score: result.ats_score,
        shortlist_status: result.shortlist_status,
        score_breakdown: result.score_breakdown,
        matched_skills: result.matched_skills,
        missing_skills: result.missing_skills,
        recommendations: result.suggestions || prev?.recommendations || [],
        custom_jd_match: result,
        target_job_description: targetJd.trim(),
      }));
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to evaluate resume against target job description.');
    } finally {
      setAnalyzingJd(false);
    }
  };

  const currentScore = analysis?.ats_score ?? selectedResume?.parsed_data?.ats_score ?? 0;
  const isShortlisted = currentScore >= 75;
  const shortlistStatus = analysis?.shortlist_status || (isShortlisted ? 'Shortlisted / Recommended' : 'Filtered / Under Review');
  const breakdown = analysis?.score_breakdown || selectedResume?.parsed_data?.score_breakdown || {
    skills_score: Math.min(40, (selectedResume?.parsed_data?.skills?.length || 0) * 4),
    skills_max: 40,
    experience_score: 22,
    experience_max: 30,
    education_score: 18,
    education_max: 20,
    format_score: 10,
    format_max: 10,
  };

  const matchedSkills = analysis?.matched_skills || selectedResume?.parsed_data?.matched_skills || [];
  const missingSkills = analysis?.missing_skills || selectedResume?.parsed_data?.missing_skills || [];
  const hasJdComparison = !!(analysis?.custom_jd_match || selectedResume?.parsed_data?.custom_jd_match || matchedSkills.length > 0 || missingSkills.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Enterprise ATS Pipeline & Evaluation
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          4-Stage Applicant Tracking System: File Ingestion &bull; Entity Categorization &bull; Job Criteria Alignment &bull; Composite Scoring & Shortlisting
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-lg font-medium">
          {error}
        </div>
      )}

      {/* 4-STAGE PIPELINE PROGRESS TRACKER */}
      <Card className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          4-Stage Processing Pipeline
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border bg-white dark:bg-slate-800 border-emerald-300 dark:border-emerald-800 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">1</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">File Ingestion</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">pdfplumber &bull; pypdf &bull; Layout Flattening</p>
          </div>

          <div className="p-3 rounded-lg border bg-white dark:bg-slate-800 border-indigo-300 dark:border-indigo-800 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">2</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Entity Extraction</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Gemini AI &bull; Skills &bull; Education &bull; History</p>
          </div>

          <div className={`p-3 rounded-lg border shadow-sm ${hasJdComparison ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-700' : 'bg-white dark:bg-slate-800 border-indigo-300 dark:border-indigo-800'}`}>
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full font-bold text-xs flex items-center justify-center ${hasJdComparison ? 'bg-emerald-200 text-emerald-800' : 'bg-indigo-100 text-indigo-700'}`}>3</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Criteria Matching</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {hasJdComparison ? 'Target JD Alignment Active' : 'Semantic Overlap & Title Match'}
            </p>
          </div>

          <div className={`p-3 rounded-lg border shadow-sm ${isShortlisted ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-700' : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700'}`}>
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full font-bold text-xs flex items-center justify-center ${isShortlisted ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'}`}>4</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Shortlist Routing</span>
            </div>
            <p className={`text-[11px] font-semibold mt-1 ${isShortlisted ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
              {shortlistStatus}
            </p>
          </div>
        </div>
      </Card>

      {/* Upload & Target JD Interactive Form */}
      <Card className="space-y-4">
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Choose Resume Document (.PDF, .DOCX, .TXT)
            </label>
            <input
              type="file"
              accept=".pdf,.txt,.docx"
              onChange={(e) => setFile(e.target.files[0])}
              className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-950/80 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/60 cursor-pointer border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 bg-slate-50/50 dark:bg-slate-900/50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Target Job Description (Optional / Recommended)
              </label>
              {targetJd && (
                <button
                  type="button"
                  onClick={() => setTargetJd('')}
                  className="text-xs text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 flex items-center gap-1 font-medium transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear Text
                </button>
              )}
            </div>
            <textarea
              rows={4}
              value={targetJd}
              onChange={(e) => setTargetJd(e.target.value)}
              placeholder="Paste any job posting or circular requirements here (roles, tech stack, requirements)..."
              className="w-full text-xs font-sans sm:text-sm p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-y"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {targetJd.trim()
                ? '⚡ Scenario A: Custom JD Alignment & Skills Gap Analysis active'
                : '🛡️ Scenario B: General ATS format and quality audit mode'}
            </span>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              {selectedResume && targetJd.trim() && (
                <Button
                  type="button"
                  variant="outline"
                  loading={analyzingJd}
                  onClick={handleAnalyzeSelectedAgainstJd}
                  className="w-full sm:w-auto text-xs"
                >
                  <Target className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                  Analyze Active Resume vs JD
                </Button>
              )}
              <Button
                type="submit"
                variant="primary"
                loading={uploading}
                disabled={!file}
                className="w-full sm:w-auto"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload & Run ATS Analysis
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Resumes and Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Resumes List */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Uploaded Resumes ({resumes.length})</h3>
          {resumes.map((r) => (
            <div
              key={r.id}
              onClick={() => {
                setSelectedResume(r);
                loadAnalysis(r.id);
              }}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedResume?.id === r.id
                  ? 'border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/30 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">Version {r.version}</span>
                {r.is_primary && <Badge variant="success" size="xs">Primary Active</Badge>}
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1 truncate">{r.file_path.split('/').pop()}</p>
              <div className="flex items-center justify-between mt-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">Score: {r.parsed_data?.ats_score || 0}%</span>
                <span>{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Detailed Analysis Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {selectedResume && (
            <>
              {/* Score & Shortlist Card */}
              <Card className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-br from-indigo-50/50 via-white to-violet-50/40 dark:from-slate-900 dark:via-slate-850 dark:to-indigo-950/30">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase">
                    <Sparkles className="w-3.5 h-3.5" /> Stage 4: Composite Score & Shortlisting
                  </div>
                  <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    Applicant Tracking Assessment
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={isShortlisted ? 'success' : 'warning'} size="sm">
                      {shortlistStatus}
                    </Badge>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Experience: {analysis?.experience_years || selectedResume?.parsed_data?.experience_years || 1} Yrs
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-center px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 shadow-sm">
                    <span className={`text-3xl font-black ${isShortlisted ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                      {currentScore}%
                    </span>
                    <span className="block text-[10px] uppercase font-bold text-slate-400 mt-0.5">Composite Score</span>
                  </div>
                </div>
              </Card>

              {/* 4-FACTOR DETERMINISTIC SCORING BREAKDOWN */}
              <Card className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    4-Factor Transparent Scoring Breakdown
                  </h4>
                  <span className="text-xs text-slate-400">Deterministic Formula</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Skills (40%)</span>
                    <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                      {breakdown.skills_score} / {breakdown.skills_max || 40}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Experience (30%)</span>
                    <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                      {breakdown.experience_score} / {breakdown.experience_max || 30}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Education (20%)</span>
                    <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                      {breakdown.education_score} / {breakdown.education_max || 20}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Format (10%)</span>
                    <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                      {breakdown.format_score} / {breakdown.format_max || 10}
                    </span>
                  </div>
                </div>
              </Card>

              {/* TARGET JOB MATCH & SKILLS GAP ANALYSIS (Scenario A vs Scenario B) */}
              {hasJdComparison ? (
                <Card className="space-y-4 border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/20 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Target Job Alignment & Skills Gap Analysis
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Real-time keyword comparison against your pasted circular
                        </p>
                      </div>
                    </div>
                    <Badge variant="primary" size="sm">
                      Role Specific Match
                    </Badge>
                  </div>

                  {/* Matched Keywords & Skills */}
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Matched Keywords & Skills ({matchedSkills.length})
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {matchedSkills.length > 0 ? (
                        matchedSkills.map((skill, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs"
                          >
                            <Check className="w-3 h-3 text-emerald-500" />
                            {skill}
                          </span>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                          No direct keyword overlap found from the target requirements.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Missing Critical Skills / Gap Analysis */}
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      Missing Critical Skills & Gap Analysis ({missingSkills.length})
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {missingSkills.length > 0 ? (
                        missingSkills.map((skill, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shadow-2xs"
                          >
                            <X className="w-3 h-3 text-rose-500" />
                            {skill}
                          </span>
                        ))
                      ) : (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          ✓ No critical skill gaps identified. Candidate CV strongly satisfies the target criteria!
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ) : (
                /* Scenario B Fallback Banner */
                <div className="p-3.5 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/20 flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">Want tailored ATS matching & gap analysis?</span> Paste any job description in the box above and click <span className="font-medium underline decoration-indigo-400">"Analyze Active Resume vs JD"</span> to identify matched keywords, critical skill gaps, and custom tailoring advice.
                  </div>
                </div>
              )}

              {/* Skills Inventory Card */}
              <Card className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Skills Inventory ({selectedResume?.parsed_data?.skills?.length || 0})</span>
                  <span className="text-xs font-normal text-slate-400">Stage 2 AI Entity Extraction</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(selectedResume?.parsed_data?.skills || []).map((skill, index) => (
                    <Badge key={index} variant="primary" size="md">
                      {skill}
                    </Badge>
                  ))}
                  {(!selectedResume?.parsed_data?.skills || selectedResume?.parsed_data?.skills.length === 0) && (
                    <p className="text-xs text-slate-400 italic">No technology keywords identified.</p>
                  )}
                </div>
              </Card>

              {/* Recommendations */}
              {analysis && (
                <Card className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>
                      {hasJdComparison
                        ? 'Actionable Tailoring Recommendations for Target Job'
                        : 'AI Recommendations & Optimization'}
                    </span>
                    <span className="text-xs text-slate-400 font-normal">
                      {hasJdComparison ? 'Target Role Tailored' : 'General ATS Quality Audit'}
                    </span>
                  </h4>
                  <div className="space-y-2">
                    {analysis.recommendations?.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeUpload;
