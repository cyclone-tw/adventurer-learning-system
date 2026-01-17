import { useState, useEffect, useRef } from 'react';
import {
  BarChart3,
  Users,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Award,
  Calendar,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Download,
  FileText,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TeacherLayout } from '../../components/layout';
import { Card, Button } from '../../components/ui';
import {
  reportService,
  DashboardStats,
  QuestionAnalysis,
  SUBJECT_NAMES,
  DIFFICULTY_NAMES,
  TYPE_NAMES,
} from '../../services/reports';
import {
  exportDashboardToPDF,
  exportDashboardToExcel,
  exportQuestionAnalysisToPDF,
  exportQuestionAnalysisToExcel,
} from '../../utils/exportUtils';

type TabType = 'overview' | 'questions';

// Export Dropdown Component
const ExportDropdown = ({
  onExportPDF,
  onExportExcel,
  disabled,
}: {
  onExportPDF: () => void;
  onExportExcel: () => void;
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<'pdf' | 'excel' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async (type: 'pdf' | 'excel') => {
    setIsExporting(type);
    try {
      if (type === 'pdf') {
        await onExportPDF();
      } else {
        onExportExcel();
      }
    } finally {
      setIsExporting(null);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Download className="w-4 h-4" />
        匯出報告
      </button>

      {isOpen && (
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
  );
};

const Reports = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
  const [questionData, setQuestionData] = useState<QuestionAnalysis | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'questions') {
      loadQuestionData();
    }
  }, [activeTab, selectedClassId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const data = await reportService.getDashboardStats();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestionData = async () => {
    setLoading(true);
    try {
      const data = await reportService.getQuestionAnalysis(
        selectedClassId ? { classId: selectedClassId } : undefined
      );
      setQuestionData(data);
    } catch (error) {
      console.error('Failed to load question data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview' as TabType, name: '總覽', icon: BarChart3 },
    { id: 'questions' as TabType, name: '題目分析', icon: BookOpen },
  ];

  // Export handlers
  const handleExportPDF = async () => {
    if (activeTab === 'overview' && dashboardData) {
      await exportDashboardToPDF(dashboardData);
    } else if (activeTab === 'questions' && questionData) {
      await exportQuestionAnalysisToPDF(questionData);
    }
  };

  const handleExportExcel = () => {
    if (activeTab === 'overview' && dashboardData) {
      exportDashboardToExcel(dashboardData);
    } else if (activeTab === 'questions' && questionData) {
      exportQuestionAnalysisToExcel(questionData);
    }
  };

  const canExport = (activeTab === 'overview' && dashboardData) || (activeTab === 'questions' && questionData);

  return (
    <TeacherLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">報表中心</h1>
            <p className="text-gray-500">查看學習數據與統計分析</p>
          </div>
          <ExportDropdown
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
            disabled={!canExport || loading}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : activeTab === 'overview' ? (
          <OverviewTab data={dashboardData} onNavigateToClass={(id) => navigate(`/teacher/classes/${id}`)} />
        ) : (
          <QuestionsTab
            data={questionData}
            classes={dashboardData?.classes || []}
            selectedClassId={selectedClassId}
            onClassChange={setSelectedClassId}
          />
        )}
      </div>
    </TeacherLayout>
  );
};

// Overview Tab
const OverviewTab = ({
  data,
  onNavigateToClass,
}: {
  data: DashboardStats | null;
  onNavigateToClass: (id: string) => void;
}) => {
  if (!data) {
    return (
      <Card variant="outlined" className="text-center py-12">
        <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">尚無數據</p>
      </Card>
    );
  }

  const statCards = [
    {
      label: '班級數',
      value: data.overview.totalClasses,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: '學生數',
      value: data.overview.totalStudents,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: '題目數',
      value: data.overview.totalQuestions,
      icon: BookOpen,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: '總答題次數',
      value: data.overview.totalAttempts,
      icon: Target,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      label: '正確率',
      value: `${data.overview.correctRate}%`,
      icon: Award,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      label: '今日答題',
      value: data.overview.todayAttempts,
      icon: Calendar,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} variant="elevated" padding="md">
            <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* Weekly Trend */}
      <Card variant="elevated" padding="lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">近 7 日答題趨勢</h3>
        {data.weeklyTrend.length > 0 ? (
          <div className="space-y-3">
            {data.weeklyTrend.map((day) => (
              <div key={day.date} className="flex items-center gap-4">
                <div className="w-24 text-sm text-gray-500">{day.date.slice(5)}</div>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-end pr-2"
                      style={{ width: `${Math.min((day.attempts / Math.max(...data.weeklyTrend.map((d) => d.attempts))) * 100, 100)}%` }}
                    >
                      {day.attempts > 0 && (
                        <span className="text-xs text-white font-medium">{day.attempts}</span>
                      )}
                    </div>
                  </div>
                  <div className="w-16 text-right">
                    <span className={`text-sm font-medium ${day.correctRate >= 70 ? 'text-green-600' : day.correctRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {day.correctRate}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">暫無答題記錄</p>
        )}
      </Card>

      {/* Classes List */}
      <Card variant="elevated" padding="lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">班級列表</h3>
        {data.classes.length > 0 ? (
          <div className="space-y-2">
            {data.classes.map((classItem) => (
              <button
                key={classItem._id}
                onClick={() => onNavigateToClass(classItem._id)}
                className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">{classItem.name}</div>
                    <div className="text-sm text-gray-500">{classItem.studentCount} 位學生</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">尚未建立班級</p>
        )}
      </Card>
    </div>
  );
};

// Questions Tab
const QuestionsTab = ({
  data,
  classes,
  selectedClassId,
  onClassChange,
}: {
  data: QuestionAnalysis | null;
  classes: Array<{ _id: string; name: string; studentCount: number }>;
  selectedClassId: string;
  onClassChange: (id: string) => void;
}) => {
  if (!data) {
    return (
      <Card variant="outlined" className="text-center py-12">
        <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">尚無題目數據</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Class Filter */}
      {classes.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">篩選班級：</label>
          <select
            value={selectedClassId}
            onChange={(e) => onClassChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">全部班級</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{data.summary.totalQuestions}</div>
              <div className="text-sm text-gray-500">題目總數</div>
            </div>
          </div>
        </Card>
        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{data.summary.totalAttempts}</div>
              <div className="text-sm text-gray-500">答題次數</div>
            </div>
          </div>
        </Card>
        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{data.summary.avgCorrectRate}%</div>
              <div className="text-sm text-gray-500">平均正確率</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Stats by Difficulty & Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Difficulty */}
        <Card variant="elevated" padding="lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">依難度分析</h3>
          <div className="space-y-4">
            {data.byDifficulty.map((item) => (
              <div key={item.difficulty} className="flex items-center gap-4">
                <div className="w-16 text-sm font-medium text-gray-700">
                  {DIFFICULTY_NAMES[item.difficulty] || item.difficulty}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">{item.attempts} 次作答</span>
                    <span className={`font-medium ${item.correctRate >= 70 ? 'text-green-600' : item.correctRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {item.correctRate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-full rounded-full ${item.correctRate >= 70 ? 'bg-green-500' : item.correctRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${item.correctRate}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {data.byDifficulty.length === 0 && (
              <p className="text-gray-500 text-center py-4">暫無數據</p>
            )}
          </div>
        </Card>

        {/* By Type */}
        <Card variant="elevated" padding="lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">依題型分析</h3>
          <div className="space-y-4">
            {data.byType.map((item) => (
              <div key={item.type} className="flex items-center gap-4">
                <div className="w-16 text-sm font-medium text-gray-700">
                  {TYPE_NAMES[item.type] || item.type}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">{item.attempts} 次作答</span>
                    <span className={`font-medium ${item.correctRate >= 70 ? 'text-green-600' : item.correctRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {item.correctRate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-full rounded-full ${item.correctRate >= 70 ? 'bg-green-500' : item.correctRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${item.correctRate}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {data.byType.length === 0 && (
              <p className="text-gray-500 text-center py-4">暫無數據</p>
            )}
          </div>
        </Card>
      </div>

      {/* Hard Questions */}
      <Card variant="elevated" padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold text-gray-900">較難題目</h3>
          <span className="text-sm text-gray-500">（正確率 &lt; 40%）</span>
        </div>
        {data.hardQuestions.length > 0 ? (
          <div className="space-y-3">
            {data.hardQuestions.map((q) => (
              <QuestionRow key={q._id} question={q} variant="hard" />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">沒有較難的題目</p>
        )}
      </Card>

      {/* Easy Questions */}
      <Card variant="elevated" padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <h3 className="text-lg font-semibold text-gray-900">較簡單題目</h3>
          <span className="text-sm text-gray-500">（正確率 &gt; 80%）</span>
        </div>
        {data.easyQuestions.length > 0 ? (
          <div className="space-y-3">
            {data.easyQuestions.map((q) => (
              <QuestionRow key={q._id} question={q} variant="easy" />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">沒有較簡單的題目</p>
        )}
      </Card>

      {/* Most Attempted */}
      <Card variant="elevated" padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">最常被作答的題目</h3>
        </div>
        {data.mostAttempted.length > 0 ? (
          <div className="space-y-3">
            {data.mostAttempted.map((q) => (
              <QuestionRow key={q._id} question={q} variant="popular" />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">暫無數據</p>
        )}
      </Card>
    </div>
  );
};

// Question Row Component
const QuestionRow = ({
  question,
  variant,
}: {
  question: {
    _id: string;
    subject: string;
    difficulty: string;
    type: string;
    content: string;
    attempts: number;
    correctRate: number;
    avgTime: number;
  };
  variant: 'hard' | 'easy' | 'popular';
}) => {
  const difficultyColors: Record<string, string> = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700',
  };

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 truncate">{question.content}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500">
            {SUBJECT_NAMES[question.subject] || question.subject}
          </span>
          <span className="text-gray-300">•</span>
          <span className={`text-xs px-2 py-0.5 rounded ${difficultyColors[question.difficulty] || 'bg-gray-100 text-gray-700'}`}>
            {DIFFICULTY_NAMES[question.difficulty] || question.difficulty}
          </span>
          <span className="text-gray-300">•</span>
          <span className="text-xs text-gray-500">
            {TYPE_NAMES[question.type] || question.type}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="text-center">
          <div className="font-medium text-gray-900">{question.attempts}</div>
          <div className="text-xs text-gray-500">次作答</div>
        </div>
        <div className="text-center">
          <div className={`font-medium ${
            variant === 'hard' ? 'text-red-600' :
            variant === 'easy' ? 'text-green-600' :
            'text-blue-600'
          }`}>
            {question.correctRate}%
          </div>
          <div className="text-xs text-gray-500">正確率</div>
        </div>
        <div className="text-center">
          <div className="font-medium text-gray-900">{question.avgTime}s</div>
          <div className="text-xs text-gray-500">平均時間</div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
