import { Sword, BookOpen, Target, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StudentLayout } from '../../components/layout';
import { Card, Button, ProgressBar } from '../../components/ui';
import { AnnouncementBanner } from '../../components/student';
import { useUserStore } from '../../stores/userStore';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const profile = user?.studentProfile;

  const subjects = [
    { id: 'math', name: '數學', icon: '🔢', color: 'blue' },
    { id: 'chinese', name: '國語', icon: '📖', color: 'red' },
    { id: 'english', name: '英語', icon: '🔤', color: 'green' },
    { id: 'science', name: '自然', icon: '🔬', color: 'purple' },
  ];

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-6">
        {/* Welcome Banner */}
        <Card
          variant="elevated"
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">
                歡迎回來，{user?.displayName || '冒險者'}！
              </h1>
              <p className="text-white/80">準備好今天的冒險了嗎？</p>
            </div>
            <div className="hidden sm:block">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <Sword className="w-10 h-10" />
              </div>
            </div>
          </div>
        </Card>

        {/* Announcements & Promotions */}
        <AnnouncementBanner maxItems={3} showPromotions={true} />

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card variant="outlined" className="text-center">
            <div className="text-3xl mb-1">⚔️</div>
            <div className="text-2xl font-bold text-purple-600">
              Lv.{profile?.level || 1}
            </div>
            <div className="text-sm text-gray-500">等級</div>
          </Card>
          <Card variant="outlined" className="text-center">
            <div className="text-3xl mb-1">✨</div>
            <div className="text-2xl font-bold text-blue-600">
              {profile?.exp || 0}
            </div>
            <div className="text-sm text-gray-500">經驗值</div>
          </Card>
          <Card variant="outlined" className="text-center">
            <div className="text-3xl mb-1">💰</div>
            <div className="text-2xl font-bold text-yellow-600">
              {profile?.gold || 0}
            </div>
            <div className="text-sm text-gray-500">金幣</div>
          </Card>
          <Card variant="outlined" className="text-center">
            <div className="text-3xl mb-1">🔥</div>
            <div className="text-2xl font-bold text-orange-600">0</div>
            <div className="text-sm text-gray-500">連續天數</div>
          </Card>
        </div>

        {/* Quick Start */}
        <Card variant="elevated" padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold">快速開始答題</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => navigate(`/student/adventure?subject=${subject.id}`)}
                className="p-4 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all text-center"
              >
                <div className="text-3xl mb-2">{subject.icon}</div>
                <div className="font-medium">{subject.name}</div>
              </button>
            ))}
          </div>
        </Card>

        {/* Today's Progress */}
        <Card variant="elevated" padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold">今日進度</h2>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>每日答題目標</span>
                <span className="text-purple-600">0 / 10 題</span>
              </div>
              <ProgressBar value={0} max={10} color="purple" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>經驗值進度</span>
                <span className="text-blue-600">
                  {profile?.exp || 0} / {profile?.expToNextLevel || 100}
                </span>
              </div>
              <ProgressBar
                value={profile?.exp || 0}
                max={profile?.expToNextLevel || 100}
                color="blue"
              />
            </div>
          </div>
        </Card>

        {/* Leaderboard Preview */}
        <Card variant="elevated" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-bold">排行榜</h2>
            </div>
            <Button variant="ghost" size="sm">
              查看全部
            </Button>
          </div>
          <div className="text-center text-gray-500 py-8">
            <Trophy className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>尚無排行資料</p>
            <p className="text-sm">開始答題成為第一名吧！</p>
          </div>
        </Card>
      </div>
    </StudentLayout>
  );
};

export default StudentDashboard;
