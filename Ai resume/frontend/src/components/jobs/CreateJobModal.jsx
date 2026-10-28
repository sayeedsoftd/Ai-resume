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
} from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { jobService } from '../../services/jobService';

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
  const [salaryRange, setSalaryRange] = useState('$80,000 - $110,000');

  // 1. Passing Score Benchmark (%) (min: 40, max: 100, default: 70)
  const [passingScore, setPassingScore] = useState(70);

  // 2. Stage-2 Manual Assessment Toggle
  const [hasManualStage, setHasManualStage] = useState(false);

  // 3. Interactive Question Builder State
  const [manualQuestions, setManualQuestions] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
        setSalaryRange(initialData.salary_range || '$80,000 - $110,000');
        setPassingScore(
          initialData.passing_score !== undefined && initialData.passing_score !== null
            ? initialData.passing_score
            : 70
        );
        setHasManualStage(Boolean(initialData.has_manual_stage));

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
        setSalaryRange('$80,000 - $110,000');
        setPassingScore(70);
        setHasManualStage(false);
        setManualQuestions([]);
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

      // Structure manual_questions as both an array of objects and partitioned for maximum compatibility
      const payload = {
        title: title.trim(),
        company_name: companyName.trim(),
        description: description.trim(),
        required_skills: skillsArray,
        location: location.trim() || 'Remote',
        job_type: jobType,
        experience_level: experienceLevel,
        salary_range: salaryRange.trim(),
        passing_score: Number(passingScore) || 70,
        has_manual_stage: Boolean(hasManualStage),
        manual_questions: hasManualStage ? manualQuestions : null,
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Job Type
            </label>
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="CONTRACT">Contract</option>
              <option value="REMOTE">Remote</option>
              <option value="INTERNSHIP">Internship</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Experience Level
            </label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ENTRY">Entry Level</option>
              <option value="MID">Mid Level</option>
              <option value="SENIOR">Senior Level</option>
              <option value="LEAD">Lead / Architect</option>
            </select>
          </div>

          <Input
            label="Salary Range"
            value={salaryRange}
            onChange={(e) => setSalaryRange(e.target.value)}
            placeholder="e.g. $80,000 - $110,000"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Job Description & Responsibilities *
          </label>
          <textarea
            required
            rows={3}
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
                Enable Recruiter Stage-2 Manual Assessment for Shortlisted Candidates
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
