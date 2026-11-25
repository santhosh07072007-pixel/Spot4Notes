import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi';
import { authAPI } from '../lib/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    authAPI.verifyEmail(token)
      .then(({ data }) => {
        setStatus('success');
        setMessage(data.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed');
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="card p-8">
          {status === 'verifying' && (
            <>
              <FiLoader className="animate-spin mx-auto text-primary-600 mb-4" size={48} />
              <h2 className="text-xl font-bold text-gray-900">Verifying your email...</h2>
              <p className="text-gray-500 mt-2">Please wait</p>
            </>
          )}
          {status === 'success' && (
            <>
              <FiCheckCircle className="mx-auto text-emerald-500 mb-4" size={48} />
              <h2 className="text-xl font-bold text-gray-900">Email Verified!</h2>
              <p className="text-gray-500 mt-2">{message}</p>
              <Link to="/login" className="btn-primary inline-block mt-6">Go to Login</Link>
            </>
          )}
          {status === 'error' && (
            <>
              <FiXCircle className="mx-auto text-red-500 mb-4" size={48} />
              <h2 className="text-xl font-bold text-gray-900">Verification Failed</h2>
              <p className="text-gray-500 mt-2">{message}</p>
              <Link to="/login" className="btn-primary inline-block mt-6">Go to Login</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
