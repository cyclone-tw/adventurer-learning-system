import { useState, useEffect } from 'react';
import { Users, UserPlus, LogOut, GraduationCap, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { StudentLayout } from '../../components/layout';
import { Card, Button } from '../../components/ui';
import { classService, MyClassItem } from '../../services/classes';

const StudentClasses = () => {
  const [classes, setClasses] = useState<MyClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Join class state
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  // Leave class state
  const [leavingClassId, setLeavingClassId] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<string | null>(null);

  const fetchClasses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await classService.getMyClasses();
      setClasses(data);
    } catch (err) {
      console.error('Failed to fetch classes:', err);
      setError('無法載入班級資料');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    try {
      setIsJoining(true);
      setJoinError(null);
      setJoinSuccess(null);

      const result = await classService.joinClass(inviteCode.trim().toUpperCase());
      setJoinSuccess(`成功加入「${result.class.name}」班級！`);
      setInviteCode('');

      // Refresh class list
      await fetchClasses();

      // Clear success message after 3 seconds
      setTimeout(() => setJoinSuccess(null), 3000);
    } catch (err: unknown) {
      console.error('Failed to join class:', err);
      const error = err as { response?: { data?: { message?: string } } };
      if (error.response?.data?.message) {
        const msg = error.response.data.message;
        if (msg.includes('not found') || msg.includes('Invalid')) {
          setJoinError('邀請碼無效，請確認後重試');
        } else if (msg.includes('already')) {
          setJoinError('您已經是這個班級的成員');
        } else if (msg.includes('full')) {
          setJoinError('班級人數已滿');
        } else {
          setJoinError(msg);
        }
      } else {
        setJoinError('加入班級失敗，請稍後再試');
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveClass = async (classId: string) => {
    try {
      setLeavingClassId(classId);
      await classService.leaveClass(classId);
      setShowLeaveConfirm(null);

      // Refresh class list
      await fetchClasses();
    } catch (err) {
      console.error('Failed to leave class:', err);
      alert('退出班級失敗，請稍後再試');
    } finally {
      setLeavingClassId(null);
    }
  };

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">我的班級</h1>
            <p className="text-gray-500">加入班級與同學一起學習</p>
          </div>
        </div>

        {/* Join Class Card */}
        <Card variant="elevated" padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold">加入班級</h2>
          </div>

          <form onSubmit={handleJoinClass} className="space-y-4">
            <div>
              <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-1">
                輸入邀請碼
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value.toUpperCase());
                    setJoinError(null);
                  }}
                  placeholder="例如：ABC123"
                  maxLength={8}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase tracking-widest text-center font-mono text-lg"
                  disabled={isJoining}
                />
                <Button
                  type="submit"
                  disabled={!inviteCode.trim() || isJoining}
                  className="px-6"
                >
                  {isJoining ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    '加入'
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                請向老師索取 6 位數邀請碼
              </p>
            </div>

            {joinError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{joinError}</span>
              </div>
            )}

            {joinSuccess && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{joinSuccess}</span>
              </div>
            )}
          </form>
        </Card>

        {/* My Classes List */}
        <Card variant="elevated" padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold">已加入的班級</h2>
            <span className="text-sm text-gray-500">({classes.length})</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-red-400" />
              <p className="text-red-600">{error}</p>
              <Button variant="ghost" size="sm" onClick={fetchClasses} className="mt-2">
                重試
              </Button>
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 mb-1">尚未加入任何班級</p>
              <p className="text-sm text-gray-400">使用上方邀請碼加入老師的班級</p>
            </div>
          ) : (
            <div className="space-y-3">
              {classes.map((classItem) => (
                <div
                  key={classItem._id}
                  className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate">
                        {classItem.name}
                      </h3>
                      {classItem.description && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                          {classItem.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-4 h-4" />
                          {classItem.teacherId.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {classItem.studentCount} 位同學
                        </span>
                        {classItem.academicYearId && (
                          <span className="text-purple-600">
                            {classItem.academicYearId.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Leave button */}
                    <div className="flex-shrink-0">
                      {showLeaveConfirm === classItem._id ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleLeaveClass(classItem._id)}
                            disabled={leavingClassId === classItem._id}
                          >
                            {leavingClassId === classItem._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              '確認退出'
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowLeaveConfirm(null)}
                            disabled={leavingClassId === classItem._id}
                          >
                            取消
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowLeaveConfirm(classItem._id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="退出班級"
                        >
                          <LogOut className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Tips */}
        <Card variant="outlined" className="bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div>
              <h3 className="font-medium text-blue-800">小提示</h3>
              <ul className="text-sm text-blue-700 mt-1 space-y-1">
                <li>• 邀請碼由老師提供，通常是 6 位大寫英數字</li>
                <li>• 加入班級後，老師可以查看你的學習進度</li>
                <li>• 退出班級不會影響你的經驗值和金幣</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </StudentLayout>
  );
};

export default StudentClasses;
