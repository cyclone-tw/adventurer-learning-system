import { useState, useEffect } from 'react';
import {
  User,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Search,
  Upload,
  Eye,
  Image as ImageIcon,
} from 'lucide-react';
import { TeacherLayout } from '../../components/layout';
import { Card, Button } from '../../components/ui';
import paperDollService, {
  AvatarPart,
  AvatarCategory,
  AvatarRarity,
  CATEGORY_LABELS,
  RARITY_COLORS,
} from '../../services/paperDoll';

const CATEGORY_OPTIONS: AvatarCategory[] = [
  'body',
  'face',
  'eyes',
  'mouth',
  'hair',
  'outfit',
  'armor',
  'weapon',
  'accessory',
  'effects',
];

const RARITY_OPTIONS: { value: AvatarRarity; label: string }[] = [
  { value: 'common', label: '普通' },
  { value: 'uncommon', label: '稀有' },
  { value: 'rare', label: '精良' },
  { value: 'epic', label: '史詩' },
  { value: 'legendary', label: '傳說' },
];

const AvatarParts = () => {
  const [parts, setParts] = useState<AvatarPart[]>([]);
  const [partsByCategory, setPartsByCategory] = useState<Record<AvatarCategory, AvatarPart[]>>(
    {} as Record<AvatarCategory, AvatarPart[]>
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AvatarCategory | 'all'>('all');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingPart, setEditingPart] = useState<AvatarPart | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'hair' as AvatarCategory,
    rarity: 'common' as AvatarRarity,
    imageUrl: '',
    colorizable: false,
    isDefault: false,
    acquisitionType: 'default' as 'default' | 'shop',
    price: 100,
    levelRequired: 1,
  });
  const [saving, setSaving] = useState(false);

  // Load parts
  useEffect(() => {
    loadParts();
  }, []);

  const loadParts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await paperDollService.adminGetParts();
      setParts(data.parts);
      setPartsByCategory(data.byCategory as Record<AvatarCategory, AvatarPart[]>);
    } catch (err) {
      console.error('Failed to load parts:', err);
      setError('無法載入部件列表');
    } finally {
      setLoading(false);
    }
  };

  // Create new part
  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.imageUrl.trim()) return;

    setSaving(true);
    try {
      const newPart = await paperDollService.adminCreatePart({
        name: formData.name,
        category: formData.category,
        rarity: formData.rarity,
        assets: {
          idle: formData.imageUrl,
        },
        colorizable: formData.colorizable,
        isDefault: formData.isDefault,
        acquisition: {
          type: formData.acquisitionType,
          price: formData.acquisitionType === 'shop' ? formData.price : undefined,
          levelRequired: formData.levelRequired,
        },
      });
      setParts([newPart, ...parts]);
      setShowModal(false);
      resetForm();
      loadParts(); // Reload to get updated categories
    } catch (err) {
      console.error('Failed to create part:', err);
      alert('建立部件失敗');
    } finally {
      setSaving(false);
    }
  };

  // Update part
  const handleUpdate = async () => {
    if (!editingPart || !formData.name.trim()) return;

    setSaving(true);
    try {
      const updatedPart = await paperDollService.adminUpdatePart(editingPart._id, {
        name: formData.name,
        category: formData.category,
        rarity: formData.rarity,
        assets: {
          idle: formData.imageUrl,
        },
        colorizable: formData.colorizable,
        isDefault: formData.isDefault,
        acquisition: {
          type: formData.acquisitionType,
          price: formData.acquisitionType === 'shop' ? formData.price : undefined,
          levelRequired: formData.levelRequired,
        },
      });
      setParts(parts.map((p) => (p._id === editingPart._id ? updatedPart : p)));
      setEditingPart(null);
      setShowModal(false);
      resetForm();
      loadParts();
    } catch (err) {
      console.error('Failed to update part:', err);
      alert('更新部件失敗');
    } finally {
      setSaving(false);
    }
  };

  // Delete part
  const handleDelete = async (partId: string) => {
    if (!confirm('確定要刪除這個部件嗎？')) return;

    try {
      await paperDollService.adminDeletePart(partId);
      setParts(parts.filter((p) => p._id !== partId));
      loadParts();
    } catch (err) {
      console.error('Failed to delete part:', err);
      alert('刪除部件失敗');
    }
  };

  // Open edit modal
  const openEditModal = (part: AvatarPart) => {
    setEditingPart(part);
    setFormData({
      name: part.name,
      category: part.category,
      rarity: part.rarity,
      imageUrl: part.assets.idle,
      colorizable: part.colorizable,
      isDefault: part.isDefault,
      acquisitionType: part.acquisition.type as 'default' | 'shop',
      price: part.acquisition.price || 100,
      levelRequired: part.acquisition.levelRequired || 1,
    });
    setShowModal(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      category: 'hair',
      rarity: 'common',
      imageUrl: '',
      colorizable: false,
      isDefault: false,
      acquisitionType: 'default',
      price: 100,
      levelRequired: 1,
    });
    setEditingPart(null);
  };

  // Filter parts
  const filteredParts = parts.filter((part) => {
    const matchesSearch =
      part.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || part.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Render modal
  const renderModal = () => {
    const isEdit = !!editingPart;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card variant="elevated" padding="lg" className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">
            {isEdit ? '編輯部件' : '新增部件'}
          </h2>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                部件名稱 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：金色長髮"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                類別
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as AvatarCategory })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            {/* Rarity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                稀有度
              </label>
              <select
                value={formData.rarity}
                onChange={(e) =>
                  setFormData({ ...formData, rarity: e.target.value as AvatarRarity })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {RARITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                圖片網址 *
              </label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              {formData.imageUrl && (
                <div className="mt-2 flex justify-center">
                  <div className="w-24 h-24 border rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.png';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Options */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.colorizable}
                  onChange={(e) =>
                    setFormData({ ...formData, colorizable: e.target.checked })
                  }
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">可變色</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) =>
                    setFormData({ ...formData, isDefault: e.target.checked })
                  }
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">預設部件</span>
              </label>
            </div>

            {/* Acquisition Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                取得方式
              </label>
              <select
                value={formData.acquisitionType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    acquisitionType: e.target.value as 'default' | 'shop',
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="default">預設（免費）</option>
                <option value="shop">商店購買</option>
              </select>
            </div>

            {/* Price (if shop) */}
            {formData.acquisitionType === 'shop' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  價格（金幣）
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: parseInt(e.target.value) || 1 })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            )}

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
                  setFormData({ ...formData, levelRequired: parseInt(e.target.value) || 1 })
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
                setShowModal(false);
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
              disabled={!formData.name.trim() || !formData.imageUrl.trim()}
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
            <h1 className="text-2xl font-bold text-gray-800">角色部件管理</h1>
            <p className="text-gray-500">管理紙娃娃系統的角色部件</p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowModal(true)}
            leftIcon={<Plus className="w-5 h-5" />}
          >
            新增部件
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(partsByCategory).map(([category, categoryParts]) => (
            <Card key={category} variant="outlined" padding="sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {categoryParts.length}
                </div>
                <div className="text-sm text-gray-500">
                  {CATEGORY_LABELS[category as AvatarCategory]}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card variant="outlined" padding="sm">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋部件..."
                className="w-full pl-10 pr-4 py-2 border-none focus:ring-0"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(e.target.value as AvatarCategory | 'all')
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">所有類別</option>
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {/* Parts List */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-500" />
            <p className="text-gray-500">載入中...</p>
          </div>
        ) : error ? (
          <Card variant="outlined" className="bg-red-50 border-red-200 text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button variant="secondary" onClick={loadParts}>
              重新載入
            </Button>
          </Card>
        ) : filteredParts.length === 0 ? (
          <Card variant="elevated" className="text-center py-12">
            <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              {searchQuery || selectedCategory !== 'all'
                ? '找不到符合的部件'
                : '尚未建立任何部件'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || selectedCategory !== 'all'
                ? '請嘗試其他搜尋條件'
                : '點擊「新增部件」開始建立角色部件'}
            </p>
            {!searchQuery && selectedCategory === 'all' && (
              <Button variant="primary" onClick={() => setShowModal(true)}>
                新增部件
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredParts.map((part) => {
              const rarityColor = RARITY_COLORS[part.rarity];

              return (
                <Card key={part._id} variant="elevated" className="overflow-hidden group">
                  {/* Preview */}
                  <div className={`aspect-square ${rarityColor.bg} flex items-center justify-center relative`}>
                    {part.assets.idle ? (
                      <img
                        src={part.assets.idle}
                        alt={part.name}
                        className="w-full h-full object-contain p-2"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.png';
                        }}
                      />
                    ) : (
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    )}

                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {part.isDefault && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                          預設
                        </span>
                      )}
                      {part.colorizable && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                          可變色
                        </span>
                      )}
                    </div>

                    {/* Rarity */}
                    <div
                      className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded ${rarityColor.bg} ${rarityColor.text} ${rarityColor.border} border`}
                    >
                      {RARITY_OPTIONS.find((r) => r.value === part.rarity)?.label}
                    </div>

                    {/* Hover Actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(part)}
                        className="p-2 bg-white rounded-lg hover:bg-gray-100"
                      >
                        <Edit className="w-4 h-4 text-gray-700" />
                      </button>
                      <button
                        onClick={() => handleDelete(part._id)}
                        className="p-2 bg-white rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <div className="font-medium text-gray-800 truncate">{part.name}</div>
                    <div className="text-xs text-gray-500 flex items-center justify-between mt-1">
                      <span>{CATEGORY_LABELS[part.category]}</span>
                      {part.acquisition.type === 'shop' && (
                        <span className="text-amber-600">💰 {part.acquisition.price}</span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && renderModal()}
    </TeacherLayout>
  );
};

export default AvatarParts;
