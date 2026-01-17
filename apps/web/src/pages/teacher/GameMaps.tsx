import { useState, useEffect } from 'react';
import {
  Map,
  Plus,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Search,
  Trees,
  Castle,
  Mountain,
  Building,
  Snowflake,
  SunDim,
  Waves,
} from 'lucide-react';
import { TeacherLayout } from '../../components/layout';
import { Card, Button } from '../../components/ui';
import gameMapService, { GameMapData, MapTheme } from '../../services/gameMap';

const THEME_CONFIG: Record<
  MapTheme,
  { icon: React.ElementType; label: string; gradient: string }
> = {
  forest: { icon: Trees, label: '森林', gradient: 'from-green-400 to-emerald-600' },
  castle: { icon: Castle, label: '城堡', gradient: 'from-amber-400 to-orange-600' },
  cave: { icon: Mountain, label: '洞穴', gradient: 'from-gray-500 to-slate-700' },
  temple: { icon: Building, label: '神殿', gradient: 'from-yellow-400 to-amber-600' },
  village: { icon: Building, label: '村莊', gradient: 'from-orange-300 to-amber-500' },
  snow: { icon: Snowflake, label: '雪地', gradient: 'from-blue-200 to-cyan-400' },
  desert: { icon: SunDim, label: '沙漠', gradient: 'from-yellow-500 to-orange-500' },
  ocean: { icon: Waves, label: '海洋', gradient: 'from-blue-400 to-indigo-600' },
};

const GameMaps = () => {
  const [maps, setMaps] = useState<GameMapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMap, setEditingMap] = useState<GameMapData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    theme: 'forest' as MapTheme,
    width: 20,
    height: 15,
    levelRequired: 1,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMaps();
  }, []);

  const loadMaps = async () => {
    setLoading(true);
    setError(null);
    try {
      const mapList = await gameMapService.getAllMaps();
      setMaps(mapList);
    } catch (err) {
      console.error('Failed to load maps:', err);
      setError('無法載入地圖列表');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      const newMap = await gameMapService.createMap({
        name: formData.name,
        description: formData.description,
        theme: formData.theme,
        width: formData.width,
        height: formData.height,
        requirements: { levelRequired: formData.levelRequired },
      });
      setMaps([newMap, ...maps]);
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      console.error('Failed to create map:', err);
      alert('建立地圖失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingMap || !formData.name.trim()) return;

    setSaving(true);
    try {
      const updatedMap = await gameMapService.updateMap(editingMap._id, {
        name: formData.name,
        description: formData.description,
        theme: formData.theme,
        width: formData.width,
        height: formData.height,
        requirements: { levelRequired: formData.levelRequired },
      });
      setMaps(maps.map((m) => (m._id === editingMap._id ? updatedMap : m)));
      setEditingMap(null);
      resetForm();
    } catch (err) {
      console.error('Failed to update map:', err);
      alert('更新地圖失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (mapId: string) => {
    if (!confirm('確定要刪除這張地圖嗎？此操作無法復原。')) return;

    try {
      await gameMapService.deleteMap(mapId);
      setMaps(maps.filter((m) => m._id !== mapId));
    } catch (err) {
      console.error('Failed to delete map:', err);
      alert('刪除地圖失敗');
    }
  };

  const openEditModal = (map: GameMapData) => {
    setEditingMap(map);
    setFormData({
      name: map.name,
      description: map.description,
      theme: map.theme,
      width: map.width,
      height: map.height,
      levelRequired: map.requirements?.levelRequired || 1,
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      theme: 'forest',
      width: 20,
      height: 15,
      levelRequired: 1,
    });
  };

  const filteredMaps = maps.filter(
    (map) =>
      map.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      map.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderModal = () => {
    const isEdit = !!editingMap;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card variant="elevated" padding="lg" className="w-full max-w-md">
          <h2 className="text-xl font-bold mb-4">
            {isEdit ? '編輯地圖' : '建立新地圖'}
          </h2>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                地圖名稱 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="例如：數學森林"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="地圖的描述..."
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Theme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                主題
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(THEME_CONFIG) as MapTheme[]).map((theme) => {
                  const config = THEME_CONFIG[theme];
                  const Icon = config.icon;
                  return (
                    <button
                      key={theme}
                      onClick={() => setFormData({ ...formData, theme })}
                      className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center ${
                        formData.theme === theme
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-5 h-5 mb-1" />
                      <span className="text-xs">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Size */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  寬度 (格)
                </label>
                <input
                  type="number"
                  min={10}
                  max={50}
                  value={formData.width}
                  onChange={(e) =>
                    setFormData({ ...formData, width: parseInt(e.target.value) || 20 })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  高度 (格)
                </label>
                <input
                  type="number"
                  min={10}
                  max={50}
                  value={formData.height}
                  onChange={(e) =>
                    setFormData({ ...formData, height: parseInt(e.target.value) || 15 })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Level Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                需要等級
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={formData.levelRequired}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    levelRequired: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                setEditingMap(null);
                resetForm();
              }}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              variant="primary"
              onClick={isEdit ? handleUpdate : handleCreate}
              loading={saving}
              disabled={!formData.name.trim()}
              className="flex-1"
            >
              {isEdit ? '更新' : '建立'}
            </Button>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">地圖管理</h1>
            <p className="text-gray-500">建立和管理遊戲地圖</p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            leftIcon={<Plus className="w-5 h-5" />}
          >
            建立地圖
          </Button>
        </div>

        {/* Search */}
        <Card variant="outlined" padding="sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋地圖..."
              className="w-full pl-10 pr-4 py-2 border-none focus:ring-0"
            />
          </div>
        </Card>

        {/* Maps List */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-500" />
            <p className="text-gray-500">載入中...</p>
          </div>
        ) : error ? (
          <Card variant="outlined" className="bg-red-50 border-red-200 text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button variant="secondary" onClick={loadMaps}>
              重新載入
            </Button>
          </Card>
        ) : filteredMaps.length === 0 ? (
          <Card variant="elevated" className="text-center py-12">
            <Map className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              {searchQuery ? '找不到符合的地圖' : '尚未建立任何地圖'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery
                ? '請嘗試其他關鍵字'
                : '點擊「建立地圖」開始製作你的第一張地圖'}
            </p>
            {!searchQuery && (
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                建立地圖
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMaps.map((map) => {
              const themeConfig = THEME_CONFIG[map.theme] || THEME_CONFIG.forest;
              const ThemeIcon = themeConfig.icon;

              return (
                <Card key={map._id} variant="elevated" className="overflow-hidden">
                  {/* Theme Header */}
                  <div
                    className={`h-24 bg-gradient-to-br ${themeConfig.gradient} flex items-center justify-center`}
                  >
                    <ThemeIcon className="w-12 h-12 text-white/80" />
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-bold text-lg text-gray-800">{map.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                      {map.description || '無描述'}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <span>📐 {map.width}x{map.height}</span>
                      <span>👾 {map.objects?.length || 0} 物件</span>
                      <span>⭐ Lv.{map.requirements?.levelRequired || 1}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(map)}
                        leftIcon={<Edit className="w-4 h-4" />}
                      >
                        編輯
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          window.open(`/teacher/game-maps/${map._id}/editor`, '_blank')
                        }
                        leftIcon={<Eye className="w-4 h-4" />}
                      >
                        設計
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(map._id)}
                        leftIcon={<Trash2 className="w-4 h-4 text-red-500" />}
                        className="text-red-500 hover:bg-red-50"
                      >
                        刪除
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {(showCreateModal || editingMap) && renderModal()}
    </TeacherLayout>
  );
};

export default GameMaps;
