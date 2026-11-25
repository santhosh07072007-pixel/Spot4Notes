import { useEffect, useState } from 'react';
import { FiAward, FiUpload, FiTrendingUp } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { authAPI } from '../lib/api';
import useAuthStore from '../store/authStore';

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    authAPI.getLeaderboard()
      .then(({ data }) => setLeaders(data.leaderboard))
      .catch(() => toast.error('Failed to load leaderboard'))
      .finally(() => setLoading(false));
  }, []);

  const getMedalColor = (rank) => {
    if (rank === 1) return 'from-amber-400 to-yellow-500';
    if (rank === 2) return 'from-gray-300 to-gray-400';
    if (rank === 3) return 'from-orange-400 to-orange-500';
    return 'from-gray-100 to-gray-200';
  };

  const getMedalText = (rank) => {
    if (rank === 1) return 'text-amber-700';
    if (rank === 2) return 'text-gray-600';
    if (rank === 3) return 'text-orange-700';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
        <p className="text-gray-500 mt-1">Top contributors of Spot4Notes</p>
      </div>

      {/* Top 3 Podium */}
      {leaders.length >= 3 && (
        <div className="flex items-end justify-center gap-4 mb-8">
          {[leaders[1], leaders[0], leaders[2]].map((l, idx) => {
            const rank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
            const height = idx === 1 ? 'h-32' : idx === 0 ? 'h-24' : 'h-20';
            return (
              <div key={l.id} className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getMedalColor(rank)} flex items-center justify-center mb-2 shadow-lg`}>
                  <span className={`font-bold ${rank <= 3 ? 'text-white' : ''}`}>{l.name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <p className="font-semibold text-sm text-gray-900 text-center max-w-[100px] truncate">{l.name}</p>
                <p className="text-xs text-gray-400">{l.total_uploads} uploads</p>
                <div className={`${height} w-20 bg-gradient-to-t ${getMedalColor(rank)} rounded-t-lg mt-2 flex items-start justify-center pt-2`}>
                  <span className={`text-lg font-bold ${rank <= 3 ? 'text-white' : getMedalText(rank)}`}>#{rank}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full List */}
      <div className="space-y-2">
        {leaders.map((leader, idx) => {
          const rank = idx + 1;
          const isMe = user?.id === leader.id;
          return (
            <div
              key={leader.id}
              className={`card p-4 flex items-center gap-4 ${isMe ? 'ring-2 ring-primary-200 bg-primary-50/30' : ''}`}
            >
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getMedalColor(rank)} flex items-center justify-center flex-shrink-0`}>
                {rank <= 3 ? (
                  <FiAward className="text-white" size={18} />
                ) : (
                  <span className="text-sm font-bold text-gray-600">{rank}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 truncate">{leader.name}</p>
                  {isMe && <span className="badge bg-primary-100 text-primary-700 text-xs">You</span>}
                  {leader.badge && (
                    <span className="badge bg-amber-100 text-amber-700 text-xs">
                      <FiAward size={10} className="mr-0.5" /> {leader.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">{leader.department || 'No department'}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                  <FiUpload size={14} className="text-primary-500" />
                  {leader.total_uploads}
                </div>
                <p className="text-xs text-gray-400">uploads</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                  <FiTrendingUp size={14} className="text-emerald-500" />
                  {leader.approved_uploads}
                </div>
                <p className="text-xs text-gray-400">approved</p>
              </div>
            </div>
          );
        })}
      </div>

      {leaders.length === 0 && (
        <div className="card p-12 text-center">
          <FiAward className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-400 text-lg">No contributions yet</p>
          <p className="text-gray-400 text-sm mt-1">Be the first to upload and lead the board!</p>
        </div>
      )}
    </div>
  );
}
