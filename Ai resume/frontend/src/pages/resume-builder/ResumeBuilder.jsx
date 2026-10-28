import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Save,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileDown,
  Layout,
  CheckCircle,
  Sparkles,
  RefreshCw,
  Printer,
  ChevronDown,
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { resumeService } from '../../services/resumeService';
import ResumeFormWizard from './ResumeFormWizard';
import ResumeTemplateModern from './ResumeTemplateModern';
import ResumeTemplateClassic from './ResumeTemplateClassic';
import ResumeAtsOptimizer from './ResumeAtsOptimizer';

const DEFAULT_RESUME_DATA = {
  personal_info: {
    fullName: 'Abu Sayeed',
    jobTitle: 'Senior Full-Stack Software Engineer',
    email: 'abu.sayeed@example.com',
    phone: '+880 1712-345678',
    location: 'Dhaka, Bangladesh',
    photoUrl: '',
    linkedin: 'linkedin.com/in/abusayeed',
    github: 'github.com/abusayeed',
    portfolio: 'https://abusayeed.dev',
  },
  summary:
    'Dedicated and high-performing Full-Stack Engineer with 5+ years of experience architecting resilient distributed systems, modern web applications, and AI-enabled software solutions. Proficient in Python, FastAPI, React, MySQL, and cloud-native architecture.',
  experiences: [
    {
      title: 'Senior Software Engineer',
      company: 'Alpha Cloud Solutions',
      location: 'Dhaka (Hybrid)',
      startDate: 'Jan 2023',
      endDate: 'Present',
      description:
        '• Architected high-concurrency microservices processing 1M+ daily transactions with 99.98% uptime.\n• Spearheaded migration from legacy monolith to React, FastAPI, and Dockerized deployments.\n• Mentored 6 junior engineers and instituted automated CI/CD and rigorous code review guidelines.',
    },
    {
      title: 'Full-Stack Developer',
      company: 'FinTech Innovations Ltd',
      location: 'Dhaka',
      startDate: 'Jun 2021',
      endDate: 'Dec 2022',
      description:
        '• Designed and built secure payment gateway integrations handling sensitive customer data under PCI-DSS compliance.\n• Reduced frontend bundle load time by 42% through lazy loading, code-splitting, and memoization.',
    },
  ],
  education: [
    {
      degree: 'B.Sc. in Computer Science & Engineering',
      institution: 'University of Dhaka',
      year: '2021',
      gpa: '3.82 / 4.00',
    },
  ],
  skills: {
    technical: [
      'Python',
      'FastAPI',
      'React',
      'JavaScript',
      'TypeScript',
      'Node.js',
      'MySQL',
      'PostgreSQL',
      'Docker',
      'Tailwind CSS',
    ],
    tools: ['Git', 'Docker', 'Linux', 'AWS', 'Kubernetes', 'Postman', 'Figma'],
    soft: ['Agile / Scrum', 'System Architecture', 'Technical Mentorship', 'Problem Solving'],
    languages: ['English (Fluent / Professional)', 'Bengali (Native)'],
  },
  projects: [
    {
      title: 'AI Resume Analyzer & Job Match System',
      technologies: 'React, FastAPI, MySQL, PyTesseract, Tailwind CSS',
      link: 'https://github.com/abusayeed/ai-resume',
      description:
        'Engineered an enterprise recruitment platform featuring hybrid OCR text extraction, multi-factor ATS compatibility scoring, and real-time split-screen resume builder.',
    },
  ],
  certifications: [
    {
      name: 'AWS Certified Solutions Architect – Associate',
      issuer: 'Amazon Web Services',
      year: '2023',
    },
  ],
};

