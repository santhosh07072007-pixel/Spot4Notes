import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiFileText, FiHelpCircle, FiMonitor, FiStar, FiBookOpen, FiDownload, FiEye, FiHeart } from 'react-icons/fi';
import { departmentsAPI, materialsAPI } from '../lib/api';

const categories = [
  { key: 'notes', label: 'Notes', icon: FiFileText, color: 'text-blue-600 bg-blue-50' },
  { key: 'question_papers', label: 'Question Papers', icon: FiHelpCircle, color: 'text-orange-600 bg-orange-50' },
  { key: 'ppt', label: 'PPTs', icon: FiMonitor, color: 'text-purple-600 bg-purple-50' },
  { key: 'important_questions', label: 'Important Questions', icon: FiStar, color: 'text-red-600 bg-red-50' },
  { key: 'study_materials', label: 'Study Materials', icon: FiBookOpen, color: 'text-emerald-600 bg-emerald-50' },
];

const yearOptions = [
  { value: '', label: 'All Years' },
  { value: '1st', label: '1st Year' },
  { value: '2nd', label: '2nd Year' },
  { value: '3rd', label: '3rd Year' },
  { value: '4th', label: '4th Year' },
];

const semesterOptions = [
  { value: '', label: 'All Semesters' },
  { value: '1', label: 'Semester 1' },
  { value: '2', label: 'Semester 2' },
  { value: '3', label: 'Semester 3' },
  { value: '4', label: 'Semester 4' },
  { value: '5', label: 'Semester 5' },
  { value: '6', label: 'Semester 6' },
  { value: '7', label: 'Semester 7' },
  { value: '8', label: 'Semester 8' },
];

export default function DepartmentDetail() {
  const { slug } = useParams();
  const [department, setDepartment] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [materialCounts, setMaterialCounts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    departmentsAPI.getBySlug(slug)
      .then(({ data }) => {
        setDepartment(data.department);
        setSubjects(data.subjects);
        setMaterialCounts(data.materialCounts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!department) return;
    const params = { department_id: department.id };
    if (selectedCategory) params.category = selectedCategory;
    if (selectedSubject) params.subject_id = selectedSubject;
    if (selectedYear) params.year = selectedYear;
    if (selectedSemester) params.semester = selectedSemester;
    materialsAPI.getAll(params)
      .then(({ data }) => setMaterials(data.materials))
      .catch(() => {});
  }, [department, selectedCategory, selectedSubject, selectedYear, selectedSemester]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500" />
      </div>
    );
  }

  if (!department) {
    return <div className="text-center py-20 text-gray-500">Department not found</div>;
  }

  const getCount = (cat) => {
    const found = materialCounts.find((c) => c.category === cat);
    return found ? parseInt(found.count) : 0;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-6 sm:p-8 bg-gradient-to-r from-rose-50 to-pink-50">
        <div className="flex items-center gap-4">
          <div className="text-5xl">{department.icon}</div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{department.name}</h1>
            <p className="text-gray-600 mt-1">{department.description}</p>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(selectedCategory === cat.key ? null : cat.key)}
            className={`bg-white rounded-2xl border shadow-sm p-4 text-center transition-all ${
              selectedCategory === cat.key
                ? 'border-rose-300 ring-2 ring-rose-100'
                : 'border-rose-100 hover:border-rose-200'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg ${cat.color} flex items-center justify-center mx-auto mb-2`}>
              <cat.icon size={20} />
            </div>
            <h3 className="text-sm font-medium text-gray-800">{cat.label}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{getCount(cat.key)} files</p>
          </button>
        ))}
      </div>

      {/* Year & Semester filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 border border-rose-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500">
            {yearOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
          <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)}
            className="px-3 py-2 border border-rose-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500">
            {semesterOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Subjects filter */}
      {subjects.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Filter by Subject</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSubject(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !selectedSubject
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Subjects
            </button>
            {subjects.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubject(selectedSubject === sub.id ? null : sub.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedSubject === sub.id
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Materials list */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-4">
          Materials {selectedCategory && `· ${categories.find(c => c.key === selectedCategory)?.label}`}
        </h2>
        {materials.length === 0 ? (
          <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-12 text-center">
            <p className="text-gray-400 text-lg">No materials found</p>
            <p className="text-gray-400 text-sm mt-1">Be the first to upload!</p>
            <Link to="/upload" className="inline-block mt-4 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">Upload Material</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map((mat) => (
              <Link key={mat.id} to={`/materials/${mat.id}`} className="bg-white rounded-2xl border border-rose-100 shadow-sm p-5 hover:border-rose-200 hover:shadow-md transition-all group">
                <div className="flex items-start justify-between">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getCatColor(mat.category)}`}>
                    {categories.find(c => c.key === mat.category)?.label || mat.category}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(mat.created_at).toLocaleDateString()}</span>
                </div>
                <h3 className="font-semibold text-gray-900 mt-3 line-clamp-2 group-hover:text-rose-500 transition-colors">{mat.title}</h3>
                {mat.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{mat.description}</p>}
                <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                  {mat.subject_name && <span>{mat.subject_name}</span>}
                  {mat.semester && <span>Sem {mat.semester}</span>}
                  {mat.course_code && <span>{mat.course_code}</span>}
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><FiEye size={12} /> {mat.view_count}</span>
                  <span className="flex items-center gap-1"><FiDownload size={12} /> {mat.download_count}</span>
                  <span className="flex items-center gap-1"><FiHeart size={12} /> {mat.like_count || 0}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getCatColor(category) {
  const colors = {
    notes: 'bg-blue-100 text-blue-700',
    question_papers: 'bg-orange-100 text-orange-700',
    ppt: 'bg-purple-100 text-purple-700',
    important_questions: 'bg-red-100 text-red-700',
    study_materials: 'bg-emerald-100 text-emerald-700',
  };
  return colors[category] || 'bg-gray-100 text-gray-700';
}
