import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  FileQuestion,
  FolderTree,
  Users,
  GraduationCap,
  FileBarChart,
  Settings,
  LogOut,
  Shield,
  UserCog,
  Map,
  Compass,
  Package,
  Megaphone,
  Palette,
} from 'lucide-react';
import { useUserStore } from '../../stores/userStore';

interface TeacherLayoutProps {
  children: ReactNode;
}

const teacherNavItems = [
  { path: '/teacher/dashboard', icon: LayoutDashboard, label: '儀表板' },
  { path: '/teacher/curriculum', icon: FolderTree, label: '課程管理' },
  { path: '/teacher/questions', icon: FileQuestion, label: '題目管理' },
  { path: '/teacher/stages', icon: Map, label: '關卡管理' },
  { path: '/teacher/game-maps', icon: Compass, label: '地圖管理' },
  { path: '/teacher/items', icon: Package, label: '商品管理' },
  { path: '/teacher/avatar-parts', icon: Palette, label: '角色部件' },
  { path: '/teacher/announcements', icon: Megaphone, label: '公告管理' },
  { path: '/teacher/classes', icon: Users, label: '班級管理' },
  { path: '/teacher/students', icon: GraduationCap, label: '學生管理' },
  { path: '/teacher/reports', icon: FileBarChart, label: '報表中心' },
];

const adminNavItems = [
  { path: '/admin/users', icon: UserCog, label: '使用者管理' },
];

const TeacherLayout = ({ children }: TeacherLayoutProps) => {
  const location = useLocation();
  const { user, logout } = useUserStore();

  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin
    ? [...teacherNavItems, ...adminNavItems]
    : teacherNavItems;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top App Bar */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                A
              </div>
              <div>
                <h1 className="font-bold text-gray-800">冒險者學習系統</h1>
                <p className="text-xs text-gray-500">
                  {isAdmin ? '管理員後台' : '教師管理後台'}
                </p>
              </div>
            </div>

            {/* Right: User Menu */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="font-medium text-gray-800">
                  {user?.displayName || '教師'}
                </div>
                <div className="text-xs text-gray-500">{user?.email}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                {user?.displayName?.[0] || 'T'}
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
        <nav className="hidden md:flex flex-col w-64 bg-white min-h-[calc(100vh-64px)] border-r border-gray-200">
          <div className="flex-1 py-4">
            {navItems.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname.startsWith(path);
              return (
                <Link
                  key={path}
                  to={path}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all',
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          {/* Bottom Settings */}
          <div className="border-t border-gray-200 py-4">
            <Link
              to="/teacher/settings"
              className="flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-all"
            >
              <Settings className="w-5 h-5" />
              <span>設定</span>
            </Link>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around py-2">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                className={clsx(
                  'flex flex-col items-center py-1 px-2 rounded-lg transition-all',
                  isActive ? 'text-blue-700' : 'text-gray-500'
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

export default TeacherLayout;
