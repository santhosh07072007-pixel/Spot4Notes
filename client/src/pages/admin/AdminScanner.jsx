import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { FiShield, FiAlertTriangle, FiCheck, FiX, FiFileText, FiRefreshCw, FiCpu, FiEye } from 'react-icons/fi';
import { adminAPI } from '../../lib/api';
import toast from 'react-hot-toast';

export default function AdminScanner() {
  const [tab, setTab] = useState('flagged');
  const [flagged, setFlagged] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const location = useLocation();
  const highlightId = new URLSearchParams(location.search).get('id');
  const highlightedRef = useRef(null);

  useEffect(() => {
    if (highlightId && tab !== 'flagged') {
      setTab('flagged');
    }
    fetchData();
  }, [tab, pagination.page, highlightId]);

  useEffect(() => {
    if (highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [flagged, logs]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'flagged') {
        const { data } = await adminAPI.getFlaggedMaterials({ page: pagination.page, id: highlightId });
        setFlagged(data.materials);
        setPagination(data.pagination);
      } else {
        const { data } = await adminAPI.getScannerLogs({ page: pagination.page });
        setLogs(data.logs);
        setPagination(data.pagination);
      }
    } catch { toast.error('Failed to load scanner data'); }
    setLoading(false);
  };

  const handleOverride = async (id, action) => {
    try {
      await adminAPI.overrideScanner(id, action);
      toast.success(`Material ${action}d`);
      fetchData();
    } catch { toast.error('Override failed'); }
  };

  const scanBadge = (status) => {
    const colors = {
      clean: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      flagged: 'bg-amber-50 text-amber-700 border border-amber-200',
      rejected: 'bg-red-50 text-red-700 border border-red-200',
      pending: 'bg-gray-50 text-gray-600 border border-gray-200',
      needs_review: 'bg-orange-50 text-orange-700 border border-orange-200',
      scanning: 'bg-blue-50 text-blue-600 border border-blue-200',
    };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-50 text-gray-600 border border-gray-200'}`}>{status?.replace('_', ' ')}</span>;
  };

  const materialBadge = (status) => {
    const colors = {
      approved: 'bg-emerald-50 text-emerald-700',
      rejected: 'bg-red-50 text-red-700',
      pending: 'bg-amber-50 text-amber-700',
    };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
  };

  const classificationBadge = (classification) => {
    if (!classification) return null;
    const config = {
      APPROVED: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', icon: '✅' },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', icon: '❌' },
      ADMIN_REVIEW: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', icon: '🔍' },
    };
    const c = config[classification] || config.ADMIN_REVIEW;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${c.bg} ${c.text} border ${c.border}`}>
        {c.icon} {classification}
      </span>
    );
  };

  const confidenceBar = (score) => {
    if (score === undefined || score === null) return null;
    const num = Number(score);
    let color = 'bg-red-400';
    if (num >= 90) color = 'bg-emerald-500';
    else if (num >= 60) color = 'bg-amber-400';
    return (
      <div className="flex items-center gap-2">
        <div className="w-20 h-2 rounded-full bg-gray-200 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${num}%` }} />
        </div>
        <span className="text-xs font-bold text-gray-600">{num}%</span>
      </div>
    );
  };

  const parseScanDetails = (details) => {
    if (!details) return null;
    try {
      return typeof details === 'string' ? JSON.parse(details) : details;
    } catch { return null; }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiCpu className="text-rose-500" /> AI Content Moderation
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            3-tier auto-classification:
            <span className="font-bold text-emerald-600 ml-1">✅ APPROVED</span> ·
            <span className="font-bold text-red-600 ml-1">❌ REJECTED</span> ·
            <span className="font-bold text-amber-600 ml-1">🔍 ADMIN_REVIEW</span>
          </p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-opacity shadow-sm text-sm font-medium">
          <FiRefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Decision Flow Explainer */}
      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl p-4 border border-violet-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-lg">✅</span>
            <div>
              <p className="font-bold text-emerald-700">APPROVED (90-100%)</p>
              <p className="text-gray-500 text-xs">Auto-approved — no admin review needed</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg">❌</span>
            <div>
              <p className="font-bold text-red-700">REJECTED (90-100%)</p>
              <p className="text-gray-500 text-xs">Auto-rejected — explicit 18+ content</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg">🔍</span>
            <div>
              <p className="font-bold text-amber-700">ADMIN_REVIEW (&lt;90%)</p>
              <p className="text-gray-500 text-xs">Ambiguous — needs your manual review</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-rose-50/50 rounded-xl p-1">
        {[
          { key: 'flagged', label: 'Needs Review', icon: FiAlertTriangle },
          { key: 'logs', label: 'All Scan Logs', icon: FiFileText },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setPagination(p => ({ ...p, page: 1 })); }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === t.key
              ? 'bg-white text-rose-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
              }`}>
            <t.icon className="w-4 h-4" /> {t.label}
            {t.key === 'flagged' && pagination.total > 0 && tab === 'flagged' && (
              <span className="ml-1 px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full">{pagination.total}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
        </div>
      ) : tab === 'flagged' ? (
        <div className="space-y-4">
          {flagged.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-rose-100 shadow-sm">
              <FiShield className="w-14 h-14 text-emerald-400 mx-auto mb-3" />
              <p className="text-gray-900 font-semibold text-lg">All Clear!</p>
              <p className="text-gray-400 text-sm mt-1">No uploads need manual review right now.</p>
              <p className="text-gray-300 text-xs mt-2">Academic content is auto-approved. Explicit content is auto-rejected.</p>
            </div>
          ) : flagged.map(m => {
            const details = parseScanDetails(m.scan_details);
            const isHighlighted = highlightId === m.id;
            return (
              <div
                key={m.id}
                ref={isHighlighted ? highlightedRef : null}
                className={`bg-white rounded-2xl border ${isHighlighted ? 'border-rose-400 ring-2 ring-rose-500/20' : 'border-rose-100'} shadow-sm p-5 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <h3 className="font-semibold text-gray-900 truncate">{m.title}</h3>
                      {scanBadge(m.scan_status)}
                      {materialBadge(m.status)}
                      {details?.ai_classification && classificationBadge(details.ai_classification)}
                      {details?.method && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-600 border border-purple-200">
                          {details.method === 'ai' ? '🤖 AI' : details.method === 'hard_reject' ? '🚫 Hard' : '📏 Rules'}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                      <p className="text-gray-500"><span className="font-medium text-gray-700">File:</span> {m.file_name}</p>
                      <p className="text-gray-500"><span className="font-medium text-gray-700">Uploader:</span> {m.uploader_name} ({m.uploader_email})</p>
                      <p className="text-gray-500"><span className="font-medium text-gray-700">Department:</span> {m.department_name || 'N/A'}</p>
                      <p className="text-gray-500"><span className="font-medium text-gray-700">Uploaded:</span> {new Date(m.created_at).toLocaleString()}</p>
                    </div>

                    {/* AI Moderation Decision Details */}
                    {details && (
                      <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                          <FiEye size={14} className="text-gray-400" /> AI Moderation Decision
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                          {details.ai_classification && classificationBadge(details.ai_classification)}
                          {details.confidence_score !== undefined && confidenceBar(details.confidence_score)}
                          {details.confidence && !details.confidence_score && (
                            <span className="text-xs text-gray-400">({details.confidence} confidence)</span>
                          )}
                        </div>
                        {details.reason && <p className="text-sm text-gray-500 mt-2">{details.reason}</p>}
                        {details.textLength !== undefined && <p className="text-xs text-gray-400 mt-1">{details.textLength.toLocaleString()} chars analyzed</p>}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => handleOverride(m.id, 'approve')} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 text-sm font-medium transition-colors shadow-sm">
                      <FiCheck className="w-4 h-4" /> Approve
                    </button>
                    <button onClick={() => handleOverride(m.id, 'reject')} className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 text-sm font-medium transition-colors shadow-sm">
                      <FiX className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rose-100">
                <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-gray-400">File</th>
                <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Uploader</th>
                <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Scan</th>
                <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-gray-400">AI Classification</th>
                <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Confidence</th>
                <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
                <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Method</th>
                <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => {
                const details = parseScanDetails(l.scan_details);
                return (
                  <tr key={l.id} className="border-b border-gray-50 hover:bg-rose-50/30 transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-gray-900 truncate max-w-[180px]">{l.title}</p>
                      <p className="text-gray-400 text-xs truncate max-w-[180px]">{l.file_name}</p>
                    </td>
                    <td className="p-4 text-gray-500">{l.uploader_name || 'Unknown'}</td>
                    <td className="p-4">{scanBadge(l.scan_status)}</td>
                    <td className="p-4">
                      {details?.ai_classification
                        ? classificationBadge(details.ai_classification)
                        : details?.decision
                          ? <span className={`text-xs font-bold ${details.decision === 'APPROVE' ? 'text-emerald-600' : details.decision === 'REJECT' ? 'text-red-600' : 'text-amber-600'}`}>{details.decision}</span>
                          : <span className="text-gray-400 text-xs">—</span>
                      }
                    </td>
                    <td className="p-4">
                      {details?.confidence_score !== undefined
                        ? confidenceBar(details.confidence_score)
                        : details?.confidence
                          ? <span className="text-xs text-gray-500">{details.confidence}</span>
                          : <span className="text-gray-400 text-xs">—</span>
                      }
                    </td>
                    <td className="p-4">{materialBadge(l.status)}</td>
                    <td className="p-4">
                      {details?.method ? (
                        <span className="text-xs text-gray-500">
                          {details.method === 'ai' ? '🤖 AI' : details.method === 'hard_reject' ? '🚫 Hard' : details.method === 'no_text' ? '📄 None' : '📏 Rules'}
                        </span>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="p-4 text-gray-400 text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPagination(prev => ({ ...prev, page: p }))}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${p === pagination.page
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-rose-100 hover:bg-rose-50'
                }`}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}