export default function ResumeBuilder() {
  const { user } = useAuth();
  const [resumeData, setResumeData] = useState(DEFAULT_RESUME_DATA);
  const [activeStep, setActiveStep] = useState(1);
  const [templateId, setTemplateId] = useState('modern'); // 'modern' | 'classic'
  const [zoomLevel, setZoomLevel] = useState(0.85); // 0.65 to 1.15
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const resumePrintRef = useRef(null);

  // Initialize candidate name & email from user context if available
  useEffect(() => {
    if (user) {
      setResumeData((prev) => ({
        ...prev,
        personal_info: {
          ...prev.personal_info,
          fullName: prev.personal_info.fullName || user.full_name || '',
          email: prev.personal_info.email || user.email || '',
        },
      }));
    }
  }, [user]);

  // Fetch structured profile data from Profile API (Instant Sync)
  const handleFetchProfile = async () => {
    setFetchingProfile(true);
    setErrorMessage('');
    try {
      const res = await authService.getProfile();
      if (res && res.profile) {
        const p = res.profile;
        const u = res.user || {};

        setResumeData((prev) => {
          const newPersonalInfo = {
            ...prev.personal_info,
            fullName: u.full_name || prev.personal_info.fullName,
            email: u.email || prev.personal_info.email,
            jobTitle: p.headline || prev.personal_info.jobTitle,
            photoUrl: p.photo_url || prev.personal_info.photoUrl,
          };

          if (p.contact_info) {
            newPersonalInfo.phone = p.contact_info.phone || newPersonalInfo.phone;
            newPersonalInfo.location = p.contact_info.location || newPersonalInfo.location;
            newPersonalInfo.linkedin = p.contact_info.linkedin || newPersonalInfo.linkedin;
            newPersonalInfo.github = p.contact_info.github || newPersonalInfo.github;
            newPersonalInfo.portfolio = p.contact_info.portfolio || newPersonalInfo.portfolio;
          }

          let newSkills = { ...prev.skills };
          if (Array.isArray(p.skills) && p.skills.length > 0) {
            newSkills.technical = p.skills;
          } else if (p.skills && typeof p.skills === 'object') {
            newSkills = { ...newSkills, ...p.skills };
          }

          return {
            ...prev,
            personal_info: newPersonalInfo,
            summary: p.bio || prev.summary,
            experiences:
              Array.isArray(p.experience) && p.experience.length > 0
                ? p.experience
                : prev.experiences,
            education:
              Array.isArray(p.education) && p.education.length > 0
                ? p.education
                : prev.education,
            skills: newSkills,
            certifications:
              Array.isArray(p.certifications) && p.certifications.length > 0
                ? p.certifications
                : prev.certifications,
          };
        });

        setSaveSuccessMessage('Successfully synced profile information!');
        setTimeout(() => setSaveSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setErrorMessage('Could not load profile data. Ensure your profile has been created.');
    } finally {
      setFetchingProfile(false);
    }
  };

  // AI Rephrase / Optimize Summary
  const handleOptimizeSummary = async () => {
    setOptimizing(true);
    setErrorMessage('');
    try {
      const techList = resumeData.skills.technical || [];
      const res = await resumeService.optimizeSummary({
        summary: resumeData.summary,
        jobTitle: resumeData.personal_info.jobTitle,
        skills: techList,
      });

      if (res && res.optimized) {
        setResumeData((prev) => ({
          ...prev,
          summary: res.optimized,
        }));
        setSaveSuccessMessage('Summary AI-optimized for ATS keywords!');
        setTimeout(() => setSaveSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.error('AI Optimize failed:', err);
      // Fallback client-side enhancement
      setResumeData((prev) => ({
        ...prev,
        summary: `Results-driven and strategic ${prev.personal_info.jobTitle || 'Professional'} with proven success architecting scalable software solutions and high-throughput systems. Spearheaded multiple high-impact features and accelerated sprint velocity. Core competencies include ${
          (prev.skills.technical || []).slice(0, 4).join(', ') || 'modern engineering best practices'
        }.`,
      }));
      setSaveSuccessMessage('Summary enhanced with strong action verbs!');
      setTimeout(() => setSaveSuccessMessage(''), 4000);
    } finally {
      setOptimizing(false);
    }
  };

  // Save Builder State into Backend as Active Resume
  const handleSaveResume = async () => {
    setSaving(true);
    setErrorMessage('');
    try {
      const payload = {
        title: `${resumeData.personal_info.fullName || 'User'} Resume`,
        personal_info: resumeData.personal_info,
        summary: resumeData.summary,
        experiences: resumeData.experiences,
        education: resumeData.education,
        skills: resumeData.skills,
        projects: resumeData.projects,
        certifications: resumeData.certifications,
        template_id: templateId,
        is_primary: true,
      };

      const res = await resumeService.saveBuilderResume(payload);
      setSaveSuccessMessage(
        `Resume saved! ID #${res.id} – ATS Score: ${res.ats_score}% (Automated job matching enqueued)`
      );
      setTimeout(() => setSaveSuccessMessage(''), 6000);
    } catch (err) {
      console.error('Save resume failed:', err);
      setErrorMessage(
        err.response?.data?.detail || 'Failed to save resume. Please ensure you are logged in.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Download PDF via html2pdf with high-resolution vector/canvas conversion
  const handleDownloadPdf = async () => {
    const element = resumePrintRef.current;
    if (!element) return;

    setExportingPdf(true);
    setErrorMessage('');

    const opt = {
      margin: 0,
      filename: `${(resumeData.personal_info.fullName || 'resume')
        .toLowerCase()
        .replace(/\s+/g, '_')}_cv.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    try {
      await html2pdf().set(opt).from(element).save();
      setSaveSuccessMessage('High-fidelity ATS resume PDF exported successfully!');
      setTimeout(() => setSaveSuccessMessage(''), 4000);
    } catch (err) {
      console.error('PDF export error:', err);
      // Fallback to window.print()
      window.print();
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Notifications / Alerts */}
      {saveSuccessMessage && (
        <div className="bg-emerald-600 text-white text-xs py-2 px-4 flex items-center justify-between shadow-md z-30 animate-fade-in">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4" />
            {saveSuccessMessage}
          </span>
          <button
            onClick={() => setSaveSuccessMessage('')}
            className="text-white/80 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-600 text-white text-xs py-2 px-4 flex items-center justify-between shadow-md z-30">
          <span className="font-medium">{errorMessage}</span>
          <button
            onClick={() => setErrorMessage('')}
            className="text-white/80 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Split-Screen Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* ================= LEFT PANE: 50% Multi-Step Form Wizard ================= */}
        <div className="w-full lg:w-1/2 h-full flex flex-col overflow-hidden bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
          <ResumeFormWizard
            data={resumeData}
            setData={setResumeData}
            activeStep={activeStep}
            setActiveStep={setActiveStep}
            onFetchProfile={handleFetchProfile}
            onOptimizeSummary={handleOptimizeSummary}
            onSaveResume={handleSaveResume}
            saving={saving}
            optimizing={optimizing}
            fetchingProfile={fetchingProfile}
          />
        </div>

        {/* ================= RIGHT PANE: 50% Sticky Live Resume Preview ================= */}
        <div className="w-full lg:w-1/2 h-full flex flex-col overflow-hidden bg-slate-200/70 dark:bg-slate-950/90">
          {/* Preview Toolbar */}
          <div className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 z-10">
            {/* Template Selector & Optimizer toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Template:
              </span>
              <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 text-xs font-medium">
                <button
                  onClick={() => setTemplateId('modern')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    templateId === 'modern'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Modern ATS
                </button>
                <button
                  onClick={() => setTemplateId('classic')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    templateId === 'classic'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Classic Single-Col
                </button>
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
              <button
                onClick={() => setZoomLevel((prev) => Math.max(0.55, prev - 0.1))}
                title="Zoom Out"
                className="p-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-10 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel((prev) => Math.min(1.2, prev + 0.1))}
                title="Zoom In"
                className="p-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(0.85)}
                title="Fit to Screen"
                className="p-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-l border-slate-200 dark:border-slate-700 ml-1 pl-1.5"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Export Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="hidden sm:flex items-center gap-1 text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={exportingPdf}
                className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                <FileDown className={`w-3.5 h-3.5 ${exportingPdf ? 'animate-bounce' : ''}`} />
                {exportingPdf ? 'Exporting PDF...' : 'Download PDF'}
              </Button>
            </div>
          </div>

          {/* Preview Workspace (Interactive Canvas) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center">
            {/* Real-time ATS Optimizer Score Card */}
            <div className="w-full max-w-[794px] mb-4">
              <ResumeAtsOptimizer data={resumeData} />
            </div>

            {/* A4 Document Container */}
            <div
              className="origin-top transition-transform duration-200 shadow-2xl mb-12"
              style={{
                transform: `scale(${zoomLevel})`,
                width: '794px', // A4 width at 96 DPI
              }}
            >
              {templateId === 'modern' ? (
                <ResumeTemplateModern
                  data={resumeData}
                  innerRef={resumePrintRef}
                />
              ) : (
                <ResumeTemplateClassic
                  data={resumeData}
                  innerRef={resumePrintRef}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
