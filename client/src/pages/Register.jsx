import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiBookOpen, FiCalendar, FiHash, FiArrowRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { departmentsAPI } from '../lib/api';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', department: '', year: '', roll_number: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [departments, setDepartments] = useState([]);
  const { register, loading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    departmentsAPI.getAll().then(({ data }) => setDepartments(data.departments)).catch(() => {});
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    try {
      const data = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        department: form.department,
        year: form.year,
        roll_number: form.roll_number,
      });
      toast.success(data.message || 'Registration successful! Please verify your email.');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
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
          <div className="absolute top-0 left-[15%] w-[2px] h-full bg-white/10" />
          <div className="absolute top-0 left-[55%] w-[2px] h-full bg-white/10 rotate-[4deg]" />
          <div className="absolute top-[10%] left-0 w-full h-[2px] bg-white/8" />
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

      {/* ===== RIGHT: Signup Form ===== */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-12 lg:px-20 py-10 overflow-y-auto">
        <div className="w-full max-w-[440px]">
          {/* Title */}
          <h1 className="text-[34px] sm:text-[42px] font-extrabold text-[#1a202c] leading-[1.15] mb-4">
            Start learning<br />for free
          </h1>
          <p className="text-gray-400 text-[15px] leading-relaxed mb-10">
            Create your 100% free account and start accessing study materials from your college.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label className="text-[13px] font-bold text-[#1a202c] mb-1 block">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full py-3 border-b-2 border-gray-200 text-[15px] text-gray-800 placeholder-gray-400 outline-none focus:border-cyan-500 transition-colors bg-transparent"
                placeholder="Your full name"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-[13px] font-bold text-[#1a202c] mb-1 block">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full py-3 border-b-2 border-gray-200 text-[15px] text-gray-800 placeholder-gray-400 outline-none focus:border-cyan-500 transition-colors bg-transparent"
                placeholder="you@kpriet.ac.in"
                required
              />
            </div>

            {/* Roll Number & Year */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-[13px] font-bold text-[#1a202c] mb-1 block">
                  Roll Number
                </label>
                <input
                  type="text"
                  name="roll_number"
                  value={form.roll_number}
                  onChange={handleChange}
                  className="w-full py-3 border-b-2 border-gray-200 text-[15px] text-gray-800 placeholder-gray-400 outline-none focus:border-cyan-500 transition-colors bg-transparent"
                  placeholder="e.g. 24AD119"
                />
              </div>
              <div>
                <label className="text-[13px] font-bold text-[#1a202c] mb-1 block">
                  Year
                </label>
                <select
                  name="year"
                  value={form.year}
                  onChange={handleChange}
                  className="w-full py-3 border-b-2 border-gray-200 text-[15px] text-gray-800 outline-none focus:border-cyan-500 transition-colors bg-transparent appearance-none cursor-pointer"
                >
                  <option value="" className="text-gray-300">Select year</option>
                  <option value="1st">1st Year</option>
                  <option value="2nd">2nd Year</option>
                  <option value="3rd">3rd Year</option>
                  <option value="4th">4th Year</option>
                </select>
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="text-[13px] font-bold text-[#1a202c] mb-1 block">
                Department
              </label>
              <select
                name="department"
                value={form.department}
                onChange={handleChange}
                className="w-full py-3 border-b-2 border-gray-200 text-[15px] text-gray-800 outline-none focus:border-cyan-500 transition-colors bg-transparent appearance-none cursor-pointer"
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Password */}
            <div>
              <label className="text-[13px] font-bold text-[#1a202c] mb-1 block">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full py-3 border-b-2 border-gray-200 text-[15px] text-gray-800 placeholder-gray-400 outline-none focus:border-cyan-500 transition-colors bg-transparent pr-10"
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
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

            {/* Confirm Password */}
            <div>
              <label className="text-[13px] font-bold text-[#1a202c] mb-1 block">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                className="w-full py-3 border-b-2 border-gray-200 text-[15px] text-gray-800 placeholder-gray-400 outline-none focus:border-cyan-500 transition-colors bg-transparent"
                placeholder="Repeat your password"
                required
              />
            </div>

            {/* Terms checkbox */}
            <label className="flex items-start gap-3 cursor-pointer select-none mt-2">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 w-[18px] h-[18px] rounded border-2 border-gray-300 text-cyan-500 focus:ring-cyan-400 accent-cyan-500"
              />
              <span className="text-[13px] text-gray-500 leading-snug">
                By signing up to Spot4Notes, you agree to our{' '}
                <span className="font-bold text-[#1a202c]">Terms</span> &amp; our{' '}
                <span className="font-bold text-[#1a202c]">Privacy Policy</span>
              </span>
            </label>

            {/* Submit button */}
            <div className="flex justify-center pt-2">
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
                    Creating account...
                  </span>
                ) : 'Sign up'}
              </button>
            </div>
          </form>

          {/* Login link */}
          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-600 font-semibold hover:text-cyan-700 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Mobile: Blue banner */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 py-4 px-6 text-center"
        style={{ background: 'linear-gradient(135deg, #2F80ED, #56CCF2)' }}
      >
        <p className="text-white text-sm font-medium">Join Your College Community</p>
      </div>
    </div>
  );
}
