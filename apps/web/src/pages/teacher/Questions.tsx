import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Upload,
  Download,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Eye,
  X,
} from 'lucide-react';
import TeacherLayout from '../../components/layout/TeacherLayout';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import {
  Question,
  Category,
  Subject,
  Difficulty,
  SUBJECT_NAMES,
  DIFFICULTY_CONFIG,
  QUESTION_TYPE_NAMES,
} from '../../types/question';
import questionsService, { ImportResponse } from '../../services/questions';

const QuestionsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [selectedSubject, setSelectedSubject] = useState<Subject | ''>('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load categories when subject changes
  useEffect(() => {
    const loadCategories = async () => {
      if (selectedSubject) {
        try {
          const cats = await questionsService.getCategories(selectedSubject);
          setCategories(cats);
        } catch (error) {
          console.error('Failed to load categories:', error);
        }
      } else {
        setCategories([]);
      }
      setSelectedCategory('');
    };
    loadCategories();
  }, [selectedSubject]);

  // Load questions
  useEffect(() => {
    const loadQuestions = async () => {
      setLoading(true);
      try {
        const result = await questionsService.getQuestions({
          subject: selectedSubject || undefined,
          categoryId: selectedCategory || undefined,
          difficulty: selectedDifficulty || undefined,
          search: searchQuery || undefined,
          page: pagination.page,
          limit: pagination.limit,
        });
        setQuestions(result.questions);
        setPagination(result.pagination);
      } catch (error) {
        console.error('Failed to load questions:', error);
      } finally {
        setLoading(false);
      }
    };
    loadQuestions();
  }, [selectedSubject, selectedCategory, selectedDifficulty, searchQuery, pagination.page]);

  // Download template
  const handleDownloadTemplate = async () => {
    try {
      const blob = await questionsService.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'questions_import_template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download template:', error);
      alert('下載範本失敗');
    }
  };

  // Handle file import
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const result = await questionsService.importQuestions(file);
      setImportResult(result);
      // Refresh questions list
      if (result.summary.success > 0) {
        const updated = await questionsService.getQuestions({
          page: 1,
          limit: pagination.limit,
        });
        setQuestions(updated.questions);
        setPagination(updated.pagination);
      }
    } catch (error: any) {
      alert(error.message || '匯入失敗');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  // Delete question
  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      await questionsService.deleteQuestion(deleteId);
      setQuestions(questions.filter((q) => q._id !== deleteId));
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
    } catch (error: any) {
      alert(error.message || '刪除失敗');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">題目管理</h1>
            <p className="text-gray-500 mt-1">
              共 {pagination.total} 道題目
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleDownloadTemplate}
            >
              下載範本
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Upload className="w-4 h-4" />}
              onClick={() => setShowImportModal(true)}
            >
              批次匯入
            </Button>
            <Button
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => navigate('/teacher/questions/new')}
            >
              新增題目
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <Card padding="none">
          <div className="p-4 space-y-4">
            {/* Search */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜尋題目內容..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <Button
                variant="secondary"
                leftIcon={<Filter className="w-4 h-4" />}
                onClick={() => setShowFilters(!showFilters)}
              >
                篩選
              </Button>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    學科
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value as Subject | '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">全部學科</option>
                    {Object.entries(SUBJECT_NAMES).map(([key, name]) => (
                      <option key={key} value={key}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    分類
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    disabled={!selectedSubject}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">全部分類</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    難度
                  </label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value as Difficulty | '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">全部難度</option>
                    {Object.entries(DIFFICULTY_CONFIG).map(([key, { name }]) => (
                      <option key={key} value={key}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Questions List */}
        <Card padding="none">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto" />
              <p className="mt-2 text-gray-500">載入中...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">沒有找到題目</p>
              <Button
                className="mt-4"
                onClick={() => navigate('/teacher/questions/new')}
              >
                新增第一道題目
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {questions.map((question) => {
                const category =
                  typeof question.categoryId === 'object'
                    ? question.categoryId
                    : null;
                const diffConfig = DIFFICULTY_CONFIG[question.difficulty];

                // Get subject name from new hierarchy or legacy field
                const subjectName = typeof question.subjectId === 'object' && question.subjectId
                  ? question.subjectId.name
                  : question.subject
                    ? SUBJECT_NAMES[question.subject]
                    : '未分類';

                // Get unit info from new hierarchy
                const unitInfo = typeof question.unitId === 'object' && question.unitId
                  ? question.unitId
                  : null;

                return (
                  <div
                    key={question._id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Tags */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                            {subjectName}
                          </span>
                          {unitInfo && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded">
                              {unitInfo.academicYear}_{unitInfo.grade}{unitInfo.semester} / {unitInfo.name}
                            </span>
                          )}
                          {category && !unitInfo && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                              {category.name}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded ${diffConfig.bgColor} ${diffConfig.color}`}
                          >
                            {diffConfig.name}
                          </span>
                          <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                            {QUESTION_TYPE_NAMES[question.type]}
                          </span>
                        </div>

                        {/* Content */}
                        <p className="text-gray-900 line-clamp-2">
                          {question.content.text}
                        </p>

                        {/* Stats */}
                        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                          <span>
                            正確率: {question.correctRate}%
                          </span>
                          <span>
                            作答次數: {question.stats.totalAttempts}
                          </span>
                          <span>
                            經驗值: {question.baseExp} / 金幣: {question.baseGold}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/teacher/questions/${question._id}`)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="編輯"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(question._id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="刪除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <p className="text-sm text-gray-500">
                第 {pagination.page} / {pagination.totalPages} 頁
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

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">批次匯入題目</h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResult(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {!importResult ? (
                <>
                  <p className="text-gray-600">
                    請上傳 Excel (.xlsx) 或 CSV 檔案。
                    <button
                      onClick={handleDownloadTemplate}
                      className="text-blue-600 hover:underline ml-1"
                    >
                      下載範本
                    </button>
                  </p>
                  <label className="block">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 cursor-pointer transition-colors">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">
                        {importing ? '上傳中...' : '點擊或拖曳檔案至此'}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        支援 .xlsx, .xls, .csv
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleImport}
                      disabled={importing}
                      className="hidden"
                    />
                  </label>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-gray-100 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {importResult.summary.total}
                      </div>
                      <div className="text-sm text-gray-500">總計</div>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <div className="text-2xl font-bold text-green-700">
                        {importResult.summary.success}
                      </div>
                      <div className="text-sm text-green-600">成功</div>
                    </div>
                    <div className="p-3 bg-red-100 rounded-lg">
                      <div className="text-2xl font-bold text-red-700">
                        {importResult.summary.failed}
                      </div>
                      <div className="text-sm text-red-600">失敗</div>
                    </div>
                  </div>

                  {importResult.results.filter((r) => !r.success).length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-medium text-gray-900 mb-2">錯誤詳情</h3>
                      <div className="max-h-48 overflow-auto border rounded-lg divide-y">
                        {importResult.results
                          .filter((r) => !r.success)
                          .map((r, i) => (
                            <div key={i} className="p-2 text-sm">
                              <span className="font-medium">第 {r.row} 行:</span>{' '}
                              <span className="text-red-600">{r.error}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setImportResult(null)}
                    >
                      繼續匯入
                    </Button>
                    <Button onClick={() => setShowImportModal(false)}>
                      完成
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              確認刪除
            </h2>
            <p className="text-gray-600 mb-4">
              確定要刪除這道題目嗎？此操作無法復原。
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setDeleteId(null)}
                disabled={deleting}
              >
                取消
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                loading={deleting}
              >
                刪除
              </Button>
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
};

export default QuestionsPage;
