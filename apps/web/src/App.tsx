import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useUserStore } from './stores/userStore';

// Pages
import HomePage from './pages/HomePage';
import AuthCallback from './pages/AuthCallback';
import StudentDashboard from './pages/student/Dashboard';
import StudentAdventure from './pages/student/Adventure';
import StudentShop from './pages/student/Shop';
import StudentInventory from './pages/student/Inventory';
import StudentLeaderboard from './pages/student/Leaderboard';
import StudentAchievements from './pages/student/Achievements';
import StudentAvatar from './pages/student/Avatar';
import StudentClasses from './pages/student/Classes';
import StudentDailyTasks from './pages/student/DailyTasks';
import StudentExploration from './pages/student/Exploration';
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherQuestions from './pages/teacher/Questions';
import QuestionEditor from './pages/teacher/QuestionEditor';
import TeacherCurriculum from './pages/teacher/Curriculum';
import UnitDetail from './pages/teacher/UnitDetail';
import TeacherStudents from './pages/teacher/Students';
import StudentDetail from './pages/teacher/StudentDetail';
import TeacherClasses from './pages/teacher/Classes';
import TeacherClassDetail from './pages/teacher/ClassDetail';
import TeacherReports from './pages/teacher/Reports';
import TeacherStages from './pages/teacher/Stages';
import StageEditor from './pages/teacher/StageEditor';
import TeacherItems from './pages/teacher/Items';
import TeacherAnnouncements from './pages/teacher/Announcements';
import TeacherGameMaps from './pages/teacher/GameMaps';
import TeacherAvatarParts from './pages/teacher/AvatarParts';
import AdminUsers from './pages/admin/Users';

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4" />
      <p className="text-purple-600 font-medium">載入中...</p>
    </div>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: ('student' | 'teacher' | 'admin')[];
}) => {
  const { isAuthenticated, user, isLoading, token } = useUserStore();

  // Still loading or verifying token
  if (isLoading || (token && !user)) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (user && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    if (user.role === 'teacher' || user.role === 'admin') {
      return <Navigate to="/teacher/dashboard" replace />;
    }
    return <Navigate to="/student/dashboard" replace />;
  }

  return <>{children}</>;
};

// Placeholder components for routes not yet implemented
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-gray-700 mb-2">{title}</h1>
      <p className="text-gray-500">此頁面即將推出</p>
    </div>
  </div>
);

function App() {
  const { token, refreshUser } = useUserStore();
  const [isInitializing, setIsInitializing] = useState(true);

  // Check authentication on app load
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        await refreshUser();
      }
      setIsInitializing(false);
    };
    initAuth();
  }, []); // Only run once on mount

  // Show loading while checking initial auth state
  if (isInitializing && token) {
    return <LoadingSpinner />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Student Routes */}
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/adventure"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentAdventure />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/classes"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentClasses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/shop"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentShop />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/inventory"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentInventory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/avatar"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentAvatar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/achievements"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentAchievements />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/leaderboard"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentLeaderboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/daily-tasks"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDailyTasks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/exploration"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentExploration />
          </ProtectedRoute>
        }
      />

      {/* Teacher Routes */}
      <Route
        path="/teacher/dashboard"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/questions"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <TeacherQuestions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/questions/new"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <QuestionEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/questions/:id"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <QuestionEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/curriculum"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <TeacherCurriculum />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/curriculum/units/:unitId"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <UnitDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/classes"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <TeacherClasses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/classes/:classId"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <TeacherClassDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/students"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <TeacherStudents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/students/:studentId"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <StudentDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/reports"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <TeacherReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/stages"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <TeacherStages />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/stages/new"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <StageEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/stages/:id"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <StageEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/items"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <TeacherItems />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/announcements"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <TeacherAnnouncements />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/game-maps"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <TeacherGameMaps />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/avatar-parts"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <TeacherAvatarParts />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminUsers />
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
