import React, { useState } from 'react';
import {
  Github,
  Sparkles,
  ExternalLink,
  Check,
  Star,
  GitFork,
  Code2,
  RefreshCw,
  CheckCircle2,
  X,
  Layers,
  FileCode,
  ArrowRight,
} from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { githubSyncService } from '../../services/githubSyncService';

export default function GitHubSyncModal({ isOpen, onClose, onApplyToProfile, currentSkills = [] }) {
  const [usernameInput, setUsernameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [syncResult, setSyncResult] = useState(null);
  const [selectedSkills, setSelectedSkills] = useState([]);

  if (!isOpen) return null;

  const handleFetch = async (e) => {
    if (e) e.preventDefault();
    const target = usernameInput.trim();
    if (!target) {
      setErrorMsg('Please enter a GitHub username or profile link.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Fetch and enrich via backend Gemini service
      const data = await githubSyncService.syncGitHub(target, false);
      setSyncResult(data);
      setSelectedSkills(data.extracted_skills || []);
    } catch (err) {
      console.error('GitHub sync error:', err);
      setErrorMsg(
        err.response?.data?.detail ||
          'Failed to sync with GitHub. Please check the username or profile URL and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSkill = (skill) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleSelectAllSkills = () => {
    if (syncResult?.extracted_skills) {
      setSelectedSkills(syncResult.extracted_skills);
    }
  };

  const handleDeselectAllSkills = () => {
    setSelectedSkills([]);
  };

  const handleApply = () => {
    if (!syncResult) return;

    const payload = {
      headline: syncResult.headline,
      bio: syncResult.bio,
      skills: selectedSkills,
      avatar_url: syncResult.avatar_url,
      profile_url: syncResult.profile_url,
      featured_projects: syncResult.featured_projects || [],
      raw_stats: syncResult.raw_stats || {},
      username: syncResult.username,
    };

    if (onApplyToProfile) {
      onApplyToProfile(payload);
    }
    onClose();
  };

  const handleReset = () => {
    setSyncResult(null);
    setErrorMsg('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
            <Github className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              1-Click GitHub Profile Auto-Sync
              <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Gemini Pro AI
              </span>
            </h3>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Step 1: Input GitHub Username / Profile URL */}
        {!syncResult ? (
          <form onSubmit={handleFetch} className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-indigo-500/30 space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Zero Manual Data Entry
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Enter your GitHub handle or full profile URL. Our Gemini Pro AI pipeline scans your repositories, detects language proficiencies, highlights your top 3 projects, and crafts an impactful 3-sentence engineering biography.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                GitHub Username or Profile URL *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Github className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="e.g. sayeedsoftd or https://github.com/sayeedsoftd"
                  disabled={loading}
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Public profile data only. No GitHub password or OAuth token required.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-medium border border-rose-200 dark:border-rose-900 flex items-start gap-2">
                <X className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading || !usernameInput.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing GitHub with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>⚡ Fetch & Auto-Populate Profile</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          /* Step 2: Real-Time Preview and Customization Step */
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Developer Card Summary */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <img
                  src={syncResult.avatar_url || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'}
                  alt={syncResult.username}
                  className="w-14 h-14 rounded-2xl border-2 border-indigo-500 object-cover shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-white">
                      {syncResult.raw_stats?.name || syncResult.username}
                    </h4>
                    <a
                      href={syncResult.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 font-mono"
                    >
                      @{syncResult.username} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  {syncResult.raw_stats?.location && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      📍 {syncResult.raw_stats.location}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats Counters */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 flex items-center gap-1.5 font-bold">
                  <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                  {syncResult.raw_stats?.public_repos || 0} Repos
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 flex items-center gap-1.5 font-bold text-amber-300">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  {syncResult.raw_stats?.total_stars || 0} Stars
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 flex items-center gap-1.5 font-bold text-indigo-300">
                  <GitFork className="w-3.5 h-3.5 text-indigo-400" />
                  {syncResult.raw_stats?.total_forks || 0} Forks
                </span>
              </div>
            </div>

            {/* Dominant Languages Detected */}
            {syncResult.raw_stats?.detected_languages?.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-2">
                  Detected Languages & Core Stacks:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {syncResult.raw_stats.detected_languages.map((lang) => (
                    <span
                      key={lang}
                      className="px-2.5 py-0.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* AI Generated Headline */}
            <div className="p-3.5 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800/80 space-y-1">
              <span className="text-[11px] font-bold text-cyan-800 dark:text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                Synthesized Professional Headline
              </span>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {syncResult.headline}
              </p>
            </div>

            {/* AI Generated 3-Sentence Engineering Bio */}
            <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/80 space-y-1">
              <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                3-Sentence Engineering Biography
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                "{syncResult.bio}"
              </p>
            </div>

            {/* Extracted Verified Technical Skills (Togglable) */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  Extracted Technical Skills ({selectedSkills.length} selected)
                </span>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={handleSelectAllSkills}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">&bull;</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllSkills}
                    className="text-slate-500 hover:underline font-semibold"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {syncResult.extracted_skills?.map((skill) => {
                  const isChecked = selectedSkills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => handleToggleSkill(skill)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-500 text-white shadow-xs scale-[1.02]'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {isChecked ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-400 dark:border-slate-500" />
                      )}
                      <span>{skill}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Top 3 Featured Projects */}
            {syncResult.featured_projects?.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-indigo-500" />
                  Top 3 Featured Repositories
                </span>
                <div className="grid grid-cols-1 gap-2.5">
                  {syncResult.featured_projects.map((proj, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                          {proj.name}
                        </h5>
                        {proj.url && (
                          <a
                            href={proj.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                          >
                            View on GitHub <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        {proj.description}
                      </p>
                      {proj.tech_stack?.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {proj.tech_stack.map((t) => (
                            <span
                              key={t}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Modal Actions */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="secondary" size="sm" onClick={handleReset}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Change Username
              </Button>

              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleApply}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>✨ Apply to Profile & Auto-Fill</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
