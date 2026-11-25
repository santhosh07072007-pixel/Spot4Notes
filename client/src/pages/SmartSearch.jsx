import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiLoader, FiFile, FiDownload, FiEye, FiStar, FiZap, FiArrowRight, FiTag } from 'react-icons/fi';
import { aiAPI, departmentsAPI } from '../lib/api';

export default function SmartSearch() {
    const [query, setQuery] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [departments, setDepartments] = useState([]);
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchHistory, setSearchHistory] = useState([]);

    useEffect(() => {
        departmentsAPI.getAll().then(({ data }) => setDepartments(data.departments || [])).catch(() => { });
        // Load search history from localStorage
        const saved = JSON.parse(localStorage.getItem('smartSearchHistory') || '[]');
        setSearchHistory(saved);
    }, []);

    const handleSearch = async (searchQuery = query) => {
        if (!searchQuery || searchQuery.trim().length < 2) return;

        setLoading(true);
        setResults(null);

        try {
            const { data } = await aiAPI.semanticSearch({
                q: searchQuery.trim(),
                department_id: departmentId || undefined,
                limit: 20,
            });
            setResults(data);

            // Save to history
            const newHistory = [searchQuery, ...searchHistory.filter(h => h !== searchQuery)].slice(0, 10);
            setSearchHistory(newHistory);
            localStorage.setItem('smartSearchHistory', JSON.stringify(newHistory));
        } catch (err) {
            setResults({ materials: [], total: 0, error: err.response?.data?.error || 'Search failed' });
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    const categoryColors = {
        notes: 'bg-rose-100 text-rose-700',
        question_papers: 'bg-amber-100 text-amber-700',
        ppt: 'bg-purple-100 text-purple-700',
        important_questions: 'bg-red-100 text-red-700',
        study_materials: 'bg-emerald-100 text-emerald-700',
    };

    const categoryLabels = {
        notes: 'Notes', question_papers: 'Question Papers', ppt: 'PPT',
        important_questions: 'Important Qs', study_materials: 'Study Materials',
    };

    const sampleSearches = [
        'Sorting techniques', 'Binary tree traversal', 'OSI model layers',
        'Normalization in DBMS', 'Newton\'s laws', 'Thermodynamics formulas',
        'Machine Learning algorithms', 'Data structures',
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Hero Header */}
            <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-50 text-rose-600 rounded-full text-xs font-semibold mb-4">
                    <FiZap size={12} /> AI-Powered Smart Search
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Notes Intelligently 🔎</h1>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                    Search by concepts, not just keywords. Our AI understands what you're looking for and finds related materials even if the exact words don't match.
                </p>
            </div>

            {/* Search Box */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-md">
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search by topic, concept, or technique..."
                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                        />
                    </div>
                    <select
                        value={departmentId}
                        onChange={(e) => setDepartmentId(e.target.value)}
                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:border-rose-400 hidden sm:block"
                    >
                        <option value="">All Departments</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <button
                        onClick={() => handleSearch()}
                        disabled={loading || query.trim().length < 2}
                        className="px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold text-sm hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                        {loading ? <FiLoader className="animate-spin" size={16} /> : <FiSearch size={16} />}
                        Search
                    </button>
                </div>

                {/* Sample Searches */}
                {!results && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        <span className="text-xs text-gray-400">Try:</span>
                        {sampleSearches.map(s => (
                            <button
                                key={s}
                                onClick={() => { setQuery(s); handleSearch(s); }}
                                className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Search History */}
            {!results && searchHistory.length > 0 && (
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-500 mb-3">Recent Searches</h3>
                    <div className="flex flex-wrap gap-2">
                        {searchHistory.map((h, i) => (
                            <button
                                key={i}
                                onClick={() => { setQuery(h); handleSearch(h); }}
                                className="text-xs px-3 py-1.5 bg-gray-50 text-gray-600 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-colors border border-gray-200"
                            >
                                🕐 {h}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Results */}
            {results && (
                <div className="space-y-4">
                    {/* Expanded Terms */}
                    {results.expanded_terms?.length > 1 && (
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                            <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                                <FiZap size={12} /> AI expanded your search to include:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {results.expanded_terms.map((term, i) => (
                                    <span key={i} className="text-xs px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full">
                                        {term}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Result Count */}
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                            Found <span className="font-bold text-gray-900">{results.total}</span> results
                        </p>
                    </div>

                    {/* Results List */}
                    {results.materials?.length > 0 ? (
                        <div className="space-y-3">
                            {results.materials.map((mat) => (
                                <Link
                                    key={mat.id}
                                    to={`/materials/${mat.id}`}
                                    className="block bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-rose-200 hover:-translate-y-0.5 transition-all group"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-rose-100 transition-colors">
                                            <FiFile className="text-rose-500" size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <h4 className="font-semibold text-gray-900 group-hover:text-rose-600 transition-colors line-clamp-1">
                                                    {mat.title}
                                                </h4>
                                                <FiArrowRight className="text-gray-300 group-hover:text-rose-500 transition-colors shrink-0 mt-1" size={16} />
                                            </div>
                                            {mat.description && (
                                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{mat.description}</p>
                                            )}
                                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[mat.category] || 'bg-gray-100 text-gray-600'}`}>
                                                    {categoryLabels[mat.category] || mat.category}
                                                </span>
                                                {mat.department_name && (
                                                    <span className="text-xs text-gray-400">📁 {mat.department_name}</span>
                                                )}
                                                {mat.subject_name && (
                                                    <span className="text-xs text-gray-400">📖 {mat.subject_name}</span>
                                                )}
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    <FiDownload size={10} /> {mat.download_count}
                                                </span>
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    <FiEye size={10} /> {mat.view_count}
                                                </span>
                                                {parseFloat(mat.avg_rating) > 0 && (
                                                    <span className="text-xs text-amber-500 flex items-center gap-1">
                                                        <FiStar size={10} /> {mat.avg_rating}
                                                    </span>
                                                )}
                                            </div>
                                            {mat.departments?.length > 1 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {mat.departments.map(d => (
                                                        <span key={d.id} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                                                            {d.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl p-10 border border-gray-100 shadow-sm text-center">
                            <p className="text-5xl mb-4">🔍</p>
                            <h3 className="font-bold text-gray-900 mb-2">No results found</h3>
                            <p className="text-sm text-gray-500">
                                Try different keywords or remove the department filter.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
