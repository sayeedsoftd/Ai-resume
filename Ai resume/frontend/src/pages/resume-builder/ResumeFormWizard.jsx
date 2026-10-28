import React, { useState } from 'react';
import {
  User,
  FileText,
  Briefcase,
  GraduationCap,
  Sparkles,
  FolderGit2,
  Plus,
  Trash2,
  Wand2,
  ChevronRight,
  ChevronLeft,
  Download,
  Save,
  RefreshCw,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function ResumeFormWizard({
  data,
  setData,
  activeStep,
  setActiveStep,
  onFetchProfile,
  onOptimizeSummary,
  onSaveResume,
  saving,
  optimizing,
  fetchingProfile,
}) {
  const [skillInputs, setSkillInputs] = useState({
    technical: '',
    soft: '',
    tools: '',
    languages: '',
  });

  const steps = [
    { id: 1, label: 'Personal Details', icon: User },
    { id: 2, label: 'Summary & Objective', icon: FileText },
    { id: 3, label: 'Work Experience', icon: Briefcase },
    { id: 4, label: 'Education & Certs', icon: GraduationCap },
    { id: 5, label: 'Skills & Languages', icon: Sparkles },
    { id: 6, label: 'Projects & Links', icon: FolderGit2 },
  ];

  // Helper updates
  const updatePersonalInfo = (field, val) => {
    setData((prev) => ({
      ...prev,
      personal_info: {
        ...prev.personal_info,
        [field]: val,
      },
    }));
  };

  // Experience handlers
  const addExperience = () => {
    setData((prev) => ({
      ...prev,
      experiences: [
        ...prev.experiences,
        {
          title: '',
          company: '',
          location: '',
          startDate: '',
          endDate: '',
          description: '',
        },
      ],
    }));
  };

  const updateExperience = (index, field, val) => {
    setData((prev) => {
      const updated = [...prev.experiences];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, experiences: updated };
    });
  };

  const removeExperience = (index) => {
    setData((prev) => ({
      ...prev,
      experiences: prev.experiences.filter((_, i) => i !== index),
    }));
  };

  // Education handlers
  const addEducation = () => {
    setData((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        {
          degree: '',
          institution: '',
          year: '',
          gpa: '',
        },
      ],
    }));
  };

  const updateEducation = (index, field, val) => {
    setData((prev) => {
      const updated = [...prev.education];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, education: updated };
    });
  };

  const removeEducation = (index) => {
    setData((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  };

  // Certification handlers
  const addCertification = () => {
    setData((prev) => ({
      ...prev,
      certifications: [
        ...prev.certifications,
        { name: '', issuer: '', year: '' },
      ],
    }));
  };

  const updateCertification = (index, field, val) => {
    setData((prev) => {
      const updated = [...prev.certifications];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, certifications: updated };
    });
  };

  const removeCertification = (index) => {
    setData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }));
  };

  // Skill tag handlers
  const handleAddSkill = (category) => {
    const val = skillInputs[category].trim();
    if (!val) return;
    const currentList = Array.isArray(data.skills[category])
      ? data.skills[category]
      : [];
    if (!currentList.includes(val)) {
      setData((prev) => ({
        ...prev,
        skills: {
          ...prev.skills,
          [category]: [...currentList, val],
        },
      }));
    }
    setSkillInputs((prev) => ({ ...prev, [category]: '' }));
  };

  const handleRemoveSkill = (category, tag) => {
    setData((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        [category]: (prev.skills[category] || []).filter((s) => s !== tag),
      },
    }));
  };

  // Project handlers
  const addProject = () => {
    setData((prev) => ({
      ...prev,
      projects: [
        ...prev.projects,
        { title: '', technologies: '', link: '', description: '' },
      ],
    }));
  };

  const updateProject = (index, field, val) => {
    setData((prev) => {
      const updated = [...prev.projects];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, projects: updated };
    });
  };

  const removeProject = (index) => {
    setData((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      {/* Wizard Header Bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Resume Form Wizard
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Fill your details step-by-step or sync directly from profile.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onFetchProfile}
            disabled={fetchingProfile}
            className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetchingProfile ? 'animate-spin' : ''}`} />
            {fetchingProfile ? 'Syncing...' : 'Fetch from Profile'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onSaveResume}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Resume'}
          </Button>
        </div>
      </div>

      {/* Step Tabs Navigation */}
      <div className="flex overflow-x-auto scrollbar-none border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 gap-1.5">
        {steps.map((st) => {
          const Icon = st.icon;
          const isActive = activeStep === st.id;
          return (
            <button
              key={st.id}
              onClick={() => setActiveStep(st.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{st.label}</span>
            </button>
          );
        })}
      </div>

      {/* Wizard Form Body (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
        {/* STEP 1: Personal Details */}
        {activeStep === 1 && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Step 1: Personal Details & Contact
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ensure contact points are current so hiring managers can reach you.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                placeholder="e.g. John Doe"
                value={data.personal_info.fullName || ''}
                onChange={(e) => updatePersonalInfo('fullName', e.target.value)}
              />
              <Input
                label="Job Title / Headline"
                placeholder="e.g. Senior Full-Stack Engineer"
                value={data.personal_info.jobTitle || ''}
                onChange={(e) => updatePersonalInfo('jobTitle', e.target.value)}
              />
              <Input
                label="Email Address"
                type="email"
                placeholder="e.g. john@example.com"
                value={data.personal_info.email || ''}
                onChange={(e) => updatePersonalInfo('email', e.target.value)}
              />
              <Input
                label="Phone Number"
                placeholder="e.g. +880 1712 345678"
                value={data.personal_info.phone || ''}
                onChange={(e) => updatePersonalInfo('phone', e.target.value)}
              />
              <Input
                label="Location (City, Country)"
                placeholder="e.g. Dhaka, Bangladesh"
                value={data.personal_info.location || ''}
                onChange={(e) => updatePersonalInfo('location', e.target.value)}
              />
              <Input
                label="Photo URL (Optional)"
                placeholder="e.g. https://... or avatar"
                value={data.personal_info.photoUrl || ''}
                onChange={(e) => updatePersonalInfo('photoUrl', e.target.value)}
              />
              <Input
                label="LinkedIn Profile"
                placeholder="e.g. linkedin.com/in/johndoe"
                value={data.personal_info.linkedin || ''}
                onChange={(e) => updatePersonalInfo('linkedin', e.target.value)}
              />
              <Input
                label="GitHub Profile"
                placeholder="e.g. github.com/johndoe"
                value={data.personal_info.github || ''}
                onChange={(e) => updatePersonalInfo('github', e.target.value)}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Portfolio / Website URL"
                  placeholder="e.g. https://johndoe.dev"
                  value={data.personal_info.portfolio || ''}
                  onChange={(e) => updatePersonalInfo('portfolio', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Summary & Objective */}
        {activeStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Step 2: Professional Summary & Objective
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Highlight your experience, key strengths, and career objectives in 3-5 sentences.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={onOptimizeSummary}
                disabled={optimizing}
                className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              >
                <Wand2 className={`w-3.5 h-3.5 ${optimizing ? 'animate-spin' : ''}`} />
                {optimizing ? 'Optimizing...' : 'AI Rephrase / Optimize'}
              </Button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Summary Text
              </label>
              <textarea
                rows={6}
                value={data.summary || ''}
                onChange={(e) =>
                  setData((prev) => ({ ...prev, summary: e.target.value }))
                }
                placeholder="Results-driven Software Engineer with 4+ years of building robust full-stack applications with React, Node.js, and Python. Passionate about system scalability and intuitive user experiences..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed"
              />
            </div>

            <div className="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-lg p-3 text-xs text-indigo-800 dark:text-indigo-300 space-y-1">
              <p className="font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                ATS Optimization Tip:
              </p>
              <p className="text-[11px] leading-relaxed">
                Include strong action verbs (e.g. "Engineered", "Orchestrated", "Spearheaded") and measurable achievements (e.g. "boosted throughput by 30%").
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: Work Experience */}
        {activeStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Step 3: Work Experience
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  List your employment history in reverse chronological order.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addExperience}
                className="flex items-center gap-1 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Position
              </Button>
            </div>

            {data.experiences.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <Briefcase className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  No experience entries yet.
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3">
                  Click 'Add Position' to create your first work history card.
                </p>
                <Button size="sm" onClick={addExperience}>
                  Add Position
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {data.experiences.map((exp, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        Experience #{idx + 1}
                      </span>
                      <button
                        onClick={() => removeExperience(idx)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Job Title"
                        placeholder="e.g. Senior Software Engineer"
                        value={exp.title || ''}
                        onChange={(e) => updateExperience(idx, 'title', e.target.value)}
                      />
                      <Input
                        label="Company Name"
                        placeholder="e.g. Acme Tech Corp"
                        value={exp.company || ''}
                        onChange={(e) => updateExperience(idx, 'company', e.target.value)}
                      />
                      <Input
                        label="Start Date"
                        placeholder="e.g. Jan 2022"
                        value={exp.startDate || ''}
                        onChange={(e) => updateExperience(idx, 'startDate', e.target.value)}
                      />
                      <Input
                        label="End Date"
                        placeholder="e.g. Present or Dec 2024"
                        value={exp.endDate || ''}
                        onChange={(e) => updateExperience(idx, 'endDate', e.target.value)}
                      />
                      <div className="sm:col-span-2">
                        <Input
                          label="Location"
                          placeholder="e.g. Dhaka, Bangladesh (or Remote)"
                          value={exp.location || ''}
                          onChange={(e) => updateExperience(idx, 'location', e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Responsibilities & Impact
                      </label>
                      <textarea
                        rows={3}
                        value={exp.description || ''}
                        onChange={(e) =>
                          updateExperience(idx, 'description', e.target.value)
                        }
                        placeholder="• Architected microservices reducing API latency by 45%&#10;• Led team of 5 engineers delivering SaaS platform to 20k users"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Education & Certifications */}
        {activeStep === 4 && (
          <div className="space-y-6">
            {/* Education Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Education & Degrees
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Highest degree credentials and academic background.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addEducation}
                  className="flex items-center gap-1 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Degree
                </Button>
              </div>

              {data.education.map((edu, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5 relative"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      Degree #{idx + 1}
                    </span>
                    <button
                      onClick={() => removeEducation(idx)}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Input
                      label="Degree Title"
                      placeholder="e.g. B.Sc. in Computer Science"
                      value={edu.degree || ''}
                      onChange={(e) => updateEducation(idx, 'degree', e.target.value)}
                    />
                    <Input
                      label="School / University"
                      placeholder="e.g. University of Dhaka"
                      value={edu.institution || ''}
                      onChange={(e) => updateEducation(idx, 'institution', e.target.value)}
                    />
                    <Input
                      label="Graduation Year"
                      placeholder="e.g. 2021"
                      value={edu.year || ''}
                      onChange={(e) => updateEducation(idx, 'year', e.target.value)}
                    />
                    <Input
                      label="GPA / Result (Optional)"
                      placeholder="e.g. 3.85 / 4.00"
                      value={edu.gpa || ''}
                      onChange={(e) => updateEducation(idx, 'gpa', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Certifications Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Professional Certifications
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Industry licenses and verified credentials (AWS, Google, Cisco).
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCertification}
                  className="flex items-center gap-1 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Cert
                </Button>
              </div>

              {data.certifications.map((cert, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 grid grid-cols-1 sm:grid-cols-3 gap-2.5 relative items-center"
                >
                  <Input
                    label="Certificate Name"
                    placeholder="e.g. AWS Certified Solutions Architect"
                    value={cert.name || ''}
                    onChange={(e) => updateCertification(idx, 'name', e.target.value)}
                  />
                  <Input
                    label="Issuing Organization"
                    placeholder="e.g. Amazon Web Services"
                    value={cert.issuer || ''}
                    onChange={(e) => updateCertification(idx, 'issuer', e.target.value)}
                  />
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Input
                        label="Year"
                        placeholder="e.g. 2023"
                        value={cert.year || ''}
                        onChange={(e) => updateCertification(idx, 'year', e.target.value)}
                      />
                    </div>
                    <button
                      onClick={() => removeCertification(idx)}
                      className="p-2.5 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 5: Skills & Languages */}
        {activeStep === 5 && (
          <div className="space-y-5">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Step 5: Skills & Languages
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Categorize your competencies for high ATS semantic indexing score.
              </p>
            </div>

            {/* Technical Skills */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Technical Skills (Languages, Frameworks, DBs)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Python, React, FastAPI, Docker"
                  value={skillInputs.technical}
                  onChange={(e) =>
                    setSkillInputs((prev) => ({ ...prev, technical: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSkill('technical')}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Button size="sm" onClick={() => handleAddSkill('technical')}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(data.skills.technical || []).map((sk) => (
                  <span
                    key={sk}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-full"
                  >
                    {sk}
                    <button
                      onClick={() => handleRemoveSkill('technical', sk)}
                      className="hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Tools & Platforms */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Tools & Platforms (Git, AWS, Linux, Figma)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Git, Docker, Kubernetes, AWS"
                  value={skillInputs.tools}
                  onChange={(e) =>
                    setSkillInputs((prev) => ({ ...prev, tools: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSkill('tools')}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Button size="sm" onClick={() => handleAddSkill('tools')}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(data.skills.tools || []).map((sk) => (
                  <span
                    key={sk}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-full"
                  >
                    {sk}
                    <button
                      onClick={() => handleRemoveSkill('tools', sk)}
                      className="hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Soft Skills */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Soft Skills (Leadership, Agile, Communication)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Problem Solving, Team Leadership"
                  value={skillInputs.soft}
                  onChange={(e) =>
                    setSkillInputs((prev) => ({ ...prev, soft: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSkill('soft')}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Button size="sm" onClick={() => handleAddSkill('soft')}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(data.skills.soft || []).map((sk) => (
                  <span
                    key={sk}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded-full"
                  >
                    {sk}
                    <button
                      onClick={() => handleRemoveSkill('soft', sk)}
                      className="hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Spoken Languages
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. English (Fluent), Bengali (Native)"
                  value={skillInputs.languages}
                  onChange={(e) =>
                    setSkillInputs((prev) => ({ ...prev, languages: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSkill('languages')}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Button size="sm" onClick={() => handleAddSkill('languages')}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(data.skills.languages || []).map((lang) => (
                  <span
                    key={lang}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-full"
                  >
                    {lang}
                    <button
                      onClick={() => handleRemoveSkill('languages', lang)}
                      className="hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Projects & References */}
        {activeStep === 6 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Step 6: Featured Projects & Portfolio
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Showcase software repositories, live systems, or client deliverables.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addProject}
                className="flex items-center gap-1 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Project
              </Button>
            </div>

            {data.projects.map((proj, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3 relative"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    Project #{idx + 1}
                  </span>
                  <button
                    onClick={() => removeProject(idx)}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Project Title"
                    placeholder="e.g. AI Resume Analyzer & Job Match"
                    value={proj.title || ''}
                    onChange={(e) => updateProject(idx, 'title', e.target.value)}
                  />
                  <Input
                    label="Technologies Used"
                    placeholder="e.g. React, FastAPI, MySQL, Tailwind"
                    value={proj.technologies || ''}
                    onChange={(e) => updateProject(idx, 'technologies', e.target.value)}
                  />
                  <div className="sm:col-span-2">
                    <Input
                      label="Repository or Live Link"
                      placeholder="e.g. https://github.com/user/project"
                      value={proj.link || ''}
                      onChange={(e) => updateProject(idx, 'link', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Project Description
                  </label>
                  <textarea
                    rows={2}
                    value={proj.description || ''}
                    onChange={(e) => updateProject(idx, 'description', e.target.value)}
                    placeholder="Engineered an end-to-end resume parser with OCR and hybrid ATS semantic matching..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Wizard Footer Navigation Bar */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={activeStep === 1}
          onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
          className="flex items-center gap-1 text-xs"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Previous Step
        </Button>

        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Step {activeStep} of {steps.length}
        </span>

        {activeStep < steps.length ? (
          <Button
            size="sm"
            onClick={() => setActiveStep((prev) => Math.min(steps.length, prev + 1))}
            className="flex items-center gap-1 text-xs"
          >
            Next Step
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={onSaveResume}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Complete & Save
          </Button>
        )}
      </div>
    </div>
  );
}
