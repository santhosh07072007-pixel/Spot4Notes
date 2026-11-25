import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import { departmentsAPI } from '../lib/api';

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    departmentsAPI.getAll()
      .then(({ data }) => setDepartments(data.departments))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
        <p className="text-gray-500 mt-1">Browse academic materials organized by department</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => (
          <Link
            key={dept.id}
            to={`/departments/${dept.slug}`}
            className="card p-6 flex items-start gap-4 hover:border-primary-200 group"
          >
            <div className="text-4xl">{dept.icon}</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                {dept.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{dept.description}</p>
              <div className="flex items-center gap-1 text-primary-600 text-sm font-medium mt-3">
                Explore <FiArrowRight size={14} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
