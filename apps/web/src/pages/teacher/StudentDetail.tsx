import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Trophy,
  Target,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  BookOpen,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Lightbulb,
  Map,
  BarChart3,
  Minus,
  Download,
  FileText,
  FileSpreadsheet,
  Loader2,
  Users,
  UserPlus,
  X,
} from 'lucide-react';
import TeacherLayout from '../../components/layout/TeacherLayout';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ProgressBar from '../../components/ui/ProgressBar';
import {
  studentsService,
  StudentDetail as StudentDetailType,
  StudentAttempt,
} from '../../services/students';
import { classService, ClassListItem } from '../../services/classes';
import { exportStudentDetailToPDF, exportStudentDetailToExcel } from '../../utils/exportUtils';

const difficultyLabels: Record<string, { name: string; color: string }> = {
  easy: { name: '簡單', color: 'text-green-600 bg-green-100' },
  medium: { name: '中等', color: 'text-yellow-600 bg-yellow-100' },
  hard: { name: '困難', color: 'text-red-600 bg-red-100' },
  unknown: { name: '未知', color: 'text-gray-600 bg-gray-100' },
};

const StudentDetailPage = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<StudentDetailType | null>(null);

  // Export state
  const [isExporting, setIsExporting] = useState<'pdf' | 'excel' | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Class management state
  const [showClassModal, setShowClassModal] = useState(false);
  const [allClasses, setAllClasses] = useState<ClassListItem[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [addingToClass, setAddingToClass] = useState(false);
  const [removingFromClass, setRemovingFromClass] = useState<string | null>(null);

  // Close export menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Attempts state
  const [attempts, setAttempts] = useState<StudentAttempt[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [attemptsPagination, setAttemptsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [attemptsFilter, setAttemptsFilter] = useState<'all' | 'correct' | 'incorrect'>('all');

  // Export handlers
  const handleExport = async (type: 'pdf' | 'excel') => {
    if (!studentData) return;
    setIsExporting(type);
    try {
      if (type === 'pdf') {
        await exportStudentDetailToPDF(studentData);
      } else {
        exportStudentDetailToExcel(studentData);
      }
    } finally {
      setIsExporting(null);
      setShowExportMenu(false);
    }
  };

  // Load classes when modal opens
  useEffect(() => {
    if (showClassModal && allClasses.length === 0) {
      loadClasses();
    }
  }, [showClassModal]);

  const loadClasses = async () => {
    setClassesLoading(true);
    try {
      const result = await classService.listClasses(1, 100);
      setAllClasses(result.classes);
    } catch (err) {
      console.error('Failed to load classes:', err);
    } finally {
      setClassesLoading(false);
    }
  };

  // Add student to class
  const handleAddToClass = async () => {
    if (!studentId || !selectedClassId) return;
    setAddingToClass(true);
    try {
      await classService.addStudents(selectedClassId, [studentId]);
      // Reload student data to get updated classes
      const data = await studentsService.get(studentId);
      setStudentData(data);
      setSelectedClassId('');
      setShowClassModal(false);
    } catch (err) {
      console.error('Failed to add to class:', err);
      alert('新增失敗');
    } finally {
      setAddingToClass(false);
    }
  };

  // Remove student from class
  const handleRemoveFromClass = async (classId: string, className: string) => {
    if (!studentId || !confirm(`確定要將學生從「${className}」移除嗎？`)) return;
    setRemovingFromClass(classId);
    try {
      await classService.removeStudent(classId, studentId);
      // Reload student data to get updated classes
      const data = await studentsService.get(studentId);
      setStudentData(data);
    } catch (err) {
      console.error('Failed to remove from class:', err);
      alert('移除失敗');
    } finally {
      setRemovingFromClass(null);
    }
  };

  // Load student data
  useEffect(() => {
    const loadStudent = async () => {
      if (!studentId) return;

      setLoading(true);
      setError(null);

      try {
        const data = await studentsService.get(studentId);
        setStudentData(data);
      } catch (err) {
        console.error('Failed to load student:', err);
        setError('載入學生資料失敗');
      } finally {
        setLoading(false);
      }
    };
    loadStudent();
  }, [studentId]);

  // Load attempts
  useEffect(() => {
    const loadAttempts = async () => {
      if (!studentId) return;

      setAttemptsLoading(true);
      try {
        const result = await studentsService.getAttempts(studentId, {
          page: attemptsPagination.page,
          limit: attemptsPagination.limit,
          isCorrect: attemptsFilter === 'all' ? undefined : attemptsFilter === 'correct',
        });
        setAttempts(result.data);
        setAttemptsPagination(result.pagination);
      } catch (err) {
        console.error('Failed to load attempts:', err);
      } finally {
        setAttemptsLoading(false);
      }
    };
    loadAttempts();
  }, [studentId, attemptsPagination.page, attemptsFilter]);

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
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

  // Generate learning suggestions based on data
  const generateSuggestions = (stats: StudentDetailType['stats']) => {
    const suggestions: { type: 'warning' | 'success' | 'info'; message: string }[] = [];

    // Check overall performance
    if (stats.overview.correctRate < 50) {
      suggestions.push({
        type: 'warning',
        message: '整體正確率偏低，建議從簡單題目開始練習，建立信心。',
      });
    } else if (stats.overview.correctRate >= 80) {
      suggestions.push({
        type: 'success',
        message: '表現優異！可以嘗試更高難度的題目挑戰自己。',
      });
    }

    // Check weak units
    if (stats.weakUnits && stats.weakUnits.length > 0) {
      const weakestUnit = stats.weakUnits[0];
      suggestions.push({
        type: 'warning',
        message: `「${weakestUnit.unitName}」單元正確率較低 (${weakestUnit.correctRate}%)，建議加強練習。`,
      });
    }

    // Check difficulty performance
    if (stats.byDifficulty) {
      const hardDiff = stats.byDifficulty.find((d) => d.difficulty === 'hard');
      if (hardDiff && hardDiff.correctRate < 40 && hardDiff.attempts >= 5) {
        suggestions.push({
          type: 'info',
          message: '困難題目的正確率較低，建議先鞏固中等難度的題目。',
        });
      }
    }

    // Check learning trend
    if (stats.learningTrend) {
      if (stats.learningTrend.improvement.correctRateChange > 10) {
        suggestions.push({
          type: 'success',
          message: `進步明顯！正確率比上週提升了 ${stats.learningTrend.improvement.correctRateChange}%。`,
        });
      } else if (stats.learningTrend.improvement.correctRateChange < -10) {
        suggestions.push({
          type: 'warning',
          message: `正確率比上週下降了 ${Math.abs(stats.learningTrend.improvement.correctRateChange)}%，可能需要額外關注。`,
        });
      }

      if (stats.learningTrend.thisWeek.attempts === 0 && stats.learningTrend.lastWeek.attempts > 0) {
        suggestions.push({
          type: 'info',
          message: '這週尚未練習，建議保持學習節奏。',
        });
      }
    }

    return suggestions;
  };

  if (loading) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
            <p className="text-gray-500">載入中...</p>
          </div>
        </div>
      </TeacherLayout>
    );
  }

  if (error || !studentData) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error || '找不到學生資料'}</p>
            <Button variant="secondary" onClick={() => navigate('/teacher/students')}>
              返回學生列表
            </Button>
          </div>
        </div>
      </TeacherLayout>
    );
  }

  const { student, stats } = studentData;
  const suggestions = generateSuggestions(stats);

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/teacher/students')}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4 flex-1">
            {student.avatarUrl ? (
              <img
                src={student.avatarUrl}
                alt={student.displayName}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-2xl">
                {student.displayName[0]}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {student.displayName}
              </h1>
              <p className="text-gray-600">{student.email}</p>
            </div>
          </div>

          {/* Export Button */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              匯出報告
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting !== null}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 disabled:opacity-50"
                >
                  {isExporting === 'pdf' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                  ) : (
                    <FileText className="w-4 h-4 text-red-600" />
                  )}
                  <span>匯出為 PDF</span>
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  disabled={isExporting !== null}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 disabled:opacity-50"
                >
                  {isExporting === 'excel' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  )}
                  <span>匯出為 Excel</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card variant="elevated" padding="md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">等級</p>
                <p className="text-xl font-bold text-gray-900">Lv.{student.level}</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>經驗值</span>
                <span>{student.exp} / {student.expToNextLevel}</span>
              </div>
              <ProgressBar
                value={student.exp}
                max={student.expToNextLevel}
                color="purple"
              />
            </div>
          </Card>

          <Card variant="elevated" padding="md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <span className="text-xl">💰</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">金幣</p>
                <p className="text-xl font-bold text-yellow-600">{student.gold}</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">正確率</p>
                <p className="text-xl font-bold text-green-600">
                  {stats.overview.correctRate}%
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {stats.overview.correctAttempts} / {stats.overview.totalAttempts} 題
            </p>
          </Card>

          <Card variant="elevated" padding="md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">平均作答時間</p>
                <p className="text-xl font-bold text-blue-600">
                  {stats.overview.avgTimeSeconds}秒
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Class Management */}
        <Card variant="elevated" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5" />
              所屬班級
            </h2>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowClassModal(true)}
              className="flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              加入班級
            </Button>
          </div>

          {student.classes && student.classes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {student.classes.map((cls) => (
                <div
                  key={cls._id}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-800 font-medium">{cls.name}</span>
                  <button
                    onClick={() => handleRemoveFromClass(cls._id, cls.name)}
                    disabled={removingFromClass === cls._id}
                    className="ml-1 p-1 text-blue-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    title="從班級移除"
                  >
                    {removingFromClass === cls._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">此學生尚未加入任何班級</p>
          )}
        </Card>

        {/* Learning Suggestions */}
        {suggestions.length > 0 && (
          <Card variant="elevated" padding="lg">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              學習建議
            </h2>
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg flex items-start gap-3 ${
                    suggestion.type === 'warning'
                      ? 'bg-orange-50 border border-orange-200'
                      : suggestion.type === 'success'
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-blue-50 border border-blue-200'
                  }`}
                >
                  {suggestion.type === 'warning' ? (
                    <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  ) : suggestion.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  )}
                  <p className={`text-sm ${
                    suggestion.type === 'warning'
                      ? 'text-orange-700'
                      : suggestion.type === 'success'
                        ? 'text-green-700'
                        : 'text-blue-700'
                  }`}>
                    {suggestion.message}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Learning Trend */}
        {stats.learningTrend && (
          <Card variant="elevated" padding="lg">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              學習趨勢
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* This Week */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-medium text-blue-700 mb-3">本週表現</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">答題數</span>
                    <span className="font-bold">{stats.learningTrend.thisWeek.attempts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">正確率</span>
                    <span className="font-bold">{stats.learningTrend.thisWeek.correctRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">平均時間</span>
                    <span className="font-bold">{stats.learningTrend.thisWeek.avgTime}秒</span>
                  </div>
                </div>
              </div>

              {/* Last Week */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-3">上週表現</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">答題數</span>
                    <span className="font-bold">{stats.learningTrend.lastWeek.attempts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">正確率</span>
                    <span className="font-bold">{stats.learningTrend.lastWeek.correctRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">平均時間</span>
                    <span className="font-bold">{stats.learningTrend.lastWeek.avgTime}秒</span>
                  </div>
                </div>
              </div>

              {/* Improvement */}
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="text-sm font-medium text-purple-700 mb-3">變化趨勢</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">答題數</span>
                    <span className={`font-bold flex items-center gap-1 ${
                      stats.learningTrend.improvement.attemptsChange > 0
                        ? 'text-green-600'
                        : stats.learningTrend.improvement.attemptsChange < 0
                          ? 'text-red-600'
                          : 'text-gray-600'
                    }`}>
                      {stats.learningTrend.improvement.attemptsChange > 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : stats.learningTrend.improvement.attemptsChange < 0 ? (
                        <TrendingDown className="w-4 h-4" />
                      ) : (
                        <Minus className="w-4 h-4" />
                      )}
                      {stats.learningTrend.improvement.attemptsChange > 0 ? '+' : ''}
                      {stats.learningTrend.improvement.attemptsChange}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">正確率</span>
                    <span className={`font-bold flex items-center gap-1 ${
                      stats.learningTrend.improvement.correctRateChange > 0
                        ? 'text-green-600'
                        : stats.learningTrend.improvement.correctRateChange < 0
                          ? 'text-red-600'
                          : 'text-gray-600'
                    }`}>
                      {stats.learningTrend.improvement.correctRateChange > 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : stats.learningTrend.improvement.correctRateChange < 0 ? (
                        <TrendingDown className="w-4 h-4" />
                      ) : (
                        <Minus className="w-4 h-4" />
                      )}
                      {stats.learningTrend.improvement.correctRateChange > 0 ? '+' : ''}
                      {stats.learningTrend.improvement.correctRateChange}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">作答速度</span>
                    <span className={`font-bold flex items-center gap-1 ${
                      stats.learningTrend.improvement.avgTimeChange < 0
                        ? 'text-green-600'
                        : stats.learningTrend.improvement.avgTimeChange > 0
                          ? 'text-red-600'
                          : 'text-gray-600'
                    }`}>
                      {stats.learningTrend.improvement.avgTimeChange < 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : stats.learningTrend.improvement.avgTimeChange > 0 ? (
                        <TrendingDown className="w-4 h-4" />
                      ) : (
                        <Minus className="w-4 h-4" />
                      )}
                      {stats.learningTrend.improvement.avgTimeChange > 0 ? '+' : ''}
                      {stats.learningTrend.improvement.avgTimeChange}秒
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Difficulty Stats */}
          {stats.byDifficulty && stats.byDifficulty.length > 0 && (
            <Card variant="elevated" padding="lg">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" />
                難度分析
              </h2>
              <div className="space-y-4">
                {stats.byDifficulty.map((diff) => {
                  const label = difficultyLabels[diff.difficulty] || difficultyLabels.unknown;
                  return (
                    <div key={diff.difficulty} className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${label.color}`}>
                        {label.name}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-600">
                            {diff.correct}/{diff.attempts} 題
                          </span>
                          <span className="text-sm font-medium">{diff.correctRate}%</span>
                        </div>
                        <ProgressBar
                          value={diff.correctRate}
                          max={100}
                          color={
                            diff.correctRate >= 80
                              ? 'green'
                              : diff.correctRate >= 60
                                ? 'yellow'
                                : 'red'
                          }
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-16 text-right">
                        {diff.avgTime}秒/題
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Weak Units */}
          {stats.weakUnits && stats.weakUnits.length > 0 && (
            <Card variant="elevated" padding="lg">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                需加強單元
              </h2>
              <div className="space-y-3">
                {stats.weakUnits.map((unit) => (
                  <div
                    key={unit.unitId}
                    className="p-3 bg-orange-50 rounded-lg border border-orange-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{unit.unitName}</span>
                      <span className="text-orange-600 font-bold">{unit.correctRate}%</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {unit.academicYear}_{unit.grade}{unit.semester} · {unit.correct}/{unit.attempts} 題
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Stage Progress */}
        {stats.stageProgress && stats.stageProgress.length > 0 && (
          <Card variant="elevated" padding="lg">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Map className="w-5 h-5" />
              關卡進度
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {stats.stageProgress.map((stage) => (
                <div
                  key={stage.stageId}
                  className={`p-3 rounded-lg border text-center ${
                    stage.isCompleted
                      ? 'bg-green-50 border-green-300'
                      : stage.isUnlocked
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="text-2xl mb-1">{stage.stageIcon}</div>
                  <div className="font-medium text-sm truncate">{stage.stageName}</div>
                  {stage.isCompleted ? (
                    <div className="text-xs text-green-600 mt-1">
                      最佳 {stage.bestScore}%
                    </div>
                  ) : stage.isUnlocked ? (
                    <div className="text-xs text-blue-600 mt-1">
                      {stage.totalAttempts > 0 ? `已挑戰 ${stage.totalAttempts} 次` : '尚未挑戰'}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 mt-1">未解鎖</div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Subject Stats */}
        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            各科目表現
          </h2>
          {stats.bySubject.length === 0 ? (
            <p className="text-gray-500 text-center py-8">尚無答題記錄</p>
          ) : (
            <div className="space-y-4">
              {stats.bySubject.map((subject, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl">
                    {subject.subjectIcon || '📚'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">
                        {subject.subjectName}
                      </span>
                      <span className="text-sm text-gray-500">
                        {subject.correct}/{subject.attempts} 題
                      </span>
                    </div>
                    <ProgressBar
                      value={subject.correctRate}
                      max={100}
                      color={
                        subject.correctRate >= 80
                          ? 'green'
                          : subject.correctRate >= 60
                          ? 'yellow'
                          : 'red'
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Unit Stats */}
        {stats.byUnit.length > 0 && (
          <Card variant="elevated" padding="lg">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              單元表現 (前10)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.byUnit.map((unit) => (
                <div
                  key={unit.unitId}
                  className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 truncate">
                      {unit.unitName}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        unit.correctRate >= 80
                          ? 'bg-green-100 text-green-700'
                          : unit.correctRate >= 60
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {unit.correctRate}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {unit.academicYear}_{unit.grade}{unit.semester} · {unit.correct}/{unit.attempts} 題
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Recent Activity Chart */}
        {stats.recentActivity.length > 0 && (
          <Card variant="elevated" padding="lg">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              近7天活動
            </h2>
            <div className="flex items-end justify-between gap-2 h-32">
              {stats.recentActivity.map((day) => {
                const maxAttempts = Math.max(...stats.recentActivity.map((d) => d.attempts));
                const height = maxAttempts > 0 ? (day.attempts / maxAttempts) * 100 : 0;
                const correctRate = day.attempts > 0 ? (day.correct / day.attempts) * 100 : 0;

                return (
                  <div key={day._id} className="flex-1 flex flex-col items-center">
                    <div
                      className={`w-full rounded-t-lg transition-all ${
                        correctRate >= 80
                          ? 'bg-green-400'
                          : correctRate >= 60
                          ? 'bg-yellow-400'
                          : 'bg-red-400'
                      }`}
                      style={{ height: `${height}%`, minHeight: day.attempts > 0 ? '8px' : '0' }}
                      title={`${day.attempts} 題，正確率 ${Math.round(correctRate)}%`}
                    />
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(day._id).toLocaleDateString('zh-TW', {
                        month: 'numeric',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Attempt History */}
        <Card variant="elevated" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">答題記錄</h2>
            <div className="flex gap-2">
              {(['all', 'correct', 'incorrect'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setAttemptsFilter(filter);
                    setAttemptsPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    attemptsFilter === filter
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter === 'all' ? '全部' : filter === 'correct' ? '正確' : '錯誤'}
                </button>
              ))}
            </div>
          </div>

          {attemptsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto" />
            </div>
          ) : attempts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">尚無答題記錄</p>
          ) : (
            <div className="space-y-3">
              {attempts.map((attempt) => (
                <div
                  key={attempt._id}
                  className={`p-4 rounded-lg border ${
                    attempt.isCorrect
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {attempt.isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 line-clamp-2">
                        {attempt.question.content.text}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-500">
                        {attempt.subject && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            {attempt.subject.icon} {attempt.subject.name}
                          </span>
                        )}
                        {attempt.unit && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">
                            {attempt.unit.academicYear}_{attempt.unit.grade}{attempt.unit.semester} / {attempt.unit.name}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded ${
                          attempt.question.difficulty === 'easy'
                            ? 'bg-green-100 text-green-700'
                            : attempt.question.difficulty === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {attempt.question.difficulty === 'easy' ? '簡單' : attempt.question.difficulty === 'medium' ? '中等' : '困難'}
                        </span>
                        <span>⏱ {attempt.timeSpentSeconds}秒</span>
                        {attempt.isCorrect && (
                          <>
                            <span className="text-blue-600">+{attempt.expGained} 經驗</span>
                            <span className="text-yellow-600">+{attempt.goldGained} 金幣</span>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDate(attempt.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {attemptsPagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">
                第 {attemptsPagination.page} / {attemptsPagination.totalPages} 頁
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={attemptsPagination.page <= 1}
                  onClick={() =>
                    setAttemptsPagination((p) => ({ ...p, page: p.page - 1 }))
                  }
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={attemptsPagination.page >= attemptsPagination.totalPages}
                  onClick={() =>
                    setAttemptsPagination((p) => ({ ...p, page: p.page + 1 }))
                  }
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Account Info */}
        <Card variant="outlined" padding="md">
          <div className="flex flex-wrap gap-6 text-sm text-gray-500">
            <div>
              <span className="font-medium">註冊時間：</span>
              {formatDate(student.createdAt)}
            </div>
            <div>
              <span className="font-medium">最後登入：</span>
              {formatRelativeTime(student.lastLoginAt)}
            </div>
            <div>
              <span className="font-medium">首次答題：</span>
              {formatDate(stats.overview.firstAttemptAt)}
            </div>
            <div>
              <span className="font-medium">最後答題：</span>
              {formatRelativeTime(stats.overview.lastAttemptAt)}
            </div>
          </div>
        </Card>
      </div>

      {/* Add to Class Modal */}
      {showClassModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold">加入班級</h3>
              <button
                onClick={() => {
                  setShowClassModal(false);
                  setSelectedClassId('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              {classesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                  <p className="text-gray-500 mt-2">載入班級列表...</p>
                </div>
              ) : allClasses.length === 0 ? (
                <p className="text-gray-500 text-center py-8">尚無可加入的班級</p>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-3">
                    選擇要將「{student.displayName}」加入的班級：
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {allClasses
                      .filter((cls) => !student.classes?.some((sc) => sc._id === cls._id))
                      .map((cls) => (
                        <label
                          key={cls._id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedClassId === cls._id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="classSelect"
                            value={cls._id}
                            checked={selectedClassId === cls._id}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{cls.name}</p>
                            <p className="text-xs text-gray-500">
                              {cls.studentCount}/{cls.maxStudents} 位學生
                              {cls.academicYearId && ` · ${cls.academicYearId.name}`}
                            </p>
                          </div>
                        </label>
                      ))}
                    {allClasses.filter((cls) => !student.classes?.some((sc) => sc._id === cls._id))
                      .length === 0 && (
                      <p className="text-gray-500 text-center py-4">
                        學生已加入所有班級
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowClassModal(false);
                  setSelectedClassId('');
                }}
              >
                取消
              </Button>
              <Button
                variant="primary"
                onClick={handleAddToClass}
                disabled={!selectedClassId || addingToClass}
              >
                {addingToClass ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    處理中...
                  </>
                ) : (
                  '確認加入'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
};

export default StudentDetailPage;
