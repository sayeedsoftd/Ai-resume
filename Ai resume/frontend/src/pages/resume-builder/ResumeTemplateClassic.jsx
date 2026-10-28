import React from 'react';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

export default function ResumeTemplateClassic({ data, innerRef }) {
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

  const allSkillsList = [...techSkills, ...toolSkills, ...softSkills];

  return (
    <div
      ref={innerRef}
      id="resume-preview-document"
      className="w-full bg-white text-slate-900 font-serif p-8 sm:p-12 shadow-2xl rounded-sm box-border"
      style={{
        minHeight: '1122px',
        width: '100%',
        maxWidth: '794px',
        margin: '0 auto',
        boxSizing: 'border-box',
        color: '#111827',
      }}
    >
      {/* Centered Classic Header */}
      <div className="text-center pb-4 mb-4 border-b border-slate-900">
        <h1 className="text-3xl font-bold tracking-normal uppercase text-slate-900">
          {personal_info.fullName || 'Candidate Name'}
        </h1>
        <p className="text-sm font-semibold tracking-wide uppercase text-slate-700 mt-1">
          {personal_info.jobTitle || 'Professional Title'}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-700 font-sans">
          {personal_info.location && <span>{personal_info.location}</span>}
          {personal_info.phone && <span>• {personal_info.phone}</span>}
          {personal_info.email && <span>• {personal_info.email}</span>}
          {personal_info.linkedin && (
            <span>• {personal_info.linkedin.replace(/^https?:\/\//, '')}</span>
          )}
          {personal_info.github && (
            <span>• {personal_info.github.replace(/^https?:\/\//, '')}</span>
          )}
          {personal_info.portfolio && (
            <span>• {personal_info.portfolio.replace(/^https?:\/\//, '')}</span>
          )}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-4">
          <h2 className="text-xs font-bold tracking-widest uppercase border-b border-slate-300 pb-0.5 mb-1.5 font-sans">
            Executive Summary
          </h2>
          <p className="text-xs leading-relaxed text-slate-800 text-justify font-sans">
            {summary}
          </p>
        </div>
      )}

      {/* Experience */}
      {experiences && experiences.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xs font-bold tracking-widest uppercase border-b border-slate-300 pb-0.5 mb-2 font-sans">
            Professional Experience
          </h2>
          <div className="space-y-3 font-sans">
            {experiences.map((exp, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-slate-900">
                    {exp.title} – <span className="font-semibold italic text-slate-700">{exp.company}</span>
                  </span>
                  <span className="text-[11px] text-slate-600 font-medium">
                    {exp.startDate} – {exp.endDate || 'Present'}
                  </span>
                </div>
                {exp.location && (
                  <p className="text-[11px] text-slate-500 italic mb-0.5">{exp.location}</p>
                )}
                {exp.description && (
                  <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-line mt-1">
                    {exp.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {education && education.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xs font-bold tracking-widest uppercase border-b border-slate-300 pb-0.5 mb-2 font-sans">
            Education & Academic Credentials
          </h2>
          <div className="space-y-2 font-sans">
            {education.map((edu, idx) => (
              <div key={idx} className="flex justify-between items-baseline">
                <div>
                  <span className="text-xs font-bold text-slate-900">{edu.degree}</span>
                  <span className="text-xs text-slate-700">, {edu.institution}</span>
                  {edu.gpa && <span className="text-[11px] text-slate-600"> (GPA: {edu.gpa})</span>}
                </div>
                <span className="text-[11px] text-slate-600">{edu.year}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {allSkillsList.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xs font-bold tracking-widest uppercase border-b border-slate-300 pb-0.5 mb-1.5 font-sans">
            Skills & Competencies
          </h2>
          <div className="text-xs leading-relaxed text-slate-800 font-sans">
            {techSkills.length > 0 && (
              <p className="mb-1">
                <strong className="font-semibold text-slate-900">Technical Skills: </strong>
                {techSkills.join(', ')}
              </p>
            )}
            {toolSkills.length > 0 && (
              <p className="mb-1">
                <strong className="font-semibold text-slate-900">Tools & Technologies: </strong>
                {toolSkills.join(', ')}
              </p>
            )}
            {softSkills.length > 0 && (
              <p className="mb-1">
                <strong className="font-semibold text-slate-900">Professional Competencies: </strong>
                {softSkills.join(', ')}
              </p>
            )}
            {languages.length > 0 && (
              <p>
                <strong className="font-semibold text-slate-900">Languages: </strong>
                {languages.join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Key Projects */}
      {projects && projects.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xs font-bold tracking-widest uppercase border-b border-slate-300 pb-0.5 mb-2 font-sans">
            Key Projects
          </h2>
          <div className="space-y-2 font-sans">
            {projects.map((proj, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-slate-900">{proj.title}</span>
                  {proj.technologies && (
                    <span className="text-[11px] italic text-slate-600">
                      [{proj.technologies}]
                    </span>
                  )}
                </div>
                {proj.description && (
                  <p className="text-xs text-slate-700 leading-relaxed mt-0.5">
                    {proj.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {certifications && certifications.length > 0 && (
        <div className="mb-3">
          <h2 className="text-xs font-bold tracking-widest uppercase border-b border-slate-300 pb-0.5 mb-1.5 font-sans">
            Certifications
          </h2>
          <div className="text-xs text-slate-700 font-sans space-y-1">
            {certifications.map((c, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{typeof c === 'string' ? c : c.name || c.title}</span>
                {c.issuer && <span className="text-[11px] text-slate-500">{c.issuer}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
