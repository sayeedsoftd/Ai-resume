import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Mail,
  User,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

const AuthPage = ({ initialTab = 'login' }) => {
  const [tab, setTab] = useState(initialTab);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, googleLogin } = useAuth();

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectAfterAuth = (user) => {
    const searchParams = new URLSearchParams(location.search);
    const redirectParam = searchParams.get('redirect');
    const from = location.state?.from?.pathname || redirectParam;
    if (from) {
      navigate(from, { replace: true });
      return;
    }
    if (user?.role === 'SUPER_ADMIN') {
      navigate('/admin');
    } else if (user?.role === 'RECRUITER') {
      navigate('/recruiter');
    } else {
      navigate('/dashboard');
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      redirectAfterAuth(user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const user = await register({
        full_name: fullName,
        email,
        password,
      });
      redirectAfterAuth(user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignInMock = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      // Create a deterministic JWT mock or use GIS token for demonstration
      const mockPayload = {
        email: email || 'google.candidate@example.com',
        full_name: fullName || 'Google Verified Candidate',
      };
      
      // In development, passes Google Auth payload to backend
      const devGoogleToken = btoa(JSON.stringify(mockPayload));
      const user = await googleLogin(devGoogleToken);
      redirectAfterAuth(user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Google sign-in could not be completed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-8">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Visual Branding Panel */}
        <div className="lg:col-span-6 space-y-6 hidden lg:block pr-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
            <Sparkles className="w-3.5 h-3.5" /> Next-Gen Career Matching Engine
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Step into the future of{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
              AI Resume Matching
            </span>
          </h1>

          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Upload your resume, unlock deep ATS compatibility scoring, verify your identity with KYC badges, and apply for positions with instant alignment diagnostics.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Multi-factor ATS scoring against actual job descriptions</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
              <span>KYC Identity Verification badge for candidate authenticity</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <TrendingUp className="w-4 h-4 text-purple-500 shrink-0" />
              <span>Curated learning roadmaps for detected skill gaps</span>
            </div>
          </div>
        </div>

        {/* Right Form Container */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <Card className="shadow-xl dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-6 sm:p-8">
            {/* Tab Navigation */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setError('');
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  tab === 'login'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('register');
                  setError('');
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  tab === 'register'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            {/* Google Sign-In Button */}
            <button
              type="button"
              disabled={googleLoading || loading}
              onClick={handleGoogleSignInMock}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-all mb-4 focus:outline-none"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{googleLoading ? 'Signing in with Google...' : 'Continue with Google'}</span>
            </button>

            <div className="relative flex py-2 items-center mb-4">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] text-slate-400 uppercase font-semibold">
                Or with email
              </span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            </div>

            {/* TAB: LOGIN */}
            {tab === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <Input
                  id="login-email"
                  label="Email Address"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <Input
                  id="login-password"
                  label="Password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
                  Sign In <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </form>
            ) : (
              /* TAB: REGISTER */
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <Input
                  id="reg-name"
                  label="Full Name"
                  type="text"
                  required
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />

                <Input
                  id="reg-email"
                  label="Email Address"
                  type="email"
                  required
                  placeholder="candidate@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <Input
                  id="reg-password"
                  label="Password"
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <Input
                  id="reg-confirm-password"
                  label="Confirm Password"
                  type="password"
                  required
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />

                <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
                  Create Free Account <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
