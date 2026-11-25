import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  FiUpload, FiSearch, FiBookOpen, FiMessageSquare, FiUsers, FiShield,
  FiArrowRight, FiCheckCircle, FiTrendingUp,
} from 'react-icons/fi';

const features = [
  {
    icon: FiUpload,
    title: 'Upload & Share',
    desc: 'Share your notes, question papers, PPTs and study materials with your college peers in seconds.',
    color: 'from-rose-500 to-pink-500',
    bgLight: 'bg-rose-50',
  },
  {
    icon: FiSearch,
    title: 'Discover Materials',
    desc: 'Browse a rich, organized library of study resources — search by department, subject, or keyword.',
    color: 'from-amber-500 to-orange-500',
    bgLight: 'bg-amber-50',
  },
  {
    icon: FiBookOpen,
    title: 'Department-wise Access',
    desc: 'Find materials for your specific branch — from CS to Civil and everything in between.',
    color: 'from-indigo-500 to-blue-500',
    bgLight: 'bg-indigo-50',
  },
  {
    icon: FiMessageSquare,
    title: 'AI Study Assistant',
    desc: 'Get instant help with an AI-powered chatbot that answers your academic queries 24/7.',
    color: 'from-emerald-500 to-teal-500',
    bgLight: 'bg-emerald-50',
  },
  {
    icon: FiTrendingUp,
    title: 'Leaderboard & Rewards',
    desc: 'Earn points for uploading quality notes and climb the contributor leaderboard.',
    color: 'from-purple-500 to-violet-500',
    bgLight: 'bg-purple-50',
  },
  {
    icon: FiShield,
    title: 'Content Moderation',
    desc: 'Every upload is automatically scanned to keep the platform safe, relevant, and high-quality.',
    color: 'from-pink-500 to-rose-500',
    bgLight: 'bg-pink-50',
  },
];

const steps = [
  { step: '01', title: 'Create an Account', desc: 'Sign up for free with your college email in under a minute.' },
  { step: '02', title: 'Browse or Upload', desc: 'Search for materials you need or share your own notes with peers.' },
  { step: '03', title: 'Study Smarter', desc: 'Access organized resources, use AI assistance, and ace your exams.' },
];

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white overflow-x-hidden">

      {/* ───── Navbar ───── */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-lg shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-8 py-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-rose-200/50 group-hover:shadow-rose-300/50 transition-shadow">
              S4
            </span>
            <span className="text-xl font-bold text-gray-900 tracking-tight">Spot4Notes</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-rose-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-rose-600 transition-colors">How it Works</a>

          </nav>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:text-rose-600 transition-colors"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl hover:shadow-lg hover:shadow-rose-200/50 hover:-translate-y-0.5 transition-all duration-200"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* ───── Hero Section ───── */}
      <section className="relative pt-16 pb-24 lg:pt-24 lg:pb-32 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-br from-rose-100/80 via-pink-50/50 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-40 right-0 w-72 h-72 bg-gradient-to-br from-amber-100/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-indigo-100/30 to-transparent rounded-full blur-3xl" />
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-[1.1] tracking-tight">
              The Smarter Way to{' '}
              <span className="relative">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600">
                  Share & Discover
                </span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                  <path d="M2 8C50 2 100 2 150 6C200 10 250 4 298 8" stroke="url(#underline-grad)" strokeWidth="3" strokeLinecap="round" />
                  <defs><linearGradient id="underline-grad" x1="0" y1="0" x2="300" y2="0"><stop stopColor="#f43f5e" /><stop offset="1" stopColor="#ec4899" /></linearGradient></defs>
                </svg>
              </span>
              <br />
              Study Materials
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Spot4Notes is your college's one-stop platform to upload, discover, and access notes, question papers, presentations — all organized by department and subject.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-10 justify-center">
              <Link
                to="/register"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl hover:shadow-xl hover:shadow-rose-200/40 hover:-translate-y-0.5 transition-all duration-300"
              >
                Start Sharing for Free
                <FiArrowRight className="group-hover:translate-x-1 transition-transform" size={16} />
              </Link>
              <Link
                to="/materials"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-2xl hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
              >
                <FiSearch size={16} />
                Browse Materials
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-400">
              <span className="flex items-center gap-1.5"><FiCheckCircle className="text-emerald-500" size={15} /> Free to use</span>
              <span className="flex items-center gap-1.5"><FiCheckCircle className="text-emerald-500" size={15} /> No credit card required</span>
              <span className="flex items-center gap-1.5"><FiCheckCircle className="text-emerald-500" size={15} /> Auto content moderation</span>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Features Grid ───── */}
      <section id="features" className="py-24 bg-gray-50/70">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 bg-rose-50 text-rose-600 text-xs font-semibold rounded-full mb-4">FEATURES</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Everything you need to study smarter</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">Powerful tools built specifically for students who want to share knowledge and excel together.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="group bg-white rounded-2xl p-7 border border-gray-100 hover:shadow-xl hover:shadow-gray-200/40 hover:-translate-y-1 transition-all duration-300">
                <div className={`w-12 h-12 rounded-2xl ${f.bgLight} flex items-center justify-center mb-5`}>
                  <f.icon className={`bg-gradient-to-r ${f.color} text-transparent`} size={22} style={{ stroke: 'url(#icon-grad)' }} />
                  <f.icon className="text-rose-500 absolute opacity-0" size={22} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-rose-600 transition-colors">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── How It Works ───── */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-full mb-4">HOW IT WORKS</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Get started in 3 simple steps</h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto">From sign-up to studying — it takes less than a minute.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.step} className="relative text-center group">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-rose-200 to-transparent" />
                )}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 text-white text-lg font-bold shadow-lg shadow-rose-200/40 mb-5 group-hover:scale-110 transition-transform duration-300">
                  {s.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── CTA Section ───── */}
      <section className="relative py-24 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500 via-pink-500 to-rose-600" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        <div className="relative max-w-3xl mx-auto px-6 text-center text-white">
          <h2 className="text-3xl sm:text-4xl font-bold leading-tight">Ready to supercharge your study game?</h2>
          <p className="text-rose-100 mt-4 text-lg max-w-xl mx-auto">
            Join thousands of students already sharing knowledge and acing their exams on Spot4Notes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-10 justify-center">
            <Link
              to="/register"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-rose-600 font-semibold rounded-2xl hover:bg-rose-50 hover:-translate-y-0.5 transition-all duration-300 shadow-xl"
            >
              Create Free Account
              <FiArrowRight className="group-hover:translate-x-1 transition-transform" size={16} />
            </Link>
            <Link
              to="/materials"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-white font-semibold border-2 border-white/25 rounded-2xl hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-300"
            >
              Explore Materials
            </Link>
          </div>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">S4</span>
              <span className="text-lg font-bold text-white">Spot4Notes</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
              <Link to="/materials" className="hover:text-white transition-colors">Browse</Link>
              <Link to="/login" className="hover:text-white transition-colors">Login</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-xs text-gray-500">
            © {new Date().getFullYear()} Spot4Notes. Built for students, by students.
          </div>
        </div>
      </footer>
    </div>
  );
}