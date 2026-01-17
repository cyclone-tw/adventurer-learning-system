import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUserStore } from '../stores/userStore';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setTokenAndRefresh, user } = useUserStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError('Google 登入失敗，請稍後再試');
        setTimeout(() => navigate('/'), 3000);
        return;
      }

      if (!token) {
        setError('無效的登入回應');
        setTimeout(() => navigate('/'), 3000);
        return;
      }

      try {
        await setTokenAndRefresh(token);
      } catch {
        setError('驗證失敗，請稍後再試');
        setTimeout(() => navigate('/'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, setTokenAndRefresh, navigate]);

  // Redirect after successful authentication
  useEffect(() => {
    if (user) {
      if (user.role === 'teacher' || user.role === 'admin') {
        navigate('/teacher/dashboard', { replace: true });
      } else {
        navigate('/student/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
      <div className="text-center">
        {error ? (
          <>
            <div className="text-red-500 text-xl mb-2">❌</div>
            <p className="text-red-600 font-medium">{error}</p>
            <p className="text-gray-500 text-sm mt-2">即將返回首頁...</p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4" />
            <p className="text-purple-600 font-medium">正在驗證身份...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
