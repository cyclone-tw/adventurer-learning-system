import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Home,
  Map,
  Compass,
  ShoppingBag,
  Package,
  User,
  Trophy,
  Award,
  LogOut,
  Users,
  ClipboardList,
} from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { ProgressBar } from '../ui';

interface StudentLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/student/dashboard', icon: Home, label: '首頁' },
  { path: '/student/adventure', icon: Map, label: '冒險' },
  { path: '/student/exploration', icon: Compass, label: '探索' },
  { path: '/student/daily-tasks', icon: ClipboardList, label: '任務' },
  { path: '/student/classes', icon: Users, label: '班級' },
  { path: '/student/shop', icon: ShoppingBag, label: '商店' },
  { path: '/student/inventory', icon: Package, label: '道具' },
  { path: '/student/avatar', icon: User, label: '角色' },
  { path: '/student/achievements', icon: Award, label: '成就' },
  { path: '/student/leaderboard', icon: Trophy, label: '排行' },
];

const StudentLayout = ({ children }: StudentLayoutProps) => {
  const location = useLocation();
  const { user, logout } = useUserStore();
  const profile = user?.studentProfile;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
      {/* Top Status Bar */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Avatar & Level */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                {user?.displayName?.[0] || '?'}
              </div>
              <div>
                <div className="font-semibold text-gray-800">
                  Lv.{profile?.level || 1} {user?.displayName || '冒險者'}
                </div>
                <div className="w-32">
                  <ProgressBar
                    value={profile?.exp || 0}
                    max={profile?.expToNextLevel || 100}
                    color="purple"
                    size="sm"
                  />
                </div>
              </div>
            </div>

            {/* Right: Gold & Actions */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-full">
                <span className="text-yellow-600">💰</span>
                <span className="font-semibold text-yellow-700">
                  {profile?.gold || 0}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="登出"
              >
                <LogOut className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Side Navigation */}
        <nav className="hidden md:flex flex-col w-20 bg-white/60 backdrop-blur-sm min-h-[calc(100vh-64px)] py-4">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={clsx(
                  'flex flex-col items-center py-3 px-2 mx-2 rounded-xl transition-all',
                  isActive
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs mt-1">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-gray-200 z-50">
        <div className="flex justify-around py-2">
          {navItems.slice(0, 5).map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={clsx(
                  'flex flex-col items-center py-1 px-3 rounded-lg transition-all',
                  isActive ? 'text-purple-700' : 'text-gray-500'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs mt-0.5">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default StudentLayout;
