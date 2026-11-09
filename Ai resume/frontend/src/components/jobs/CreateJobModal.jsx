import React, { useState, useEffect } from 'react';
import {
  X,
  PlusCircle,
  Trash2,
  HelpCircle,
  CheckCircle2,
  Sparkles,
  Sliders,
  FileQuestion,
  Edit3,
  Wand2,
  RefreshCw,
} from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { jobService } from '../../services/jobService';
import AISmartJobDescriptionAssistant from './AISmartJobDescriptionAssistant';

export default function CreateJobModal({
  isOpen,
  onClose,
  onJobCreated,
  initialData = null,
}) {
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [location, setLocation] = useState('Remote');
  const [jobType, setJobType] = useState('FULL_TIME');
  const [experienceLevel, setExperienceLevel] = useState('MID');
  const [salaryRange, setSalaryRange] = useState('৳40,000 - ৳60,000');

  // BDjobs-style Industry Categorization, Workplace Type, and Salary Range
  const [category, setCategory] = useState('Software Engineering');
  const [workplaceType, setWorkplaceType] = useState('ON_SITE'); // 'ON_SITE' | 'REMOTE' | 'HYBRID'
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');
  const [isSalaryNegotiable, setIsSalaryNegotiable] = useState(false);
  const [experienceYearsRequired, setExperienceYearsRequired] = useState(0);

  // 1. Passing Score Benchmark (%) (min: 40, max: 100, default: 70)
  const [passingScore, setPassingScore] = useState(70);

  // 2. Stage-2 Manual Assessment Toggle
  const [hasManualStage, setHasManualStage] = useState(false);

  // 3. Interactive Question Builder State
  const [manualQuestions, setManualQuestions] = useState([]);

  // 4. Anti-Ghosting Hiring SLA Tracking
  const [slaReviewDays, setSlaReviewDays] = useState(5);
  const [slaGuaranteeEnabled, setSlaGuaranteeEnabled] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDraftingJD, setIsDraftingJD] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title || '');
        setCompanyName(initialData.company_name || '');
        setDescription(initialData.description || '');
        setRequiredSkills(
          Array.isArray(initialData.required_skills)
            ? initialData.required_skills.join(', ')
            : initialData.required_skills || ''
        );
        setLocation(initialData.location || 'Remote');
        setJobType(initialData.job_type || 'FULL_TIME');
        setExperienceLevel(initialData.experience_level || 'MID');
        setSalaryRange(initialData.salary_range || '৳40,000 - ৳60,000');
        setCategory(initialData.category || 'Software Engineering');
        setWorkplaceType(initialData.workplace_type || 'ON_SITE');
        setMinSalary(initialData.min_salary !== undefined && initialData.min_salary !== null ? String(initialData.min_salary) : '');
        setMaxSalary(initialData.max_salary !== undefined && initialData.max_salary !== null ? String(initialData.max_salary) : '');
        setIsSalaryNegotiable(Boolean(initialData.is_salary_negotiable));
        setExperienceYearsRequired(initialData.experience_years_required || 0);
        setPassingScore(
          initialData.passing_score !== undefined && initialData.passing_score !== null
            ? initialData.passing_score
            : 70
        );
        setHasManualStage(Boolean(initialData.has_manual_stage));
        setSlaReviewDays(initialData.sla_review_days !== undefined && initialData.sla_review_days !== null ? initialData.sla_review_days : 5);
        setSlaGuaranteeEnabled(initialData.sla_guarantee_enabled !== undefined ? Boolean(initialData.sla_guarantee_enabled) : true);

        const mq = initialData.manual_questions;
        if (Array.isArray(mq)) {
          setManualQuestions(mq);
        } else if (mq && typeof mq === 'object') {
          const formatted = [
            ...(mq.mcqs || []).map((m) => ({ ...m, type: 'MCQ' })),
            ...(mq.written || []).map((w) => ({ ...w, type: 'WRITTEN' })),
          ];
          setManualQuestions(formatted);
        } else {
          setManualQuestions([]);
        }
      } else {
        // Reset defaults
        setTitle('');
        setCompanyName('');
        setDescription('');
        setRequiredSkills('');
        setLocation('Remote');
        setJobType('FULL_TIME');
        setExperienceLevel('MID');
        setSalaryRange('৳40,000 - ৳60,000');
        setCategory('Software Engineering');
        setWorkplaceType('ON_SITE');
        setMinSalary('');
        setMaxSalary('');
        setIsSalaryNegotiable(false);
        setExperienceYearsRequired(0);
        setPassingScore(70);
        setHasManualStage(false);
        setManualQuestions([]);
        setSlaReviewDays(5);
        setSlaGuaranteeEnabled(true);
      }
      setErrorMsg('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  // Add MCQ Question (Max 10)
  const handleAddMCQ = () => {
    const currentCount = manualQuestions.filter((q) => q.type === 'MCQ').length;
    if (currentCount >= 10) return;
    const newMCQ = {
      id: Date.now() + Math.random(),
      type: 'MCQ',
      question: '',
      options: ['', '', '', ''],
      correct_option: 'A',
    };
    setManualQuestions((prev) => [...prev, newMCQ]);
  };

  // Add Written Question (Max 5)
  const handleAddWritten = () => {
    const currentCount = manualQuestions.filter((q) => q.type === 'WRITTEN').length;
    if (currentCount >= 5) return;
    const newWritten = {
      id: Date.now() + Math.random(),
      type: 'WRITTEN',
      question: '',
      instructions: '',
    };
    setManualQuestions((prev) => [...prev, newWritten]);
  };

  // Remove Question
  const handleRemoveQuestion = (id) => {
    setManualQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // Update MCQ Field
  const handleUpdateMCQField = (id, field, value) => {
    setManualQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  // Update MCQ Option Text
  const handleUpdateMCQOption = (id, optIndex, value) => {
    setManualQuestions((prev) =>
      prev.map((q) => {
        if (q.id === id) {
          const updatedOptions = [...q.options];
          updatedOptions[optIndex] = value;
          return { ...q, options: updatedOptions };
        }
        return q;
      })
    );
  };

  // Update Written Field
  const handleUpdateWrittenField = (id, field, value) => {
    setManualQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  // AI Job Description Auto-Draft Handler
  const handleAutoDraftJD = async () => {
    const targetTitle = (title || '').trim();
    const targetSkills = (requiredSkills || '').trim();
    const effectiveTitle = targetTitle || targetSkills;

    if (!effectiveTitle) {
      alert('Please enter a Job Title or Required Skills (e.g. "Ai/LLm") before generating with AI.');
      return;
    }

    if (!title && targetSkills) {
      setTitle(targetSkills);
    }

    setIsDraftingJD(true);
    setErrorMsg('');
    try {
      const payload = {
        job_title: effectiveTitle,
        keywords: targetSkills || undefined,
        experience_level: experienceLevel || 'MID',
        industry: category || 'Software Engineering',
        workplace_type: workplaceType || 'ON_SITE',
        tone: 'Professional',
      };

      const result = await jobService.generateAIJobDescription(payload);

      const existingSkills = targetSkills
        ? targetSkills.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const newSkills = (result.required_skills || []).filter(
        (ns) => !existingSkills.some((es) => es.toLowerCase() === ns.toLowerCase())
      );
      const mergedSkills = [...existingSkills, ...newSkills].join(', ');

      const formattedDesc =
        result.full_formatted_description || result.role_overview || '';

      setDescription(formattedDesc);
      if (mergedSkills) setRequiredSkills(mergedSkills);
      if (!title && result.job_title) setTitle(result.job_title);
      if (!minSalary && result.recommended_min_salary) {
        setMinSalary(String(Math.round(result.recommended_min_salary)));
      }
      if (!maxSalary && result.recommended_max_salary) {
        setMaxSalary(String(Math.round(result.recommended_max_salary)));
      }
      if (!experienceYearsRequired && result.experience_years) {
        setExperienceYearsRequired(result.experience_years);
      }
    } catch (err) {
      console.error('AI Draft failed:', err);
      setErrorMsg(
        err.response?.data?.detail ||
          'Failed to auto-draft job description with Gemini AI. Please check inputs and retry.'
      );
    } finally {
      setIsDraftingJD(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim() || !companyName.trim() || !description.trim()) {
      setErrorMsg('Please fill in all required job fields.');
      return;
    }

    if (hasManualStage && manualQuestions.length === 0) {
      setErrorMsg(
        'You enabled Stage-2 Manual Assessment. Please add at least 1 MCQ or Written question, or disable the toggle.'
      );
      return;
    }

    // Validate MCQs if manual stage is on
    if (hasManualStage) {
      for (const q of manualQuestions) {
        if (!q.question.trim()) {
          setErrorMsg('All questions must have question prompt text.');
          return;
        }
        if (q.type === 'MCQ') {
          const emptyOpts = (q.options || []).filter((opt) => !opt.trim());
          if (emptyOpts.length > 0) {
            setErrorMsg('All 4 MCQ options (A, B, C, D) must be provided.');
            return;
          }
        }
      }
    }

    setSubmitting(true);
    try {
      const skillsArray = requiredSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      // Format salary range display
      let formattedSalary = salaryRange.trim();
      if (isSalaryNegotiable && !minSalary) {
        formattedSalary = 'Negotiable';
      } else if (minSalary && maxSalary) {
        formattedSalary = `৳${Number(minSalary).toLocaleString()} - ৳${Number(maxSalary).toLocaleString()}`;
      } else if (minSalary) {
        formattedSalary = `৳${Number(minSalary).toLocaleString()}+`;
      }

      // Structure manual_questions as both an array of objects and partitioned for maximum compatibility
      const payload = {
        title: title.trim(),
        company_name: companyName.trim(),
        description: description.trim(),
        required_skills: skillsArray,
        location: location.trim() || (workplaceType === 'REMOTE' ? 'Remote' : 'Dhaka, Bangladesh'),
        job_type: jobType,
        experience_level: experienceLevel,
        salary_range: formattedSalary || 'Negotiable',
        category: category || 'Software Engineering',
        workplace_type: workplaceType || 'ON_SITE',
        min_salary: minSalary ? parseFloat(minSalary) : null,
        max_salary: maxSalary ? parseFloat(maxSalary) : null,
        is_salary_negotiable: Boolean(isSalaryNegotiable),
        experience_years_required: parseInt(experienceYearsRequired, 10) || 0,
        passing_score: Number(passingScore) || 70,
        has_manual_stage: Boolean(hasManualStage),
        manual_questions: hasManualStage ? manualQuestions : null,
        sla_review_days: parseInt(slaReviewDays, 10) || 5,
        sla_guarantee_enabled: Boolean(slaGuaranteeEnabled),
        is_active: true,
      };

      let result;
      if (initialData?.id) {
        result = await jobService.updateJob(initialData.id, payload);
      } else {
        result = await jobService.createJob(payload);
      }

      if (onJobCreated) {
        onJobCreated(result);
      }
      onClose();
    } catch (err) {
      console.error('Job save error:', err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to save job opening.');
    } finally {
      setSubmitting(false);
    }
  };

  // Compute counts and capacity limits
  const totalMCQs = manualQuestions.filter((q) => q.type === 'MCQ').length;
  const totalWritten = manualQuestions.filter((q) => q.type === 'WRITTEN').length;
  const isMCQLimitReached = totalMCQs >= 10;
  const isWrittenLimitReached = totalWritten >= 5;
  const totalQuestions = manualQuestions.length;

  let mcqRenderIndex = 0;
  let writtenRenderIndex = 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData?.id ? 'Edit Job Listing & Assessment' : 'Create New Job Listing'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
        {/* ✨ 1-Click AI Job Description Generator & Optimizer */}
        <AISmartJobDescriptionAssistant
          jobTitle={title}
          skills={requiredSkills}
          experienceLevel={experienceLevel}
          category={category}
          workplaceType={workplaceType}
          onApplyGenerated={(gen) => {
            if (gen.title) setTitle(gen.title);
            if (gen.description) setDescription(gen.description);
            if (gen.required_skills) {
              setRequiredSkills(
                Array.isArray(gen.required_skills)
                  ? gen.required_skills.join(', ')
                  : gen.required_skills
              );
            }
            if (gen.experience_years_required !== undefined) {
              setExperienceYearsRequired(gen.experience_years_required);
            }
            if (gen.min_salary) setMinSalary(String(gen.min_salary));
            if (gen.max_salary) setMaxSalary(String(gen.max_salary));
            if (gen.salary_range) setSalaryRange(gen.salary_range);
            if (gen.experience_level) setExperienceLevel(gen.experience_level);
            if (gen.workplace_type) setWorkplaceType(gen.workplace_type);
          }}
        />

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-600 dark:text-rose-400">
            {errorMsg}
          </div>
        )}

        <Input
          label="Job Title *"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Senior Backend Engineer"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Company Name *"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Acme Tech Solutions"
          />
          <Input
            label="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Dhaka, Bangladesh (or Remote)"
          />
        </div>

        {/* BDjobs-style Industry Categorization & Workplace Model */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Job Category / Industry *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Software Engineering">Software Engineering</option>
              <option value="AI / Machine Learning">AI / Machine Learning</option>
              <option value="Data Science & Analytics">Data Science & Analytics</option>
              <option value="UI/UX & Product Design">UI/UX & Product Design</option>
              <option value="Quality Assurance & Testing">Quality Assurance & Testing</option>
              <option value="DevOps & Cloud Engineering">DevOps & Cloud Engineering</option>
              <option value="Mobile App Development">Mobile App Development</option>
              <option value="Cybersecurity & Networking">Cybersecurity & Networking</option>
              <option value="Product & Project Management">Product & Project Management</option>
              <option value="Database Administration">Database Administration</option>
              <option value="IT & Tech Support">IT & Tech Support</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Workplace Model *
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200 dark:bg-slate-800 rounded-xl">
              {[
                { id: 'ON_SITE', label: 'On-site' },
                { id: 'REMOTE', label: 'Remote' },
                { id: 'HYBRID', label: 'Hybrid' },
              ].map((wp) => (
                <button
                  type="button"
                  key={wp.id}
                  onClick={() => setWorkplaceType(wp.id)}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    workplaceType === wp.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-300/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  {wp.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Salary Range & Experience Required */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Salary Specification (৳ BDT)
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={isSalaryNegotiable}
                onChange={(e) => setIsSalaryNegotiable(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-semibold text-slate-700 dark:text-slate-300">Negotiable Salary</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Min Monthly Salary (৳)
              </label>
              <input
                type="number"
                placeholder="e.g. 30000"
                value={minSalary}
                onChange={(e) => setMinSalary(e.target.value)}
                disabled={isSalaryNegotiable && !minSalary}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Max Monthly Salary (৳)
              </label>
              <input
                type="number"
                placeholder="e.g. 50000"
                value={maxSalary}
                onChange={(e) => setMaxSalary(e.target.value)}
                disabled={isSalaryNegotiable && !minSalary}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Min Experience (Years)
              </label>
              <input
                type="number"
                min="0"
                max="25"
                placeholder="0 for freshers"
                value={experienceYearsRequired}
                onChange={(e) => setExperienceYearsRequired(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Employment Schedule / Job Type
            </label>
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="CONTRACT">Contract</option>
              <option value="INTERNSHIP">Internship</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Seniority Level
            </label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ENTRY">Entry Level / Junior</option>
              <option value="MID">Mid Level</option>
              <option value="SENIOR">Senior Level</option>
              <option value="LEAD">Lead / Architect / Director</option>
            </select>
          </div>
        </div>

        {/* Candidate Review SLA Commitment (Anti-Ghosting) */}
        <div className="p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-950/20 my-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
              <span>🛡️ Review SLA Commitment (Anti-Ghosting Guarantee)</span>
            </label>
            <span className="text-[10px] text-cyan-400 font-mono">Guaranteed review deadline</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "⚡ 3 Days (Fast-Track)", val: 3 },
              { label: "⏱️ 5 Days (Standard)", val: 5 },
              { label: "📅 7 Days (Extended)", val: 7 },
            ].map((option) => (
              <button
                key={option.val}
                type="button"
                onClick={() => setSlaReviewDays(option.val)}
                className={`py-2 px-2 text-xs rounded-lg border font-medium transition flex items-center justify-center cursor-pointer ${
                  (slaReviewDays || 5) === option.val
                    ? "bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-md shadow-cyan-500/20"
                    : "bg-slate-900/80 border-slate-700 text-slate-300 hover:border-cyan-500/50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Candidates will see an active countdown timer on their dashboard ensuring decisions are delivered within this timeframe.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Job Description & Responsibilities *
            </label>
            <button
              type="button"
              onClick={handleAutoDraftJD}
              disabled={isDraftingJD}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline cursor-pointer disabled:opacity-50"
              title="Auto-draft description from Job Title and Skills"
            >
              {isDraftingJD ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Drafting with Gemini...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>🪄 Generate from Title & Skills</span>
                </>
              )}
            </button>
          </div>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Key responsibilities, technical stacks, and team expectations..."
          />
        </div>

        <Input
          label="Required Skills (Comma separated) *"
          required
          value={requiredSkills}
          onChange={(e) => setRequiredSkills(e.target.value)}
          placeholder="e.g. Python, FastAPI, MySQL, Docker, React"
        />

        {/* 1. Passing Score Input (Below Required Skills) */}
        <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-1.5">
          <label className="block text-xs font-bold text-slate-900 dark:text-white">
            Screening Passing Score Benchmark (%) *
          </label>
          <input
            type="number"
            min="40"
            max="100"
            value={passingScore}
            onChange={(e) => setPassingScore(e.target.value)}
            required
            className="w-36 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Candidates scoring below this on the AI screening test will be marked as Failed.
          </p>
        </div>

        {/* 2. Stage-2 Manual Assessment Toggle */}
        <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <label
                htmlFor="stage2-toggle"
                className="text-xs font-bold text-slate-900 dark:text-white block cursor-pointer"
              >
                Enable Stage-2 Custom Manual Assessment for Shortlisted Candidates
              </label>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                If enabled, shortlisted candidates must complete your custom questions before the final interview.
              </p>
            </div>
            <input
              id="stage2-toggle"
              type="checkbox"
              checked={hasManualStage}
              onChange={(e) => setHasManualStage(e.target.checked)}
              className="w-5 h-5 accent-purple-600 rounded cursor-pointer mt-0.5 shrink-0"
            />
          </div>

          {/* 3. Interactive Question Builder (Shown only when toggle is enabled) */}
          {hasManualStage && (
            <div className="space-y-4 pt-3 border-t border-purple-200 dark:border-purple-800">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    Total Stage-2 Questions: {totalQuestions} / 15
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isMCQLimitReached
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200'
                    }`}
                  >
                    MCQs ({totalMCQs}/10)
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isWrittenLimitReached
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                        : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200'
                    }`}
                  >
                    Written ({totalWritten}/5)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddMCQ}
                    disabled={isMCQLimitReached}
                    title={isMCQLimitReached ? 'Maximum 10 MCQs allowed' : 'Add custom MCQ'}
                    className={`text-[11px] py-1 px-2.5 font-bold flex items-center gap-1 transition-all ${
                      isMCQLimitReached
                        ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                        : 'text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/40'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Add MCQ Question
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddWritten}
                    disabled={isWrittenLimitReached}
                    title={isWrittenLimitReached ? 'Maximum 5 Written questions allowed' : 'Add custom written question'}
                    className={`text-[11px] py-1 px-2.5 font-bold flex items-center gap-1 transition-all ${
                      isWrittenLimitReached
                        ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                        : 'text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Add Written Question
                  </Button>
                </div>
              </div>

              {manualQuestions.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-900/50 rounded-xl border border-dashed border-purple-200 dark:border-purple-800">
                  No questions added yet. Click <strong>"Add MCQ Question"</strong> or <strong>"Add Written Question"</strong> above to author your test.
                </div>
              ) : (
                <div className="space-y-3">
                  {manualQuestions.map((q) => {
                    if (q.type === 'MCQ') {
                      mcqRenderIndex += 1;
                      const badgeLabel = `MCQ ${mcqRenderIndex}`;
                      return (
                        <div
                          key={q.id}
                          className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/80 space-y-3 shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200">
                              {badgeLabel}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(q.id)}
                              className="text-rose-500 hover:text-rose-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Question Text *
                            </label>
                            <input
                              type="text"
                              value={q.question}
                              onChange={(e) =>
                                handleUpdateMCQField(q.id, 'question', e.target.value)
                              }
                              placeholder="e.g. Which HTTP status code represents a resource creation?"
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                              required
                            />
                          </div>

                          {/* 4 Options (A, B, C, D) */}
                          <div className="space-y-1.5">
                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                              4 Options (A, B, C, D) & Select Correct Option *
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {['A', 'B', 'C', 'D'].map((optKey, optIdx) => (
                                <div key={optKey} className="flex items-center gap-1.5">
                                  <label
                                    className={`w-6 h-6 rounded text-[10px] font-black flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                                      q.correct_option === optKey
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                                    }`}
                                    title={`Mark Option ${optKey} as correct`}
                                  >
                                    <input
                                      type="radio"
                                      name={`correct-opt-${q.id}`}
                                      checked={q.correct_option === optKey}
                                      onChange={() =>
                                        handleUpdateMCQField(q.id, 'correct_option', optKey)
                                      }
                                      className="sr-only"
                                    />
                                    {optKey}
                                  </label>
                                  <input
                                    type="text"
                                    value={q.options[optIdx] || ''}
                                    onChange={(e) =>
                                      handleUpdateMCQOption(q.id, optIdx, e.target.value)
                                    }
                                    placeholder={`Option ${optKey}`}
                                    className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    required
                                  />
                                </div>
                              ))}
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block pt-0.5">
                              Click an option letter (A, B, C, D) to mark it as the single correct answer. Correct: <strong>Option {q.correct_option}</strong>.
                            </span>
                          </div>
                        </div>
                      );
                    } else {
                      writtenRenderIndex += 1;
                      const badgeLabel = `Written ${writtenRenderIndex}`;
                      return (
                        <div
                          key={q.id}
                          className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/80 space-y-2.5 shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200">
                              {badgeLabel}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(q.id)}
                              className="text-rose-500 hover:text-rose-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Question Prompt / Instructions *
                            </label>
                            <input
                              type="text"
                              value={q.question}
                              onChange={(e) =>
                                handleUpdateWrittenField(q.id, 'question', e.target.value)
                              }
                              placeholder="e.g. Describe your approach to handling database deadlocks in MySQL under high write load."
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Optional Guidelines / Evaluation Criteria
                            </label>
                            <textarea
                              rows={2}
                              value={q.instructions || ''}
                              onChange={(e) =>
                                handleUpdateWrittenField(q.id, 'instructions', e.target.value)
                              }
                              placeholder="e.g. Look for mentions of transaction isolation levels, indexing strategies, and retry logic..."
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            {submitting ? 'Publishing...' : initialData?.id ? 'Update Job Listing' : 'Publish Job Listing'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
