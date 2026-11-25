import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiX, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { authAPI } from '../lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const { login, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await login(email, password);
      toast.success(data.message || 'Login successful!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const res = await authAPI.forgotPassword(forgotEmail);
      toast.success(res.data.message || 'Password reset email sent!');
      setShowForgot(false);
      setForgotEmail('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send reset email');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* ===== LEFT: Illustration Panel ===== */}
      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden items-end justify-center"
        style={{ background: 'linear-gradient(160deg, #56CCF2 0%, #2F80ED 60%, #2D9CDB 100%)' }}
      >
        {/* Background decorative elements */}
        <div className="absolute inset-0">
          {/* Window frame lines */}
          <div className="absolute top-0 left-[15%] w-[2px] h-full bg-white/10" />
          <div className="absolute top-0 left-[55%] w-[2px] h-full bg-white/10 rotate-[4deg]" />
          <div className="absolute top-[10%] left-0 w-full h-[2px] bg-white/8" />
          {/* Light rays */}
          <div className="absolute top-0 left-0 w-[60%] h-full opacity-15"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 60%)' }}
          />
          <div className="absolute top-0 right-[20%] w-[40%] h-[70%] opacity-10"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)' }}
          />
        </div>

        {/* CSS Illustration - Person at desk */}
        <div className="relative z-10 w-full px-10 pb-0">
          <svg viewBox="0 0 400 350" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-2xl">
            {/* Desk */}
            <rect x="80" y="240" width="260" height="6" rx="3" fill="rgba(255,255,255,0.3)" />
            <rect x="120" y="246" width="4" height="80" fill="rgba(255,255,255,0.2)" />
            <rect x="310" y="246" width="4" height="80" fill="rgba(255,255,255,0.2)" />
            {/* Monitor */}
            <rect x="160" y="145" width="100" height="75" rx="6" fill="#1a365d" />
            <rect x="166" y="151" width="88" height="56" rx="3" fill="#2d4a7a" />
            <rect x="195" y="220" width="30" height="20" fill="rgba(255,255,255,0.15)" />
            <rect x="180" y="237" width="60" height="4" rx="2" fill="rgba(255,255,255,0.2)" />
            {/* Screen content */}
            <rect x="175" y="162" width="50" height="4" rx="2" fill="rgba(255,255,255,0.3)" />
            <rect x="175" y="172" width="35" height="4" rx="2" fill="rgba(255,255,255,0.2)" />
            <rect x="175" y="182" width="60" height="12" rx="3" fill="rgba(86,204,242,0.4)" />
            {/* Chair */}
            <ellipse cx="145" cy="285" rx="30" ry="8" fill="rgba(255,255,255,0.15)" />
            <rect x="140" y="260" width="10" height="25" fill="rgba(255,255,255,0.12)" />
            <path d="M120 220 C120 200, 170 200, 170 220 L170 260 L120 260 Z" fill="#2d6cb5" />
            {/* Person body */}
            <ellipse cx="130" cy="200" rx="18" ry="35" fill="#5cb8a3" />
            {/* Person head */}
            <circle cx="128" cy="160" r="18" fill="#f0c9a0" />
            <path d="M112 155 C112 140, 145 135, 145 150 C145 148, 140 155, 128 155 Z" fill="#2d3748" />
            {/* Arm reaching to keyboard */}
            <path d="M145 210 Q170 225, 185 235" stroke="#f0c9a0" strokeWidth="8" strokeLinecap="round" fill="none" />
            {/* Plant */}
            <rect x="285" y="220" width="12" height="20" rx="3" fill="rgba(255,255,255,0.25)" />
            <ellipse cx="291" cy="215" rx="15" ry="12" fill="#48bb78" />
            <ellipse cx="283" cy="210" rx="8" ry="10" fill="#38a169" />
            <ellipse cx="299" cy="211" rx="7" ry="9" fill="#68d391" />
          </svg>
        </div>
      </div>

      {/* ===== RIGHT: Login Form ===== */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-12 lg:px-20 py-12">
        <div className="w-full max-w-[440px]">
          {/* Title */}
          <h1 className="text-[34px] sm:text-[42px] font-extrabold text-[#1a202c] leading-[1.15] mb-4">
            Welcome back
          </h1>
          <p className="text-gray-400 text-[15px] leading-relaxed mb-10">
            Sign in to your account to continue learning with your college community.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-7">
            {/* Email */}
            <div>
              <label className="text-[13px] font-bold text-[#1a202c] mb-1 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full py-3 border-b-2 border-gray-200 text-[15px] text-gray-800 placeholder-gray-400 outline-none focus:border-cyan-500 transition-colors bg-transparent"
                placeholder="you@kpriet.ac.in"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-[13px] font-bold text-[#1a202c] mb-1 block">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-3 border-b-2 border-gray-200 text-[15px] text-gray-800 placeholder-gray-400 outline-none focus:border-cyan-500 transition-colors bg-transparent pr-10"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors p-1"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-[18px] h-[18px] rounded border-2 border-gray-300 peer-checked:bg-cyan-500 peer-checked:border-cyan-500 transition-all flex items-center justify-center">
                    {rememberMe && <FiCheck size={11} className="text-white" strokeWidth={3} />}
                  </div>
                </div>
                <span className="text-[13px] text-gray-500">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-[13px] text-gray-500 hover:text-cyan-600 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit button */}
            <div className="flex justify-center pt-1">
              <button
                type="submit"
                disabled={loading}
                className="px-16 py-3.5 rounded-full font-semibold text-white text-[15px] tracking-wide transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #2F80ED 0%, #38b2ac 100%)',
                  boxShadow: '0 10px 40px -10px rgba(47,128,237,0.45)',
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : 'Sign in'}
              </button>
            </div>
          </form>

          {/* Sign up link */}
          <p className="text-center text-sm text-gray-400 mt-8">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-cyan-600 font-semibold hover:text-cyan-700 transition-colors">
              Sign up for free
            </Link>
          </p>
        </div>
      </div>

      {/* Mobile: Blue banner (shown below form on small screens) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 py-4 px-6 text-center"
        style={{ background: 'linear-gradient(135deg, #2F80ED, #56CCF2)' }}
      >
        <p className="text-white text-sm font-medium">Your Academic Hub - Powered by AI</p>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm relative shadow-2xl">
            <button
              onClick={() => setShowForgot(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FiX size={18} />
            </button>
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #2F80ED, #56CCF2)' }}
              >
                <FiMail className="text-white" size={20} />
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Reset Password</h3>
            <p className="text-gray-500 text-xs text-center mb-5">
              We&apos;ll send a password reset link to your college email.
            </p>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="text-[13px] font-bold text-[#1a202c] mb-1 block">Email</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full py-3 border-b-2 border-gray-200 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-cyan-500 transition-colors bg-transparent"
                  placeholder="your.email@kpriet.ac.in"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full py-3 rounded-full font-semibold text-white text-sm transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #2F80ED 0%, #56CCF2 100%)' }}
              >
                {forgotLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
