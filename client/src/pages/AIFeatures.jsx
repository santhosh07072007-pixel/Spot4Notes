import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiStar, FiBookOpen, FiHelpCircle, FiClipboard, FiCheck, FiChevronDown, FiChevronRight, FiLoader, FiCopy, FiZap, FiAlertCircle } from 'react-icons/fi';
import { aiAPI } from '../lib/api';
import toast from 'react-hot-toast';

export default function AIFeatures() {
    const { id } = useParams();
    const [activeTab, setActiveTab] = useState('score');
    const [loading, setLoading] = useState(false);
    const [materialTitle, setMaterialTitle] = useState('');

    // Data states
    const [score, setScore] = useState(null);
    const [summary, setSummary] = useState(null);
    const [questions, setQuestions] = useState(null);
    const [processLoading, setProcessLoading] = useState(false);

    // Question options
    const [mcqCount, setMcqCount] = useState(5);
    const [twoMarkCount, setTwoMarkCount] = useState(5);
    const [tenMarkCount, setTenMarkCount] = useState(3);
    const [vivaCount, setVivaCount] = useState(5);

    // Expand states for question sections
    const [expandedSections, setExpandedSections] = useState({});
    const [showAnswers, setShowAnswers] = useState({});

    // Load material info
    useEffect(() => {
        import('../lib/api').then(({ materialsAPI }) => {
            materialsAPI.getById(id).then(({ data }) => {
                setMaterialTitle(data.material.title);
                if (data.material.ai_quality_score) setScore(data.material.ai_quality_score);
                if (data.material.ai_summary) setSummary(data.material.ai_summary);
                if (data.material.ai_questions) setQuestions(data.material.ai_questions);
            }).catch(() => { });
        });
    }, [id]);

    const handleScore = async () => {
        setLoading(true);
        try {
            const { data } = await aiAPI.scoreNote(id);
            if (data.score) {
                setScore(data.score);
                toast.success(data.cached ? 'Score loaded from cache' : 'Quality scored successfully! ⭐');
            } else {
                toast.error(data.message || 'Could not score this note');
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to score');
        } finally {
            setLoading(false);
        }
    };

    const handleSummary = async () => {
        setLoading(true);
        try {
            const { data } = await aiAPI.generateSummary(id);
            if (data.summary) {
                setSummary(data.summary);
                toast.success(data.cached ? 'Summary loaded from cache' : 'Summary generated! 🧠');
            } else {
                toast.error(data.message || 'Could not generate summary');
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to summarize');
        } finally {
            setLoading(false);
        }
    };

    const handleQuestions = async () => {
        setLoading(true);
        try {
            const { data } = await aiAPI.generateQuestions(id, { mcqCount, twoMarkCount, tenMarkCount, vivaCount });
            if (data.questions) {
                setQuestions(data.questions);
                toast.success(data.cached ? 'Questions loaded from cache' : 'Questions generated! ❓');
            } else {
                toast.error(data.message || 'Could not generate questions');
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to generate questions');
        } finally {
            setLoading(false);
        }
    };

    const handleProcessAll = async () => {
        setProcessLoading(true);
        try {
            const { data } = await aiAPI.processAll(id);
            if (data.score) setScore(data.score);
            if (data.summary) setSummary(data.summary);
            if (data.questions) setQuestions(data.questions);
            toast.success('All AI features processed! 🚀');
        } catch (err) {
            toast.error('Processing failed — try individual features');
        } finally {
            setProcessLoading(false);
        }
    };

    const toggleSection = (key) => {
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleAnswer = (key) => {
        setShowAnswers(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => toast.success('Copied!')).catch(() => { });
    };

    const tabs = [
        { key: 'score', label: 'Quality Score', icon: FiStar, color: 'text-amber-500' },
        { key: 'summary', label: 'Auto Summary', icon: FiBookOpen, color: 'text-emerald-500' },
        { key: 'questions', label: 'Question Generator', icon: FiHelpCircle, color: 'text-blue-500' },
    ];

    const getScoreColor = (s) => {
        if (s >= 8) return 'text-emerald-500';
        if (s >= 6) return 'text-amber-500';
        if (s >= 4) return 'text-orange-500';
        return 'text-red-500';
    };

    const getScoreBg = (s) => {
        if (s >= 8) return 'bg-emerald-50 border-emerald-200';
        if (s >= 6) return 'bg-amber-50 border-amber-200';
        if (s >= 4) return 'bg-orange-50 border-orange-200';
        return 'bg-red-50 border-red-200';
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link to={`/materials/${id}`} className="text-rose-500 hover:text-rose-600 text-sm font-medium">
                            ← Back to Material
                        </Link>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FiZap className="text-rose-500" />
                        AI Features
                    </h1>
                    {materialTitle && (
                        <p className="text-sm text-gray-500 mt-1 truncate max-w-md">📄 {materialTitle}</p>
                    )}
                </div>
                <button
                    onClick={handleProcessAll}
                    disabled={processLoading}
                    className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold text-sm hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                >
                    {processLoading ? <FiLoader className="animate-spin" /> : <FiZap />}
                    {processLoading ? 'Processing...' : 'Process All with AI'}
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.key
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <tab.icon className={activeTab === tab.key ? tab.color : ''} size={16} />
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* ═══════════════════════════════════════ */}
            {/* TAB: Quality Score */}
            {/* ═══════════════════════════════════════ */}
            {activeTab === 'score' && (
                <div className="space-y-5">
                    {!score ? (
                        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
                            <div className="w-20 h-20 mx-auto bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
                                <FiStar className="text-amber-500" size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">AI Note Quality Scoring</h3>
                            <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                                AI will analyze your notes for clarity, completeness, readability, relevance, and grammar quality — then give a score from 1 to 10.
                            </p>
                            <button
                                onClick={handleScore}
                                disabled={loading}
                                className="px-6 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 disabled:opacity-50 transition-all shadow-md flex items-center gap-2 mx-auto"
                            >
                                {loading ? <FiLoader className="animate-spin" /> : <FiStar />}
                                {loading ? 'Analyzing...' : 'Score My Notes ⭐'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Overall Score Card */}
                            <div className={`rounded-2xl p-6 border ${getScoreBg(score.overall_score)} text-center`}>
                                <p className="text-sm font-semibold text-gray-600 mb-2">Overall Quality Score</p>
                                <p className={`text-6xl font-black ${getScoreColor(score.overall_score)}`}>
                                    {score.overall_score}<span className="text-2xl text-gray-400">/10</span>
                                </p>
                                <p className="text-sm text-gray-500 mt-2">{score.brief_feedback}</p>
                                {score.method === 'fallback' && (
                                    <p className="text-xs text-orange-500 mt-2 flex items-center gap-1 justify-center">
                                        <FiAlertCircle size={12} /> AI scoring was unavailable — this is an estimated score
                                    </p>
                                )}
                            </div>

                            {/* Individual Scores */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                {[
                                    { key: 'clarity', label: 'Clarity', emoji: '💡' },
                                    { key: 'completeness', label: 'Complete', emoji: '📋' },
                                    { key: 'readability', label: 'Readable', emoji: '👁️' },
                                    { key: 'relevance', label: 'Relevant', emoji: '🎯' },
                                    { key: 'grammar', label: 'Grammar', emoji: '✍️' },
                                ].map((item) => (
                                    <div key={item.key} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
                                        <span className="text-xl">{item.emoji}</span>
                                        <p className={`text-2xl font-bold mt-1 ${getScoreColor(score[item.key])}`}>{score[item.key]}</p>
                                        <p className="text-xs text-gray-500">{item.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Strengths & Improvements */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                {score.strengths?.length > 0 && (
                                    <div className="bg-white rounded-2xl p-5 border border-green-100 shadow-sm">
                                        <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                                            <FiCheck className="text-green-500" /> Strengths
                                        </h4>
                                        <ul className="space-y-2">
                                            {score.strengths.map((s, i) => (
                                                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                                    <span className="text-green-500 mt-0.5">✓</span> {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {score.improvements?.length > 0 && (
                                    <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm">
                                        <h4 className="font-semibold text-amber-700 mb-3 flex items-center gap-2">
                                            <FiAlertCircle className="text-amber-500" /> Areas to Improve
                                        </h4>
                                        <ul className="space-y-2">
                                            {score.improvements.map((s, i) => (
                                                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                                    <span className="text-amber-500 mt-0.5">→</span> {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Re-score button */}
                            <button
                                onClick={handleScore}
                                disabled={loading}
                                className="text-sm text-gray-400 hover:text-rose-500 transition-colors"
                            >
                                {loading ? 'Re-analyzing...' : 'Re-score with AI'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════ */}
            {/* TAB: Auto Summary */}
            {/* ═══════════════════════════════════════ */}
            {activeTab === 'summary' && (
                <div className="space-y-5">
                    {!summary ? (
                        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
                            <div className="w-20 h-20 mx-auto bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                                <FiBookOpen className="text-emerald-500" size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">AI Auto Summary</h3>
                            <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                                Generate a 5-line summary, key points, important formulas, exam-focused notes, and viva tips — all powered by AI.
                            </p>
                            <button
                                onClick={handleSummary}
                                disabled={loading}
                                className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-all shadow-md flex items-center gap-2 mx-auto"
                            >
                                {loading ? <FiLoader className="animate-spin" /> : <FiBookOpen />}
                                {loading ? 'Generating...' : 'Generate Summary 🧠'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* 5-Line Summary */}
                            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">📝 5-Line Summary</h4>
                                    <button onClick={() => copyToClipboard(summary.five_line_summary)} className="text-gray-400 hover:text-rose-500">
                                        <FiCopy size={14} />
                                    </button>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{summary.five_line_summary}</p>
                            </div>

                            {/* Key Points */}
                            {summary.key_points?.length > 0 && (
                                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">🔑 Key Points</h4>
                                    <ul className="space-y-2">
                                        {summary.key_points.map((point, i) => (
                                            <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                                <span className="text-rose-500 font-bold mt-0.5 shrink-0">•</span>
                                                <span>{point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Important Formulas */}
                            {summary.important_formulas?.length > 0 && (
                                <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-sm">
                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">📐 Important Formulas</h4>
                                    <div className="space-y-2">
                                        {summary.important_formulas.map((formula, i) => (
                                            <div key={i} className="bg-blue-50 rounded-lg p-3 font-mono text-sm text-blue-900">
                                                {formula}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Exam-Focused Notes */}
                            {summary.exam_focused_notes?.length > 0 && (
                                <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm">
                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">🎯 Exam-Focused Notes</h4>
                                    <ul className="space-y-2">
                                        {summary.exam_focused_notes.map((note, i) => (
                                            <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                                <span className="text-amber-500 font-bold mt-0.5 shrink-0">⭐</span>
                                                <span>{note}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Viva Tips */}
                            {summary.viva_tips?.length > 0 && (
                                <div className="bg-white rounded-2xl p-5 border border-purple-100 shadow-sm">
                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">🎤 Viva Tips</h4>
                                    <ul className="space-y-2">
                                        {summary.viva_tips.map((tip, i) => (
                                            <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                                <span className="text-purple-500 font-bold mt-0.5 shrink-0">💡</span>
                                                <span>{tip}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <button onClick={handleSummary} disabled={loading} className="text-sm text-gray-400 hover:text-rose-500 transition-colors">
                                {loading ? 'Regenerating...' : 'Regenerate Summary'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════ */}
            {/* TAB: Question Generator */}
            {/* ═══════════════════════════════════════ */}
            {activeTab === 'questions' && (
                <div className="space-y-5">
                    {/* Controls */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FiHelpCircle className="text-blue-500" /> Question Generation Options
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                                <label className="text-xs font-medium text-gray-500 block mb-1">MCQs</label>
                                <select value={mcqCount} onChange={(e) => setMcqCount(parseInt(e.target.value))}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-400">
                                    {[3, 5, 10, 15].map(n => <option key={n} value={n}>{n} Questions</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 block mb-1">2-Mark</label>
                                <select value={twoMarkCount} onChange={(e) => setTwoMarkCount(parseInt(e.target.value))}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-400">
                                    {[3, 5, 10].map(n => <option key={n} value={n}>{n} Questions</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 block mb-1">10-Mark</label>
                                <select value={tenMarkCount} onChange={(e) => setTenMarkCount(parseInt(e.target.value))}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-400">
                                    {[2, 3, 5].map(n => <option key={n} value={n}>{n} Questions</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 block mb-1">Viva</label>
                                <select value={vivaCount} onChange={(e) => setVivaCount(parseInt(e.target.value))}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-400">
                                    {[3, 5, 10].map(n => <option key={n} value={n}>{n} Questions</option>)}
                                </select>
                            </div>
                        </div>
                        <button
                            onClick={handleQuestions}
                            disabled={loading}
                            className="mt-4 px-6 py-2.5 bg-blue-500 text-white rounded-xl font-semibold text-sm hover:bg-blue-600 disabled:opacity-50 transition-all shadow-md flex items-center gap-2"
                        >
                            {loading ? <FiLoader className="animate-spin" /> : <FiHelpCircle />}
                            {loading ? 'Generating Questions...' : 'Generate Questions ❓'}
                        </button>
                    </div>

                    {/* Questions Display */}
                    {questions && (
                        <div className="space-y-4">
                            {/* MCQs */}
                            {questions.mcqs?.length > 0 && (
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    <button onClick={() => toggleSection('mcqs')}
                                        className="w-full p-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
                                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                            📝 MCQs ({questions.mcqs.length})
                                        </h4>
                                        {expandedSections.mcqs ? <FiChevronDown /> : <FiChevronRight />}
                                    </button>
                                    {expandedSections.mcqs !== false && (
                                        <div className="px-5 pb-5 space-y-4">
                                            {questions.mcqs.map((q, i) => (
                                                <div key={i} className="border border-gray-100 rounded-xl p-4">
                                                    <p className="font-medium text-gray-900 text-sm mb-3">Q{i + 1}. {q.question}</p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                                                        {q.options?.map((opt, j) => (
                                                            <div key={j} className={`text-sm px-3 py-2 rounded-lg ${showAnswers[`mcq-${i}`] && opt.startsWith(q.correct)
                                                                    ? 'bg-green-100 text-green-800 font-semibold border border-green-300'
                                                                    : 'bg-gray-50 text-gray-700 border border-gray-100'
                                                                }`}>
                                                                {opt}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <button onClick={() => toggleAnswer(`mcq-${i}`)}
                                                        className="text-xs text-blue-500 hover:text-blue-600 font-medium">
                                                        {showAnswers[`mcq-${i}`] ? 'Hide Answer' : 'Show Answer'}
                                                    </button>
                                                    {showAnswers[`mcq-${i}`] && (
                                                        <div className="mt-2 p-3 bg-green-50 rounded-lg">
                                                            <p className="text-sm text-green-800">
                                                                <span className="font-semibold">Answer: {q.correct}</span>
                                                                {q.explanation && <span className="block mt-1 text-green-700">{q.explanation}</span>}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 2-Mark Questions */}
                            {questions.two_mark?.length > 0 && (
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    <button onClick={() => toggleSection('two')}
                                        className="w-full p-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
                                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                            ✏️ 2-Mark Questions ({questions.two_mark.length})
                                        </h4>
                                        {expandedSections.two ? <FiChevronDown /> : <FiChevronRight />}
                                    </button>
                                    {expandedSections.two !== false && (
                                        <div className="px-5 pb-5 space-y-3">
                                            {questions.two_mark.map((q, i) => (
                                                <div key={i} className="border border-gray-100 rounded-xl p-4">
                                                    <p className="font-medium text-gray-900 text-sm mb-2">Q{i + 1}. {q.question}</p>
                                                    <button onClick={() => toggleAnswer(`two-${i}`)}
                                                        className="text-xs text-blue-500 hover:text-blue-600 font-medium">
                                                        {showAnswers[`two-${i}`] ? 'Hide Answer' : 'Show Answer'}
                                                    </button>
                                                    {showAnswers[`two-${i}`] && (
                                                        <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                                                            <p className="text-sm text-blue-800 whitespace-pre-line">{q.model_answer}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 10-Mark Questions */}
                            {questions.ten_mark?.length > 0 && (
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    <button onClick={() => toggleSection('ten')}
                                        className="w-full p-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
                                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                            📖 10-Mark Questions ({questions.ten_mark.length})
                                        </h4>
                                        {expandedSections.ten ? <FiChevronDown /> : <FiChevronRight />}
                                    </button>
                                    {expandedSections.ten !== false && (
                                        <div className="px-5 pb-5 space-y-3">
                                            {questions.ten_mark.map((q, i) => (
                                                <div key={i} className="border border-gray-100 rounded-xl p-4">
                                                    <p className="font-medium text-gray-900 text-sm mb-2">Q{i + 1}. {q.question}</p>
                                                    <button onClick={() => toggleAnswer(`ten-${i}`)}
                                                        className="text-xs text-blue-500 hover:text-blue-600 font-medium">
                                                        {showAnswers[`ten-${i}`] ? 'Hide Answer' : 'Show Answer'}
                                                    </button>
                                                    {showAnswers[`ten-${i}`] && (
                                                        <div className="mt-2 space-y-2">
                                                            {q.key_points?.length > 0 && (
                                                                <div className="p-3 bg-amber-50 rounded-lg">
                                                                    <p className="text-xs font-semibold text-amber-700 mb-1">Key Points:</p>
                                                                    <ul className="text-sm text-amber-800">
                                                                        {q.key_points.map((p, j) => (
                                                                            <li key={j} className="flex items-start gap-1">
                                                                                <span className="text-amber-500">•</span> {p}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            <div className="p-3 bg-blue-50 rounded-lg">
                                                                <p className="text-xs font-semibold text-blue-700 mb-1">Model Answer:</p>
                                                                <p className="text-sm text-blue-800 whitespace-pre-line">{q.model_answer}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Viva Questions */}
                            {questions.viva_questions?.length > 0 && (
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    <button onClick={() => toggleSection('viva')}
                                        className="w-full p-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
                                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                            🎤 Viva Questions ({questions.viva_questions.length})
                                        </h4>
                                        {expandedSections.viva ? <FiChevronDown /> : <FiChevronRight />}
                                    </button>
                                    {expandedSections.viva !== false && (
                                        <div className="px-5 pb-5 space-y-3">
                                            {questions.viva_questions.map((q, i) => (
                                                <div key={i} className="border border-purple-100 rounded-xl p-4">
                                                    <p className="font-medium text-gray-900 text-sm mb-2">Q{i + 1}. {q.question}</p>
                                                    <button onClick={() => toggleAnswer(`viva-${i}`)}
                                                        className="text-xs text-purple-500 hover:text-purple-600 font-medium">
                                                        {showAnswers[`viva-${i}`] ? 'Hide Answer' : 'Show Answer'}
                                                    </button>
                                                    {showAnswers[`viva-${i}`] && (
                                                        <div className="mt-2 space-y-2">
                                                            <div className="p-3 bg-purple-50 rounded-lg">
                                                                <p className="text-xs font-semibold text-purple-700 mb-1">Expected Answer:</p>
                                                                <p className="text-sm text-purple-800">{q.expected_answer}</p>
                                                            </div>
                                                            {q.follow_up && (
                                                                <div className="p-3 bg-pink-50 rounded-lg">
                                                                    <p className="text-xs font-semibold text-pink-700 mb-1">Follow-up:</p>
                                                                    <p className="text-sm text-pink-800">{q.follow_up}</p>
                                                                </div>
                                                            )}
                                                            {q.tip && (
                                                                <div className="p-2 bg-amber-50 rounded-lg">
                                                                    <p className="text-xs text-amber-700">💡 Tip: {q.tip}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
