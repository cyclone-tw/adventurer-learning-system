import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Map,
  Settings,
  Gift,
  Lock,
  Plus,
  X,
  Check,
} from 'lucide-react';
import { Card, Button } from '../../components/ui';
import TeacherLayout from '../../components/layout/TeacherLayout';
import { stageService, Stage, UnlockConditionType } from '../../services/stages';
import {
  subjectService,
  academicYearService,
  unitService,
  Subject,
  AcademicYear,
  Unit,
} from '../../services/curriculum';

const EMOJI_OPTIONS = ['🏰', '⚔️', '🐉', '🌟', '🎯', '📚', '🧙', '🏆', '💎', '🔮', '🌈', '🎮'];

const StageEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  // Loading states
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  // Form data
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🏰');
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<('easy' | 'medium' | 'hard')[]>([]);
  const [order, setOrder] = useState(0);
  const [questionsPerSession, setQuestionsPerSession] = useState(10);
  const [unlockType, setUnlockType] = useState<UnlockConditionType>('none');
  const [unlockValue, setUnlockValue] = useState<number | string>('');
  const [bonusExp, setBonusExp] = useState(0);
  const [bonusGold, setBonusGold] = useState(0);
  const [firstClearExp, setFirstClearExp] = useState(50);
  const [firstClearGold, setFirstClearGold] = useState(25);
  const [isActive, setIsActive] = useState(true);

  // Curriculum data for unit selection
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitFilters, setUnitFilters] = useState({
    subjectId: '',
    academicYear: '',
    grade: '',
    semester: '',
  });
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Other stages for unlock condition
  const [otherStages, setOtherStages] = useState<Stage[]>([]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [subjectsData, yearsData, stagesData] = await Promise.all([
          subjectService.list(),
          academicYearService.list(),
          stageService.list({ includeInactive: true, limit: 100 }),
        ]);
        setSubjects(subjectsData);
        setAcademicYears(yearsData);
        setOtherStages(stagesData.stages.filter(s => s._id !== id));
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };
    loadData();
  }, [id]);

  // Load units when filters change
  useEffect(() => {
    const loadUnits = async () => {
      setLoadingUnits(true);
      try {
        const response = await unitService.list({
          subjectId: unitFilters.subjectId || undefined,
          academicYear: unitFilters.academicYear || undefined,
          grade: unitFilters.grade ? Number(unitFilters.grade) : undefined,
          semester: unitFilters.semester ? (unitFilters.semester as '上' | '下') : undefined,
          limit: 100,
        });
        setUnits(response.data);
      } catch (err) {
        console.error('Failed to load units:', err);
      } finally {
        setLoadingUnits(false);
      }
    };
    loadUnits();
  }, [unitFilters]);

  // Load stage for editing
  useEffect(() => {
    if (id) {
      const loadStage = async () => {
        try {
          const stage = await stageService.get(id);
          setName(stage.name);
          setDescription(stage.description || '');
          setIcon(stage.icon);
          setSelectedUnitIds(
            stage.unitIds.map((u) => (typeof u === 'object' ? u._id : u))
          );
          setDifficulty(stage.difficulty || []);
          setOrder(stage.order);
          setQuestionsPerSession(stage.questionsPerSession);
          setUnlockType(stage.unlockCondition?.type || 'none');
          setUnlockValue(stage.unlockCondition?.value || '');
          setBonusExp(stage.rewards?.bonusExp || 0);
          setBonusGold(stage.rewards?.bonusGold || 0);
          setFirstClearExp(stage.rewards?.firstClearBonus?.exp || 50);
          setFirstClearGold(stage.rewards?.firstClearBonus?.gold || 25);
          setIsActive(stage.isActive);
        } catch (err) {
          console.error('Failed to load stage:', err);
          navigate('/teacher/stages');
        } finally {
          setLoading(false);
        }
      };
      loadStage();
    }
  }, [id, navigate]);

  // Toggle unit selection
  const toggleUnit = (unitId: string) => {
    setSelectedUnitIds((prev) =>
      prev.includes(unitId)
        ? prev.filter((id) => id !== unitId)
        : [...prev, unitId]
    );
  };

  // Toggle difficulty filter
  const toggleDifficulty = (diff: 'easy' | 'medium' | 'hard') => {
    setDifficulty((prev) =>
      prev.includes(diff)
        ? prev.filter((d) => d !== diff)
        : [...prev, diff]
    );
  };

  // Save handler
  const handleSave = async () => {
    if (!name.trim()) {
      alert('請輸入關卡名稱');
      return;
    }
    if (selectedUnitIds.length === 0) {
      alert('請至少選擇一個單元');
      return;
    }

    setSaving(true);
    try {
      const data = {
        name,
        description,
        icon,
        unitIds: selectedUnitIds,
        difficulty: difficulty.length > 0 ? difficulty : undefined,
        order,
        questionsPerSession,
        unlockCondition: {
          type: unlockType,
          value: unlockType === 'level' ? Number(unlockValue) : unlockValue,
        },
        rewards: {
          bonusExp,
          bonusGold,
          firstClearBonus: {
            exp: firstClearExp,
            gold: firstClearGold,
          },
        },
        isActive,
      };

      if (isEditing) {
        await stageService.update(id!, data);
      } else {
        await stageService.create(data);
      }

      navigate('/teacher/stages');
    } catch (err: any) {
      alert(err.message || '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
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
              onClick={() => navigate('/teacher/stages')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">
              {isEditing ? '編輯關卡' : '新增關卡'}
            </h1>
          </div>
          <Button onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4 mr-2" />
            儲存
          </Button>
        </div>

        {/* Basic Info */}
        <Card padding="none">
          <div className="p-4 border-b bg-purple-50">
            <h2 className="font-semibold text-purple-900 flex items-center gap-2">
              <Map className="w-5 h-5" />
              基本資訊
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  關卡名稱 *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="例如：數學新手村"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  圖示
                </label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setIcon(emoji)}
                      className={`w-10 h-10 rounded-lg border-2 text-xl flex items-center justify-center transition-all ${
                        icon === emoji
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                描述
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="關卡的簡短描述..."
              />
            </div>
          </div>
        </Card>

        {/* Unit Selection */}
        <Card padding="none">
          <div className="p-4 border-b bg-blue-50">
            <h2 className="font-semibold text-blue-900 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              選擇單元
            </h2>
            <p className="text-sm text-blue-700 mt-1">
              選擇要包含在此關卡中的單元，學生將從這些單元的題目中隨機抽題
            </p>
          </div>
          <div className="p-4 space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select
                value={unitFilters.subjectId}
                onChange={(e) =>
                  setUnitFilters({ ...unitFilters, subjectId: e.target.value })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">全部科目</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.icon} {s.name}
                  </option>
                ))}
              </select>
              <select
                value={unitFilters.academicYear}
                onChange={(e) =>
                  setUnitFilters({ ...unitFilters, academicYear: e.target.value })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">全部學年度</option>
                {academicYears.map((y) => (
                  <option key={y._id} value={y.year}>
                    {y.year}
                  </option>
                ))}
              </select>
              <select
                value={unitFilters.grade}
                onChange={(e) =>
                  setUnitFilters({ ...unitFilters, grade: e.target.value })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">全部年級</option>
                {[1, 2, 3, 4, 5, 6].map((g) => (
                  <option key={g} value={g}>
                    {g} 年級
                  </option>
                ))}
              </select>
              <select
                value={unitFilters.semester}
                onChange={(e) =>
                  setUnitFilters({ ...unitFilters, semester: e.target.value })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">全部學期</option>
                <option value="上">上學期</option>
                <option value="下">下學期</option>
              </select>
            </div>

            {/* Selected Units */}
            {selectedUnitIds.length > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm text-green-700 mb-2">
                  已選擇 {selectedUnitIds.length} 個單元
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedUnitIds.map((unitId) => {
                    const unit = units.find((u) => u._id === unitId);
                    return (
                      <span
                        key={unitId}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-sm"
                      >
                        {unit?.name || unitId}
                        <button
                          onClick={() => toggleUnit(unitId)}
                          className="hover:text-green-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Units Grid */}
            {loadingUnits ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent mx-auto" />
              </div>
            ) : units.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                沒有符合條件的單元
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                {units.map((unit) => {
                  const isSelected = selectedUnitIds.includes(unit._id);
                  const subject =
                    typeof unit.subjectId === 'object' ? unit.subjectId : null;
                  return (
                    <button
                      key={unit._id}
                      type="button"
                      onClick={() => toggleUnit(unit._id)}
                      className={`p-3 text-left rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="font-medium text-sm truncate">
                          {unit.name}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 ml-7">
                        {subject?.icon} {subject?.name} • {unit.academicYear}_{unit.grade}
                        {unit.semester}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Settings */}
        <Card padding="none">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              關卡設定
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  每次挑戰題數
                </label>
                <input
                  type="number"
                  value={questionsPerSession}
                  onChange={(e) =>
                    setQuestionsPerSession(Math.max(1, Math.min(50, Number(e.target.value))))
                  }
                  min={1}
                  max={50}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  排序順序
                </label>
                <input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                  min={0}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                難度篩選（留空表示全部難度）
              </label>
              <div className="flex gap-2">
                {[
                  { id: 'easy', label: '簡單', color: 'green' },
                  { id: 'medium', label: '中等', color: 'yellow' },
                  { id: 'hard', label: '困難', color: 'red' },
                ].map((diff) => (
                  <button
                    key={diff.id}
                    type="button"
                    onClick={() => toggleDifficulty(diff.id as any)}
                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                      difficulty.includes(diff.id as any)
                        ? `border-${diff.color}-500 bg-${diff.color}-50 text-${diff.color}-700`
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {diff.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">
                上架此關卡（學生可見）
              </label>
            </div>
          </div>
        </Card>

        {/* Unlock Condition */}
        <Card padding="none">
          <div className="p-4 border-b bg-orange-50">
            <h2 className="font-semibold text-orange-900 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              解鎖條件
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { type: 'none', label: '直接開放' },
                { type: 'previous', label: '完成前一關' },
                { type: 'level', label: '等級限制' },
                { type: 'stage', label: '完成指定關卡' },
              ].map((option) => (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => {
                    setUnlockType(option.type as UnlockConditionType);
                    setUnlockValue('');
                  }}
                  className={`p-3 rounded-lg border-2 text-sm transition-all ${
                    unlockType === option.type
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {unlockType === 'level' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  需要的等級
                </label>
                <input
                  type="number"
                  value={unlockValue as number}
                  onChange={(e) => setUnlockValue(Number(e.target.value))}
                  min={1}
                  className="w-32 px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            )}

            {unlockType === 'stage' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  需要完成的關卡
                </label>
                <select
                  value={unlockValue as string}
                  onChange={(e) => setUnlockValue(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">選擇關卡</option>
                  {otherStages.map((stage) => (
                    <option key={stage._id} value={stage._id}>
                      {stage.icon} {stage.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </Card>

        {/* Rewards */}
        <Card padding="none">
          <div className="p-4 border-b bg-yellow-50">
            <h2 className="font-semibold text-yellow-900 flex items-center gap-2">
              <Gift className="w-5 h-5" />
              通關獎勵
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  通關經驗值
                </label>
                <input
                  type="number"
                  value={bonusExp}
                  onChange={(e) => setBonusExp(Math.max(0, Number(e.target.value)))}
                  min={0}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  通關金幣
                </label>
                <input
                  type="number"
                  value={bonusGold}
                  onChange={(e) => setBonusGold(Math.max(0, Number(e.target.value)))}
                  min={0}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  首次通關經驗
                </label>
                <input
                  type="number"
                  value={firstClearExp}
                  onChange={(e) => setFirstClearExp(Math.max(0, Number(e.target.value)))}
                  min={0}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  首次通關金幣
                </label>
                <input
                  type="number"
                  value={firstClearGold}
                  onChange={(e) => setFirstClearGold(Math.max(0, Number(e.target.value)))}
                  min={0}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Bottom Actions */}
        <div className="flex justify-end gap-3 pb-8">
          <Button variant="secondary" onClick={() => navigate('/teacher/stages')}>
            取消
          </Button>
          <Button onClick={handleSave} loading={saving}>
            儲存關卡
          </Button>
        </div>
      </div>
    </TeacherLayout>
  );
};

export default StageEditor;
