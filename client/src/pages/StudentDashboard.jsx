import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiUpload, FiDownload, FiEye, FiStar, FiTrendingUp, FiAward, FiZap, FiFile, FiBarChart2 } from 'react-icons/fi';
import { aiAPI } from '../lib/api';
import useAuthStore from '../store/authStore';

export default function StudentDashboard() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        aiAPI.getStudentStats()
            .then(({ data }) => setStats(data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500" />
            </div>
        );
    }

    if (!stats) return <p className="text-gray-400 text-center py-10">Failed to load analytics</p>;

    const getRankBadge = (rank) => {
        if (rank === 1) return { emoji: '🥇', label: 'Top Contributor', color: 'bg-amber-50 text-amber-700 border-amber-200' };
        if (rank === 2) return { emoji: '🥈', label: '2nd Place', color: 'bg-gray-50 text-gray-600 border-gray-200' };
        if (rank === 3) return { emoji: '🥉', label: '3rd Place', color: 'bg-orange-50 text-orange-700 border-orange-200' };
        if (rank <= 10) return { emoji: '⭐', label: `Rank #${rank}`, color: 'bg-blue-50 text-blue-700 border-blue-200' };
        return { emoji: '📊', label: `Rank #${rank}`, color: 'bg-gray-50 text-gray-600 border-gray-200' };
    };

    const getEngagementLevel = (score) => {
        if (score >= 100) return { label: 'Outstanding', color: 'text-emerald-500', bg: 'bg-emerald-50' };
        if (score >= 50) return { label: 'Active', color: 'text-blue-500', bg: 'bg-blue-50' };
        if (score >= 20) return { label: 'Growing', color: 'text-amber-500', bg: 'bg-amber-50' };
        return { label: 'Starter', color: 'text-gray-500', bg: 'bg-gray-50' };
    };

    const rankBadge = getRankBadge(stats.contributionRank);
    const engagement = getEngagementLevel(stats.engagementScore);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FiBarChart2 className="text-rose-500" />
                        Your Analytics
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Track your contributions and engagement on Spot4Notes</p>
                </div>
            </div>

            {/* Profile Summary Card */}
            <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-2xl backdrop-blur-sm">
                        {user?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">{user?.name || 'Student'}</h2>
                        <p className="text-rose-100 text-sm">{user?.department || 'No department set'}</p>
                    </div>
                    <div className="ml-auto text-right">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${rankBadge.color}`}>
                            <span>{rankBadge.emoji}</span> {rankBadge.label}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                        <p className="text-2xl font-black">{stats.engagementScore}</p>
                        <p className="text-xs text-rose-100">Engagement Score</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                        <p className="text-2xl font-black">{parseInt(stats.uploads?.total) || 0}</p>
                        <p className="text-xs text-rose-100">Total Uploads</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                        <p className="text-2xl font-black">{stats.totalDownloads}</p>
                        <p className="text-xs text-rose-100">Downloads Received</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                        <p className="text-2xl font-black">{stats.totalViews}</p>
                        <p className="text-xs text-rose-100">Total Views</p>
                    </div>
                </div>
            </div>

            {/* Detail Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-green-100 shadow-sm hover:shadow-md hover:border-green-200 hover:-translate-y-1 transition-all duration-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                            <FiUpload className="text-green-500" size={18} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{parseInt(stats.uploads?.approved) || 0}</p>
                            <p className="text-xs text-gray-500">Approved</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm hover:shadow-md hover:border-amber-200 hover:-translate-y-1 transition-all duration-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                            <FiFile className="text-amber-500" size={18} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{parseInt(stats.uploads?.pending) || 0}</p>
                            <p className="text-xs text-gray-500">Pending</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm hover:shadow-md hover:border-rose-200 hover:-translate-y-1 transition-all duration-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center">
                            <FiStar className="text-rose-500" size={18} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{stats.avgRating || '—'}</p>
                            <p className="text-xs text-gray-500">Avg Rating ({stats.ratingCount})</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-purple-100 shadow-sm hover:shadow-md hover:border-purple-200 hover:-translate-y-1 transition-all duration-200">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${engagement.bg} rounded-lg flex items-center justify-center`}>
                            <FiTrendingUp className={engagement.color} size={18} />
                        </div>
                        <div>
                            <p className={`text-lg font-bold ${engagement.color}`}>{engagement.label}</p>
                            <p className="text-xs text-gray-500">Engagement Level</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Engagement Score Breakdown */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FiZap className="text-rose-500" /> Engagement Score Breakdown
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                    Your engagement score is calculated from: Uploads × 10 + Downloads Received × 2 + Views × 0.5
                </p>
                <div className="space-y-3">
                    {[
                        { label: 'Uploads', value: parseInt(stats.uploads?.approved) || 0, multiplier: 10, color: 'bg-rose-400' },
                        { label: 'Downloads Received', value: stats.totalDownloads, multiplier: 2, color: 'bg-blue-400' },
                        { label: 'Views', value: stats.totalViews, multiplier: 0.5, color: 'bg-emerald-400' },
                    ].map((item) => {
                        const points = Math.round(item.value * item.multiplier);
                        const pct = stats.engagementScore > 0 ? (points / stats.engagementScore) * 100 : 0;
                        return (
                            <div key={item.label}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-700">{item.label} ({item.value} × {item.multiplier})</span>
                                    <span className="text-sm font-bold text-gray-500">{points} pts</span>
                                </div>
                                <div className="w-full rounded-full h-2 bg-gray-100">
                                    <div className={`h-2 rounded-full ${item.color} transition-all`} style={{ width: `${Math.max(pct, 2)}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Top Materials + Monthly Trend */}
            <div className="grid lg:grid-cols-2 gap-5">
                {/* Top Materials */}
                {stats.topMaterials?.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FiAward className="text-amber-500" /> Your Top Materials
                        </h3>
                        <div className="space-y-3">
                            {stats.topMaterials.map((mat, i) => (
                                <Link key={mat.id} to={`/materials/${mat.id}`}
                                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-rose-50/50 transition-colors group">
                                    <span className="text-sm font-bold w-5 text-gray-300">{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate text-gray-900 group-hover:text-rose-600">{mat.title}</p>
                                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                                            <span className="flex items-center gap-1"><FiDownload size={10} /> {mat.download_count}</span>
                                            <span className="flex items-center gap-1"><FiEye size={10} /> {mat.view_count}</span>
                                            {parseFloat(mat.avg_rating) > 0 && (
                                                <span className="flex items-center gap-1 text-amber-500"><FiStar size={10} /> {mat.avg_rating}</span>
                                            )}
                                        </div>
                                    </div>
                                    {mat.ai_quality_score?.overall_score && (
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-rose-500">{mat.ai_quality_score.overall_score}</p>
                                            <p className="text-[10px] text-gray-400">AI Score</p>
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Monthly Trend */}
                {stats.monthlyTrend?.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FiTrendingUp className="text-blue-500" /> Monthly Upload Trend
                        </h3>
                        <div className="space-y-3">
                            {stats.monthlyTrend.reverse().map((m) => {
                                const maxCount = Math.max(...stats.monthlyTrend.map(x => parseInt(x.count) || 1));
                                const pct = ((parseInt(m.count) || 0) / maxCount) * 100;
                                return (
                                    <div key={m.month}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm text-gray-700">{m.month}</span>
                                            <span className="text-sm font-bold text-gray-500">{m.count}</span>
                                        </div>
                                        <div className="w-full rounded-full h-2 bg-gray-100">
                                            <div className="h-2 rounded-full bg-blue-400 transition-all" style={{ width: `${Math.max(pct, 3)}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="grid sm:grid-cols-3 gap-4">
                <Link to="/upload"
                    className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-rose-200 hover:-translate-y-1 transition-all text-center group">
                    <div className="w-12 h-12 mx-auto bg-rose-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-rose-100 transition-colors">
                        <FiUpload className="text-rose-500" size={20} />
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">Upload Notes</p>
                    <p className="text-xs text-gray-500 mt-1">Share & increase your rank</p>
                </Link>
                <Link to="/smart-search"
                    className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 hover:-translate-y-1 transition-all text-center group">
                    <div className="w-12 h-12 mx-auto bg-blue-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                        <FiZap className="text-blue-500" size={20} />
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">Smart Search</p>
                    <p className="text-xs text-gray-500 mt-1">AI-powered search</p>
                </Link>
                <Link to="/leaderboard"
                    className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-amber-200 hover:-translate-y-1 transition-all text-center group">
                    <div className="w-12 h-12 mx-auto bg-amber-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-amber-100 transition-colors">
                        <FiAward className="text-amber-500" size={20} />
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">Leaderboard</p>
                    <p className="text-xs text-gray-500 mt-1">See top contributors</p>
                </Link>
            </div>
        </div>
    );
}
