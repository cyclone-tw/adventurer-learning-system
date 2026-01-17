import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Copy,
  RefreshCw,
  Trash2,
  Eye,
  MoreVertical,
  Check,
} from 'lucide-react';
import { TeacherLayout } from '../../components/layout';
import { Card, Button } from '../../components/ui';
import { classService, ClassListItem, CreateClassInput } from '../../services/classes';

const Classes = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const result = await classService.listClasses(1, 100);
      setClasses(result.classes);
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRegenerateCode = async (classId: string) => {
    if (!confirm('確定要重新產生邀請碼嗎？舊的邀請碼將失效。')) return;

    try {
      const newCode = await classService.regenerateInviteCode(classId);
      setClasses((prev) =>
        prev.map((c) => (c._id === classId ? { ...c, inviteCode: newCode } : c))
      );
    } catch (error) {
      console.error('Failed to regenerate code:', error);
    }
  };

  const handleDeleteClass = async (classId: string, className: string) => {
    if (!confirm(`確定要刪除「${className}」嗎？此操作無法復原。`)) return;

    try {
      await classService.deleteClass(classId);
      setClasses((prev) => prev.filter((c) => c._id !== classId));
    } catch (error) {
      console.error('Failed to delete class:', error);
    }
  };

  return (
    <TeacherLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">班級管理</h1>
            <p className="text-gray-500 mt-1">管理你的班級和學生</p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            建立班級
          </Button>
        </div>

        {/* Classes Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto mb-4" />
            <p className="text-gray-500">載入中...</p>
          </div>
        ) : classes.length === 0 ? (
          <Card variant="outlined" className="text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-4">尚未建立任何班級</p>
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              建立第一個班級
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((classItem) => (
              <ClassCard
                key={classItem._id}
                classItem={classItem}
                onView={() => navigate(`/teacher/classes/${classItem._id}`)}
                onCopyCode={() => handleCopyCode(classItem.inviteCode)}
                onRegenerateCode={() => handleRegenerateCode(classItem._id)}
                onDelete={() => handleDeleteClass(classItem._id, classItem.name)}
                codeCopied={copiedCode === classItem.inviteCode}
              />
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <CreateClassModal
            onClose={() => setShowCreateModal(false)}
            onCreated={(newClass) => {
              setClasses((prev) => [newClass, ...prev]);
              setShowCreateModal(false);
            }}
          />
        )}
      </div>
    </TeacherLayout>
  );
};

// Class Card Component
const ClassCard = ({
  classItem,
  onView,
  onCopyCode,
  onRegenerateCode,
  onDelete,
  codeCopied,
}: {
  classItem: ClassListItem;
  onView: () => void;
  onCopyCode: () => void;
  onRegenerateCode: () => void;
  onDelete: () => void;
  codeCopied: boolean;
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Card variant="elevated" padding="lg" className="hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Users className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{classItem.name}</h3>
            <p className="text-sm text-gray-500">
              {classItem.studentCount} / {classItem.maxStudents} 人
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border z-20">
                <button
                  onClick={() => {
                    onView();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  查看詳情
                </button>
                <button
                  onClick={() => {
                    onRegenerateCode();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  重新產生邀請碼
                </button>
                <button
                  onClick={() => {
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  刪除班級
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {classItem.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {classItem.description}
        </p>
      )}

      {/* Invite Code */}
      <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">邀請碼</p>
          <p className="font-mono font-bold text-lg tracking-wider text-indigo-600">
            {classItem.inviteCode}
          </p>
        </div>
        <button
          onClick={onCopyCode}
          className={`p-2 rounded-lg transition-colors ${
            codeCopied
              ? 'bg-green-100 text-green-600'
              : 'bg-white hover:bg-gray-100 text-gray-600'
          }`}
          title="複製邀請碼"
        >
          {codeCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
        </button>
      </div>

      {/* View Button */}
      <Button
        variant="secondary"
        onClick={onView}
        className="mt-4 w-full"
      >
        查看班級
      </Button>
    </Card>
  );
};

// Create Class Modal
const CreateClassModal = ({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (classItem: ClassListItem) => void;
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxStudents, setMaxStudents] = useState(50);
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
      const input: CreateClassInput = {
        name: name.trim(),
        maxStudents,
      };
      if (description.trim()) {
        input.description = description.trim();
      }

      const newClass = await classService.createClass(input);
      onCreated(newClass as unknown as ClassListItem);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '建立失敗';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">建立新班級</h2>
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
              placeholder="例如：五年一班"
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
              placeholder="選填，簡短描述這個班級"
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
              min={1}
              max={200}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
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
              建立
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Classes;
