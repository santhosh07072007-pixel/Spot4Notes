import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiSearch, FiFilter, FiX, FiDownload, FiEye, FiHeart } from 'react-icons/fi';
import { materialsAPI, departmentsAPI } from '../lib/api';

const categoryOptions = [
  { value: '', label: 'All Categories' },
  { value: 'notes', label: 'Notes' },
  { value: 'question_papers', label: 'Question Papers' },
  { value: 'ppt', label: 'PPTs' },
  { value: 'important_questions', label: 'Important Questions' },
  { value: 'study_materials', label: 'Study Materials' },
];

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'popular', label: 'Most Downloads' },
  { value: 'views', label: 'Most Views' },
  { value: 'rating', label: 'Highest Rated' },
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

export default function Materials() {
  const [searchParams] = useSearchParams();
  const [materials, setMaterials] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [departmentId, setDepartmentId] = useState(searchParams.get('department_id') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [year, setYear] = useState(searchParams.get('year') || '');
  const [semester, setSemester] = useState(searchParams.get('semester') || '');
  const [courseCode, setCourseCode] = useState(searchParams.get('course_code') || '');

  useEffect(() => {
    departmentsAPI.getAll().then(({ data }) => setDepartments(data.departments)).catch(() => {});
  }, []);

  const fetchMaterials = useCallback(() => {
    setLoading(true);
    const params = { page, sort, limit: 12 };
    if (search) params.search = search;
    if (category) params.category = category;
    if (departmentId) params.department_id = departmentId;
    if (year) params.year = year;
    if (semester) params.semester = semester;
    if (courseCode) params.course_code = courseCode;

    materialsAPI.getAll(params)
      .then(({ data }) => {
        setMaterials(data.materials);
        setPagination(data.pagination);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, category, departmentId, sort, page, year, semester, courseCode]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setDepartmentId('');
    setSort('newest');
    setYear('');
    setSemester('');
    setCourseCode('');
    setPage(1);
  };

  const hasActiveFilters = search || category || departmentId || sort !== 'newest' || year || semester || courseCode;

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

  const categoryLabels = {
    notes: 'Notes', question_papers: 'Question Papers', ppt: 'PPTs',
    important_questions: 'Important Questions', study_materials: 'Study Materials',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Browse Materials</h1>
        <p className="text-gray-500 mt-1">Search and discover academic resources</p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-rose-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            placeholder="Search by title, course code, keyword, or subject..."
          />
        </div>
        <button type="submit" className="px-5 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">Search</button>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-3 border rounded-xl text-sm font-medium flex items-center gap-2 transition-colors ${showFilters ? 'bg-rose-50 border-rose-200 text-rose-600' : 'border-gray-200 text-gray-600 hover:bg-rose-50 hover:border-rose-200'}`}
        >
          <FiFilter size={16} />
          Filters
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-rose-500" />}
        </button>
      </form>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-5 animate-fadeIn">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}
                className="w-full px-3 py-2.5 border border-rose-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500">
                <option value="">All Departments</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                className="w-full px-3 py-2.5 border border-rose-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500">
                {categoryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select value={sort} onChange={(e) => setSort(e.target.value)}
                className="w-full px-3 py-2.5 border border-rose-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500">
                {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select value={year} onChange={(e) => { setYear(e.target.value); setPage(1); }}
                className="w-full px-3 py-2.5 border border-rose-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500">
                {yearOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
              <select value={semester} onChange={(e) => { setSemester(e.target.value); setPage(1); }}
                className="w-full px-3 py-2.5 border border-rose-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500">
                {semesterOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course Code</label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => { setCourseCode(e.target.value); setPage(1); }}
                placeholder="e.g., CS3401"
                className="w-full px-3 py-2.5 border border-rose-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-red-600 mt-4 hover:text-red-700 font-medium">
              <FiX size={14} /> Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500" />
        </div>
      ) : materials.length === 0 ? (
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-12 text-center">
          <p className="text-gray-400 text-lg">No materials found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">{pagination.total} material{pagination.total !== 1 ? 's' : ''} found</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map((mat) => (
              <Link key={mat.id} to={`/materials/${mat.id}`} className="bg-white rounded-2xl border border-rose-100 shadow-sm p-5 hover:border-rose-200 hover:shadow-md transition-all group">
                <div className="flex items-start justify-between">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getCategoryColor(mat.category)}`}>
                    {categoryLabels[mat.category] || mat.category}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(mat.created_at).toLocaleDateString()}</span>
                </div>
                <h3 className="font-semibold text-gray-900 mt-3 line-clamp-2 group-hover:text-rose-500 transition-colors">{mat.title}</h3>
                {mat.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{mat.description}</p>}
                <div className="flex items-center gap-2 mt-3 text-xs text-gray-400 flex-wrap">
                  {mat.is_common ? (
                    <span className="text-emerald-600 font-medium">All Departments</span>
                  ) : mat.departments?.length > 1 ? (
                    <span>{mat.departments.map((d) => d.name).join(', ')}</span>
                  ) : (
                    <span>{mat.department_name}</span>
                  )}
                  {mat.semester && <span>Sem {mat.semester}</span>}
                  {mat.course_code && <span>{mat.course_code}</span>}
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><FiEye size={12} /> {mat.view_count}</span>
                  <span className="flex items-center gap-1"><FiDownload size={12} /> {mat.download_count}</span>
                  <span className="flex items-center gap-1"><FiHeart size={12} /> {mat.like_count || 0}</span>
                </div>
                {mat.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {mat.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-rose-200 text-sm font-medium rounded-xl text-gray-600 hover:bg-rose-50 disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                disabled={page === pagination.pages}
                className="px-4 py-2 border border-rose-200 text-sm font-medium rounded-xl text-gray-600 hover:bg-rose-50 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
