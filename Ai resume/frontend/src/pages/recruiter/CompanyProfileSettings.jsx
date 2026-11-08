import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Globe,
  MapPin,
  Users,
  Camera,
  ExternalLink,
  Save,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Briefcase,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { companyService } from '../../services/companyService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import ErrorBoundary from '../../components/ui/ErrorBoundary';

export default function CompanyProfileSettings() {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    company_name: '',
    company_website: '',
    company_location: '',
    company_size: '11-50 employees',
    company_description: '',
    company_logo_url: '',
  });

  const [tradeLicenseVerified, setTradeLicenseVerified] = useState(false);
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    async function fetchCompany() {
      try {
        setLoading(true);
        const data = await companyService.getMyCompanyProfile();
        setFormData({
          company_name: data.company_name || '',
          company_website: data.company_website || '',
          company_location: data.company_location || '',
          company_size: data.company_size || '11-50 employees',
          company_description: data.company_description || '',
          company_logo_url: data.company_logo_url || '',
        });
        setTradeLicenseVerified(Boolean(data.trade_license_verified));
        setActiveJobsCount(Array.isArray(data.active_jobs) ? data.active_jobs.length : 0);
      } catch (err) {
        console.error('Failed to load company details:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchCompany();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingLogo(true);
      setMessage({ type: '', text: '' });
      const res = await companyService.uploadCompanyLogo(file);
      setFormData((prev) => ({ ...prev, company_logo_url: res.company_logo_url }));
      setMessage({ type: 'success', text: 'Company brand logo updated successfully!' });
      if (refreshUser) refreshUser();
    } catch (err) {
      console.error('Failed to upload logo:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to upload logo. Ensure image is under 5MB.',
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      const updated = await companyService.updateMyCompanyProfile(formData);
      setMessage({ type: 'success', text: 'Company employer branding profile saved successfully!' });
      if (refreshUser) refreshUser();
    } catch (err) {
      console.error('Failed to save company settings:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to save changes. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-500">Loading company profile...</p>
      </div>
    );
  }

  const livePublicUrl = `/company/${user?.id || 'preview'}`;

  return (
    <ErrorBoundary title="Company Settings Error">
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Header Strip with Live Preview Action */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg border border-indigo-900/40">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Employer Branding & Company Profile</h1>
              {tradeLicenseVerified && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified
                </span>
              )}
            </div>
            <p className="text-indigo-200 text-xs sm:text-sm mt-1">
              Customize how candidates experience your company mission, culture, and live technical vacancies.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to={livePublicUrl} target="_blank" rel="noopener noreferrer">
              <Button
                variant="secondary"
                size="sm"
                className="bg-white text-indigo-950 hover:bg-indigo-50 font-bold text-xs flex items-center gap-1.5 shadow-md"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Live Public Page
              </Button>
            </Link>
          </div>
        </div>

        {/* Message Banner */}
        {message.text && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Profile Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                Basic Organization Information
              </h3>

              <div className="space-y-4">
                {/* Company Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Company / Organization Name *
                  </label>
                  <Input
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    placeholder="e.g. OptiTech Dynamics Ltd."
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    This brand name appears on all your job requisitions and candidate communications.
                  </p>
                </div>

                {/* Location & Website */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Headquarters / Location
                    </label>
                    <div className="relative">
                      <Input
                        name="company_location"
                        value={formData.company_location}
                        onChange={handleChange}
                        placeholder="e.g. Dhaka, Bangladesh"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Official Website
                    </label>
                    <Input
                      name="company_website"
                      value={formData.company_website}
                      onChange={handleChange}
                      placeholder="https://optitech.io"
                    />
                  </div>
                </div>

                {/* Company Size */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Company Size
                  </label>
                  <select
                    name="company_size"
                    value={formData.company_size}
                    onChange={handleChange}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="1-10 employees">1-10 employees (Early Stage)</option>
                    <option value="11-50 employees">11-50 employees (Growing Startup)</option>
                    <option value="51-200 employees">51-200 employees (Scale-up)</option>
                    <option value="201-500 employees">201-500 employees (Mid-sized)</option>
                    <option value="500+ employees">500+ employees (Enterprise)</option>
                  </select>
                </div>

                {/* About & Mission */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    About Company & Culture (Employer Mission)
                  </label>
                  <textarea
                    name="company_description"
                    rows={5}
                    value={formData.company_description}
                    onChange={handleChange}
                    placeholder="Describe your company's mission, engineering culture, tech stack, and what makes your workplace exciting for candidates..."
                    className="w-full text-xs p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed"
                  />
                </div>
              </div>
            </Card>

            <div className="flex justify-end gap-3">
              <Button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md px-6 py-2.5"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Company Changes'}
              </Button>
            </div>
          </div>

          {/* Right 1 Col: Brand Assets & Preview Card */}
          <div className="space-y-6">
            {/* Logo Upload Card */}
            <Card>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-600" />
                Company Brand Logo
              </h3>

              <div className="flex flex-col items-center text-center p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div className="w-24 h-24 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center overflow-hidden mb-3">
                  {formData.company_logo_url ? (
                    <img
                      src={formData.company_logo_url}
                      alt="Brand Logo"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-2xl font-black">
                      {formData.company_name?.[0]?.toUpperCase() || 'C'}
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  className="hidden"
                />

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={uploadingLogo}
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs"
                >
                  <Camera className="w-3.5 h-3.5 mr-1" />
                  {uploadingLogo ? 'Uploading...' : 'Upload Brand Logo'}
                </Button>

                <p className="text-[11px] text-slate-400 mt-2">
                  PNG, JPG, or SVG. Recommended square 400x400px.
                </p>
              </div>
            </Card>

            {/* Quick Live Preview Card */}
            <Card>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Candidate View Preview
              </h3>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                    {formData.company_logo_url ? (
                      <img
                        src={formData.company_logo_url}
                        alt="Logo"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      formData.company_name?.[0]?.toUpperCase() || 'C'
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {formData.company_name || 'Your Company Name'}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {formData.company_location || 'Location pending'}
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  {formData.company_description || 'Your company description will appear here...'}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> {activeJobsCount} Active Jobs
                  </span>

                  <Link
                    to={livePublicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                  >
                    Open Page <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </Card>

            {/* Verification Status Card */}
            <Card>
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    tradeLicenseVerified
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {tradeLicenseVerified ? 'Verified Employer Badge' : 'Verification Required'}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {tradeLicenseVerified
                      ? 'Your Trade License is verified. Candidates see the green verified badge on all your jobs.'
                      : 'Upload your business Trade License to unlock the Verified Employer trust mark.'}
                  </p>
                </div>
              </div>

              {!tradeLicenseVerified && (
                <div className="mt-3">
                  <Link to="/kyc">
                    <Button size="sm" variant="outline" className="w-full text-xs">
                      Submit Trade License for KYC
                    </Button>
                  </Link>
                </div>
              )}
            </Card>
          </div>
        </form>
      </div>
    </ErrorBoundary>
  );
}
