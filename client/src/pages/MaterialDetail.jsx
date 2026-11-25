import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiDownload, FiEye, FiCalendar, FiUser, FiTag, FiFolder, FiBookOpen, FiMessageSquare, FiArrowLeft, FiBookmark, FiStar, FiHeart, FiSend, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { materialsAPI } from '../lib/api';
import useAuthStore from '../store/authStore';

const categoryLabels = {
  notes: 'Notes', question_papers: 'Question Papers', ppt: 'PPTs',
  important_questions: 'Important Questions', study_materials: 'Study Materials',
};

const getCategoryColor = (cat) => {
  const colors = {
    notes: 'bg-blue-100 text-blue-700',
    question_papers: 'bg-orange-100 text-orange-700',
    ppt: 'bg-purple-100 text-purple-700',
    important_questions: 'bg-red-100 text-red-700',
    study_materials: 'bg-emerald-100 text-emerald-700',
  };
  return colors[cat] || 'bg-gray-100 text-gray-700';
};

function StarRating({ rating, onRate, userRating, count }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onRate(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="p-0.5 transition-colors"
          >
            <FiStar
              size={20}
              className={`${star <= (hovered || userRating || 0)
                  ? 'text-amber-400 fill-amber-400'
                  : star <= rating
                    ? 'text-amber-300 fill-amber-200'
                    : 'text-gray-300'
                }`}
            />
          </button>
        ))}
      </div>
      <span className="text-sm text-gray-500">
        {rating > 0 ? `${rating}/5` : 'No ratings'} {count > 0 && `(${count})`}
      </span>
    </div>
  );
}

