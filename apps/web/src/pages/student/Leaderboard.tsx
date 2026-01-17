import { useState, useEffect } from 'react';
import {
  Trophy,
  Star,
  Coins,
  Target,
  TrendingUp,
  Crown,
  Users,
  Globe,
} from 'lucide-react';
import { StudentLayout } from '../../components/layout';
import { Card } from '../../components/ui';
import {
  leaderboardService,
  LeaderboardType,
  LeaderboardPeriod,
  LeaderboardEntry,
  MyRanksResponse,
  LEADERBOARD_TYPE_NAMES,
  PERIOD_NAMES,
} from '../../services/leaderboard';
import { classService, MyClassItem } from '../../services/classes';

const Leaderboard = () => {
  const [type, setType] = useState<LeaderboardType>('exp');
  const [period, setPeriod] = useState<LeaderboardPeriod>('all');
  const [classId, setClassId] = useState<string>(''); // Empty = global
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<LeaderboardEntry | null>(null);
  const [myRanks, setMyRanks] = useState<MyRanksResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // My classes
  const [myClasses, setMyClasses] = useState<MyClassItem[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);

  // Load leaderboard
  useEffect(() => {
    loadLeaderboard();
  }, [type, period, classId]);

  // Load my ranks and classes on mount
  useEffect(() => {
    loadMyRanks();
    loadMyClasses();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await leaderboardService.getLeaderboard({
        type,
        period,
        classId: classId || undefined,
        limit: 50,
      });
      setLeaderboard(data.leaderboard);
      setCurrentUser(data.currentUser);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyRanks = async () => {
    try {
      const data = await leaderboardService.getMyRanks();
      setMyRanks(data);
    } catch (error) {
      console.error('Failed to load my ranks:', error);
    }
  };

  const loadMyClasses = async () => {
    setClassesLoading(true);
    try {
      const data = await classService.getMyClasses();
      setMyClasses(data);
    } catch (error) {
      console.error('Failed to load my classes:', error);
    } finally {
      setClassesLoading(false);
    }
  };

  // Get icon for type
  const getTypeIcon = (t: LeaderboardType) => {
    switch (t) {
      case 'exp':
        return <Star className="w-4 h-4" />;
      case 'level':
        return <TrendingUp className="w-4 h-4" />;
      case 'gold':
        return <Coins className="w-4 h-4" />;
      case 'correctRate':
        return <Target className="w-4 h-4" />;
      case 'questionsAnswered':
        return <Trophy className="w-4 h-4" />;
    }
  };

  // Format value based on type
  const formatValue = (value: number, t: LeaderboardType) => {
    if (t === 'correctRate') return `${value}%`;
    return value.toLocaleString();
  };

  // Get selected class name
  const selectedClassName = classId
    ? myClasses.find((c) => c._id === classId)?.name || '班級'
    : '全站';

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto pb-20 md:pb-6 space-y-6">
        {/* Header */}
        <Card
          variant="elevated"
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
              <Trophy className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">排行榜</h1>
              <p className="text-white/80">和其他冒險者比較成績！</p>
            </div>
            {/* Class/Global Toggle */}
            <div className="hidden sm:flex items-center gap-2 bg-white/20 rounded-lg p-1">
              <button
                onClick={() => setClassId('')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  !classId ? 'bg-white text-amber-600' : 'text-white/80 hover:text-white'
                }`}
              >
                <Globe className="w-4 h-4" />
                全站
              </button>
              {myClasses.length > 0 && (
                <button
                  onClick={() => setClassId(myClasses[0]._id)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    classId ? 'bg-white text-amber-600' : 'text-white/80 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  班級
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* My Ranks Summary */}
        {myRanks && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <RankCard
              icon={<Star className="w-5 h-5 text-amber-500" />}
              label="經驗值"
              rank={myRanks.ranks.exp.rank}
              total={myRanks.ranks.exp.total}
              isActive={type === 'exp'}
              onClick={() => setType('exp')}
            />
            <RankCard
              icon={<TrendingUp className="w-5 h-5 text-purple-500" />}
              label="等級"
              rank={myRanks.ranks.level.rank}
              total={myRanks.ranks.level.total}
              isActive={type === 'level'}
              onClick={() => setType('level')}
            />
            <RankCard
              icon={<Coins className="w-5 h-5 text-yellow-500" />}
              label="金幣"
              rank={myRanks.ranks.gold.rank}
              total={myRanks.ranks.gold.total}
              isActive={type === 'gold'}
              onClick={() => setType('gold')}
            />
            <RankCard
              icon={<Target className="w-5 h-5 text-green-500" />}
              label="正確率"
              rank={myRanks.ranks.correctRate.rank}
              total={myRanks.ranks.correctRate.total}
              isActive={type === 'correctRate'}
              onClick={() => setType('correctRate')}
            />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Class Filter (Mobile) */}
          {myClasses.length > 0 && (
            <div className="sm:hidden w-full">
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-100 border-0 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-amber-500"
              >
                <option value="">全站排行</option>
                {myClasses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} 班級排行
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Class Filter (Desktop) */}
          {myClasses.length > 0 && (
            <div className="hidden sm:flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setClassId('')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  !classId
                    ? 'bg-white text-amber-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Globe className="w-4 h-4" />
                全站
              </button>
              {myClasses.map((c) => (
                <button
                  key={c._id}
                  onClick={() => setClassId(c._id)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    classId === c._id
                      ? 'bg-white text-amber-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {/* Type Filter */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
            {(
              ['exp', 'level', 'gold', 'correctRate', 'questionsAnswered'] as LeaderboardType[]
            ).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  type === t
                    ? 'bg-white text-amber-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {getTypeIcon(t)}
                <span className="hidden sm:inline">{LEADERBOARD_TYPE_NAMES[t]}</span>
              </button>
            ))}
          </div>

          {/* Period Filter */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['all', 'monthly', 'weekly', 'daily'] as LeaderboardPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-white text-amber-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {PERIOD_NAMES[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Current Scope Indicator */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-md font-medium">
            {selectedClassName}
          </span>
          <span>·</span>
          <span>{LEADERBOARD_TYPE_NAMES[type]}</span>
          <span>·</span>
          <span>{PERIOD_NAMES[period]}</span>
        </div>

        {/* Leaderboard */}
        <Card variant="elevated" padding="none">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent mx-auto mb-4" />
              <p className="text-gray-500">載入排行榜...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">尚無排行資料</p>
              <p className="text-sm text-gray-400 mt-1">
                {classId ? '此班級尚無答題記錄' : '開始答題累積成績吧！'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {/* Top 3 Special Display */}
              {leaderboard.slice(0, 3).length > 0 && (
                <div className="p-4 bg-gradient-to-b from-amber-50 to-white">
                  <div className="flex items-end justify-center gap-4">
                    {/* 2nd Place */}
                    {leaderboard[1] && (
                      <TopThreeCard
                        entry={leaderboard[1]}
                        type={type}
                        position={2}
                        formatValue={formatValue}
                      />
                    )}
                    {/* 1st Place */}
                    {leaderboard[0] && (
                      <TopThreeCard
                        entry={leaderboard[0]}
                        type={type}
                        position={1}
                        formatValue={formatValue}
                      />
                    )}
                    {/* 3rd Place */}
                    {leaderboard[2] && (
                      <TopThreeCard
                        entry={leaderboard[2]}
                        type={type}
                        position={3}
                        formatValue={formatValue}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Rest of the leaderboard */}
              {leaderboard.slice(3).map((entry) => (
                <LeaderboardRow
                  key={entry._id}
                  entry={entry}
                  type={type}
                  formatValue={formatValue}
                />
              ))}

              {/* Current user if not in list */}
              {currentUser && !leaderboard.some((e) => e.isCurrentUser) && (
                <>
                  <div className="px-4 py-2 bg-gray-50 text-center text-sm text-gray-500">
                    • • •
                  </div>
                  <LeaderboardRow
                    entry={currentUser}
                    type={type}
                    formatValue={formatValue}
                    highlighted
                  />
                </>
              )}
            </div>
          )}
        </Card>

        {/* Tips */}
        {!classesLoading && myClasses.length === 0 && (
          <Card variant="outlined" className="bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-800">加入班級</h3>
                <p className="text-sm text-blue-700 mt-1">
                  加入班級後可以查看班級排行，與同學一起競爭！
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </StudentLayout>
  );
};

// Rank Card Component
const RankCard = ({
  icon,
  label,
  rank,
  total,
  isActive,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  rank: number;
  total: number;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`p-3 rounded-xl text-left transition-all ${
      isActive
        ? 'bg-amber-50 border-2 border-amber-300 shadow-sm'
        : 'bg-white border border-gray-200 hover:border-amber-200'
    }`}
  >
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <span className="text-sm text-gray-600">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-2xl font-bold text-gray-900">#{rank}</span>
      <span className="text-xs text-gray-400">/ {total}</span>
    </div>
  </button>
);

// Top 3 Card Component
const TopThreeCard = ({
  entry,
  type,
  position,
  formatValue,
}: {
  entry: LeaderboardEntry;
  type: LeaderboardType;
  position: 1 | 2 | 3;
  formatValue: (value: number, type: LeaderboardType) => string;
}) => {
  const isFirst = position === 1;
  const medalColors = {
    1: 'bg-amber-400',
    2: 'bg-gray-300',
    3: 'bg-amber-600',
  };

  return (
    <div
      className={`flex flex-col items-center ${
        isFirst ? 'order-2' : position === 2 ? 'order-1' : 'order-3'
      }`}
    >
      {/* Medal */}
      <div
        className={`w-8 h-8 rounded-full ${medalColors[position]} flex items-center justify-center text-white font-bold shadow-lg mb-2`}
      >
        {position === 1 ? <Crown className="w-5 h-5" /> : position}
      </div>

      {/* Avatar */}
      <div
        className={`relative ${
          isFirst ? 'w-20 h-20' : 'w-16 h-16'
        } rounded-full overflow-hidden border-4 ${
          entry.isCurrentUser ? 'border-amber-400' : 'border-white'
        } shadow-lg`}
      >
        {entry.avatar ? (
          <img
            src={entry.avatar}
            alt={entry.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
            {entry.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Name */}
      <p
        className={`mt-2 font-bold text-gray-900 truncate max-w-[100px] ${
          isFirst ? 'text-base' : 'text-sm'
        } ${entry.isCurrentUser ? 'text-amber-600' : ''}`}
      >
        {entry.name}
      </p>

      {/* Title */}
      {entry.title && (
        <p className={`text-xs px-2 py-0.5 rounded-full mt-1 ${
          entry.title.rarity === 'legendary' ? 'bg-amber-100 text-amber-700' :
          entry.title.rarity === 'epic' ? 'bg-purple-100 text-purple-700' :
          entry.title.rarity === 'rare' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {entry.title.icon} {entry.title.name}
        </p>
      )}

      {/* Level */}
      <p className="text-xs text-gray-500">Lv.{entry.level}</p>

      {/* Value */}
      <div
        className={`mt-1 px-3 py-1 rounded-full ${
          isFirst ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
        } text-sm font-medium`}
      >
        {formatValue(entry.value, type)}
      </div>
    </div>
  );
};

