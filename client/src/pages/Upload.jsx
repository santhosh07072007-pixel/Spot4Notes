import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUploadCloud, FiFile, FiX, FiCheck, FiChevronDown } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { materialsAPI, departmentsAPI } from '../lib/api';

const categories = [
  { value: 'notes', label: 'Notes', emoji: '📝' },
  { value: 'question_papers', label: 'Question Papers', emoji: '📋' },
  { value: 'ppt', label: 'PPT / Presentation', emoji: '📊' },
  { value: 'important_questions', label: 'Important Questions', emoji: '⭐' },
  { value: 'study_materials', label: 'Study Materials', emoji: '📚' },
];

export default function Upload() {
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', category: '', subject: '', tags: '',
    course_code: '', course_title: '', year: '', semester: '',
  });
  const [selectedDeptIds, setSelectedDeptIds] = useState([]);
  const [isCommon, setIsCommon] = useState(false);
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
  const deptDropdownRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    departmentsAPI.getAll().then(({ data }) => setDepartments(data.departments)).catch(() => {});
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(e.target)) {
        setDeptDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDepartment = (deptId) => {
    setSelectedDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  const handleCommonToggle = () => {
    setIsCommon((prev) => {
      if (!prev) setSelectedDeptIds([]);
      return !prev;
    });
  };


  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFile = (selectedFile) => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (selectedFile.size > maxSize) {
      return toast.error('File size must be less than 50MB');
    }
    setFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Please select a file');
    if (!form.title) return toast.error('Please enter a title');
    if (!form.category) return toast.error('Please select a category');
    if (!isCommon && selectedDeptIds.length === 0) return toast.error('Please select at least one department or mark as common');

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('category', form.category);
      formData.append('is_common', isCommon);
      if (!isCommon) {
        formData.append('department_ids', selectedDeptIds.join(','));
      }
      if (form.subject) formData.append('subject', form.subject);
      if (form.tags) formData.append('tags', form.tags);
      if (form.course_code) formData.append('course_code', form.course_code);
      if (form.course_title) formData.append('course_title', form.course_title);
      if (form.year) formData.append('year', form.year);
      if (form.semester) formData.append('semester', form.semester);

      const { data } = await materialsAPI.upload(formData);
      toast.success(data.message || 'Upload successful!');
      navigate('/my-uploads');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload Material</h1>
        <p className="text-gray-500 mt-1">Share academic resources with your college peers</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`card border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
            dragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-300'
          }`}
          onClick={() => document.getElementById('file-input').click()}
        >
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FiFile className="text-primary-600" size={24} />
              <div className="text-left">
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="ml-4 text-gray-400 hover:text-red-500"
              >
                <FiX size={20} />
              </button>
            </div>
          ) : (
            <>
              <FiUploadCloud className="mx-auto text-gray-400 mb-3" size={40} />
              <p className="font-medium text-gray-600">Drop your file here, or click to browse</p>
              <p className="text-sm text-gray-400 mt-1">PDF, PPT, DOCX, or Images (max 50MB)</p>
            </>
          )}
          <input
            id="file-input"
            type="file"
            className="hidden"
            accept=".pdf,.ppt,.pptx,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif"
            onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            className="input-field"
            placeholder="e.g., Data Structures Unit 3 Notes"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="input-field"
            rows={3}
            placeholder="Brief description of the material..."
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setForm({ ...form, category: cat.value })}
                className={`p-3 rounded-lg border text-sm font-medium text-left transition-all ${
                  form.category === cat.value
                    ? 'border-primary-400 bg-primary-50 text-primary-700 ring-2 ring-primary-100'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="mr-1.5">{cat.emoji}</span>{cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Department & Subject */}
        <div className="space-y-4">
          {/* Common for All Departments toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCommonToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isCommon ? 'bg-primary-500' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isCommon ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
            <label className="text-sm font-medium text-gray-700 cursor-pointer" onClick={handleCommonToggle}>
              Common for All Departments
            </label>
            <span className="text-xs text-gray-400">(e.g., Tamil, English, Maths)</span>
          </div>

          {!isCommon && (
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Multi-select Department dropdown */}
              <div ref={deptDropdownRef} className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Departments *</label>
                <button
                  type="button"
                  onClick={() => setDeptDropdownOpen((prev) => !prev)}
                  className="input-field w-full text-left flex items-center justify-between"
                >
                  <span className={selectedDeptIds.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                    {selectedDeptIds.length === 0
                      ? 'Select Department(s)'
                      : `${selectedDeptIds.length} department${selectedDeptIds.length > 1 ? 's' : ''} selected`}
                  </span>
                  <FiChevronDown size={16} className={`text-gray-400 transition-transform ${deptDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {deptDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {departments.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDepartment(d.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-primary-50 transition-colors text-left"
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          selectedDeptIds.includes(d.id)
                            ? 'bg-primary-500 border-primary-500 text-white'
                            : 'border-gray-300'
                        }`}>
                          {selectedDeptIds.includes(d.id) && <FiCheck size={12} />}
                        </span>
                        <span className="text-gray-700">{d.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {/* Selected department tags */}
                {selectedDeptIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedDeptIds.map((id) => {
                      const dept = departments.find((d) => d.id === id);
                      return dept ? (
                        <span key={id} className="inline-flex items-center gap-1 text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-full">
                          {dept.name}
                          <button type="button" onClick={() => toggleDepartment(id)} className="hover:text-primary-900">
                            <FiX size={12} />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., Data Structures, OS"
                />
              </div>
            </div>
          )}

          {isCommon && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 text-sm text-primary-700">
              This material will be available to <strong>all departments</strong>. Ideal for common subjects like Tamil, English, Mathematics, etc.
            </div>
          )}
        </div>

        {/* Course Code, Course Title, Year, Semester */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Code</label>
            <input
              type="text"
              name="course_code"
              value={form.course_code}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g., CS3301"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Title</label>
            <input
              type="text"
              name="course_title"
              value={form.course_title}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g., Data Structures & Algorithms"
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select name="year" value={form.year} onChange={handleChange} className="input-field">
              <option value="">Select Year</option>
              <option value="1st">1st Year</option>
              <option value="2nd">2nd Year</option>
              <option value="3rd">3rd Year</option>
              <option value="4th">4th Year</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
            <select name="semester" value={form.semester} onChange={handleChange} className="input-field">
              <option value="">Select Semester</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
          <strong>Note:</strong> Your upload will be automatically scanned for inappropriate content.
          If approved, it will be visible to all students. If flagged, it will be reviewed by an admin.
        </div>

        {/* Submit */}
        <button type="submit" disabled={uploading} className="btn-primary w-full flex items-center justify-center gap-2">
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Uploading & Scanning...
            </>
          ) : (
            <>
              <FiUploadCloud size={18} />
              Upload Material
            </>
          )}
        </button>
      </form>
    </div>
  );
}
