import React from 'react';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

export default function ResumeTemplateModern({ data, innerRef }) {
  const {
    personal_info = {},
    summary = '',
    experiences = [],
    education = [],
    skills = {},
    projects = [],
    certifications = [],
  } = data;

  const techSkills = Array.isArray(skills.technical) ? skills.technical : [];
  const softSkills = Array.isArray(skills.soft) ? skills.soft : [];
  const toolSkills = Array.isArray(skills.tools) ? skills.tools : [];
  const languages = Array.isArray(skills.languages) ? skills.languages : [];

  return (
    <div
      ref={innerRef}
      id="resume-preview-document"
      className="w-full bg-white text-slate-900 font-sans p-8 sm:p-10 shadow-2xl rounded-sm box-border"
      style={{
        minHeight: '1122px', // Standard A4 ratio
        width: '100%',
        maxWidth: '794px',
        margin: '0 auto',
        boxSizing: 'border-box',
        color: '#1e293b',
      }}
    >
      {/* Header */}
      <div className="border-b-2 border-indigo-600 pb-5 mb-5 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
        <div className="text-center sm:text-left flex-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 uppercase">
            {personal_info.fullName || 'Candidate Name'}
          </h1>
          <p className="text-lg font-semibold text-indigo-600 mt-0.5">
            {personal_info.jobTitle || 'Target Professional Role'}
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 mt-3 text-xs text-slate-600">
            {personal_info.email && (
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-indigo-500" />
                {personal_info.email}
              </span>
            )}
            {personal_info.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-indigo-500" />
                {personal_info.phone}
              </span>
            )}
            {personal_info.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                {personal_info.location}
              </span>
            )}
            {personal_info.linkedin && (
              <span className="flex items-center gap-1">
                <Linkedin className="w-3.5 h-3.5 text-indigo-500" />
                {personal_info.linkedin.replace(/^https?:\/\//, '')}
              </span>
            )}
            {personal_info.github && (
              <span className="flex items-center gap-1">
                <Github className="w-3.5 h-3.5 text-indigo-500" />
                {personal_info.github.replace(/^https?:\/\//, '')}
              </span>
            )}
            {personal_info.portfolio && (
              <span className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                {personal_info.portfolio.replace(/^https?:\/\//, '')}
              </span>
            )}
          </div>
        </div>

        {personal_info.photoUrl && (
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-indigo-600 flex-shrink-0 bg-slate-100 shadow-sm">
            <img
              src={personal_info.photoUrl}
              alt={personal_info.fullName || 'Profile'}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column (Main Content - 2 cols) */}
        <div className="md:col-span-2 space-y-5">
          {/* Summary */}
          {summary && (
            <div>
              <h2 className="text-xs font-bold tracking-wider uppercase text-slate-800 border-b border-slate-200 pb-1 mb-2">
                Professional Summary
              </h2>
              <p className="text-xs leading-relaxed text-slate-700 text-justify">
                {summary}
              </p>
            </div>
          )}

          {/* Experience */}
          {experiences && experiences.length > 0 && (
            <div>
              <h2 className="text-xs font-bold tracking-wider uppercase text-slate-800 border-b border-slate-200 pb-1 mb-2.5">
                Work Experience
              </h2>
              <div className="space-y-3.5">
                {experiences.map((exp, idx) => (
                  <div key={idx} className="group">
                    <div className="flex justify-between items-baseline">
                      <h3 className="text-xs font-bold text-slate-900">
                        {exp.title || 'Role Title'}
                      </h3>
                      <span className="text-[11px] font-medium text-slate-500">
                        {exp.startDate || 'Start'} – {exp.endDate || 'Present'}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-indigo-600 mb-1">
                      {exp.company} {exp.location ? `• ${exp.location}` : ''}
                    </div>
                    {exp.description && (
                      <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-line">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Projects */}
          {projects && projects.length > 0 && (
            <div>
              <h2 className="text-xs font-bold tracking-wider uppercase text-slate-800 border-b border-slate-200 pb-1 mb-2.5">
                Projects
              </h2>
              <div className="space-y-3">
                {projects.map((proj, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between items-baseline">
                      <h3 className="text-xs font-bold text-slate-900">
                        {proj.title}
                      </h3>
                      {proj.link && (
                        <span className="text-[11px] text-indigo-600 truncate max-w-[150px]">
                          {proj.link.replace(/^https?:\/\//, '')}
                        </span>
                      )}
                    </div>
                    {proj.technologies && (
                      <p className="text-[11px] text-slate-500 italic mb-0.5">
                        Tech Stack: {proj.technologies}
                      </p>
                    )}
                    {proj.description && (
                      <p className="text-xs leading-relaxed text-slate-700">
                        {proj.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Sidebar - 1 col) */}
        <div className="space-y-5 border-t md:border-t-0 md:border-l md:border-slate-200 md:pl-5">
          {/* Skills */}
          <div>
            <h2 className="text-xs font-bold tracking-wider uppercase text-slate-800 border-b border-slate-200 pb-1 mb-2">
              Skills & Expertise
            </h2>

            {techSkills.length > 0 && (
              <div className="mb-3">
                <span className="text-[11px] font-semibold text-slate-600 uppercase block mb-1">
                  Technical
                </span>
                <div className="flex flex-wrap gap-1">
                  {techSkills.map((sk, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-slate-100 text-slate-800 text-[11px] font-medium rounded"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {toolSkills.length > 0 && (
              <div className="mb-3">
                <span className="text-[11px] font-semibold text-slate-600 uppercase block mb-1">
                  Tools & Platforms
                </span>
                <div className="flex flex-wrap gap-1">
                  {toolSkills.map((sk, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-slate-100 text-slate-800 text-[11px] font-medium rounded"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {softSkills.length > 0 && (
              <div className="mb-3">
                <span className="text-[11px] font-semibold text-slate-600 uppercase block mb-1">
                  Competencies
                </span>
                <div className="flex flex-wrap gap-1">
                  {softSkills.map((sk, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-medium rounded"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Education */}
          {education && education.length > 0 && (
            <div>
              <h2 className="text-xs font-bold tracking-wider uppercase text-slate-800 border-b border-slate-200 pb-1 mb-2">
                Education
              </h2>
              <div className="space-y-2.5">
                {education.map((edu, idx) => (
                  <div key={idx}>
                    <h3 className="text-xs font-bold text-slate-900 leading-tight">
                      {edu.degree || 'Degree'}
                    </h3>
                    <p className="text-[11px] text-slate-600">
                      {edu.institution || 'University'}
                    </p>
                    <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                      <span>{edu.year || ''}</span>
                      {edu.gpa && <span>GPA: {edu.gpa}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {certifications && certifications.length > 0 && (
            <div>
              <h2 className="text-xs font-bold tracking-wider uppercase text-slate-800 border-b border-slate-200 pb-1 mb-2">
                Certifications
              </h2>
              <div className="space-y-1.5">
                {certifications.map((c, idx) => (
                  <div key={idx} className="text-xs">
                    <p className="font-semibold text-slate-900">
                      {typeof c === 'string' ? c : c.name || c.title}
                    </p>
                    {c.issuer && (
                      <p className="text-[10px] text-slate-500">
                        {c.issuer} {c.year ? `• ${c.year}` : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {languages && languages.length > 0 && (
            <div>
              <h2 className="text-xs font-bold tracking-wider uppercase text-slate-800 border-b border-slate-200 pb-1 mb-2">
                Languages
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {languages.map((lang, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] rounded"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