// Leaderboard Row Component
const LeaderboardRow = ({
  entry,
  type,
  formatValue,
  highlighted = false,
}: {
  entry: LeaderboardEntry;
  type: LeaderboardType;
  formatValue: (value: number, type: LeaderboardType) => string;
  highlighted?: boolean;
}) => (
  <div
    className={`flex items-center gap-4 px-4 py-3 ${
      entry.isCurrentUser || highlighted ? 'bg-amber-50' : 'hover:bg-gray-50'
    }`}
  >
    {/* Rank */}
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
        entry.isCurrentUser ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {entry.rank}
    </div>

    {/* Avatar */}
    {entry.avatar ? (
      <img
        src={entry.avatar}
        alt={entry.name}
        className="w-10 h-10 rounded-full object-cover"
      />
    ) : (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold">
        {entry.name.charAt(0)}
      </div>
    )}

    {/* Name & Level */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p
          className={`font-medium truncate ${
            entry.isCurrentUser ? 'text-amber-700' : 'text-gray-900'
          }`}
        >
          {entry.name}
          {entry.isCurrentUser && (
            <span className="ml-2 text-xs text-amber-500">（你）</span>
          )}
        </p>
        {entry.title && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
            entry.title.rarity === 'legendary' ? 'bg-amber-100 text-amber-700' :
            entry.title.rarity === 'epic' ? 'bg-purple-100 text-purple-700' :
            entry.title.rarity === 'rare' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {entry.title.icon} {entry.title.name}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500">Lv.{entry.level}</p>
    </div>

    {/* Value */}
    <div className="text-right">
      <p className="font-bold text-gray-900">{formatValue(entry.value, type)}</p>
      <p className="text-xs text-gray-500">{LEADERBOARD_TYPE_NAMES[type]}</p>
    </div>
  </div>
);

export default Leaderboard;
