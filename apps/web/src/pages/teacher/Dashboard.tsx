import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileQuestion,
  TrendingUp,
  AlertCircle,
  Map,
  BookOpen,
  ChevronRight,
  BarChart3,
  Target,
} from 'lucide-react';
import { TeacherLayout } from '../../components/layout';
import { Card, Button } from '../../components/ui';
import { useUserStore } from '../../stores/userStore';
import { reportService, DashboardStats } from '../../services/reports';

const TeacherDashboard = () => {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportService.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
      setError('無法載入儀表板數據');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: '班級數',
      value: stats?.overview.totalClasses || 0,
      icon: Users,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      link: '/teacher/classes',
    },
    {
      label: '學生人數',
      value: stats?.overview.totalStudents || 0,
      icon: Users,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      link: '/teacher/students',
    },
    {
      label: '題目數量',
      value: stats?.overview.totalQuestions || 0,
      icon: FileQuestion,
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      link: '/teacher/questions',
    },
    {
      label: '今日答題',
      value: stats?.overview.todayAttempts || 0,
      icon: TrendingUp,
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      link: '/teacher/reports',
    },
  ];

  // Calculate max attempts for chart scaling
  const maxAttempts = stats?.weeklyTrend?.length
    ? Math.max(...stats.weeklyTrend.map((d) => d.attempts), 1)
    : 1;

  // Get day names for chart
  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    return days[date.getDay()];
  };

  return (
    <TeacherLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Welcome Banner */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            歡迎回來，{user?.displayName || '老師'}！
          </h1>
          <p className="text-gray-500">這是您的班級概況</p>
        </div>

        {/* Error State */}
        {error && (
          <Card variant="outlined" className="bg-red-50 border-red-200">
            <div className="flex items-center justify-between">
              <p className="text-red-600">{error}</p>
              <Button variant="secondary" size="sm" onClick={loadDashboardStats}>
                重新載入
              </Button>
            </div>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, bgColor, textColor, link }) => (
            <Card
              key={label}
              variant="elevated"
              padding="lg"
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(link)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{label}</p>
                  {loading ? (
                    <div className="h-9 w-16 bg-gray-200 animate-pulse rounded mt-1" />
                  ) : (
                    <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
                  )}
                </div>
                <div className={`p-3 rounded-lg ${bgColor}`}>
                  <Icon className={`w-6 h-6 ${textColor}`} />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Overall Stats Bar */}
        {!loading && stats && (
          <Card variant="elevated" padding="lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-800">
                  {stats.overview.totalAttempts.toLocaleString()}
                </div>
                <p className="text-sm text-gray-500">總答題次數</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {stats.overview.correctRate}%
                </div>
                <p className="text-sm text-gray-500">平均正確率</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {stats.overview.todayAttempts}
                </div>
                <p className="text-sm text-gray-500">今日答題</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {stats.classes.length}
                </div>
                <p className="text-sm text-gray-500">班級總數</p>
              </div>
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-bold mb-4">快速操作</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => navigate('/teacher/questions/new')}>
              <FileQuestion className="w-4 h-4 mr-2" />
              新增題目
            </Button>
            <Button variant="secondary" onClick={() => navigate('/teacher/classes')}>
              <Users className="w-4 h-4 mr-2" />
              建立班級
            </Button>
            <Button variant="secondary" onClick={() => navigate('/teacher/stages/new')}>
              <Map className="w-4 h-4 mr-2" />
              建立關卡
            </Button>
            <Button variant="secondary" onClick={() => navigate('/teacher/reports')}>
              <BarChart3 className="w-4 h-4 mr-2" />
              查看報表
            </Button>
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card variant="elevated" padding="lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">最近活動</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/teacher/reports')}>
                查看全部
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : stats && stats.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {stats.recentActivity.map((activity) => (
                  <div
                    key={activity._id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {activity.student.name?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{activity.student.name}</span>
                        <span className={activity.isCorrect ? 'text-green-600' : 'text-red-500'}>
                          {activity.isCorrect ? ' 答對 ' : ' 答錯 '}
                        </span>
                        <span className="text-gray-500">了一題</span>
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {activity.question.text}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {activity.isCorrect ? (
                        <span className="text-xs text-green-600 font-medium">
                          +{activity.expGained} XP
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">✗</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>尚無活動記錄</p>
                <p className="text-sm mt-1">學生開始答題後將顯示在這裡</p>
              </div>
            )}
          </Card>

          {/* Students Needing Attention */}
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-bold">需要關注的學生</h2>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : stats &&
              stats.studentsNeedingAttention &&
              stats.studentsNeedingAttention.length > 0 ? (
              <div className="space-y-2">
                {stats.studentsNeedingAttention.map((student) => (
                  <div
                    key={student._id}
                    className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
                    onClick={() => navigate(`/teacher/students/${student._id}`)}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {student.name?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800">{student.name}</p>
                      <p className="text-sm text-orange-600">
                        正確率 {student.correctRate}% ({student.correct}/{student.attempts} 題)
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-orange-400" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Target className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>目前沒有需要特別關注的學生</p>
                <p className="text-sm mt-1 text-gray-400">
                  系統會自動標記正確率低於 50% 的學生
                </p>
              </div>
            )}
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Classes Overview */}
          <Card variant="elevated" padding="lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">班級列表</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/teacher/classes')}>
                查看全部
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : stats && stats.classes.length > 0 ? (
              <div className="space-y-3">
                {stats.classes.slice(0, 5).map((classItem) => (
                  <div
                    key={classItem._id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => navigate(`/teacher/classes/${classItem._id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{classItem.name}</p>
                        <p className="text-sm text-gray-500">
                          {classItem.studentCount} 位學生
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>尚無班級</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate('/teacher/classes')}
                >
                  建立班級
                </Button>
              </div>
            )}
          </Card>

          {/* Performance Stats */}
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-bold">學習目標</h2>
            </div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : stats && stats.overview.totalAttempts > 0 ? (
              <div className="space-y-4">
                {/* Correct Rate Goal */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">正確率目標 80%</span>
                    <span className="text-sm font-medium">
                      {stats.overview.correctRate}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        stats.overview.correctRate >= 80
                          ? 'bg-green-500'
                          : stats.overview.correctRate >= 60
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(stats.overview.correctRate, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Daily Activity Goal */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">今日答題目標 50 題</span>
                    <span className="text-sm font-medium">
                      {stats.overview.todayAttempts} / 50
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        stats.overview.todayAttempts >= 50
                          ? 'bg-green-500'
                          : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${Math.min((stats.overview.todayAttempts / 50) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Student Engagement */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">學生參與度</span>
                    <span className="text-sm font-medium">
                      {stats.overview.totalStudents > 0
                        ? Math.round(
                            (stats.overview.todayAttempts / stats.overview.totalStudents) * 10
                          ) / 10
                        : 0}{' '}
                      題/人
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          ((stats.overview.todayAttempts /
                            Math.max(stats.overview.totalStudents, 1)) /
                            5) *
                            100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Target className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>開始答題後將顯示學習目標進度</p>
              </div>
            )}
          </Card>
        </div>

        {/* Weekly Trend Chart */}
        <Card variant="elevated" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">本週答題趨勢</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/teacher/reports')}>
              詳細報表
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          {loading ? (
            <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />
          ) : stats && stats.weeklyTrend && stats.weeklyTrend.length > 0 ? (
            <div className="h-64">
              {/* Simple Bar Chart */}
              <div className="flex items-end justify-between h-48 gap-2 px-4">
                {stats.weeklyTrend.map((day, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    {/* Bar */}
                    <div className="w-full flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-500">{day.attempts}</span>
                      <div
                        className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all hover:from-blue-600 hover:to-blue-500"
                        style={{
                          height: `${Math.max((day.attempts / maxAttempts) * 150, 4)}px`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {/* X-axis labels */}
              <div className="flex justify-between px-4 mt-2 border-t pt-2">
                {stats.weeklyTrend.map((day, index) => (
                  <div key={index} className="flex-1 text-center">
                    <span className="text-xs text-gray-500">
                      週{getDayName(day.date)}
                    </span>
                    <div className="text-xs text-green-600 font-medium">
                      {day.correctRate}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center text-gray-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>學生開始答題後將顯示趨勢圖表</p>
              </div>
            </div>
          )}
        </Card>

      </div>
    </TeacherLayout>
  );
};

export default TeacherDashboard;
