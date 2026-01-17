import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Map,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ChevronRight,
  FileQuestion,
  Lock,
  Unlock,
  GripVertical,
} from 'lucide-react';
import { Card, Button } from '../../components/ui';
import TeacherLayout from '../../components/layout/TeacherLayout';
import { stageService, Stage } from '../../services/stages';

const Stages = () => {
  const navigate = useNavigate();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load stages
  useEffect(() => {
    loadStages();
  }, []);

  const loadStages = async () => {
    setLoading(true);
    try {
      const result = await stageService.list({ includeInactive: true, limit: 100 });
      setStages(result.stages);
    } catch (err) {
      console.error('Failed to load stages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await stageService.delete(id);
      setStages(stages.filter(s => s._id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete stage:', err);
      alert('刪除失敗');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (stage: Stage) => {
    try {
      await stageService.update(stage._id, { isActive: !stage.isActive });
      setStages(stages.map(s =>
        s._id === stage._id ? { ...s, isActive: !s.isActive } : s
      ));
    } catch (err) {
      console.error('Failed to toggle stage:', err);
      alert('操作失敗');
    }
  };

  const getUnlockConditionText = (stage: Stage) => {
    switch (stage.unlockCondition?.type) {
      case 'none':
        return '直接開放';
      case 'previous':
        return '完成前一關';
      case 'level':
        return `等級 ${stage.unlockCondition.value}`;
      case 'stage':
        const requiredStage = stages.find(s => s._id === stage.unlockCondition.value);
        return `完成 ${requiredStage?.name || '指定關卡'}`;
      default:
        return '直接開放';
    }
  };

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">關卡管理</h1>
            <p className="text-gray-500 mt-1">建立和管理學生的冒險關卡</p>
          </div>
          <Button onClick={() => navigate('/teacher/stages/new')}>
            <Plus className="w-4 h-4 mr-2" />
            新增關卡
          </Button>
        </div>

        {/* Info Card */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Map className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">關於關卡系統</h3>
              <p className="text-sm text-blue-700 mt-1">
                關卡是學生在冒險地圖上看到的挑戰點。每個關卡可以包含多個單元的題目，
                學生需要完成關卡內的題目才能獲得通關獎勵。您可以設定解鎖條件來控制學生的學習進度。
              </p>
            </div>
          </div>
        </Card>

        {/* Stages List */}
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto" />
          </div>
        ) : stages.length === 0 ? (
          <Card className="p-12 text-center">
            <Map className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">還沒有任何關卡</h3>
            <p className="text-gray-500 mb-4">建立第一個關卡，讓學生開始冒險吧！</p>
            <Button onClick={() => navigate('/teacher/stages/new')}>
              <Plus className="w-4 h-4 mr-2" />
              新增關卡
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {stages.map((stage, index) => (
              <Card
                key={stage._id}
                className={`p-4 ${!stage.isActive ? 'opacity-60 bg-gray-50' : ''}`}
              >
                <div className="flex items-center gap-4">
                  {/* Order & Icon */}
                  <div className="flex items-center gap-3">
                    <div className="text-gray-400 cursor-grab">
                      <GripVertical className="w-5 h-5" />
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-2xl">
                      {stage.icon}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">#{index + 1}</span>
                      <h3 className="font-semibold text-gray-800">{stage.name}</h3>
                      {!stage.isActive && (
                        <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                          未上架
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                      {stage.description || '無描述'}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1 text-gray-600">
                        <FileQuestion className="w-4 h-4" />
                        {stage.questionCount || 0} 題
                      </span>
                      <span className="flex items-center gap-1 text-gray-600">
                        {stage.unlockCondition?.type === 'none' ? (
                          <Unlock className="w-4 h-4 text-green-500" />
                        ) : (
                          <Lock className="w-4 h-4 text-orange-500" />
                        )}
                        {getUnlockConditionText(stage)}
                      </span>
                      <span className="text-gray-600">
                        每次 {stage.questionsPerSession} 題
                      </span>
                    </div>
                  </div>

                  {/* Units Preview */}
                  <div className="hidden md:block">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {(stage.unitIds as any[]).slice(0, 3).map((unit, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                        >
                          {typeof unit === 'object' ? unit.name : '單元'}
                        </span>
                      ))}
                      {stage.unitIds.length > 3 && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          +{stage.unitIds.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleActive(stage)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title={stage.isActive ? '下架' : '上架'}
                    >
                      {stage.isActive ? (
                        <Eye className="w-4 h-4 text-green-600" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => navigate(`/teacher/stages/${stage._id}`)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title="編輯"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(stage._id)}
                      className="p-2 hover:bg-red-50 rounded-lg"
                      title="刪除"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">確認刪除關卡？</h3>
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
                  onClick={() => handleDelete(deleteConfirm)}
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

export default Stages;
