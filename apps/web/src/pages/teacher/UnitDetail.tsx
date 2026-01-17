import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  FileQuestion,
  Search,
  Filter,
  MoreVertical,
  BookOpen,
} from 'lucide-react';
import { Card, Button } from '../../components/ui';
import TeacherLayout from '../../components/layout/TeacherLayout';
import { unitService, Unit } from '../../services/curriculum';
import questionsService from '../../services/questions';
import { Question, DIFFICULTY_CONFIG, QUESTION_TYPE_NAMES } from '../../types/question';

const UnitDetail = () => {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Unit data
  const [unit, setUnit] = useState<Unit | null>(null);
  const [unitLoading, setUnitLoading] = useState(true);

  // Questions data
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [totalQuestions, setTotalQuestions] = useState(0);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load unit data
  useEffect(() => {
    const loadUnit = async () => {
      if (!unitId) return;
      setUnitLoading(true);
      try {
        const data = await unitService.get(unitId);
        setUnit(data);
      } catch (err) {
        console.error('Failed to load unit:', err);
        navigate('/teacher/curriculum');
      } finally {
        setUnitLoading(false);
      }
    };
    loadUnit();
  }, [unitId, navigate]);

  // Load questions
  useEffect(() => {
    const loadQuestions = async () => {
      if (!unitId) return;
      setQuestionsLoading(true);
      try {
        const result = await questionsService.getQuestions({
          unitId,
          difficulty: difficultyFilter as any || undefined,
          type: typeFilter as any || undefined,
          search: searchText || undefined,
          page,
          limit,
        });
        setQuestions(result.questions);
        setTotalQuestions(result.pagination.total);
      } catch (err) {
        console.error('Failed to load questions:', err);
      } finally {
        setQuestionsLoading(false);
      }
    };
    loadQuestions();
  }, [unitId, difficultyFilter, typeFilter, searchText, page]);

  // Handle delete question
  const handleDeleteQuestion = async (questionId: string) => {
    setDeleting(true);
    try {
      await questionsService.deleteQuestion(questionId);
      setQuestions(questions.filter(q => q._id !== questionId));
      setTotalQuestions(prev => prev - 1);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete question:', err);
      alert('刪除失敗');
    } finally {
      setDeleting(false);
    }
  };

  // Navigate to add question with unit pre-selected
  const handleAddQuestion = () => {
    if (!unit) return;
    const subjectId = typeof unit.subjectId === 'object' ? unit.subjectId._id : unit.subjectId;
    navigate(`/teacher/questions/new?unitId=${unitId}&subjectId=${subjectId}&academicYear=${unit.academicYear}&grade=${unit.grade}&semester=${unit.semester}`);
  };

  // Navigate to edit question
  const handleEditQuestion = (questionId: string) => {
    navigate(`/teacher/questions/${questionId}`);
  };

  const totalPages = Math.ceil(totalQuestions / limit);
  const subject = unit && typeof unit.subjectId === 'object' ? unit.subjectId : null;

  if (unitLoading) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
        </div>
      </TeacherLayout>
    );
  }

  if (!unit) {
    return (
      <TeacherLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">找不到此單元</p>
          <Button variant="secondary" onClick={() => navigate('/teacher/curriculum')} className="mt-4">
            返回課程管理
          </Button>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/teacher/curriculum')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                {subject && (
                  <>
                    <span>{subject.icon}</span>
                    <span>{subject.name}</span>
                    <span>•</span>
                  </>
                )}
                <span>{unit.academicYear}學年度</span>
                <span>•</span>
                <span>{unit.grade}年級{unit.semester}學期</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-800">{unit.name}</h1>
            </div>
          </div>
          <Button onClick={handleAddQuestion}>
            <Plus className="w-4 h-4 mr-2" />
            新增題目
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileQuestion className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalQuestions}</div>
                <div className="text-sm text-gray-500">題目總數</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <span className="text-green-600 font-bold">易</span>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {questions.filter(q => q.difficulty === 'easy').length}
                </div>
                <div className="text-sm text-gray-500">簡單題</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <span className="text-yellow-600 font-bold">中</span>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {questions.filter(q => q.difficulty === 'medium').length}
                </div>
                <div className="text-sm text-gray-500">中等題</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <span className="text-red-600 font-bold">難</span>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {questions.filter(q => q.difficulty === 'hard').length}
                </div>
                <div className="text-sm text-gray-500">困難題</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜尋題目內容..."
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={difficultyFilter}
              onChange={(e) => {
                setDifficultyFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部難度</option>
              <option value="easy">簡單</option>
              <option value="medium">中等</option>
              <option value="hard">困難</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部題型</option>
              <option value="single_choice">單選題</option>
              <option value="multiple_choice">多選題</option>
              <option value="true_false">是非題</option>
              <option value="fill_blank">填空題</option>
            </select>
          </div>
        </Card>

        {/* Questions List */}
        <Card className="overflow-hidden">
          {questionsLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto" />
            </div>
          ) : questions.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                {searchText || difficultyFilter || typeFilter
                  ? '沒有符合條件的題目'
                  : '此單元還沒有題目'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchText || difficultyFilter || typeFilter
                  ? '請嘗試調整篩選條件'
                  : '點擊「新增題目」開始建立第一個題目'}
              </p>
              {!searchText && !difficultyFilter && !typeFilter && (
                <Button onClick={handleAddQuestion}>
                  <Plus className="w-4 h-4 mr-2" />
                  新增題目
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="divide-y">
                {questions.map((question, index) => {
                  const diffConfig = DIFFICULTY_CONFIG[question.difficulty];
                  return (
                    <div
                      key={question._id}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-400">
                              #{(page - 1) * limit + index + 1}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${diffConfig.bgColor} ${diffConfig.color}`}>
                              {diffConfig.name}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              {QUESTION_TYPE_NAMES[question.type]}
                            </span>
                          </div>
                          <p className="text-gray-800 line-clamp-2">
                            {question.content.text}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span>經驗值: {question.baseExp}</span>
                            <span>金幣: {question.baseGold}</span>
                            {question.stats && (
                              <span>
                                答對率: {question.stats.totalAttempts > 0
                                  ? Math.round((question.stats.correctCount / question.stats.totalAttempts) * 100)
                                  : 0}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditQuestion(question._id)}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                            title="編輯"
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(question._id)}
                            className="p-2 hover:bg-red-50 rounded-lg"
                            title="刪除"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    共 {totalQuestions} 題，第 {page} / {totalPages} 頁
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      上一頁
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page === totalPages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      下一頁
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">確認刪除題目？</h3>
              <p className="text-gray-500 mb-6">此操作無法復原</p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                >
                  取消
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => handleDeleteQuestion(deleteConfirm)}
                  loading={deleting}
                >
                  刪除
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </TeacherLayout>
  );
};

export default UnitDetail;
