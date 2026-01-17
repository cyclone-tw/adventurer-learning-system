import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Swords, BookOpen, Sparkles } from 'lucide-react';
import { Button, Card } from '../components/ui';
import { useUserStore } from '../stores/userStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const HomePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register, isLoading, isAuthenticated, user } = useUserStore();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [error, setError] = useState('');

  // Handle OAuth error from URL
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'google_auth_failed') {
      setError('Google 登入失敗，請稍後再試');
    }
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'teacher') {
        navigate('/teacher/dashboard', { replace: true });
      } else {
        navigate('/student/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    classJoinCode: '',
  });

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/api/v1/auth/google`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isLoginMode) {
        await login(formData.email, formData.password);
      } else {
        // Students only - teachers are created by admin
        await register(
          formData.email,
          formData.password,
          formData.displayName,
          'student',
          formData.classJoinCode || undefined
        );
      }

      // Navigate based on role (will be determined after login)
      const user = useUserStore.getState().user;
      if (user?.role === 'teacher') {
        navigate('/teacher/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      setError((err as { message?: string })?.message || '操作失敗，請稍後再試');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl mb-4">
            <Swords className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">冒險者學習系統</h1>
          <p className="text-white/80 flex items-center justify-center gap-2">
            <BookOpen className="w-4 h-4" />
            透過冒險學習，用遊戲征服知識
            <Sparkles className="w-4 h-4" />
          </p>
        </div>

        {/* Login/Register Card */}
        <Card variant="elevated" padding="lg" className="backdrop-blur-sm">
          <div className="flex mb-6">
            <button
              className={`flex-1 py-2 text-center font-medium transition-colors ${
                isLoginMode
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-400 border-b-2 border-transparent'
              }`}
              onClick={() => setIsLoginMode(true)}
            >
              登入
            </button>
            <button
              className={`flex-1 py-2 text-center font-medium transition-colors ${
                !isLoginMode
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-400 border-b-2 border-transparent'
              }`}
              onClick={() => setIsLoginMode(false)}
            >
              註冊
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLoginMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  顯示名稱
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="你的冒險者名稱"
                  required={!isLoginMode}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                電子郵件
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                密碼
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            {!isLoginMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  班級代碼（選填）
                </label>
                <input
                  type="text"
                  value={formData.classJoinCode}
                  onChange={(e) =>
                    setFormData({ ...formData, classJoinCode: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="ABC123"
                />
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {isLoginMode ? '登入開始冒險' : '創建冒險者帳號'}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">或</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-gray-700 font-medium">使用 Google 帳號{isLoginMode ? '登入' : '註冊'}</span>
            </button>
          </form>
        </Card>

        {/* Footer */}
        <p className="text-center text-white/60 text-sm mt-6">
          Adventurer Learning System v1.0.0
        </p>
      </div>
    </div>
  );
};

export default HomePage;
