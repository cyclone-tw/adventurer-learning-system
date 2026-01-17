import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Image,
  Music,
  Video,
  X,
  Upload,
  Eye,
  Save,
} from 'lucide-react';
import TeacherLayout from '../../components/layout/TeacherLayout';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import {
  Question,
  QuestionFormData,
  QuestionOption,
  Difficulty,
  QuestionType,
  MediaItem,
  DIFFICULTY_CONFIG,
  QUESTION_TYPE_NAMES,
  DEFAULT_REWARDS,
} from '../../types/question';
import questionsService from '../../services/questions';
import {
  subjectService,
  academicYearService,
  unitService,
  Subject as SubjectType,
  AcademicYear,
  Unit,
} from '../../services/curriculum';

const QuestionEditorPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEditing = !!id;

  // URL parameters for pre-selecting unit (when coming from UnitDetail page)
  const urlUnitId = searchParams.get('unitId');
  const urlSubjectId = searchParams.get('subjectId');
  const urlAcademicYear = searchParams.get('academicYear');
  const urlGrade = searchParams.get('grade');
  const urlSemester = searchParams.get('semester');

  // Form state
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  // Curriculum data
  const [subjects, setSubjects] = useState<SubjectType[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Form data - hierarchy
  const [subjectId, setSubjectId] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [grade, setGrade] = useState<number>(1);
  const [semester, setSemester] = useState<'上' | '下'>('上');
  const [unitId, setUnitId] = useState('');

  // Form data - question
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [questionType, setQuestionType] = useState<QuestionType>('single_choice');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<QuestionOption[]>([
    { id: 'A', text: '' },
    { id: 'B', text: '' },
    { id: 'C', text: '' },
    { id: 'D', text: '' },
  ]);
  const [correctAnswer, setCorrectAnswer] = useState<string | string[]>('');
  const [explanation, setExplanation] = useState('');
  const [tags, setTags] = useState('');
  const [baseExp, setBaseExp] = useState(10);
  const [baseGold, setBaseGold] = useState(5);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [monsterName, setMonsterName] = useState('');
  const [monsterDescription, setMonsterDescription] = useState('');

  // Preview
  const [showPreview, setShowPreview] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);

  // Load subjects and academic years on mount
  useEffect(() => {
    const loadCurriculumData = async () => {
      try {
        const [subjectsData, yearsData] = await Promise.all([
          subjectService.list(),
          academicYearService.list(),
        ]);
        setSubjects(subjectsData);
        setAcademicYears(yearsData);

        // Set defaults if creating new question
        if (!isEditing) {
          // Check if we have URL parameters (coming from UnitDetail page)
          if (urlSubjectId) {
            setSubjectId(urlSubjectId);
          } else if (subjectsData.length > 0) {
            setSubjectId(subjectsData[0]._id);
          }

          if (urlAcademicYear) {
            setAcademicYear(urlAcademicYear);
          } else if (yearsData.length > 0) {
            setAcademicYear(yearsData[0].year);
          }

          if (urlGrade) {
            setGrade(Number(urlGrade));
          }

          if (urlSemester === '上' || urlSemester === '下') {
            setSemester(urlSemester);
          }

          if (urlUnitId) {
            setUnitId(urlUnitId);
          }
        }
      } catch (error) {
        console.error('Failed to load curriculum data:', error);
      }
    };
    loadCurriculumData();
  }, [isEditing, urlSubjectId, urlAcademicYear, urlGrade, urlSemester, urlUnitId]);

  // Load units when filters change
  useEffect(() => {
    const loadUnits = async () => {
      if (!subjectId || !academicYear) {
        setUnits([]);
        return;
      }

      setLoadingUnits(true);
      try {
        const response = await unitService.list({
          subjectId,
          academicYear,
          grade,
          semester,
          limit: 100,
        });
        setUnits(response.data);

        // Auto-select first unit if not editing
        if (!isEditing && response.data.length > 0 && !unitId) {
          setUnitId(response.data[0]._id);
        }
      } catch (error) {
        console.error('Failed to load units:', error);
        setUnits([]);
      } finally {
        setLoadingUnits(false);
      }
    };
    loadUnits();
  }, [subjectId, academicYear, grade, semester, isEditing]);

  // Update rewards when difficulty changes
  useEffect(() => {
    if (!isEditing) {
      const rewards = DEFAULT_REWARDS[difficulty];
      setBaseExp(rewards.exp);
      setBaseGold(rewards.gold);
    }
  }, [difficulty, isEditing]);

  // Load question for editing
  useEffect(() => {
    if (id) {
      const loadQuestion = async () => {
        try {
          const question = await questionsService.getQuestion(id);

          // Set hierarchy fields
          if (question.subjectId) {
            const sid = typeof question.subjectId === 'object' ? question.subjectId._id : question.subjectId;
            setSubjectId(sid);
          }
          if (question.unitId) {
            const unit = typeof question.unitId === 'object' ? question.unitId : null;
            if (unit) {
              setAcademicYear(unit.academicYear);
              setGrade(unit.grade);
              setSemester(unit.semester);
            }
            setUnitId(typeof question.unitId === 'object' ? question.unitId._id : question.unitId);
          }

          // Set question fields
          setDifficulty(question.difficulty);
          setQuestionType(question.type);
          setQuestionText(question.content.text);
          setOptions(question.options || []);
          setCorrectAnswer(question.answer.correct);
          setExplanation(question.answer.explanation || '');
          setTags(question.tags.join(', '));
          setBaseExp(question.baseExp);
          setBaseGold(question.baseGold);
          setMedia(question.content.media || []);
          setMonsterName(question.content.adventureContext?.monsterName || '');
          setMonsterDescription(question.content.adventureContext?.description || '');
        } catch (error) {
          console.error('Failed to load question:', error);
          alert('載入題目失敗');
          navigate('/teacher/questions');
        } finally {
          setLoading(false);
        }
      };
      loadQuestion();
    }
  }, [id, navigate]);

  // Get current subject for display
  const currentSubject = useMemo(() => {
    return subjects.find((s) => s._id === subjectId);
  }, [subjects, subjectId]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await questionsService.uploadMedia(file);
      setMedia([
        ...media,
        {
          type: result.type,
          url: result.url,
          publicId: result.publicId,
          duration: result.duration,
          width: result.width,
          height: result.height,
        },
      ]);
    } catch (error: any) {
      alert(error.message || '上傳失敗');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Remove media
  const handleRemoveMedia = async (index: number) => {
    const item = media[index];
    if (item.publicId) {
      try {
        await questionsService.deleteMedia(
          item.publicId,
          item.type === 'image' ? 'image' : 'video'
        );
      } catch (error) {
        console.error('Failed to delete media:', error);
      }
    }
    setMedia(media.filter((_, i) => i !== index));
  };

  // Add option
  const addOption = () => {
    const nextId = String.fromCharCode(65 + options.length);
    if (options.length < 6) {
      setOptions([...options, { id: nextId, text: '' }]);
    }
  };

  // Remove option
  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      const reindexed = newOptions.map((opt, i) => ({
        ...opt,
        id: String.fromCharCode(65 + i),
      }));
      setOptions(reindexed);
      if (Array.isArray(correctAnswer)) {
        setCorrectAnswer(
          correctAnswer.filter((a) => reindexed.some((o) => o.id === a))
        );
      } else if (!reindexed.some((o) => o.id === correctAnswer)) {
        setCorrectAnswer('');
      }
    }
  };

  // Update option text
  const updateOption = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], text };
    setOptions(newOptions);
  };

  // Handle answer selection
  const handleAnswerSelect = (optionId: string) => {
    if (questionType === 'multiple_choice') {
      const current = Array.isArray(correctAnswer) ? correctAnswer : [];
      if (current.includes(optionId)) {
        setCorrectAnswer(current.filter((a) => a !== optionId));
      } else {
        setCorrectAnswer([...current, optionId]);
      }
    } else {
      setCorrectAnswer(optionId);
    }
  };

  // Save question
  const handleSave = async () => {
    // Validation
    if (!subjectId) {
      alert('請選擇科目');
      return;
    }
    if (!unitId) {
      alert('請選擇單元');
      return;
    }
    if (!questionText.trim()) {
      alert('請輸入題目內容');
      return;
    }
    if (['single_choice', 'multiple_choice', 'true_false'].includes(questionType)) {
      const filledOptions = options.filter((o) => o.text.trim());
      if (filledOptions.length < 2) {
        alert('請至少填寫兩個選項');
        return;
      }
      if (!correctAnswer || (Array.isArray(correctAnswer) && correctAnswer.length === 0)) {
        alert('請選擇正確答案');
        return;
      }
    }

    setSaving(true);
    try {
      const formData: QuestionFormData = {
        subjectId,
        unitId,
        difficulty,
        type: questionType,
        content: {
          text: questionText,
          media: media.length > 0 ? media : undefined,
          adventureContext:
            monsterName || monsterDescription
              ? {
                  description: monsterDescription || '怪物擋住了你的去路！',
                  monsterName: monsterName || undefined,
                }
              : undefined,
        },
        options: options.filter((o) => o.text.trim()),
        answer: {
          correct: correctAnswer,
          explanation: explanation || undefined,
        },
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        baseExp,
        baseGold,
      };

      if (isEditing) {
        await questionsService.updateQuestion(id!, formData);
      } else {
        await questionsService.createQuestion(formData);
      }

      // Navigate back to unit detail if we came from there, otherwise to questions list
      if (urlUnitId) {
        navigate(`/teacher/curriculum/units/${urlUnitId}`);
      } else {
        navigate('/teacher/questions');
      }
    } catch (error: any) {
      alert(error.message || '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/teacher/questions')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? '編輯題目' : '新增題目'}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              leftIcon={<Eye className="w-4 h-4" />}
              onClick={() => setShowPreview(true)}
            >
              預覽
            </Button>
            <Button
              leftIcon={<Save className="w-4 h-4" />}
              onClick={handleSave}
              loading={saving}
            >
              儲存
            </Button>
          </div>
        </div>

        {/* Hierarchy Selection */}
        <Card padding="none">
          <div className="p-4 border-b bg-blue-50">
            <h2 className="font-semibold text-blue-900">課程階層</h2>
            <p className="text-sm text-blue-700 mt-1">選擇題目所屬的科目與單元</p>
          </div>
          <div className="p-4 space-y-4">
            {/* Subject Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                科目 *
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {subjects.map((s) => (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => {
                      setSubjectId(s._id);
                      setUnitId('');
                    }}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      subjectId === s._id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{s.icon}</span>
                    <span className="text-sm font-medium">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Grade Level Selection */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  學年度 *
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => {
                    setAcademicYear(e.target.value);
                    setUnitId('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">選擇學年度</option>
                  {academicYears.map((y) => (
                    <option key={y._id} value={y.year}>
                      {y.year}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  年級 *
                </label>
                <select
                  value={grade}
                  onChange={(e) => {
                    setGrade(Number(e.target.value));
                    setUnitId('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {[1, 2, 3, 4, 5, 6].map((g) => (
                    <option key={g} value={g}>
                      {g} 年級
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  學期 *
                </label>
                <select
                  value={semester}
                  onChange={(e) => {
                    setSemester(e.target.value as '上' | '下');
                    setUnitId('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="上">上學期</option>
                  <option value="下">下學期</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  單元 *
                </label>
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={loadingUnits || units.length === 0}
                >
                  <option value="">
                    {loadingUnits ? '載入中...' : units.length === 0 ? '無可用單元' : '選擇單元'}
                  </option>
                  {units.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Current Selection Display */}
            {subjectId && unitId && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 text-sm">
                  <span className="font-medium">已選擇：</span>
                  {currentSubject?.icon} {currentSubject?.name} / {academicYear}_{grade}{semester} / {units.find((u) => u._id === unitId)?.name}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Basic Info */}
        <Card padding="none">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900">題目設定</h2>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                難度 *
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(DIFFICULTY_CONFIG).map(([key, { name }]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                題型 *
              </label>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(QUESTION_TYPE_NAMES).map(([key, name]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Question Content */}
        <Card padding="none">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900">題目內容</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                題目文字 *
              </label>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="輸入題目內容..."
              />
            </div>

            {/* Media Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                媒體附件
              </label>
              <div className="flex flex-wrap gap-4">
                {media.map((item, index) => (
                  <div
                    key={index}
                    className="relative w-32 h-32 border rounded-lg overflow-hidden bg-gray-100"
                  >
                    {item.type === 'image' && (
                      <img src={item.url} alt="" className="w-full h-full object-cover" />
                    )}
                    {item.type === 'audio' && (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    {item.type === 'video' && (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <button
                      onClick={() => handleRemoveMedia(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1">
                      {item.type === 'image' ? '圖片' : item.type === 'audio' ? '音訊' : '影片'}
                    </div>
                  </div>
                ))}
                <label className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors">
                  {uploading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-gray-500 mt-1">上傳</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*,audio/*,video/*"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                支援圖片（10MB）、音訊（50MB）、影片（100MB）
              </p>
            </div>
          </div>
        </Card>

        {/* Options */}
        {['single_choice', 'multiple_choice', 'true_false'].includes(questionType) && (
          <Card padding="none">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">選項</h2>
              {options.length < 6 && (
                <Button variant="ghost" size="sm" onClick={addOption}>
                  <Plus className="w-4 h-4 mr-1" />
                  新增選項
                </Button>
              )}
            </div>
            <div className="p-4 space-y-3">
              {options.map((option, index) => {
                const isCorrect = Array.isArray(correctAnswer)
                  ? correctAnswer.includes(option.id)
                  : correctAnswer === option.id;

                return (
                  <div key={option.id} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleAnswerSelect(option.id)}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-medium transition-colors ${
                        isCorrect
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 text-gray-500 hover:border-green-500'
                      }`}
                    >
                      {option.id}
                    </button>
                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) => updateOption(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder={`選項 ${option.id}`}
                    />
                    {options.length > 2 && (
                      <button
                        onClick={() => removeOption(index)}
                        className="p-2 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
              <p className="text-sm text-gray-500">
                {questionType === 'multiple_choice'
                  ? '點擊選項圓圈選擇多個正確答案'
                  : '點擊選項圓圈選擇正確答案'}
              </p>
            </div>
          </Card>
        )}

        {/* Fill Blank Answer */}
        {questionType === 'fill_blank' && (
          <Card padding="none">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900">正確答案</h2>
            </div>
            <div className="p-4">
              <input
                type="text"
                value={typeof correctAnswer === 'string' ? correctAnswer : ''}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="輸入正確答案"
              />
            </div>
          </Card>
        )}

        {/* Explanation */}
        <Card padding="none">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900">答案解析</h2>
          </div>
          <div className="p-4">
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="解釋為什麼這是正確答案（可選）"
            />
          </div>
        </Card>

        {/* Additional Settings */}
        <Card padding="none">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900">其他設定</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  標籤（用逗號分隔）
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：加法, 基礎, 國小"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    經驗值
                  </label>
                  <input
                    type="number"
                    value={baseExp}
                    onChange={(e) => setBaseExp(parseInt(e.target.value) || 0)}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    金幣
                  </label>
                  <input
                    type="number"
                    value={baseGold}
                    onChange={(e) => setBaseGold(parseInt(e.target.value) || 0)}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Adventure Context */}
            <div className="pt-4 border-t">
              <h3 className="font-medium text-gray-900 mb-3">冒險敘事（可選）</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    怪物名稱
                  </label>
                  <input
                    type="text"
                    value={monsterName}
                    onChange={(e) => setMonsterName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="例如：數學精靈"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    情境描述
                  </label>
                  <input
                    type="text"
                    value={monsterDescription}
                    onChange={(e) => setMonsterDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="例如：數學精靈想考考你！"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Bottom Actions */}
        <div className="flex justify-end gap-2 pb-8">
          <Button variant="secondary" onClick={() => urlUnitId ? navigate(`/teacher/curriculum/units/${urlUnitId}`) : navigate('/teacher/questions')}>
            取消
          </Button>
          <Button onClick={handleSave} loading={saving}>
            儲存題目
          </Button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">題目預覽</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Hierarchy Info */}
              {currentSubject && unitId && (
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded flex items-center gap-1">
                    {currentSubject.icon} {currentSubject.name}
                  </span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                    {academicYear}_{grade}{semester}
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                    {units.find((u) => u._id === unitId)?.name}
                  </span>
                </div>
              )}

              {/* Adventure Context */}
              {(monsterName || monsterDescription) && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-purple-800">
                    {monsterDescription || '怪物擋住了你的去路！'}
                  </p>
                  {monsterName && (
                    <p className="text-sm text-purple-600 mt-1">— {monsterName}</p>
                  )}
                </div>
              )}

              {/* Media */}
              {media.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {media.map((item, i) => (
                    <div key={i} className="w-48">
                      {item.type === 'image' && (
                        <img src={item.url} alt="" className="rounded-lg" />
                      )}
                      {item.type === 'audio' && (
                        <audio src={item.url} controls className="w-full" />
                      )}
                      {item.type === 'video' && (
                        <video src={item.url} controls className="w-full rounded-lg" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Question */}
              <div className="text-lg font-medium text-gray-900">
                {questionText || '（請輸入題目）'}
              </div>

              {/* Options */}
              {['single_choice', 'multiple_choice', 'true_false'].includes(questionType) && (
                <div className="space-y-2">
                  {options
                    .filter((o) => o.text)
                    .map((option) => {
                      const isCorrect = Array.isArray(correctAnswer)
                        ? correctAnswer.includes(option.id)
                        : correctAnswer === option.id;
                      return (
                        <div
                          key={option.id}
                          className={`p-3 rounded-lg border-2 ${
                            isCorrect
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200'
                          }`}
                        >
                          <span className="font-medium mr-2">{option.id}.</span>
                          {option.text}
                          {isCorrect && (
                            <span className="ml-2 text-green-600 text-sm">✓ 正確答案</span>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Fill Blank Answer */}
              {questionType === 'fill_blank' && correctAnswer && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-green-700">正確答案：{correctAnswer}</span>
                </div>
              )}

              {/* Explanation */}
              {explanation && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-1">解析</h4>
                  <p className="text-blue-800">{explanation}</p>
                </div>
              )}

              {/* Meta */}
              <div className="flex flex-wrap gap-2 text-sm">
                <span
                  className={`px-2 py-1 rounded ${DIFFICULTY_CONFIG[difficulty].bgColor} ${DIFFICULTY_CONFIG[difficulty].color}`}
                >
                  {DIFFICULTY_CONFIG[difficulty].name}
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                  經驗值: {baseExp}
                </span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                  金幣: {baseGold}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
};

export default QuestionEditorPage;