export default function MaterialDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState([]);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);

  useEffect(() => {
    materialsAPI.getById(id)
      .then(({ data }) => {
        setMaterial(data.material);
        setLiked(data.material.is_liked || false);
        setLikeCount(parseInt(data.material.like_count) || 0);
      })
      .catch(() => toast.error('Material not found'))
      .finally(() => setLoading(false));
    materialsAPI.getRelated(id)
      .then(({ data }) => setRelated(data.materials || []))
      .catch(() => { });
    loadComments();
  }, [id]);

  const loadComments = () => {
    setCommentsLoading(true);
    materialsAPI.getComments(id)
      .then(({ data }) => setComments(data.comments || []))
      .catch(() => { })
      .finally(() => setCommentsLoading(false));
  };

  const handleDownload = async () => {
    try {
      await materialsAPI.download(id);
      window.open(material.file_url, '_blank');
      setMaterial((prev) => ({ ...prev, download_count: prev.download_count + 1 }));
    } catch {
      toast.error('Download failed');
    }
  };

  const handleBookmark = async () => {
    try {
      const { data } = await materialsAPI.bookmark(id);
      setMaterial((prev) => ({ ...prev, is_bookmarked: data.bookmarked }));
      toast.success(data.message);
    } catch {
      toast.error('Failed to bookmark');
    }
  };

  const handleRate = async (rating) => {
    try {
      const { data } = await materialsAPI.rate(id, rating);
      setMaterial((prev) => ({
        ...prev,
        avg_rating: data.avg_rating,
        rating_count: data.rating_count,
        user_rating: data.user_rating,
      }));
      toast.success('Rating saved!');
    } catch {
      toast.error('Failed to rate');
    }
  };

  const handleLike = async () => {
    if (!user) return toast.error('Login to like');
    try {
      const { data } = await materialsAPI.toggleLike(id);
      setLiked(data.liked);
      setLikeCount(data.like_count);
    } catch {
      toast.error('Failed to like');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const { data } = await materialsAPI.addComment(id, newComment.trim());
      setComments((prev) => [data.comment, ...prev]);
      setNewComment('');
      toast.success('Comment added!');
    } catch {
      toast.error('Failed to add comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await materialsAPI.deleteComment(id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success('Comment deleted');
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500" />
      </div>
    );
  }

  if (!material) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg">Material not found</p>
        <Link to="/materials" className="inline-block mt-4 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">Browse Materials</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/materials" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <FiArrowLeft size={14} /> Back to Materials
      </Link>

      <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-6 sm:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getCategoryColor(material.category)}`}>
                {categoryLabels[material.category] || material.category}
              </span>
              {material.course_code && <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">{material.course_code}</span>}
              {material.semester && <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-teal-100 text-teal-700">Sem {material.semester}</span>}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-3">{material.title}</h1>
            {material.course_title && <p className="text-sm text-gray-500 mt-1">{material.course_title}</p>}
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <>
                <button
                  onClick={handleLike}
                  className={`p-2.5 rounded-lg border transition-colors ${liked
                      ? 'bg-rose-50 border-rose-200 text-rose-500'
                      : 'border-gray-200 text-gray-400 hover:text-rose-500 hover:border-rose-200'
                    }`}
                  title={liked ? 'Unlike' : 'Like'}
                >
                  <FiHeart size={18} className={liked ? 'fill-rose-500' : ''} />
                </button>
                <button
                  onClick={handleBookmark}
                  className={`p-2.5 rounded-lg border transition-colors ${material.is_bookmarked
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : 'border-gray-200 text-gray-400 hover:text-rose-600 hover:border-rose-200'
                    }`}
                  title={material.is_bookmarked ? 'Remove bookmark' : 'Bookmark'}
                >
                  <FiBookmark size={18} className={material.is_bookmarked ? 'fill-rose-600' : ''} />
                </button>
              </>
            )}
            <button onClick={handleDownload} className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2">
              <FiDownload size={18} />
              Download
            </button>
          </div>
        </div>

        {/* Rating */}
        {user && (
          <div className="mt-4">
            <StarRating
              rating={parseFloat(material.avg_rating) || 0}
              onRate={handleRate}
              userRating={material.user_rating}
              count={material.rating_count || 0}
            />
          </div>
        )}

        {/* Description */}
        {material.description && (
          <p className="text-gray-600 mt-4 leading-relaxed">{material.description}</p>
        )}

        {/* Meta info */}
        <div className="grid sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-start gap-3 text-sm text-gray-600">
            <FiFolder className="text-gray-400 mt-0.5" size={16} />
            <div>
              {material.is_common ? (
                <span className="inline-flex items-center gap-1">
                  Department: <strong className="text-emerald-600">Common for All Departments</strong>
                </span>
              ) : material.departments?.length > 0 ? (
                <div>
                  <span>Department{material.departments.length > 1 ? 's' : ''}:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {material.departments.map((d) => (
                      <span key={d.id} className="inline-block text-xs font-medium bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full">
                        {d.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <span>Department: <strong>{material.department_name}</strong></span>
              )}
            </div>
          </div>
          {material.subject_name && (
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <FiBookOpen className="text-gray-400" size={16} />
              <span>Subject: <strong>{material.subject_name}</strong></span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <FiUser className="text-gray-400" size={16} />
            <span>Uploaded by: <strong>{material.uploader_name || 'Anonymous'}</strong></span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <FiCalendar className="text-gray-400" size={16} />
            <span>{new Date(material.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <FiEye size={16} /> {material.view_count} views
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <FiDownload size={16} /> {material.download_count} downloads
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <FiHeart size={16} /> {likeCount} likes
          </div>
          <div className="text-sm text-gray-500">
            Size: {formatFileSize(material.file_size)}
          </div>
        </div>

        {/* Tags */}
        {material.tags?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 flex-wrap">
              <FiTag size={14} className="text-gray-400" />
              {material.tags.map((tag) => (
                <Link key={tag} to={`/materials?search=${encodeURIComponent(tag)}`} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full hover:bg-rose-50 hover:text-rose-700 transition-colors">
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Ask AI */}
        {user && (
          <div className="mt-6 pt-6 border-t border-gray-100 flex flex-wrap items-center gap-4">
            <Link
              to={`/chatbot?materialId=${material.id}&subject=${encodeURIComponent(material.subject_name || '')}&department=${encodeURIComponent(material.department_name || '')}`}
              className="inline-flex items-center gap-2 text-rose-600 hover:text-rose-700 font-medium text-sm"
            >
              <FiMessageSquare size={16} />
              Ask AI about this material
            </Link>
            <Link
              to={`/materials/${material.id}/ai`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-sm font-semibold rounded-xl hover:from-violet-600 hover:to-indigo-600 transition-all shadow-sm"
            >
              ⚡ AI Features (Score • Summary • Questions)
            </Link>
          </div>
        )}
      </div>

      {/* File Preview */}
      {material.file_type?.startsWith('image/') && (
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Preview</h3>
          <img src={material.file_url} alt={material.title} className="max-w-full rounded-lg" />
        </div>
      )}
      {material.file_type === 'application/pdf' && (
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Preview</h3>
          <iframe src={material.file_url} title={material.title} className="w-full h-[600px] rounded-lg border border-gray-200" />
        </div>
      )}

      {/* Related Materials */}
      {related.length > 0 && (
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4">Related Materials</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {related.map((r) => (
              <Link key={r.id} to={`/materials/${r.id}`} className="p-4 rounded-xl border border-rose-100 hover:border-rose-200 hover:bg-rose-50/30 transition-all group">
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getCategoryColor(r.category)}`}>{categoryLabels[r.category]}</span>
                <h4 className="font-medium text-gray-900 mt-2 line-clamp-2 group-hover:text-rose-600">{r.title}</h4>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  {r.subject_name && <span>{r.subject_name}</span>}
                  <span className="flex items-center gap-1"><FiDownload size={10} />{r.download_count}</span>
                  {parseFloat(r.avg_rating) > 0 && <span className="flex items-center gap-1"><FiStar size={10} className="text-amber-400" />{r.avg_rating}</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Comments Section */}
      <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-6">
        <h3 className="font-bold text-gray-900 mb-4">Comments ({comments.length})</h3>

        {/* Add comment form */}
        {user ? (
          <form onSubmit={handleAddComment} className="flex gap-3 mb-6">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shrink-0">
              <span className="text-white font-semibold text-xs">{user.name?.charAt(0)?.toUpperCase()}</span>
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                maxLength={1000}
                className="w-full px-4 py-2.5 pr-12 border border-rose-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
              <button type="submit" disabled={!newComment.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-rose-500 hover:text-rose-600 disabled:text-gray-300 transition-colors">
                <FiSend size={16} />
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-gray-400 mb-6">
            <Link to="/login" className="text-rose-500 hover:text-rose-600 font-medium">Login</Link> to add a comment.
          </p>
        )}

        {/* Comments list */}
        {commentsLoading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-rose-500" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No comments yet. Be the first to comment!</p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                  <span className="text-gray-600 font-semibold text-xs">{comment.user_name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{comment.user_name}</span>
                    <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleDateString()}</span>
                    {(user?.id === comment.user_id || user?.role === 'admin') && (
                      <button onClick={() => handleDeleteComment(comment.id)} className="ml-auto p-1 text-gray-300 hover:text-red-500 transition-colors">
                        <FiTrash2 size={13} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
