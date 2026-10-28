import React, { useState, useEffect, useRef } from 'react';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import {
  User,
  Camera,
  Plus,
  Trash2,
  Download,
  Save,
  CheckCircle2,
  GraduationCap,
  Briefcase,
  Award,
  Link as LinkIcon,
  Phone,
  MapPin,
  Printer,
  Sparkles,
} from 'lucide-react';

const Profile = () => {
  const { user, refreshUser, isVerified } = useAuth();
  const fileInputRef = useRef(null);

  // Profile data state
  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  // Contact details
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [portfolio, setPortfolio] = useState('');

  // Education list
  const [education, setEducation] = useState([
    { degree: '', institution: '', passingYear: '', result: '' },
  ]);

  // Experience list
  const [experience, setExperience] = useState([
    { title: '', company: '', duration: '', responsibilities: '' },
  ]);

  // Skills & Certifications
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [certifications, setCertifications] = useState([
    { name: '', issuer: '', year: '' },
  ]);

  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [isCVModalOpen, setIsCVModalOpen] = useState(false);

  // Load existing profile from backend
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await authService.getProfile();
        setFullName(data.full_name || user?.full_name || '');
        setHeadline(data.headline || '');
        setBio(data.bio || '');
        setPhotoUrl(data.photo_url || '');

        const contact = data.contact_info || {};
        setPhone(contact.phone || '');
        setAddress(contact.address || '');
        setLinkedin(contact.linkedin || '');
        setPortfolio(contact.portfolio || '');

        if (Array.isArray(data.education) && data.education.length > 0) {
          setEducation(data.education);
        }
        if (Array.isArray(data.experience) && data.experience.length > 0) {
          setExperience(data.experience);
        }
        if (Array.isArray(data.skills)) {
          setSkills(data.skills);
        }
        if (Array.isArray(data.certifications) && data.certifications.length > 0) {
          setCertifications(data.certifications);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    };
    fetchProfile();
  }, [user]);

  // Photo upload handler
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const res = await authService.uploadPhoto(file);
      setPhotoUrl(res.photo_url);
      setMsg({ text: 'Profile picture updated successfully.', type: 'success' });
      refreshUser();
    } catch (err) {
      setMsg({ text: err.response?.data?.detail || 'Photo upload failed.', type: 'error' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Education list handlers
  const handleAddEducation = () => {
    setEducation([...education, { degree: '', institution: '', passingYear: '', result: '' }]);
  };
  const handleRemoveEducation = (index) => {
    setEducation(education.filter((_, i) => i !== index));
  };
  const handleEducationChange = (index, field, value) => {
    const updated = [...education];
    updated[index][field] = value;
    setEducation(updated);
  };

  // Experience list handlers
  const handleAddExperience = () => {
    setExperience([...experience, { title: '', company: '', duration: '', responsibilities: '' }]);
  };
  const handleRemoveExperience = (index) => {
    setExperience(experience.filter((_, i) => i !== index));
  };
  const handleExperienceChange = (index, field, value) => {
    const updated = [...experience];
    updated[index][field] = value;
    setExperience(updated);
  };

  // Certifications list handlers
  const handleAddCert = () => {
    setCertifications([...certifications, { name: '', issuer: '', year: '' }]);
  };
  const handleRemoveCert = (index) => {
    setCertifications(certifications.filter((_, i) => i !== index));
  };
  const handleCertChange = (index, field, value) => {
    const updated = [...certifications];
    updated[index][field] = value;
    setCertifications(updated);
  };

  // Skills tag handlers
  const handleAddSkill = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = skillInput.trim().replace(/^,+|,+$/g, '');
      if (trimmed && !skills.includes(trimmed)) {
        setSkills([...skills, trimmed]);
        setSkillInput('');
      }
    }
  };
  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  // Save profile submit
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });

    try {
      const payload = {
        full_name: fullName,
        headline,
        bio,
        contact_info: {
          phone,
          address,
          linkedin,
          portfolio,
        },
        education: education.filter((e) => e.degree || e.institution),
        experience: experience.filter((e) => e.title || e.company),
        skills,
        certifications: certifications.filter((c) => c.name),
      };

      await authService.updateProfile(payload);
      setMsg({ text: 'Profile information saved successfully!', type: 'success' });
      refreshUser();
    } catch (err) {
      setMsg({
        text: err.response?.data?.detail || 'Failed to save profile.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Formal Profile & CV Builder
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Structured biographical and professional credential records for automated ATS matching.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsCVModalOpen(true)}
            className="border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Generate & Download Formal CV
          </Button>
        </div>
      </div>

      {msg.text && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Section 1: Avatar & Basic Information */}
        <Card className="space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Personal Information
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar Photo Preview */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shadow-sm">
                {photoUrl ? (
                  <img
                    src={photoUrl.startsWith('http') ? photoUrl : `http://localhost:8000${photoUrl}`}
                    alt="Profile Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-slate-400" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute inset-0 bg-slate-950/60 text-white rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] font-bold transition-opacity"
              >
                <Camera className="w-4 h-4 mb-0.5" />
                {uploadingPhoto ? 'Uploading...' : 'Change'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            <div className="flex-1 w-full space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Shakib Al Hasan"
                />
                <Input
                  label="Professional Headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Lead Software Engineer | React & Python"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Professional Summary / Bio
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Briefly state your core expertise, career journey, and passion..."
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Section 2: Contact & Online Links */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Phone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Contact & Social Channels
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="WhatsApp / Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+880 1712-345678"
            />
            <Input
              label="Address / Current City"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Dhaka, Bangladesh"
            />
            <Input
              label="LinkedIn Profile URL"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="https://linkedin.com/in/username"
            />
            <Input
              label="Portfolio / GitHub URL"
              value={portfolio}
              onChange={(e) => setPortfolio(e.target.value)}
              placeholder="https://github.com/username"
            />
          </div>
        </Card>

        {/* Section 3: Educational Background */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Education History (BDJobs Standard)
              </h2>
            </div>
            <Button size="sm" variant="outline" onClick={handleAddEducation}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Degree
            </Button>
          </div>

          <div className="space-y-4">
            {education.map((edu, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-3 relative group"
              >
                {education.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveEducation(idx)}
                    className="absolute top-3 right-3 text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Degree / Certificate"
                    value={edu.degree}
                    onChange={(e) => handleEducationChange(idx, 'degree', e.target.value)}
                    placeholder="e.g. B.Sc in Computer Science & Engineering"
                  />
                  <Input
                    label="Institution / University"
                    value={edu.institution}
                    onChange={(e) => handleEducationChange(idx, 'institution', e.target.value)}
                    placeholder="e.g. Bangladesh University of Engineering & Technology"
                  />
                  <Input
                    label="Passing Year"
                    value={edu.passingYear}
                    onChange={(e) => handleEducationChange(idx, 'passingYear', e.target.value)}
                    placeholder="e.g. 2023"
                  />
                  <Input
                    label="Result / CGPA"
                    value={edu.result}
                    onChange={(e) => handleEducationChange(idx, 'result', e.target.value)}
                    placeholder="e.g. CGPA 3.85 out of 4.00"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Section 4: Professional Experience */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Work Experience
              </h2>
            </div>
            <Button size="sm" variant="outline" onClick={handleAddExperience}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Position
            </Button>
          </div>

          <div className="space-y-4">
            {experience.map((exp, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-3 relative group"
              >
                {experience.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveExperience(idx)}
                    className="absolute top-3 right-3 text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Job Title"
                    value={exp.title}
                    onChange={(e) => handleExperienceChange(idx, 'title', e.target.value)}
                    placeholder="e.g. Senior Software Engineer"
                  />
                  <Input
                    label="Company Name"
                    value={exp.company}
                    onChange={(e) => handleExperienceChange(idx, 'company', e.target.value)}
                    placeholder="e.g. Brain Station 23 / Chaldal"
                  />
                </div>
                <Input
                  label="Duration / Span"
                  value={exp.duration}
                  onChange={(e) => handleExperienceChange(idx, 'duration', e.target.value)}
                  placeholder="e.g. Jan 2021 - Present"
                />
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Key Responsibilities & Impact
                  </label>
                  <textarea
                    rows={2}
                    value={exp.responsibilities}
                    onChange={(e) => handleExperienceChange(idx, 'responsibilities', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Led backend microservices migration, reduced query latency by 35%..."
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Section 5: Skills Tags & Certifications */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Skills Tags & Certifications
            </h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Technical Competencies (Press Enter or Comma to add tag)
            </label>
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleAddSkill}
              className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Python, FastAPI, React, Docker, MySQL..."
            />
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {skills.map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:text-rose-600 font-bold ml-0.5"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* Submit Save Button */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" variant="primary" loading={loading} size="lg">
            <Save className="w-4 h-4 mr-2" /> Save Profile Details
          </Button>
        </div>
      </form>

      {/* Formal CV Print / Download Modal */}
      <Modal
        isOpen={isCVModalOpen}
        onClose={() => setIsCVModalOpen(false)}
        title="Formal Curriculum Vitae (Printable Preview)"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-6 text-slate-800 dark:text-slate-100 text-xs p-2">
          {/* Print Action Bar */}
          <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-3 rounded-xl print:hidden">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Ready for export or high-resolution PDF printing
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.print()}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Printer className="w-4 h-4 mr-1.5" /> Print / Save as PDF
            </Button>
          </div>

          {/* Printable Formal CV Sheet */}
          <div className="bg-white text-slate-900 p-8 rounded-xl border border-slate-200 shadow-sm space-y-6 font-sans">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">
                  {fullName || 'Candidate Name'}
                </h1>
                <p className="text-sm font-semibold text-indigo-700 mt-1">
                  {headline || 'Software Professional'}
                </p>
                <div className="flex flex-wrap gap-3 text-[11px] text-slate-600 mt-3">
                  {phone && <span>📞 {phone}</span>}
                  {address && <span>📍 {address}</span>}
                  {linkedin && <span>🔗 {linkedin}</span>}
                  {portfolio && <span>🌐 {portfolio}</span>}
                </div>
              </div>

              {photoUrl && (
                <img
                  src={photoUrl.startsWith('http') ? photoUrl : `http://localhost:8000${photoUrl}`}
                  alt="Candidate"
                  className="w-20 h-20 rounded-xl object-cover border border-slate-300"
                />
              )}
            </div>

            {/* Bio / Summary */}
            {bio && (
              <div className="space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                  Professional Profile
                </h3>
                <p className="text-slate-700 text-xs leading-relaxed pt-1">{bio}</p>
              </div>
            )}

            {/* Experience */}
            {experience.some((e) => e.title) && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                  Experience History
                </h3>
                {experience.map((exp, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>{exp.title} &bull; {exp.company}</span>
                      <span className="text-[11px] text-slate-500">{exp.duration}</span>
                    </div>
                    {exp.responsibilities && (
                      <p className="text-slate-600 text-[11px] pl-2 border-l-2 border-indigo-200">
                        {exp.responsibilities}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Education */}
            {education.some((e) => e.degree) && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                  Academic Background
                </h3>
                {education.map((edu, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{edu.degree}</p>
                      <p className="text-slate-600 text-[11px]">{edu.institution}</p>
                    </div>
                    <div className="text-right text-[11px] text-slate-500">
                      <span>{edu.passingYear}</span>
                      {edu.result && <p className="font-medium text-slate-700">{edu.result}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Skills */}
            {skills.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                  Key Technical Competencies
                </h3>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {skills.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-semibold"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Profile;
