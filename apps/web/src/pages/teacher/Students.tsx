import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  User,
  Trophy,
  Target,
  Clock,
  Users,
  CheckSquare,
  Square,
  X,
  Loader2,
} from 'lucide-react';
import TeacherLayout from '../../components/layout/TeacherLayout';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { studentsService, StudentListItem, ListStudentsParams } from '../../services/students';
import { classService, ClassListItem } from '../../services/classes';

type SortField = ListStudentsParams['sortBy'];

const sortOptions: { value: SortField; label: string }[] = [
  { value: 'displayName', label: '姓名' },
  { value: 'level', label: '等級' },
  { value: 'correctRate', label: '正確率' },
  { value: 'totalQuestionsAnswered', label: '答題數' },
  { value: 'lastLoginAt', label: '最後登入' },
  { value: 'createdAt', label: '註冊日期' },
];

const StudentsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState<SortField>(
    (searchParams.get('sortBy') as SortField) || 'createdAt'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  );

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Assign modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [classes, setClasses] = useState<ClassListItem[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const [assignResult, setAssignResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Load students
  useEffect(() => {
    const loadStudents = async () => {
      setLoading(true);
      try {
        const result = await studentsService.list({
          page: pagination.page,
          limit: pagination.limit,
          search: searchQuery || undefined,
          sortBy,
          sortOrder,
        });
        setStudents(result.data);
        setPagination(result.pagination);
      } catch (error) {
        console.error('Failed to load students:', error);
      } finally {
        setLoading(false);
      }
    };
    loadStudents();
  }, [pagination.page, pagination.limit, searchQuery, sortBy, sortOrder]);

  // Load classes when modal opens
  useEffect(() => {
    if (showAssignModal && classes.length === 0) {
      loadClasses();
    }
  }, [showAssignModal]);

  const loadClasses = async () => {
    setClassesLoading(true);
    try {
      const result = await classService.listClasses(1, 100);
      setClasses(result.classes);
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setClassesLoading(false);
    }
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    // Update URL params
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (sortBy && sortBy !== 'createdAt') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);
    setSearchParams(params);
  };

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Selection handlers
  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map((s) => s._id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const enterSelectionMode = () => {
    setIsSelectionMode(true);
  };

  // Assign to class
  const handleAssign = async () => {
    if (!selectedClassId || selectedIds.size === 0) return;

    setAssigning(true);
    setAssignResult(null);

    try {
      const result = await classService.addStudents(
        selectedClassId,
        Array.from(selectedIds)
      );
      setAssignResult({
        success: true,
        message: result.message,
      });
      // Clear selection after successful assignment
      setTimeout(() => {
        setShowAssignModal(false);
        clearSelection();
        setAssignResult(null);
        setSelectedClassId('');
      }, 2000);
    } catch (error: unknown) {
      console.error('Failed to assign students:', error);
      const err = error as { response?: { data?: { message?: string } } };
      setAssignResult({
        success: false,
        message: err.response?.data?.message || '分配失敗，請稍後再試',
      });
    } finally {
      setAssigning(false);
    }
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // Format relative time
  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return '從未';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays} 天前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} 週前`;
    return formatDate(dateString);
  };

  const isAllSelected = students.length > 0 && selectedIds.size === students.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < students.length;

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">學生管理</h1>
            <p className="text-gray-600 mt-1">共 {pagination.total} 位學生</p>
          </div>
          <div className="flex gap-2">
            {!isSelectionMode ? (
              <Button variant="secondary" onClick={enterSelectionMode}>
                <CheckSquare className="w-4 h-4 mr-2" />
                批量操作
              </Button>
            ) : (
              <Button variant="ghost" onClick={clearSelection}>
                <X className="w-4 h-4 mr-2" />
                取消選擇
              </Button>
            )}
          </div>
        </div>

        {/* Selection Action Bar */}
        {isSelectionMode && selectedIds.size > 0 && (
          <Card
            variant="elevated"
            className="bg-indigo-50 border-indigo-200"
            padding="md"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-indigo-700 font-medium">
                  已選擇 {selectedIds.size} 位學生
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={() => setShowAssignModal(true)}
                >
                  <Users className="w-4 h-4 mr-2" />
                  分配到班級
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Search & Sort */}
        <Card variant="outlined" padding="md">
          <div className="flex flex-col sm:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜尋學生姓名或 Email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <Button type="submit" variant="primary">
                搜尋
              </Button>
            </form>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">排序：</span>
              <select
                value={sortBy}
                onChange={(e) => handleSort(e.target.value as SortField)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                title={sortOrder === 'asc' ? '升序' : '降序'}
              >
                <ArrowUpDown className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </Card>

        {/* Students List */}
        <Card variant="elevated">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto mb-2" />
              <p className="text-gray-500">載入中...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <User className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>尚無學生資料</p>
              {searchQuery && (
                <p className="text-sm mt-2">嘗試使用不同的搜尋條件</p>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {isSelectionMode && (
                        <th className="px-4 py-3 w-12">
                          <button
                            onClick={toggleSelectAll}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            {isAllSelected ? (
                              <CheckSquare className="w-5 h-5 text-indigo-600" />
                            ) : isSomeSelected ? (
                              <div className="w-5 h-5 border-2 border-indigo-600 rounded bg-indigo-600 flex items-center justify-center">
                                <div className="w-2 h-0.5 bg-white" />
                              </div>
                            ) : (
                              <Square className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                        </th>
                      )}
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                        學生
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                        等級
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                        經驗 / 金幣
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                        答題數
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                        正確率
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                        最後活動
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {students.map((student) => (
                      <tr
                        key={student._id}
                        className={`hover:bg-gray-50 transition-colors ${
                          !isSelectionMode ? 'cursor-pointer' : ''
                        } ${selectedIds.has(student._id) ? 'bg-indigo-50' : ''}`}
                        onClick={() =>
                          isSelectionMode
                            ? toggleSelection(student._id)
                            : navigate(`/teacher/students/${student._id}`)
                        }
                      >
                        {isSelectionMode && (
                          <td
                            className="px-4 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => toggleSelection(student._id)}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              {selectedIds.has(student._id) ? (
                                <CheckSquare className="w-5 h-5 text-indigo-600" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-400" />
                              )}
                            </button>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {student.avatarUrl ? (
                              <img
                                src={student.avatarUrl}
                                alt={student.displayName}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                                {student.displayName[0]}
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900">
                                {student.displayName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {student.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                            <Trophy className="w-4 h-4" />
                            Lv.{student.level}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-sm">
                            <span className="text-blue-600">✨ {student.exp}</span>
                            <span className="text-gray-400 mx-1">/</span>
                            <span className="text-yellow-600">💰 {student.gold}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-sm">
                            <span className="font-medium">{student.totalAttempts}</span>
                            <span className="text-gray-400 text-xs ml-1">次</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
                              student.correctRate >= 80
                                ? 'bg-green-100 text-green-700'
                                : student.correctRate >= 60
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            <Target className="w-4 h-4" />
                            {student.correctRate}%
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-sm text-gray-600">
                            <Clock className="w-4 h-4 inline mr-1" />
                            {formatRelativeTime(student.lastAttemptAt)}
                          </div>
                        </td>
                        <td
                          className="px-4 py-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(`/teacher/students/${student._id}`)
                            }
                          >
                            查看詳情
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y">
                {students.map((student) => (
                  <div
                    key={student._id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      selectedIds.has(student._id) ? 'bg-indigo-50' : ''
                    }`}
                    onClick={() =>
                      isSelectionMode
                        ? toggleSelection(student._id)
                        : navigate(`/teacher/students/${student._id}`)
                    }
                  >
                    <div className="flex items-start gap-3">
                      {isSelectionMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelection(student._id);
                          }}
                          className="p-1 mt-1"
                        >
                          {selectedIds.has(student._id) ? (
                            <CheckSquare className="w-5 h-5 text-indigo-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      )}
                      {student.avatarUrl ? (
                        <img
                          src={student.avatarUrl}
                          alt={student.displayName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                          {student.displayName[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 truncate">
                            {student.displayName}
                          </span>
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                            Lv.{student.level}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 truncate mb-2">
                          {student.email}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="text-blue-600">✨ {student.exp}</span>
                          <span className="text-yellow-600">💰 {student.gold}</span>
                          <span
                            className={`${
                              student.correctRate >= 80
                                ? 'text-green-600'
                                : student.correctRate >= 60
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}
                          >
                            正確率 {student.correctRate}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                          答題 {student.totalAttempts} 次 ·{' '}
                          {formatRelativeTime(student.lastAttemptAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <p className="text-sm text-gray-500">
                第 {pagination.page} / {pagination.totalPages} 頁，共{' '}
                {pagination.total} 筆
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    setPagination((p) => ({ ...p, page: p.page - 1 }))
                  }
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    setPagination((p) => ({ ...p, page: p.page + 1 }))
                  }
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Assign to Class Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  分配學生到班級
                </h2>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setAssignResult(null);
                    setSelectedClassId('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-500 mt-1">
                已選擇 {selectedIds.size} 位學生
              </p>
            </div>

            <div className="p-6">
              {classesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
              ) : classes.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">尚未建立班級</p>
                  <Button
                    variant="primary"
                    className="mt-4"
                    onClick={() => navigate('/teacher/classes')}
                  >
                    建立班級
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      選擇班級
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">請選擇班級...</option>
                      {classes.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} ({c.studentCount}/{c.maxStudents} 人)
                        </option>
                      ))}
                    </select>
                  </div>

                  {assignResult && (
                    <div
                      className={`p-4 rounded-lg ${
                        assignResult.success
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {assignResult.message}
                    </div>
                  )}
                </div>
              )}
            </div>

            {classes.length > 0 && (
              <div className="p-6 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAssignModal(false);
                    setAssignResult(null);
                    setSelectedClassId('');
                  }}
                >
                  取消
                </Button>
                <Button
                  variant="primary"
                  onClick={handleAssign}
                  disabled={!selectedClassId || assigning}
                >
                  {assigning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      分配中...
                    </>
                  ) : (
                    '確認分配'
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </TeacherLayout>
  );
};

export default StudentsPage;
