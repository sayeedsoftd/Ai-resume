import React, { useMemo } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function ResumeAtsOptimizer({ data }) {
  const { personal_info = {}, summary = '', experiences = [], education = [], skills = {} } = data;

  const techSkills = Array.isArray(skills.technical) ? skills.technical : [];
  const softSkills = Array.isArray(skills.soft) ? skills.soft : [];
  const toolSkills = Array.isArray(skills.tools) ? skills.tools : [];
  const totalSkillsCount = techSkills.length + softSkills.length + toolSkills.length;

  const analysis = useMemo(() => {
    let score = 25; // Parsable base
    const checks = [];

    // 1. Contact Information
    const hasEmail = Boolean(personal_info.email);
    const hasPhone = Boolean(personal_info.phone);
    const hasName = Boolean(personal_info.fullName);
    if (hasName && hasEmail && hasPhone) {
      score += 20;
      checks.push({
        title: 'Full Contact Details',
        passed: true,
        desc: 'Name, email, and phone detected for recruiter outreach.',
      });
    } else {
      checks.push({
        title: 'Incomplete Contact Details',
        passed: false,
        desc: 'Ensure full name, email address, and phone number are provided.',
      });
    }

    // 2. Summary
    if (summary && summary.trim().length > 80) {
      score += 15;
      checks.push({
        title: 'Executive Summary',
        passed: true,
        desc: 'Well-structured objective detected.',
      });
    } else {
      checks.push({
        title: 'Weak Summary',
        passed: false,
        desc: 'Write 3-4 sentences summarizing your core strengths.',
      });
    }

    // 3. Work Experience
    if (experiences.length >= 1) {
      score += 20;
      const hasBulletDesc = experiences.some((e) => e.description && e.description.length > 50);
      if (hasBulletDesc) score += 5;
      checks.push({
        title: 'Work Experience Entries',
        passed: true,
        desc: `${experiences.length} positions recorded with detail.`,
      });
    } else {
      checks.push({
        title: 'No Work Experience Recorded',
        passed: false,
        desc: 'Add past jobs, internships, or freelance roles.',
      });
    }

    // 4. Skills Density
    if (totalSkillsCount >= 8) {
      score += 15;
      checks.push({
        title: 'Strong Skill Keyword Density',
        passed: true,
        desc: `${totalSkillsCount} distinct technical & functional skills tagged.`,
      });
    } else if (totalSkillsCount >= 4) {
      score += 8;
      checks.push({
        title: 'Moderate Skill Density',
        passed: true,
        desc: `${totalSkillsCount} skills tagged. Aim for 8+ for higher ATS index matching.`,
      });
    } else {
      checks.push({
        title: 'Low Skill Count',
        passed: false,
        desc: 'Add more relevant technologies, frameworks, and tools.',
      });
    }

    // Cap score at 100
    const finalScore = Math.min(100, Math.round(score));
    return { score: finalScore, checks };
  }, [personal_info, summary, experiences, education, totalSkillsCount]);

  const getScoreColor = (sc) => {
    if (sc >= 80) return 'text-emerald-500 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30';
    if (sc >= 60) return 'text-amber-500 border-amber-500 bg-amber-50 dark:bg-amber-950/30';
    return 'text-rose-500 border-rose-500 bg-rose-50 dark:bg-rose-950/30';
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Live ATS Readability
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Heuristic compatibility against enterprise parser bots
            </p>
          </div>
        </div>

        <div
          className={`flex items-center justify-center w-12 h-12 rounded-full border-2 font-black text-sm ${getScoreColor(
            analysis.score
          )}`}
        >
          {analysis.score}%
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            analysis.score >= 80
              ? 'bg-emerald-500'
              : analysis.score >= 60
              ? 'bg-amber-500'
              : 'bg-rose-500'
          }`}
          style={{ width: `${analysis.score}%` }}
        />
      </div>

      {/* Breakdown Checklist */}
      <div className="space-y-2 pt-1">
        {analysis.checks.map((c, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2 text-xs"
          >
            {c.passed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <span
                className={`font-semibold ${
                  c.passed
                    ? 'text-slate-800 dark:text-slate-200'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {c.title}
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
