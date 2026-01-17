import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Copy,
  RefreshCw,
  Settings,
  UserMinus,
  Check,
  Search,
  Star,
} from 'lucide-react';
import { TeacherLayout } from '../../components/layout';
import { Card, Button } from '../../components/ui';
import { classService, ClassData, UpdateClassInput } from '../../services/classes';

const ClassDetail = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [removingStudent, setRemovingStudent] = useState<string | null>(null);

  useEffect(() => {
    if (classId) {
      loadClass();
    }
  }, [classId]);

  const loadClass = async () => {
    setLoading(true);
    try {
      const data = await classService.getClass(classId!);
      setClassData(data);
    } catch (error) {
      console.error('Failed to load class:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!classData) return;
    await navigator.clipboard.writeText(classData.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRegenerateCode = async () => {
    if (!classData || !confirm('確定要重新產生邀請碼嗎？舊的邀請碼將失效。')) return;

    try {
      const newCode = await classService.regenerateInviteCode(classData._id);
      setClassData((prev) => (prev ? { ...prev, inviteCode: newCode } : null));
    } catch (error) {
      console.error('Failed to regenerate code:', error);
    }
  };

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!classData || !confirm(`確定要將「${studentName}」移出班級嗎？`)) return;

    setRemovingStudent(studentId);
    try {
      await classService.removeStudent(classData._id, studentId);
      setClassData((prev) =>
        prev
          ? { ...prev, students: prev.students.filter((s) => s._id !== studentId) }
          : null
      );
    } catch (error) {
      console.error('Failed to remove student:', error);
    } finally {
      setRemovingStudent(null);
    }
  };

  // Filter students
  const filteredStudents = classData?.students.filter((student) =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <TeacherLayout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500">載入中...</p>
        </div>
      </TeacherLayout>
    );
  }

  if (!classData) {
    return (
      <TeacherLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">找不到班級</p>
          <Button variant="secondary" onClick={() => navigate('/teacher/classes')} className="mt-4">
            返回班級列表
          </Button>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/teacher/classes')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{classData.name}</h1>
            {classData.description && (
              <p className="text-gray-500 mt-1">{classData.description}</p>
            )}
          </div>
          <Button
            variant="secondary"
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            編輯班級
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Students Count */}
          <Card variant="elevated" padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">學生人數</p>
                <p className="text-2xl font-bold text-gray-900">
                  {classData.students.length}
                  <span className="text-sm font-normal text-gray-500">
                    {' '}/ {classData.maxStudents}
                  </span>
                </p>
              </div>
            </div>
          </Card>

          {/* Invite Code */}
          <Card variant="elevated" padding="lg" className="md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">邀請碼</p>
                <p className="font-mono font-bold text-2xl tracking-wider text-indigo-600">
                  {classData.inviteCode}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  學生可使用此邀請碼加入班級
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyCode}
                  className={`p-3 rounded-lg transition-colors ${
                    copiedCode
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                  title="複製邀請碼"
                >
                  {copiedCode ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
                <button
                  onClick={handleRegenerateCode}
                  className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600"
                  title="重新產生邀請碼"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Students List */}
        <Card variant="elevated" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">學生列表</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋學生..."
                className="pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">
                {classData.students.length === 0
                  ? '尚無學生加入班級'
                  : '找不到符合的學生'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredStudents.map((student) => (
                <div
                  key={student._id}
                  className="py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {student.avatar ? (
                      <img
                        src={student.avatar}
                        alt={student.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-600 font-medium">
                          {student.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{student.name}</p>
                      <p className="text-sm text-gray-500">{student.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {student.studentProfile && (
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="w-4 h-4 fill-amber-500" />
                        <span className="text-sm font-medium">
                          Lv.{student.studentProfile.level}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => handleRemoveStudent(student._id, student.name)}
                      disabled={removingStudent === student._id}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="移出班級"
                    >
                      {removingStudent === student._id ? (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <UserMinus className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Edit Modal */}
        {showEditModal && (
          <EditClassModal
            classData={classData}
            onClose={() => setShowEditModal(false)}
            onUpdated={(updated) => {
              setClassData(updated);
              setShowEditModal(false);
            }}
          />
        )}
      </div>
    </TeacherLayout>
  );
};

// Edit Class Modal
const EditClassModal = ({
  classData,
  onClose,
  onUpdated,
}: {
  classData: ClassData;
  onClose: () => void;
  onUpdated: (classData: ClassData) => void;
}) => {
  const [name, setName] = useState(classData.name);
  const [description, setDescription] = useState(classData.description || '');
  const [maxStudents, setMaxStudents] = useState(classData.maxStudents);
  const [isActive, setIsActive] = useState(classData.isActive);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('請輸入班級名稱');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const input: UpdateClassInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        maxStudents,
        isActive,
      };

      const updated = await classService.updateClass(classData._id, input);
      onUpdated(updated);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '更新失敗';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">編輯班級</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              班級名稱 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              班級描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={2}
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              人數上限
            </label>
            <input
              type="number"
              value={maxStudents}
              onChange={(e) => setMaxStudents(Number(e.target.value))}
              min={classData.students.length || 1}
              max={200}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              班級啟用中（關閉後學生將無法加入）
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
              disabled={loading}
            >
              取消
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              loading={loading}
              disabled={loading}
            >
              儲存
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClassDetail;
